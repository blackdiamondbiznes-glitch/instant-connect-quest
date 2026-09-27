# KabinetAI — Full Build Specification

You are building **KabinetAI**, a multi-tenant Telegram bot + web Mini App
platform. Read this entire document before writing any code. It describes
the complete product: data model, user flows, screens, AI features,
payments, security rules, and a list of known pitfalls to avoid. Follow it
exactly — do not simplify, skip, or "improve" any section without asking.
Where a decision is explicitly left open (marked **[CONFIGURABLE]**), make
it a config value, not a hardcoded one, so it can be tuned later without a
code change.

---

## 1. What this product is (read this first)

Most Telegram professionals — sellers, tutors, doctors, psychologists,
coaches, real-estate agents, delivery coordinators — run their business
through a plain Telegram chat with no real tooling: no way to see who
paid, who owes money, who went inactive, or what people are actually
asking about.

**KabinetAI is not "a bot." It is a single, self-configuring engine that
builds a different, tailored business cabinet for each professional**,
based on a short guided setup conversation. A seller and a psychologist
using the same platform get completely different-looking cabinets, in
their own vocabulary, with their own relevant modules — from the same
underlying engine.

The single most important design rule, repeated throughout this document:
**never expose a toggle, module, or feature in the UI that doesn't have a
real, working screen behind it.** A feature that exists in the backend but
has no UI is worse than no feature at all — it looks broken and destroys
trust. Every module the onboarding wizard offers must be fully usable the
moment it's turned on.

---

## 2. Users and roles

- **Owner** — a Telegram professional who sets up the bot for their
  channel/group/personal use. Has a personal cabinet (Mini App).
- **End-customer** — someone interacting with an Owner's channel/group or
  buying from an Owner's shop bot flow. Never sees the Owner's cabinet.
- **Platform admin** — runs the whole platform: sees all Owners, manages
  subscription status, sees aggregate stats. Access via a separate web
  admin panel, not via Telegram.

---

## 3. Data model

Design as relational tables (Postgres or equivalent). Names below are
suggestions — keep the *relationships and constraints*, naming can adapt
to your platform's conventions.

**owners** (one row per Telegram professional)
`telegram_id` (PK, bigint), `first_name`, `username`, `display_name`
(nullable, owner-editable custom cabinet name — see §6.6), `language`
(uz/ru/en), `onboarding_step` (lang → niche → workspace → modules →
ready), `niche` (string, references niche catalog in §5), `workspace_type`
(public_channel / private_channel / public_group / private_group /
personal), `modules` (string array), `cabinet_token` (unique UUID, used as
the Mini App URL secret — regenerable), `plan_status` (trial / active /
expired), `trial_ends_at`, `subscription_ends_at`, `is_demo` (bool),
`analysis_day` + `analysis_runs` (for AI rate limiting, see §8.4),
timestamps.

**chats** — one row per Telegram chat (group/channel) the bot has been
added to as admin. `chat_id` (PK), `owner_id` (FK), `title`, `chat_type`.

**messages** — every non-command message seen in an owner's connected
chats. `chat_id`, `message_id` (unique together), `owner_id`, `from_name`,
`text`, `kind` (`member_message` / `owner_post` / `channel_post` /
`service`), `is_question` (bool, regex-prefiltered), `created_at`.
**Critical:** channel posts, anonymous/sender_chat posts, and service
events (new member, pinned message, etc.) must NEVER be classified as
`member_message` — only real messages from real non-owner members count
for AI analysis. Getting this classification wrong silently corrupts every
downstream AI feature.

**members** — the owner's contact list (customers/students/patients/etc,
depending on niche). `owner_id`, `name`, `phone`, `tg_user_id` (nullable,
unique with owner_id — set when the contact is a known Telegram user, e.g.
a paying subscriber), `status` (niche-specific, see §5), `amount`
(numeric), `note`, `created_at`.

**records** — everything that isn't a "person" (orders, appointments,
stock items, waybills, listings — depends on niche). `owner_id`, `title`,
`client`, `status`, `amount`, `due_date`, `data_type` (`record` /
`booking` / `stock` / `waybill`), `created_at`. Reusing one table for all
of these (distinguished by `data_type`) keeps the schema simple — do not
create a separate table per niche.

