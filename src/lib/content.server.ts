import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tg } from "./telegram.server";
import { consumeQuota, effectiveTier, planExpired, refundQuota, type Owner } from "./cabinet.server";
import { humanChat } from "./account.server";
import { getNiche, tr, type L } from "./niches";
import {
  CONTENT_CADENCE, CONTENT_MAX_POST_CHARS, CONTENT_MAX_SUGGESTIONS_PER_DAY, CONTENT_OWNERS_PER_TICK,
  CONTENT_PERF_LOOKBACK_DAYS, FOOTER_REMOVABLE_TIERS, type Quota,
} from "./config";

export type ContentError = "no_chats" | "quota" | "credits" | "rate" | "ai" | "not_found" | "forbidden" | "send_failed";

const DAILY_CAP: Quota = { periodDays: 1, max: CONTENT_MAX_SUGGESTIONS_PER_DAY };

const TX: Record<string, L> = {
  footer: { uz: "🤖 @{bot} bilan yaratildi", ru: "🤖 сделано с @{bot}", en: "🤖 built with @{bot}" },
  newSuggestion: { uz: "💡 Yangi post taklifi tayyor. Kabinetda ko'rib chiqing va bir bosishda e'lon qiling.", ru: "💡 Готова новая идея поста. Посмотрите в кабинете и опубликуйте в одно касание.", en: "💡 A new post suggestion is ready. Review it in your cabinet and publish in one tap." },
  autoPublished: { uz: "🤖 AI post avtomatik e'lon qilindi:", ru: "🤖 AI-пост опубликован автоматически:", en: "🤖 AI post auto-published:" },
  perfTitle: { uz: "📈 Postlar samaradorligi", ru: "📈 Эффективность постов", en: "📈 Post performance" },
  qTitle: { uz: "❓ Savollar dayjesti — javob kutayotganlar:", ru: "❓ Дайджест вопросов — ждут ответа:", en: "❓ Question digest — awaiting an answer:" },
  lowSignal: {
    uz: "Signal kam: postlarga reaksiya yoki izoh yo'q. Kanalda reaksiyalarni yoqing va muhokama guruhini ulang (botni u yerga ham admin qiling) — tahlil aniqroq bo'ladi. Ko'rishlar soni Telegram tomonidan botlarga berilmaydi.",
    ru: "Мало сигналов: у постов нет реакций и комментариев. Включите реакции в канале и подключите группу обсуждений (добавьте туда бота админом) — анализ станет точнее. Просмотры Telegram ботам не отдаёт.",
    en: "Low signal: your posts have no reactions or comments. Enable reactions in the channel and link a discussion group (add the bot there as admin too) for better results. Telegram doesn't expose view counts to bots.",
  },
};
const tx = (k: string, lang: string) => tr(TX[k], lang);

export type PostStat = { chat_id: number; message_id: number; text: string; reactions: number; replies: number; created_at: string };
export type Performance = { posts: PostStat[]; reactions: number; replies: number; lowSignal: boolean };

/** Owner's own posts in the lookback window: channel posts in channels, owner messages in groups; auto-forwards excluded. */
export async function ownerPerformance(ownerId: number): Promise<Performance> {
  const since = new Date(Date.now() - CONTENT_PERF_LOOKBACK_DAYS * 86400000).toISOString();
  const [{ data: rows }, { data: chats }] = await Promise.all([
    supabaseAdmin.from("tg_messages").select("chat_id,message_id,text,kind,reactions,replies,created_at")
      .eq("owner_id", ownerId).in("kind", ["owner_post", "channel_post"]).is("origin_chat_id", null).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(60),
    supabaseAdmin.from("tg_chats").select("chat_id,chat_type").eq("owner_id", ownerId),
  ]);
  const channels = new Set((chats ?? []).filter((c) => c.chat_type === "channel").map((c) => Number(c.chat_id)));
  const posts = (rows ?? [])
    .filter((r) => r.kind === "owner_post" || channels.has(Number(r.chat_id)))
    .map((r) => ({ chat_id: Number(r.chat_id), message_id: Number(r.message_id), text: r.text, reactions: r.reactions, replies: r.replies, created_at: r.created_at }));
  const reactions = posts.reduce((s, p) => s + p.reactions, 0);
  const replies = posts.reduce((s, p) => s + p.replies, 0);
  return { posts, reactions, replies, lowSignal: posts.length > 0 && reactions + replies === 0 };
}

