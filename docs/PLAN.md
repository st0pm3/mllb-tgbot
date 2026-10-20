# Mobile Legends Telegram bot — implementation plan

Prepared 19 October 2026. Status: proposed product and technical specification; no bot has been deployed. Working name: MLBB Meta.

## 1. Product decision

Build a fast ranked-play companion: answer “what should I pick, why, and what should I build?” during draft and before a match. Use Telegram chat for quick answers and a Telegram Mini App for visual browsing, lane tier lists, and team composition. Both surfaces use the same published content and recommendation logic.

Proposed defaults pending owner answers: English first, global original-server ranked play, solo queue emphasis, free public launch, hybrid bot and Mini App. Rank groups, region filters, and queue filters only appear where the source or reviewed content supports them. Advanced-server and professional-play information stay separately labeled.

All currently released original-server heroes belong in launch scope. A small hero set is acceptable for engineering validation, not for claiming a complete public product. The roster is imported and reconciled, never hardcoded to a remembered count.

## 2. Feature specification

| Feature | Required behavior | Completion condition |
|---|---|---|
| Meta overview | Current patch, strongest reviewed picks, bans to consider, movers, freshness | Every claim links to a published revision and supporting evidence |
| Overall tier list | S+, S, A, B, C, plus unranked; show recommended lane next to every hero | Every eligible hero appears once or has a visible pending-review status |
| Lane tier lists | EXP, Gold, Mid, Jungle, Roam | Heroes appear only in reviewed viable positions; multi-role heroes may differ by position |
| Hero directory | Search, aliases, roles, lanes, difficulty, favorites | All current released heroes resolve by canonical name and reviewed aliases |
| Hero guide | Strengths, weaknesses, power spikes, skill priority, combo notes, gameplay plan | Actionable summary with reviewed patch and provenance |
| Builds | Main build per recommended lane; spells, emblems, talents, purchase order, alternatives | Item and talent references are legal for that patch; explanations accompany swaps |
| Counterpicks | Best available answers to one enemy, constrained by your lane and pool | Explain mechanism, execution condition, and trade-off for each suggestion |
| Counterplay | What to do when already locked into a hero | Positioning, cooldown windows, objectives, item or spell responses |
| Draft assistant | Allied/enemy picks, bans, desired role, personal hero pool | Exclude unavailable heroes; return three recommendations with reasons and composition gaps |
| Patch digest | Hero/item changes and consequences for saved heroes/builds | Reviewed impact summary; last patch remains available |
| Preferences | Language, rank, preferred roles, favorite/owned/comfortable heroes | User-owned settings persist; clear/reset/delete controls exist |
| Editorial tools | Import, validate, review, publish, rollback, report handling | Draft content cannot silently become public |

## 3. User flows and interface

First use: select language, rank, and preferred lane; all are skippable. Show a compact home menu: Meta, Tier lists, Heroes, Counterpick, Draft, My pool. Display the active patch and last review date.

Commands: `/start`, `/meta`, `/tier`, `/hero`, `/build`, `/counter`, `/draft`, `/patch`, `/favorites`, `/settings`, `/help`, `/privacy`, `/delete_me`. Commands with missing arguments open buttons or search rather than return usage errors. `/hero ruby`, `/build ruby exp`, and `/counter fanny` illustrate syntax only; they are not current gameplay recommendations.

Hero flow: search → hero summary → Builds / Counters / Synergies / Tips / Sources. Keep chat messages short; use pagination and edit the current menu when appropriate. Favorites and “open full guide” remain easy to reach.

Counter flow: choose enemy → choose your role → optionally restrict to your pool → receive three picks → open “why”, build adjustments, or counterplay. If there is no reviewed answer in the pool, say so and offer broader candidates rather than fabricate an edge.

Draft flow: select your role and enter picks/bans in any order. Support unknown enemy roles, flex picks, undo, reset, and a freeform draft mode without enforcing an unverified tournament format. Never treat the recommendation score as a predicted match win probability.

