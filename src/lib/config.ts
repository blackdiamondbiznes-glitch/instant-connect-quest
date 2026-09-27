/**
 * Every tunable limit in one place. Values marked [CONFIGURABLE] in the spec live here,
 * so they can be changed without touching business logic.
 */

export type PlanTier = "free" | "start" | "pro";
export const PLAN_TIERS: PlanTier[] = ["free", "start", "pro"];

/** Content-engine cadence for owners still in their trial. */
export const TRIAL_TIER: PlanTier = "start";

/** Manual "Analyze now" runs per owner per day (§8.4). */
export const ANALYSIS_RUNS_PER_DAY = 3;

/** Broadcasts per owner per rolling 24h, to avoid Telegram spam bans. */
export const BROADCASTS_PER_DAY = 10;

/** A quota window: at most `max` uses every `periodDays` days. */
export type Quota = { periodDays: number; max: number };

export type ContentCadence = {
  post: Quota;
  fact: Quota | null;
  perfDigest: Quota | null;
  questionDigest: Quota | null;
};

/** §8.5 cadence by plan tier. */
export const CONTENT_CADENCE: Record<PlanTier, ContentCadence> = {
  free: { post: { periodDays: 7, max: 1 }, fact: { periodDays: 7, max: 1 }, perfDigest: null, questionDigest: { periodDays: 5, max: 1 } },
  start: { post: { periodDays: 1, max: 1 }, fact: null, perfDigest: { periodDays: 4, max: 1 }, questionDigest: { periodDays: 3, max: 1 } },
  pro: { post: { periodDays: 1, max: 3 }, fact: null, perfDigest: { periodDays: 2, max: 1 }, questionDigest: { periodDays: 1, max: 1 } },
};

/** Hard ceiling on AI-suggested posts per day, applied on top of every tier (never exceeded). */
export const CONTENT_MAX_SUGGESTIONS_PER_DAY = 3;

/** Hard cap on AI-suggested post length (characters). Short beats long. */
export const CONTENT_MAX_POST_CHARS = 420;

/** Lookback window for owner-post performance analysis. */
export const CONTENT_PERF_LOOKBACK_DAYS = 7;

/** Tiers allowed to switch off the "built with @bot" footer on published AI posts. */
export const FOOTER_REMOVABLE_TIERS: PlanTier[] = ["pro"];

/** Owners processed by the content engine per hourly tick (bounds AI cost per run). */
export const CONTENT_OWNERS_PER_TICK = 25;

/** Default trial length for new owners (days). The DB default mirrors this. */
export const TRIAL_DAYS = 14;