**insights** — one row per AI sentiment-analysis run. `owner_id`,
`positive`/`neutral`/`negative` (integers summing to exactly 100),
`topics` (JSON array of `{topic, count, sentiment}`), `positive_drivers` /
`negative_drivers` (string arrays, max 5 each), `summary` (2 sentences),
`message_count`, `created_at`.

**question_clusters** — one row per distinct "meaning" of question asked
by members. `owner_id`, `question` (canonical rephrasing), `ask_count`,
`sources` (JSON array of `{chat_id, message_id, from, text}` — the
original messages that map to this cluster), `answer` (nullable),
`answered_at`, `created_at`.

**reminders** — `owner_id`, `chat_id` (nullable = all connected chats),
`text`, `send_at`, `repeat` (none/daily/weekly), `active`, `last_sent_at`.

**broadcasts** — history log. `owner_id`, `text`, `sent`, `failed`,
`created_at`.

**vip_settings** — one row per owner offering paid access.
`owner_id` (PK), `chat_id`, `price`, `days`, and payment-provider
credentials (see §9) — **secret keys must be write-only fields: the API
never returns a stored secret's value back to the client, only whether it
is set.**

**vip_orders** — one row per purchase attempt. `owner_id`, `tg_user_id`,
`amount`, `days`, `status` (pending/paid/cancelled), `provider`, provider
transaction fields for reconciliation (see §9).

**vip_subs** — active/expired subscriptions. `owner_id`, `tg_user_id`,
`chat_id`, `ends_at`, `status`, `notified_at` (for the 3-day-before-expiry
warning, see §9.3).

**bot_customers** — lightweight state for people who are NOT owners but
are interacting with an owner's shop/VIP purchase flow in the bot's
private chat. `tg_user_id` (PK), `owner_id`, `mode`, `pending` (JSON
scratch state for a multi-step flow like "pick item → send phone number").

**user_roles** — platform admin role assignment, separate from the
Telegram-based owner accounts (admins log in via a normal web
auth/email, not Telegram).

Apply row-level security (or equivalent) so that direct client access
(bypassing your server logic) can only ever read data belonging to the
authenticated caller; all writes must go through server-side functions
that re-verify ownership on every call (see §7).

---

## 4. Bot onboarding flow (the most important user journey)

Trigger: `/start` in a private chat with the bot.

**Step 1 — Language.** Show a 3-button choice: 🇺🇿 O'zbekcha / 🇷🇺
Русский / 🇬🇧 English. Every subsequent bot message and every Mini App
label must be rendered in the chosen language — never hardcode a single
language anywhere in owner-facing text.

**Step 2 — Niche.** Show the niche catalog from §5 as a vertical button
list, each with an emoji + localized name.

**Step 3 — Workspace type.** public_channel / private_channel /
public_group / private_group / personal — vertical button list.

**Step 4 — Modules.** Show the niche's default module set as a toggleable
checklist (tap to check/uncheck, "✅ Done" button to finish). Always also
offer `reminders`, `broadcast`, and both AI modules (`ai_pulse`, `ai_faq`)
regardless of niche, since every professional can benefit from them.

**Step 5 — Cabinet ready.** Generate the `cabinet_token`, show a "🎉 Your
cabinet is ready" message with a Mini App button (`web_app` button, not a
plain link — plain HTTPS links opened from inside Telegram can hit
platform restrictions on some hosts) plus an instruction: *"Add the bot to
your group/channel as **admin** to start AI analysis of member mood and
questions."*

**Navigation requirements (do not skip — this was a real gap in an
earlier build of this exact product):**
- Every step (2, 3, 4) must have a **"⬅️ Back"** button that returns to
  the previous step **without discarding already-chosen answers** for
  other steps.
- From inside the cabinet (a Settings/Features area), provide a
  **"Reconfigure niche/workspace"** action that deep-links the owner back
  into the bot chat at the niche-selection step (`t.me/<bot>?start=redo`),
  so an owner who picked the wrong niche doesn't have to guess whether
  `/start` will wipe their data. Clearly state in the confirmation message
  what is and isn't affected by reconfiguring.
- `/cabinet` — re-sends the Mini App button (only if onboarding is
  complete).
- `/cabinet_reset` — rotates `cabinet_token` (invalidates the old Mini App
  link) and sends the new one. Use this if a link may have leaked.

