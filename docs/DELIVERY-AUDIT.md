# Delivery audit

This is the initial historical audit. See [current delivery progress](DELIVERY-STATUS.md)
for fixes, completed features and up-to-date evidence.

Audit date: 2026-10-01. Source of requirements: [original challenge](CHALLENGE.original.md).
This report assesses the current working tree, including untracked implementation files.
It is not a grade estimate or a claim that passing the current tests completes the challenge.

## Assessment

The project has a playable local battle and a substantial React/PixiJS foundation.
It is not ready for submission: options, persisted results, ranking/history APIs,
network scenarios, complete acceptance tests, profiling and public deployment remain.
Audio in the menu and battle is implemented but does not replace any of those requirements.

| Evaluation area | Weight | Current assessment |
| --- | ---: | --- |
| Gameplay and enemy behavior | 35 | Core rules implemented; edge cases and acceptance coverage remain |
| PixiJS and architecture | 20 | Separation, rendering, loading and cleanup implemented; broader lifecycle evidence remains |
| Interface, feedback and accessibility | 15 | Playable UI; options/data screens missing; landscape/focus checks remain |
| TanStack Query, Axios and data consistency | 10 | Infrastructure only; no feature queries or mutations |
| MSW and failure scenarios | 5 | Worker and status endpoint only |
| Playwright | 10 | Useful initial suite; required browser/visual coverage incomplete |
| Performance and documentation | 5 | Setup/architecture documented; profiling and final delivery docs missing |

## Implemented foundation

- React, strict TypeScript, Vite and PixiJS are used in the running application.
- Simulation, input, renderer, UI and audio have separate modules.
- Player forward movement, rotation, frontal shot and three-round parallel broadsides.
- Health, damage, weapon cooldowns, projectile lifetime and removal.
- Water, two blocking islands, arena limits, player/enemy projectile targeting.
- Chaser pursuit/contact damage and Shooter approach/ranged fire; alternating distant spawns.
- One point per enemy killed by player fire; Chaser self-destruction does not award points.
- Timer/death result, clean round construction, manual pause and automatic focus/visibility pause.
- Explicit Resume; input clears during pause and on focus loss.
- Pixi ships, projectiles, effects and health bars; semantic React HUD updated at about 10 Hz.
- Fixed 60 Hz simulation steps; proportional canvas sizing and initial pixel-density cap of 2.
- Texture reuse, visible loading, retry on image failure and cleanup on unmount.
- Menu tabs/control guide, keyboard controls and independent pointer controls.
- Damage tint, muzzle/impact/destruction sprites and battle/menu audio with persistent mute.
- Readable English code/UI/docs, supplied artwork and asset provenance.
- Build, lint, type checking, Playwright HTML reporting and failure traces are configured.

## Requirement gaps and acceptance criteria

| Area | Status | Work needed to close it |
| --- | --- | --- |
| Player/combat | Implemented with defect | Fix same-step scoring after lethal player damage; prove all firing/collision cases through actual browser controls |
| Enemy behavior | Implemented, partially verified | Exercise Shooter firing/damage, island avoidance and safe spawning over full rounds; verify no stuck enemies |
| Configuration | Partial | Most numeric parameters are typed, but spawn positions/distribution and safe distance remain embedded in simulation logic |
| Options | Missing | Enable Options; validate session time 60–180 seconds and documented positive spawn bounds; save/load settings; snapshot settings at round start |
| Match result | Partial | Current overlay shows score, elapsed seconds and ending reason, plus replay/menu; create a complete typed result and real registration status |
| Persistence | Missing except mute | Persist player options and last completed result; restore result access after refresh; abandon without recording unfinished rounds |
| Ranking | Placeholder | Player identification, same-settings grouping, deterministic ties, fixtures, ordered paginated API and UI |
| Match History | Placeholder | Paginated player history with date, score, actual duration, reason and used settings; registration endpoint |
| HTTP/query state | Infrastructure only | Use Axios and TanStack Query in actual feature requests/mutations; loading/empty/error/refresh states; cache keys, invalidation, retries and stale-response protection |
| Reliable registration | Missing | Unique match IDs, idempotent submission, durable pending queue, retry after refresh/failure and continued play while submissions are pending |
| Mock backend | Infrastructure only | Typed shared contracts/fixtures/handlers; persistent confirmed records consistent between ranking and history |
| Network scenarios | Missing | Success, empty/multiple pages, slow/variable/out-of-order responses, timeout, connection/4xx/5xx failures, independent read failures, post-commit timeout and outage/recovery; scenario selector/reset |
| Mobile | Partial | Pointer handlers and full arena scaling exist; fix landscape fit and verify simultaneous real touch, pointer cancellation and orientation changes |
| Accessibility | Partial | Labels, focus styles and semantic HUD exist; validate full keyboard flow and screen reader status; decide/manage pause/result focus boundaries deliberately |
| Effects/art | Basic implementation | Tint-based deterioration and supplied ship/effect sprites exist; richer damage artwork and island/sea detail are polish, not substitutes for missing features |
| Pixi lifecycle | Implemented, partially verified | Exercise exit/restart during async loading, hidden-tab loading, repeated initialization failures and development Strict Mode; production tests do not reproduce Strict Mode effect replay |
| Simulation clock | Partial assurance | Fixed steps exist, but a 100 ms frame-delta cap discards additional elapsed time; document/test behavior under long frames and different frame rates |
| Visual regression | Missing | Commit stable menu, arena and result baselines for required desktop/mobile projects |
| Profiling | Missing | Optimized 180-second battle: FPS, p95 frame interval and entity counts; memory over five start/play/exit cycles; hardware/browser/resolution/settings and limits |
| Deployment | Missing | Public HTTPS URL for final source; verify direct load/refresh, assets, worker, persistent mock data and recovery scenarios |
| Submission artifacts | Partial | Include all source/lockfile/assets/contracts/fixtures/tests, visual baselines, test/profiling evidence and final documentation |

