# Architecture

## Boundaries

The main menu opens Controls and Network scenarios in illustrated native dialogs,
with focus containment and restoration. The network dialog reuses existing
scenario persistence, fixture reset and TanStack Query cache invalidation. Last
result exposes the persisted completed result and pending registration recovery.
Pixi renders overhead health indicators for both the player (green) and enemies
(red); the semantic React HUD continues to expose the player's health. These
latest UI changes await validation; historical test/profile reports do not cover
them.

`app` composes features and initializes the MSW mock backend. Features own menu,
options, battle, ranking and history behavior. `shared` owns UI primitives, typed
configuration/contracts, audio preferences, the local journal and HTTP transport.
App imports public feature exports. Combat has no dependency on HTTP or query state.

React owns menus, semantic HUD, forms and native modal dialogs. PixiJS owns water,
islands, ships, cannonballs, effects and health bars. The app lazy-loads the game.
Tailwind/shadcn components style the interface and supplied artwork styles the menu.

## Simulation, input and rendering

Simulation is independent of the browser and PixiJS. It updates in 1/60-second steps.
A private RAF accumulator preserves elapsed active time, executes up to 120 steps per
frame and retains excess for catch-up. Paused time is discarded. Time completion uses
a small floating-point tolerance. Lethal damage ends further combat processing in that
step; later projectiles cannot award points after player death.

Ships and obstacles use circle collisions. Projectiles have a direction, speed,
damage and lifetime. A successful hit consumes the projectile once. Spawns alternate
configured types at configured distant points and reject occupied/blocked positions.
Enemy steering rotates toward the player and uses a local tangent around nearby
islands. This is a small deterministic steering system, not a global pathfinder.

Configuration is copied and frozen, including spawn arrays/points, when each round
starts. Options affect only new rounds. The player/entity state stays outside React;
HUD snapshots are published at roughly 10 Hz. Input combines independent keyboard
and captured pointer sources; blur/visibility/pause clears all sources. Native dialogs
provide focus containment and explicit resume/result actions.

The renderer caches supplied textures using Pixi Assets. ResizeObserver scales a
fixed 960 x 600 scene to fit the canvas, with initial resolution capped at 2. Rendering
uses an explicit RAF rather than the automatic Pixi ticker. HUD/effect geometry is
rebuilt each frame; entity sprites are reused by ID and destroyed when removed.

Async initialization checks cancellation after renderer setup and image loading.
Unmount cancels RAF, removes input listeners, destroys scene/application resources
and disconnects ResizeObserver. Shared textures remain cached for future rounds.
Loading failures expose retry. React Strict Mode remains enabled in development.

## Audio

Typed simulation events emit only for successful shots, hits, kills and points.
A per-round Web Audio mixer maps them to supplied WAV buffers. Buffers are reused;
source/gain nodes are released on completion, pause or exit. Polyphony is capped at
18 voices and identical sounds have a 90 ms throttle. Ocean and sailing loops follow
active combat and actual movement. Automatic focus pause silences all current sounds.
Manual pause/resume and match completion have short cues. Suspended contexts do not
queue old combat effects; user gestures unlock playback where required.

The menu owns one HTML audio loop, pauses it on focus loss and stops it on unmount.
Both contexts use the same persisted mute preference. Missing audio is non-blocking.

## Local persistence

- `pirate-battle:settings`: validated duration/spawn settings.
- `pirate-battle:muted`: shared menu/battle mute preference.
- `pirate-battle:journal`: stable player identity, last completed match and pending queue.
- `pirate-battle:server-matches`: mock backend confirmed records.
- `pirate-battle:scenario`: selected network scenario.

The pending queue and last result are saved together before the first POST. Only a
successful server response removes an item. A lost response therefore leaves an item
pending even if the backend committed it; resending its ID recovers the existing match.
There is no active-match persistence: leaving or refreshing abandons that round.
Storage failure is reported; in-memory fallback does not claim durable persistence.

## HTTP contracts and query flow

