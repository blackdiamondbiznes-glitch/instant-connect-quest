import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { tg, webhookSecret } from "@/lib/telegram.server";
import { LANGS, MODULES, NICHES, WORKSPACES, getNiche, tr, type Lang } from "@/lib/niches";

const T = {
  chooseNiche: { uz: "Botni nima uchun ishlatasiz? Sohangizni tanlang:", ru: "Для чего вам бот? Выберите вашу сферу:", en: "What do you need the bot for? Choose your field:" },
  chooseWs: { uz: "Qayerda faoliyat yuritasiz?", ru: "Где вы ведёте деятельность?", en: "Where do you operate?" },
  chooseMods: { uz: "Kerakli xizmatlarni belgilang (qayta bosish — o'chiradi):", ru: "Отметьте нужные функции (повторное нажатие — убрать):", en: "Pick the features you need (tap again to remove):" },
  done: { uz: "✅ Tayyor", ru: "✅ Готово", en: "✅ Done" },
  ready: { uz: "🎉 Shaxsiy kabinetingiz tayyor!\n\nGuruh yoki kanalingizni ulash uchun botni u yerga <b>admin</b> qilib qo'shing — shunda AI a'zolar kayfiyatini va savollarini tahlil qila boshlaydi.", ru: "🎉 Ваш личный кабинет готов!\n\nЧтобы подключить группу или канал, добавьте бота туда <b>администратором</b> — AI начнёт анализировать настроение и вопросы участников.", en: "🎉 Your personal cabinet is ready!\n\nTo connect your group or channel, add the bot there as an <b>admin</b> — AI will start analyzing member mood and questions." },
  open: { uz: "📊 Kabinetni ochish", ru: "📊 Открыть кабинет", en: "📊 Open cabinet" },
  notReady: { uz: "Avval /start bosib sozlashni yakunlang.", ru: "Сначала завершите настройку через /start.", en: "Please finish setup via /start first." },
  connected: { uz: "✅ Ulandi:", ru: "✅ Подключено:", en: "✅ Connected:" },
  help: { uz: "/start — qayta sozlash\n/cabinet — kabinetni ochish\n/cabinet_reset — kabinet havolasini yangilash", ru: "/start — заново настроить\n/cabinet — открыть кабинет\n/cabinet_reset — обновить ссылку кабинета", en: "/start — set up again\n/cabinet — open cabinet\n/cabinet_reset — reset cabinet link" },
  reset: { uz: "🔄 Kabinet havolasi yangilandi. Eski havola endi ishlamaydi.", ru: "🔄 Ссылка на кабинет обновлена. Старая больше не работает.", en: "🔄 Cabinet link reset. The old link no longer works." },
} as const;

const t = (k: keyof typeof T, lang: string) => tr(T[k] as any, lang);

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const langKb = () => ({ inline_keyboard: [LANGS.map((l) => ({ text: l.label, callback_data: `lang:${l.id}` }))] });
const nicheKb = (lang: string) => ({ inline_keyboard: chunk(NICHES.map((n) => ({ text: `${n.emoji} ${tr(n.name, lang)}`, callback_data: `niche:${n.id}` })), 1) });
const wsKb = (lang: string) => ({ inline_keyboard: WORKSPACES.map((w) => [{ text: tr(w.label, lang), callback_data: `ws:${w.id}` }]) });
function modKb(lang: string, niche: string, selected: string[]) {
  const n = getNiche(niche);
  const ids = Array.from(new Set([...n.modules, "reminders", "broadcast", "ai_pulse", "ai_faq"]));
  const rows = chunk(ids.map((id) => ({ text: `${selected.includes(id) ? "✅" : "▫️"} ${tr(MODULES[id]?.label, lang)}`, callback_data: `mod:${id}` })), 2);
  rows.push([{ text: t("done", lang), callback_data: "mods_done" }]);
  return { inline_keyboard: rows };
}

function cabinetKb(origin: string, token: string, lang: string) {
  return { inline_keyboard: [[{ text: t("open", lang), web_app: { url: `${origin}/cabinet/${token}` } }]] };
}

const QUESTION_RE = /\?|\b(qanday|qachon|qayer|nega|nima|qancha|necha|как|когда|где|почему|сколько|можно|how|when|where|why|what|can i)\b/i;

