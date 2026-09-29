import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MAX_SALONS } from "./config";

/** Telegram chat that should receive owner DMs. Extra salons use a synthetic id. */
export function humanChat(o: { telegram_id: number; account_telegram_id?: number | null }): number {
  const account = o.account_telegram_id;
  return account && account > 0 ? Number(account) : Number(o.telegram_id);
}

/** Salon the human is currently editing. Falls back to their first cabinet. */
export async function resolveActiveOwner(actor: number): Promise<number> {
  const { data: sess } = await supabaseAdmin.from("account_session").select("active_owner_id").eq("telegram_id", actor).maybeSingle();
  if (sess?.active_owner_id) return Number(sess.active_owner_id);
  const { data: own } = await supabaseAdmin.from("tg_owners").select("telegram_id").eq("telegram_id", actor).eq("is_demo", false).maybeSingle();
  if (own) return actor;
  const { data: extra } = await supabaseAdmin.from("tg_owners").select("telegram_id").eq("account_telegram_id", actor).eq("is_demo", false).order("created_at").limit(1);
  const first = extra?.[0];
  return first ? Number(first.telegram_id) : actor;
}

export async function listSalons(actor: number) {
  const { data } = await supabaseAdmin.from("tg_owners")
    .select("telegram_id, display_name, first_name, niche, cabinet_token, account_telegram_id, onboarded_at, language, plan_status, plan_tier, subscription_ends_at, trial_ends_at")
    .or(`telegram_id.eq.${actor},account_telegram_id.eq.${actor}`)
    .eq("is_demo", false)
    .order("created_at");
  return data ?? [];
}

export async function switchSalon(actor: number, salonId: number) {
  const salons = await listSalons(actor);
  const salon = salons.find((s) => Number(s.telegram_id) === salonId);
  if (!salon) return null;
  await supabaseAdmin.from("account_session").upsert({ telegram_id: actor, active_owner_id: salonId });
  return salon;
}

/** Opens another cabinet on the same Telegram account. Plan dates are copied so trials cannot be farmed. */
export async function createExtraSalon(actor: number, profile: { first_name?: string | null; username?: string | null }) {
  const salons = await listSalons(actor);
  if (!salons.some((s) => s.onboarded_at)) return { ok: false as const, error: "finish_first" as const };
  if (salons.length >= MAX_SALONS) return { ok: false as const, error: "salon_limit" as const };
  const source = salons.find((s) => Number(s.telegram_id) === actor) ?? salons[0]!;
  for (let i = 0; i < 4; i++) {
    const id = 900_000_000_000_000 + Math.floor(Math.random() * 99_000_000_000);
    const { error } = await supabaseAdmin.from("tg_owners").insert({
      telegram_id: id,
      account_telegram_id: actor,
      first_name: profile.first_name ?? null,
      username: profile.username ?? null,
      language: source.language,
      step: "salon_name",
      plan_status: source.plan_status,
      plan_tier: source.plan_tier,
      subscription_ends_at: source.subscription_ends_at,
      trial_ends_at: source.trial_ends_at,
    });
    if (!error) {
      await supabaseAdmin.from("account_session").upsert({ telegram_id: actor, active_owner_id: id });
      return { ok: true as const, id, language: source.language };
    }
    if (!/duplicate|unique/i.test(error.message) || i === 3) return { ok: false as const, error: "error" as const };
  }
  return { ok: false as const, error: "error" as const };
}