Configuration evidence: `src/features/game/model/config.ts` and the `spawn()` method
in `src/features/game/model/simulation.ts`. Data evidence: ranking/history panels are
static placeholders; `src/app/mocks/handlers.ts` defines only `/api/status`.

## Confirmed issues from this audit

### Lethal damage can be followed by a score in the same step

In `Simulation.step()`, Chaser contact can reduce player health below zero, but the
remaining enemy/projectile processing still runs before `status` becomes `ended`.
A controlled reproduction with player health 1, an overlapping Chaser and an already
flying player projectile killing a 20-health Shooter produced health 0 and score 1.
The `point-scored` event occurred while player health was -24 and status was `playing`.
End the round at lethal damage and verify that later systems in that step cannot
move, shoot, damage or change the score. Add a regression covering the actual rule.

### Landscape battle needs scrolling to reach the full control area

Browser measurements on the production build:

| Viewport | Page height | Control area bottom | Fits without scrolling |
| --- | ---: | ---: | --- |
| 393 x 851 | 851 | 839 | Yes |
| 851 x 393 | 407 | 395.44 | No |
| 320 x 568 | 568 | 556 | Yes |

The project documents support for both mobile orientations. Adjust the short-screen
layout so the arena, HUD and action controls remain simultaneously usable; validate
actual touch interaction and orientation changes in addition to viewport dimensions.

### Test-server shutdown needs an unattended Windows check

All assertions passed, but Playwright waited during preview-server teardown in this
environment. Stopping only the preview process launched by this run allowed the
runner to finish with exit code 0. Resolve or document the environment-specific
shutdown behavior before claiming clean unattended execution from a fresh checkout.

### Delivery files are not all tracked yet

At audit time, implementation files under game, audio and some tests were untracked.
Include them in the final source revision. `playwright-report/` and `test-results/`
are intentionally ignored: deliver reports through explicit artifacts or another
documented channel. Local files alone will not be present in a clean checkout.

## Test evidence and coverage limits

Executed during this audit:

- `npm.cmd run build`: passed, including application/tooling/test type checks.
- `npm.cmd run lint`: passed without diagnostics.
- `npx.cmd playwright test --workers=2`: 22 passed, exit code 0 after preview cleanup.
- Additional read-only simulation reproduction and browser layout measurements above.

The 22 executions comprise 11 unique tests run in two projects:
5 browser tests per project (10 executions) and 6 direct simulation tests per project
(12 executions). Running a direct simulation test in the mobile project does not
exercise mobile rendering or touchscreen input. Current audio browser tests use
keyboard controls, including in the mobile-emulation project.

| Required E2E item | Current coverage | Still needed |
| --- | --- | --- |
| 1. Options/navigation/persistence | Menu navigation only | Options form, validation, save and refresh |
| 2. Assets/failure/retry | Browser tests implemented | Broader cancellation/load-state edge cases |
| 3. Movement/rotation/bounds/islands | Direct simulation; audio observes movement | Browser controls with position/collision assertions |
| 4. Weapons/damage/cooldown/scoring | Direct simulation; browser fire/audio | Browser combat assertions for each weapon, damage and duplicate score prevention |
| 5. Chaser/Shooter/spawn | Direct spawn/contact checks | Browser pursuit, Shooter fire and safe timed spawns |
| 6. End/freeze/restart | Direct simulation checks and repeated screen mounts | Browser time/death results, no post-end activity, Play Again reset |
| 7. Pause/focus/resume | Browser manual pause and dispatched blur | Real visibility change and held-input/cooldown behavior on resume |
| 8. Result/refresh | Missing | Completed result display and restoration |
| 9. Abandon/repeated visits/touch | Browser repeated visits | Multi-touch movement plus firing, cancellation, abandonment once APIs exist |
| 10. Ranking/history queries | Missing | Paging, loading, empty/error states and background refresh |
| 11. Register/recover pending | Missing | Cross-tab data refresh and durable retry |
| 12. Timeout/idempotency/stale responses | Missing | Confirmed write with lost response, duplicate retries and response ordering |

Add deterministic browser scenarios and a controllable simulation clock that preserve
real input and collision rules. The current world is deterministic without randomness,
but no explicit browser scenario/seed/clock tooling exists. There are no screenshot
assertions or versioned visual baselines. No performance claims have been measured.

## Completion order

1. Fix lethal-step termination and mobile landscape layout; add regressions.
2. Implement Options, validation, persistence and a complete immutable round config.
3. Define player/match contracts and persist the completed result without recording abandonment.
4. Implement MSW storage/endpoints and Axios/TanStack Query ranking/history UI together.
5. Add idempotent registration, pending submissions, all network scenarios and recovery tests.
6. Finish browser combat/touch/visibility/Strict Mode checks and accessibility; add visual baselines.
7. Profile optimized 180-second rounds and five lifecycle cycles; address measured issues.
8. Finalize English README/architecture, artifact delivery and tracked source; validate fresh setup.
9. Publish the final build and validate the public URL and production mocks.

Track the requested delivery estimate separately; this working tree does not establish
whether a deadline estimate was already communicated to the evaluator. No new engine,
UI library, backend service or additional artwork is required to close the core gaps.