Mini App tabs: Meta, Heroes, Draft, Saved. Tier lists use portraits plus searchable compact rows; selecting a hero opens a bottom sheet or details screen. Use accessible text labels, Telegram theme support, safe-area spacing, lazy-loaded assets, large touch targets, and a visible offline/stale state. Deep links open a specific hero, build, or tier view. Chat remains usable if the client cannot open the Mini App.

Later: inline sharing into groups, public share cards, personal notes, patch notifications, advanced comparisons. Notifications require explicit opt-in and a confirmed delivery runner; they are not a first-release dependency.

## 4. How meta and tiers are decided

The unit of judgment is hero + position + patch + supported player segment. Keep lane/position distinct from character class: Jungle and Roam are positions; Tank and Mage are classes.

Use two clearly distinguished outputs:

1. Reviewed meta tiers: an editor's documented judgment using verified statistics, patch impact, matchup coverage, reliability, and composition utility.
2. Statistics view: the source's actual win/pick/ban rates with rank, region when known, window, and retrieval time. This view does not pretend a high win rate proves universal strength.

Start with reviewed tiers. Only introduce an automated tier score after source semantics and coverage are verified. Experimental statistical scoring can combine within-segment normalized performance and draft presence, but weights and tier thresholds must be versioned and calibrated against held-out patches and expert review. Do not ship arbitrary weights as objective truth.

Where wins and match counts exist, shrink noisy win rates toward the segment baseline and display uncertainty. Where counts are absent, show “sample size unavailable”; do not invent confidence intervals. Pick/ban rates supply context, not independent proof of power. Do not pool incompatible patches or rank groups, and do not derive lane win rates from hero-wide data.

Tier meanings:

- S+: exceptional priority with few practical weaknesses in this segment.
- S: consistently strong recommended choice.
- A: reliable and viable, with identifiable conditions.
- B: useful situational pick or more execution-dependent option.
- C: narrower or disadvantaged choice in the reviewed context.
- Unranked: insufficient current evidence, new hero, or review pending.

Overall means general draft priority within the selected segment. Assign each hero an explicit reviewed overall tier and show its strongest recommended position; do not average lane letters. The editor considers flexibility, blind-pick safety, and dependence on teammates. Solo queue and coordinated-team judgments stay distinct if both are offered.

Confidence is evidence quality, not “chance to win”: high/medium/low based on freshness, coverage, provenance, and reviewer agreement. If confidence is editorial, label it editorial. Publish reasons for meaningful tier moves and retain the previous revision.

## 5. Counterpick and draft engine

Store directed relationships: candidate hero versus enemy hero, by position and patch. “A counters B” does not automatically imply “B loses every matchup to A.” Separate lane pressure, teamfight interaction, draft response, and item counterplay.

Each relationship includes mechanism, strength category, prerequisites, danger points, game stage, source/reviewer, and review date. Distinguish mechanic-based expert advice from measured matchup outcomes. Never attach a matchup percentage to editorial advice.

Recommendation pipeline:

1. Validate picks, bans, lane assignments, patch, and pool; reject duplicates and impossible states.
2. Remove picked/banned heroes and candidates outside supported roles or an explicitly restricted pool.
3. Rank candidates using reviewed role strength, enemy interactions, allied synergy, composition needs, and player comfort.
4. Penalize unresolved threats, excessive execution difficulty for the selected preference, and composition holes.
5. Return three different practical options with “why it fits”, “main risk”, and “recommended build”.

Initial tunable ranking proposal, not an empirically validated formula: 30% role meta, 30% enemy interactions, 20% composition fit, 10% allied synergy, 10% comfort. Normalize supported components; unknown relationships remain unknown rather than silently neutral. Require minimum evidence before publishing a strong counter claim. Expose the score only as internal recommendation strength, preferably show reasons to users instead.

Composition tags include frontline, initiation, peel, physical/magic damage, sustained/burst damage, wave clear, objective pressure, mobility, and crowd control. A tag-based system is a recommendation aid, not a combat simulator. Partial drafts show conditional advice and update when role assignments become clearer.

## 6. Build model for every hero

Every reviewed hero-position profile needs a default build. Add a second build only when there is a meaningful alternative, such as a different role or play pattern. Do not manufacture three nearly identical builds to satisfy a quota.

