import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tg } from "./telegram.server";
import { tr, type L } from "./niches";

const M: Record<string, L> = {
  vipPaid: { uz: "✅ To'lov qabul qilindi! Kirish havolangiz (bir martalik):", ru: "✅ Оплата получена! Ваша ссылка для входа (одноразовая):", en: "✅ Payment received! Your one-time access link:" },
  vipUntil: { uz: "Obuna muddati:", ru: "Подписка до:", en: "Subscription until:" },
  vipExpiring: { uz: "⏳ VIP obunangiz tez orada tugaydi. Uzaytirish:", ru: "⏳ Ваша VIP-подписка скоро закончится. Продлить:", en: "⏳ Your VIP subscription ends soon. Renew:" },
  vipExpired: { uz: "❌ VIP obunangiz tugadi. Qayta obuna bo'lish:", ru: "❌ VIP-подписка закончилась. Оформить снова:", en: "❌ Your VIP subscription has ended. Subscribe again:" },
  ownerVipPaid: { uz: "💎 Yangi VIP to'lov:", ru: "💎 Новая VIP-оплата:", en: "💎 New VIP payment:" },
};
const m = (k: string, lang: string) => tr(M[k], lang);

let botName: string | null = null;
export async function botUsername(): Promise<string | null> {
  if (botName) return botName;
  try {
    const me = await tg<{ username?: string }>("getMe", {});
    botName = me.username ?? null;
  } catch (e) {
    console.error("getMe failed", e);
  }
  return botName;
}

export async function deepLink(payload: string) {
  const u = await botUsername();
  return u ? `https://t.me/${u}?start=${payload}` : null;
}

export async function notifyOwner(ownerId: number, text: string) {
  if (ownerId < 0) return; // demo owners
  await tg("sendMessage", { chat_id: ownerId, text, parse_mode: "HTML" }).catch((e) => console.error("notify owner failed", e));
}

/** Sends text to every connected chat of the owner. */
export async function broadcast(ownerId: number, text: string) {
  const { data: chats } = await supabaseAdmin.from("tg_chats").select("chat_id").eq("owner_id", ownerId);
  let sent = 0, failed = 0;
  for (const c of chats ?? []) {
    try {
      await tg("sendMessage", { chat_id: c.chat_id, text });
      sent++;
    } catch (e) {
      console.error("broadcast failed", c.chat_id, e);
      failed++;
    }
  }
  await supabaseAdmin.from("broadcasts").insert({ owner_id: ownerId, text, sent, failed });
  return { sent, failed };
}

/** Sends due reminders and reschedules repeating ones. */
export async function runDueReminders() {
  const now = new Date();
  const { data: due } = await supabaseAdmin.from("reminders").select("*").eq("active", true).lte("send_at", now.toISOString()).limit(200);
  let count = 0;
  for (const r of due ?? []) {
    const targets = r.chat_id
      ? [{ chat_id: r.chat_id }]
      : ((await supabaseAdmin.from("tg_chats").select("chat_id").eq("owner_id", r.owner_id)).data ?? []);
    for (const t of targets) {
      await tg("sendMessage", { chat_id: t.chat_id, text: r.text }).then(() => count++).catch((e) => console.error("reminder failed", e));
    }
    const next = new Date(r.send_at);
    if (r.repeat === "daily" || r.repeat === "weekly") {
      const step = r.repeat === "daily" ? 86400000 : 7 * 86400000;
      while (next.getTime() <= now.getTime()) next.setTime(next.getTime() + step);
      await supabaseAdmin.from("reminders").update({ send_at: next.toISOString(), last_sent_at: now.toISOString() }).eq("id", r.id);
    } else {
      await supabaseAdmin.from("reminders").update({ active: false, last_sent_at: now.toISOString() }).eq("id", r.id);
    }
  }
  return count;
}

async function ownerLang(ownerId: number) {
  const { data } = await supabaseAdmin.from("tg_owners").select("language").eq("telegram_id", ownerId).maybeSingle();
  return data?.language ?? "uz";
}

