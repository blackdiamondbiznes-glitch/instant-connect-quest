import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function isAdmin(ctx: Ctx): Promise<boolean> {
  const { data } = await ctx.supabase.rpc("is_admin");
  return data === true;
}

async function assertAdmin(ctx: Ctx) {
  if (!(await isAdmin(ctx))) throw new Error("Forbidden");
}

// Telegram IDs arrive as number or numeric string; always stored as a JS number (fits in 53 bits).
const TgId = z.union([z.number().int(), z.string().regex(/^-?\d{1,16}$/)]).transform((v) => Number(v));

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Never auto-promotes on a plain /admin visit.
// Admin is granted only when:
//  - the user's verified email is in ALLOWED_ADMIN_EMAILS, or
//  - setupSecret matches ADMIN_SETUP_SECRET AND no admin exists yet (atomic, DB-locked).
export const getAdminStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ setupSecret: z.string().max(200).optional() }).optional().parse(d))
  .handler(async ({ data, context }) => {
    if (await isAdmin(context)) return { isAdmin: true };

    const email = String((context.claims as any)?.email ?? "").trim().toLowerCase();
    const allowed = (process.env["ALLOWED_ADMIN_EMAILS"] ?? "")
      .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const setupEnv = process.env["ADMIN_SETUP_SECRET"];
    const secretOk = !!setupEnv && !!data?.setupSecret && safeEqual(data.setupSecret, setupEnv);
    const emailOk = !!email && allowed.includes(email);
    if (!emailOk && !secretOk) return { isAdmin: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (emailOk) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    } else {
      await supabaseAdmin.rpc("bootstrap_first_admin", { _user_id: context.userId });
    }
    // Re-read: the role row is the only source of truth.
    const { data: row } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    return { isAdmin: !!row };
  });

// Only an existing admin can add another admin.
export const grantAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = data.email.toLowerCase();
    let userId: string | null = null;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: res, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      userId = res.users.find((u) => u.email?.toLowerCase() === target)?.id ?? null;
      if (res.users.length < 200) break;
    }
    if (!userId) throw new Error("User not found");
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [owners, chats, msgs, clusters] = await Promise.all([
      supabaseAdmin.from("tg_owners").select("telegram_id, first_name, username, display_name, language, niche, workspace_type, step, plan_status, plan_tier, trial_ends_at, subscription_ends_at, cabinet_token, created_at").eq("is_demo", false).order("created_at", { ascending: false }),
      supabaseAdmin.from("tg_chats").select("owner_id, title, chat_type"),
      supabaseAdmin.from("tg_messages").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("question_clusters").select("id", { count: "exact", head: true }),
    ]);
    const chatMap = new Map<number, string[]>();
    for (const c of chats.data ?? []) chatMap.set(c.owner_id, [...(chatMap.get(c.owner_id) ?? []), c.title ?? String(c.chat_type)]);
    const now = Date.now();
    const users = (owners.data ?? []).map((o) => {
      const end = o.plan_status === "active" ? o.subscription_ends_at : o.trial_ends_at;
      const status = o.plan_status === "expired" || (end && new Date(end).getTime() < now) ? "expired" : o.plan_status;
      return { ...o, status, ends_at: end, chats: chatMap.get(o.telegram_id) ?? [] };
    });
    const nicheCounts: Record<string, number> = {};
    for (const u of users) if (u.niche) nicheCounts[u.niche] = (nicheCounts[u.niche] ?? 0) + 1;
    return {
      users,
      stats: {
        total: users.length,
        active: users.filter((u) => u.status === "active").length,
        trial: users.filter((u) => u.status === "trial").length,
        expired: users.filter((u) => u.status === "expired").length,
        messages: msgs.count ?? 0,
        clusters: clusters.count ?? 0,
        niches: Object.entries(nicheCounts).sort((a, b) => b[1] - a[1]),
      },
    };
  });

export const updateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ telegramId: TgId, action: z.enum(["extend", "trial", "expire"]), days: z.number().int().min(1).max(3650).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin.from("tg_owners").select("subscription_ends_at").eq("telegram_id", data.telegramId).maybeSingle();
    if (!o) throw new Error("Topilmadi");
    const addDays = (from: number) => new Date(from + data.days * 86400000).toISOString();
    let patch: { plan_status: string; subscription_ends_at?: string; trial_ends_at?: string };
    if (data.action === "extend") {
      const base = Math.max(Date.now(), o.subscription_ends_at ? new Date(o.subscription_ends_at).getTime() : 0);
      patch = { plan_status: "active", subscription_ends_at: addDays(base) };
    } else if (data.action === "trial") {
      patch = { plan_status: "trial", trial_ends_at: addDays(Date.now()) };
    } else {
      patch = { plan_status: "expired", subscription_ends_at: new Date().toISOString() };
    }
    const { error } = await supabaseAdmin.from("tg_owners").update(patch).eq("telegram_id", data.telegramId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPlanTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ telegramId: TgId, tier: z.enum(["free", "start", "pro"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tg_owners").update({ plan_tier: data.tier }).eq("telegram_id", data.telegramId).eq("is_demo", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registerTelegramWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { registerWebhook } = await import("./telegram.server");
    return registerWebhook();
  });
