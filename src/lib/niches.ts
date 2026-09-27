export type Lang = "uz" | "ru" | "en";
export type L = Record<Lang, string>;
export type Tone = "good" | "warn" | "bad" | "neutral";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "uz", label: "🇺🇿 O'zbekcha" },
  { id: "ru", label: "🇷🇺 Русский" },
  { id: "en", label: "🇬🇧 English" },
];

export const isLang = (v: unknown): v is Lang => v === "uz" || v === "ru" || v === "en";
export const tr = (v: L | undefined, lang: string) => (v ? v[isLang(lang) ? lang : "uz"] : "");

export const WORKSPACES: { id: string; label: L }[] = [
  { id: "public_channel", label: { uz: "📢 Ochiq kanal", ru: "📢 Открытый канал", en: "📢 Public channel" } },
  { id: "private_channel", label: { uz: "🔒 Yopiq kanal", ru: "🔒 Закрытый канал", en: "🔒 Private channel" } },
  { id: "public_group", label: { uz: "👥 Ochiq guruh", ru: "👥 Открытая группа", en: "👥 Public group" } },
  { id: "private_group", label: { uz: "🔐 Yopiq guruh", ru: "🔐 Закрытая группа", en: "🔐 Private group" } },
  { id: "personal", label: { uz: "👤 Shaxsiy foydalanish", ru: "👤 Личное использование", en: "👤 Personal use" } },
];

export const STATUSES: Record<string, { label: L; tone: Tone }> = {
  paid: { label: { uz: "To'lagan", ru: "Оплатил", en: "Paid" }, tone: "good" },
  debtor: { label: { uz: "Qarzdor", ru: "Должник", en: "Debtor" }, tone: "bad" },
  inactive: { label: { uz: "Nofaol", ru: "Неактивен", en: "Inactive" }, tone: "warn" },
  active: { label: { uz: "Faol", ru: "Активен", en: "Active" }, tone: "good" },
  regular: { label: { uz: "Doimiy", ru: "Постоянный", en: "Regular" }, tone: "good" },
  new: { label: { uz: "Yangi", ru: "Новый", en: "New" }, tone: "neutral" },
  lost: { label: { uz: "Yo'qotilgan", ru: "Потерян", en: "Lost" }, tone: "warn" },
  expiring: { label: { uz: "Muddati tugayapti", ru: "Истекает", en: "Expiring" }, tone: "warn" },
  expired: { label: { uz: "Muddati tugagan", ru: "Истёк", en: "Expired" }, tone: "bad" },
  prepaid: { label: { uz: "Oldindan to'lagan", ru: "Предоплата", en: "Prepaid" }, tone: "good" },
  paused: { label: { uz: "To'xtatilgan", ru: "На паузе", en: "Paused" }, tone: "warn" },
  hot: { label: { uz: "Issiq", ru: "Горячий", en: "Hot" }, tone: "good" },
  warm: { label: { uz: "Iliq", ru: "Тёплый", en: "Warm" }, tone: "neutral" },
  cold: { label: { uz: "Sovuq", ru: "Холодный", en: "Cold" }, tone: "warn" },
  scheduled: { label: { uz: "Rejalashtirilgan", ru: "Запланирован", en: "Scheduled" }, tone: "neutral" },
  booked: { label: { uz: "Band qilingan", ru: "Записан", en: "Booked" }, tone: "neutral" },
  done: { label: { uz: "Bajarildi", ru: "Выполнено", en: "Done" }, tone: "good" },
  cancelled: { label: { uz: "Bekor qilindi", ru: "Отменено", en: "Cancelled" }, tone: "bad" },
  no_show: { label: { uz: "Kelmadi", ru: "Неявка", en: "No-show" }, tone: "bad" },
  shipped: { label: { uz: "Jo'natildi", ru: "Отправлен", en: "Shipped" }, tone: "neutral" },
  delivered: { label: { uz: "Yetkazildi", ru: "Доставлен", en: "Delivered" }, tone: "good" },
  returned: { label: { uz: "Qaytarildi", ru: "Возврат", en: "Returned" }, tone: "bad" },
  open: { label: { uz: "Ochiq", ru: "Открыт", en: "Open" }, tone: "neutral" },
  profit: { label: { uz: "Foyda", ru: "Прибыль", en: "Profit" }, tone: "good" },
  loss: { label: { uz: "Zarar", ru: "Убыток", en: "Loss" }, tone: "bad" },
  available: { label: { uz: "Sotuvda", ru: "В продаже", en: "Available" }, tone: "good" },
  reserved: { label: { uz: "Bron", ru: "Бронь", en: "Reserved" }, tone: "warn" },
  sold: { label: { uz: "Sotildi", ru: "Продан", en: "Sold" }, tone: "neutral" },
  loaded: { label: { uz: "Yuklandi", ru: "Загружен", en: "Loaded" }, tone: "neutral" },
  on_way: { label: { uz: "Yo'lda", ru: "В пути", en: "On the way" }, tone: "warn" },
  full: { label: { uz: "To'lgan", ru: "Заполнена", en: "Full" }, tone: "neutral" },
  finished: { label: { uz: "Tugagan", ru: "Завершена", en: "Finished" }, tone: "neutral" },
  in_stock: { label: { uz: "Omborda", ru: "На складе", en: "In stock" }, tone: "good" },
  low: { label: { uz: "Kam qoldi", ru: "Мало", en: "Low" }, tone: "warn" },
  out: { label: { uz: "Tugagan", ru: "Нет в наличии", en: "Out of stock" }, tone: "bad" },
  completed: { label: { uz: "Yakunlandi", ru: "Завершено", en: "Completed" }, tone: "good" },
};