/** Marks a VIP order paid (idempotent) and sends a one-time invite link. */
export async function fulfillVipOrder(orderId: string, provider: string, providerTx: string | null) {
  const { data: o } = await supabaseAdmin.from("vip_orders").select("*").eq("id", orderId).maybeSingle();
  if (!o) return false;
  if (o.status === "paid") return true;
  const { data: s } = await supabaseAdmin.from("vip_settings").select("chat_id").eq("owner_id", o.owner_id).maybeSingle();
  const paidAt = new Date();
  const { data: upd } = await supabaseAdmin.from("vip_orders")
    .update({ status: "paid", provider, provider_tx: providerTx ?? o.provider_tx, paid_at: paidAt.toISOString() })
    .eq("id", o.id).neq("status", "paid").select("id");
  if (!upd?.length) return true; // another request fulfilled it

  const { data: sub } = await supabaseAdmin.from("vip_subs").select("ends_at").eq("owner_id", o.owner_id).eq("tg_user_id", o.tg_user_id).maybeSingle();
  const base = sub && new Date(sub.ends_at) > paidAt ? new Date(sub.ends_at) : paidAt;
  const ends = new Date(base.getTime() + o.days * 86400000);
  const chatId = s?.chat_id ?? null;
  if (chatId) {
    await supabaseAdmin.from("vip_subs").upsert({ owner_id: o.owner_id, tg_user_id: o.tg_user_id, user_name: o.user_name, chat_id: chatId, ends_at: ends.toISOString(), status: "active", notified_at: null });
  }
  await supabaseAdmin.from("members").upsert(
    { owner_id: o.owner_id, tg_user_id: o.tg_user_id, name: o.user_name ?? String(o.tg_user_id), status: "active", amount: Number(o.amount), note: `VIP → ${ends.toISOString().slice(0, 10)}` },
    { onConflict: "owner_id,tg_user_id" },
  );

  const lang = await ownerLang(o.owner_id);
  if (chatId) {
    try {
      await tg("unbanChatMember", { chat_id: chatId, user_id: o.tg_user_id, only_if_banned: true }).catch(() => {});
      const link = await tg<{ invite_link: string }>("createChatInviteLink", { chat_id: chatId, member_limit: 1, expire_date: Math.floor(Date.now() / 1000) + 86400 });
      await tg("sendMessage", { chat_id: o.tg_user_id, text: `${m("vipPaid", lang)}\n${link.invite_link}\n\n${m("vipUntil", lang)} ${ends.toISOString().slice(0, 10)}` });
    } catch (e) {
      console.error("vip invite failed", e);
    }
  }
  await notifyOwner(o.owner_id, `${m("ownerVipPaid", lang)} ${o.user_name ?? o.tg_user_id} — ${Number(o.amount).toLocaleString("ru-RU")} (${provider})`);
  return true;
}

/** Warns subscribers 3 days before expiry and removes expired ones from the chat. */
export async function processVipExpiry() {
  const now = Date.now();
  const soon = new Date(now + 3 * 86400000).toISOString();
  const { data: expiring } = await supabaseAdmin.from("vip_subs").select("*").eq("status", "active").is("notified_at", null).lte("ends_at", soon).gt("ends_at", new Date(now).toISOString()).limit(200);
  for (const s of expiring ?? []) {
    const lang = await ownerLang(s.owner_id);
    const link = await deepLink(`vip_${s.owner_id}`);
    await tg("sendMessage", { chat_id: s.tg_user_id, text: `${m("vipExpiring", lang)} ${link ?? ""}` }).catch((e) => console.error("vip warn failed", e));
    await supabaseAdmin.from("vip_subs").update({ notified_at: new Date().toISOString() }).eq("owner_id", s.owner_id).eq("tg_user_id", s.tg_user_id);
    await supabaseAdmin.from("members").update({ status: "expiring" }).eq("owner_id", s.owner_id).eq("tg_user_id", s.tg_user_id);
  }
  const { data: expired } = await supabaseAdmin.from("vip_subs").select("*").eq("status", "active").lte("ends_at", new Date(now).toISOString()).limit(200);
  for (const s of expired ?? []) {
    try {
      await tg("banChatMember", { chat_id: s.chat_id, user_id: s.tg_user_id, until_date: Math.floor(now / 1000) + 60 });
      await tg("unbanChatMember", { chat_id: s.chat_id, user_id: s.tg_user_id, only_if_banned: true });
    } catch (e) {
      console.error("vip remove failed", e);
    }
    const lang = await ownerLang(s.owner_id);
    const link = await deepLink(`vip_${s.owner_id}`);
    await tg("sendMessage", { chat_id: s.tg_user_id, text: `${m("vipExpired", lang)} ${link ?? ""}` }).catch(() => {});
    await supabaseAdmin.from("vip_subs").update({ status: "expired" }).eq("owner_id", s.owner_id).eq("tg_user_id", s.tg_user_id);
    await supabaseAdmin.from("members").update({ status: "expired" }).eq("owner_id", s.owner_id).eq("tg_user_id", s.tg_user_id);
  }
  return { warned: expiring?.length ?? 0, removed: expired?.length ?? 0 };
}

/** Payment links for a pending VIP order. */
export function paymentLinks(o: { id: string; amount: number }, s: { click_service_id: string | null; click_merchant_id: string | null; payme_merchant_id: string | null }) {
  const out: { text: string; url: string }[] = [];
  if (s.payme_merchant_id) {
    const params = `m=${s.payme_merchant_id};ac.order_id=${o.id};a=${Math.round(Number(o.amount) * 100)}`;
    out.push({ text: "💳 Payme", url: `https://checkout.paycom.uz/${Buffer.from(params).toString("base64")}` });
  }
  if (s.click_service_id && s.click_merchant_id) {
    const q = new URLSearchParams({ service_id: s.click_service_id, merchant_id: s.click_merchant_id, amount: String(Number(o.amount)), transaction_param: o.id });
    out.push({ text: "💳 Click", url: `https://my.click.uz/services/pay?${q}` });
  }
  return out;
}
