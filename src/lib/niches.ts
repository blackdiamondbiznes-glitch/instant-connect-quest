export type Lang = "uz" | "ru" | "en";
export type L = Record<Lang, string>;
export type Tone = "good" | "warn" | "bad" | "neutral";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "uz", label: "🇺🇿 O'zbekcha" },
  { id: "ru", label: "🇷🇺 Русский" },
  { id: "en", label: "🇬🇧 English" },
];

export const tr = (v: L | undefined, lang: string) => (v ? v[(lang as Lang) in v ? (lang as Lang) : "uz"] : "");

export const WORKSPACES: { id: string; label: L }[] = [
  { id: "public_channel", label: { uz: "📢 Ochiq kanal", ru: "📢 Открытый канал", en: "📢 Public channel" } },
  { id: "private_channel", label: { uz: "🔒 Yopiq kanal", ru: "🔒 Закрытый канал", en: "🔒 Private channel" } },
  { id: "public_group", label: { uz: "👥 Ochiq guruh", ru: "👥 Открытая группа", en: "👥 Public group" } },
  { id: "private_group", label: { uz: "🔐 Yopiq guruh", ru: "🔐 Закрытая группа", en: "🔐 Private group" } },
  { id: "personal", label: { uz: "👤 Shaxsiy foydalanish", ru: "👤 Личное использование", en: "👤 Personal use" } },
];

