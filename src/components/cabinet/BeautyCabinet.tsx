import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { deleteService, postBookingCard, postTodayList, saveBookingSettings, saveProfile, saveRecord, saveService, setRecordStatus, closeToday } from "@/lib/cabinet.functions";
import { BOOKING_SLOTS, DEFAULT_CLOSE, DEFAULT_OPEN, DEFAULT_SLOT_MINUTES, civilDate, clockSlots } from "@/lib/config";
import { STATUSES, tr, type L } from "@/lib/niches";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Field, MoneyInput, fmt, run, tgInit, type D } from "./shared";
import type { U } from "./i18n";

type Tab = "today" | "services" | "more";
type Props = { d: D; u: U; lang: string; token: string };

const WEEK: { n: number; l: L }[] = [
  { n: 1, l: { uz: "Du", ru: "Пн", en: "Mon" } },
  { n: 2, l: { uz: "Se", ru: "Вт", en: "Tue" } },
  { n: 3, l: { uz: "Ch", ru: "Ср", en: "Wed" } },
  { n: 4, l: { uz: "Pa", ru: "Чт", en: "Thu" } },
  { n: 5, l: { uz: "Ju", ru: "Пт", en: "Fri" } },
  { n: 6, l: { uz: "Sh", ru: "Сб", en: "Sat" } },
  { n: 0, l: { uz: "Ya", ru: "Вс", en: "Sun" } },
];