/** Where each data type lives. Records additionally carry records.data_type. */
export type DataType = "member" | "subscription" | "record" | "booking" | "stock" | "waybill" | "insight" | "content";
export type RecordDataType = "record" | "booking" | "stock" | "waybill";
export const RECORD_TYPES: RecordDataType[] = ["record", "booking", "stock", "waybill"];

export const STOCK_STATUSES = ["in_stock", "low", "out"];
const STOCK_LABEL: L = { uz: "Ombor", ru: "Склад", en: "Stock" };

export type Niche = {
  id: string;
  emoji: string;
  name: L;
  modules: string[];
  members: { label: L; statuses: string[] };
  records: { label: L; statuses: string[] };
  /** Which records.data_type holds this niche's primary record list. */
  recordType: "record" | "booking" | "waybill";
  aiContext: string;
};

const AI = ["ai_pulse", "ai_faq"];

export const NICHES: Niche[] = [
  { id: "seller", emoji: "🛍", name: { uz: "Sotuvchi / onlayn do'kon", ru: "Продавец / онлайн-магазин", en: "Retail seller" }, modules: ["orders", "debts", "stock", "broadcast", ...AI], members: { label: { uz: "Mijozlar", ru: "Клиенты", en: "Customers" }, statuses: ["regular", "debtor", "inactive"] }, records: { label: { uz: "Buyurtmalar", ru: "Заказы", en: "Orders" }, statuses: ["new", "shipped", "delivered", "returned"] }, recordType: "record", aiContext: "retail shop: product questions, prices, delivery, sizes, complaints" },
  { id: "tutor", emoji: "🎓", name: { uz: "Onlayn o'qituvchi", ru: "Онлайн-репетитор", en: "Online tutor" }, modules: ["payments", "debts", "activity", "schedule", "reminders", ...AI], members: { label: { uz: "O'quvchilar", ru: "Ученики", en: "Students" }, statuses: ["paid", "debtor", "inactive"] }, records: { label: { uz: "Darslar / guruhlar", ru: "Уроки / группы", en: "Lessons / groups" }, statuses: ["scheduled", "done", "cancelled"] }, recordType: "record", aiContext: "online lessons: homework, schedule, payments, lesson difficulty" },
  { id: "vip", emoji: "💎", name: { uz: "VIP pullik kanal (treyding, kripto)", ru: "VIP платный канал (трейдинг, крипто)", en: "VIP paid channel (trading/crypto)" }, modules: ["subs", "access", "signals", "reminders", "broadcast", ...AI], members: { label: { uz: "Obunachilar", ru: "Подписчики", en: "Subscribers" }, statuses: ["active", "expiring", "expired"] }, records: { label: { uz: "Signallar", ru: "Сигналы", en: "Signals" }, statuses: ["open", "profit", "loss"] }, recordType: "record", aiContext: "trading signals channel: entries, profit/loss, subscription renewals" },
  { id: "beauty", emoji: "💅", name: { uz: "Go'zallik saloni / usta", ru: "Салон красоты / мастер", en: "Beauty salon / master" }, modules: ["bookings", "deposits", "no_shows", "reminders", "broadcast", ...AI], members: { label: { uz: "Mijozlar", ru: "Клиенты", en: "Clients" }, statuses: ["regular", "new", "lost"] }, records: { label: { uz: "Yozilishlar", ru: "Записи", en: "Appointments" }, statuses: ["booked", "done", "no_show"] }, recordType: "booking", aiContext: "beauty services: prices, free slots, procedures, results" },
  { id: "fitness", emoji: "🏋️", name: { uz: "Fitnes murabbiy", ru: "Фитнес-тренер", en: "Fitness coach" }, modules: ["membership", "expiry", "activity", "programs", "reminders", ...AI], members: { label: { uz: "Mijozlar", ru: "Клиенты", en: "Clients" }, statuses: ["paid", "debtor", "inactive"] }, records: { label: { uz: "Dasturlar", ru: "Программы", en: "Programs" }, statuses: ["active", "completed", "paused"] }, recordType: "record", aiContext: "fitness coaching: workouts, nutrition, progress, motivation" },
  { id: "doctor", emoji: "🩺", name: { uz: "Shifokor", ru: "Врач", en: "Doctor" }, modules: ["bookings", "deposits", "no_shows", "reminders", ...AI], members: { label: { uz: "Bemorlar", ru: "Пациенты", en: "Patients" }, statuses: ["prepaid", "debtor", "inactive"] }, records: { label: { uz: "Qabullar", ru: "Приёмы", en: "Appointments" }, statuses: ["booked", "done", "no_show"] }, recordType: "booking", aiContext: "medical consultation channel: symptoms, appointments, medications, prices" },
  { id: "psychologist", emoji: "🧠", name: { uz: "Psixolog", ru: "Психолог", en: "Psychologist" }, modules: ["bookings", "deposits", "no_shows", "reminders", ...AI], members: { label: { uz: "Mijozlar", ru: "Клиенты", en: "Clients" }, statuses: ["active", "debtor", "paused"] }, records: { label: { uz: "Seanslar", ru: "Сессии", en: "Sessions" }, statuses: ["booked", "done", "no_show"] }, recordType: "booking", aiContext: "psychology practice: anxiety, relationships, session booking, course content" },
  { id: "realestate", emoji: "🏠", name: { uz: "Ko'chmas mulk agenti", ru: "Риелтор", en: "Real estate agent" }, modules: ["listings", "leads", "broadcast", "reminders", ...AI], members: { label: { uz: "Lidlar", ru: "Лиды", en: "Leads" }, statuses: ["hot", "warm", "cold"] }, records: { label: { uz: "Obyektlar", ru: "Объекты", en: "Listings" }, statuses: ["available", "reserved", "sold"] }, recordType: "record", aiContext: "real estate listings: prices, districts, mortgage, viewings" },
  { id: "logistics", emoji: "🚚", name: { uz: "Yetkazib berish / logistika", ru: "Доставка / логистика", en: "Delivery / logistics" }, modules: ["waybill", "dispatch", "delivery_status", "payments", "debts"], members: { label: { uz: "Do'konlar", ru: "Магазины", en: "Shops" }, statuses: ["paid", "debtor", "inactive"] }, records: { label: { uz: "Yuk xatlari", ru: "Накладные", en: "Waybills" }, statuses: ["loaded", "on_way", "delivered", "returned"] }, recordType: "waybill", aiContext: "delivery to shops: delays, quantities, returns, payments" },
  { id: "educenter", emoji: "🎓", name: { uz: "O'quv markazi", ru: "Учебный центр", en: "Education center" }, modules: ["payments", "debts", "activity", "schedule", "broadcast", "reminders", ...AI], members: { label: { uz: "O'quvchilar", ru: "Ученики", en: "Students" }, statuses: ["paid", "debtor", "inactive"] }, records: { label: { uz: "Guruhlar", ru: "Группы", en: "Groups" }, statuses: ["active", "full", "finished"] }, recordType: "record", aiContext: "exam prep center: DTM/IELTS, teachers, schedule, mock tests, payments" },
  { id: "other", emoji: "✨", name: { uz: "Boshqa soha", ru: "Другое", en: "Other" }, modules: ["payments", "debts", "broadcast", "reminders"], members: { label: { uz: "Kontaktlar", ru: "Контакты", en: "Contacts" }, statuses: ["active", "debtor", "inactive"] }, records: { label: { uz: "Yozuvlar", ru: "Записи", en: "Records" }, statuses: ["new", "done", "cancelled"] }, recordType: "record", aiContext: "general Telegram community" },
];