export const MODULES: Record<string, { label: L; desc: L }> = {
  payments: { label: { uz: "To'lov nazorati", ru: "Контроль оплат", en: "Payment tracking" }, desc: { uz: "Kim to'lagan, kim to'lamagan", ru: "Кто оплатил, кто нет", en: "Who paid and who didn't" } },
  debts: { label: { uz: "Qarzdorlar", ru: "Должники", en: "Debtors" }, desc: { uz: "Qarzlar ro'yxati va eslatmalar", ru: "Список долгов и напоминания", en: "Debt list and reminders" } },
  activity: { label: { uz: "Faollik nazorati", ru: "Контроль активности", en: "Activity tracking" }, desc: { uz: "Nofaol a'zolarni aniqlash", ru: "Выявление неактивных", en: "Spot inactive members" } },
  access: { label: { uz: "Yopiq kirish", ru: "Закрытый доступ", en: "Paid access" }, desc: { uz: "Pullik kanal/guruhga kirish", ru: "Доступ в платный канал/группу", en: "Access to paid channel/group" } },
  reminders: { label: { uz: "Eslatmalar", ru: "Напоминания", en: "Reminders" }, desc: { uz: "Avtomatik eslatma xabarlari", ru: "Автонапоминания", en: "Automatic reminders" } },
  broadcast: { label: { uz: "Ommaviy xabar", ru: "Рассылка", en: "Broadcast" }, desc: { uz: "Barchaga bir xabar", ru: "Одно сообщение всем", en: "One message to all" } },
  catalog: { label: { uz: "Mahsulot katalogi", ru: "Каталог товаров", en: "Product catalog" }, desc: { uz: "Tovarlar va narxlar", ru: "Товары и цены", en: "Products and prices" } },
  orders: { label: { uz: "Buyurtmalar", ru: "Заказы", en: "Orders" }, desc: { uz: "Buyurtmalarni kuzatish", ru: "Отслеживание заказов", en: "Track orders" } },
  stock: { label: { uz: "Ombor qoldig'i", ru: "Остатки склада", en: "Stock levels" }, desc: { uz: "Qoldiq va kirim-chiqim", ru: "Остатки и движение", en: "Inventory in/out" } },
  bookings: { label: { uz: "Qabul / yozilish", ru: "Запись на приём", en: "Bookings" }, desc: { uz: "Vaqt band qilish", ru: "Бронирование времени", en: "Time slot booking" } },
  deposits: { label: { uz: "Oldindan to'lov", ru: "Предоплата", en: "Deposits" }, desc: { uz: "Kelmaslikdan himoya", ru: "Защита от неявок", en: "No-show protection" } },
  waybill: { label: { uz: "Aqlli yuk xati", ru: "Умная накладная", en: "Smart waybill" }, desc: { uz: "Tezkor yuk xati yaratish", ru: "Быстрые накладные", en: "Fast waybills" } },
  dispatch: { label: { uz: "Yetkazish nazorati", ru: "Контроль доставки", en: "Dispatch tracking" }, desc: { uz: "Yo'ldagi yuklar holati", ru: "Статус грузов в пути", en: "Shipments on the way" } },
  listings: { label: { uz: "Obyektlar", ru: "Объекты", en: "Listings" }, desc: { uz: "Uy-joy e'lonlari", ru: "Объявления недвижимости", en: "Property listings" } },
  leads: { label: { uz: "Lidlar", ru: "Лиды", en: "Leads" }, desc: { uz: "Qiziqqan mijozlar", ru: "Заинтересованные клиенты", en: "Interested clients" } },
  schedule: { label: { uz: "Dars jadvali", ru: "Расписание", en: "Schedule" }, desc: { uz: "Darslar va guruhlar vaqti", ru: "Время уроков и групп", en: "Class times" } },
  programs: { label: { uz: "Dasturlar", ru: "Программы", en: "Programs" }, desc: { uz: "Mashg'ulot/ovqatlanish rejalari", ru: "Планы тренировок/питания", en: "Training/nutrition plans" } },
  signals: { label: { uz: "Signallar jurnali", ru: "Журнал сигналов", en: "Signal log" }, desc: { uz: "Natijalar statistikasi", ru: "Статистика результатов", en: "Result statistics" } },
  reviews: { label: { uz: "Sharhlar", ru: "Отзывы", en: "Reviews" }, desc: { uz: "Mijoz fikrlari", ru: "Отзывы клиентов", en: "Client feedback" } },
  confidential: { label: { uz: "Maxfiy qaydlar", ru: "Конфиденциальные заметки", en: "Private notes" }, desc: { uz: "Faqat siz ko'radigan qaydlar", ru: "Заметки только для вас", en: "Notes only you see" } },
  no_shows: { label: { uz: "Kelmaganlar", ru: "Неявки", en: "No-shows" }, desc: { uz: "Qabulga kelmaganlar", ru: "Не пришедшие на приём", en: "Missed appointments" } },
  membership: { label: { uz: "Abonementlar", ru: "Абонементы", en: "Memberships" }, desc: { uz: "Faol abonementlar", ru: "Активные абонементы", en: "Active memberships" } },
  expiry: { label: { uz: "Muddati tugayotganlar", ru: "Истекающие", en: "Expiring" }, desc: { uz: "Abonement/obuna muddati", ru: "Сроки абонементов/подписок", en: "Membership/subscription expiry" } },
  subs: { label: { uz: "Obunalar", ru: "Подписки", en: "Subscriptions" }, desc: { uz: "Obunachilar va muddatlar", ru: "Подписчики и сроки", en: "Subscribers and terms" } },
  delivery_status: { label: { uz: "Yetkazish holati", ru: "Статус доставки", en: "Delivery status" }, desc: { uz: "Yetkazilgan va qaytgan yuklar", ru: "Доставленные и возвраты", en: "Delivered and returned" } },
  inbound: { label: { uz: "Kirim / chiqim", ru: "Приход / расход", en: "Inbound / outbound" }, desc: { uz: "Omborga kirim va chiqim", ru: "Движение по складу", en: "Warehouse movements" } },
  ai_pulse: { label: { uz: "AI kayfiyat tahlili", ru: "AI анализ настроения", en: "AI sentiment pulse" }, desc: { uz: "Foizlarda kayfiyat va mavzular", ru: "Настроение в % и темы", en: "Mood % and topics" } },
  ai_faq: { label: { uz: "AI savollar guruhlash", ru: "AI группировка вопросов", en: "AI question clusters" }, desc: { uz: "Bir javob — hammaga", ru: "Один ответ — всем", en: "Answer once, reach all" } },
};

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
  inbound: { label: { uz: "Kirim", ru: "Приход", en: "Inbound" }, tone: "good" },
  outbound: { label: { uz: "Chiqim", ru: "Расход", en: "Outbound" }, tone: "neutral" },
  completed: { label: { uz: "Yakunlandi", ru: "Завершено", en: "Completed" }, tone: "good" },
};