const score = (p: PostStat) => p.reactions + 2 * p.replies;

/** Cuts at the last sentence/line boundary under the cap; never returns more than `max` chars. */
export function capLength(text: string, max = CONTENT_MAX_POST_CHARS): string {
  const clean = text.trim().replace(/\n{3,}/g, "\n\n");
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const cut = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "), slice.lastIndexOf("\n"));
  return (cut > max * 0.5 ? slice.slice(0, cut + 1) : slice.slice(0, max - 1) + "…").trim();
}

async function ownerChats(ownerId: number) {
  const { data } = await supabaseAdmin.from("tg_chats").select("chat_id,title,chat_type").eq("owner_id", ownerId);
  return data ?? [];
}

async function generateText(owner: Owner, kind: "post" | "fact", perf: Performance): Promise<{ ok: true; text: string } | { ok: false; error: ContentError }> {
  const { aiObject, langName } = await import("./ai.server");
  const niche = getNiche(owner.niche);
  const top = [...perf.posts].sort((a, b) => score(b) - score(a)).slice(0, 3);
  const perfNote = top.length && !perf.lowSignal
    ? `Best-performing recent posts (reactions/comments):\n${top.map((p) => `- (${p.reactions}/${p.replies}) ${p.text.replace(/\s+/g, " ").slice(0, 200)}`).join("\n")}`
    : "No reliable performance data yet.";
  const task = kind === "fact"
    ? "Write ONE short, interesting, niche-relevant fact, statistic or bit of history/trivia the audience would enjoy."
    : "Write ONE ready-to-publish Telegram post for this owner's audience: a niche-relevant stat, fact, tip or short trivia item, ideally ending with a light question that invites replies.";
  const res = await aiObject({
    schema: z.object({ text: z.string() }),
    system: `You help a Telegram professional run their channel. Niche: ${niche.aiContext}. Write in ${langName(owner.language)}.
${task}
Hard rules: at most ${Math.floor(CONTENT_MAX_POST_CHARS * 0.85)} characters; 1–3 short sentences; at most 2 emoji; no hashtags; no links.
Only use widely known, verifiable facts; avoid precise numbers unless well established. Never invent prices, discounts, dates or promises about the owner's business.`,
    prompt: perfNote,
  });
  if (!res.ok) return { ok: false, error: res.error };
  const text = capLength(res.value.text);
  return text ? { ok: true, text } : { ok: false, error: "ai" };
}

/** Creates one post/fact suggestion, consuming cadence + daily cap atomically. */
export async function suggest(owner: Owner, kind: "post" | "fact", opts: { respectSpacing: boolean }): Promise<{ ok: true; id: string } | { ok: false; error: ContentError }> {
  const cadence = CONTENT_CADENCE[effectiveTier(owner)];
  const quota = kind === "post" ? cadence.post : cadence.fact;
  if (!quota) return { ok: false, error: "quota" };
  const chats = await ownerChats(owner.telegram_id);
  if (!chats.length) return { ok: false, error: "no_chats" };

  if (opts.respectSpacing && kind === "post") {
    const gapMs = (quota.periodDays * 86400000) / quota.max;
    const { data: last } = await supabaseAdmin.from("content_suggestions").select("created_at").eq("owner_id", owner.telegram_id).eq("kind", "post").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < gapMs) return { ok: false, error: "quota" };
  }

  const bucket = `content_${kind}`;
  if (!(await consumeQuota(owner.telegram_id, bucket, quota))) return { ok: false, error: "quota" };
  if (!(await consumeQuota(owner.telegram_id, "content_daily_cap", DAILY_CAP))) {
    await refundQuota(owner.telegram_id, bucket, quota);
    return { ok: false, error: "quota" };
  }
  const perf = await ownerPerformance(owner.telegram_id);
  const gen = await generateText(owner, kind, perf);
  if (!gen.ok) {
    await refundQuota(owner.telegram_id, bucket, quota);
    await refundQuota(owner.telegram_id, "content_daily_cap", DAILY_CAP);
    return gen;
  }
  const target = owner.content_chat_id && chats.some((c) => Number(c.chat_id) === Number(owner.content_chat_id)) ? Number(owner.content_chat_id) : Number(chats[0]!.chat_id);
  const { data: row, error } = await supabaseAdmin.from("content_suggestions")
    .insert({ owner_id: owner.telegram_id, kind, text: gen.text, status: "pending", chat_id: target, meta: { low_signal: perf.lowSignal } })
    .select("id").single();
  if (error || !row) {
    console.error("suggestion insert failed", error);
    return { ok: false, error: "ai" };
  }
  // Auto-publish is opt-in only.
  if (owner.content_auto_publish) {
    const pub = await publish(owner, row.id, target);
    if (pub.ok) await tg("sendMessage", { chat_id: humanChat(owner), text: `${tx("autoPublished", owner.language)}\n\n${gen.text}` }).catch((e) => console.error("notify failed", e));
  } else {
    await notifyWithCabinet(owner, tx("newSuggestion", owner.language));
  }
  return { ok: true, id: row.id };
}

