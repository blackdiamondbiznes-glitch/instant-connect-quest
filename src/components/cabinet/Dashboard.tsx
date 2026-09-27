import { ClipboardList, Users } from "lucide-react";
import { STATUSES, tr, type RecordDataType, type Sections } from "@/lib/niches";
import { MoodBar } from "./AiScreen";
import { Card, fmt, type D } from "./shared";
import type { U } from "./i18n";

type Props = { d: D; u: U; lang: string; sections: Sections; goContacts: () => void; goRecords: (s: RecordDataType) => void; goAi: () => void };

export function Dashboard({ d, u, lang, sections, goContacts, goRecords, goAi }: Props) {
  const visibleTypes = new Set(sections.records.map((s) => s.data_type as string));
  const latest = d.owner.modules.includes("ai_pulse") ? d.insights[0] : undefined;
  const debt = d.members.filter((m) => STATUSES[m.status]?.tone === "bad").reduce((s, m) => s + Number(m.amount), 0);
  // Records carry the money when the niche has them; otherwise fall back to what good-standing contacts paid.
  const total = sections.records.length
    ? d.records.filter((r) => visibleTypes.has(r.data_type ?? "record")).reduce((s, r) => s + Number(r.amount), 0)
    : d.members.filter((m) => STATUSES[m.status]?.tone === "good").reduce((s, m) => s + Number(m.amount), 0);

  const cards = [
    ...(sections.contacts ? [{ key: "contacts", icon: Users, label: tr(sections.contacts.label, lang), count: d.members.length, go: goContacts }] : []),
    ...sections.records.map((s) => ({ key: s.data_type, icon: ClipboardList, label: tr(s.label, lang), count: d.records.filter((r) => (r.data_type ?? "record") === s.data_type).length, go: () => goRecords(s.data_type) })),
  ];

  return (
    <div className="space-y-5">
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
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
          <p className="text-xs opacity-80">{u("total")}</p>
          <p className="mt-1 font-display text-xl font-bold">{fmt(total)}</p>
        </div>
        <button onClick={sections.contacts ? goContacts : undefined} className="rounded-2xl bg-accent p-4 text-left text-accent-foreground">
          <p className="text-xs opacity-80">{u("debt")}</p>
          <p className="mt-1 font-display text-xl font-bold">{fmt(debt)}</p>
        </button>
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