export const getNiche = (id?: string | null): Niche => NICHES.find((n) => n.id === id) ?? NICHES[NICHES.length - 1]!;

// ---- Module catalog ----
// Every module is exactly one of:
//  - "list":   a view over member/record data; its statuses are the niche's statuses, optionally narrowed by tone
//  - "screen": an action screen in Settings (reminders, broadcast, VIP)
//  - "ai":     an AI feature shown in the AI tab, each gated independently
// A module may only exist here if its screen is shipped.
export type ModuleKind = "list" | "screen" | "ai";
export type ScreenId = "reminders" | "broadcast" | "vip";
export type ModuleDef = { id: string; label: L; desc: L; kind: ModuleKind; data_type: DataType | null; tones: Tone[] | null; screen: ScreenId | null };

const list = (data_type: DataType, tones: Tone[] | null = null) => ({ kind: "list" as const, data_type, tones, screen: null });
const screen = (s: ScreenId) => ({ kind: "screen" as const, data_type: null, tones: null, screen: s });
const ai = (data_type: DataType) => ({ kind: "ai" as const, data_type, tones: null, screen: null });

const M = (uz: string, ru: string, en: string): L => ({ uz, ru, en });

export const MODULE_DEFS: Record<string, ModuleDef> = Object.fromEntries(
  (
    [
      ["payments", M("To'lov nazorati", "Контроль оплат", "Payment tracking"), M("Kim to'lagan, kim to'lamagan", "Кто оплатил, кто нет", "Who paid and who didn't"), list("member")],
      ["debts", M("Qarzdorlar", "Должники", "Debtors"), M("Qarzi borlar filtri", "Фильтр должников", "Filter people who owe you"), list("member", ["bad"])],
      ["activity", M("Faollik nazorati", "Контроль активности", "Activity tracking"), M("Faol va nofaollar", "Активные и неактивные", "Active vs inactive"), list("member")],
      ["deposits", M("Oldindan to'lov", "Предоплата", "Deposits"), M("Kim oldindan to'lagan", "Кто внёс предоплату", "Who prepaid"), list("member")],
      ["leads", M("Lidlar", "Лиды", "Leads"), M("Issiq, iliq, sovuq mijozlar", "Горячие, тёплые, холодные", "Hot, warm, cold leads"), list("member")],
      ["subs", M("Obunachilar", "Подписчики", "Subscribers"), M("Obuna holati va muddati", "Статус и срок подписки", "Subscription status and term"), list("subscription")],
      ["membership", M("Abonementlar", "Абонементы", "Memberships"), M("Abonement holati", "Статус абонементов", "Membership status"), list("subscription")],
      ["expiry", M("Muddati tugayotganlar", "Истекающие", "Expiring"), M("Tugayotgan va qarzdorlar", "Истекающие и должники", "Expiring and overdue"), list("subscription", ["warn", "bad"])],
      ["orders", M("Buyurtmalar", "Заказы", "Orders"), M("Buyurtmalarni kuzatish", "Отслеживание заказов", "Track orders"), list("record")],
      ["schedule", M("Dars jadvali", "Расписание", "Schedule"), M("Darslar va guruhlar", "Уроки и группы", "Lessons and groups"), list("record")],
      ["programs", M("Dasturlar", "Программы", "Programs"), M("Mashg'ulot rejalari", "Планы тренировок", "Training plans"), list("record")],
      ["signals", M("Signallar jurnali", "Журнал сигналов", "Signal log"), M("Natijalar statistikasi", "Статистика результатов", "Result statistics"), list("record")],
      ["listings", M("Obyektlar", "Объекты", "Listings"), M("Uy-joy e'lonlari", "Объявления недвижимости", "Property listings"), list("record")],
      ["bookings", M("Qabul / yozilish", "Запись на приём", "Bookings"), M("Vaqt band qilish", "Бронирование времени", "Time slot booking"), list("booking")],
      ["no_shows", M("Kelmaganlar", "Неявки", "No-shows"), M("Kelmaganlar filtri", "Фильтр неявок", "Missed appointments filter"), list("booking", ["bad"])],
      ["stock", M("Ombor qoldig'i", "Остатки склада", "Stock levels"), M("Mahsulotlar va qoldiq (bot do'koni uchun ham)", "Товары и остатки (и для магазина в боте)", "Products and stock (also powers the bot shop)"), list("stock")],
      ["waybill", M("Yuk xatlari", "Накладные", "Waybills"), M("Yuk xatlarini yuritish", "Ведение накладных", "Manage waybills"), list("waybill")],
      ["dispatch", M("Yo'ldagi yuklar", "Грузы в пути", "Dispatch"), M("Yuklangan va yo'ldagilar filtri", "Фильтр загруженных и в пути", "Loaded / on the way filter"), list("waybill", ["neutral", "warn"])],
      ["delivery_status", M("Yetkazish natijasi", "Итог доставки", "Delivery results"), M("Yetkazilgan va qaytganlar filtri", "Фильтр доставленных и возвратов", "Delivered / returned filter"), list("waybill", ["good", "bad"])],
      ["reminders", M("Eslatmalar", "Напоминания", "Reminders"), M("Rejalashtirilgan xabarlar", "Запланированные сообщения", "Scheduled messages"), screen("reminders")],
      ["broadcast", M("Ommaviy xabar", "Рассылка", "Broadcast"), M("Barcha chatlarga bir xabar", "Одно сообщение во все чаты", "One message to all chats"), screen("broadcast")],
      ["access", M("Pullik kirish (VIP)", "Платный доступ (VIP)", "Paid access (VIP)"), M("Click/Payme orqali obuna sotish", "Продажа подписки через Click/Payme", "Sell access via Click/Payme"), screen("vip")],
      ["ai_pulse", M("AI kayfiyat tahlili", "AI анализ настроения", "AI sentiment pulse"), M("Foizlarda kayfiyat va mavzular", "Настроение в % и темы", "Mood % and topics"), ai("insight")],
      ["ai_faq", M("AI savollar guruhlash", "AI группировка вопросов", "AI question clusters"), M("Bir javob — hammaga", "Один ответ — всем", "Answer once, reach all"), ai("insight")],
      ["ai_content", M("AI kontent yordamchi", "AI контент-помощник", "AI content engine"), M("Post takliflari va samaradorlik tahlili", "Идеи постов и анализ эффективности", "Post ideas and performance digests"), ai("content")],
    ] as const
  ).map(([id, label, desc, d]) => [id, { id, label, desc, ...d }]),
);

