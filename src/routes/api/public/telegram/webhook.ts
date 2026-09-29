import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { tg, webhookSecret } from "@/lib/telegram.server";
import { LANGS, NICHES, UNIVERSAL_MODULES, WORKSPACES, getModule, getNiche, isLang, nichePack, offeredModules, tr, type L, type Lang } from "@/lib/niches";

const T = {
  chooseLang: { uz: "🌐 Tilni tanlang / Выберите язык / Choose language", ru: "🌐 Tilni tanlang / Выберите язык / Choose language", en: "🌐 Tilni tanlang / Выберите язык / Choose language" },
  chooseNiche: { uz: "Botni nima uchun ishlatasiz? Sohangizni tanlang:", ru: "Для чего вам бот? Выберите вашу сферу:", en: "What do you need the bot for? Choose your field:" },
  chooseWs: { uz: "Qayerda faoliyat yuritasiz?", ru: "Где вы ведёте деятельность?", en: "Where do you operate?" },
  chooseMods: { uz: "Kerakli xizmatlarni belgilang (qayta bosish — o'chiradi):", ru: "Отметьте нужные функции (повторное нажатие — убрать):", en: "Pick the features you need (tap again to remove):" },
  back: { uz: "⬅️ Orqaga", ru: "⬅️ Назад", en: "⬅️ Back" },
  done: { uz: "✅ Tayyor", ru: "✅ Готово", en: "✅ Done" },
  ready: { uz: "🎉 Shaxsiy kabinetingiz tayyor!\n\nGuruh yoki kanalingizni ulash uchun botni u yerga <b>admin</b> qilib qo'shing — shunda AI a'zolar kayfiyatini va savollarini tahlil qila boshlaydi.", ru: "🎉 Ваш личный кабинет готов!\n\nДобавьте бота в группу или канал как <b>администратора</b>, чтобы начать AI-анализ настроения и вопросов участников.", en: "🎉 Your cabinet is ready!\n\nAdd the bot to your group/channel as <b>admin</b> to start AI analysis of member mood and questions." },
  readyBook: { uz: "🎉 Kabinet tayyor.\n\n1. Tugma orqali kabinetni oching.\n2. Shu havolani kanal yoki guruhga qo'ying — mijoz shu yerda yoziladi:\n{link}\n3. Kabinet → Sozlamalar → Xizmatlar: narxlaringiz bo'lmasa, havola ishlamaydi.\n\nBotni kanalga admin qilish ixtiyoriy (post va AI uchun).", ru: "🎉 Кабинет готов.\n\n1. Откройте кабинет кнопкой.\n2. Поставьте эту ссылку в канал или группу — клиент запишется здесь:\n{link}\n3. Кабинет → Настройки → Услуги: без цен ссылка не работает.\n\nДелать бота админом канала необязательно (для постов и AI).", en: "🎉 Cabinet is ready.\n\n1. Open the cabinet with the button.\n2. Put this link in your channel or group — clients book there:\n{link}\n3. Cabinet → Settings → Services: the link does nothing until prices are listed.\n\nMaking the bot a channel admin is optional (posts and AI)." },
  open: { uz: "📊 Kabinetni ochish", ru: "📊 Открыть кабинет", en: "📊 Open cabinet" },
  notReady: { uz: "Avval /start bosib sozlashni yakunlang.", ru: "Сначала завершите настройку через /start.", en: "Please finish setup via /start first." },
  connected: { uz: "✅ Ulandi:", ru: "✅ Подключено:", en: "✅ Connected:" },
  connectedNotAdmin: { uz: "⚠️ Bot oddiy a'zo sifatida qo'shildi. Xabarlarni o'qish va tahlil qilish uchun uni <b>admin</b> qiling.", ru: "⚠️ Бот добавлен как обычный участник. Чтобы читать и анализировать сообщения, сделайте его <b>администратором</b>.", en: "⚠️ The bot was added as a regular member. Make it an <b>admin</b> so it can read and analyze messages." },
  disconnected: { uz: "❌ Uzildi:", ru: "❌ Отключено:", en: "❌ Disconnected:" },
  help: { uz: "/start — sozlash\n/cabinet — kabinetni ochish\n/cabinet_reset — kabinet havolasini yangilash (eski havola ishlamay qoladi)\n/salons — salonlar ro'yxati\n/newsalon — yana bir salon ochish", ru: "/start — настройка\n/cabinet — открыть кабинет\n/cabinet_reset — обновить ссылку на кабинет (старая перестанет работать)\n/salons — список салонов\n/newsalon — открыть ещё один салон", en: "/start — set up\n/cabinet — open cabinet\n/cabinet_reset — rotate the cabinet link (the old one stops working)\n/salons — list your salons\n/newsalon — open another salon" },
  askName: { uz: "Salon nomini yozing.\nMasalan: Dilnoza beauty", ru: "Напишите название салона.\nНапример: Dilnoza beauty", en: "Type the salon name.\nFor example: Dilnoza beauty" },
  readySalon: { uz: "🎉 <b>{name}</b> tayyor.\n\nKabinetni oching. Xizmatlar bo'limida narxni yozing, so'ng «Guruhga qo'yish».", ru: "🎉 <b>{name}</b> готов.\n\nОткройте кабинет. В разделе «Услуги» укажите цену, затем «В группу».", en: "🎉 <b>{name}</b> is ready.\n\nOpen the cabinet. Add a price under Services, then post it to the group." },
  reset: { uz: "🔄 Kabinet havolasi yangilandi. Eski havola endi ishlamaydi.", ru: "🔄 Ссылка на кабинет обновлена. Старая больше не работает.", en: "🔄 Cabinet link reset. The old link no longer works." },
  redo: {
    uz: "🔧 <b>Qayta sozlash</b>\n\nO'zgaradi: soha, faoliyat joyi va yoqilgan xizmatlar.\nSaqlanadi: kontaktlar, yozuvlar, ulangan chatlar, AI tarixi, eslatmalar, VIP sozlamalari, obuna va kabinet havolasi.\n\nYangi sohada ishlatilmaydigan ro'yxatlar o'chirilmaydi — faqat yashiriladi va sohani qaytarsangiz yana ko'rinadi.",
    ru: "🔧 <b>Перенастройка</b>\n\nИзменится: сфера, тип площадки и включённые функции.\nСохранится: контакты, записи, подключённые чаты, история AI, напоминания, настройки VIP, подписка и ссылка на кабинет.\n\nСписки, которые не используются в новой сфере, не удаляются — они просто скрываются и вернутся, если вы вернёте сферу.",
    en: "🔧 <b>Reconfigure</b>\n\nChanges: your field, workspace type and enabled features.\nKept: contacts, records, connected chats, AI history, reminders, VIP settings, your plan and cabinet link.\n\nLists the new field doesn't use are not deleted — they're hidden and come back if you switch back.",
  },
  updated: { uz: "✅ Kabinet yangilandi.", ru: "✅ Кабинет обновлён.", en: "✅ Cabinet updated." },
  salons: { uz: "Salonlaringiz. Qaysi biri bilan ishlaysiz?", ru: "Ваши салоны. С каким работать?", en: "Your salons. Which one are you working in?" },
  newSalon: { uz: "Yangi salon. Sohasini tanlang:", ru: "Новый салон. Выберите сферу:", en: "New salon. Choose its field:" },
  finishFirst: { uz: "Avval birinchi salonni /start orqali sozlab tugating.", ru: "Сначала закончите настройку первого салона через /start.", en: "Finish setting up your first salon with /start." },
  salonLimit: { uz: "Bitta akkauntda ko'pi bilan 5 ta salon.", ru: "На одном аккаунте не больше 5 салонов.", en: "One account can have at most 5 salons." },
  switched: { uz: "Shu salon tanlandi.", ru: "Выбран этот салон.", en: "This salon is now active." },
} satisfies Record<string, L>;