export type Niche = {
  id: string;
  emoji: string;
  name: L;
  modules: string[];
  members: { label: L; statuses: string[] };
  records: { label: L; statuses: string[] };
  aiContext: string;
};

const AI = ["ai_pulse", "ai_faq"];

export const NICHES: Niche[] = [
  { id: "seller", emoji: "🛍", name: { uz: "Sotuvchi / onlayn do'kon", ru: "Продавец / онлайн-магазин", en: "Seller / online shop" }, modules: ["orders", "debts", "stock", "broadcast", "reviews", ...AI], members: { label: { uz: "Mijozlar", ru: "Клиенты", en: "Customers" }, statuses: ["regular", "debtor", "inactive"] }, records: { label: { uz: "Buyurtmalar", ru: "Заказы", en: "Orders" }, statuses: ["new", "shipped", "delivered", "returned"] }, aiContext: "retail shop: product questions, prices, delivery, sizes, complaints" },
  { id: "tutor", emoji: "📚", name: { uz: "Onlayn o'qituvchi / kurs", ru: "Онлайн-репетитор / курс", en: "Online tutor / course" }, modules: ["payments", "debts", "activity", "schedule", "reminders", ...AI], members: { label: { uz: "O'quvchilar", ru: "Ученики", en: "Students" }, statuses: ["paid", "debtor", "inactive"] }, records: { label: { uz: "Darslar", ru: "Уроки", en: "Lessons" }, statuses: ["scheduled", "done", "cancelled"] }, aiContext: "online lessons: homework, schedule, payments, lesson difficulty" },
  { id: "vip", emoji: "💎", name: { uz: "VIP pullik kanal (signal, kripto)", ru: "VIP платный канал (сигналы, крипто)", en: "VIP paid channel (signals, crypto)" }, modules: ["subs", "payments", "access", "signals", "reminders", "broadcast", ...AI], members: { label: { uz: "Obunachilar", ru: "Подписчики", en: "Subscribers" }, statuses: ["active", "expiring", "expired"] }, records: { label: { uz: "Signallar", ru: "Сигналы", en: "Signals" }, statuses: ["open", "profit", "loss"] }, aiContext: "trading signals channel: entries, profit/loss, subscription renewals" },
  { id: "beauty", emoji: "💅", name: { uz: "Go'zallik saloni / usta", ru: "Салон красоты / мастер", en: "Beauty salon / master" }, modules: ["bookings", "deposits", "no_shows", "reminders", "reviews", "broadcast", ...AI], members: { label: { uz: "Mijozlar", ru: "Клиенты", en: "Clients" }, statuses: ["regular", "new", "lost"] }, records: { label: { uz: "Yozilishlar", ru: "Записи", en: "Appointments" }, statuses: ["booked", "done", "no_show"] }, aiContext: "beauty services: prices, free slots, procedures, results" },
  { id: "fitness", emoji: "🏋️", name: { uz: "Fitnes / sport murabbiy", ru: "Фитнес / тренер", en: "Fitness coach" }, modules: ["membership", "expiry", "activity", "reminders", ...AI], members: { label: { uz: "Shogirdlar", ru: "Подопечные", en: "Clients" }, statuses: ["paid", "debtor", "inactive"] }, records: { label: { uz: "Dasturlar", ru: "Программы", en: "Programs" }, statuses: ["active", "completed", "paused"] }, aiContext: "fitness coaching: workouts, nutrition, progress, motivation" },
  { id: "doctor", emoji: "🩺", name: { uz: "Shifokor / tibbiy maslahat", ru: "Врач / медконсультант", en: "Doctor / medical consultant" }, modules: ["bookings", "deposits", "no_shows", "confidential", "reminders", ...AI], members: { label: { uz: "Bemorlar", ru: "Пациенты", en: "Patients" }, statuses: ["prepaid", "debtor", "inactive"] }, records: { label: { uz: "Qabullar", ru: "Приёмы", en: "Appointments" }, statuses: ["booked", "done", "no_show"] }, aiContext: "medical consultation channel: symptoms, appointments, medications, prices" },
  { id: "psychologist", emoji: "🧠", name: { uz: "Psixolog / terapevt", ru: "Психолог / терапевт", en: "Psychologist / therapist" }, modules: ["bookings", "deposits", "no_shows", "confidential", "reminders", ...AI], members: { label: { uz: "Mijozlar", ru: "Клиенты", en: "Clients" }, statuses: ["active", "debtor", "paused"] }, records: { label: { uz: "Seanslar", ru: "Сессии", en: "Sessions" }, statuses: ["booked", "done", "no_show"] }, aiContext: "psychology practice: anxiety, relationships, session booking, course content" },
  { id: "realestate", emoji: "🏠", name: { uz: "Ko'chmas mulk agenti", ru: "Риелтор", en: "Real estate agent" }, modules: ["listings", "leads", "broadcast", "reminders", ...AI], members: { label: { uz: "Lidlar", ru: "Лиды", en: "Leads" }, statuses: ["hot", "warm", "cold"] }, records: { label: { uz: "Obyektlar", ru: "Объекты", en: "Listings" }, statuses: ["available", "reserved", "sold"] }, aiContext: "real estate listings: prices, districts, mortgage, viewings" },
  { id: "logistics", emoji: "🚚", name: { uz: "Yuk tarqatuvchi / logistika", ru: "Доставка / логистика", en: "Delivery / logistics" }, modules: ["waybill", "dispatch", "delivery_status"], members: { label: { uz: "Do'konlar", ru: "Магазины", en: "Shops" }, statuses: ["paid", "debtor", "inactive"] }, records: { label: { uz: "Yuk xatlari", ru: "Накладные", en: "Waybills" }, statuses: ["loaded", "on_way", "delivered", "returned"] }, aiContext: "delivery to shops: delays, quantities, returns, payments" },
  { id: "educenter", emoji: "🎓", name: { uz: "O'quv markazi (DTM, IELTS)", ru: "Учебный центр (DTM, IELTS)", en: "Education center (DTM, IELTS)" }, modules: ["payments", "debts", "activity", "schedule", "broadcast", "reminders", ...AI], members: { label: { uz: "O'quvchilar", ru: "Ученики", en: "Students" }, statuses: ["paid", "debtor", "inactive"] }, records: { label: { uz: "Guruhlar", ru: "Группы", en: "Groups" }, statuses: ["active", "full", "finished"] }, aiContext: "exam prep center: DTM/IELTS, teachers, schedule, mock tests, payments" },
  { id: "warehouse", emoji: "📦", name: { uz: "Ombor", ru: "Склад", en: "Warehouse" }, modules: ["inbound", "stock"], members: { label: { uz: "Kontragentlar", ru: "Контрагенты", en: "Partners" }, statuses: ["active", "debtor", "inactive"] }, records: { label: { uz: "Tovarlar", ru: "Товары", en: "Items" }, statuses: ["in_stock", "low", "out"] }, aiContext: "warehouse: stock levels, inbound and outbound movements, shortages" },
  { id: "other", emoji: "✨", name: { uz: "Boshqa soha", ru: "Другое", en: "Other" }, modules: ["payments", "debts", "broadcast", "reminders"], members: { label: { uz: "Kontaktlar", ru: "Контакты", en: "Contacts" }, statuses: ["active", "debtor", "inactive"] }, records: { label: { uz: "Yozuvlar", ru: "Записи", en: "Records" }, statuses: ["new", "done", "cancelled"] }, aiContext: "general Telegram community" },
];