async function notifyWithCabinet(owner: Owner, text: string) {
  const { appUrl } = await import("./telegram.server");
  const open = tr({ uz: "📊 Kabinetni ochish", ru: "📊 Открыть кабинет", en: "📊 Open cabinet" }, owner.language);
  await tg("sendMessage", { chat_id: humanChat(owner), text, reply_markup: { inline_keyboard: [[{ text: open, web_app: { url: `${appUrl()}/cabinet/${owner.cabinet_token}` } }]] } })
    .catch((e) => console.error("notify failed", e));
}

async function footerFor(owner: Owner): Promise<string> {
  if (owner.content_footer_disabled && FOOTER_REMOVABLE_TIERS.includes(effectiveTier(owner))) return "";
  const { botUsername } = await import("./automation.server");
  const bot = await botUsername();
  return bot ? `\n\n${tx("footer", owner.language).replace("{bot}", bot)}` : "";
}

/**
 * Publishes an AI-suggested post to one of the owner's own chats.
 * The referral footer is appended here and only here — never to owner-written posts, reminders or broadcasts.
 */
export async function publish(owner: Owner, suggestionId: string, chatId: number | null, editedText?: string): Promise<{ ok: true } | { ok: false; error: ContentError }> {
  const { data: s } = await supabaseAdmin.from("content_suggestions").select("*").eq("id", suggestionId).eq("owner_id", owner.telegram_id).maybeSingle();
  if (!s || !["post", "fact"].includes(s.kind)) return { ok: false, error: "not_found" };
  const target = chatId ?? s.chat_id;
  const chats = await ownerChats(owner.telegram_id);
  if (!target || !chats.some((c) => Number(c.chat_id) === Number(target))) return { ok: false, error: "forbidden" };
  const body = capLength(editedText ?? s.text);
  const { data: claimed } = await supabaseAdmin.from("content_suggestions")
    .update({ status: "published", text: body, chat_id: target, published_at: new Date().toISOString() })
    .eq("id", s.id).eq("owner_id", owner.telegram_id).eq("status", "pending").select("id");
  if (!claimed?.length) return { ok: false, error: "not_found" };
  try {
    const sent = await tg<{ message_id: number }>("sendMessage", { chat_id: target, text: body + (await footerFor(owner)) });
    await supabaseAdmin.from("content_suggestions").update({ published_message_id: sent.message_id }).eq("id", s.id);
    const chat = chats.find((c) => Number(c.chat_id) === Number(target));
    // The bot never receives its own posts as updates, so record it for engagement tracking.
    await supabaseAdmin.from("tg_messages").upsert(
      { owner_id: owner.telegram_id, chat_id: target, message_id: sent.message_id, from_name: chat?.title ?? null, text: body, kind: chat?.chat_type === "channel" ? "channel_post" : "owner_post", ai_generated: true },
      { onConflict: "chat_id,message_id" },
    );
    return { ok: true };
  } catch (e) {
    console.error("publish failed", e);
    await supabaseAdmin.from("content_suggestions").update({ status: "pending", published_at: null }).eq("id", s.id);
    return { ok: false, error: "send_failed" };
  }
}

