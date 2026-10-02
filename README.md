# Pirate Battle

A single-player naval shooter built with React, strict TypeScript and PixiJS 8.

## Setup

Use Node.js 24 LTS and npm. No private backend, database or API keys are required.

```sh
npm ci
npx playwright install chromium
npm run dev
```

On Windows PowerShell with restricted script execution, use `npm.cmd` / `npx.cmd`.
MSW runs in development and published builds. Serve over HTTPS or localhost;
`public/mockServiceWorker.js` must be accessible at the origin root.

## Environment variables

The application requires no environment variables or .env file for development,
tests or production. Axios uses same-origin `/api` URLs handled by MSW.
Optional variables below configure local profiling tools only:

| Variable | Default | Purpose |
| --- | --- | --- |
| PROFILE_GPU | unset | Set to 1 to request Windows D3D11 hardware rendering; aborts if a software renderer is detected |
| PROFILE_LABEL | profile | Name for the frame/CPU profiling report |
| MEMORY_CYCLES | 100 | Positive integer number of start/exit cycles |
| MEMORY_AUDIO | unset | Set to 1 to enable audio in the memory repeat; otherwise audio is muted |
| MEMORY_LABEL | heap | Folder/report prefix for memory evidence |
| MEMORY_PORT | 4175 | Preview server port for memory profiling |

For a PowerShell audio-enabled memory repeat:

```powershell
npm.cmd run build:test
$env:MEMORY_AUDIO = '1'
$env:MEMORY_CYCLES = '30'
$env:MEMORY_LABEL = 'heap-audio'
node scripts/memory-snapshots.mjs
```

These values remain in the current terminal session. Open a new terminal to
return to the defaults.

## Play

- W / up: move forward. A/D or left/right: turn.
- Space: frontal cannon. Q/E: three parallel port/starboard cannonballs.
- Escape or Pause: pause. Resume requires an explicit action.
- Hold independent touch buttons to steer and fire simultaneously.
- Losing focus or hiding the page pauses combat and clears held controls.
- Sound on/off is shared by menu and battle and persists across refresh.
- Desktop and mobile portrait/landscape are supported; the logical arena is 960 x 600.

Chasers pursue and explode on contact; Shooters approach and fire at range.
Player kills award one point. Contact self-destruction awards none. The round ends
at zero hull or the time limit. Leaving or refreshing active combat abandons it.
Completed results remain accessible through Last result after refresh.

## Options and balance

Options saves Game session time (whole seconds, 60–180) and Enemy spawn time
(1–10 seconds). Default settings are 90 seconds and a 4-second spawn interval.
Invalid saved settings fall back safely. Each new round receives a frozen snapshot.
Other balance values, spawn points, sequence and safe distance are centralized in
`src/shared/game/config.ts`. Ship hitboxes and islands use circles. Damage visuals
use progressively damaged sail/wreck sprites; explosions use supplied sprites.
Local enemy steering avoids islands. Player and enemy overhead bars show remaining
health; the player also has a semantic HUD indicator.

## Ranking, history and registration

Ranking compares complete configuration snapshots, sorts score descending, then
completion timestamp and match ID ascending. History lists the current player's
matches newest first. Both lists have five records per page. Rival fixtures provide
initial ranking entries for the default configuration. The player has a stable local
UUID and the display name Captain. All records include the configuration used.

Axios performs requests, TanStack Query owns query/mutation state, and MSW implements
the REST endpoints. Completed matches enter a durable pending queue before submission.
Retry registration resends the same IDs; confirmed writes are idempotent. You can
start another match while records are pending. Failed requests never block combat.

Browser storage is the persistence boundary. Clearing site data resets local identity,
options and records. Without writable storage, a status message explains that results
are limited to the current visit; durable offline recovery requires working storage.

## Network demo and reproducing failures

Select Network scenarios below the main menu tabs, then choose a scenario in the
illustrated dialog. It affects match APIs only. Controls opens
the keyboard and touch guide; Last result appears after a completed battle and
provides registration recovery after refresh. Sound is configured in Options.
Reset demo data clears confirmed/pending matches and the last result, restores the
success scenario and refreshes query caches. Options, audio preference and player
identity are retained. Pages uses labeled demo history plus rival fixtures.