export const getNiche = (id?: string | null): Niche => (NICHES.find((n) => n.id === id) ?? NICHES[NICHES.length - 1]!) as Niche;

export const ALL_MODULE_IDS = Object.keys(MODULES);

// ---- Module definitions: what each module shows and which data it may write ----
export type DataType = "member" | "record" | "booking" | "stock" | "waybill" | "subscription" | "insight";
export type ModuleComponent = "list" | "ai" | "none";
export type ModuleDef = { id: string; label: L; desc: L; component: ModuleComponent; data_type: DataType | null; statuses: string[]; niches: string[] };

const D = (component: ModuleComponent, data_type: DataType | null, statuses: string[] = []) => ({ component, data_type, statuses });
const DEFS: Record<string, { component: ModuleComponent; data_type: DataType | null; statuses: string[] }> = {
  payments: D("list", "member", ["paid", "prepaid", "debtor"]),
  debts: D("list", "member", ["debtor"]),
  activity: D("list", "member", ["active", "inactive"]),
  access: D("list", "subscription", ["active", "paused"]),
  subs: D("list", "subscription", ["active", "expiring", "expired"]),
  membership: D("list", "subscription", ["active", "paused"]),
  expiry: D("list", "subscription", ["expiring", "expired"]),
  deposits: D("list", "member", ["prepaid", "debtor"]),
  leads: D("list", "member", ["hot", "warm", "cold"]),
  orders: D("list", "record", ["new", "shipped", "delivered", "returned"]),
  schedule: D("list", "record", ["scheduled", "done", "cancelled"]),
  programs: D("list", "record", ["active", "completed", "paused"]),
  signals: D("list", "record", ["open", "profit", "loss"]),
  listings: D("list", "record", ["available", "reserved", "sold"]),
  bookings: D("list", "booking", ["booked", "done", "no_show", "cancelled"]),
  no_shows: D("list", "booking", ["no_show"]),
  catalog: D("list", "stock", ["available", "reserved", "sold"]),
  stock: D("list", "stock", ["in_stock", "low", "out"]),
  inbound: D("list", "stock", ["inbound", "outbound"]),
  waybill: D("list", "waybill", ["loaded", "on_way", "delivered", "returned"]),
  dispatch: D("list", "waybill", ["loaded", "on_way"]),
  delivery_status: D("list", "waybill", ["delivered", "returned"]),
  ai_pulse: D("ai", "insight"),
  ai_faq: D("ai", "insight"),
  reminders: D("none", null),
  broadcast: D("none", null),
  reviews: D("none", null),
  confidential: D("none", null),
};

export const getModule = (id: string): ModuleDef | null => {
  const m = MODULES[id];
  if (!m) return null;
  const d = DEFS[id] ?? D("none", null);
  return { id, label: m.label, desc: m.desc, ...d, niches: NICHES.filter((n) => n.modules.includes(id)).map((n) => n.id) };
};

/** Which table a data_type lives in. Records additionally carry records.data_type. */
export const tableFor = (t: DataType | null): "members" | "records" | null =>
  t === "member" || t === "subscription" ? "members" : t === "record" || t === "booking" || t === "stock" || t === "waybill" ? "records" : null;

/** Enabled data types for a module list (used by UI and API write checks). */
export const enabledDataTypes = (modules: string[]): Set<DataType> =>
  new Set(modules.map((m) => getModule(m)?.data_type).filter((x): x is DataType => !!x));