const t = (k: keyof typeof T, lang: string) => tr(T[k], lang);

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
type Sb = Awaited<ReturnType<typeof db>>;

function chunk<X>(arr: X[], n: number) {
  const out: X[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const mark = (on: boolean) => (on ? "✅ " : "");
const backRow = (lang: string, to: string) => [{ text: t("back", lang), callback_data: `back:${to}` }];

const langKb = (current?: string) => ({ inline_keyboard: [LANGS.map((l) => ({ text: `${mark(l.id === current)}${l.label}`, callback_data: `lang:${l.id}` }))] });
const nicheKb = (lang: string, current: string | null) => ({
  inline_keyboard: [...NICHES.map((n) => [{ text: `${mark(n.id === current)}${n.emoji} ${tr(n.name, lang)}`, callback_data: `niche:${n.id}` }]), backRow(lang, "lang")],
});
const wsKb = (lang: string, current: string | null) => ({
  inline_keyboard: [...WORKSPACES.map((w) => [{ text: `${mark(w.id === current)}${tr(w.label, lang)}`, callback_data: `ws:${w.id}` }]), backRow(lang, "niche")],
});
function modKb(lang: string, niche: string | null, ws: string | null, selected: string[]) {
  const rows = chunk(offeredModules(niche, ws).map((id) => ({ text: `${selected.includes(id) ? "✅" : "▫️"} ${tr(getModule(id)?.label, lang)}`, callback_data: `mod:${id}` })), 2);
  rows.push([{ text: t("back", lang), callback_data: "back:ws" }, { text: t("done", lang), callback_data: "mods_done" }]);
  return { inline_keyboard: rows };
}

function cabinetKb(origin: string, token: string, lang: string) {
  return { inline_keyboard: [[{ text: t("open", lang), web_app: { url: `${origin}/cabinet/${token}` } }]] };
}

const QUESTION_RE = /\?|\b(qanday|qachon|qayer|qayerda|nega|nima|qancha|necha|mumkinmi|bormi|как|когда|где|почему|сколько|можно|есть ли|how|when|where|why|what|can i|is there)\b/i;

// Telegram service-message fields: never analyzed, never stored as member messages.
const SERVICE_KEYS = [
  "new_chat_members", "left_chat_member", "new_chat_title", "new_chat_photo", "delete_chat_photo", "group_chat_created",
  "supergroup_chat_created", "channel_chat_created", "migrate_to_chat_id", "migrate_from_chat_id", "pinned_message",
  "message_auto_delete_timer_changed", "video_chat_started", "video_chat_ended", "video_chat_scheduled",
  "video_chat_participants_invited", "forum_topic_created", "forum_topic_edited", "forum_topic_closed", "forum_topic_reopened",
  "general_forum_topic_hidden", "general_forum_topic_unhidden", "boost_added", "chat_background_set", "users_shared",
  "chat_shared", "write_access_allowed", "proximity_alert_triggered", "giveaway_created", "giveaway_completed",
];

type Kind = "member_message" | "owner_post" | "channel_post";

/** Classifies a group/channel message. Returns null for anything that must not be stored. */
function classify(update: any, msg: any, ownerId: number): Kind | null {
  if (SERVICE_KEYS.some((k) => msg[k] !== undefined)) return null;
  if (update.channel_post || update.edited_channel_post || msg.chat.type === "channel") return "channel_post";
  if (msg.is_automatic_forward || msg.sender_chat) return "channel_post";
  if (!msg.from || msg.from.is_bot) return null;
  if (Number(msg.from.id) === ownerId) return "owner_post";
  return "member_message";
}

function forwardOrigin(msg: any): { chat: number; message: number } | null {
  if (!msg.is_automatic_forward) return null;
  const o = msg.forward_origin;
  if (o?.type === "channel" && o.chat?.id && o.message_id) return { chat: Number(o.chat.id), message: Number(o.message_id) };
  if (msg.forward_from_chat?.id && msg.forward_from_message_id) return { chat: Number(msg.forward_from_chat.id), message: Number(msg.forward_from_message_id) };
  return null;
}

async function handleChatMember(sb: Sb, m: any) {
  const status = m.new_chat_member?.status;
  const title = m.chat.title ?? String(m.chat.id);
  const { resolveActiveOwner, humanChat } = await import("@/lib/account.server");
  if (status === "administrator" || status === "member") {
    const ownerId = await resolveActiveOwner(m.from.id);
    const { data: owner } = await sb.from("tg_owners").select("telegram_id,account_telegram_id,language").eq("telegram_id", ownerId).maybeSingle();
    if (!owner) return;
    await sb.from("tg_chats").upsert({ chat_id: m.chat.id, owner_id: owner.telegram_id, title: m.chat.title ?? null, chat_type: m.chat.type });
    const note = status === "member" ? `\n\n${t("connectedNotAdmin", owner.language)}` : "";
    await tg("sendMessage", { chat_id: humanChat(owner), text: `${t("connected", owner.language)} ${escapeHtml(title)}${note}`, parse_mode: "HTML" }).catch((e) => console.error("telegram call failed", e));
  } else if (status === "left" || status === "kicked") {
    const { data: chat } = await sb.from("tg_chats").select("owner_id").eq("chat_id", m.chat.id).maybeSingle();
    if (!chat) return;
    await sb.from("tg_chats").delete().eq("chat_id", m.chat.id).eq("owner_id", chat.owner_id);
    const { data: owner } = await sb.from("tg_owners").select("telegram_id,account_telegram_id,language").eq("telegram_id", chat.owner_id).maybeSingle();
    if (owner) await tg("sendMessage", { chat_id: humanChat(owner), text: `${t("disconnected", owner.language)} ${title}` }).catch((e) => console.error("telegram call failed", e));
  }
}

async function handleOnboardingCallback(sb: Sb, q: any, origin: string) {
  const actor = q.from.id as number;
  const data: string = q.data ?? "";
  if (data.startsWith("salon:")) {
    const salonId = Number(data.slice(6));
    const { switchSalon } = await import("@/lib/account.server");
    const salon = Number.isFinite(salonId) ? await switchSalon(actor, salonId) : null;
    if (!salon) return;
    const lang = salon.language;
    await tg("sendMessage", { chat_id: actor, text: `${t("switched", lang)} ${salon.display_name || salon.first_name || ""}`.trim() });
    if (salon.onboarded_at) return void (await tg("sendMessage", { chat_id: actor, text: "📊", reply_markup: cabinetKb(origin, salon.cabinet_token, lang) }));
    await sb.from("tg_owners").update({ step: "salon_name", updated_at: new Date().toISOString() }).eq("telegram_id", salon.telegram_id);
    return void (await tg("sendMessage", { chat_id: actor, text: t("askName", lang) }));
  }
  const { resolveActiveOwner } = await import("@/lib/account.server");
  const uid = await resolveActiveOwner(actor);
  const { data: owner } = await sb.from("tg_owners").select("*").eq("telegram_id", uid).maybeSingle();
  if (!owner) return;
  const edit = (text: string, reply_markup: unknown) =>
    tg("editMessageText", { chat_id: q.message?.chat.id, message_id: q.message?.message_id, text, reply_markup, parse_mode: "HTML" });
  const now = new Date().toISOString();
  const lang = owner.language;

  if (data.startsWith("lang:")) {
    const next = data.slice(5);
    if (!isLang(next)) return;
    if (owner.onboarded_at && owner.niche === "beauty") {
      await sb.from("tg_owners").update({ language: next, step: "ready", updated_at: now }).eq("telegram_id", uid);
      return void (await edit(t("updated", next), cabinetKb(origin, owner.cabinet_token, next)));
    }
    if (owner.onboarded_at && owner.niche) {
      await sb.from("tg_owners").update({ language: next, step: "niche", updated_at: now }).eq("telegram_id", uid);
      return void (await edit(t("chooseNiche", next), nicheKb(next, owner.niche)));
    }
    await sb.from("tg_owners").update({ language: next, step: "salon_name", updated_at: now }).eq("telegram_id", uid);
    return void (await edit(t("askName", next), { inline_keyboard: [] }));
  }
  if (data.startsWith("niche:")) {
    const niche = data.slice(6);
    if (!NICHES.some((n) => n.id === niche)) return;
    // Re-picking the same niche keeps the owner's module choices; a new niche starts from its defaults
    // but carries over the universal modules the owner already chose.
    const current = owner.modules as string[];
    const modules = niche === owner.niche && current.length
      ? current
      : Array.from(new Set([...getNiche(niche).modules, ...current.filter((m) => UNIVERSAL_MODULES.includes(m))]));
    await sb.from("tg_owners").update({ niche, modules, step: "workspace", updated_at: now }).eq("telegram_id", uid);
    return void (await edit(t("chooseWs", lang), wsKb(lang, owner.workspace_type)));
  }
  if (data.startsWith("ws:")) {
    const ws = data.slice(3);
    if (!WORKSPACES.some((w) => w.id === ws)) return;
    const offered = offeredModules(owner.niche, ws);
    const modules = (owner.modules as string[]).filter((m) => offered.includes(m));
    await sb.from("tg_owners").update({ workspace_type: ws, modules, step: "modules", updated_at: now }).eq("telegram_id", uid);
    return void (await edit(t("chooseMods", lang), modKb(lang, owner.niche, ws, modules)));
  }
  if (data.startsWith("mod:")) {
    const id = data.slice(4);
    if (!offeredModules(owner.niche, owner.workspace_type).includes(id)) return;
    const cur = owner.modules as string[];
    const modules = cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id];
    await sb.from("tg_owners").update({ modules, updated_at: now }).eq("telegram_id", uid);
    return void (await tg("editMessageReplyMarkup", { chat_id: q.message?.chat.id, message_id: q.message?.message_id, reply_markup: modKb(lang, owner.niche, owner.workspace_type, modules) }));
  }
  if (data.startsWith("back:")) {
    const to = data.slice(5);
    if (to === "lang") {
      await sb.from("tg_owners").update({ step: "lang", updated_at: now }).eq("telegram_id", uid);
      return void (await edit(t("chooseLang", lang), langKb(lang)));
    }
    if (to === "niche") {
      await sb.from("tg_owners").update({ step: "niche", updated_at: now }).eq("telegram_id", uid);
      return void (await edit(t("chooseNiche", lang), nicheKb(lang, owner.niche)));
    }
    if (to === "ws") {
      await sb.from("tg_owners").update({ step: "workspace", updated_at: now }).eq("telegram_id", uid);
      return void (await edit(t("chooseWs", lang), wsKb(lang, owner.workspace_type)));
    }
    return;
  }
  if (data === "mods_done") {
    if (!owner.niche || !owner.workspace_type) return void (await edit(t("chooseNiche", lang), nicheKb(lang, owner.niche)));
    const wasReady = !!owner.onboarded_at;
    await sb.from("tg_owners").update({ step: "ready", onboarded_at: owner.onboarded_at ?? now, updated_at: now }).eq("telegram_id", uid);
    let text = wasReady ? t("updated", lang) : t("ready", lang);
    if (!wasReady && nichePack(owner.niche).bookingDeposit) {
      const { deepLink } = await import("@/lib/automation.server");
      const link = await deepLink(`book_${uid}`);
      if (link) text = t("readyBook", lang).replaceAll("{link}", link);
    }
    return void (await edit(text, cabinetKb(origin, owner.cabinet_token, lang)));
  }
}

async function handlePrivate(sb: Sb, msg: any, origin: string) {
  const text: string = msg.text ?? "";
  const from = msg.from;
  const payload = text.startsWith("/start ") ? text.slice(7).trim() : "";
  const cm = /^(shop|vip|book)_(-?\d+)$/.exec(payload);
  if (cm) return void (await customerStart(sb, from, cm[1] as "shop" | "vip" | "book", Number(cm[2])));
  if (msg.contact) return void (await customerContact(sb, from, msg.contact));

  const { resolveActiveOwner, listSalons, createExtraSalon } = await import("@/lib/account.server");
  if (text.startsWith("/salons")) {
    const salons = await listSalons(from.id);
    const lang = salons[0]?.language ?? (isLang(from.language_code) ? from.language_code : "uz");
    if (!salons.length) return void (await tg("sendMessage", { chat_id: from.id, text: t("notReady", lang) }));
    const rows = salons.map((s) => [{ text: `${s.display_name || s.first_name || s.niche || "Salon"}`, callback_data: `salon:${s.telegram_id}` }]);
    return void (await tg("sendMessage", { chat_id: from.id, text: t("salons", lang), reply_markup: { inline_keyboard: rows } }));
  }
  if (text.startsWith("/newsalon")) {
    const created = await createExtraSalon(from.id, { first_name: from.first_name ?? null, username: from.username ?? null });
    const lang = created.ok ? created.language : (isLang(from.language_code) ? from.language_code : "uz");
    if (!created.ok) {
      const note = created.error === "finish_first" ? t("finishFirst", lang) : created.error === "salon_limit" ? t("salonLimit", lang) : t("help", lang);
      return void (await tg("sendMessage", { chat_id: from.id, text: note }));
    }
    return void (await tg("sendMessage", { chat_id: from.id, text: t("askName", lang) }));
  }

  const ownerId = await resolveActiveOwner(from.id);
  const { data: owner } = await sb.from("tg_owners").select("*").eq("telegram_id", ownerId).maybeSingle();
  const lang = owner?.language ?? (isLang(from.language_code) ? from.language_code : "uz");
  const now = new Date().toISOString();

  if (text.startsWith("/start")) {
    if (payload === "redo" && owner) {
      await sb.from("tg_owners").update({ step: "niche", updated_at: now }).eq("telegram_id", owner.telegram_id);
      await tg("sendMessage", { chat_id: from.id, text: t("redo", lang), parse_mode: "HTML" });
      return void (await tg("sendMessage", { chat_id: from.id, text: t("chooseNiche", lang), reply_markup: nicheKb(lang, owner.niche) }));
    }
    // Upsert only identity fields: /start never wipes niche, modules or data.
    await sb.from("tg_owners").upsert({
      telegram_id: owner?.telegram_id ?? from.id,
      account_telegram_id: from.id,
      first_name: from.first_name ?? null,
      username: from.username ?? null,
      step: "lang",
      updated_at: now,
    });
    return void (await tg("sendMessage", { chat_id: from.id, text: t("chooseLang", lang), reply_markup: langKb(owner?.language) }));
  }
  if (text.startsWith("/cabinet_reset")) {
    if (!owner?.onboarded_at) return void (await tg("sendMessage", { chat_id: from.id, text: t("notReady", lang) }));
    const token = crypto.randomUUID();
    const { error } = await sb.from("tg_owners").update({ cabinet_token: token, updated_at: now }).eq("telegram_id", owner.telegram_id);
    if (error) return void console.error("cabinet_reset failed", error);
    return void (await tg("sendMessage", { chat_id: from.id, text: t("reset", lang), reply_markup: cabinetKb(origin, token, lang) }));
  }
  if (text.startsWith("/cabinet")) {
    if (!owner?.onboarded_at) return void (await tg("sendMessage", { chat_id: from.id, text: t("notReady", lang) }));
    return void (await tg("sendMessage", { chat_id: from.id, text: "📊", reply_markup: cabinetKb(origin, owner.cabinet_token, lang) }));
  }
  if (owner && !owner.onboarded_at && owner.step === "salon_name" && text && !text.startsWith("/")) {
    const name = text.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!name) return void (await tg("sendMessage", { chat_id: from.id, text: t("askName", lang) }));
    const nowName = new Date().toISOString();
    await sb.from("tg_owners").update({
      display_name: name,
      niche: "beauty",
      modules: ["bookings"],
      workspace_type: owner.workspace_type || "public_group",
      step: "ready",
      onboarded_at: nowName,
      updated_at: nowName,
    }).eq("telegram_id", owner.telegram_id);
    return void (await tg("sendMessage", {
      chat_id: from.id,
      text: t("readySalon", lang).replaceAll("{name}", escapeHtml(name)),
      parse_mode: "HTML",
      reply_markup: cabinetKb(origin, owner.cabinet_token, lang),
    }));
  }
  await tg("sendMessage", { chat_id: from.id, text: t("help", lang) });
}