**Group/channel connection:** when the bot's membership status changes in
any chat (added as admin/member, or removed), update the `chats` table
accordingly and notify the owner in their private chat which chat just
connected/disconnected.

---

## 5. Niche & module catalog

Ship with exactly these **10 fully-supported niches** (this is the MVP
scope — chosen as the most Telegram-active professions in Uzbekistan; do
not silently expand this list without being asked):

| Niche | Emoji | Members list = | Member statuses | Records list = | Record statuses |
|---|---|---|---|---|---|
| Retail seller | 🛍 | Customers | regular/debtor/inactive | Orders | new/shipped/delivered/returned |
| Online tutor | 🎓 | Students | paid/debtor/inactive | Lessons/groups | scheduled/done/cancelled |
| VIP paid channel (trading/crypto) | 💎 | Subscribers | active/expiring/expired | Signals | open/profit/loss |
| Beauty salon/master | 💅 | Clients | regular/new/lost | Appointments | booked/done/no_show |
| Fitness coach | 🏋️ | Clients | paid/debtor/inactive | Programs | active/completed/paused |
| Doctor | 🩺 | Patients | prepaid/debtor/inactive | Appointments | booked/done/no_show |
| Psychologist | 🧠 | Clients | active/debtor/paused | Sessions | booked/done/no_show |
| Real estate agent | 🏠 | Leads | hot/warm/cold | Listings | available/reserved/sold |
| Delivery/logistics | 🚚 | Shops | paid/debtor/inactive | Waybills | loaded/on_way/delivered/returned |
| Education center | 🎓 | Students | paid/debtor/inactive | Groups | active/full/finished |

Plus a fallback **"Other"** niche (basic payments/debts/broadcast/
reminders only) for anyone who doesn't fit the 10 — this fallback must
still fully work, just with fewer defaults.

**Module system rules:**
- Every module maps to exactly one of: a data type (`member`, `record`,
  `booking`, `stock`, `waybill`, `subscription`, `insight`) with a fixed
  set of allowed statuses, OR "no data" (e.g. `reminders`, `broadcast` —
  these are actions, not lists).
- Two modules with the *same* underlying data type and *same* status set
  must render as filter pills inside ONE list screen, never as two
  separate tabs. (This was a real bug in an earlier build: "Payment
  tracking", "Debtors", and "All contacts" ended up as three tabs all
  reading the exact same table.)
- `ai_pulse` (sentiment) and `ai_faq` (question clustering) are two
  **independently toggleable** modules. Do not let one implicitly enable
  or display the other's output — if an owner enables only `ai_pulse`,
  they must never see the FAQ/question-cluster widget, and vice versa.
- A module that has no working screen must not appear as a toggle option.
  If you build a module's data model before its UI, hide it from the
  onboarding wizard and the Features screen until the UI ships.

---

## 6. The Cabinet (Mini App)

**6.1 Structure.** A single-page app opened via the bot's `web_app`
button, authenticated by the `cabinet_token` in the URL **plus** Telegram
WebApp `initData` (see §7.1 — never trust the token alone for writes).

**6.2 Bottom navigation — keep it short.** Target **no more than 5 tabs**
regardless of niche: Home/Dashboard, Contacts (all member-type modules
merged, filterable), Records (all record-type modules merged,
filterable), AI (only shown if any AI module is enabled), Features/
Settings. Do not let the tab count scale with the number of enabled
modules — modules become *filters inside* the Contacts/Records screens,
not new top-level tabs.

**6.3 Active-tab indicator.** The active tab must be visually unmistakable
at a glance — a filled background pill and a distinct icon color, not
merely a text-color change (a subtle color-only difference is easy to
miss on a small phone screen and was a real usability complaint on an
earlier build).

**6.4 Dashboard/Home.** Small stat cards (count per enabled data-list,
tap to jump to that list), a total-amount card, a total-debt card (sum of
members whose status is a "bad"-toned status), a mood summary card (if
`ai_pulse` enabled and data exists), and a "connected chats" list.

**6.5 List screens (Contacts / Records).** A row of status filter pills
("All" + each status for the modules currently enabled), an "Add" button,
tap a row to edit, swipe/tap a trash icon to delete. Add/Edit is a modal
form with fields appropriate to the data type (name/phone for a member,
title/client/due-date for a record), an amount field, and status buttons
colored by tone (good=green, bad=red, warn=yellow, neutral=gray).

