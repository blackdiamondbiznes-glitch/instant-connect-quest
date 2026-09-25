import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner, mutationOwner, planExpired, supabaseAdmin, type Owner } from "./cabinet.server";
import { enabledDataTypes, tableFor, type DataType } from "./niches";

const Tok = z.object({ token: z.string().uuid(), initData: z.string().max(4096).optional().nullable() });
const RecordType = z.enum(["record", "booking", "stock", "waybill"]);

export type Member = { id: string; owner_id: number; name: string; phone: string | null; status: string; amount: number; note: string | null; created_at: string };
export type RecordRow = { id: string; owner_id: number; title: string; client: string | null; status: string; amount: number; due_date: string | null; data_type: string; created_at: string };
export type Topic = { topic: string; count: number; sentiment: "positive" | "neutral" | "negative" };
export type Insight = { id: string; positive: number; neutral: number; negative: number; topics: Topic[]; positive_drivers: string[]; negative_drivers: string[]; summary: string | null; message_count: number; created_at: string };
export type ClusterSource = { chat_id: number; message_id: number; from: string | null; text: string };
export type Cluster = { id: string; question: string; ask_count: number; sources: ClusterSource[]; answer: string | null; answered_at: string | null; created_at: string };
export type Chat = { chat_id: number; title: string | null; chat_type: string | null };

const has = (owner: Owner, t: DataType) => enabledDataTypes(owner.modules as string[]).has(t);

