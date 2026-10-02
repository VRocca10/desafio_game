# Memory closure review

Date: 2026-10-02. Optimized test build, isolated Chromium 153.0.8010.12 profiles,
short start/exit cycles with forced garbage collection after returning to the
menu. This checks lifecycle retention, not process RAM or GPU allocation totals.
Deployment alignment and Xiaomi gameplay were confirmed separately by the user.

## Findings and fixes

1. MSW 3.0.1 transfers a cloned response stream to the page for response lifecycle
   events. Unconsumed observation bodies kept native cross-realm streams and ports
   alive. The application now cancels these observation bodies on mocked and
   bypassed responses. The real request bodies remain separate. The earlier fix
   terminating MSW's unused default sources remains in place.
2. Pixi 8.21.0 creates a back-buffer shader bound to the shared white texture, but
   GlBackBufferSystem.destroy does not destroy that shader. One BindGroup/change
   listener survived each renderer. Teardown now destroys the renderer's shader
   before Application.destroy, including aborted initialization and error paths.
   The guarded `_bigTriangleShader` access is version-specific and must be reviewed
   when upgrading Pixi. Cached assets and shared shader programs remain reusable.
3. Menu audio now pauses, removes its source and calls load on unmount. Effect setup
   restores its source, including React Strict Mode effect replay.

No dependency files or generated mockServiceWorker.js were modified.

## Regression verification

After the final source changes, all 20 targeted executions in setup.spec.ts,
matches.spec.ts and delivery.spec.ts pass in desktop/mobile Chromium (no skips,
unexpected failures or flaky retries). They cover repeated lifecycle cleanup,
leaving during asset loading, asset failure/retry, API response consumption,
registration/persistence, pagination and timeout/outage recovery. Production and
test builds, TypeScript, lint and diff checks pass. Five development Strict Mode
start/exit cycles also pass without page errors or duplicate/leaked canvases.

An earlier overlapping diagnostic run hit a five-second canvas-loading timeout;
the same 20-test selection passed when rerun separately, and passed again after
the final renderer cleanup. Test timeouts were not increased.

## Before and after

Before the stream fix, the 1/5/15 snapshots counted 83/115/181 MessagePorts and
81/113/179 ReadableStreams, including browser prototypes. The pre-Pixi-fix 100-cycle
repeat exposed the shared white texture listener path. After both fixes:

| Checkpoint | Used heap, bytes | Native ports | Native streams | Native audio contexts | White texture change listeners | Retained Simulation fingerprints |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 6,701,360 | 2 | 0 | 0 | 0 | 0 |
| 5 | 7,579,836 | 2 | 0 | 0 | 0 | 0 |
| 15 | 8,361,000 | 2 | 0 | 0 | 0 | 0 |
| 30 | 8,664,412 | 2 | 0 | 0 | 0 | 0 |
| 60 | 9,166,188 | 2 | 0 | 0 | 0 | 0 |
| 100 | 9,560,188 | 2 | 0 | 0 | 0 | 0 |

DOM nodes stay at 228, JS event listeners at 216, MessageEvents at four, and no
page errors occur. A separate 30-cycle repeat with audio enabled also passes all
retention checks with the same counters. Its used heap is 6,687,104 / 7,586,912 /
8,371,848 / 8,674,684 bytes at cycles 1/5/15/30.

The remaining sampled growing paths lead to InspectorNetworkAgent request logs,
MediaInspectorContextImpl records, browser performance buffers and V8
dependent-code metadata. The native media/performance records also have bounded
buffers in the observed run. These representative strong paths do not attribute
every byte or establish a flat heap. No claim is made that all browser/process/GPU
memory stays constant or that every possible leak is eliminated.

## Artifacts and reproduction

- `heap-summary.json`: original 15-cycle baseline before this follow-up.
- `heap-streams-before-retainers.json`: newly retained native stream/port paths.
- `heap-before-pixi-summary.json`, `heap-before-pixi-retainers.json`: streams fixed,
  Pixi binding still retained, including its Texture.WHITE path.
- `heap-memory-verified-summary.json`, `heap-memory-verified-retainers.json`:
  100 cycles after both fixes; final paths compare cycle 100 to cycle 60.
- `heap-audio-verified-summary.json`, `heap-audio-verified-retainers.json`:
  30 cycles with audio enabled after both fixes.
- `memory-regression-tests.json`: subsequent targeted browser regressions.
- `strict-mode.json`: development effect replay and canvas cleanup check.

Run `npm.cmd run profile:memory` for 100 default cycles. For the audio repeat:

```powershell
npm.cmd run build:test
$env:MEMORY_LABEL = 'heap-audio-verified'
$env:MEMORY_CYCLES = '30'
$env:MEMORY_AUDIO = '1'
node scripts/memory-snapshots.mjs
```

Run memory profiles separately from browser suites to avoid CPU/GPU contention.
Raw .heapsnapshot files stay local and are ignored by Git. Constructor names in
optimized bundles are unstable; the regression checks use native types, world
property fingerprints and the shared Texture.WHITE listener graph instead.
