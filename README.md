# MLBB Meta Bot

An English Mobile Legends companion for **Telegram Serverless**: bot commands, a React Mini App, source statistics, hero/build browsing, counter relationships, draft suggestions, favorites, and a reviewed-content publication workflow.

**Status: functional development beta, not a completed editorial meta product.** Deployed beta: [@mlbbmetabot](https://t.me/mlbbmetabot), with its [Mini App](https://app8208143805.tgcloud.ai/). Database migrations, command/menu configuration, webhook synchronization and cloud endpoint checks passed. Automated tests use a local SQLite/Bot API adapter; interactive Telegram device testing remains pending.

## Included data and honest limits

- 133 provider catalog entries, with lane assignments and directed matchup/synergy relationships.
- Six rank snapshots: all, Epic, Legend, Mythic, Honor, Glory; seven-day provider window.
- Item, spell and talent catalogs.
- Miya: imported skills, two three-item cores and two six-item community builds.
- No claimed current patch, no fabricated tiers, no invented matchup probabilities.

The bulk detail importer was blocked by the build environment's network policy after the shared catalogs/statistics were fetched. Therefore **132 heroes still need detailed build imports and review**. All 133 catalog entries still require original-server release reconciliation and editorial tier review. The source version endpoint returned `2.1.18`, which is not accepted as the current patch. Source statistics do not provide match counts, reliable observation timestamps, a region, or a solo-queue split in the imported records.

The app displays these gaps, distinguishes item cores from complete builds, retains each community build's listed patch, and keeps reviewed tier lists unranked until content is published. The rank filters are source filters; the lane filters are catalog positions, not lane-specific win rates.

## Local development

Use Node.js 22.13+ (Node 24 recommended) and Python 3.10+ for the optional data importer.

```bash
npm ci
npm run check
npm run dev
```

Open the Vite URL. Outside Telegram, the app uses the bundled snapshot and browser-local preferences. Publisher controls are unavailable in browser preview. Inside Telegram, it uses verified Serverless endpoints and SQLite preferences. No bot token is embedded in frontend code.

## Deploy to Telegram

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full staging and production checklist.

```bash
npx tgcloud login
npm run deploy
npx tgcloud migrate
```

Enable Serverless in BotFather first. Authenticate with the **Serverless CLI access token**, not the normal Bot API token. The CLI manages credentials in ignored `.tgcloud/`. Never commit credentials or paste them into issues.

After the first push, configure the exact returned Mini App URL in BotFather and `tgcloud/lib/config.js`; add your Telegram user ID to `ADMIN_IDS` for publisher access. `/whoami` reports your user ID. Rebuild/push after configuration changes. Code deployment does not apply migrations.

## Commands

| Command | Purpose |
|---|---|
| `/start` | Main menu |
| `/meta` | Rank-filtered source statistics |
| `/tier gold` | Reviewed lane tiers; also `all`, `exp`, `mid`, `jungle`, `roam` |
| `/hero Miya` | Hero profile; plain hero names also work |
| `/build Miya` | Imported/reviewed build library |
| `/counter Miya` | Source-listed counters |
| `/draft gold \| Miya, Saber \| Tigreal \| Fanny` | Role, enemies, allies, bans |
| `/favorites` | Saved heroes |
| `/settings mythic gold` | Set rank and lane |
| `/patch` | Patch verification status |
| `/privacy`, `/delete_me` | Data explanation and deletion |
| `/whoami` | Your Telegram user ID |

Interactive personal menus are private-chat only. Group commands can return read-only answers; group callbacks cannot edit another user's menu.

## Data import and editorial workflow

```bash
npm run data:fetch
npm run normalize
npm run check
```

The importer uses two bounded workers, pauses between requests, caches successful responses, and can resume after an interruption. Raw payloads stay in ignored `content/raw/`; only normalized non-personal game data is packaged. `python3 scripts/fetch-data.py --refresh` re-fetches cached endpoints. `--limit 5` imports a small hero subset for adapter verification. Do not use repeated refresh loops or run parallel importer processes.

The initial script imports a hero's first listed lane, two common cores, and up to two builds from one community guide. It does not claim every viable role is covered. Add reviewed role-specific alternatives through the snapshot workflow. Source changes should be reviewed before updating production.

1. Export the snapshot from **Data notes** or copy `content/snapshot.json`.
2. Assign a unique revision `id`. Verify `patch`, `patchSource` (HTTPS), `patchVerified`, and `reviewedBy`.
3. Add per-hero ratings with `lane`, `rank`, `patch`, `tier`, `reason`, `reviewer`, and `reviewed: true` only after real review.
4. Add full builds with six validated item IDs, spell/emblem/talents, explanation, source and reviewer. Add conditional swaps with `remove`, `add`, and `when`.
5. Open **Data notes** as an allowlisted publisher, upload/validate, then stage the revision. Staging changes no public content.
6. Load revisions and publish the intended one. The active revision comparison rejects stale concurrent publications. Restore a prior validated revision using the same control.

All readers consume one immutable snapshot. Imports are size-limited to 1.5 MB by this application, not by a claimed Telegram quota. For a larger dataset, migrate to indexed revision rows after verifying platform limits. Reviewed builds get basic structure/reference checks; **complete item-passive compatibility and patch-specific emblem legality still need a rule catalog and human review**.

## Project structure

- `src/`: responsive React/TypeScript Mini App.
- `tgcloud/handlers/`: Telegram message and callback handlers.
- `tgcloud/endpoints/`: platform-authenticated Mini App functions.
- `tgcloud/lib/domain.js`: shared search, tier, counter and draft logic.
- `tgcloud/lib/repository.js`: preferences, immutable revisions and publication CAS.
- `tgcloud/lib/validation.js`: input/content validation.
- `tgcloud/lib/snapshot.js`, `public/snapshot.json`: generated fallback snapshot.
- `content/snapshot.json`: readable editorial export.
- `scripts/`: reproducible import, normalization and runtime checks.
- `tests/`: domain behavior and SQLite-backed adapter tests.
- `docs/PLAN.md`: full intended product specification.

## Validation and remaining release gates

`npm run check` covers draft exclusions, conflicting picks, directed counters, insufficient evidence, invalid IDs, unsafe source links, access control, preference races, publish/rollback races, bot response bounds, and repeat-save callbacks. It also type-checks/builds the Mini App and verifies runtime imports.

Before public release:

- Complete the full roster/role/build review and patch verification.
- Smoke-test real Telegram SDK/database behavior on a staging bot.
- Verify Android, iOS and desktop layouts and deep links in Telegram. Browser visual QA was unavailable in the build environment.
- Confirm Telegram quotas, costs, retention and export/restore behavior.
- Add patch-specific build rules, reviewed counter mechanisms and gameplay tips.
- Measure latency and real bot rate-limit/retry behavior; outbound exactly-once delivery is not promised.
- Reconcile source ownership/asset terms before broader or commercial distribution. Use text/initial fallbacks if image permissions cannot be confirmed.

No scheduled data job, notification subscription or external CI deployment has been activated. The code needs no per-request AI API and no paid external database.

## Credits

Mobile Legends: Bang Bang, hero names, item names and game artwork belong to MOONTON. This is an independent fan project. Imported data: [Rone Arena](https://arena.rone.dev), maintained by ridwaanhall / RoneAI. Read [provider terms](docs/DATA-PROVIDER-TERMS.md) separately from its source-code license. Portraits are referenced from publisher URLs and are not included as copied binary assets.

### Editorial workspace

Open **Data notes → Hero review editor** in the browser preview or as a Telegram administrator. Choose a hero, enter the patch and reviewer, then add tier assessments scoped to rank and lane or edit six-item builds. Review checkboxes are explicit; imported entries stay unreviewed. Duplicate tier contexts are replaced by the editor and rejected by server validation. Changing heroes clears unsaved entry fields, so save an assessment/build before switching.

**Save on device** stores the working snapshot in this browser; **Restore saved draft** retrieves it. **Export JSON** creates a portable copy. Choose a new revision ID before **Prepare revision**. Only authenticated administrators can stage or publish, and publication still requires verified patch metadata. Browser preview preparation does not publish anything. Build spell/emblem/talent compatibility and situational swaps still require manual review; existing swaps survive build edits.

Draft advice now reports contradictory source matchup relationships without assigning a matchup bonus. Composition bonuses require known ally roles. Source relationships remain provisional, and hero-wide win rates are never treated as matchup probabilities.

The importer writes progress after each resource and replaces cache files atomically. Network/provider failures stop subsequent requests; cached files remain intact. Corrupt caches and incomplete catalog pages fail visibly. Limited build/guide queries are intentionally allowed to return a subset. No automatic pagination or retry bypass is attempted. Run `npm run test:importer` for offline failure-path tests (Python 3 required); it is included in `npm run check`.
