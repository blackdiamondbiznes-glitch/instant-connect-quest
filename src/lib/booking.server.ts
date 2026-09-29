import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tg } from "./telegram.server";
import { BOOKING_DAYS, BOOKING_SLOTS, DEFAULT_CLOSE, DEFAULT_OPEN, DEFAULT_SLOT_MINUTES, DEPOSIT_HOLD_MINUTES, addCivilDays, appointmentAt, civilDate, civilWeekday, clockSlots } from "./config";
import { nichePack, tr, type L } from "./niches";
import { escapeHtml, notifyOwner, syncAppointmentReminders } from "./automation.server";

const B = {
  closed: { uz: "Bu salon hozircha onlayn yozilishni ochmagan.", ru: "Этот салон пока не открыл онлайн-запись.", en: "This salon isn't taking online bookings yet." },
  noServices: { uz: "Yozilish ochilishi uchun salon xizmatlar ro'yxatini to'ldirishi kerak. Keyinroq urinib ko'ring.", ru: "Салону нужно заполнить список услуг. Попробуйте позже.", en: "The salon still needs to add its services. Try again later." },
  ownerEmpty: { uz: "Mijoz yozilmoqchi, lekin xizmatlar ro'yxati bo'sh. Kabinet → Xizmatlar.", ru: "Клиент хочет записаться, но список услуг пуст. Кабинет → Услуги.", en: "A client wants to book, but your service list is empty. Cabinet → Services." },
  hello: { uz: "💅 Yozilish: {salon}\nXizmatni tanlang:", ru: "💅 Запись: {salon}\nВыберите услугу:", en: "💅 Booking: {salon}\nPick a service:" },
  pickDay: { uz: "Kunni tanlang:", ru: "Выберите день:", en: "Pick a day:" },
  pickTime: { uz: "Bo'sh vaqtni tanlang:", ru: "Выберите свободное время:", en: "Pick a free time:" },
  noSlots: { uz: "Bu kunda bo'sh vaqt yo'q. Boshqa kunni tanlang.", ru: "В этот день нет свободного времени. Выберите другой день.", en: "No free time that day. Pick another day." },
  noDays: { uz: "Yaqin kunlarda salon yopiq. Keyinroq urinib ko'ring.", ru: "В ближайшие дни салон закрыт. Попробуйте позже.", en: "The salon is closed on the next few days. Try again later." },
  phone: { uz: "Yozilishni tasdiqlash uchun telefon raqamingizni yuboring.", ru: "Отправьте номер телефона, чтобы подтвердить запись.", en: "Send your phone number to confirm the booking." },
  sharePhone: { uz: "📱 Raqamni yuborish", ru: "📱 Отправить номер", en: "📱 Share phone" },
  taken: { uz: "Bu vaqt band bo'lib qoldi. Boshqa vaqtni tanlang.", ru: "Это время уже заняли. Выберите другое.", en: "That time was just taken. Pick another one." },
  booked: { uz: "✅ Yozildingiz!\n{title}\n{date} {time}\nSalon siz bilan bog'lanadi.", ru: "✅ Вы записаны!\n{title}\n{date} {time}\nСалон свяжется с вами.", en: "✅ You're booked!\n{title}\n{date} {time}\nThe salon will contact you." },
  payNow: { uz: "Joy band. Depozit {amount} so'm. {hold} daqiqa ichida to'lamasangiz, yozilish bekor bo'ladi.", ru: "Время занято. Депозит {amount} сум. Если не оплатить за {hold} мин, запись отменится.", en: "The slot is held. Deposit {amount} UZS. Pay within {hold} min or the booking is cancelled." },
  payAtSalon: { uz: "Depozit {amount} so'm. Onlayn to'lov hali ulanmagan — salon joyida oladi.", ru: "Депозит {amount} сум. Онлайн-оплата ещё не подключена — салон возьмёт на месте.", en: "Deposit {amount} UZS. Online payment isn't connected yet — the salon will collect it in person." },
  ownerNeedKeys: { uz: "Mijoz yozildi, lekin depozit uchun Click/Payme kalitlari yo'q. Kabinet → Sozlamalar → Xizmatlar.", ru: "Клиент записался, но ключи Click/Payme для депозита не заданы. Кабинет → Настройки → Услуги.", en: "A client booked, but Click/Payme keys for the deposit are missing. Cabinet → Settings → Services." },
  cancelBtn: { uz: "❌ Yozilishni bekor qilish", ru: "❌ Отменить запись", en: "❌ Cancel booking" },
  cancelled: { uz: "Yozilish bekor qilindi. Vaqt yana bo'sh.", ru: "Запись отменена. Время снова свободно.", en: "Booking cancelled. The time is free again." },
  cancelPaid: { uz: "Yozilish bekor qilindi. Depozit qaytarilishi uchun salon siz bilan bog'lanadi.", ru: "Запись отменена. Салон свяжется с вами по возврату депозита.", en: "Booking cancelled. The salon will contact you about the deposit refund." },
  cancelGone: { uz: "Bu yozilishni bekor qilib bo'lmaydi.", ru: "Эту запись уже нельзя отменить.", en: "This booking can no longer be cancelled." },
  ownerCancel: { uz: "❌ Mijoz yozilishni bekor qildi", ru: "❌ Клиент отменил запись", en: "❌ Client cancelled the booking" },
  ownerRefund: { uz: "Depozit to'langan edi — qaytarishni o'zingiz tasdiqlang.", ru: "Депозит уже оплачен — возврат подтвердите сами.", en: "The deposit was paid — refund it yourself." },
  depositPaid: { uz: "✅ Depozit qabul qilindi. Yozilish tasdiqlandi.\n{title}\n{date} {time}", ru: "✅ Депозит получен. Запись подтверждена.\n{title}\n{date} {time}", en: "✅ Deposit received. Booking confirmed.\n{title}\n{date} {time}" },
  ownerDeposit: { uz: "💳 Depozit tushdi", ru: "💳 Депозит получен", en: "💳 Deposit received" },
  depositExpired: { uz: "Depozit vaqtida to'lanmadi, yozilish bekor qilindi. Qayta yozilishingiz mumkin.", ru: "Депозит не оплачен вовремя, запись отменена. Можно записаться снова.", en: "The deposit wasn't paid in time, so the booking was cancelled. You can book again." },
  ownerDepositExpired: { uz: "Depozitsiz qolgan yozilish bekor qilindi, vaqt bo'shadi.", ru: "Запись без депозита отменена, время свободно.", en: "An unpaid booking was cancelled and the slot is free." },
  ownerNew: { uz: "💅 Yangi yozilish", ru: "💅 Новая запись", en: "💅 New booking" },
  today: { uz: "Bugun", ru: "Сегодня", en: "Today" },
  tomorrow: { uz: "Ertaga", ru: "Завтра", en: "Tomorrow" },
  otherDay: { uz: "Boshqa kun", ru: "Другой день", en: "Another day" },
  confirmBtn: { uz: "Tasdiqlash", ru: "Подтвердить", en: "Confirm" },
  declineBtn: { uz: "Bekor", ru: "Отмена", en: "Back" },
  accepted: { uz: "Yozuv qabul qilindi.", ru: "Запись принята.", en: "You're booked." },
  remindNote: { uz: "Eslatma {hours} soat oldin shu chatga keladi.", ru: "Напоминание придёт в этот чат за {hours} ч.", en: "A reminder arrives in this chat {hours} h before." },
  remindSkip: { uz: "Vaqt yaqin, eslatma yuborilmaydi.", ru: "Время близко, напоминание не отправится.", en: "It's soon, so no reminder will be sent." },
  confirmLine: { uz: "{title}\n{date}, {time}\n{price} so'm", ru: "{title}\n{date}, {time}\n{price} сум", en: "{title}\n{date}, {time}\n{price} UZS" },
  backed: { uz: "Bekor qilindi.", ru: "Отменено.", en: "Cancelled." },
  restart: { uz: "Bu tasdiq eskirgan. Yozilishni qaytadan boshlang.", ru: "Это подтверждение устарело. Начните запись заново.", en: "That confirmation expired. Start the booking again." },
} satisfies Record<string, L>;

