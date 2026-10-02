# Architecture

## Boundaries

The main menu opens Controls and Network scenarios in illustrated native dialogs,
with focus containment and restoration. The network dialog reuses existing
scenario persistence, fixture reset and TanStack Query cache invalidation. Last
result exposes the persisted completed result and pending registration recovery.
Pixi renders overhead health indicators for both the player (green) and enemies
(red); the semantic React HUD continues to expose the player's health. These
latest UI changes are covered by the browser/visual acceptance suite and local
production smoke checks; historical reports are distinguished from the final
evidence in docs/DELIVERY-STATUS.md.

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
uses an explicit RAF rather than the automatic Pixi ticker. Entity sprites,
projectile Graphics and health-bar geometry are retained by ID; frames update
transforms, fill scale and alpha. Removed entities release their display objects.

Async initialization checks cancellation after renderer setup and image loading.
Unmount cancels RAF, removes input listeners, destroys scene/application resources
and disconnects ResizeObserver. Shared textures remain cached for future rounds.
Loading failures expose retry. React Strict Mode remains enabled in development.

Teardown explicitly releases the WebGL back-buffer shader before destroying the
application. Pixi 8.21.0's back-buffer system otherwise leaves its BindGroup change
listener attached to Texture.WHITE.source. Access to `_bigTriangleShader` is guarded
and version-specific; reassess it on Pixi upgrades. The shader cleanup preserves
shared programs and cached texture sources. See docs/evidence/MEMORY-REVIEW.md for
the retaining path and 100-cycle verification.

## Audio

Typed simulation events emit only for successful shots, hits, kills and points.
A per-round Web Audio mixer maps them to supplied WAV buffers. Buffers are reused;
source/gain nodes are released on completion, pause or exit. Polyphony is capped at
18 voices and identical sounds have a 90 ms throttle. Ocean and sailing loops follow
active combat and actual movement. Automatic focus pause silences all current sounds.
Manual pause/resume and match completion have short cues. Suspended contexts do not
queue old combat effects; user gestures unlock playback where required.

The menu owns one HTML audio loop, pauses it on focus loss and releases its source
with removeAttribute/load on unmount. Effect setup restores that source during
Strict Mode replay.
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
page and player/config identity. Cached reads have a 30-second stale time, but
lists always refetch when mounted, including returning to a tab. Queries consume
AbortSignal and retry once. Mutations are explicit and non-retrying; a busy guard prevents overlapping
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

The memory-snapshot command runs 100 cycles by default, taking post-GC menu
snapshots after cycles 1/5/15/30/60/100. It checks retained Simulation fingerprints,
service-worker messages, native ports/streams/audio contexts and shared white
texture listeners. A separate 30-cycle audio-enabled repeat covers audio cleanup.
MSW 3.0.1
constructs unused default sources when imported; the app terminates those exported
defaults before setupWorker constructs its active sources. This prevents unresolved
worker promises retaining each incoming message. Review this workaround on MSW updates.
MSW also transfers cloned response bodies to the page for lifecycle observation.
The app cancels those otherwise-unused bodies on mocked and bypassed response
events, releasing cross-realm streams and ports without cancelling actual client
responses. No dependency or generated worker files are patched.
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

## Balance decisions and limitations

The typed balance source is `src/shared/game/config.ts`. Options overrides only
duration and spawn interval; all other values stay in the immutable round snapshot.

| Default | Value | Intended tradeoff |
| --- | --- | --- |
| Duration / spawn interval | 90 s / 4 s | Short rounds with a gradual increase in enemy density; Options permits 60–180 s and 1–10 s |
| Player / enemy health | 100 / 40 | An enemy needs two 20-damage projectile hits; player survival is finite |
| Projectile / Chaser impact damage | 20 / 25 | Contact is more costly than one projectile hit and awards no destruction point |
| Player / enemy speed | 170 / 65 world units per second | The player can escape pursuit, while turning and obstacles still constrain movement |
| Turn speed | 2.6 radians per second | Allows directional aiming without instant turns |
| Projectile speed / lifetime | 360 units/s / 1.8 s | Nominal travel is 648 units; bounds, islands and hits can remove a shot sooner |
| Front / side / enemy cooldown | 0.35 s / 0.9 s / 1.8 s | Broadside fires three parallel shots but has a longer cooldown; each weapon has its own timer |
| Shooter range / spawn clearance | 310 / 280 world units | Shooters approach before firing; spawn checks reject nearby, blocked and occupied points |

The alternating Chaser/Shooter sequence and four corner spawn points are
deterministic. If no point is safe, that spawn attempt produces no enemy rather
than forcing an unsafe placement. Circular hitboxes favor predictable collision
rules over exact sprite outlines. Steering targets the supplied two-island map;
it does not guarantee routing through arbitrary future terrain.

Ranking and history simulate REST transport but persist in the current browser;
they are not a shared multiplayer service. Rival records are fixtures. Storage
restrictions prevent durable recovery, and clearing site data resets that browser's
records. Portrait and landscape preserve the whole arena, so narrow portrait
screens display smaller ships instead of cropping the world.

Visual baselines target Windows Chromium. The 59.99 FPS profile covers a documented
desktop GPU and a stationary, muted, extra-health fixture, not every device or
spawn setting. Memory checks fix identified retention paths; total heap still
includes browser/DevTools buffers and V8 metadata and is not certified flat.
Physical Xiaomi gameplay was accepted by the user; TalkBack and phone FPS are not
recorded. Asset provenance and the upstream license situation are documented in
docs/ASSETS.md.

## References

- https://pixijs.com/8.x/guides/components/application
- https://pixijs.com/8.x/guides/components/assets
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://tanstack.com/query/latest/docs/framework/react/guides/mutations
- https://mswjs.io/api/http-response
