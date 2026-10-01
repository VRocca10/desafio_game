# Delivery progress

Updated: 2026-10-01. The original findings in DELIVERY-AUDIT.md are a historical
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

The full acceptance suite currently has 52 passing executions: 26 tests in two projects.
Fourteen executions are direct simulation tests; 38 are browser tests. The browser
coverage includes controls, collision, damage, termination/replay, visibility handler,
asset failure/cancel/retry, audio, options, persistence, paging, outage, post-commit
recovery, response ordering and visual assertions. Visibility state is simulated in
headless Chromium, while touch input uses actual Chromium CDP touch events.

The HTML report is in evidence/playwright-report.html. Visual baseline PNGs are under
tests/e2e/visual.spec.ts-snapshots. Performance and Strict Mode evidence are recorded
separately when their scripts finish. Production has no test-driver global.

## Remaining publication steps

- Finish and review profiling and development Strict Mode measurements.
- Confirm clean production build and stripped test instrumentation.
- Include all source/evidence/baselines in the final Git revision.
- Publish to an authenticated hosting account and record the public URL.
- Smoke-test the deployed URL, service worker and persisted recovery flow.

## Scope and limitations

All persistent mock data is browser-local, as required by this backend-free demo.
It is not a shared internet leaderboard. A user who clears browser storage loses the
local identity and records. Rivals are explicit fixtures. Native dialog focus is used;
no external accessibility certification is claimed. Visual baselines are platform-specific.
Circle hitboxes, tint-based damage and local enemy steering are intentional simplifications.