async function handle(update: any, origin: string) {
  const sb = await db();

  // bot added/removed in a chat
  if (update.my_chat_member) {
    const m = update.my_chat_member;
    const status = m.new_chat_member?.status;
    const { data: owner } = await sb.from("tg_owners").select("*").eq("telegram_id", m.from.id).maybeSingle();
    if (!owner) return;
    if (status === "administrator" || status === "member") {
      await sb.from("tg_chats").upsert({ chat_id: m.chat.id, owner_id: owner.telegram_id, title: m.chat.title ?? null, chat_type: m.chat.type });
      await tg("sendMessage", { chat_id: owner.telegram_id, text: `${t("connected", owner.language)} ${m.chat.title ?? m.chat.id}` }).catch((e) => console.error("telegram call failed", e));
    } else if (status === "left" || status === "kicked") {
      await sb.from("tg_chats").delete().eq("chat_id", m.chat.id);
    }
    return;
  }

  if (update.callback_query) {
    const q = update.callback_query;
    const uid = q.from.id;
    const data: string = q.data ?? "";
    const chatId = q.message?.chat.id;
    const messageId = q.message?.message_id;
    await tg("answerCallbackQuery", { callback_query_id: q.id }).catch((e) => console.error("telegram call failed", e));
    if (data.startsWith("buy:")) return void (await customerBuy(sb, q.from, data.slice(4)));
    const { data: owner } = await sb.from("tg_owners").select("*").eq("telegram_id", uid).maybeSingle();
    if (!owner) return;
    const edit = (text: string, reply_markup: unknown) => tg("editMessageText", { chat_id: chatId, message_id: messageId, text, reply_markup, parse_mode: "HTML" });

    if (data.startsWith("lang:")) {
      const lang = data.slice(5) as Lang;
      await sb.from("tg_owners").update({ language: lang, step: "niche", updated_at: new Date().toISOString() }).eq("telegram_id", uid);
      await edit(t("chooseNiche", lang), nicheKb(lang));
    } else if (data.startsWith("niche:")) {
      const niche = data.slice(6);
      const mods = getNiche(niche).modules;
      await sb.from("tg_owners").update({ niche, modules: mods, step: "ws" }).eq("telegram_id", uid);
      await edit(t("chooseWs", owner.language), wsKb(owner.language));
    } else if (data.startsWith("ws:")) {
      await sb.from("tg_owners").update({ workspace_type: data.slice(3), step: "mods" }).eq("telegram_id", uid);
      await edit(t("chooseMods", owner.language), modKb(owner.language, owner.niche ?? "other", owner.modules));
    } else if (data.startsWith("mod:")) {
      const id = data.slice(4);
      const mods: string[] = (owner.modules as string[]).includes(id) ? owner.modules.filter((m: string) => m !== id) : [...owner.modules, id];
      await sb.from("tg_owners").update({ modules: mods }).eq("telegram_id", uid);
      await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: modKb(owner.language, owner.niche ?? "other", mods) });
    } else if (data === "mods_done") {
      await sb.from("tg_owners").update({ step: "ready" }).eq("telegram_id", uid);
      await edit(t("ready", owner.language), cabinetKb(origin, owner.cabinet_token, owner.language));
    }
    return;
  }

  const msg = update.message ?? update.edited_message ?? update.channel_post;
  if (!msg) return;

  if (msg.chat.type === "private") {
    const text: string = msg.text ?? "";
    const from = msg.from;
    const payload = text.startsWith("/start ") ? text.slice(7).trim() : "";
    const cm = /^(shop|vip)_(-?\d+)$/.exec(payload);
    if (cm) return void (await customerStart(sb, from, cm[1] as "shop" | "vip", Number(cm[2])));
    if (msg.contact) return void (await customerContact(sb, from, msg.contact));
    if (text.startsWith("/start")) {
      await sb.from("tg_owners").upsert({ telegram_id: from.id, first_name: from.first_name ?? null, username: from.username ?? null, step: "lang", updated_at: new Date().toISOString() });
      await tg("sendMessage", { chat_id: from.id, text: "🌐 Tilni tanlang / Выберите язык / Choose language", reply_markup: langKb() });
      return;
    }
    const { data: owner } = await sb.from("tg_owners").select("*").eq("telegram_id", from.id).maybeSingle();
    const lang = owner?.language ?? "uz";
    if (text.startsWith("/cabinet_reset")) {
      if (!owner || owner.step !== "ready") return void (await tg("sendMessage", { chat_id: from.id, text: t("notReady", lang) }));
      const token = crypto.randomUUID();
      const { error } = await sb.from("tg_owners").update({ cabinet_token: token, updated_at: new Date().toISOString() }).eq("telegram_id", from.id);
      if (error) { console.error("cabinet_reset failed", error); return; }
      await tg("sendMessage", { chat_id: from.id, text: t("reset", lang), reply_markup: cabinetKb(origin, token, lang) });
      return;
    }
    if (text.startsWith("/cabinet")) {
      if (!owner || owner.step !== "ready") return void (await tg("sendMessage", { chat_id: from.id, text: t("notReady", lang) }));
      await tg("sendMessage", { chat_id: from.id, text: "📊", reply_markup: cabinetKb(origin, owner.cabinet_token, lang) });
      return;
    }
    await tg("sendMessage", { chat_id: from.id, text: t("help", lang) });
    return;
  }

  // group / channel content
  const text: string = msg.text ?? msg.caption ?? "";
  const { data: chat } = await sb.from("tg_chats").select("owner_id").eq("chat_id", msg.chat.id).maybeSingle();
  if (!chat) return;
  // Classify: channel posts and anonymous/sender_chat posts are never member messages.
  const isService = !text || !!(msg.new_chat_members || msg.left_chat_member || msg.pinned_message || msg.new_chat_title);
  if (isService || text.startsWith("/")) return; // service events and commands are not stored
  const kind: "member_message" | "owner_post" | "channel_post" =
    update.channel_post || msg.chat.type === "channel" || msg.sender_chat || !msg.from ? "channel_post"
    : Number(msg.from.id) === Number(chat.owner_id) ? "owner_post"
    : "member_message";
  const name = msg.from && kind !== "channel_post" ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") : msg.sender_chat?.title ?? msg.chat.title;
  const { error } = await sb.from("tg_messages").upsert(
    { owner_id: chat.owner_id, chat_id: msg.chat.id, message_id: msg.message_id, from_name: name, text: text.slice(0, 2000), is_question: kind === "member_message" && QUESTION_RE.test(text), kind },
    { onConflict: "chat_id,message_id" },
  );
  if (error) console.error("store message failed", error);

  // Orders written in the group (only new messages, not edits).
  if (kind === "member_message" && update.message) {
    const { data: owner } = await sb.from("tg_owners").select("modules,language,is_demo").eq("telegram_id", chat.owner_id).maybeSingle();
    if (owner && !owner.is_demo && (owner.modules as string[]).includes("orders")) {
      const { detectGroupOrder } = await import("@/lib/automation.server");
      await detectGroupOrder({ ownerId: Number(chat.owner_id), chatId: msg.chat.id, messageId: msg.message_id, fromName: name ?? null, text, lang: owner.language });
    }
  }
}

