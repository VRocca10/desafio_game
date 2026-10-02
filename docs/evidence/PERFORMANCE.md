# Rendering optimization evidence

This section preserves the initial software-rendering comparison. The hardware GPU
follow-up is recorded below; heap retention analysis is in FOLLOW-UP.md.

Measured on 2026-10-01 with two isolated 180-second optimized stress runs,
followed by five start/play/exit cycles with forced garbage collection. See
profile-before.json and profile-after.json for the full configuration and samples.

| Metric | Before | After |
| --- | ---: | ---: |
| Average FPS | 37.18 | 38.65 |
| p95 frame interval | 33.4 ms | 33.4 ms |
| Mean simulation CPU time per tick | 0.074 ms | 0.074 ms |
| Mean render submission CPU time per tick | 0.519 ms | 0.314 ms |
| p95 render submission CPU time | 0.8 ms | 0.6 ms |
| Mean complete tick CPU time | 0.599 ms | 0.393 ms |

Retaining health-bar and projectile geometry reduced mean render submission cost
by approximately 40%. The frame-rate gain was approximately 4%; the 60 FPS target
was not achieved. CPU submission timings do not measure asynchronous GPU execution
or browser compositing. The after run identifies SwiftShader software rendering,
so hardware-accelerated browser performance needs a separate measurement.
Both new runs used the same Ryzen 3 7320U environment. Historical profile.json
describes a different Ryzen 5 5600 environment and is not the comparison baseline.
The before report omits per-minute windows; after windows use actual accumulated
frame intervals. The desktop arena baseline was reviewed and updated for 37 changed
pixels on health-bar edges caused by separate retained Graphics batching. All other
baselines remain unchanged; screenshot thresholds were not relaxed.

Rendering now retains bars and bullets until their corresponding entities disappear,
reuses membership sets and skips unchanged paused/ended arena renders. Resizing and
explicit test-clock updates still invalidate the view. Simulation rules and settings
remain the same. Timing collection is bounded and limited to the test stress fixture.

After five cycles, post-GC heap grew from 8,085,452 to 8,653,324 bytes, similar to the
before run (8,113,940 to 8,681,936 bytes). Listener count remained 215; final DOM
counters and full samples are in the JSON. An additional 15-cycle memory diagnostic
is in memory-after.json: listeners stayed at 214 and DOM node counts remained bounded,
but heap grew from approximately 7.5 to 8.8 MB. This does not prove absence of a leak;
heap snapshots and retained-object analysis remain necessary to explain the growth.
That additional diagnostic ran concurrently with E2E browsers, so its FPS values
are not comparable with the isolated profiles.

To reproduce on PowerShell:

```powershell
$env:PROFILE_LABEL = 'profile-after'
npm.cmd run profile
```

Validation after the change: production build/type checking and lint passed;
`npx.cmd playwright test --workers=1` passed all 52 desktop/mobile executions
(3.8 minutes) on 2026-10-02. The current HTML report is playwright-report.html.
An initial four-worker run suffered loading timeouts under resource contention;
an interrupted sequential run also timed out during host suspension. The final
uninterrupted sequential run passed without relaxing timeouts or assertions.

Run profiling without other browser tests or builds competing for resources. The
report records CPU, OS, browser, renderer, viewport, settings, entity counts and
whether the battle reached its end. Audio is muted and the stationary stress player
has extra health to keep the entire 180 seconds active. This is a measured stress
fixture, not a claim about ordinary matches or all devices.

## Hardware GPU reproduction

On Windows PowerShell, request a hardware renderer and preserve a separate report:

```powershell
$env:PROFILE_GPU = '1'
$env:PROFILE_LABEL = 'profile-gpu'
npm.cmd run profile
```

The script requests D3D11 and rejects known software renderer identifiers. The
unmasked WebGL renderer is recorded in the JSON rather than inferring acceleration
from a launch flag. Run without competing browser tests or builds. Clear PROFILE_GPU
or set it to 0 to reproduce the default software-rendering environment.

The final isolated 2026-10-02 run on the Ryzen 3 7320U identified AMD Radeon
Graphics via ANGLE Direct3D11 (device 0x1506), Chromium 153.0.8010.12, headless,
1280×720 at density 1. The battle completed all 180 simulation seconds.
After the illustrated renderer, average FPS was 59.96 and p95 frame interval
16.7 ms: approximately the 60 Hz target. The preceding renderer measured 59.99 FPS
and is preserved in profile-gpu-before-ui.json.
This verifies hardware frame delivery for the documented stationary stress fixture,
not all devices, mobile browsers or the maximum-density one-second-spawn fixture.
The full environment, minute windows, CPU timings and entity samples are in
profile-gpu.json. The earlier exploratory GPU run overlapped a build; it was
replaced by this isolated final run.

## Final delivery layout measurement

After the final mobile/control/dialog changes, the isolated hardware run completed
all 180 active seconds at 59.99 average FPS and a 16.7 ms p95 frame interval.
The renderer, CPU, browser, resolution and four-second-spawn extra-health fixture
match the hardware setup above. The final report is profile-gpu-final.json;
profile-gpu.json preserves the preceding illustrated renderer measurement.
No builds or browser tests ran concurrently with this final profiling process.
The one-second entity samples observed up to 24 ships (including the player) and
7 projectiles; these are sampled maxima, not a count of every transient peak.
Five post-round start/play/exit checkpoints used 7,774,364 / 7,944,772 / 8,096,704 /
8,238,812 / 8,316,776 bytes after forced GC. This remaining growth is recorded rather
than characterized as a flat heap; the separate snapshots investigate retained
objects and resource counters.
