# Delivery progress

Updated: 2026-10-02. The original findings in DELIVERY-AUDIT.md are a historical
snapshot; this file tracks the implementation that followed that audit.

## Implemented and checked

- Immediate termination on lethal Chaser/projectile damage; no later same-step score.
- Full battle HUD/controls fit in tested mobile portrait and landscape dimensions.
- Options with 60–180 second duration, 1–10 second spawn interval, validation and persistence.
- Frozen full round configuration, including configurable spawn sequence/points/distance.
- Typed results, stable local player identity, last-result restoration and abandonment behavior.
- Axios + TanStack Query ranking/history, five-row paging, configuration matching and tie order.
- MSW confirmed record storage, idempotent writes, durable pending queue and manual recovery.
- Scenario selector/reset for latency, empty/paged data, HTTP/network errors and post-commit timeout.
- Native modal focus containment for pause/results; English labels/status messages.
- Actual browser keyboard and multi-touch combat checks, deterministic clock/fixtures in test builds.
- Six reviewed screenshot baselines: menu, arena and result on desktop/mobile Windows Chromium.
- Windows test preview startup/shutdown without manual process cleanup.
- README/architecture, setup instructions and Vercel/Netlify build configuration.

## Evidence

The full acceptance suite currently has 68 passing executions: 34 tests in two projects.
Twenty executions are direct simulation tests; 48 are browser tests. The browser
coverage includes controls, collision, damage, termination/replay, visibility handler,
asset failure/cancel/retry, audio, options, persistence, paging, outage, post-commit
recovery, response ordering and visual assertions. Visibility state is simulated in
headless Chromium, while touch input uses actual Chromium CDP touch events.

The HTML report is in evidence/playwright-report.html. Visual baseline PNGs are under
tests/e2e/visual.spec.ts-snapshots. Performance and Strict Mode evidence are recorded
separately when their scripts finish. Production has no test-driver global.

## Remaining publication steps

- Review development Strict Mode measurements.
- Include all source/evidence/baselines in the final Git revision.
- Publish to an authenticated hosting account and record the public URL.
- Smoke-test the deployed URL, service worker and persisted recovery flow.

## Rendering optimization follow-up

Retained health-bar/projectile geometry and reused membership sets reduce mean
render submission CPU time by approximately 40% in isolated 180-second comparisons.
Average FPS improved from 37.18 to 38.65; p95 frame interval remains 33.4 ms.
The headless renderer uses SwiftShader software rendering. The 60 FPS target is
unverified in those historical software-rendering runs. Post-GC heap growth was unexplained,
although DOM/listener counts stay bounded. See evidence/PERFORMANCE.md and the
separate profile-before.json, profile-after.json and memory-after.json reports.
Final verification on 2026-10-02: all 52 executions passed with one worker,
including six screenshots. The reviewed desktop arena baseline changed only
health-bar edge pixels. The HTML report in evidence/playwright-report.html was
refreshed. Build/type checking and lint passed; production contains no timing probe.

## Memory, gameplay and accessibility follow-up

The latest full suite passed all 64 executions. After increasing button focus-ring
opacity, six additional accessibility/visual executions passed on the final build.
Production build/type checking and lint passed; production has no battle test probe.
New coverage includes full 180-second browser combat, a dense 180-second simulation,
safe spawning, Chaser/Shooter island avoidance, keyboard modal focus and orientation.
Shooters no longer stop inside firing range when an island blocks the player.

Heap snapshots identified unresolved promises in unused MSW default sources retaining
service-worker messages. Terminating those defaults holds MessageEvent counts at 4
and Generator counts at 48 across 1/5/15 rounds. No abandoned Simulation is reachable
by the property-fingerprint check; DOM nodes/listeners remain constant. Total heap
still grows and native MessagePort counts need further attribution. See
evidence/FOLLOW-UP.md, heap-summary.json and heap-retainers.json for limits and evidence.
Physical Xiaomi Android acceptance is partial: the user confirmed that rotation
works after the touch adjustment. Remaining checks and device/browser identification
are pending; follow REAL-DEVICE-CHECK.md.

## Illustrated interface

Menu, Options, ranking/history and pause/result panels now use the supplied wood/gold
art. The battle HUD and round touch controls overlay the canvas. Live water, terrain,
decorations, sail colors, damage stages, enemy bars and projectile trails use the
supplied textures. Options supports plus/minus controls and saves on Main Menu.
The new full suite passed 68 executions; twelve reviewed desktop/mobile PNG baselines
cover six screens. The current HTML evidence report was refreshed. Production build
and lint passed, and production contains no battle test driver.
See VISUAL-DESIGN.md and evidence/ui/ for scope, reproduction and reviewed captures.

The isolated final three-minute hardware profile identified AMD Radeon Graphics
through ANGLE D3D11: 59.96 average FPS with the illustrated renderer, 16.7 ms p95
frame interval and timer completion.
See evidence/profile-gpu.json and evidence/PERFORMANCE.md. This covers the documented
four-second-spawn stationary stress fixture at 1280×720, not every device or setting.

## Scope and limitations

Latest changes, not yet validated: updated pause/result/ranking layouts, removal
of the floating utility panel, sound in Options, touch input release/sliding and
portrait insets, Controls/Network scenarios modal dialogs with scenario reset,
Last result access after refresh, and the player's overhead health bar restored.
The earlier 68 passing executions, HTML report, visual baselines and hardware
profile describe the previously validated revision. No tests, builds, lint or
profiling were run for these latest changes at the user's request. Update the
baselines and rerun the required checks before final acceptance.

All persistent mock data is browser-local, as required by this backend-free demo.
It is not a shared internet leaderboard. A user who clears browser storage loses the
local identity and records. Rivals are explicit fixtures. Native dialog focus is used;
no external accessibility certification is claimed. Visual baselines are platform-specific.
Circle hitboxes, tint-based damage and local enemy steering are intentional simplifications.