async function handleChatMessage(sb: Sb, update: any, msg: any) {
  const { data: chat } = await sb.from("tg_chats").select("owner_id").eq("chat_id", msg.chat.id).maybeSingle();
  if (!chat) return;
  const ownerId = Number(chat.owner_id);
  const kind = classify(update, msg, ownerId);
  if (!kind) return;
  const text: string = msg.text ?? msg.caption ?? "";
  const isNew = !!(update.message || update.channel_post);

  // Comments count as engagement on the post they reply to (in a linked discussion group, on the original channel post).
  if (isNew && kind === "member_message" && msg.reply_to_message?.message_id) {
    await bumpReply(sb, msg.chat.id, msg.reply_to_message.message_id);
  }

  if (!text || text.startsWith("/")) return;
  const origin = forwardOrigin(msg);
  const name = kind === "channel_post" ? (msg.sender_chat?.title ?? msg.chat.title) : [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ");
  const { error } = await sb.from("tg_messages").upsert(
    {
      owner_id: ownerId, chat_id: msg.chat.id, message_id: msg.message_id, from_name: name, text: text.slice(0, 2000), kind,
      is_question: kind === "member_message" && QUESTION_RE.test(text),
      origin_chat_id: origin?.chat ?? null, origin_message_id: origin?.message ?? null,
    },
    { onConflict: "chat_id,message_id" },
  );
  if (error) console.error("store message failed", error);

  if (kind === "member_message" && update.message) {
    const { data: owner } = await sb.from("tg_owners").select("modules,language,is_demo").eq("telegram_id", ownerId).maybeSingle();
    if (owner && !owner.is_demo && (owner.modules as string[]).includes("orders")) {
      const { detectGroupOrder } = await import("@/lib/automation.server");
      await detectGroupOrder({ ownerId, chatId: msg.chat.id, messageId: msg.message_id, fromName: name || null, text, lang: owner.language });
    }
  }
}

async function bumpReply(sb: Sb, chatId: number, messageId: number) {
  const { data: target } = await sb.from("tg_messages").select("origin_chat_id,origin_message_id").eq("chat_id", chatId).eq("message_id", messageId).maybeSingle();
  if (!target) return;
  const [c, m] = target.origin_chat_id ? [Number(target.origin_chat_id), Number(target.origin_message_id)] : [chatId, messageId];
  const { error } = await sb.rpc("add_message_engagement", { _chat: c, _msg: m, _reactions: 0, _replies: 1 });
  if (error) console.error("reply engagement failed", error);
}

async function handleReactions(sb: Sb, update: any) {
  if (update.message_reaction_count) {
    const r = update.message_reaction_count;
    const total = (r.reactions ?? []).reduce((s: number, x: any) => s + (Number(x.total_count) || 0), 0);
    const { error } = await sb.rpc("add_message_engagement", { _chat: r.chat.id, _msg: r.message_id, _reactions: total, _replies: 0, _absolute_reactions: true });
    if (error) console.error("reaction count failed", error);
  } else if (update.message_reaction) {
    const r = update.message_reaction;
    const delta = (r.new_reaction?.length ?? 0) - (r.old_reaction?.length ?? 0);
    if (!delta) return;
    const { error } = await sb.rpc("add_message_engagement", { _chat: r.chat.id, _msg: r.message_id, _reactions: delta, _replies: 0 });
    if (error) console.error("reaction delta failed", error);
  }
}

async function handle(update: any, origin: string) {
  const sb = await db();
  if (update.my_chat_member) return handleChatMember(sb, update.my_chat_member);
  if (update.message_reaction || update.message_reaction_count) return handleReactions(sb, update);
  if (update.callback_query) {
    const q = update.callback_query;
    await tg("answerCallbackQuery", { callback_query_id: q.id }).catch((e) => console.error("telegram call failed", e));
    if ((q.data ?? "").startsWith("buy:")) return customerBuy(sb, q.from, q.data.slice(4));
    if ((q.data ?? "").startsWith("bk:")) {
      const { handleBookCallback } = await import("@/lib/booking.server");
      return handleBookCallback(q.from, q.data, userLang(q.from));
    }
    return handleOnboardingCallback(sb, q, origin);
  }
  const msg = update.message ?? update.edited_message ?? update.channel_post ?? update.edited_channel_post;
  if (!msg) return;
  if (msg.chat.type === "private") return handlePrivate(sb, msg, origin);
  return handleChatMessage(sb, update, msg);
}

// ---------- Buyer flows (people who are not cabinet owners; never touch the owner's own account) ----------
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
  currency: { uz: "so'm", ru: "сум", en: "UZS" },
  payHint: { uz: "To'lovdan so'ng kirish havolasi avtomatik yuboriladi.", ru: "После оплаты ссылка для входа придёт автоматически.", en: "Your access link is sent automatically after payment." },
} satisfies Record<string, L>;
const c = (k: keyof typeof C, lang: string) => tr(C[k], lang);
const userLang = (from: any): Lang => (isLang(from?.language_code) ? from.language_code : "uz");
const fullName = (from: any) => [from.first_name, from.last_name].filter(Boolean).join(" ") + (from.username ? ` (@${from.username})` : "");
const escapeHtml = (s: string) => s.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!);