| Scenario | Behavior |
| --- | --- |
| success | 100 ms response delay and normal records |
| empty | No fixture records; genuine confirmed records remain |
| pages | Multiple pages of deterministic demo records |
| slow | 1800 ms latency |
| variable | Repeating 200/1400/450 ms latency sequence |
| out-of-order | Alternating 1800/100 ms snapshots; cancelled reads cannot overwrite current data |
| timeout | 6000 ms response versus the Axios 5000 ms timeout |
| connection | Network error |
| http-400 / http-500 | Reproducible HTTP errors |
| ranking-error / history-error | Failure restricted to the selected read endpoint |
| post-commit-timeout | Write persists, then response is delayed past the client timeout |
| outage | Read/write unavailability until another scenario is selected |

To reproduce durable recovery: select post-commit-timeout, finish a match, wait for
the failure message, refresh, switch to success and retry registration. History
must contain exactly one copy of that match. For an unavailable service, follow the
same steps using outage. The current automated tests cover both core data/UI paths.

## Commands and tests

| Command | Purpose |
| --- | --- |
| npm run dev | Local development with Strict Mode |
| npm run build | Type check and production build in dist |
| npm run preview | Serve production output |
| npm run lint | Oxlint |
| npm run typecheck | Check app, tools and tests |
| npm run build:test | Optimized test build in dist-test |
| npm run test:e2e | Build test bundle and run desktop/mobile Chromium tests |
| npm run test:e2e:ui | Interactive Playwright runner |
| npm run test:report | Open latest HTML report |
| npm run profile | Build and run the three-minute profiling scenario |
| npm run profile:memory | Build and check 100 post-GC lifecycle cycles and retaining paths |
| npm run mocks:init | Regenerate the browser worker |

Build before production preview with `npm run build`, then `npm run preview`.
Run `npm run build:test` before `npm run test:e2e:ui`; `npm run test:e2e`
already creates that test build automatically.

Production builds do not include the `window.__battle` test driver. Test builds
expose deterministic starting fixtures, a read-only snapshot and fixed-step clock
control. Inputs, combat rules, rendering and network flows remain real. Browser tests
include actual keyboard and CDP multi-touch input; simulation unit tests are separate
cases even though Playwright runs them. Tests start their own preview on port 4173.
The profiling script uses port 4175. Keep these ports free.

Visual baselines live beside visual.spec.ts and currently target Windows Chromium.
Run `npm run build:test` before reviewing differences and updating with
`npx playwright test visual --update-snapshots`.
Other operating systems need separately reviewed platform baselines. HTML reports are
in playwright-report; failure screenshots/traces in test-results. These generated
folders are ignored; publish them as delivery artifacts, not application assets.

## Architecture and assets

See ARCHITECTURE.md for boundaries and persistence. docs/CHALLENGE.original.md is the
original specification; docs/DELIVERY-AUDIT.md records the initial audit and subsequent
progress. docs/ASSETS.md records supplied asset provenance. src/features/game/README.md
lists implementation modules. Profiling evidence is under docs/evidence.
See docs/evidence/PERFORMANCE.md for the measured rendering optimization, CPU
timings, before/after results and remaining hardware/memory validation limits.
Run `npm run profile:memory` to capture 100 lifecycle cycles and retaining paths.
The latest MSW/Pixi cleanup findings are in docs/evidence/MEMORY-REVIEW.md.
Raw snapshots stay local in docs/evidence/heap; compact summaries are delivery artifacts.
The Xiaomi Android acceptance procedure is in docs/REAL-DEVICE-CHECK.md.
See docs/VISUAL-DESIGN.md for the illustrated interface and reviewed screen captures.
The final requirement review is in docs/FINAL-REVIEW.md. Current accepted checks and
remaining publication steps are recorded at the top of docs/DELIVERY-STATUS.md.
The final GPU fixture measured 59.99 average FPS and 16.7 ms p95 frame interval;
see docs/evidence/profile-gpu-final.json for the environment and entity samples.

## Deployment

Production command: `npm run build`; static output: `dist`. The project includes
Vercel/Netlify settings. Do not publish dist-test. No environment variables are needed.
Verify loading/refresh, service worker startup, Options persistence and match recovery
on the public URL. Public deployment: https://desafio-game.vercel.app/.
The user confirmed on 2026-10-02 that this deployment matches the layout changes
and that gameplay on Xiaomi Android is OK. The older deployed-smoke.json records
the version before that update. Subsequent memory cleanup changes must also be
committed and published with the final revision.

`node scripts/check-delivery.mjs` checks the production build locally, including a
real round without the test probe. After deploying, run
`node scripts/check-delivery.mjs https://desafio-game.vercel.app/` to verify the
published controls, service worker, persistent results and matching asset hashes.
It uses an isolated browser profile and records results under docs/evidence.