**6.6 Owner display name.** Add an editable "display name" field (in
Settings/Features), stored on the owner record, shown in the cabinet
header instead of the generic niche label when set. Without this, every
owner in the same niche sees an identical generic header (e.g. every
"Other" niche owner sees literally "Other field" with no way to
personalize it) — confusing for anyone managing more than one cabinet.

**6.7 Features/Settings screen.** Toggle modules on/off (mirrors the
onboarding step 4, usable any time after setup). Also lives here: the
Reminders manager, Broadcast composer, VIP/payment settings form, and the
"Reconfigure niche/workspace" deep-link button from §4. **These three
screens (Reminders, Broadcast, VIP settings) are not optional polish —
build them in the same phase as the toggle for their module, not later.**
Do not ship a toggle for a screen you haven't built yet.

**6.8 AI tab.** Shows: current mood % bar + trend-over-time chart + topic
list + positive/negative drivers (only if `ai_pulse` on); a "Top
questions" list with tap-to-expand source messages and an answer box that
sends the reply to everyone whose question matched that cluster, plus an
"Answered (FAQ)" history section (only if `ai_faq` on); an "Analyze now"
button subject to the rate limit in §8.4; the AI Content Engine's
suggestion feed (§8.5, if that module is on).

**6.9 Localization.** Every string in the cabinet and bot must exist in
all 3 languages from day one — do not ship English-only or Uzbek-only
strings anywhere, including error/toast messages.

---

## 7. Security (non-negotiable — implement exactly this way)

**7.1 Mini App authentication.** Every read uses the `cabinet_token`
(shown to demo/read-only viewers). Every **write** must additionally
verify Telegram's WebApp `initData`: recompute the HMAC-SHA256 over the
sorted `key=value` pairs (excluding `hash`) using a secret derived from
`HMAC-SHA256("WebAppData", bot_token)`, compare against the provided
`hash` in constant time, reject if the `auth_date` is older than 24
hours, and confirm the `user.id` inside `initData` matches the owner that
`cabinet_token` resolves to. **Fail closed**: if `initData` is missing,
malformed, expired, or mismatched, reject the write — never fall back to
trusting the token alone for a mutation.

**7.2 Demo accounts.** Seed a few `is_demo = true` owner rows (one per
niche) with realistic sample data, so `/` and `/demo` can show a live,
interactive cabinet with no login required. Demo accounts are **read-only
at the API level, not just hidden in the UI** — every mutation endpoint
must explicitly check `is_demo` and refuse before doing anything else.

**7.3 Plan gating.** Every mutation and every AI call must check
`plan_status`/`trial_ends_at`/`subscription_ends_at` and refuse (with a
clear "plan expired, renew to continue" response) once expired. Reads
still work when expired — only writes and AI calls are blocked.

**7.4 Ownership checks on every write.** Every update/delete must filter
by the row's `owner_id = <verified owner>` — never trust a client-supplied
ID alone. This applies especially to the "answer this question cluster
and send to the source chats" action: verify every source `chat_id`
belongs to that owner's connected chats before sending anything, or a
malicious client could make the bot send arbitrary messages into chats it
doesn't own.