async function customerStart(sb: Sb, from: any, mode: "shop" | "vip" | "book", ownerId: number) {
  const lang = userLang(from);
  if (mode === "book") {
    const { startBooking } = await import("@/lib/booking.server");
    return startBooking(from, ownerId, lang);
  }
  const { data: owner } = await sb.from("tg_owners").select("telegram_id,modules,is_demo").eq("telegram_id", ownerId).maybeSingle();
  if (!owner || owner.is_demo) return;
  await sb.from("bot_customers").upsert({ tg_user_id: from.id, owner_id: ownerId, mode, pending: {}, updated_at: new Date().toISOString() });
  if (mode === "shop") {
    const { data: items } = await sb.from("records").select("id,title,amount,status").eq("owner_id", ownerId).eq("data_type", "stock").in("status", ["in_stock", "low"]).limit(40);
    if (!items?.length) return void (await tg("sendMessage", { chat_id: from.id, text: c("noShop", lang) }));
    const kb = { inline_keyboard: items.map((i) => [{ text: `${i.title} — ${Number(i.amount).toLocaleString("ru-RU")} ${c("currency", lang)}`, callback_data: `buy:${i.id}` }]) };
    return void (await tg("sendMessage", { chat_id: from.id, text: c("pick", lang), reply_markup: kb }));
  }
  const { data: s } = await sb.from("vip_settings").select("*").eq("owner_id", ownerId).maybeSingle();
  if (!(owner.modules as string[]).includes("access") || !s?.chat_id || !(Number(s.price) > 0)) return void (await tg("sendMessage", { chat_id: from.id, text: c("noVip", lang) }));
  const { paymentLinks } = await import("@/lib/automation.server");
  const { data: order, error } = await sb.from("vip_orders").insert({ owner_id: ownerId, tg_user_id: from.id, user_name: fullName(from), amount: s.price, days: s.days }).select("id,amount").single();
  if (error || !order) return void console.error("vip order failed", error);
  const links = paymentLinks({ id: order.id, amount: Number(order.amount) }, s);
  if (!links.length) return void (await tg("sendMessage", { chat_id: from.id, text: c("noVip", lang) }));
  await tg("sendMessage", {
    chat_id: from.id,
    text: `${c("vipOffer", lang)}: ${Number(s.price).toLocaleString("ru-RU")} ${c("currency", lang)} / ${s.days} ${c("days", lang)}\n\n${c("payHint", lang)}`,
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
  const { finishBooking } = await import("@/lib/booking.server");
  const phone = String(contact.phone_number ?? "").slice(0, 30);
  if (await finishBooking(from, phone, lang)) return;
  const { data: cust } = await sb.from("bot_customers").select("*").eq("tg_user_id", from.id).maybeSingle();
  const pending = (cust?.pending ?? {}) as { record_id?: string; title?: string; amount?: number };
  if (!cust?.owner_id || cust.mode !== "shop" || !pending.record_id) return;
  const { error } = await sb.from("records").insert({ owner_id: cust.owner_id, title: String(pending.title ?? "").slice(0, 160), client: `${fullName(from)} ${phone}`.slice(0, 120), amount: Number(pending.amount) || 0, status: "new", data_type: "record" });
  if (error) return void console.error("shop order failed", error);
  await sb.from("bot_customers").update({ pending: {} }).eq("tg_user_id", from.id);
  await tg("sendMessage", { chat_id: from.id, text: c("ordered", lang), reply_markup: { remove_keyboard: true } });
  const { notifyOwner } = await import("@/lib/automation.server");
  const { data: owner } = await sb.from("tg_owners").select("language").eq("telegram_id", cust.owner_id).maybeSingle();
  const ol = owner?.language ?? "uz";
  await notifyOwner(Number(cust.owner_id), `${c("newOrder", ol)}: <b>${escapeHtml(String(pending.title))}</b>\n${escapeHtml(fullName(from))} ${escapeHtml(phone)}`);
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
        let update: unknown;
        try {
          update = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        try {
          const { appUrl } = await import("@/lib/telegram.server");
          await handle(update, appUrl());
        } catch (e) {
          console.error("webhook error", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