const b = (k: keyof typeof B, lang: string) => tr(B[k], lang);
const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const money = (n: number) => Math.round(n).toLocaleString("ru-RU");

type Pending = { service_id?: string; title?: string; amount?: number; date?: string; time?: string };
type Hours = {
  slots: string[];
  closed: Set<number>;
  deposit: number;
  remind: number;
  click_service_id: string | null;
  click_merchant_id: string | null;
  payme_merchant_id: string | null;
  shut: string | null;
};

const salonName = (o: { display_name?: string | null; first_name?: string | null }) => o.display_name?.trim() || o.first_name || "Salon";

async function ownerRow(id: number) {
  const { data } = await supabaseAdmin.from("tg_owners").select("telegram_id, first_name, display_name, language, niche, modules, is_demo").eq("telegram_id", id).maybeSingle();
  return data;
}

function bookable(o: { niche: string | null; modules: string[] | null; is_demo: boolean } | null) {
  if (!o || o.is_demo) return false;
  return nichePack(o.niche).bookingDeposit && (o.modules ?? []).includes("bookings");
}

async function services(ownerId: number) {
  const { data } = await supabaseAdmin.from("booking_services").select("id,title,price").eq("owner_id", ownerId).eq("active", true).order("title").limit(30);
  return data ?? [];
}

