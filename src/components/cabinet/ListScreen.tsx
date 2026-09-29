import { useEffect, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { deleteItem, saveMember, saveRecord, setRecordStatus, type Member, type RecordRow } from "@/lib/cabinet.functions";
import { getNiche, nichePack, statusesFor, STATUSES, tr, type RecordDataType, type Sections } from "@/lib/niches";
import { civilDate } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Field, fmt, MoneyInput, run, tgInit, toneCls, type D } from "./shared";
import type { U } from "./i18n";

type Row = Partial<Member & RecordRow>;
type Props = { d: D; u: U; lang: string; token: string; sections: Sections; kind: "contacts" | "records"; initialSection?: RecordDataType | undefined; initialFilter?: string | undefined; startAdd?: boolean | undefined };

export function ListScreen({ d, u, lang, token, sections, kind, initialSection, initialFilter, startAdd }: Props) {
  const [section, setSection] = useState<RecordDataType>(initialSection ?? sections.records[0]?.data_type ?? "record");
  const [filter, setFilter] = useState(initialFilter ?? "all");
  const pack = nichePack(d.owner.niche);
  const niche = getNiche(d.owner.niche);
  const rec = sections.records.find((s) => s.data_type === section) ?? sections.records[0];
  const formStatuses = kind === "contacts" ? statusesFor(niche, "member") : statusesFor(niche, rec?.data_type ?? "record");
  const [edit, setEdit] = useState<Row | null>(() => (startAdd ? { status: formStatuses[0] ?? "booked", amount: 0, due_date: civilDate() } : null));

  const label = kind === "contacts" ? sections.contacts?.label : rec?.label;
  const pills = kind === "contacts" ? (sections.contacts?.statuses ?? []) : (rec?.statuses ?? []);
  const today = civilDate();
  const showToday = kind === "records" && rec?.data_type === "booking";
  const items: Row[] = kind === "contacts" ? d.members : d.records.filter((r) => (r.data_type ?? "record") === rec?.data_type);
  const shown = filter === "all" ? items : filter === "today" ? items.filter((i) => i.due_date === today) : items.filter((i) => i.status === filter);
  const empty = kind === "contacts" ? (pack.emptyStates ? tr(pack.emptyStates.contacts, lang) : u("empty")) : (pack.emptyStates && rec?.data_type === niche.recordType ? tr(pack.emptyStates.records, lang) : u("empty"));
  const addLabel = kind === "records" && pack.addRecord ? tr(pack.addRecord, lang) : u("add");

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
        <Button size="sm" onClick={() => setEdit({ status: formStatuses[0] ?? "", amount: 0, ...(showToday ? { due_date: today } : {}) })}><Plus className="h-4 w-4" /> {addLabel}</Button>
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {(showToday ? ["all", "today", ...pills] : ["all", ...pills]).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
            {s === "all" ? u("all") : s === "today" ? u("today") : tr(STATUSES[s]?.label, lang)} · {s === "all" ? items.length : s === "today" ? items.filter((i) => i.due_date === today).length : items.filter((i) => i.status === s).length}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">{empty}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => setEdit({ status: formStatuses[0] ?? "", amount: 0, ...(showToday ? { due_date: today } : {}) })}>{addLabel}</Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((it) => (
            <ListRow key={it.id} it={it} u={u} lang={lang} token={token} table={kind === "contacts" ? "members" : "records"} onEdit={() => setEdit(it)} />
          ))}
        </ul>
      )}
      {edit && (
        <EditDialog kind={kind} dataType={rec?.data_type ?? "record"} item={edit} statuses={formStatuses} services={d.services} onClose={() => setEdit(null)} u={u} lang={lang} token={token} pack={pack} />
      )}
    </div>
  );
}

