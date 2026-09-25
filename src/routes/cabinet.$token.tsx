import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { LayoutDashboard, Users, ClipboardList, Brain, Puzzle, Plus, Trash2, Loader2, Send, RefreshCw, CheckCircle2 } from "lucide-react";
import { getCabinet, saveMember, saveRecord, deleteItem, saveModules, runAnalysis, answerCluster } from "@/lib/cabinet.functions";
import { getNiche, getModule, tableFor, MODULES, STATUSES, WORKSPACES, tr, type L, type ModuleDef } from "@/lib/niches";
import type { Member, RecordRow } from "@/lib/cabinet.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cabinet/$token")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Shaxsiy kabinet — KabinetAI" },
      { name: "description", content: "Telegram faoliyatingiz uchun shaxsiy kabinet: dashboard, ro'yxatlar va AI tahlil." },
      { property: "og:title", content: "Shaxsiy kabinet — KabinetAI" },
      { property: "og:description", content: "Dashboard, ro'yxatlar va AI tahlil bitta joyda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cabinet,
});

const UI: Record<string, L> = {
  dash: { uz: "Asosiy", ru: "Главная", en: "Home" },
  ai: { uz: "AI tahlil", ru: "AI анализ", en: "AI insights" },
  mods: { uz: "Xizmatlar", ru: "Функции", en: "Features" },
  hello: { uz: "Salom", ru: "Здравствуйте", en: "Hello" },
  add: { uz: "Qo'shish", ru: "Добавить", en: "Add" },
  name: { uz: "Ism", ru: "Имя", en: "Name" },
  title: { uz: "Nomi", ru: "Название", en: "Title" },
  phone: { uz: "Telefon", ru: "Телефон", en: "Phone" },
  amount: { uz: "Summa", ru: "Сумма", en: "Amount" },
  note: { uz: "Izoh", ru: "Заметка", en: "Note" },
  client: { uz: "Mijoz", ru: "Клиент", en: "Client" },
  date: { uz: "Sana", ru: "Дата", en: "Date" },
  save: { uz: "Saqlash", ru: "Сохранить", en: "Save" },
  empty: { uz: "Hozircha bo'sh", ru: "Пока пусто", en: "Nothing yet" },
  all: { uz: "Hammasi", ru: "Все", en: "All" },
  total: { uz: "Jami summa", ru: "Общая сумма", en: "Total amount" },
  debt: { uz: "Jami qarz", ru: "Общий долг", en: "Total debt" },
  chats: { uz: "Ulangan guruh/kanallar", ru: "Подключённые чаты", en: "Connected chats" },
  noChats: { uz: "Hali ulanmagan. Botni guruh yoki kanalingizga admin qilib qo'shing.", ru: "Пока нет. Добавьте бота админом в группу или канал.", en: "None yet. Add the bot as admin to your group or channel." },
  analyze: { uz: "Tahlil qilish", ru: "Анализировать", en: "Analyze" },
  noMsgs: { uz: "Tahlil uchun oxirgi 7 kunda xabarlar yo'q.", ru: "Нет сообщений за 7 дней для анализа.", en: "No messages in the last 7 days to analyze." },
  mood: { uz: "Kayfiyat", ru: "Настроение", en: "Mood" },
  pos: { uz: "ijobiy", ru: "позитив", en: "positive" },
  neu: { uz: "neytral", ru: "нейтрально", en: "neutral" },
  neg: { uz: "norozi", ru: "недовольны", en: "dissatisfied" },
  topics: { uz: "Trend mavzular", ru: "Популярные темы", en: "Trending topics" },
  drivesPos: { uz: "Ijobiy sabablar", ru: "Что радует", en: "Driving positive" },
  drivesNeg: { uz: "Norozilik sabablari", ru: "Что огорчает", en: "Driving complaints" },
  faq: { uz: "Top savollar", ru: "Топ вопросов", en: "Top questions" },
  answer: { uz: "Javob yozing — hammaga yuboriladi", ru: "Ответ — будет отправлен всем", en: "Answer — sent to everyone" },
  send: { uz: "Hammaga yuborish", ru: "Отправить всем", en: "Send to all" },
  answered: { uz: "Javob berilgan (FAQ)", ru: "Отвечено (FAQ)", en: "Answered (FAQ)" },
  trend: { uz: "Kayfiyat dinamikasi", ru: "Динамика", en: "Trend over time" },
  collected: { uz: "Yig'ilgan xabarlar", ru: "Собрано сообщений", en: "Messages collected" },
  modsHint: { uz: "Sohangiz uchun kerakli xizmatlarni yoqing.", ru: "Включите нужные функции.", en: "Turn on the features you need." },
  error: { uz: "Xatolik yuz berdi", ru: "Произошла ошибка", en: "Something went wrong" },
  credits: { uz: "AI limiti tugagan. Keyinroq urinib ko'ring.", ru: "Лимит AI исчерпан.", en: "AI credits exhausted." },
  demo_readonly: { uz: "Demo rejimida o'zgartirish mumkin emas.", ru: "В демо-режиме изменения недоступны.", en: "Changes are disabled in demo mode." },
  plan_expired: { uz: "Obuna muddati tugagan. Davom etish uchun obunani yangilang.", ru: "Подписка истекла. Продлите её, чтобы продолжить.", en: "Your plan has expired. Renew to continue." },
  module_disabled: { uz: "Bu xizmat yoqilmagan.", ru: "Эта функция не включена.", en: "This feature is not enabled." },
  rate_limited: { uz: "Bugungi AI tahlil limiti (3 ta) tugadi. Ertaga urinib ko'ring.", ru: "Дневной лимит AI анализа (3) исчерпан. Попробуйте завтра.", en: "Daily AI analysis limit (3) reached. Try again tomorrow." },
  openInTelegram: { uz: "Kabinetni Telegram bot orqali oching: /cabinet", ru: "Откройте кабинет через Telegram-бота: /cabinet", en: "Open the cabinet from the Telegram bot: /cabinet" },
  demoBanner: { uz: "Demo rejim — faqat ko'rish uchun", ru: "Демо-режим — только просмотр", en: "Demo mode — view only" },
};

