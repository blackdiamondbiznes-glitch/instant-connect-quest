import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner, mutationOwner, planExpired, effectiveTier, consumeQuota, refundQuota, supabaseAdmin, type Owner } from "./cabinet.server";
import { enabledDataTypes, getNiche, isMemberType, offeredModules, statusesFor, type DataType } from "./niches";
import { ANALYSIS_RUNS_PER_DAY, FOOTER_REMOVABLE_TIERS } from "./config";

const Tok = z.object({ token: z.string().uuid(), initData: z.string().max(4096).optional().nullable() });
const RecordType = z.enum(["record", "booking", "stock", "waybill"]);

export type Member = { id: string; owner_id: number; name: string; phone: string | null; status: string; amount: number; note: string | null; created_at: string };
export type RecordRow = { id: string; owner_id: number; title: string; client: string | null; status: string; amount: number; due_date: string | null; data_type: string; created_at: string };
export type Topic = { topic: string; count: number; sentiment: "positive" | "neutral" | "negative" };
export type Insight = { id: string; positive: number; neutral: number; negative: number; topics: Topic[]; positive_drivers: string[]; negative_drivers: string[]; summary: string | null; message_count: number; created_at: string };
export type ClusterSource = { chat_id: number; message_id: number; from: string | null; text: string };
export type Cluster = { id: string; question: string; ask_count: number; sources: ClusterSource[]; answer: string | null; answered_at: string | null; created_at: string };
export type Chat = { chat_id: number; title: string | null; chat_type: string | null };
export type Suggestion = { id: string; kind: "post" | "fact" | "perf_digest" | "question_digest"; text: string; status: string; chat_id: number | null; meta: Record<string, string | number | boolean | null>; created_at: string; published_at: string | null };
export type PostSignal = { posts: number; reactions: number; replies: number };

const mods = (o: Owner) => o.modules as string[];
const has = (o: Owner, t: DataType) => enabledDataTypes(mods(o)).has(t);