export function BeautyCabinet({ d, u, lang, token }: Props) {
  const [tab, setTab] = useState<Tab>("today");
  const name = d.owner.display_name?.trim() || d.owner.first_name || "Salon";
  const tabs: { id: Tab; label: string }[] = [
    { id: "today", label: u("today") },
    { id: "services", label: u("services") },
    { id: "more", label: u("moreTab") },
  ];
  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-background pb-28">
      <header className="px-5 pb-2 pt-6">
        <h1 className="truncate font-display text-2xl font-bold">{name}</h1>
        {d.owner.is_demo && <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">{u("demoBanner")}</p>}
        {!d.owner.is_demo && d.plan.expired && <p className="mt-3 rounded-xl bg-destructive px-3 py-2 text-xs text-destructive-foreground">{u("plan_expired")}</p>}
      </header>
      <main className="px-5 pt-2">
        {tab === "today" && <Today d={d} u={u} lang={lang} token={token} />}
        {tab === "services" && <Services d={d} u={u} lang={lang} token={token} />}
        {tab === "more" && <More d={d} u={u} lang={lang} token={token} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }} aria-current={active ? "page" : undefined}
                className={cn("flex-1 py-4 text-sm", active ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Today({ d, u, lang, token }: Props) {
  const qc = useQueryClient();
  const setStatus = useServerFn(setRecordStatus);
  const save = useServerFn(saveRecord);
  const shut = useServerFn(closeToday);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(0);
  const [client, setClient] = useState("");
  const [time, setTime] = useState("");
  const today = civilDate();
  const rows = d.records
    .filter((r) => r.data_type === "booking" && r.due_date === today && (r.status === "booked" || r.status === "done"))
    .sort((a, b) => (a.due_time ?? "").localeCompare(b.due_time ?? ""));
  const heading = new Date(`${today}T12:00:00+05:00`).toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "en" ? "en-GB" : "uz-UZ", { day: "numeric", month: "short" });
  const schedule = d.schedule;
  const step = schedule?.step === 30 || schedule?.step === 90 ? schedule.step : (schedule?.step === 60 ? 60 : DEFAULT_SLOT_MINUTES);
  const generated = clockSlots((schedule?.open ?? DEFAULT_OPEN).slice(0, 5), (schedule?.close ?? DEFAULT_CLOSE).slice(0, 5), step);
  const slots = generated.length ? generated : [...BOOKING_SLOTS];
  const taken = new Set(d.records.filter((r) => r.data_type === "booking" && r.due_date === today && r.status === "booked").map((r) => (r.due_time ?? "").slice(0, 5)));
  const free = slots.filter((slot) => !taken.has(slot));

  async function reload() {
    await qc.invalidateQueries({ queryKey: ["cab", token] });
  }

  async function mark(id: string, status: "done" | "no_show" | "cancelled") {
    setBusy(id);
    const r = await run(() => setStatus({ data: { token, initData: tgInit(), id, status } }), u);
    setBusy(null);
    if (r) await reload();
  }

  async function onAdd() {
    if (!title.trim() || !client.trim() || !time) return;
    setBusy("add");
    const r = await run(() => save({ data: {
      token, initData: tgInit(), title: title.trim(), client: client.trim(), status: "booked",
      amount: price, due_date: today, due_time: time, data_type: "booking",
    } }), u, u("saved"));
    setBusy(null);
    if (!r) return;
    setAdding(false);
    setTitle("");
    setPrice(0);
    setClient("");
    setTime("");
    await reload();
  }

  async function onClose() {
    setBusy("close");
    const r = await run(() => shut({ data: { token, initData: tgInit() } }), u, u("saved"));
    setBusy(null);
    setConfirmClose(false);
    if (r) await reload();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{heading}</p>
      {schedule?.closedToday && <p className="text-sm">{u("closedTodayLine")}</p>}
      {adding ? (
        <Card>
          <div className="space-y-3">
            {d.services.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {d.services.map((s) => (
                  <button key={s.id} type="button" onClick={() => { setTitle(s.title); setPrice(s.price); }}
                    className={cn("rounded-full border px-3 py-1 text-sm", title === s.title ? "border-foreground bg-foreground text-background" : "border-border")}>
                    {s.title}
                  </button>
                ))}
              </div>
            ) : (
              <Field label={u("serviceName")}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            )}
            <Field label={u("client")}><Input value={client} onChange={(e) => setClient(e.target.value)} /></Field>
            {free.length === 0 ? <p className="text-sm text-muted-foreground">{u("noFree")}</p> : (
              <div className="flex flex-wrap gap-2">
                {free.map((slot) => (
                  <button key={slot} type="button" onClick={() => setTime(slot)}
                    className={cn("rounded-xl border px-3 py-2 text-sm", time === slot ? "border-foreground bg-foreground text-background" : "border-border")}>{slot}</button>
                ))}
              </div>
            )}
            <Button className="w-full" disabled={busy === "add" || !title.trim() || !client.trim() || !time} onClick={onAdd}>{u("save")}</Button>
            <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => setAdding(false)}>{u("cancel")}</button>
          </div>
        </Card>
      ) : (
        <Button className="w-full" variant="secondary" onClick={() => setAdding(true)}>{u("add")}</Button>
      )}
      {rows.length === 0 && !adding && <Card><p className="text-sm">{u("todayEmpty")}</p></Card>}
      {rows.map((r) => {
        const done = r.status === "done";
        return (
          <Card key={r.id} className={done ? "opacity-60" : ""}>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-lg font-bold">{(r.due_time ?? "").slice(0, 5)}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{r.client || "—"}</p>
            {done ? (
              <p className="mt-3 text-xs font-medium">{tr(STATUSES["done"]!.label, lang)}</p>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <Button className="flex-1" disabled={busy === r.id} onClick={() => mark(r.id, "done")}>
                  {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : u("markDone")}
                </Button>
                <button className="text-xs text-muted-foreground" disabled={busy === r.id} onClick={() => mark(r.id, "cancelled")}>{u("cancelBooking")}</button>
                <button className="text-xs text-muted-foreground" disabled={busy === r.id} onClick={() => mark(r.id, "no_show")}>{u("markNoShow")}</button>
              </div>
            )}
          </Card>
        );
      })}
      {!schedule?.closedToday && !confirmClose && (
        <button type="button" className="w-full py-3 text-sm text-muted-foreground" onClick={() => setConfirmClose(true)}>{u("closeToday")}</button>
      )}
      {confirmClose && (
        <Card>
          <p className="text-sm">{u("closeTodayHint")}</p>
          <Button className="mt-3 w-full" disabled={busy === "close"} onClick={onClose}>{u("closeTodayYes")}</Button>
          <button type="button" className="mt-2 w-full text-sm text-muted-foreground" onClick={() => setConfirmClose(false)}>{u("cancel")}</button>
        </Card>
      )}
    </div>
  );
}