Each build stores:

- Ordered six-item end build, starting purchases, core item sequence, boots and applicable role-specific blessing/enchantment.
- Emblem setup, talent selections, battle spell, skill priority, and the reason the build fits this role.
- Conditional swaps against healing, burst, sustained damage, heavy control, tank-heavy teams, or other relevant threats.
- Exact replacement slot, purchase timing, and trade-off for every swap.
- Ahead/behind and late-game guidance where reviewed, with any mutually exclusive choices flagged.
- Patch/revision, author/reviewer, evidence type, and source references.

Validate six occupied final slots, valid IDs, duplicate/unique-passive restrictions where applicable, role/spell compatibility, and emblem legality against a patch-specific rule catalog. Avoid hardcoding rules that can change with patches. Mark popularity-derived builds “commonly used”; reserve “recommended” for editorial review. Item changes create review tasks for every dependent build.

## 7. Data sourcing and maintenance

Verified during planning: the official MLBB site exposes hero, ranking, and news pages, but the retrieved ranking page did not provide usable structured records. A community-maintained candidate, Rone Arena, documents hero analytics and other endpoints. Neither a production feed nor a current complete roster/build dataset has been validated in this planning stage.

Source priority:

1. Official game/patch information for factual changes and roster confirmation.
2. A permitted, documented statistics provider, checked against official/in-game samples.
3. Original editorial guides and reviewer-approved matchup/build advice.
4. Professional-play evidence as a separately labeled perspective, not silently mixed into ranked data.

The first engineering milestone audits provider freshness, actual fields, sample sizes, rank mapping, region coverage, historical windows, authentication, rate limits, attribution, asset permissions, and availability. Review provider hosting terms separately from repository code licenses. If unavailable, ship a manually reviewed published snapshot with honest dates; automated feeds are replaceable adapters.

Never require a player's MLBB password or account connection for these features. Preferred rank and hero pool can be user-entered.

Content pipeline: retrieve/import → normalize stable IDs → validate → stage revision → compare differences → editor review → publish. Store source ID/URL, fetch time, observed time, patch, segment, reviewer, and algorithm version. Store small relevant evidence records; avoid retaining unnecessary large raw payloads.

Publication uses immutable revisions and one active-revision pointer. Upload all rows for a revision, validate completeness, mark it ready, then switch the pointer with a conditional single-row update. Readers use one revision throughout each request. Concurrent publishers must detect a revision conflict. Rollback selects the prior validated revision; partial imports never appear publicly.

Refresh targets: statistics daily if the provider permits; patch checks daily and after announced releases; editorial review on patch changes. These are operating targets, not claimed freshness guarantees. Initial refresh is an admin action. Telegram's reviewed documentation does not establish native cron for this plan, so scheduled imports require a separately verified runner or external CI schedule using a supported import path. Mini App endpoints must not be treated as unauthenticated cron webhooks.

On a new patch, mark affected advice pending review immediately; keep last-reviewed advice accessible with its old patch label. A daily-feed snapshot older than 48 hours receives a stale badge by default. Do not turn a recent fetch of old data into a “fresh” claim. Missing or failed sources preserve the last good revision.

## 8. Telegram Serverless architecture

Verified platform fit: JavaScript handlers and shared modules, built-in SQLite, SDK HTTP/Bot API access, and hosted static Mini Apps with authenticated endpoints. Runtime code cannot rely on arbitrary npm packages or filesystem access. Foreign keys are unsupported; application validation must enforce references. CLI access uses a separate token; code deployment and migrations are separate. The documentation reviewed does not settle production quotas, pricing, scheduling, or backup guarantees. Confirm these before public scaling.

Proposed implementation:

| Layer | Choice |
|---|---|
| Bot runtime | Plain JavaScript ES modules with JSDoc types and the Telegram SDK |
| Mini App | React + TypeScript + Vite, compiled to static files |
| Domain logic | Shared pure JavaScript modules for tier, build, counter, and draft behavior |
| Database | Telegram SQLite; indexed reads, short writes, application-level integrity checks |
| Data import | Provider adapters and validated JSON import; first operated by an admin |
| Tests/tooling | Local Node tooling; runtime modules themselves stay dependency-free |