**7.5 Webhook authentication.** The Telegram webhook endpoint must verify
a secret token header (Telegram's `secret_token` mechanism) using
constant-time comparison before processing any update.

**7.6 Platform admin.** Never auto-grant admin on visiting the admin
panel. Grant admin only via: (a) a verified email on a server-side
allow-list, or (b) a one-time setup secret, and only if no admin exists
yet — guard the "first admin" bootstrap with a database-level lock so two
simultaneous requests can't both become the first admin.

**7.7 Secrets.** Payment-provider secret keys (and any other credential)
are write-only from the client's perspective: the read API returns only
"is this secret set: yes/no", never the value. `.env`/service-role
credentials must never be committed to source control.

---

## 8. AI features

**8.1 Message classification (prerequisite for all AI features).** Only
messages classified as `member_message` (see §3) ever get analyzed. Never
feed channel posts, service events, or the owner's own posts into member
sentiment/question analysis.

**8.2 Sentiment & Topic Pulse (`ai_pulse`).** Periodically (on-demand, via
the "Analyze now" button, subject to §8.4's limit) send the last ~7 days
of member messages to an LLM and get back: positive/neutral/negative
percentages (must be forced to sum to exactly 100 server-side — don't
trust the model's raw output to add up), up to 8 ranked topics with a
sentiment tag each, up to 5 positive and 5 negative "drivers" (short
phrases), and a 2-sentence summary — all written in the owner's chosen
language. Store each run as a new row so a trend chart can be shown over
time.

**8.3 Question Clustering (`ai_faq`).** From the same message batch, ask
the model to group only messages that are *questions with the same
underlying meaning* into clusters (one canonical rephrasing per cluster,
every matching message's chat_id/message_id/text kept as `sources`, at
most ~15 clusters, ranked by size). When the owner submits an answer for a
cluster, send that exact answer, as a reply, to every source message —
after verifying every source belongs to a chat this owner actually owns
(see §7.4). Mark the cluster answered; keep it visible in an "Answered
(FAQ)" history list. On the next analysis run, only replace *unanswered*
clusters — never overwrite an already-answered cluster's row.

**8.4 Rate limiting.** Cap manual "Analyze now" runs per owner per day
**[CONFIGURABLE, suggested: 3/day]**. Implement this as an atomic
"consume a slot" operation (increment-and-check in one transaction) keyed
by owner + day, not a naive read-then-write, to avoid race conditions
under concurrent requests. If the AI provider call fails, surface a
specific reason to the owner (rate-limited by provider / out of credits /
generic error) rather than a generic failure.

**8.5 AI Content Engine — proactive suggestions (new flagship feature).**
This turns the AI from "answers when asked" into "proactively helps run
the channel." Build it as its own module (separate from `ai_pulse`/
`ai_faq`), gated the same way.

- *Post-performance analysis*: look at the owner's own posts from the
  last 3–7 days in their connected chat(s); score engagement using
  whichever signals are actually available — view counts (channels only),
  reaction counts, and reply/comment counts (channels with a linked
  discussion group, or groups directly). **Be explicit in the product
  copy about the limitation**: a channel with no reactions enabled and no
  linked discussion group has very little signal, and the owner should be
  told to enable reactions for better results rather than silently
  getting a low-quality result.
- *Content suggestions*: using the niche's context plus the
  performance analysis, propose next posts — niche-relevant stats,
  facts, or short historical/trivia items. Enforce, regardless of plan:
  a hard cap on post length (short beats long even when interesting —
  don't let the model write long posts), and a hard cap on suggestions
  per day even on the top plan **[CONFIGURABLE, suggested: never more
  than 2–3/day]** — the goal is to help, not to spam the audience into
  tuning out.
- *Delivery*: suggested posts appear in the owner's cabinet for one-tap
  approve-and-publish; auto-publish without review is opt-in only, never
  the default.
- *Cadence by plan* **[CONFIGURABLE — use these as a starting point]**:
  - Free: 1 suggested post/week, 1 stats/fact item/week, question digest
    every 5 days.
  - Start: 1 suggested post/day, performance digest every 4 days,
    question digest every 3 days.
  - Pro: 2–3 suggested posts/day, performance digest every 2 days,
    question digest daily.
  Implement the cadence as the same kind of atomic per-owner counter used
  in §8.4, not a second, differently-built mechanism.
- *Referral footer*: when — and only when — an AI-suggested post is
  actually published, append a small unobtrusive line such as "🤖 built
  with @<bot_username>". Never add this to posts the owner wrote
  themselves, nor to reminders/broadcasts/notifications — only to
  published AI-suggested content, or it reads as spam. Let Pro-tier (or
  higher) owners disable this footer (white-label upsell).

---

## 9. Payments (VIP paid access)

Support Uzbekistan's two major providers. Implement both protocols
exactly as specified by each provider (do not improvise the handshake):

**9.1 Click** — a single webhook endpoint handling `action=0` (prepare)
and `action=1` (complete). Verify the request signature (MD5 hash of the
documented field concatenation with the merchant's secret key) in
constant time before trusting anything in the payload. Reject amount
mismatches. Make completion idempotent (a repeated `action=1` for an
already-paid order must return the "already paid" response, not process
twice).

**9.2 Payme** — a JSON-RPC endpoint per owner, HTTP Basic-authenticated
with `Paycom:<owner's payme_key>` (constant-time compare). Implement all
required methods: `CheckPerformTransaction`, `CreateTransaction`,
`PerformTransaction`, `CancelTransaction`, `CheckTransaction`,
`GetStatement` — following Payme's exact state-machine and error-code
semantics (state 1 = created, 2 = performed, -1/-2 = cancelled before/
after performing). Enforce the transaction timeout window before
allowing `PerformTransaction` to succeed.

**9.3 Fulfillment (shared by both providers).** On successful payment:
mark the order paid exactly once (guard with a conditional update so a
retried webhook can't double-fulfill), extend the subscriber's access
window (stacking on top of remaining time if they already had an active
subscription, not resetting it), upsert their `members` row, generate a
one-time-use Telegram invite link and send it to the buyer, and notify the
owner. A background job should run roughly hourly to: warn subscribers
whose access expires within 3 days (once, tracked via `notified_at`), and
remove (ban then immediately unban, so they can rejoin after paying
again) subscribers whose access has fully expired.

**9.4 Buyer-side bot flow** (people who are not owners): a `/start
shop_<ownerId>` or `/start vip_<ownerId>` deep link starts a short guided
purchase flow (pick item → share phone number → order recorded; or see
VIP price → tap a payment link). This flow is separate from the owner
onboarding flow in §4 and must never touch or require the owner's own
account.

---

## 10. Platform admin panel

A separate web view (not inside the Telegram Mini App) for the platform
operator: list of all non-demo owners with niche/plan status/connected
chats, aggregate stats (total/active/trial/expired counts, niche
distribution, total messages processed, total question clusters), and an
action to extend/set-trial/expire any owner's subscription manually
(for manual invoicing before automated billing exists). Gate entirely
behind the admin-role check in §7.6.

---

## 11. Known pitfalls — do not repeat these

This list comes from a real prior build of this exact product. Do not
reintroduce any of these:

1. Backend function exists for a feature (reminders, broadcast, VIP
   settings) but no screen calls it — the module toggle exists with
   nothing behind it. **Every module must ship UI and backend together.**
2. Two AI modules sharing one underlying analysis pass end up displaying
   together even when only one is enabled. **Gate each module's UI
   independently of what the analysis pass happens to produce.**
3. Bottom navigation growing to 6–7 tabs because each module got its own
   tab instead of becoming a filter inside a shared list screen.
4. No way to tell which bottom tab is currently active beyond a subtle
   text-color change.
5. No editable per-owner display name, so every owner in the same niche
   has an identical, unpersonalizable header.
6. No "back" button anywhere in the onboarding conversation, and no way
   to reconfigure niche/workspace from inside the cabinet without
   blindly resending `/start` and hoping nothing important resets.
7. Channel posts or service events (pinned message, member joined, etc.)
   miscounted as member messages, corrupting sentiment/question data.
8. Trusting the Mini App's URL token alone for a write, without also
   verifying Telegram's `initData` — this lets anyone who obtains a
   cabinet link (not just the owner) modify that owner's data.
9. A module selectable in onboarding with no real implementation behind
   it at all (e.g. a "private notes" toggle that opens nothing).

---

## 12. Build order (do not reorder)

1. Data model + core security (initData verification, ownership checks,
   webhook secret check, admin bootstrap) — nothing else matters if this
   is wrong.
2. Bot onboarding flow end-to-end, including Back navigation and
   reconfigure deep link.
3. Cabinet: Dashboard, Contacts, Records (merged, filter-pill based), per
   §5/§6 — this is the core product.
4. Reminders, Broadcast, VIP settings screens — ship these alongside
   their module toggles, not after.
5. AI sentiment + question clustering (`ai_pulse`/`ai_faq`), correctly
   gated per §8.1–8.4.
6. Payments (Click + Payme) + VIP fulfillment/expiry job.
7. AI Content Engine (§8.5) — proactive suggestions, plan-based cadence,
   referral footer.
8. Platform admin panel.

Do not start step 7 before steps 1–6 are solid — the content engine
reuses the same rate-limiting and ownership patterns; building it early
means rebuilding it once those patterns exist.