function ListRow({ it, u, lang, token, table, onEdit }: { it: Row; u: U; lang: string; token: string; table: "members" | "records"; onEdit: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const del = useServerFn(deleteItem);
  const setStatus = useServerFn(setRecordStatus);
  const mark = async (status: "done" | "no_show") => {
    setBusy(true);
    const r = await run(() => setStatus({ data: { token, initData: tgInit(), id: it.id!, status } }), u, u("saved"));
    setBusy(false);
    if (r) qc.invalidateQueries({ queryKey: ["cab", token] });
  };
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
        <p className="truncate text-xs text-muted-foreground">{[it.phone ?? it.client, [it.due_date, it.due_time].filter(Boolean).join(" "), Number(it.amount) ? fmt(Number(it.amount)) : null, it.deposit_paid ? u("depositPaid") : null].filter(Boolean).join(" · ")}</p>
      </button>
      {st && <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", toneCls(st.tone))}>{tr(st.label, lang)}</span>}
      {it.data_type === "booking" && it.status === "booked" && !confirm && (
        <div className="flex shrink-0 flex-col gap-1">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => mark("done")}>{u("markDone")}</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => mark("no_show")}>{u("markNoShow")}</Button>
        </div>
      )}
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

function useVisibleFrame() {
  const [frame, setFrame] = useState(() => ({ top: 0, height: typeof window === "undefined" ? 0 : window.innerHeight }));
  useEffect(() => {
    const apply = () => {
      const vv = window.visualViewport;
      setFrame({ top: vv?.offsetTop ?? 0, height: vv?.height ?? window.innerHeight });
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
    };
  }, []);
  return frame;
}

function EditDialog({ kind, dataType, item, statuses, services, onClose, u, lang, token, pack }: { kind: "contacts" | "records"; dataType: RecordDataType; item: Row; statuses: string[]; services: D["services"]; onClose: () => void; u: U; lang: string; token: string; pack: ReturnType<typeof nichePack> }) {
  const [f, setF] = useState<Row>({ ...item });
  const [busy, setBusy] = useState(false);
  const frame = useVisibleFrame();
  const qc = useQueryClient();
  const sm = useServerFn(saveMember);
  const sr = useServerFn(saveRecord);
  const fl = pack.formLabels;
  const booking = kind === "records" && dataType === "booking";
  const submit = async () => {
    setBusy(true);
    const initData = tgInit();
    const status = f.status && statuses.includes(f.status) ? f.status : statuses[0]!;
    const r = await run(() => kind === "contacts"
      ? sm({ data: { token, initData, id: f.id, name: f.name ?? "", phone: f.phone || null, status, amount: Number(f.amount) || 0, note: f.note || null } })
      : sr({ data: { token, initData, id: f.id, title: f.title ?? "", client: f.client || null, status, amount: Number(f.amount) || 0, due_date: f.due_date || null, due_time: f.due_time ? f.due_time.slice(0, 5) : null, deposit_paid: !!f.deposit_paid, data_type: dataType } }), u);
    setBusy(false);
    if (!r) return;
    qc.invalidateQueries({ queryKey: ["cab", token] });
    qc.invalidateQueries({ queryKey: ["auto", token] });
    onClose();
  };
  const set = (k: keyof Row) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const height = frame.height || undefined;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="left-0 flex w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:left-0"
        style={{ top: frame.top, left: 0, transform: "none", height, maxHeight: height, width: "100%" }}
        onFocusCapture={(e) => {
          const t = e.target;
          if (t instanceof HTMLElement) window.setTimeout(() => t.scrollIntoView({ block: "center" }), 80);
        }}
      >
        <DialogHeader className="shrink-0 px-5 pb-2 pt-5 pr-12 text-left"><DialogTitle>{f.id ? u("edit") : u("add")}</DialogTitle></DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
          {kind === "contacts" ? (
            <>
              <Field label={u("name")}><Input value={f.name ?? ""} onChange={set("name")} /></Field>
              <Field label={u("phone")}><Input type="tel" value={f.phone ?? ""} onChange={set("phone")} /></Field>
            </>
          ) : (
            <>
              {booking && services.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">{u("pickService")}</span>
                  <div className="flex flex-wrap gap-2">
                    {services.map((s) => (
                      <button key={s.id} type="button" onClick={() => setF({ ...f, title: s.title, amount: s.price })}
                        className={cn("rounded-full border px-3 py-1 text-xs font-medium", f.title === s.title ? "border-transparent bg-primary text-primary-foreground" : "border-border")}>
                        {s.title} · {fmt(s.price)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Field label={fl.title ? tr(fl.title, lang) : u("title")}><Input value={f.title ?? ""} onChange={set("title")} /></Field>
              <Field label={fl.client ? tr(fl.client, lang) : u("client")}><Input value={f.client ?? ""} onChange={set("client")} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={fl.date ? tr(fl.date, lang) : u("date")}><Input type="date" value={f.due_date ?? ""} onChange={set("due_date")} /></Field>
                {booking && <Field label={fl.time ? tr(fl.time, lang) : u("time")}><Input type="time" value={f.due_time ?? ""} onChange={set("due_time")} /></Field>}
              </div>
            </>
          )}
          <Field label={fl.amount && kind === "records" ? tr(fl.amount, lang) : u("amount")}><MoneyInput value={Number(f.amount) || 0} onChange={(n) => setF({ ...f, amount: n })} /></Field>
          {booking && pack.bookingDeposit && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!f.deposit_paid} onCheckedChange={(v) => setF({ ...f, deposit_paid: v === true })} />
              {u("depositPaid")}
            </label>
          )}
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
        </div>
        <div className="shrink-0 border-t border-border bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button className="w-full" disabled={busy || !(f.name ?? f.title)?.trim()} onClick={submit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {u("save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