// ---------- Customer flows (people who are not cabinet owners) ----------
type Sb = Awaited<ReturnType<typeof db>>;
const C = {
  noShop: { uz: "Hozircha mahsulotlar yo'q.", ru: "Пока нет товаров.", en: "No products yet." },
  pick: { uz: "🛍 Mahsulotni tanlang:", ru: "🛍 Выберите товар:", en: "🛍 Choose a product:" },
  phone: { uz: "📱 Buyurtmani tasdiqlash uchun telefon raqamingizni yuboring:", ru: "📱 Отправьте номер телефона для подтверждения заказа:", en: "📱 Send your phone number to confirm the order:" },
  sharePhone: { uz: "📱 Raqamni yuborish", ru: "📱 Отправить номер", en: "📱 Share phone" },
  ordered: { uz: "✅ Buyurtmangiz qabul qilindi! Tez orada bog'lanamiz.", ru: "✅ Заказ принят! Скоро свяжемся.", en: "✅ Order received! We'll contact you soon." },
  newOrder: { uz: "🛍 Yangi buyurtma (bot)", ru: "🛍 Новый заказ (бот)", en: "🛍 New order (bot)" },
  noVip: { uz: "VIP obuna hali sozlanmagan.", ru: "VIP-подписка пока не настроена.", en: "VIP subscription is not set up yet." },
  vipOffer: { uz: "💎 VIP obuna", ru: "💎 VIP-подписка", en: "💎 VIP subscription" },
  days: { uz: "kun", ru: "дн.", en: "days" },
  payHint: { uz: "To'lovdan so'ng kirish havolasi avtomatik yuboriladi.", ru: "После оплаты ссылка для входа придёт автоматически.", en: "Your access link is sent automatically after payment." },
} as const;
const c = (k: keyof typeof C, lang: string) => tr(C[k] as any, lang);
const userLang = (from: any) => (["uz", "ru", "en"].includes(from?.language_code) ? from.language_code : "uz");
const fullName = (from: any) => [from.first_name, from.last_name].filter(Boolean).join(" ") + (from.username ? ` (@${from.username})` : "");