export const getCabinet = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.parse(d))
  .handler(async ({ data }) => {
    const owner = await requireOwner({ token: data.token, initData: data.initData, readOnly: true });
    const id = owner.telegram_id;
    const m = mods(owner);
    const pulse = m.includes("ai_pulse"), faq = m.includes("ai_faq"), content = m.includes("ai_content");
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const none = Promise.resolve({ data: [] as never[], count: 0 });
    const [members, records, chats, insights, clusters, msgCount, suggestions, posts] = await Promise.all([
      supabaseAdmin.from("members").select("*").eq("owner_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("records").select("*").eq("owner_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("tg_chats").select("chat_id,title,chat_type").eq("owner_id", id),
      pulse ? supabaseAdmin.from("insights").select("*").eq("owner_id", id).order("created_at", { ascending: false }).limit(12) : none,
      faq ? supabaseAdmin.from("question_clusters").select("*").eq("owner_id", id).order("ask_count", { ascending: false }) : none,
      pulse || faq ? supabaseAdmin.from("tg_messages").select("id", { count: "exact", head: true }).eq("owner_id", id).eq("kind", "member_message") : none,
      content ? supabaseAdmin.from("content_suggestions").select("*").eq("owner_id", id).neq("status", "dismissed").order("created_at", { ascending: false }).limit(30) : none,
      content ? supabaseAdmin.from("tg_messages").select("reactions,replies").eq("owner_id", id).in("kind", ["owner_post", "channel_post"]).is("origin_chat_id", null).gte("created_at", since) : none,
    ]);
    const postRows = (posts.data ?? []) as { reactions: number; replies: number }[];
    const endsAt = owner.plan_status === "active" ? owner.subscription_ends_at : owner.trial_ends_at;
    const tier = effectiveTier(owner);
    let botUsername: string | null = null;
    if (!owner.is_demo) {
      const { botUsername: getBot } = await import("./automation.server");
      botUsername = await getBot();
    }
    return {
      owner: {
        first_name: owner.first_name, display_name: owner.display_name, language: owner.language, niche: owner.niche,
        workspace_type: owner.workspace_type, modules: m, is_demo: owner.is_demo,
        content_auto_publish: owner.content_auto_publish, content_footer_disabled: owner.content_footer_disabled, content_chat_id: owner.content_chat_id,
      },
      plan: { status: owner.plan_status, tier, ends_at: endsAt as string | null, expired: planExpired(owner), footer_removable: FOOTER_REMOVABLE_TIERS.includes(tier) },
      botUsername,
      members: (members.data ?? []) as Member[],
      records: (records.data ?? []) as RecordRow[],
      chats: (chats.data ?? []) as Chat[],
      insights: (insights.data ?? []) as unknown as Insight[],
      clusters: (clusters.data ?? []) as unknown as Cluster[],
      messageCount: msgCount.count ?? 0,
      suggestions: (suggestions.data ?? []) as unknown as Suggestion[],
      postSignal: { posts: postRows.length, reactions: postRows.reduce((s, r) => s + r.reactions, 0), replies: postRows.reduce((s, r) => s + r.replies, 0) } as PostSignal,
      limits: { analysisPerDay: ANALYSIS_RUNS_PER_DAY },
    };
  });

const MemberIn = Tok.extend({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().max(40).optional().nullable(),
  status: z.string().max(30),
  amount: z.number().min(0).max(1e12),
  note: z.string().max(500).optional().nullable(),
});

export const saveMember = createServerFn({ method: "POST" })
  .inputValidator((d) => MemberIn.parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const owner = r.owner;
    if (![...enabledDataTypes(mods(owner))].some(isMemberType)) return { ok: false as const, error: "module_disabled" as const };
    if (!statusesFor(getNiche(owner.niche), "member").includes(data.status)) return { ok: false as const, error: "invalid_status" as const };
    const row = { owner_id: owner.telegram_id, name: data.name, phone: data.phone ?? null, status: data.status, amount: data.amount, note: data.note ?? null };
    const q = data.id
      ? supabaseAdmin.from("members").update(row).eq("id", data.id).eq("owner_id", owner.telegram_id)
      : supabaseAdmin.from("members").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const RecordIn = Tok.extend({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  client: z.string().max(120).optional().nullable(),
  status: z.string().max(30),
  amount: z.number().min(0).max(1e12),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
  data_type: RecordType.default("record"),
});

export const saveRecord = createServerFn({ method: "POST" })
  .inputValidator((d) => RecordIn.parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const owner = r.owner;
    if (!has(owner, data.data_type)) return { ok: false as const, error: "module_disabled" as const };
    if (!statusesFor(getNiche(owner.niche), data.data_type).includes(data.status)) return { ok: false as const, error: "invalid_status" as const };
    const row = { owner_id: owner.telegram_id, title: data.title, client: data.client ?? null, status: data.status, amount: data.amount, due_date: data.due_date || null, data_type: data.data_type };
    const q = data.id
      ? supabaseAdmin.from("records").update(row).eq("id", data.id).eq("owner_id", owner.telegram_id)
      : supabaseAdmin.from("records").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteItem = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ id: z.string().uuid(), table: z.enum(["members", "records"]) }).parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const owner = r.owner;
    const types = [...enabledDataTypes(mods(owner))];
    if (data.table === "members") {
      if (!types.some(isMemberType)) return { ok: false as const, error: "module_disabled" as const };
      const { error } = await supabaseAdmin.from("members").delete().eq("id", data.id).eq("owner_id", owner.telegram_id);
      if (error) throw new Error(error.message);
    } else {
      const allowed = types.filter((t) => (RecordType.options as string[]).includes(t));
      if (!allowed.length) return { ok: false as const, error: "module_disabled" as const };
      const { error } = await supabaseAdmin.from("records").delete().eq("id", data.id).eq("owner_id", owner.telegram_id).in("data_type", allowed);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const saveModules = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ modules: z.array(z.string().max(40)).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const offered = offeredModules(r.owner.niche, r.owner.workspace_type);
    const next = Array.from(new Set(data.modules.filter((m) => offered.includes(m))));
    const { error } = await supabaseAdmin.from("tg_owners").update({ modules: next, updated_at: new Date().toISOString() }).eq("telegram_id", r.owner.telegram_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ display_name: z.string().trim().max(60).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const { error } = await supabaseAdmin.from("tg_owners").update({ display_name: data.display_name || null, updated_at: new Date().toISOString() }).eq("telegram_id", r.owner.telegram_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Clamp to 0..100 and force positive+neutral+negative === 100. */
function normalizeSentiment(p: number, n: number, g: number) {
  const c = (x: number) => (Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 0);
  let [a, b, d] = [c(p), c(n), c(g)];
  const sum = a + b + d;
  if (sum <= 0) return { positive: 0, neutral: 100, negative: 0 };
  [a, b, d] = [Math.round((a / sum) * 100), Math.round((b / sum) * 100), Math.round((d / sum) * 100)];
  b += 100 - (a + b + d);
  if (b < 0) { a += b; b = 0; }
  return { positive: a, neutral: b, negative: d };
}

type AiError = "credits" | "rate" | "ai";
const ANALYSIS_QUOTA = { periodDays: 1, max: ANALYSIS_RUNS_PER_DAY };

export const runAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const owner = r.owner;
    const pulse = mods(owner).includes("ai_pulse"), faq = mods(owner).includes("ai_faq");
    if (!pulse && !faq) return { ok: false as const, error: "module_disabled" as const };
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: msgs } = await supabaseAdmin
      .from("tg_messages").select("chat_id,message_id,from_name,text,is_question")
      .eq("owner_id", owner.telegram_id).eq("kind", "member_message").gte("created_at", since)
      .order("created_at", { ascending: false }).limit(300);
    if (!msgs || msgs.length === 0) return { ok: false as const, error: "no_messages" as const };
    if (!(await consumeQuota(owner.telegram_id, "analysis", ANALYSIS_QUOTA))) return { ok: false as const, error: "rate_limited" as const };

    const niche = getNiche(owner.niche);
    const { aiObject, langName } = await import("./ai.server");
    const schema = z.object({
      positive: z.number(), neutral: z.number(), negative: z.number(),
      summary: z.string(),
      topics: z.array(z.object({ topic: z.string(), count: z.number(), sentiment: z.enum(["positive", "neutral", "negative"]) })),
      positive_drivers: z.array(z.string()),
      negative_drivers: z.array(z.string()),
      clusters: z.array(z.object({ question: z.string(), message_indexes: z.array(z.number()) })),
    });
    const list = msgs.map((m, i) => `[${i}] ${m.text.replace(/\s+/g, " ").slice(0, 300)}`).join("\n");
    const tasks = [
      pulse ? "Sentiment: positive+neutral+negative are integer percentages summing to 100. At most 8 topics ranked by count, each with a sentiment. At most 5 positive and 5 negative drivers as short phrases. Summary: exactly 2 sentences." : "Return 0/100/0 for sentiment, empty topics/drivers and an empty summary.",
      faq ? "Clusters: group only messages that are questions with the same underlying meaning; 'question' is one clear canonical rephrasing; include every matching message index; at most 15 clusters ranked by size; skip non-questions." : "Return an empty clusters array.",
    ].join("\n");
    const res = await aiObject({
      schema,
      system: `You analyze member messages from a Telegram community. Context: ${niche.aiContext}. Write all text output in ${langName(owner.language)}.\n${tasks}`,
      prompt: list,
    });
    if (!res.ok) {
      await refundQuota(owner.telegram_id, "analysis", ANALYSIS_QUOTA);
      return { ok: false as const, error: res.error as AiError };
    }
    const out = res.value;

    if (pulse) {
      const mood = normalizeSentiment(out.positive, out.neutral, out.negative);
      const { error } = await supabaseAdmin.from("insights").insert({
        owner_id: owner.telegram_id, ...mood,
        topics: out.topics.slice(0, 8), positive_drivers: out.positive_drivers.slice(0, 5), negative_drivers: out.negative_drivers.slice(0, 5),
        summary: out.summary, message_count: msgs.length,
      });
      if (error) console.error("insight insert failed", error);
    }
    if (faq) {
      const rows = out.clusters.slice(0, 15).map((c) => {
        const sources = Array.from(new Set(c.message_indexes)).filter((i) => msgs[i]).map((i) => ({ chat_id: msgs[i]!.chat_id, message_id: msgs[i]!.message_id, from: msgs[i]!.from_name, text: msgs[i]!.text.slice(0, 200) }));
        return { question: c.question, ask_count: Math.max(1, sources.length), sources };
      }).filter((x) => x.sources.length > 0).sort((a, b) => b.ask_count - a.ask_count);
      // Only unanswered clusters are replaced; answered ones are never overwritten.
      if (rows.length) {
        const { error } = await supabaseAdmin.rpc("replace_question_clusters", { _owner: owner.telegram_id, _rows: rows });
        if (error) console.error("replace_question_clusters failed", error);
      }
    }
    return { ok: true as const };
  });

export const answerCluster = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ id: z.string().uuid(), answer: z.string().trim().min(1).max(3500) }).parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error, sent: 0 };
    const owner = r.owner;
    if (!mods(owner).includes("ai_faq")) return { ok: false as const, error: "module_disabled" as const, sent: 0 };
    const { data: c } = await supabaseAdmin.from("question_clusters").select("*").eq("id", data.id).eq("owner_id", owner.telegram_id).maybeSingle();
    if (!c) return { ok: false as const, error: "not_found" as const, sent: 0 };
    if (c.answer) return { ok: false as const, error: "already_answered" as const, sent: 0 };
    const { data: chats } = await supabaseAdmin.from("tg_chats").select("chat_id").eq("owner_id", owner.telegram_id);
    const ownChats = new Set((chats ?? []).map((x) => Number(x.chat_id)));
    const sources = (c.sources ?? []) as unknown as ClusterSource[];
    // Every source must be in a chat this owner owns, otherwise nothing is sent at all.
    if (sources.some((s) => !ownChats.has(Number(s.chat_id)))) return { ok: false as const, error: "forbidden" as const, sent: 0 };
    const { data: claimed } = await supabaseAdmin.from("question_clusters")
      .update({ answer: data.answer, answered_at: new Date().toISOString() })
      .eq("id", c.id).eq("owner_id", owner.telegram_id).is("answer", null).select("id");
    if (!claimed?.length) return { ok: false as const, error: "already_answered" as const, sent: 0 };
    const { tg } = await import("./telegram.server");
    let sent = 0;
    for (const s of sources) {
      try {
        await tg("sendMessage", { chat_id: s.chat_id, text: data.answer, reply_parameters: { message_id: s.message_id, allow_sending_without_reply: true } });
        sent++;
      } catch (e) {
        console.error("reply failed", e);
      }
    }
    return { ok: true as const, error: null, sent };
  });
