import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, ClipboardList, Plus, Users } from "lucide-react";
import { civilDate } from "@/lib/config";
import { postBookingCard } from "@/lib/cabinet.functions";
import { nichePack, STATUSES, tr, type DashboardKpi, type RecordDataType, type Sections } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { MoodBar } from "./AiScreen";
import { Card, fmt, run, tgInit, type D } from "./shared";
import type { U } from "./i18n";

type Props = {
  d: D; u: U; lang: string; token: string; sections: Sections;
  goContacts: () => void;
  goRecords: (s: RecordDataType, filter?: string) => void;
  goAi: () => void;
  goAddBooking: () => void;
  goServices: () => void;
};

export function Dashboard({ d, u, lang, token, sections, goContacts, goRecords, goAi, goAddBooking, goServices }: Props) {
  const pack = nichePack(d.owner.niche);
  const visibleTypes = new Set(sections.records.map((s) => s.data_type as string));
  const latest = d.owner.modules.includes("ai_pulse") ? d.insights[0] : undefined;
  const today = civilDate();
  const month = today.slice(0, 7);
  const bookings = d.records.filter((r) => (r.data_type ?? "record") === "booking");
  const bookingSection = sections.records.find((s) => s.data_type === "booking")?.data_type;

  const kpiValue = (id: DashboardKpi): { label: string; value: string; go?: (() => void) | undefined } => {
    if (id === "today_bookings") {
      const n = bookings.filter((r) => r.due_date === today).length;
      return { label: u("todayBookings"), value: String(n), go: bookingSection ? () => goRecords(bookingSection, "today") : undefined };
    }
    if (id === "no_shows") {
      const n = bookings.filter((r) => r.status === "no_show" && (r.due_date ?? "").startsWith(month)).length;
      return { label: u("noShows"), value: String(n), go: bookingSection ? () => goRecords(bookingSection, "no_show") : undefined };
    }
    if (id === "today_revenue") {
      const sum = bookings.filter((r) => r.due_date === today && r.status === "done").reduce((s, r) => s + Number(r.amount), 0);
      return { label: u("todayRevenue"), value: fmt(sum) };
    }
    if (id === "prepaid") {
      const n = d.members.filter((m) => m.status === "prepaid").length;
      return { label: u("prepaidClients"), value: String(n), go: sections.contacts ? goContacts : undefined };
    }
    if (id === "new_clients") {
      return { label: u("newClients"), value: String(d.members.filter((m) => m.status === "new").length), go: sections.contacts ? goContacts : undefined };
    }
    if (id === "lost_clients") {
      return { label: u("lostClients"), value: String(d.members.filter((m) => m.status === "lost").length), go: sections.contacts ? goContacts : undefined };
    }
    if (id === "debt") {
      const debt = d.members.filter((m) => STATUSES[m.status]?.tone === "bad").reduce((s, m) => s + Number(m.amount), 0);
      return { label: u("debt"), value: fmt(debt), go: sections.contacts ? goContacts : undefined };
    }
    const total = sections.records.length
      ? d.records.filter((r) => visibleTypes.has(r.data_type ?? "record")).reduce((s, r) => s + Number(r.amount), 0)
      : d.members.filter((m) => STATUSES[m.status]?.tone === "good").reduce((s, m) => s + Number(m.amount), 0);
    return { label: u("total"), value: fmt(total) };
  };

  const cards = [
    ...(sections.contacts ? [{ key: "contacts", icon: Users, label: tr(sections.contacts.label, lang), count: d.members.length, go: goContacts }] : []),
    ...sections.records.map((s) => ({ key: s.data_type, icon: ClipboardList, label: tr(s.label, lang), count: d.records.filter((r) => (r.data_type ?? "record") === s.data_type).length, go: () => goRecords(s.data_type) })),
  ];
  const kpis = pack.dashboardKpis.map(kpiValue);
  const cta = pack.primaryCta;
  const post = useServerFn(postBookingCard);
  const [posting, setPosting] = useState(false);
  const sendCard = async () => {
    setPosting(true);
    await run(() => post({ data: { token, initData: tgInit() } }), u, u("posted"));
    setPosting(false);
  };

  return (
    <div className="space-y-5">
      {cta && (
        <Button className="w-full" onClick={cta.id === "add_booking" ? goAddBooking : () => bookingSection && goRecords(bookingSection, "today")}>
          {cta.id === "add_booking" ? <Plus className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
          {tr(cta.label, lang)}
        </Button>
      )}
      {pack.bookingDeposit && (
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{u("servicesMenu")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{u("postBookHint")}</p>
            </div>
            <Button size="sm" variant="outline" onClick={goServices}>{u("open")}</Button>
          </div>
          {d.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">{u("bookLinkEmpty")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {d.services.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span className="truncate">{s.title}</span>
                  <span className="shrink-0 text-muted-foreground">{fmt(s.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <Button className="w-full" variant="secondary" disabled={posting || d.owner.is_demo} onClick={sendCard}>{u("postBook")}</Button>
        </Card>
      )}
      {cards.length > 0 && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cards.map((c) => (
            <button key={c.key} onClick={c.go} className="rounded-2xl border border-border bg-card p-3 text-left transition active:scale-[0.98]">
              <c.icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 font-display text-2xl font-bold">{c.count}</p>
              <p className="truncate text-xs text-muted-foreground">{c.label}</p>
            </button>
          ))}
        </section>
      )}
      <section className="grid grid-cols-2 gap-2">
        {kpis.map((k) => (
          <button key={k.label} disabled={!k.go} onClick={k.go} className="rounded-2xl bg-primary p-4 text-left text-primary-foreground disabled:cursor-default first:bg-primary even:bg-accent even:text-accent-foreground">
            <p className="text-xs opacity-80">{k.label}</p>
            <p className="mt-1 font-display text-xl font-bold">{k.value}</p>
          </button>
        ))}
      </section>
      {latest && (
        <button onClick={goAi} className="w-full rounded-2xl border border-border bg-card p-4 text-left">
          <p className="text-sm font-semibold">{u("mood")}</p>
          <MoodBar i={latest} u={u} />
        </button>
      )}
      <Card>
        <p className="text-sm font-semibold">{u("chats")}</p>
        {d.chats.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{u("noChats")}</p> : (
          <ul className="mt-2 space-y-1 text-sm">{d.chats.map((c) => <li key={c.chat_id}>• {c.title ?? c.chat_id}</li>)}</ul>
        )}
      </Card>
    </div>
  );
}