Frontend packages are build-time dependencies; do not import them into deployed backend modules. No Redis, separate API server, or external database is required for the initial design.

Module plan: `tgcloud/schema.js`; handlers `message.js`, `callback_query.js`, later `inline_query.js`; libraries for catalog, search, tierlists, builds, counter scoring, draft scoring, permissions, rendering, validation, and imports. Endpoints: `getMeta`, `listHeroes`, `getHero`, `getTierList`, `getBuild`, `getCounters`, `recommendDraft`, `getPreferences`, `savePreferences`, `saveFavorite`, plus explicitly restricted editorial operations. Frontend assets build into `dist/`.

Every response carries revision ID, patch, freshness, and evidence status. Chat and Mini App format the same domain response rather than reimplementing rules. Use fixed allowlisted provider addresses, bounded payloads, pagination, and cached published snapshots; no external provider call on the ordinary read path.

## 9. Data schema

| Entity group | Key fields and constraints |
|---|---|
| Catalog | heroes, hero_aliases, hero_positions, items, emblems, talents, spells; stable source-independent IDs |
| Patches | patch ID, original/advanced server, release date, verified source |
| Revisions | revision ID, patch, state, parent, reviewer, publication time, validation result |
| Evidence | source ID, URL, timestamps, type, segment, reference to content |
| Statistics | hero, optional position, rank, optional region, window, rates, nullable counts, revision |
| Ratings | hero, position or overall, segment, tier, reason, confidence, revision |
| Builds | hero, position, ordered items, spell/emblems/talents, conditional swaps, revision |
| Relationships | candidate, target, type, position, strength, conditions, explanation, revision |
| Users | Telegram user ID, language, preferences; no unnecessary profile fields |
| Saved content | user ID + hero/build ID uniqueness; references can identify an older revision |
| Draft sessions | owner, picks, bans, state version, expiry; optimistic concurrency |
| Operations | import jobs, publish audit, processed updates, feedback, optional notification outbox |

Use indexes for revision + segment + position, hero lookup, user ownership, and unique source keys. Validate all cross-record references because database foreign-key cascades cannot be assumed. Use bounded retention and cleanup for sessions, logs, and deduplication records. Preserve published snapshots and exportable editorial content within the confirmed storage budget.

## 10. Administration, reliability, and privacy

Editors see roster/build/counter coverage, stale content, patch-impact tasks, import errors, and user reports. An owner can appoint editors; only publishers switch the active revision. Authorize by verified Telegram user ID on the server, never by frontend button visibility or a submitted username.

Validate all endpoint inputs and callback actions. Derive ownership from verified Telegram identity. Group draft callbacks must verify who owns the session. Escape message markup, bind SQL parameters, cap input sizes, and avoid logging tokens or private message bodies.

Handle duplicate updates with idempotent state changes and unique operation keys; use an outbox where outbound retries matter. Do not promise exactly-once message delivery. Acknowledge callback taps promptly, handle expired buttons, and honor Telegram retry hints without long sleeps in an invocation. Backend read paths should remain fast when a data provider is down.

Provide `/privacy` and `/delete_me`, list the limited stored preferences, and delete the user's sessions, favorites, and optional subscriptions. Proposed operational retention: draft sessions 24 hours, routine diagnostic records 7 days, aggregate usage counts 30 days, configurable after capacity review.

Use a separate staging bot. Before production migrations, export content and verify the available recovery path; maintain source-controlled schemas and editorial export files. Use additive schema changes first, then compatible code, then deferred cleanup. Code rollback does not automatically undo data migrations.

Observe request latency, errors, source freshness, unsupported searches, empty recommendation results, coverage, and import failures. Avoid collecting full conversations for analytics. Cost planning must separate Telegram platform terms, any paid data provider, optional scheduler, and editorial work. No fixed “free forever” claim is justified yet; per-request AI is unnecessary for launch.

## 11. Build sequence and acceptance gates