async function customerStart(sb: Sb, from: any, mode: "shop" | "vip", ownerId: number) {
  const lang = userLang(from);
  const { data: owner } = await sb.from("tg_owners").select("telegram_id,modules,is_demo").eq("telegram_id", ownerId).maybeSingle();
  if (!owner || owner.is_demo) return;
  await sb.from("bot_customers").upsert({ tg_user_id: from.id, owner_id: ownerId, mode, pending: {}, updated_at: new Date().toISOString() });
  if (mode === "shop") {
    const { data: items } = await sb.from("records").select("id,title,amount,status").eq("owner_id", ownerId).eq("data_type", "stock").in("status", ["in_stock", "low", "available"]).limit(40);
    if (!items?.length) return void (await tg("sendMessage", { chat_id: from.id, text: c("noShop", lang) }));
    const kb = { inline_keyboard: items.map((i) => [{ text: `${i.title} — ${Number(i.amount).toLocaleString("ru-RU")}`, callback_data: `buy:${i.id}` }]) };
    return void (await tg("sendMessage", { chat_id: from.id, text: c("pick", lang), reply_markup: kb }));
  }
  const { data: s } = await sb.from("vip_settings").select("*").eq("owner_id", ownerId).maybeSingle();
  const { paymentLinks } = await import("@/lib/automation.server");
  if (!s?.chat_id || !(Number(s.price) > 0)) return void (await tg("sendMessage", { chat_id: from.id, text: c("noVip", lang) }));
  const { data: order, error } = await sb.from("vip_orders").insert({ owner_id: ownerId, tg_user_id: from.id, user_name: fullName(from), amount: s.price, days: s.days }).select("id,amount").single();
  if (error || !order) { console.error("vip order failed", error); return; }
  const links = paymentLinks({ id: order.id, amount: Number(order.amount) }, s);
  if (!links.length) return void (await tg("sendMessage", { chat_id: from.id, text: c("noVip", lang) }));
  await tg("sendMessage", {
    chat_id: from.id,
    text: `${c("vipOffer", lang)}: ${Number(s.price).toLocaleString("ru-RU")} so'm / ${s.days} ${c("days", lang)}\n\n${c("payHint", lang)}`,
    reply_markup: { inline_keyboard: links.map((l) => [l]) },
  });
}

async function customerBuy(sb: Sb, from: any, recordId: string) {
  const lang = userLang(from);
  if (!/^[0-9a-f-]{36}$/i.test(recordId)) return;
  const { data: cust } = await sb.from("bot_customers").select("owner_id").eq("tg_user_id", from.id).maybeSingle();
  if (!cust?.owner_id) return;
  const { data: item } = await sb.from("records").select("id,title,amount").eq("id", recordId).eq("owner_id", cust.owner_id).eq("data_type", "stock").maybeSingle();
  if (!item) return;
  await sb.from("bot_customers").update({ mode: "shop", pending: { record_id: item.id, title: item.title, amount: item.amount }, updated_at: new Date().toISOString() }).eq("tg_user_id", from.id);
  await tg("sendMessage", { chat_id: from.id, text: `${item.title}\n\n${c("phone", lang)}`, reply_markup: { keyboard: [[{ text: c("sharePhone", lang), request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
}

async function customerContact(sb: Sb, from: any, contact: any) {
  const lang = userLang(from);
  if (Number(contact.user_id) !== Number(from.id)) return;
  const { data: cust } = await sb.from("bot_customers").select("*").eq("tg_user_id", from.id).maybeSingle();
  const pending = (cust?.pending ?? {}) as { record_id?: string; title?: string; amount?: number };
  if (!cust?.owner_id || cust.mode !== "shop" || !pending.record_id) return;
  const phone = String(contact.phone_number ?? "").slice(0, 30);
  const { error } = await sb.from("records").insert({ owner_id: cust.owner_id, title: String(pending.title ?? "").slice(0, 160), client: `${fullName(from)} ${phone}`.slice(0, 120), amount: Number(pending.amount) || 0, status: "new", data_type: "record" });
  if (error) { console.error("shop order failed", error); return; }
  await sb.from("bot_customers").update({ pending: {} }).eq("tg_user_id", from.id);
  await tg("sendMessage", { chat_id: from.id, text: c("ordered", lang), reply_markup: { remove_keyboard: true } });
  const { notifyOwner, escapeHtml } = await import("@/lib/automation.server");
  await notifyOwner(Number(cust.owner_id), `${c("newOrder", lang)}: <b>${escapeHtml(String(pending.title))}</b>\n${escapeHtml(fullName(from))} ${escapeHtml(phone)}`);
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["TELEGRAM_API_KEY"];
        if (!key) return new Response("Not configured", { status: 500 });
        const expected = Buffer.from(webhookSecret(key));
        const actual = Buffer.from(request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "");
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return new Response("Unauthorized", { status: 401 });
        const update = await request.json();
        try {
          await handle(update, new URL(request.url).origin);
        } catch (e) {
          console.error("webhook error", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