export async function hoursFor(ownerId: number): Promise<Hours> {
  const { data } = await supabaseAdmin.from("booking_settings")
    .select("open_time,close_time,slot_minutes,closed_days,deposit_amount,click_service_id,click_merchant_id,payme_merchant_id")
    .eq("owner_id", ownerId).maybeSingle();
  const slots = clockSlots(data?.open_time ?? DEFAULT_OPEN, data?.close_time ?? DEFAULT_CLOSE, data?.slot_minutes ?? DEFAULT_SLOT_MINUTES);
  const closed = new Set((data?.closed_days ?? "").split(",").filter(Boolean).map((x) => Number(x)).filter((n) => n >= 0 && n <= 6));
  const { data: rem } = await supabaseAdmin.from("booking_settings").select("reminder_hours").eq("owner_id", ownerId).maybeSingle();
  const { data: shut } = await supabaseAdmin.from("booking_settings").select("closed_on").eq("owner_id", ownerId).maybeSingle();
  return {
    slots: slots.length ? slots : [...BOOKING_SLOTS],
    closed,
    deposit: Math.max(0, Number(data?.deposit_amount) || 0),
    remind: rem?.reminder_hours === 24 ? 24 : 2,
    click_service_id: data?.click_service_id ?? null,
    click_merchant_id: data?.click_merchant_id ?? null,
    payme_merchant_id: data?.payme_merchant_id ?? null,
    shut: shut?.closed_on ?? null,
  };
}

async function taken(ownerId: number, date: string) {
  const { data } = await supabaseAdmin.from("records").select("due_time").eq("owner_id", ownerId).eq("data_type", "booking").eq("status", "booked").eq("due_date", date);
  return new Set((data ?? []).map((r) => r.due_time).filter(Boolean));
}

function dayButtons(lang: string, closed: Set<number>, shut: string | null) {
  const today = civilDate();
  const row: { text: string; callback_data: string }[] = [];
  for (let i = 0; i < BOOKING_DAYS; i++) {
    const date = addCivilDays(today, i);
    if (date === shut || closed.has(civilWeekday(date))) continue;
    const label = i === 0 ? b("today", lang) : i === 1 ? b("tomorrow", lang) : b("otherDay", lang);
    row.push({ text: label, callback_data: `bk:d:${date}` });
  }
  return row.length ? [row] : [];
}

