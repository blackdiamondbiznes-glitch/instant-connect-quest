import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { PLAN_TIERS, TRIAL_TIER, type PlanTier, type Quota } from "./config";

export type Owner = Database["public"]["Tables"]["tg_owners"]["Row"];
export type CabinetError = "demo_readonly" | "plan_expired" | "module_disabled";

export async function ownerByToken(token: string): Promise<Owner> {
  const { data, error } = await supabaseAdmin.from("tg_owners").select("*").eq("cabinet_token", token).maybeSingle();
  if (error || !data) throw new Error("NotFound");
  return data;
}

/** Tier that drives content cadence: trial owners get TRIAL_TIER, others their stored tier. */
export function effectiveTier(o: Owner): PlanTier {
  if (o.plan_status === "trial") return TRIAL_TIER;
  return (PLAN_TIERS as string[]).includes(o.plan_tier) ? (o.plan_tier as PlanTier) : "free";
}

/** Atomically consumes one use of `bucket` for this owner within the quota window. */
export async function consumeQuota(ownerId: number, bucket: string, q: Quota): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("consume_quota", { _owner: ownerId, _bucket: bucket, _period_days: q.periodDays, _max: q.max });
  if (error) {
    console.error("consume_quota failed", error);
    return false;
  }
  return data === true;
}

export async function refundQuota(ownerId: number, bucket: string, q: Quota) {
  const { error } = await supabaseAdmin.rpc("refund_quota", { _owner: ownerId, _bucket: bucket, _period_days: q.periodDays });
  if (error) console.error("refund_quota failed", error);
}

const MAX_AGE_SEC = 24 * 3600;

/** Verifies Telegram WebApp initData (HMAC-SHA256 with the bot token). Returns the Telegram user id or null. */
export function verifyInitData(initData: string | undefined | null): number | null {
  const botToken = process.env["TELEGRAM_BOT_TOKEN"];
  if (!botToken || !initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete("hash");
  const dataCheck = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheck).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SEC) return null;
  try {
    const id = Number(JSON.parse(params.get("user") ?? "null")?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the cabinet owner.
 * - readOnly + demo owner: token alone is enough (demo iframe on / and /demo).
 * - Everything else: valid initData whose user.id === owner.telegram_id, otherwise throws (fail closed).
 * Demo mutations must be short-circuited by the caller via `demoOrOwner`.
 */
export async function requireOwner({ token, initData, readOnly = false }: { token: string; initData?: string | null | undefined; readOnly?: boolean }): Promise<Owner> {
  const owner = await ownerByToken(token);
  if (readOnly && owner.is_demo) return owner;
  const uid = verifyInitData(initData);
  const human = Number(owner.account_telegram_id ?? owner.telegram_id);
  if (uid === null || (uid !== Number(owner.telegram_id) && uid !== human)) throw new Error("Unauthorized");
  return owner;
}

export function planExpired(o: Owner): boolean {
  const now = Date.now();
  if (o.plan_status === "expired") return true;
  if (o.plan_status === "active") return !!o.subscription_ends_at && new Date(o.subscription_ends_at).getTime() < now;
  return !!o.trial_ends_at && new Date(o.trial_ends_at).getTime() < now;
}

/** For mutations: demo -> demo_readonly (no initData needed), then auth, then plan gate. */
export async function mutationOwner(token: string, initData?: string | null): Promise<{ owner: Owner; error: null } | { owner: null; error: CabinetError }> {
  const pre = await ownerByToken(token);
  if (pre.is_demo) return { owner: null, error: "demo_readonly" };
  const owner = await requireOwner({ token, initData });
  if (planExpired(owner)) return { owner: null, error: "plan_expired" };
  return { owner, error: null };
}

export { supabaseAdmin };
