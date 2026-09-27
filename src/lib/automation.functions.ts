import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Tok = z.object({ token: z.string().uuid(), initData: z.string().max(4096).optional().nullable() });

export type Reminder = { id: string; chat_id: number | null; text: string; send_at: string; repeat: string; active: boolean; last_sent_at: string | null };
export type Broadcast = { id: string; text: string; sent: number; failed: number; created_at: string };
export type VipSub = { tg_user_id: number; user_name: string | null; ends_at: string; status: string };
export type VipOrder = { id: string; user_name: string | null; amount: number; status: string; provider: string | null; created_at: string };

export const getAutomation = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.parse(d))
  .handler(async ({ data }) => {
    const { requireOwner, supabaseAdmin } = await import("./cabinet.server");
    const { deepLink } = await import("./automation.server");
    const owner = await requireOwner({ token: data.token, initData: data.initData, readOnly: true });
    const id = owner.telegram_id;
    const [rem, br, vs, subs, orders] = await Promise.all([
      supabaseAdmin.from("reminders").select("id,chat_id,text,send_at,repeat,active,last_sent_at").eq("owner_id", id).order("send_at"),
      supabaseAdmin.from("broadcasts").select("id,text,sent,failed,created_at").eq("owner_id", id).order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("vip_settings").select("*").eq("owner_id", id).maybeSingle(),
      supabaseAdmin.from("vip_subs").select("tg_user_id,user_name,ends_at,status").eq("owner_id", id).order("ends_at"),
      supabaseAdmin.from("vip_orders").select("id,user_name,amount,status,provider,created_at").eq("owner_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    const s = vs.data;
    const { appUrl } = await import("./telegram.server");
    const origin = appUrl();
    const [shopLink, vipLink] = owner.is_demo ? [null, null] : await Promise.all([deepLink(`shop_${id}`), deepLink(`vip_${id}`)]);
    return {
      reminders: (rem.data ?? []) as Reminder[],
      broadcasts: (br.data ?? []) as Broadcast[],
      // Secrets are never returned to the browser — only whether they are set.
      vip: {
        chat_id: s?.chat_id ?? null, price: Number(s?.price ?? 0), days: s?.days ?? 30,
        click_service_id: s?.click_service_id ?? "", click_merchant_id: s?.click_merchant_id ?? "", payme_merchant_id: s?.payme_merchant_id ?? "",
        has_click_secret: !!s?.click_secret_key, has_payme_key: !!s?.payme_key,
      },
      subs: (subs.data ?? []) as VipSub[],
      orders: (orders.data ?? []) as unknown as VipOrder[],
      links: { shop: shopLink, vip: vipLink, payme: `${origin}/api/public/pay/payme/${id}`, click: `${origin}/api/public/pay/click` },
    };
  });

export const saveReminder = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({
    text: z.string().trim().min(1).max(3500),
    send_at: z.string().datetime({ offset: true }),
    repeat: z.enum(["none", "daily", "weekly"]),
    chat_id: z.union([z.number(), z.string().regex(/^-?\d+$/)]).optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { mutationOwner, supabaseAdmin } = await import("./cabinet.server");
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    if (!(r.owner.modules as string[]).includes("reminders")) return { ok: false as const, error: "module_disabled" as const };
    const chatId = data.chat_id == null || data.chat_id === "" ? null : Number(data.chat_id);
    if (chatId !== null) {
      const { data: c } = await supabaseAdmin.from("tg_chats").select("chat_id").eq("chat_id", chatId).eq("owner_id", r.owner.telegram_id).maybeSingle();
      if (!c) return { ok: false as const, error: "forbidden" as const };
    }
    const { error } = await supabaseAdmin.from("reminders").insert({ owner_id: r.owner.telegram_id, text: data.text, send_at: data.send_at, repeat: data.repeat, chat_id: chatId });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const toggleReminder = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { mutationOwner, supabaseAdmin } = await import("./cabinet.server");
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    if (!(r.owner.modules as string[]).includes("reminders")) return { ok: false as const, error: "module_disabled" as const };
    const { error } = await supabaseAdmin.from("reminders").update({ active: data.active }).eq("id", data.id).eq("owner_id", r.owner.telegram_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteReminder = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { mutationOwner, supabaseAdmin } = await import("./cabinet.server");
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const { error } = await supabaseAdmin.from("reminders").delete().eq("id", data.id).eq("owner_id", r.owner.telegram_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const sendBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ text: z.string().trim().min(1).max(3500) }).parse(d))
  .handler(async ({ data }) => {
    const { mutationOwner, consumeQuota, supabaseAdmin } = await import("./cabinet.server");
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error, sent: 0 };
    if (!(r.owner.modules as string[]).includes("broadcast")) return { ok: false as const, error: "module_disabled" as const, sent: 0 };
    const { count: chats } = await supabaseAdmin.from("tg_chats").select("chat_id", { count: "exact", head: true }).eq("owner_id", r.owner.telegram_id);
    if (!chats) return { ok: false as const, error: "no_chats" as const, sent: 0 };
    const { BROADCASTS_PER_DAY } = await import("./config");
    if (!(await consumeQuota(r.owner.telegram_id, "broadcast", { periodDays: 1, max: BROADCASTS_PER_DAY }))) return { ok: false as const, error: "broadcast_limited" as const, sent: 0 };
    const { broadcast } = await import("./automation.server");
    const res = await broadcast(r.owner.telegram_id, data.text);
    return { ok: true as const, error: null, sent: res.sent };
  });

export const saveVipSettings = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({
    chat_id: z.union([z.number(), z.string().regex(/^-?\d+$/)]).nullable(),
    price: z.number().min(1000).max(1e9),
    days: z.number().int().min(1).max(366),
    click_service_id: z.string().max(40).optional().nullable(),
    click_merchant_id: z.string().max(40).optional().nullable(),
    click_secret_key: z.string().max(200).optional().nullable(),
    payme_merchant_id: z.string().max(60).optional().nullable(),
    payme_key: z.string().max(200).optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { mutationOwner, supabaseAdmin } = await import("./cabinet.server");
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    if (!(r.owner.modules as string[]).includes("access")) return { ok: false as const, error: "module_disabled" as const };
    const chatId = data.chat_id == null || data.chat_id === "" ? null : Number(data.chat_id);
    if (chatId !== null) {
      const { data: c } = await supabaseAdmin.from("tg_chats").select("chat_id").eq("chat_id", chatId).eq("owner_id", r.owner.telegram_id).maybeSingle();
      if (!c) return { ok: false as const, error: "forbidden" as const };
    }
    const row: Record<string, unknown> = {
      owner_id: r.owner.telegram_id, chat_id: chatId, price: data.price, days: data.days,
      click_service_id: data.click_service_id || null, click_merchant_id: data.click_merchant_id || null, payme_merchant_id: data.payme_merchant_id || null,
      updated_at: new Date().toISOString(),
    };
    // Empty secret fields keep the stored value.
    if (data.click_secret_key) row["click_secret_key"] = data.click_secret_key;
    if (data.payme_key) row["payme_key"] = data.payme_key;
    const { error } = await supabaseAdmin.from("vip_settings").upsert(row as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