async function perfDigest(owner: Owner, quota: Quota): Promise<boolean> {
  if (!(await consumeQuota(owner.telegram_id, "content_perf", quota))) return false;
  const perf = await ownerPerformance(owner.telegram_id);
  if (!perf.posts.length) {
    await refundQuota(owner.telegram_id, "content_perf", quota);
    return false;
  }
  const best = [...perf.posts].sort((a, b) => score(b) - score(a))[0]!;
  let advice = "";
  if (!perf.lowSignal) {
    const { aiObject, langName } = await import("./ai.server");
    const res = await aiObject({
      schema: z.object({ advice: z.string() }),
      system: `You coach a Telegram creator (${getNiche(owner.niche).aiContext}). In ${langName(owner.language)}, give exactly 2 short sentences of practical advice based on which posts got more reactions and comments. No numbers you weren't given.`,
      prompt: perf.posts.slice(0, 20).map((p) => `(${p.reactions} reactions, ${p.replies} comments) ${p.text.replace(/\s+/g, " ").slice(0, 160)}`).join("\n"),
    });
    if (res.ok) advice = capLength(res.value.advice, 300);
  }
  const stats = `${perf.posts.length} · ❤️ ${perf.reactions} · 💬 ${perf.replies}`;
  const bestLine = `⭐ "${best.text.replace(/\s+/g, " ").slice(0, 80)}" — ❤️ ${best.reactions} · 💬 ${best.replies}`;
  const text = [stats, bestLine, perf.lowSignal ? tx("lowSignal", owner.language) : advice].filter(Boolean).join("\n\n");
  await supabaseAdmin.from("content_suggestions").insert({ owner_id: owner.telegram_id, kind: "perf_digest", text, status: "info", meta: { posts: perf.posts.length, reactions: perf.reactions, replies: perf.replies, low_signal: perf.lowSignal } });
  await tg("sendMessage", { chat_id: humanChat(owner), text: `${tx("perfTitle", owner.language)}\n\n${text}` }).catch((e) => console.error("digest send failed", e));
  return true;
}

/** Question digest reads ai_faq clusters, so it only runs when ai_faq is also enabled. */
async function questionDigest(owner: Owner, quota: Quota): Promise<boolean> {
  if (!(owner.modules as string[]).includes("ai_faq")) return false;
  const { data: open } = await supabaseAdmin.from("question_clusters").select("question,ask_count").eq("owner_id", owner.telegram_id).is("answer", null).order("ask_count", { ascending: false }).limit(5);
  if (!open?.length) return false;
  if (!(await consumeQuota(owner.telegram_id, "content_qdigest", quota))) return false;
  const text = open.map((q, i) => `${i + 1}. ${q.question} (×${q.ask_count})`).join("\n");
  await supabaseAdmin.from("content_suggestions").insert({ owner_id: owner.telegram_id, kind: "question_digest", text, status: "info", meta: { count: open.length } });
  await notifyWithCabinet(owner, `${tx("qTitle", owner.language)}\n\n${text}`);
  return true;
}

/** Hourly: runs whatever is due for each owner with ai_content enabled. */
export async function runContentEngine() {
  const { data: owners } = await supabaseAdmin.from("tg_owners").select("*")
    .eq("is_demo", false).not("onboarded_at", "is", null).contains("modules", ["ai_content"])
    .order("updated_at", { ascending: true }).limit(500);
  const stats = { owners: 0, posts: 0, facts: 0, perf: 0, questions: 0 };
  for (const owner of owners ?? []) {
    // Owners with nothing due exit on the quota check before any AI call, so only owners that did work count.
    if (stats.owners >= CONTENT_OWNERS_PER_TICK) break;
    if (planExpired(owner)) continue;
    const cadence = CONTENT_CADENCE[effectiveTier(owner)];
    const before = stats.posts + stats.facts + stats.perf + stats.questions;
    try {
      if ((await suggest(owner, "post", { respectSpacing: true })).ok) stats.posts++;
      if (cadence.fact && (await suggest(owner, "fact", { respectSpacing: false })).ok) stats.facts++;
      if (cadence.perfDigest && (await perfDigest(owner, cadence.perfDigest))) stats.perf++;
      if (cadence.questionDigest && (await questionDigest(owner, cadence.questionDigest))) stats.questions++;
    } catch (e) {
      console.error("content engine failed for owner", owner.telegram_id, e);
    }
    if (stats.posts + stats.facts + stats.perf + stats.questions > before) stats.owners++;
  }
  return stats;
}
