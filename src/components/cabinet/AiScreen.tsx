import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ChevronDown, Loader2, RefreshCw, Send, Sparkles, TriangleAlert } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { answerCluster, runAnalysis } from "@/lib/cabinet.functions";
import { dismissSuggestion, publishSuggestion, suggestNow } from "@/lib/content.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Card, run, tgInit, type D } from "./shared";
import type { U, UKey } from "./i18n";

type Props = { d: D; u: U; lang: string; token: string };

export function AiScreen({ d, u, lang, token }: Props) {
  const m = d.owner.modules;
  const pulse = m.includes("ai_pulse"), faq = m.includes("ai_faq"), content = m.includes("ai_content");
  return (
    <div className="space-y-5">
      {(pulse || faq) && <AnalyzeCard d={d} u={u} token={token} />}
      {pulse && <PulseSection d={d} u={u} lang={lang} />}
      {faq && <FaqSection d={d} u={u} token={token} />}
      {content && <ContentSection d={d} u={u} token={token} />}
    </div>
  );
}

function AnalyzeCard({ d, u, token }: { d: D; u: U; token: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(runAnalysis);
  const [busy, setBusy] = useState(false);
  const analyze = async () => {
    setBusy(true);
    const r = await run(() => fn({ data: { token, initData: tgInit() } }).then((x) => (x.ok ? x : { ...x, error: x.error === "no_messages" ? "noMsgs" : x.error })), u);
    setBusy(false);
    if (r) qc.invalidateQueries({ queryKey: ["cab", token] });
  };
  return (
    <Card className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">{u("collected")}</p>
        <p className="font-display text-xl font-bold">{d.messageCount}</p>
      </div>
      <div className="text-right">
        <Button onClick={analyze} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {u("analyze")}</Button>
        <p className="mt-1 text-[11px] text-muted-foreground">{u("analysisLimit", { n: d.limits.analysisPerDay })}</p>
      </div>
    </Card>
  );
}

export function MoodBar({ i, u }: { i: { positive: number; neutral: number; negative: number }; u: U }) {
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

function PulseSection({ d, u, lang }: { d: D; u: U; lang: string }) {
  const latest = d.insights[0];
  if (!latest) return <Card><p className="text-sm text-muted-foreground">{u("noPulse")}</p></Card>;
  const max = Math.max(...latest.topics.map((x) => x.count), 1);
  const trend = [...d.insights].reverse().map((i) => ({
    date: new Date(i.created_at).toLocaleDateString(lang === "en" ? "en-GB" : lang === "ru" ? "ru-RU" : "uz-UZ", { day: "2-digit", month: "2-digit" }),
    positive: i.positive, negative: i.negative,
  }));
  return (
    <>
      <Card>
        <p className="text-sm font-semibold">{u("mood")}</p>
        <MoodBar i={latest} u={u} />
        {latest.summary && <p className="mt-3 text-sm text-muted-foreground">{latest.summary}</p>}
      </Card>
      {trend.length > 1 && (
        <Card>
          <p className="mb-2 text-sm font-semibold">{u("trend")}</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="positive" name={u("pos")} stroke="var(--success)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="negative" name={u("neg")} stroke="var(--destructive)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      {latest.topics.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-semibold">{u("topics")}</p>
          <ul className="space-y-2">
            {latest.topics.map((t, idx) => (
              <li key={idx}>
                <div className="flex justify-between text-sm"><span>{t.topic}</span><span className="text-muted-foreground">{t.count}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className={cn("h-1.5 rounded-full", t.sentiment === "positive" ? "bg-success" : t.sentiment === "negative" ? "bg-destructive" : "bg-chart-2")} style={{ width: `${(t.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <section className="grid gap-2 sm:grid-cols-2">
        <Card>
          <p className="mb-2 text-sm font-semibold text-success">{u("drivesPos")}</p>
          <ul className="space-y-1 text-sm">{latest.positive_drivers.map((x, i) => <li key={i}>+ {x}</li>)}</ul>
        </Card>
        <Card>
          <p className="mb-2 text-sm font-semibold text-destructive">{u("drivesNeg")}</p>
          <ul className="space-y-1 text-sm">{latest.negative_drivers.map((x, i) => <li key={i}>− {x}</li>)}</ul>
        </Card>
      </section>
    </>
  );
}

function FaqSection({ d, u, token }: { d: D; u: U; token: string }) {
  const open = d.clusters.filter((c) => !c.answer);
  const done = d.clusters.filter((c) => c.answer);
  return (
    <>
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
              <Card key={c.id}>
                <p className="flex items-start gap-2 font-semibold"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {c.question}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{c.answer}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
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
    const r = await run(() => ans({ data: { token, initData: tgInit(), id: c.id, answer: text } }), u);
    setBusy(false);
    if (!r) return;
    const { toast } = await import("sonner");
    toast.success(u("sentTo", { n: r.sent }));
    qc.invalidateQueries({ queryKey: ["cab", token] });
  };
  return (
    <Card>
      <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setExpanded(!expanded)}>
        <p className="font-semibold">{c.question}</p>
        <span className="flex shrink-0 items-center gap-1">
          <span className="rounded-md bg-accent px-2 py-0.5 text-sm font-bold text-accent-foreground">×{c.ask_count}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", expanded && "rotate-180")} />
        </span>
      </button>
      {expanded && (
        <div className="mt-2">
          <p className="text-[11px] font-medium uppercase text-muted-foreground">{u("sources")}</p>
          <ul className="mt-1 space-y-1 border-l-2 border-border pl-3 text-xs text-muted-foreground">
            {c.sources.map((s, i) => <li key={i}><b>{s.from}:</b> {s.text}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Textarea rows={2} placeholder={u("answer")} value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="icon" className="shrink-0 self-end" aria-label={u("send")} disabled={busy || !text.trim() || c.sources.length === 0} onClick={send}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}

function ContentSection({ d, u, token }: { d: D; u: U; token: string }) {
  const qc = useQueryClient();
  const suggest = useServerFn(suggestNow);
  const [busy, setBusy] = useState(false);
  const sig = d.postSignal;
  const lowSignal = sig.posts > 0 && sig.reactions + sig.replies === 0;
  const make = async () => {
    setBusy(true);
    const r = await run(() => suggest({ data: { token, initData: tgInit() } }), u);
    setBusy(false);
    if (r) qc.invalidateQueries({ queryKey: ["cab", token] });
  };
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> {u("content")}</p>
        <Button size="sm" variant="outline" onClick={make} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {u("suggestNow")}</Button>
      </div>
      <p className="text-xs text-muted-foreground">{u("contentHint")}</p>
      <Card className="text-sm">
        <p>{u("signal", { p: sig.posts, r: sig.reactions, c: sig.replies })}</p>
        {(lowSignal || sig.posts === 0) && (
          <p className="mt-2 flex gap-2 text-xs text-warning-foreground"><TriangleAlert className="h-4 w-4 shrink-0 text-warning" /> {u("lowSignal")}</p>
        )}
      </Card>
      {d.suggestions.length === 0 && <p className="text-sm text-muted-foreground">{u("noSuggestions")}</p>}
      <div className="space-y-2">{d.suggestions.map((s) => <SuggestionCard key={s.id} s={s} d={d} u={u} token={token} />)}</div>
    </section>
  );
}

function SuggestionCard({ s, d, u, token }: { s: D["suggestions"][number]; d: D; u: U; token: string }) {
  const qc = useQueryClient();
  const pub = useServerFn(publishSuggestion);
  const dis = useServerFn(dismissSuggestion);
  const [text, setText] = useState(s.text);
  const [chat, setChat] = useState<string>(String(s.chat_id ?? d.owner.content_chat_id ?? d.chats[0]?.chat_id ?? ""));
  const [busy, setBusy] = useState<"pub" | "dis" | null>(null);
  const isPost = s.kind === "post" || s.kind === "fact";
  const act = async (kind: "pub" | "dis") => {
    setBusy(kind);
    const initData = tgInit();
    const r = await run(() => kind === "pub"
      ? pub({ data: { token, initData, id: s.id, chat_id: chat ? Number(chat) : null, text } })
      : dis({ data: { token, initData, id: s.id } }), u, kind === "pub" ? u("published") : undefined);
    setBusy(null);
    if (r) qc.invalidateQueries({ queryKey: ["cab", token] });
  };
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase text-muted-foreground">
        <span>{u(`kind_${s.kind}` as UKey)}</span>
        <span>{new Date(s.created_at).toLocaleDateString()}</span>
      </div>
      {isPost && s.status === "pending" ? (
        <>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="mt-1 text-[11px] text-muted-foreground">{d.owner.content_footer_disabled && d.plan.footer_removable ? "" : u("footerNote")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {d.chats.length > 1 && (
              <select value={chat} onChange={(e) => setChat(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm" aria-label={u("publishTo")}>
                {d.chats.map((c) => <option key={c.chat_id} value={c.chat_id}>{c.title ?? c.chat_id}</option>)}
              </select>
            )}
            <Button size="sm" disabled={!!busy || !text.trim() || !chat} onClick={() => act("pub")}>{busy === "pub" && <Loader2 className="h-4 w-4 animate-spin" />} {u("publish")}</Button>
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("dis")}>{u("dismiss")}</Button>
          </div>
        </>
      ) : (
        <>
          <p className="whitespace-pre-line text-sm">{s.text}</p>
          {s.status === "published" && <p className="mt-2 flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> {u("published")}</p>}
          {s.status === "info" && <div className="mt-2 text-right"><Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act("dis")}>{u("dismiss")}</Button></div>}
        </>
      )}
    </Card>
  );
}