function Services({ d, u, token }: Props) {
  const qc = useQueryClient();
  const save = useServerFn(saveService);
  const remove = useServerFn(deleteService);
  const post = useServerFn(postBookingCard);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(0);
  const [editId, setEditId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const list = d.services;

  async function onSave() {
    if (!title.trim()) return;
    setBusy(true);
    const r = await run(() => save({ data: { token, initData: tgInit(), ...(editId ? { id: editId } : {}), title: title.trim(), price } }), u, u("saved"));
    setBusy(false);
    if (!r) return;
    setTitle("");
    setPrice(0);
    setEditId(undefined);
    await qc.invalidateQueries({ queryKey: ["cab", token] });
  }

  async function onDelete(id: string) {
    setBusy(true);
    const r = await run(() => remove({ data: { token, initData: tgInit(), id } }), u);
    setBusy(false);
    if (r) await qc.invalidateQueries({ queryKey: ["cab", token] });
  }

  async function onPost() {
    setBusy(true);
    const r = await run(() => post({ data: { token, initData: tgInit() } }), u, u("posted"));
    setBusy(false);
    if (r) await qc.invalidateQueries({ queryKey: ["cab", token] });
  }

  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="text-sm text-muted-foreground">{u("servicesHint")}</p>}
      {list.map((s) => (
        <div key={s.id} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { setEditId(s.id); setTitle(s.title); setPrice(s.price); }}>
            <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
            <span className="text-sm text-muted-foreground">{fmt(s.price)}</span>
          </button>
          <button type="button" className="text-xs text-muted-foreground" onClick={() => onDelete(s.id)}>{u("delete")}</button>
        </div>
      ))}
      <Card>
        <div className="space-y-3">
          <Field label={u("serviceName")}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label={u("price")}><MoneyInput value={price} onChange={setPrice} /></Field>
          <Button className="w-full" disabled={busy || !title.trim()} onClick={onSave}>{u("save")}</Button>
        </div>
      </Card>
      {list.length > 0 && (
        <Button className="w-full" variant="secondary" disabled={busy} onClick={onPost}>{u("postGroup")}</Button>
      )}
    </div>
  );
}

function More({ d, u, lang, token }: Props) {
  const qc = useQueryClient();
  const saveHours = useServerFn(saveBookingSettings);
  const saveName = useServerFn(saveProfile);
  const sendList = useServerFn(postTodayList);
  const s = d.schedule;
  const [name, setName] = useState(d.owner.display_name ?? "");
  const [open, setOpen] = useState((s?.open ?? "09:00").slice(0, 5));
  const [close, setClose] = useState((s?.close ?? "19:00").slice(0, 5));
  const [step, setStep] = useState<30 | 60 | 90>(s?.step === 30 || s?.step === 90 ? s.step : 60);
  const [closed, setClosed] = useState<number[]>(s?.closed ?? []);
  const [reminder, setReminder] = useState<2 | 24>(s?.reminder === 24 ? 24 : 2);
  const [busy, setBusy] = useState(false);

  function toggleDay(n: number) {
    setClosed((cur) => cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]);
  }

  async function onSave() {
    setBusy(true);
    const named = await run(() => saveName({ data: { token, initData: tgInit(), display_name: name.trim() || null } }), u);
    if (!named) { setBusy(false); return; }
    const hours = await run(() => saveHours({ data: {
      token, initData: tgInit(), open, close, step, closed, reminder,
      deposit: s?.deposit ?? 0,
      clickService: s?.clickService ?? "",
      clickMerchant: s?.clickMerchant ?? "",
      clickSecret: "",
      paymeMerchant: s?.paymeMerchant ?? "",
      paymeKey: "",
    } }), u, u("saved"));
    setBusy(false);
    if (hours) await qc.invalidateQueries({ queryKey: ["cab", token] });
  }

  async function onSend() {
    setBusy(true);
    await run(() => sendList({ data: { token, initData: tgInit() } }), u, u("sentToYou"));
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="space-y-3">
          <Field label={u("salonName")}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={u("openTime")}><Input type="time" value={open} onChange={(e) => setOpen(e.target.value)} /></Field>
            <Field label={u("closeTime")}><Input type="time" value={close} onChange={(e) => setClose(e.target.value)} /></Field>
          </div>
          <Field label={u("slotStep")}>
            <div className="flex gap-2">
              {([30, 60, 90] as const).map((n) => (
                <button key={n} type="button" onClick={() => setStep(n)}
                  className={cn("flex-1 rounded-xl border py-2 text-sm", step === n ? "border-foreground bg-foreground text-background" : "border-border")}>{n}</button>
              ))}
            </div>
          </Field>
          <Field label={u("closedDays")}>
            <div className="flex flex-wrap gap-2">
              {WEEK.map((day) => {
                const on = closed.includes(day.n);
                return (
                  <button key={day.n} type="button" onClick={() => toggleDay(day.n)}
                    className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-foreground bg-foreground text-background" : "border-border")}>{tr(day.l, lang)}</button>
                );
              })}
            </div>
          </Field>
          <Field label={u("remindWhen")}>
            <div className="flex gap-2">
              {([2, 24] as const).map((n) => (
                <button key={n} type="button" onClick={() => setReminder(n)}
                  className={cn("flex-1 rounded-xl border py-2 text-sm", reminder === n ? "border-foreground bg-foreground text-background" : "border-border")}>{u(n === 2 ? "h2" : "h24")}</button>
              ))}
            </div>
          </Field>
          <Button className="w-full" disabled={busy} onClick={onSave}>{u("save")}</Button>
        </div>
      </Card>
      <Button className="w-full" variant="secondary" disabled={busy} onClick={onSend}>{u("sendToday")}</Button>
    </div>
  );
}