export const getCabinet = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.parse(d))
  .handler(async ({ data }) => {
    const owner = await requireOwner({ token: data.token, initData: data.initData, readOnly: true });
    const id = owner.telegram_id;
    const [members, records, chats, insights, clusters, msgCount] = await Promise.all([
      supabaseAdmin.from("members").select("*").eq("owner_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("records").select("*").eq("owner_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("tg_chats").select("chat_id,title,chat_type").eq("owner_id", id),
      supabaseAdmin.from("insights").select("*").eq("owner_id", id).order("created_at", { ascending: false }).limit(8),
      supabaseAdmin.from("question_clusters").select("*").eq("owner_id", id).order("ask_count", { ascending: false }),
      supabaseAdmin.from("tg_messages").select("id", { count: "exact", head: true }).eq("owner_id", id).eq("kind", "member_message"),
    ]);
    const endsAt = owner.plan_status === "active" ? owner.subscription_ends_at : owner.trial_ends_at;
    return {
      owner: { first_name: owner.first_name, language: owner.language, niche: owner.niche, workspace_type: owner.workspace_type, modules: owner.modules as string[], is_demo: owner.is_demo },
      plan: { status: owner.plan_status, ends_at: endsAt as string | null, expired: planExpired(owner) },
      members: (members.data ?? []) as Member[],
      records: (records.data ?? []) as RecordRow[],
      chats: (chats.data ?? []) as Chat[],
      insights: (insights.data ?? []) as unknown as Insight[],
      clusters: (clusters.data ?? []) as unknown as Cluster[],
      messageCount: msgCount.count ?? 0,
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
    if (!has(owner, "member") && !has(owner, "subscription")) return { ok: false as const, error: "module_disabled" as const };
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
  due_date: z.string().max(20).optional().nullable(),
  data_type: RecordType.default("record"),
});

export const saveRecord = createServerFn({ method: "POST" })
  .inputValidator((d) => RecordIn.parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const owner = r.owner;
    if (!has(owner, data.data_type)) return { ok: false as const, error: "module_disabled" as const };
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
    const types = [...enabledDataTypes(owner.modules as string[])];
    if (data.table === "members") {
      if (!types.some((t) => tableFor(t) === "members")) return { ok: false as const, error: "module_disabled" as const };
      const { error } = await supabaseAdmin.from("members").delete().eq("id", data.id).eq("owner_id", owner.telegram_id);
      if (error) throw new Error(error.message);
    } else {
      const allowed = types.filter((t) => tableFor(t) === "records");
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
    const { MODULES } = await import("./niches");
    const mods = Array.from(new Set(data.modules.filter((m) => m in MODULES)));
    const { error } = await supabaseAdmin.from("tg_owners").update({ modules: mods }).eq("telegram_id", r.owner.telegram_id);
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

export const runAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error };
    const owner = r.owner;
    if (!has(owner, "insight")) return { ok: false as const, error: "module_disabled" as const };
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: msgs } = await supabaseAdmin
      .from("tg_messages").select("chat_id,message_id,from_name,text,is_question")
      .eq("owner_id", owner.telegram_id).eq("kind", "member_message").gte("created_at", since)
      .order("created_at", { ascending: false }).limit(300);
    if (!msgs || msgs.length === 0) return { ok: false as const, error: "no_messages" as const };
    const { data: slot } = await supabaseAdmin.rpc("consume_analysis_slot", { _owner: owner.telegram_id, _max: 3 });
    if (!slot) return { ok: false as const, error: "rate_limited" as const };

    const { getNiche } = await import("./niches");
    const niche = getNiche(owner.niche);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./ai-gateway.server");
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: createLovableAiGatewayRunIdFetch().fetch,
    });
    const langName = { uz: "Uzbek (Latin)", ru: "Russian", en: "English" }[owner.language as "uz"] ?? "Uzbek (Latin)";
    const schema = z.object({
      positive: z.number(), neutral: z.number(), negative: z.number(),
      summary: z.string(),
      topics: z.array(z.object({ topic: z.string(), count: z.number(), sentiment: z.enum(["positive", "neutral", "negative"]) })),
      positive_drivers: z.array(z.string()),
      negative_drivers: z.array(z.string()),
      clusters: z.array(z.object({ question: z.string(), message_indexes: z.array(z.number()) })),
    });
    const list = msgs.map((m, i) => `[${i}] ${m.text.replace(/\s+/g, " ").slice(0, 300)}`).join("\n");
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema }),
      system: `You analyze member messages from a Telegram community. Context: ${niche.aiContext}. Write all text output in ${langName}.
Rules: positive+neutral+negative must be integer percentages summing to 100. Give at most 8 topics ranked by count. At most 5 positive and 5 negative drivers, short phrases. Clusters: group only messages that are questions with the same underlying meaning; 'question' is one clear canonical rephrasing; include every matching message index; at most 15 clusters ranked by size; skip non-questions. Summary: 2 sentences.`,
      prompt: list,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false, include: ["reasoning.encrypted_content"] } },
    });
    let out: z.infer<typeof schema>;
    try {
      out = (await result.output) as z.infer<typeof schema>;
    } catch (e: any) {
      console.error("AI analysis failed", e);
      const status = e?.statusCode ?? e?.cause?.statusCode;
      return { ok: false as const, error: (status === 402 ? "credits" : status === 429 ? "rate" : "ai") as "credits" | "rate" | "ai" };
    }

    const mood = normalizeSentiment(out.positive, out.neutral, out.negative);
    await supabaseAdmin.from("insights").insert({
      owner_id: owner.telegram_id,
      ...mood,
      topics: out.topics.slice(0, 8), positive_drivers: out.positive_drivers.slice(0, 5), negative_drivers: out.negative_drivers.slice(0, 5),
      summary: out.summary, message_count: msgs.length,
    });
    const rows = out.clusters.slice(0, 15).map((c) => {
      const sources = Array.from(new Set(c.message_indexes)).filter((i) => msgs[i]).map((i) => ({ chat_id: msgs[i]!.chat_id, message_id: msgs[i]!.message_id, from: msgs[i]!.from_name, text: msgs[i]!.text.slice(0, 200) }));
      return { question: c.question, ask_count: Math.max(1, sources.length), sources };
    }).filter((r) => r.sources.length > 0);
    // Only replace unanswered clusters when we have new ones; done atomically in one DB transaction.
    if (rows.length) {
      const { error } = await supabaseAdmin.rpc("replace_question_clusters", { _owner: owner.telegram_id, _rows: rows });
      if (error) console.error("replace_question_clusters failed", error);
    }
    return { ok: true as const };
  });

export const answerCluster = createServerFn({ method: "POST" })
  .inputValidator((d) => Tok.extend({ id: z.string().uuid(), answer: z.string().trim().min(1).max(3500) }).parse(d))
  .handler(async ({ data }) => {
    const r = await mutationOwner(data.token, data.initData);
    if (r.error) return { ok: false as const, error: r.error, sent: 0 };
    const owner = r.owner;
    if (!(owner.modules as string[]).includes("ai_faq")) return { ok: false as const, error: "module_disabled" as const, sent: 0 };
    const { data: c } = await supabaseAdmin.from("question_clusters").select("*").eq("id", data.id).eq("owner_id", owner.telegram_id).maybeSingle();
    if (!c) throw new Error("Topilmadi");
    const { data: chats } = await supabaseAdmin.from("tg_chats").select("chat_id").eq("owner_id", owner.telegram_id);
    const ownChats = new Set((chats ?? []).map((x) => Number(x.chat_id)));
    const sources = ((c.sources ?? []) as unknown as ClusterSource[]);
    if (sources.some((s) => !ownChats.has(Number(s.chat_id)))) throw new Error("Forbidden: chat does not belong to this owner");
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
    await supabaseAdmin.from("question_clusters").update({ answer: data.answer, answered_at: new Date().toISOString() }).eq("id", c.id).eq("owner_id", owner.telegram_id);
    return { ok: true as const, error: null, sent };
  });
