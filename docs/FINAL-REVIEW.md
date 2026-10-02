# Final requirements review

Review date: 2026-10-02. Specification: CHALLENGE.original.md. This reviews the
local working tree. The user subsequently confirmed that the public deployment
matches the layout changes and that gameplay on the Xiaomi is OK.

## Implementation and evidence

Final local suite: 78 passing executions (39 tests, desktop/mobile Chromium),
including 16 reviewed visual PNGs. Production/test builds, typecheck and lint
passed. The local production smoke completed a real round without the test clock.
Five development Strict Mode lifecycle cycles passed. The subsequent 100-cycle
memory review also checks native ports/streams/audio contexts and shared Pixi
texture listeners after fixing two additional retention mechanisms. Total heap
growth remains documented; see evidence/MEMORY-REVIEW.md. DELIVERY-STATUS.md links
the final profiling measurement and other artifacts.

The final isolated Radeon/D3D11 profile completed three minutes at 59.99 average
FPS and 16.7 ms p95 frame interval, with sampled maxima of 24 ships and 7 projectiles.
The full report is evidence/profile-gpu-final.json.

| Challenge area | Implementation and verification |
| --- | --- |
| Required stack | React menus/dialogs; strict TypeScript; Pixi arena, ships, effects and overhead bars; Axios requests; TanStack Query reads/mutations/cache; MSW browser REST handlers; Playwright browser and visual tests |
| Player and combat | Forward motion, rotation in both directions, frontal and three parallel lateral shots, separate cooldowns, limited health, typed balance configuration, arena/island collisions; combat.spec.ts and simulation.spec.ts |
| Enemies and spawning | Alternating Chaser/Shooter defaults, steering around islands, safe fixed spawn points, contact damage without points, ranged firing/damage; full/dense rounds and obstacle cases in simulation.spec.ts |
| Timer, pause and restart | Active-time duration 60–180 seconds, immediate lethal termination, frozen paused/ended simulation, focus/visibility pause, explicit resume and cleared held inputs, clean replay; combat/setup/accessibility tests |
| Screens and configuration | Play/Options, Controls guide, ranking/history tabs, validation and persistence, complete result and registration state, Last result after refresh; options/matches/delivery tests |
| Pixi lifecycle | Shared loaded textures, owned atlas views destroyed, retained entity graphics, cancelled async initialization, resize with uniform scale, capped pixel density; setup tests and strict-mode.json |
| Remote state and consistency | Typed result/configuration snapshots, deterministic configuration-aware ranking, pagination, stable player identity, durable pending queue and idempotent confirmation; matches tests |
| Network conditions | Selectable success/empty/pages/slow/variable/out-of-order/timeout/connection/HTTP/read-specific/post-commit/outage scenarios and reset; matches/delivery tests exercise read failure, latency, late responses and recovery without duplication |
| Interface and accessibility | Illustrated supplied assets, progress/error display, semantic HUD, accessible labels/status messages, keyboard focus containment/restoration, touch controls in both orientations; accessibility tests, reviewed PNGs and contrast.json |
| Visual regression | Versioned desktop/mobile baselines for menu, arena, result, Options, ranking, history and landscape arena/pause; visual.spec.ts |
| Performance and memory | Optimized real-time 180-second GPU fixture, per-minute frames/CPU/entity samples, five lifecycle counters and 1/5/15 heap snapshots; performance and memory reports under evidence/ |
| Production behavior | check-delivery.mjs starts a real uninstrumented round, checks direct load/refresh, service worker, both orientations, paused settings, completed-result persistence and both lists; production-smoke.json |
| Delivery | Lockfile/assets/fixtures/mocks/source/tests and English README/architecture included; public deployment and Xiaomi gameplay subsequently confirmed by the user |

## Fixes during this review

Landscape control placement inherited grid placement from the footer, putting
buttons outside the viewport. The landscape footer and controls now use explicit
positioning. The short-screen pause dialog had a clipped Main Menu action; its
frame, spacing and button heights now allow all three actions to fit. The network
selector has a distinct associated label. Tests were adapted to the new dialog
navigation and result headings; new cases cover both touch rotation directions,
simultaneous movement/fire, help focus/reset, API failure recovery and changes to
settings during pause without changing the running round.

The first-review failure traces are preserved under evidence/failure-traces.
The initial delivery audit and earlier profiling comparisons are historical;
consult DELIVERY-STATUS.md for final run results and current artifact names.

## Delivery confirmation

On 2026-10-02, the user confirmed that deployment matches the changes and that
mobile gameplay is OK. The older deployed-smoke.json records a historical failed
check before that update. Device model and browser/Android versions have not been
recorded. This functional confirmation does not certify TalkBack or phone FPS.
The subsequent memory cleanup changes must be committed/published with the final
revision; this review does not perform a deployment.

## Practical limits

The logical arena retains two circular islands. Matching the reference coastline
is not required by the specification. Narrow portrait mode shows the complete
arena at a smaller scale, with touch controls outside the combat area. Local enemy
steering is covered for the supplied map, not a general pathfinding guarantee for
future terrain. Confirmed and pending data are browser-local; rival entries are
fixtures, not other live players.

The GPU result covers a stationary, muted, extra-health stress fixture on the
documented desktop hardware; it is not a real-phone FPS certification. Memory
diagnostics investigate growth and check abandoned-world/MessageEvent retention;
they do not prove a flat heap or the absence of every native/browser resource leak.
Contrast evidence measures configured text/focus colors, not every pixel of the
illustrated artwork. Physical gameplay is user-confirmed; TalkBack is not recorded.

The requested estimate before starting the challenge is an administrative item;
its original communication cannot be established from source/test evidence.
