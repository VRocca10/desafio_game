# Architecture

## Current foundation

Vite builds a React application with strict TypeScript. React Strict Mode is enabled.
The browser starts MSW before rendering, including in production builds. Axios uses
the local `/api` namespace; TanStack Query manages requests and cache. The initial
status endpoint verifies this path without an external backend.

## Boundaries

- `src/app`: application composition, providers, query configuration, global styles
  and MSW initialization. `App.tsx` assembles the menu and its feature panels.
- `src/features/main-menu`: menu composition, scenery, asset frame, actions,
  accessible tabs and expandable control instructions. `MainMenu` accepts callbacks
  for Play and Options; these actions stay disabled until their flows are connected.
- `src/features/ranking`: leaderboard presentation and future ranking queries.
- `src/features/match-history`: history presentation and future match registration,
  history queries and pending submissions.
- `src/features/game`: future simulation, input, PixiJS rendering and typed configuration;
  currently contains only the implementation boundaries document.
- `src/shared/components/ui`: editable shadcn/ui primitives styled with Tailwind CSS v4.
- `src/shared/lib`: reusable utilities, including class merging.
- `src/shared/api`: common Axios transport, without feature endpoint logic.
- `public/assets`: unmodified assets supplied by the challenge.
- `tests/e2e`: Playwright tests against the optimized build.

## Dependency direction

`app` composes `features`; features depend on `shared`; shared code never imports
application or feature modules. Each implemented feature exposes its public surface
through `index.ts`. Internal files use relative imports inside their feature.

The menu receives ranking and history content as React nodes from `App.tsx`, so it
does not import sibling features. Play and Options callbacks follow the same pattern.
Subdirectories such as `components`, `hooks`, `api`, `model` and `mocks` are added only
when they contain implementation. Feature-specific handlers will be aggregated by
`app/mocks/handlers.ts` for the browser worker. Shared domain contracts should be
extracted only when actual consumers need them; avoid duplicated match definitions.

These boundaries are conventions documented here, not custom lint-enforced rules.

## Next implementation steps

Implement the deterministic simulation independently of React rendering. Keep
continuous combat state in the simulation and publish HUD snapshots to React.
Add a PixiJS lifecycle adapter with asynchronous initialization and safe cleanup.
Ranking/history contracts, pagination, persistent confirmed results, pending
submissions and reproducible failure scenarios are not implemented yet.

The initial Playwright check targeted the former setup screen. Its assertions must
be updated when test work resumes. No tests were run for the menu implementation.
Combat tests, visual baselines and profiling remain pending.

## Main menu presentation

Tailwind handles layout, spacing and responsive typography. Scoped menu CSS applies
the supplied artwork, using a nine-slice border image to preserve panel corners.
The decorative background may crop to fill the viewport; the menu remains in normal
document flow and scrolls on short screens. shadcn/ui supplies button and tab behavior.
The game title has a semantic heading, image decorations have no duplicate alt text,
and the control guide uses native details/summary. The menu captures no gameplay keys.
Ranking and history currently show explicit placeholders, without invented records.