/** Telegram Mini App initData; sent with every cabinet call and verified on the server. */
const tgInit = () =>
  typeof window === "undefined" ? "" : ((window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData ?? "");

type Res = { ok: boolean; error?: string | null };
/** Returns true on success; shows a localized toast for known server error codes. */
function okOrToast(r: Res, u: (k: string) => string): boolean {
  if (r.ok) return true;
  toast.error(r.error && UI[r.error] ? u(r.error) : u("error"));
  return false;
}

type Tab = "dash" | "ai" | "mods" | `m:${string}`;
type ModTab = { id: Tab; icon: typeof Users; label: string; mod?: ModuleDef };

/** Tabs come only from the owner's enabled modules (deduped by data slice). */
function buildTabs(modules: string[], lang: string, u: (k: string) => string): ModTab[] {
  const out: ModTab[] = [{ id: "dash", icon: LayoutDashboard, label: u("dash") }];
  const seen = new Set<string>();
  let ai = false;
  for (const id of modules) {
    const m = getModule(id);
    if (!m) continue;
    if (m.component === "ai") { ai = true; continue; }
    if (m.component !== "list") continue;
    const key = `${m.data_type}:${m.statuses.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `m:${id}`, icon: tableFor(m.data_type) === "members" ? Users : ClipboardList, label: tr(m.label, lang), mod: m });
  }
  if (ai) out.push({ id: "ai", icon: Brain, label: u("ai") });
  out.push({ id: "mods", icon: Puzzle, label: u("mods") });
  return out;
}

function Cabinet() {
  const { token } = Route.useParams();
  const fetchCab = useServerFn(getCabinet);
  const q = useQuery({ queryKey: ["cab", token], queryFn: () => fetchCab({ data: { token, initData: tgInit() } }), retry: false });
  const [tab, setTab] = useState<Tab>("dash");

  if (q.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (q.error || !q.data) {
    const unauthorized = String((q.error as Error | null)?.message ?? "").includes("Unauthorized");
    return <div className="flex min-h-screen items-center justify-center whitespace-pre-line p-6 text-center text-muted-foreground">{unauthorized ? Object.values(UI["openInTelegram"]!).join("\n") : "Kabinet topilmadi. Botda /cabinet buyrug'ini yuboring."}</div>;
  }

  const d = q.data;
  const lang = d.owner.language;
  const u = (k: string) => tr(UI[k], lang);
  const niche = getNiche(d.owner.niche);
  const tabs = buildTabs(d.owner.modules, lang, u);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]!;

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-background pb-24">
      <header className="px-5 pb-4 pt-6">
        <p className="text-sm text-muted-foreground">{u("hello")}, {d.owner.first_name ?? ""} 👋</p>
        <h1 className="mt-1 font-display text-2xl font-bold">{niche.emoji} {tr(niche.name, lang)}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{tr(WORKSPACES.find((w) => w.id === d.owner.workspace_type)?.label, lang)}</p>
        {d.owner.is_demo && <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">{u("demoBanner")}</p>}
        {!d.owner.is_demo && d.plan.expired && <p className="mt-3 rounded-xl bg-destructive px-3 py-2 text-xs text-destructive-foreground">{u("plan_expired")}</p>}
      </header>

      <main className="px-5">
        {current.id === "dash" && <Dashboard d={d} u={u} lang={lang} tabs={tabs} go={setTab} />}
        {current.mod && <ListView key={current.id} mod={current.mod} d={d} u={u} lang={lang} token={token} />}
        {current.id === "ai" && <AiView d={d} u={u} token={token} />}
        {current.id === "mods" && <ModsView d={d} u={u} lang={lang} token={token} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex min-w-[72px] flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium", current.id === t.id ? "text-primary" : "text-muted-foreground")}>
              <t.icon className="h-5 w-5" />
              <span className="max-w-full truncate px-1">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

type D = Awaited<ReturnType<typeof getCabinet>>;
type U = (k: string) => string;

const toneCls = (tone?: string) =>
  tone === "good" ? "bg-success text-success-foreground" : tone === "bad" ? "bg-destructive text-destructive-foreground" : tone === "warn" ? "bg-warning text-warning-foreground" : "bg-secondary text-secondary-foreground";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

function itemsFor(d: D, mod: ModuleDef): (Member | RecordRow)[] {
  const inSet = (st: string) => mod.statuses.length === 0 || mod.statuses.includes(st);
  return tableFor(mod.data_type) === "members"
    ? d.members.filter((m) => inSet(m.status))
    : d.records.filter((r) => (r.data_type ?? "record") === mod.data_type && inSet(r.status));
}

function Dashboard({ d, u, lang, tabs, go }: { d: D; u: U; lang: string; tabs: ModTab[]; go: (t: Tab) => void }) {
  const latest = d.insights[0];
  const debt = d.members.filter((m) => STATUSES[m.status]?.tone === "bad").reduce((s, m) => s + Number(m.amount), 0);
  const total = d.records.reduce((s, r) => s + Number(r.amount), 0);
  const modTabs = tabs.filter((t) => t.mod);
  return (
    <div className="space-y-5">
      {modTabs.length > 0 && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {modTabs.map((t) => (
            <button key={t.id} onClick={() => go(t.id)} className="rounded-2xl border border-border bg-card p-3 text-left">
              <t.icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 font-display text-2xl font-bold">{itemsFor(d, t.mod!).length}</p>
              <p className="truncate text-xs text-muted-foreground">{t.label}</p>
            </button>
          ))}
        </section>
      )}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
          <p className="text-xs opacity-80">{u("total")}</p>
          <p className="mt-1 font-display text-xl font-bold">{fmt(total)}</p>
        </div>
        <div className="rounded-2xl bg-accent p-4 text-accent-foreground">
          <p className="text-xs opacity-80">{u("debt")}</p>
          <p className="mt-1 font-display text-xl font-bold">{fmt(debt)}</p>
        </div>
      </section>
      {latest && (
        <button onClick={() => go(tabs.some((t) => t.id === "ai") ? "ai" : "dash")} className="w-full rounded-2xl border border-border bg-card p-4 text-left">
          <p className="text-sm font-semibold">{u("mood")}</p>
          <MoodBar i={latest} u={u} />
        </button>
      )}
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">{u("chats")}</p>
        {d.chats.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{u("noChats")}</p> : (
          <ul className="mt-2 space-y-1 text-sm">{d.chats.map((c) => <li key={c.chat_id}>• {c.title ?? c.chat_id}</li>)}</ul>
        )}
      </section>
    </div>
  );
}

function MoodBar({ i, u }: { i: D["insights"][number]; u: U }) {
  return (
    <>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="bg-success" style={{ width: `${i.positive}%` }} />
        <div className="bg-chart-2" style={{ width: `${i.neutral}%` }} />
        <div className="bg-destructive" style={{ width: `${i.negative}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <span><b>{i.positive}%</b> {u("pos")}</span><span><b>{i.neutral}%</b> {u("neu")}</span><span><b>{i.negative}%</b> {u("neg")}</span>
      </div>
    </>
  );
}

function ListView({ mod, d, u, lang, token }: { mod: ModuleDef; d: D; u: U; lang: string; token: string }) {
  const kind = tableFor(mod.data_type) as "members" | "records";
  const cfg = { label: mod.label, statuses: mod.statuses };
  const items = itemsFor(d, mod);
  const [filter, setFilter] = useState<string>("all");
  const [edit, setEdit] = useState<Partial<Member & RecordRow> | null>(null);
  const qc = useQueryClient();
  const del = useServerFn(deleteItem);
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{tr(cfg.label, lang)}</h2>
        <Button size="sm" onClick={() => setEdit({ status: cfg.statuses[0] ?? "new", amount: 0 })}><Plus className="h-4 w-4" /> {u("add")}</Button>
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {["all", ...cfg.statuses].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
            {s === "all" ? u("all") : tr(STATUSES[s]?.label, lang)} · {s === "all" ? items.length : items.filter((i) => i.status === s).length}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{u("empty")}</p> : (
        <ul className="space-y-2">
          {shown.map((row) => { const it = row as Partial<Member & RecordRow> & { id: string; status: string }; return (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(it)}>
                <p className="truncate font-semibold">{it.name ?? it.title}</p>
                <p className="truncate text-xs text-muted-foreground">{[it.phone ?? it.client, it.due_date, Number(it.amount) ? fmt(Number(it.amount)) : null].filter(Boolean).join(" · ")}</p>
              </button>
              <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", toneCls(STATUSES[it.status]?.tone))}>{tr(STATUSES[it.status]?.label, lang)}</span>
              <button aria-label="delete" className="text-muted-foreground hover:text-destructive" onClick={async () => { try { const r = await del({ data: { token, initData: tgInit(), id: it.id, table: kind } }); if (okOrToast(r, u)) qc.invalidateQueries({ queryKey: ["cab", token] }); } catch { toast.error(u("error")); } }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ); })}
        </ul>
      )}
      {edit && <EditDialog kind={kind} dataType={mod.data_type} item={edit} statuses={cfg.statuses} onClose={() => setEdit(null)} u={u} lang={lang} token={token} />}
    </div>
  );
}

