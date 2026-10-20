# Data audit — 19 October 2026

Provider: https://arena.rone.dev. The OpenAPI contract and hosted terms were retrieved during implementation. Public hero/catalog/statistics endpoints did not require player authentication. The hosted service is free with no availability guarantee. No player-facing authentication endpoints were called.

| Evidence | Observed result | Product treatment |
|---|---|---|
| Hero/catalog lists | 133 entries; hero 133 has different names across two endpoints | Canonical list name plus alias; release status remains unverified |
| Rank snapshots | Six supported rank filters, seven-day requested window, win/pick/ban rates | Preserve source filters; do not label lane-filtered rates lane-specific |
| Sample sizes/date | Not returned in rank records | Unknown; no confidence intervals or guaranteed freshness |
| Region/queue | Not specified in imported records | Do not label EU, global population, or solo-queue statistics |
| Version endpoint | `2.1.18`, old record timestamp | `patch: null`, `patchVerified: false` |
| Miya builds | Three core items per statistical build | Labeled core only, not a full purchase order |
| Miya recommended guide | Six-item community builds, guide patch `2.1.18` | Historical/unreviewed community content, not current recommended builds |
| Relationships | Directional strong/weak/assist IDs | Source-listed interactions; no numerical matchup advantage inferred |
| Raw records | Can include contributor metadata | Raw files excluded; normalized export omits contributor/user fields |

The environment blocked the bulk hero-detail fetch at the network-policy layer. No alternate route was used to bypass it. The resumable importer is included for an authorized development environment. The currently packaged detail/build coverage is one hero; the application supports the entire roster but does not claim complete reviewed content.

Before public publication, independently reconcile the current original-server roster and patch, validate provider statistics against source samples, review all builds/counters, and confirm asset-use permissions. The provider service terms and repository license are different documents.