const MONTHS: Record<string, string[]> = {
  uz: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
  ru: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
function prettyDate(iso: string, lang: string) {
  const [, m, d] = iso.split("-");
  const names = MONTHS[lang] ?? MONTHS["uz"]!;
  return `${Number(d)}-${names[Number(m) - 1] ?? m}`;
}

function openDays(closed: Set<number>, shut: string | null) {
  const today = civilDate();
  return Array.from({ length: BOOKING_DAYS }, (_, i) => addCivilDays(today, i)).filter((date) => date !== shut && !closed.has(civilWeekday(date)));
}

export async function startBooking(from: { id: number; first_name?: string; language_code?: string }, ownerId: number, lang: string) {
  const owner = await ownerRow(ownerId);
  if (!bookable(owner)) return void (await tg("sendMessage", { chat_id: from.id, text: b("closed", lang) }));
  const menu = await services(ownerId);
  if (!menu.length) {
    await tg("sendMessage", { chat_id: from.id, text: b("noServices", lang) });
    await notifyOwner(ownerId, b("ownerEmpty", owner!.language));
    return;
  }
  await supabaseAdmin.from("bot_customers").upsert({ tg_user_id: from.id, owner_id: ownerId, mode: "book", pending: {}, updated_at: new Date().toISOString() });
  await tg("sendMessage", {
    chat_id: from.id,
    text: fill(b("hello", lang), { salon: salonName(owner!) }),
    reply_markup: { inline_keyboard: menu.map((s) => [{ text: `${s.title} — ${Number(s.price).toLocaleString("ru-RU")}`, callback_data: `bk:s:${s.id}` }]) },
  });
}

export async function handleBookCallback(from: { id: number; first_name?: string; last_name?: string; username?: string }, data: string, lang: string) {
  if (data.startsWith("bk:x:")) return cancelByClient(from.id, data.slice(5), lang);
  if (data === "bk:ok") return confirmBooking(from, lang);
  if (data === "bk:no") {
    await supabaseAdmin.from("bot_customers").update({ pending: {}, updated_at: new Date().toISOString() }).eq("tg_user_id", from.id);
    return void (await tg("sendMessage", { chat_id: from.id, text: b("backed", lang) }));
  }
  const { data: cust } = await supabaseAdmin.from("bot_customers").select("owner_id, mode, pending").eq("tg_user_id", from.id).maybeSingle();
  if (!cust?.owner_id || cust.mode !== "book") return;
  const ownerId = Number(cust.owner_id);
  const pending = (cust.pending ?? {}) as Pending;
  const owner = await ownerRow(ownerId);
  if (!bookable(owner)) return void (await tg("sendMessage", { chat_id: from.id, text: b("closed", lang) }));
  const hours = await hoursFor(ownerId);

  if (data.startsWith("bk:s:")) {
    const id = data.slice(5);
    const { data: svc } = await supabaseAdmin.from("booking_services").select("id,title,price").eq("id", id).eq("owner_id", ownerId).eq("active", true).maybeSingle();
    if (!svc) return;
    const next: Pending = { service_id: svc.id, title: svc.title, amount: Number(svc.price) };
    await supabaseAdmin.from("bot_customers").update({ pending: next, updated_at: new Date().toISOString() }).eq("tg_user_id", from.id);
    const days = dayButtons(lang, hours.closed, hours.shut);
    if (!days.length) return void (await tg("sendMessage", { chat_id: from.id, text: b("noDays", lang) }));
    return void (await tg("sendMessage", { chat_id: from.id, text: `${svc.title}\n\n${b("pickDay", lang)}`, reply_markup: { inline_keyboard: days } }));
  }

  if (data.startsWith("bk:d:")) {
    const date = data.slice(5);
    if (!openDays(hours.closed, hours.shut).includes(date) || !pending.service_id) return;
    const busy = await taken(ownerId, date);
    const free = hours.slots.filter((s) => !busy.has(s));
    const { time: _ignored, ...rest } = pending;
    await supabaseAdmin.from("bot_customers").update({ pending: { ...rest, date }, updated_at: new Date().toISOString() }).eq("tg_user_id", from.id);
    const days = dayButtons(lang, hours.closed, hours.shut);
    if (!free.length) return void (await tg("sendMessage", { chat_id: from.id, text: b("noSlots", lang), reply_markup: { inline_keyboard: days } }));
    const rows = [];
    for (let i = 0; i < free.length; i += 3) rows.push(free.slice(i, i + 3).map((tm) => ({ text: tm, callback_data: `bk:t:${tm}` })));
    return void (await tg("sendMessage", { chat_id: from.id, text: `${prettyDate(date, lang)}\n${b("pickTime", lang)}`, reply_markup: { inline_keyboard: rows } }));
  }

  if (data.startsWith("bk:t:")) {
    const time = data.slice(5);
    if (!hours.slots.includes(time) || !pending.date || !pending.service_id) return;
    const busy = await taken(ownerId, pending.date);
    if (busy.has(time)) return void (await tg("sendMessage", { chat_id: from.id, text: b("taken", lang), reply_markup: { inline_keyboard: dayButtons(lang, hours.closed, hours.shut) } }));
    await supabaseAdmin.from("bot_customers").update({ pending: { ...pending, time }, updated_at: new Date().toISOString() }).eq("tg_user_id", from.id);
    const text = fill(b("confirmLine", lang), { title: pending.title ?? "", date: prettyDate(pending.date, lang), time, price: money(Number(pending.amount) || 0) });
    return void (await tg("sendMessage", {
      chat_id: from.id,
      text,
      reply_markup: { inline_keyboard: [[{ text: b("confirmBtn", lang), callback_data: "bk:ok" }, { text: b("declineBtn", lang), callback_data: "bk:no" }]] },
    }));
  }
}

async function confirmBooking(from: { id: number; first_name?: string; last_name?: string; username?: string }, lang: string) {
  const ok = await finishBooking(from, null, lang);
  if (!ok) await tg("sendMessage", { chat_id: from.id, text: b("restart", lang) });
}

async function cancelByClient(tgId: number, recordId: string, lang: string) {
  if (!/^[0-9a-f-]{36}$/i.test(recordId)) return;
  const { data: rec } = await supabaseAdmin.from("records").select("id,owner_id,title,client,status,due_date,due_time,deposit_paid,customer_tg_id").eq("id", recordId).maybeSingle();
  if (!rec || Number(rec.customer_tg_id) !== tgId || rec.status !== "booked") {
    return void (await tg("sendMessage", { chat_id: tgId, text: b("cancelGone", lang) }));
  }
  const { data: moved } = await supabaseAdmin.from("records").update({ status: "cancelled" }).eq("id", rec.id).eq("status", "booked").select("id");
  if (!moved?.length) return void (await tg("sendMessage", { chat_id: tgId, text: b("cancelGone", lang) }));
  await supabaseAdmin.from("booking_deposits").update({ status: "cancelled" }).eq("record_id", rec.id).eq("status", "pending");
  const owner = await ownerRow(Number(rec.owner_id));
  if (owner) await syncAppointmentReminders({ telegram_id: Number(rec.owner_id), language: owner.language, niche: owner.niche }, { ...rec, status: "cancelled" });
  await tg("sendMessage", { chat_id: tgId, text: rec.deposit_paid ? b("cancelPaid", lang) : b("cancelled", lang) });
  if (owner) {
    const extra = rec.deposit_paid ? `\n${b("ownerRefund", owner.language)}` : "";
    await notifyOwner(Number(rec.owner_id), `${b("ownerCancel", owner.language)}: <b>${escapeHtml(rec.title)}</b>\n${escapeHtml(rec.client ?? "")}\n${rec.due_date ?? ""} ${rec.due_time ?? ""}${extra}`);
  }
}

export async function finishBooking(from: { id: number; first_name?: string; last_name?: string; username?: string }, phone: string | null, lang: string) {
  const { data: cust } = await supabaseAdmin.from("bot_customers").select("owner_id, mode, pending").eq("tg_user_id", from.id).maybeSingle();
  const pending = (cust?.pending ?? {}) as Pending;
  if (!cust?.owner_id || cust.mode !== "book" || !pending.service_id || !pending.date || !pending.time || !pending.title) return false;
  const ownerId = Number(cust.owner_id);
  const owner = await ownerRow(ownerId);
  if (!bookable(owner)) return false;
  const hours = await hoursFor(ownerId);
  const days = dayButtons(lang, hours.closed, hours.shut);
  if (!hours.slots.includes(pending.time) || !openDays(hours.closed, hours.shut).includes(pending.date)) {
    await tg("sendMessage", { chat_id: from.id, text: b("taken", lang), reply_markup: { remove_keyboard: true } });
    if (days.length) await tg("sendMessage", { chat_id: from.id, text: b("pickDay", lang), reply_markup: { inline_keyboard: days } });
    return true;
  }
  const busy = await taken(ownerId, pending.date);
  if (busy.has(pending.time)) {
    await tg("sendMessage", { chat_id: from.id, text: b("taken", lang), reply_markup: { remove_keyboard: true } });
    await tg("sendMessage", { chat_id: from.id, text: b("pickDay", lang), reply_markup: { inline_keyboard: days } });
    return true;
  }
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").slice(0, 120) || "Mijoz";
  const { data: existing } = await supabaseAdmin.from("members").select("id,status").eq("owner_id", ownerId).eq("tg_user_id", from.id).maybeSingle();
  if (existing) {
    await supabaseAdmin.from("members").update(phone ? { name, phone } : { name }).eq("id", existing.id).eq("owner_id", ownerId);
  } else {
    const { error } = await supabaseAdmin.from("members").insert({ owner_id: ownerId, name, phone, status: "new", amount: 0, tg_user_id: from.id });
    if (error) { console.error("booking member failed", error); return true; }
  }
  const { data: rec, error } = await supabaseAdmin.from("records").insert({
    owner_id: ownerId, title: pending.title.slice(0, 160), client: name, status: "booked",
    amount: Number(pending.amount) || 0, due_date: pending.date, due_time: pending.time, deposit_paid: false, data_type: "booking",
    customer_tg_id: from.id,
  }).select("id,title,client,status,due_date,due_time,deposit_paid").single();
  if (error || !rec) {
    console.error("booking insert failed", error);
    await tg("sendMessage", { chat_id: from.id, text: b("taken", lang), reply_markup: { remove_keyboard: true } });
    return true;
  }
  await syncAppointmentReminders({ telegram_id: ownerId, language: owner!.language, niche: owner!.niche }, rec);
  await supabaseAdmin.from("bot_customers").update({ pending: {}, updated_at: new Date().toISOString() }).eq("tg_user_id", from.id);

  const when = appointmentAt(pending.date, pending.time);
  const remindAt = new Date(when.getTime() - hours.remind * 3600000);
  const note = remindAt.getTime() > Date.now() ? fill(b("remindNote", lang), { hours: String(hours.remind) }) : b("remindSkip", lang);
  await tg("sendMessage", {
    chat_id: from.id,
    text: `${b("accepted", lang)}\n\n${note}`,
    reply_markup: { inline_keyboard: [[{ text: b("cancelBtn", lang), callback_data: `bk:x:${rec.id}` }]] },
  });

  const who = `${name}${from.username ? ` (@${from.username})` : ""}`;
  await notifyOwner(ownerId, `${b("ownerNew", owner!.language)}: <b>${escapeHtml(pending.title)}</b>\n${escapeHtml(who)}\n${pending.date} ${pending.time}`);
  return true;
}

/** Click/Payme confirmed a booking deposit. */
export async function fulfillBookingDeposit(orderId: string, provider: string, providerTx: string | null) {
  const { data: o } = await supabaseAdmin.from("booking_deposits").select("*").eq("id", orderId).maybeSingle();
  if (!o) return false;
  if (o.status === "paid") return true;
  const { data: upd } = await supabaseAdmin.from("booking_deposits")
    .update({ status: "paid", provider, provider_tx: providerTx ?? o.provider_tx, paid_at: new Date().toISOString() })
    .eq("id", o.id).eq("status", "pending").select("id");
  if (!upd?.length) return true;
  const { data: rec } = await supabaseAdmin.from("records").select("id,title,client,status,due_date,due_time,deposit_paid").eq("id", o.record_id ?? "").maybeSingle();
  const owner = await ownerRow(Number(o.owner_id));
  const lang = owner?.language ?? "uz";
  if (rec && rec.status === "booked") {
    await supabaseAdmin.from("records").update({ deposit_paid: true }).eq("id", rec.id);
    await tg("sendMessage", {
      chat_id: o.tg_user_id,
      text: fill(b("depositPaid", lang), { title: rec.title, date: rec.due_date ?? "", time: rec.due_time ?? "" }),
    }).catch(() => {});
  }
  if (owner && rec) {
    await notifyOwner(Number(o.owner_id), `${b("ownerDeposit", owner.language)}: <b>${escapeHtml(rec.title)}</b> — ${money(Number(o.amount))} (${provider})`);
    await syncAppointmentReminders({ telegram_id: Number(o.owner_id), language: owner.language, niche: owner.niche }, { ...rec, deposit_paid: true });
  }
  return true;
}

/** Frees slots whose deposit was never paid. Called from the hourly tick. */
export async function releaseUnpaidDeposits() {
  const cutoff = new Date(Date.now() - DEPOSIT_HOLD_MINUTES * 60_000).toISOString();
  const { data } = await supabaseAdmin.from("booking_deposits").select("id,owner_id,record_id,tg_user_id").eq("status", "pending").lt("created_at", cutoff).limit(100);
  let freed = 0;
  for (const d of data ?? []) {
    const { data: claimed } = await supabaseAdmin.from("booking_deposits").update({ status: "cancelled" }).eq("id", d.id).eq("status", "pending").select("id");
    if (!claimed?.length || !d.record_id) continue;
    const { data: rec } = await supabaseAdmin.from("records").select("id,title,client,status,due_date,due_time,deposit_paid").eq("id", d.record_id).maybeSingle();
    if (!rec || rec.status !== "booked" || rec.deposit_paid) continue;
    const { data: moved } = await supabaseAdmin.from("records").update({ status: "cancelled" }).eq("id", rec.id).eq("status", "booked").eq("deposit_paid", false).select("id");
    if (!moved?.length) continue;
    const owner = await ownerRow(Number(d.owner_id));
    if (owner) await syncAppointmentReminders({ telegram_id: Number(d.owner_id), language: owner.language, niche: owner.niche }, { ...rec, status: "cancelled" });
    await tg("sendMessage", { chat_id: d.tg_user_id, text: b("depositExpired", owner?.language ?? "uz") }).catch(() => {});
    if (owner) await notifyOwner(Number(d.owner_id), b("ownerDepositExpired", owner.language));
    freed++;
  }
  return freed;
}

/** Payment provider cancelled a deposit that was never completed. Frees the slot. */
export async function abortUnpaidDeposit(recordId: string | null) {
  if (!recordId) return;
  const { data: rec } = await supabaseAdmin.from("records").select("id,owner_id,title,client,status,due_date,due_time,deposit_paid").eq("id", recordId).maybeSingle();
  if (!rec || rec.status !== "booked" || rec.deposit_paid) return;
  const { data: moved } = await supabaseAdmin.from("records").update({ status: "cancelled" }).eq("id", rec.id).eq("status", "booked").eq("deposit_paid", false).select("id");
  if (!moved?.length) return;
  const owner = await ownerRow(Number(rec.owner_id));
  if (owner) await syncAppointmentReminders({ telegram_id: Number(rec.owner_id), language: owner.language, niche: owner.niche }, { ...rec, status: "cancelled" });
}
