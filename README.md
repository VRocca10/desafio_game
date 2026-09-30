# Pirate Battle

React, strict TypeScript and PixiJS naval game challenge.

## UI styling

Tailwind CSS v4 runs through the Vite plugin. shadcn/ui components live in
`src/shared/components/ui`, with shared class merging in `src/shared/lib/utils.ts`.
The `@/` import alias points to `src`. Theme tokens are in `src/app/styles.css`.

Add components as screens need them:

```sh
npx shadcn@latest add dialog tabs input label
```

Use Tailwind and shadcn/ui for the React interface. PixiJS renders the game arena.

## Feature organization

- `src/app`: application composition, providers, global styles and MSW setup.
- `src/features/main-menu`: menu layout, navigation, actions and control guide.
- `src/features/ranking`: leaderboard panel (currently a placeholder).
- `src/features/match-history`: history panel (currently a placeholder).
- `src/features/game`: documented boundaries for the future game implementation.
- `src/shared`: reusable UI primitives, HTTP client and utilities.

Import features through their `index.ts`. The application composes features;
features do not import each other's internals. Keep feature-specific components,
hooks, API calls, contracts and mock handlers beside their feature as they are added.
Create Options and Results features when implementing those flows.

## Status

The main menu uses the supplied scenery, title and panel artwork, with accessible
Harbor, Ranking and Match History tabs and an expandable control guide.
Play and Options are disabled until their flows are implemented. Ranking and history
show explicit placeholders. PixiJS is installed; gameplay, data flows, network
scenarios, visual baselines and profiling remain pending.

## Requirements and setup

Use Node.js 24 LTS (validated with 24.18.0) and npm.

```sh
npm ci
npx playwright install chromium
npm run dev
```

No environment variables, backend, database or private services are required.
MSW starts in development and production. Axios and TanStack Query are configured
for upcoming ranking/history requests. The initial /api/status handler remains
available, but the main menu does not make infrastructure-check requests.

## Commands

| Command | Purpose |
| --- | --- |
| npm run dev | Start development server |
| npm run build | Check types and build into dist |
| npm run preview | Serve the production build locally |
| npm run lint | Run Oxlint |
| npm run typecheck | Check application, tooling and test types |
| npm run test:e2e | Build and run Chromium desktop/mobile tests |
| npm run test:e2e:ui | Build and open Playwright test UI |
| npm run test:report | Open the HTML test report |
| npm run mocks:init | Regenerate the MSW browser worker |

Playwright runs against the production preview on port 4173. Reports are generated
in playwright-report; failure traces and screenshots go into test-results.
Each test uses an isolated browser context.
The initial smoke test still targets the former setup screen; update its assertions
when test work resumes. Tests were not run for the new menu.

## Assets and documentation

- public/assets: supplied sprites, UI atlases (standard/retina), tiles and WAV sounds.
- docs/ASSETS.md: asset provenance.
- docs/CHALLENGE.original.md: original specification.
- ARCHITECTURE.md: current structure and planned boundaries.

## Deployment

Build command: npm run build. Output directory: dist.
Use static HTTPS hosting (localhost is also supported by service workers).
Serve public/mockServiceWorker.js at the application root.
No deployment has been created yet.

## Pending gameplay features

Controls, options, persistence, ranking/history contracts, failure scenario
selection/reset, retry recovery and performance measurements will be documented
as they are implemented.
