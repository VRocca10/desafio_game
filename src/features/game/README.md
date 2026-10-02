# Game implementation

- model/config.ts: public alias for shared/game/config.ts (90 seconds, 4-second spawns by default).
- model/simulation.ts: deterministic world, fixed 60 Hz steps, circle collisions,
  alternating Chaser/Shooter spawns, weapons, damage, score and match termination.
- input.ts: keyboard and independent pointer sources, cleared on blur and pause.
- audio.ts: Web Audio playback, reusable decoded buffers, bounded overlapping sounds,
  movement/ocean loops, gesture unlock, persisted mute and per-battle cleanup.
- rendering.ts: PixiJS scene, cached supplied ship/effect textures, health bars,
  proportional resize and cancellation-safe asynchronous initialization.
- Game.tsx: lifecycle, 10 Hz semantic HUD, pause, loading/retry and completed-result callback.
- GameDialog.tsx: native focus-trapped pause/result dialog.
- testing.ts: deterministic starting fixtures and clock/snapshot driver, stripped from production.

Controls: W/up forward, A/D or arrows turn, Space front cannon, Q/E broadsides,
Escape pause. Hold touch buttons to steer and shoot simultaneously.
Both mobile orientations preserve the full logical 960 x 600 arena.

Known limits: circle ship hitboxes and simple local island avoidance. Damaged sails
and wreck stages use the supplied ship sprites. Portrait presents the complete
arena in an 8:5 panel; landscape reserves side areas for controls and uses a compact
HUD. Player/enemy overhead health bars supplement the semantic React HUD.
Options and result persistence live outside combat; HTTP registration never controls
the simulation. Browser combat tests and visual baselines live under tests/e2e.
Shared textures intentionally stay in the Assets cache between rounds; per-round
sprites, canvas, renderer, RAF, ResizeObserver and input listeners are released.

Combat emits typed events only when rules produce a shot, hit, kill or score.
Audio consumes these without changing the simulation. Sailing plays only while
the ship actually moves forward. Health <= 25% and remaining time <= 10 seconds
trigger one warning each per round. Sound levels and filenames live in audio.ts.
The mixer allows at most 18 voices (including two loops) and suppresses identical
effects within 90 ms. Pause/exit cancels existing sounds; no missed effects are queued.
Short manual pause/resume and result cues remain audible; focus loss is silent.
Audio tests observe real Web Audio playback and verify mute, persistence, movement,
fire, pause, focus loss, disposal and missing files on desktop/mobile Chromium.