| Milestone | Deliverable | Gate before proceeding |
|---|---|---|
| 0. Decisions and data proof | Confirm language/UI, audit one data source, inventory current roster and patch | Fields, terms, freshness, gaps, and manual fallback documented |
| 1. Vertical slice | `/start`, search, one hero page/build/counter, shared logic, staging schema | End-to-end Telegram interaction works with clearly labeled test content |
| 2. Content engine | Import validation, revisions, editorial review, publication and rollback | Interrupted import cannot affect active content; invalid references rejected |
| 3. Full roster | All heroes, reviewed recommended positions, builds, counterplay, tiers | Coverage dashboard satisfies public-launch rules |
| 4. Mini App | Meta, heroes, six tier views, search, favorites, responsive layouts | Core flows work on Android, iOS, and desktop Telegram |
| 5. Draft recommendations | Picks/bans, pool filtering, composition scoring, explanations | Banned/picked heroes never recommended; unknown evidence handled honestly |
| 6. Beta and release | User feedback, source outage handling, deployment guide, recovery rehearsal | No critical data or permission issues; content owner signs off |
| 7. Optional growth | Scheduled imports, opt-in notifications, sharing, pro-play mode | Runner, capacity, terms, and new source coverage verified |

Effort should be estimated after milestone 0. The likely critical path is reviewing content for every hero, not writing menu handlers. Engineering can advance with fixture data while reviewers populate content, but fixtures must never be labeled current production meta.

Public-launch content gate: 100% of the verified released roster searchable; every hero has at least one reviewed viable-position build and usable counterplay; all six tier views exist; every tiered hero has a rationale and evidence status; all active item/talent/spell references resolve. Target three supported counter options per hero where justified; otherwise explicitly show limited evidence. Any pending new-hero review is visible and prevents a claim of fully reviewed coverage.

Meaningful tests: scoring exclusions, asymmetric counters, unknown matchups, incomplete drafts, build legality, import failure midway, publish races, unauthorized edits, stale patches, duplicate updates, expired callbacks, deletion ownership, and provider outage fallback. Exercise real Serverless SDK integration on the staging bot; the CLI's remote run can execute side effects and is not an offline simulator.

Performance target: typical published-data response under one second server-side and no more than three taps to a saved hero's build. These are targets to measure on the deployed platform, not guaranteed platform characteristics.

## 12. Decisions needed before implementation

1. Launch language(s): English, Ukrainian, Russian, or another combination? Which language should hero/item names use?
2. Approve the recommended hybrid bot + Mini App, or start with chat-only and add the Mini App later?
3. Main audience: rank range, region, and solo queue versus coordinated team? Default proposal: global solo queue with supported rank filters.
4. Content ownership and budget: who can review builds/counters each patch, and should data sources remain free-only? Default: curated content, replaceable free source, manual publish.

Bot name and visual branding can be chosen after these decisions. A deployment credential is not needed to begin local implementation. When staging is ready, the owner enables Serverless in BotFather and authenticates through the CLI's secure local flow; never paste tokens into this specification or the repository.

## Sources and verification limits

- Telegram Serverless: https://core.telegram.org/bots/serverless — primary documentation; its Markdown version was retrieved directly. https://core.telegram.org/bots/serverless.md
- Telegram Mini Apps: https://core.telegram.org/bots/webapps — client integration and Serverless endpoint calls.
- Telegram Bot API: https://core.telegram.org/bots/api — chat, callback, and inline API reference.
- Official MLBB hero/ranking/news entry points: https://www.mobilelegends.com/en/hero ; https://www.mobilelegends.com/en/rank ; https://www.mobilelegends.com/en/news/ — usable structured data and current patch contents still need validation.
- Rone Arena maintainer documentation: https://github.com/ridwaanhall/rone-arena-api — unofficial candidate provider; https://arena.rone.dev/api/docs ; https://arena.rone.dev/api/openapi.json — endpoint contract and hosted-service terms must be audited before adoption.

This document defines the product and implementation process. It does not assert a verified October 2026 hero tier list, fabricate current builds, or claim a tested production data integration.