export const ALL_MODULE_IDS = Object.keys(MODULE_DEFS);
export const getModule = (id: string): ModuleDef | null => MODULE_DEFS[id] ?? null;

/** Always offered regardless of niche (§4 step 4). */
export const UNIVERSAL_MODULES = ["reminders", "broadcast", "ai_pulse", "ai_faq", "ai_content"];

/** Modules an owner can toggle, given their niche and workspace. */
export function offeredModules(nicheId: string | null | undefined, workspace: string | null | undefined): string[] {
  const n = getNiche(nicheId);
  const extra = workspace === "private_channel" || workspace === "private_group" ? ["access"] : [];
  return Array.from(new Set([...n.modules, ...UNIVERSAL_MODULES, ...extra])).filter((id) => id in MODULE_DEFS);
}

/** Statuses that exist for a data type within a niche (§5 table). */
export function statusesFor(n: Niche, dt: DataType | null): string[] {
  if (dt === "member" || dt === "subscription") return n.members.statuses;
  if (dt === "stock") return STOCK_STATUSES;
  if (dt === n.recordType) return n.records.statuses;
  return [];
}

export const isMemberType = (dt: DataType | null) => dt === "member" || dt === "subscription";
export const isRecordType = (dt: DataType | null): dt is RecordDataType => !!dt && (RECORD_TYPES as string[]).includes(dt);