type Form = Partial<Member & RecordRow>;
function EditDialog({ kind, dataType, item, statuses, onClose, u, lang, token }: { kind: "members" | "records"; dataType: ModuleDef["data_type"]; item: Form; statuses: string[]; onClose: () => void; u: U; lang: string; token: string }) {
  const [f, setF] = useState<Form>({ ...item });
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const sm = useServerFn(saveMember);
  const sr = useServerFn(saveRecord);
  const submit = async () => {
    setBusy(true);
    try {
      const initData = tgInit();
      const status = f.status ?? statuses[0] ?? "new";
      const recType = (["record", "booking", "stock", "waybill"] as const).find((t) => t === dataType) ?? "record";
      const r = kind === "members"
        ? await sm({ data: { token, initData, id: f.id, name: f.name ?? "", phone: f.phone ?? null, status, amount: Number(f.amount) || 0, note: f.note ?? null } })
        : await sr({ data: { token, initData, id: f.id, title: f.title ?? "", client: f.client ?? null, status, amount: Number(f.amount) || 0, due_date: f.due_date ?? null, data_type: recType } });
      if (!okOrToast(r, u)) return;
      qc.invalidateQueries({ queryKey: ["cab", token] });
      onClose();
    } catch {
      toast.error(u("error"));
    } finally {
      setBusy(false);
    }
  };
  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? (f.name ?? f.title) : u("add")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {kind === "members" ? (
            <>
              <Input placeholder={u("name")} value={f.name ?? ""} onChange={set("name")} />
              <Input placeholder={u("phone")} value={f.phone ?? ""} onChange={set("phone")} />
            </>
          ) : (
            <>
              <Input placeholder={u("title")} value={f.title ?? ""} onChange={set("title")} />
              <Input placeholder={u("client")} value={f.client ?? ""} onChange={set("client")} />
              <Input type="date" value={f.due_date ?? ""} onChange={set("due_date")} />
            </>
          )}
          <Input type="number" inputMode="numeric" placeholder={u("amount")} value={f.amount ?? 0} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} />
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button key={s} type="button" onClick={() => setF({ ...f, status: s })} className={cn("rounded-full border px-3 py-1 text-xs font-medium", f.status === s ? toneCls(STATUSES[s]?.tone) + " border-transparent" : "border-border")}>
                {tr(STATUSES[s]?.label, lang)}
              </button>
            ))}
          </div>
          {kind === "members" && <Textarea placeholder={u("note")} value={f.note ?? ""} onChange={set("note")} />}
          <Button className="w-full" disabled={busy || !(f.name ?? f.title)} onClick={submit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {u("save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AiView({ d, u, token }: { d: D; u: U; token: string }) {
  const qc = useQueryClient();
  const run = useServerFn(runAnalysis);
  const [busy, setBusy] = useState(false);
  const latest = d.insights[0];
  const open = d.clusters.filter((c) => !c.answer);
  const done = d.clusters.filter((c) => c.answer);

  const analyze = async () => {
    setBusy(true);
    try {
      const r = await run({ data: { token, initData: tgInit() } });
      if (!r.ok) toast.error(r.error === "no_messages" ? u("noMsgs") : r.error === "credits" ? u("credits") : UI[r.error] ? u(r.error) : u("error"));
      qc.invalidateQueries({ queryKey: ["cab", token] });
    } catch {
      toast.error(u("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div>
          <p className="text-xs text-muted-foreground">{u("collected")}</p>
          <p className="font-display text-xl font-bold">{d.messageCount}</p>
        </div>
        <Button onClick={analyze} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {u("analyze")}</Button>
      </div>

      {latest && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">{u("mood")}</p>
          <MoodBar i={latest} u={u} />
          {latest.summary && <p className="mt-3 text-sm text-muted-foreground">{latest.summary}</p>}
        </section>
      )}

      {latest && latest.topics.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">{u("topics")}</p>
          <ul className="space-y-2">
            {latest.topics.map((t, idx) => {
              const max = Math.max(...latest.topics.map((x) => x.count), 1);
              return (
                <li key={idx}>
                  <div className="flex justify-between text-sm"><span>{t.topic}</span><span className="text-muted-foreground">{t.count}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", t.sentiment === "positive" ? "bg-success" : t.sentiment === "negative" ? "bg-destructive" : "bg-chart-2")} style={{ width: `${(t.count / max) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {latest && (
        <section className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-sm font-semibold text-success">{u("drivesPos")}</p>
            <ul className="space-y-1 text-sm">{(latest.positive_drivers as string[]).map((x, i) => <li key={i}>+ {x}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-sm font-semibold text-destructive">{u("drivesNeg")}</p>
            <ul className="space-y-1 text-sm">{(latest.negative_drivers as string[]).map((x, i) => <li key={i}>− {x}</li>)}</ul>
          </div>
        </section>
      )}

      {d.insights.length > 1 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">{u("trend")}</p>
          <div className="flex h-24 items-end gap-2">
            {[...d.insights].reverse().map((i) => (
              <div key={i.id} className="flex flex-1 flex-col overflow-hidden rounded-md" title={new Date(i.created_at).toLocaleDateString()}>
                <div className="bg-destructive" style={{ height: `${i.negative * 0.96}px` }} />
                <div className="bg-chart-2" style={{ height: `${i.neutral * 0.96}px` }} />
                <div className="bg-success" style={{ height: `${i.positive * 0.96}px` }} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 text-sm font-semibold">{u("faq")}</p>
        {open.length === 0 && <p className="text-sm text-muted-foreground">{u("empty")}</p>}
        <div className="space-y-2">{open.map((c) => <ClusterCard key={c.id} c={c} u={u} token={token} />)}</div>
      </section>

      {done.length > 0 && (
        <section>
          <p className="mb-2 text-sm font-semibold">{u("answered")}</p>
          <div className="space-y-2">
            {done.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="flex items-start gap-2 font-semibold"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {c.question}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ClusterCard({ c, u, token }: { c: D["clusters"][number]; u: U; token: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const ans = useServerFn(answerCluster);
  const send = async () => {
    setBusy(true);
    try {
      const r = await ans({ data: { token, initData: tgInit(), id: c.id, answer: text } });
      if (!okOrToast(r, u)) return;
      toast.success(`✓ ${r.sent}`);
      qc.invalidateQueries({ queryKey: ["cab", token] });
    } catch {
      toast.error(u("error"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setExpanded(!expanded)}>
        <p className="font-semibold">{c.question}</p>
        <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-sm font-bold text-accent-foreground">×{c.ask_count}</span>
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1 border-l-2 border-border pl-3 text-xs text-muted-foreground">
          {c.sources.map((s, i) => <li key={i}><b>{s.from}:</b> {s.text}</li>)}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <Textarea rows={2} placeholder={u("answer")} value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="icon" className="shrink-0 self-end" aria-label={u("send")} disabled={busy || !text.trim()} onClick={send}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function ModsView({ d, u, lang, token }: { d: D; u: U; lang: string; token: string }) {
  const [mods, setMods] = useState<string[]>(d.owner.modules);
  const qc = useQueryClient();
  const save = useServerFn(saveModules);
  const niche = getNiche(d.owner.niche);
  const ids = Array.from(new Set([...niche.modules, ...Object.keys(MODULES)]));
  const toggle = async (id: string) => {
    const next = mods.includes(id) ? mods.filter((m) => m !== id) : [...mods, id];
    try {
      const r = await save({ data: { token, initData: tgInit(), modules: next } });
      if (!okOrToast(r, u)) return;
      setMods(next);
      qc.invalidateQueries({ queryKey: ["cab", token] });
    } catch {
      toast.error(u("error"));
    }
  };
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{u("modsHint")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ids.map((id) => {
          const on = mods.includes(id);
          return (
            <button key={id} onClick={() => toggle(id)} className={cn("rounded-2xl border p-4 text-left transition", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
              <p className="font-semibold">{tr(MODULES[id]!.label, lang)}</p>
              <p className={cn("text-xs", on ? "opacity-80" : "text-muted-foreground")}>{tr(MODULES[id]!.desc, lang)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
