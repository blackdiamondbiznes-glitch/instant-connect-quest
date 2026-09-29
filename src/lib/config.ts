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

/** Civil calendar and appointment times for owners in Uzbekistan (no DST). */
export const OWNER_TZ = "Asia/Tashkent";
export const OWNER_TZ_OFFSET = "+05:00";

/** YYYY-MM-DD in OWNER_TZ. */
export const civilDate = (d: Date = new Date()) => d.toLocaleDateString("en-CA", { timeZone: OWNER_TZ });

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Instant of an appointment. Missing time defaults to noon Tashkent (24h reminder still works; 2h is skipped). */
export function appointmentAt(dueDate: string, dueTime: string | null | undefined): Date {
  const time = dueTime && TIME_RE.test(dueTime) ? dueTime : "12:00";
  return new Date(`${dueDate}T${time}:00${OWNER_TZ_OFFSET}`);
}

export const hasClockTime = (dueTime: string | null | undefined) => !!dueTime && TIME_RE.test(dueTime);

/** Client self-booking: how many civil days ahead. Clock times come from the owner's hours. */
export const BOOKING_DAYS = 3;
/** Fallback grid only when the owner has no valid hours saved. */
export const BOOKING_SLOTS = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"];

export const DEFAULT_OPEN = "09:00";
export const DEFAULT_CLOSE = "19:00";
export const SLOT_MINUTES = [30, 60, 90] as const;
export const DEFAULT_SLOT_MINUTES = 60;

/** Unpaid booking deposits hold the slot for this long, then the slot is freed. */
export const DEPOSIT_HOLD_MINUTES = 30;

/** Salons one Telegram account may own. */
export const MAX_SALONS = 5;

/** What the owner pays KabinetAI for 30 days, in UZS. */
export const PLAN_PERIOD_DAYS = 30;
export const PLAN_PRICE_UZS: Record<"start" | "pro", number> = { start: 99000, pro: 249000 };

/** Weekday of a civil date in OWNER_TZ. 0 = Sunday. */
export function civilWeekday(iso: string): number {
  return new Date(`${iso}T12:00:00${OWNER_TZ_OFFSET}`).getUTCDay();
}

/** Clock times from open (inclusive) to close (exclusive of a slot that would end after close). */
export function clockSlots(open: string, close: string, step: number): string[] {
  if (!TIME_RE.test(open) || !TIME_RE.test(close) || !SLOT_MINUTES.includes(step as (typeof SLOT_MINUTES)[number])) return [];
  const to = (t: string) => { const [h, m] = t.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); };
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const a = to(open), b = to(close);
  if (b <= a) return [];
  const out: string[] = [];
  for (let t = a; t + step <= b && out.length < 24; t += step) out.push(fmt(t));
  return out;
}

/** Add days to a YYYY-MM-DD civil date. */
export function addCivilDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}
