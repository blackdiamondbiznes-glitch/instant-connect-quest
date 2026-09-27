import { useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { deleteItem, saveMember, saveRecord, type Member, type RecordRow } from "@/lib/cabinet.functions";
import { getNiche, statusesFor, STATUSES, tr, type RecordDataType, type Sections } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Field, fmt, run, tgInit, toneCls, type D } from "./shared";
import type { U } from "./i18n";

type Row = Partial<Member & RecordRow>;
type Props = { d: D; u: U; lang: string; token: string; sections: Sections; kind: "contacts" | "records"; initialSection?: RecordDataType | undefined };

export function ListScreen({ d, u, lang, token, sections, kind, initialSection }: Props) {
  const [section, setSection] = useState<RecordDataType>(initialSection ?? sections.records[0]?.data_type ?? "record");
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState<Row | null>(null);
  const niche = getNiche(d.owner.niche);

  const rec = sections.records.find((s) => s.data_type === section) ?? sections.records[0];
  const label = kind === "contacts" ? sections.contacts?.label : rec?.label;
  const pills = kind === "contacts" ? (sections.contacts?.statuses ?? []) : (rec?.statuses ?? []);
  const formStatuses = kind === "contacts" ? statusesFor(niche, "member") : statusesFor(niche, rec?.data_type ?? "record");
  const items: Row[] = kind === "contacts" ? d.members : d.records.filter((r) => (r.data_type ?? "record") === rec?.data_type);
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div>
      {kind === "records" && sections.records.length > 1 && (
        <div className="mb-4 grid grid-flow-col gap-1 rounded-2xl bg-muted p-1">
          {sections.records.map((s) => (
            <button key={s.data_type} onClick={() => { setSection(s.data_type); setFilter("all"); }}
              className={cn("rounded-xl px-3 py-2 text-sm font-semibold transition", s.data_type === rec?.data_type ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {tr(s.label, lang)}
            </button>
          ))}
        </div>
      )}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{tr(label, lang)}</h2>
        <Button size="sm" onClick={() => setEdit({ status: formStatuses[0] ?? "", amount: 0 })}><Plus className="h-4 w-4" /> {u("add")}</Button>
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {["all", ...pills].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
            {s === "all" ? u("all") : tr(STATUSES[s]?.label, lang)} · {s === "all" ? items.length : items.filter((i) => i.status === s).length}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{u("empty")}</p> : (
        <ul className="space-y-2">
          {shown.map((it) => (
            <ListRow key={it.id} it={it} u={u} lang={lang} token={token} table={kind === "contacts" ? "members" : "records"} onEdit={() => setEdit(it)} />
          ))}
        </ul>
      )}
      {edit && (
        <EditDialog kind={kind} dataType={rec?.data_type ?? "record"} item={edit} statuses={formStatuses} onClose={() => setEdit(null)} u={u} lang={lang} token={token} />
      )}
    </div>
  );
}

function ListRow({ it, u, lang, token, table, onEdit }: { it: Row; u: U; lang: string; token: string; table: "members" | "records"; onEdit: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const del = useServerFn(deleteItem);
  const remove = async () => {
    setBusy(true);
    const r = await run(() => del({ data: { token, initData: tgInit(), id: it.id!, table } }), u);
    setBusy(false);
    setConfirm(false);
    if (r) qc.invalidateQueries({ queryKey: ["cab", token] });
  };
  const st = STATUSES[it.status ?? ""];
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
        <p className="truncate font-semibold">{it.name ?? it.title}</p>
        <p className="truncate text-xs text-muted-foreground">{[it.phone ?? it.client, it.due_date, Number(it.amount) ? fmt(Number(it.amount)) : null].filter(Boolean).join(" · ")}</p>
      </button>
      {st && <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", toneCls(st.tone))}>{tr(st.label, lang)}</span>}
      {confirm ? (
        <div className="flex gap-1">
          <Button size="sm" variant="destructive" disabled={busy} onClick={remove}>{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : u("delete")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>{u("cancel")}</Button>
        </div>
      ) : (
        <button aria-label={u("delete")} className="p-1 text-muted-foreground hover:text-destructive" onClick={() => setConfirm(true)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function EditDialog({ kind, dataType, item, statuses, onClose, u, lang, token }: { kind: "contacts" | "records"; dataType: RecordDataType; item: Row; statuses: string[]; onClose: () => void; u: U; lang: string; token: string }) {
  const [f, setF] = useState<Row>({ ...item });
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const sm = useServerFn(saveMember);
  const sr = useServerFn(saveRecord);
  const submit = async () => {
    setBusy(true);
    const initData = tgInit();
    const status = f.status && statuses.includes(f.status) ? f.status : statuses[0]!;
    const r = await run(() => kind === "contacts"
      ? sm({ data: { token, initData, id: f.id, name: f.name ?? "", phone: f.phone || null, status, amount: Number(f.amount) || 0, note: f.note || null } })
      : sr({ data: { token, initData, id: f.id, title: f.title ?? "", client: f.client || null, status, amount: Number(f.amount) || 0, due_date: f.due_date || null, data_type: dataType } }), u);
    setBusy(false);
    if (!r) return;
    qc.invalidateQueries({ queryKey: ["cab", token] });
    onClose();
  };
  const set = (k: keyof Row) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? u("edit") : u("add")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {kind === "contacts" ? (
            <>
              <Field label={u("name")}><Input value={f.name ?? ""} onChange={set("name")} /></Field>
              <Field label={u("phone")}><Input type="tel" value={f.phone ?? ""} onChange={set("phone")} /></Field>
            </>
          ) : (
            <>
              <Field label={u("title")}><Input value={f.title ?? ""} onChange={set("title")} /></Field>
              <Field label={u("client")}><Input value={f.client ?? ""} onChange={set("client")} /></Field>
              <Field label={u("date")}><Input type="date" value={f.due_date ?? ""} onChange={set("due_date")} /></Field>
            </>
          )}
          <Field label={u("amount")}><Input type="number" inputMode="numeric" min={0} value={f.amount ?? 0} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{u("status")}</span>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button key={s} type="button" onClick={() => setF({ ...f, status: s })}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium", f.status === s ? `${toneCls(STATUSES[s]?.tone)} border-transparent` : "border-border")}>
                  {tr(STATUSES[s]?.label, lang)}
                </button>
              ))}
            </div>
          </div>
          {kind === "contacts" && <Field label={u("note")}><Textarea value={f.note ?? ""} onChange={set("note")} /></Field>}
          <Button className="w-full" disabled={busy || !(f.name ?? f.title)?.trim()} onClick={submit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {u("save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