function moduleStatuses(n: Niche, m: ModuleDef): string[] {
  const all = statusesFor(n, m.data_type);
  return m.tones ? all.filter((s) => m.tones!.includes(STATUSES[s]?.tone ?? "neutral")) : all;
}

export type RecordSection = { data_type: RecordDataType; label: L; statuses: string[] };
export type Sections = { contacts: { label: L; statuses: string[] } | null; records: RecordSection[] };

/**
 * Merges enabled list modules into (at most) one Contacts screen and one Records screen.
 * Modules sharing a data type become status filter pills in the same list, never separate tabs.
 */
export function listSections(nicheId: string | null | undefined, modules: string[], workspace?: string | null): Sections {
  const n = getNiche(nicheId);
  const offered = new Set(offeredModules(nicheId, workspace ?? null));
  const enabled = modules.map(getModule).filter((m): m is ModuleDef => !!m && m.kind === "list" && (workspace === undefined || offered.has(m.id)));
  const union = (ms: ModuleDef[], all: string[]) => {
    const s = new Set(ms.flatMap((m) => moduleStatuses(n, m)));
    return all.filter((x) => s.has(x));
  };
  const memberMods = enabled.filter((m) => isMemberType(m.data_type));
  const contacts = memberMods.length ? { label: n.members.label, statuses: union(memberMods, n.members.statuses) } : null;
  const records: RecordSection[] = [];
  for (const dt of RECORD_TYPES) {
    const ms = enabled.filter((m) => m.data_type === dt);
    const all = statusesFor(n, dt);
    if (!ms.length || !all.length) continue;
    records.push({ data_type: dt, label: dt === "stock" ? STOCK_LABEL : n.records.label, statuses: union(ms, all) });
  }
  return { contacts, records };
}

/** Enabled data types for a module list (used by API write checks). */
export const enabledDataTypes = (modules: string[]): Set<DataType> =>
  new Set(modules.map((m) => getModule(m)?.data_type).filter((x): x is DataType => !!x));

/** Maps VIP lifecycle to the owner's niche member statuses (a tutor has no literal "active" status). */
export function vipMemberStatus(nicheId: string | null | undefined, phase: "active" | "expiring" | "expired"): string {
  const st = getNiche(nicheId).members.statuses;
  if (st.includes(phase)) return phase;
  const byTone = (t: Tone) => st.find((s) => STATUSES[s]?.tone === t);
  if (phase === "active") return byTone("good") ?? st[0]!;
  return byTone("warn") ?? byTone("bad") ?? st[st.length - 1]!;
}
