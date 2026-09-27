import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Copy, Loader2, Pause, Play, Send, Trash2, Wrench } from "lucide-react";
import { saveModules, saveProfile } from "@/lib/cabinet.functions";
import { deleteReminder, getAutomation, saveReminder, saveVipSettings, sendBroadcast, toggleReminder } from "@/lib/automation.functions";
import { saveContentSettings } from "@/lib/content.functions";
import { getModule, offeredModules, tr, type ScreenId } from "@/lib/niches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Card, Field, fmt, run, tgInit, type D } from "./shared";
import type { U, UKey } from "./i18n";

type Props = { d: D; u: U; lang: string; token: string };
type Sub = "main" | ScreenId | "content";

const SUB_TITLE: Record<Exclude<Sub, "main">, UKey> = { reminders: "reminders", broadcast: "broadcast", vip: "vip", content: "content" };

export function SettingsScreen(p: Props) {
  const [sub, setSub] = useState<Sub>("main");
  const m = p.d.owner.modules;
  // A sub-screen is only reachable while its module is enabled.
  const allowed = sub === "main" || (sub === "content" ? m.includes("ai_content") : m.includes(sub === "vip" ? "access" : sub));
  if (sub !== "main" && allowed) {
    return (
      <div>
        <button onClick={() => setSub("main")} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> {p.u("settings")}
        </button>
        <h2 className="mb-4 font-display text-lg font-bold">{p.u(SUB_TITLE[sub])}</h2>
        {sub === "reminders" && <RemindersScreen {...p} />}
        {sub === "broadcast" && <BroadcastScreen {...p} />}
        {sub === "vip" && <VipScreen {...p} />}
        {sub === "content" && <ContentSettings {...p} />}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ProfileCard {...p} />
      <FeaturesCard {...p} open={setSub} />
      <ReconfigureCard {...p} />
    </div>
  );
}

function ProfileCard({ d, u, token }: Props) {
  const [name, setName] = useState(d.owner.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const fn = useServerFn(saveProfile);
  const save = async () => {
    setBusy(true);
    const r = await run(() => fn({ data: { token, initData: tgInit(), display_name: name.trim() || null } }), u, u("saved"));
    setBusy(false);
    if (r) qc.invalidateQueries({ queryKey: ["cab", token] });
  };
  return (
    <Card>
      <p className="mb-3 text-sm font-semibold">{u("profile")}</p>
      <Field label={u("displayName")} hint={u("displayNameHint")}>
        <div className="flex gap-2">
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={d.owner.first_name ?? ""} />
          <Button onClick={save} disabled={busy || name.trim() === (d.owner.display_name ?? "")}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {u("save")}</Button>
        </div>
      </Field>
    </Card>
  );
}

function FeaturesCard({ d, u, lang, token, open }: Props & { open: (s: Sub) => void }) {
  const [mods, setMods] = useState<string[]>(d.owner.modules);
  const [pending, setPending] = useState<string | null>(null);
  const qc = useQueryClient();
  const save = useServerFn(saveModules);
  const ids = offeredModules(d.owner.niche, d.owner.workspace_type);
  const toggle = async (id: string) => {
    const next = mods.includes(id) ? mods.filter((x) => x !== id) : [...mods, id];
    setPending(id);
    const r = await run(() => save({ data: { token, initData: tgInit(), modules: next } }), u);
    setPending(null);
    if (!r) return;
    setMods(next);
    qc.invalidateQueries({ queryKey: ["cab", token] });
  };
  return (
    <Card>
      <p className="text-sm font-semibold">{u("features")}</p>
      <p className="mb-3 text-xs text-muted-foreground">{u("featuresHint")}</p>
      <ul className="divide-y divide-border">
        {ids.map((id) => {
          const def = getModule(id)!;
          const on = mods.includes(id);
          const target: Sub | null = def.screen ?? (id === "ai_content" ? "content" : null);
          return (
            <li key={id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{tr(def.label, lang)}</p>
                <p className="text-xs text-muted-foreground">{tr(def.desc, lang)}</p>
              </div>
              {on && target && (
                <Button size="sm" variant="outline" onClick={() => open(target)}>{u("open")} <ChevronRight className="h-3 w-3" /></Button>
              )}
              {pending === id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Switch checked={on} onCheckedChange={() => toggle(id)} aria-label={tr(def.label, lang)} />}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ReconfigureCard({ d, u }: Props) {
  const url = d.botUsername ? `https://t.me/${d.botUsername}?start=redo` : null;
  const go = () => {
    if (!url) return;
    const wa = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void; close?: () => void } } }).Telegram?.WebApp;
    if (wa?.openTelegramLink) {
      wa.openTelegramLink(url);
      wa.close?.();
    } else window.open(url, "_blank");
  };
  return (
    <Card>
      <p className="flex items-center gap-2 text-sm font-semibold"><Wrench className="h-4 w-4" /> {u("reconfigure")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{u("reconfigureHint")}</p>
      <Button className="mt-3 w-full" variant="outline" disabled={!url || d.owner.is_demo} onClick={go}>{u("reconfigure")}</Button>
    </Card>
  );
}

function useAutomation(token: string) {
  const fn = useServerFn(getAutomation);
  return useQuery({ queryKey: ["auto", token], queryFn: () => fn({ data: { token, initData: tgInit() } }) });
}

const Spinner = () => <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

function ChatSelect({ d, u, value, onChange, allowAll }: { d: D; u: U; value: string; onChange: (v: string) => void; allowAll?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm">
      {allowAll ? <option value="">{u("allChats")}</option> : <option value="">{u("choose")}</option>}
      {d.chats.map((c) => <option key={c.chat_id} value={c.chat_id}>{c.title ?? c.chat_id}</option>)}
    </select>
  );
}

function localInput(date: Date) {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
}

function RemindersScreen({ d, u, token }: Props) {
  const q = useAutomation(token);
  const qc = useQueryClient();
  const save = useServerFn(saveReminder);
  const del = useServerFn(deleteReminder);
  const toggle = useServerFn(toggleReminder);
  const [text, setText] = useState("");
  const [when, setWhen] = useState(localInput(new Date(Date.now() + 3600000)));
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly">("none");
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["auto", token] });
  const add = async () => {
    setBusy(true);
    const r = await run(() => save({ data: { token, initData: tgInit(), text, send_at: new Date(when).toISOString(), repeat, chat_id: chat || null } }), u, u("saved"));
    setBusy(false);
    if (r) { setText(""); refresh(); }
  };
  const chatTitle = (id: number | null) => (id === null ? u("allChats") : d.chats.find((c) => Number(c.chat_id) === Number(id))?.title ?? String(id));
  if (d.chats.length === 0) return <Card><p className="text-sm text-muted-foreground">{u("no_chats")}</p></Card>;
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Field label={u("reminderText")}><Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={u("when")}><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label={u("repeat")}>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value as typeof repeat)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm">
              {(["none", "daily", "weekly"] as const).map((r) => <option key={r} value={r}>{u(`repeat_${r}`)}</option>)}
            </select>
          </Field>
        </div>
        <Field label={u("target")}><ChatSelect d={d} u={u} value={chat} onChange={setChat} allowAll /></Field>
        <Button className="w-full" disabled={busy || !text.trim() || !when} onClick={add}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {u("add")}</Button>
      </Card>
      {q.isLoading ? <Spinner /> : (
        <ul className="space-y-2">
          {(q.data?.reminders ?? []).length === 0 && <p className="text-center text-sm text-muted-foreground">{u("empty")}</p>}
          {(q.data?.reminders ?? []).map((r) => (
            <li key={r.id} className={cn("rounded-2xl border border-border bg-card p-3", !r.active && "opacity-60")}>
              <p className="whitespace-pre-line text-sm">{r.text}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{new Date(r.send_at).toLocaleString()} · {u(`repeat_${r.repeat}` as UKey)} · {chatTitle(r.chat_id)}{!r.active ? ` · ${u("paused")}` : ""}</span>
                <span className="flex gap-1">
                  <button aria-label="toggle" className="p-1" onClick={async () => { if (await run(() => toggle({ data: { token, initData: tgInit(), id: r.id, active: !r.active } }), u)) refresh(); }}>
                    {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button aria-label={u("delete")} className="p-1 hover:text-destructive" onClick={async () => { if (await run(() => del({ data: { token, initData: tgInit(), id: r.id } }), u)) refresh(); }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BroadcastScreen({ d, u, token }: Props) {
  const q = useAutomation(token);
  const qc = useQueryClient();
  const send = useServerFn(sendBroadcast);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const r = await run(() => send({ data: { token, initData: tgInit(), text } }), u);
    setBusy(false);
    if (!r) return;
    toast.success(u("sentTo", { n: r.sent }));
    setText("");
    qc.invalidateQueries({ queryKey: ["auto", token] });
  };
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="text-xs text-muted-foreground">{u("broadcastHint")}</p>
        {d.chats.length > 0 && <ul className="text-xs text-muted-foreground">{d.chats.map((c) => <li key={c.chat_id}>• {c.title ?? c.chat_id}</li>)}</ul>}
        <Textarea rows={5} value={text} maxLength={3500} onChange={(e) => setText(e.target.value)} />
        <Button className="w-full" disabled={busy || !text.trim() || d.chats.length === 0} onClick={go}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {u("send")}</Button>
        {d.chats.length === 0 && <p className="text-xs text-muted-foreground">{u("no_chats")}</p>}
      </Card>
      <p className="text-sm font-semibold">{u("history")}</p>
      {q.isLoading ? <Spinner /> : (
        <ul className="space-y-2">
          {(q.data?.broadcasts ?? []).length === 0 && <p className="text-sm text-muted-foreground">{u("empty")}</p>}
          {(q.data?.broadcasts ?? []).map((b) => (
            <li key={b.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="line-clamp-3 whitespace-pre-line text-sm">{b.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()} · {u("sentFailed", { s: b.sent, f: b.failed })}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyRow({ label, value, u }: { label: string; value: string | null; u: U }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <button className="flex w-full items-center gap-2 rounded-md border border-border bg-muted px-2 py-1.5 text-left font-mono text-[11px]"
        onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success(u("copied")), () => {})}>
        <span className="min-w-0 flex-1 truncate">{value}</span><Copy className="h-3 w-3 shrink-0" />
      </button>
    </div>
  );
}

function VipScreen({ d, u, token }: Props) {
  const q = useAutomation(token);
  if (q.isLoading || !q.data) return <Spinner />;
  return <VipForm d={d} u={u} token={token} data={q.data} />;
}

function VipForm({ d, u, token, data }: { d: D; u: U; token: string; data: Awaited<ReturnType<typeof getAutomation>> }) {
  const v = data.vip;
  const qc = useQueryClient();
  const save = useServerFn(saveVipSettings);
  const [f, setF] = useState({
    chat_id: v.chat_id ? String(v.chat_id) : "", price: v.price || 50000, days: v.days || 30,
    click_service_id: v.click_service_id, click_merchant_id: v.click_merchant_id, click_secret_key: "",
    payme_merchant_id: v.payme_merchant_id, payme_key: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });
  const submit = async () => {
    setBusy(true);
    const r = await run(() => save({ data: { token, initData: tgInit(), ...f, chat_id: f.chat_id || null } }), u, u("saved"));
    setBusy(false);
    if (r) {
      setF({ ...f, click_secret_key: "", payme_key: "" });
      qc.invalidateQueries({ queryKey: ["auto", token] });
    }
  };
  const secretHint = (isSet: boolean) => (isSet ? u("secretSet") : u("secretEmpty"));
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Field label={u("vipChat")}><ChatSelect d={d} u={u} value={f.chat_id} onChange={(x) => setF({ ...f, chat_id: x })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={u("price")}><Input type="number" min={1000} value={f.price} onChange={set("price")} /></Field>
          <Field label={u("days")}><Input type="number" min={1} max={366} value={f.days} onChange={set("days")} /></Field>
        </div>
        <p className="pt-2 text-sm font-semibold">Click</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="service_id"><Input value={f.click_service_id} onChange={set("click_service_id")} /></Field>
          <Field label="merchant_id"><Input value={f.click_merchant_id} onChange={set("click_merchant_id")} /></Field>
        </div>
        <Field label="secret_key" hint={secretHint(v.has_click_secret)}><Input type="password" autoComplete="off" value={f.click_secret_key} onChange={set("click_secret_key")} /></Field>
        <p className="pt-2 text-sm font-semibold">Payme</p>
        <Field label="merchant_id"><Input value={f.payme_merchant_id} onChange={set("payme_merchant_id")} /></Field>
        <Field label="key" hint={secretHint(v.has_payme_key)}><Input type="password" autoComplete="off" value={f.payme_key} onChange={set("payme_key")} /></Field>
        <Button className="w-full" disabled={busy || !f.chat_id} onClick={submit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {u("save")}</Button>
      </Card>
      <Card className="space-y-3">
        <CopyRow label={u("vipLink")} value={data.links.vip} u={u} />
        {d.owner.modules.includes("stock") && <CopyRow label={u("shopLink")} value={data.links.shop} u={u} />}
        <p className="pt-1 text-xs font-semibold">{u("webhookUrls")}</p>
        <CopyRow label="Click (Prepare / Complete)" value={data.links.click} u={u} />
        <CopyRow label="Payme (JSON-RPC)" value={data.links.payme} u={u} />
      </Card>
      <p className="text-sm font-semibold">{u("subscribers")}</p>
      <ul className="space-y-2">
        {data.subs.length === 0 && <p className="text-sm text-muted-foreground">{u("empty")}</p>}
        {data.subs.map((s) => (
          <li key={s.tg_user_id} className="flex justify-between rounded-2xl border border-border bg-card p-3 text-sm">
            <span className="truncate">{s.user_name ?? s.tg_user_id}</span>
            <span className={cn("text-xs", s.status === "active" ? "text-success" : "text-muted-foreground")}>{new Date(s.ends_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm font-semibold">{u("orders")}</p>
      <ul className="space-y-2">
        {data.orders.length === 0 && <p className="text-sm text-muted-foreground">{u("empty")}</p>}
        {data.orders.map((o) => (
          <li key={o.id} className="flex justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
            <span className="truncate">{o.user_name ?? "—"}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{fmt(Number(o.amount))} · {o.provider ?? "—"} · {o.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentSettings({ d, u, token }: Props) {
  const qc = useQueryClient();
  const save = useServerFn(saveContentSettings);
  const [auto, setAuto] = useState(d.owner.content_auto_publish);
  const [hide, setHide] = useState(d.owner.content_footer_disabled);
  const [chat, setChat] = useState(d.owner.content_chat_id ? String(d.owner.content_chat_id) : "");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const r = await run(() => save({ data: { token, initData: tgInit(), auto_publish: auto, footer_disabled: hide, chat_id: chat || null } }), u, u("saved"));
    setBusy(false);
    if (r) qc.invalidateQueries({ queryKey: ["cab", token] });
  };
  return (
    <Card className="space-y-4">
      <p className="text-xs text-muted-foreground">{u("contentHint")}</p>
      <Field label={u("defaultChat")}><ChatSelect d={d} u={u} value={chat} onChange={setChat} /></Field>
      <label className="flex items-start justify-between gap-3">
        <span><span className="block text-sm font-medium">{u("autoPublish")}</span><span className="text-xs text-muted-foreground">{u("autoPublishHint")}</span></span>
        <Switch checked={auto} onCheckedChange={setAuto} />
      </label>
      <label className="flex items-start justify-between gap-3">
        <span><span className="block text-sm font-medium">{u("hideFooter")}</span><span className="text-xs text-muted-foreground">{d.plan.footer_removable ? u("footerNote") : u("proOnly")}</span></span>
        <Switch checked={hide} disabled={!d.plan.footer_removable} onCheckedChange={setHide} />
      </label>
      <Button className="w-full" disabled={busy} onClick={submit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {u("save")}</Button>
    </Card>
  );
}