`MatchResult` includes match ID, player ID/name, completion ISO timestamp, integer
score, actual active duration, reason and the full configuration snapshot.
`MatchPage` includes items, total, page and page size.

- POST /api/matches: validate and register/recover one match by ID.
- GET /api/ranking?page=&config=: compare canonical complete configs; order score DESC,
  completion timestamp ASC, ID ASC. Five records per page.
- GET /api/history?page=&playerId=: player-only records ordered newest first, then ID.

Axios owns transport with a 5-second timeout. TanStack Query keys include resource,
page and player/config identity. Queries consume AbortSignal, refetch on mount and
retry once. Mutations are explicit and non-retrying; a busy guard prevents overlapping
retry batches. Successful writes invalidate all match queries. Pending matches are
available for manual retry after reload. New gameplay is independent of submissions.

MSW runs in development and production. Read responses capture state before delay to
exercise stale responses; cancellation and isolated query keys protect the active
view. Fixtures are deterministic. Confirmed records are shared by both endpoints.
Reset increments the backend generation so delayed pre-reset writes cannot repopulate
the reset store. Reset also clears local results/queue and query caches.

## Test and profiling builds

The normal build strips test-driver code. The optimized `test` mode includes starting
fixtures and a read/clock driver; tests still invoke real keyboard/touch inputs and
real collision/weapon rules. Unit tests cover same-step termination and core rules.
Browser tests cover assets, options, combat, audio, data recovery and modal/result flows.
Visual baselines use deterministic fixtures. The preview process is started directly
by Node and terminated by global teardown, avoiding nested npm process cleanup on Windows.

The profile command samples frame intervals and entity counts for 180 real seconds
and records CPU time spent in simulation, render submission and the complete game
tick. These synchronous timings do not include completion of asynchronous GPU work.
Set PROFILE_LABEL to preserve separate before/after JSON reports. The test probe
stores at most 20,000 timing samples, only for the stress scenario; production
builds remove the probe and timing collection.
Health bars and projectile geometry are retained for each entity's lifetime;
frames update transforms instead of clearing and rebuilding Graphics. Membership
sets are reused, and removed entities release their Graphics. A paused or completed
arena redraws only on state transition, resize or explicit test-clock publication.
The requestAnimationFrame loop stays active for input/audio/status synchronization.
The profile command then measures post-GC heap and DOM counters after five lifecycle cycles. Its stress
fixture gives the stationary player extra initial health to keep the whole measurement
active. This is explicitly an instrumented stress test, not a claim about every device
or ordinary player performance. See the evidence report for environment and limitations.

The memory-snapshot command captures three post-GC menu snapshots and checks for
retained Simulation instances and accumulating service-worker messages. MSW 3.0.1
constructs unused default sources when imported; the app terminates those exported
defaults before setupWorker constructs its active sources. This prevents unresolved
worker promises retaining each incoming message. Review this workaround on MSW updates.
Set PROFILE_GPU=1 to request D3D11 hardware rendering on Windows; the profile aborts
if it observes SwiftShader or another software renderer.

Enemy steering checks the lookahead segment against island circles expanded by the
ship radius. Shooters continue moving when islands block the path, even within their
preferred firing range, and fire only from a clear path. This remains local steering.

The illustrated renderer uses a shared sea texture in a TilingSprite, static masked
island terrain, atlas decorations and per-health sail textures. Atlas Texture views
belong to each renderer and are destroyed on exit; cached asset sources remain shared.
The React HUD and touch controls overlay the canvas with semantic labels and supplied
UI art. Captain's Log uses API data with aligned columns and existing query/paging
semantics. Menu navigation and Options remain React components rather than flattened
screenshots. The supplied scene background is reserved for menu screens.

## References

- https://pixijs.com/8.x/guides/components/application
- https://pixijs.com/8.x/guides/components/assets
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://tanstack.com/query/latest/docs/framework/react/guides/mutations
- https://mswjs.io/api/http-response
