# Memory, gameplay and accessibility follow-up

## Retained objects

The before snapshots identify a service-worker listener retaining a pending
`workerPromise`, PromiseReaction chains, suspended generators, MessageEvents and
MessagePorts. Local inspection of MSW 3.0.1's browser module shows that importing
`defaultNetworkOptions` constructs an unused ServiceWorkerSource. `setupWorker`
creates a separate active source. The unused source receives service-worker
messages but its worker promise is never resolved.

The application now terminates the exported unused defaults before constructing
its active worker. No dependency files are patched. This workaround is specific
to the installed MSW lifecycle and should be reconsidered when updating MSW.

Before, MessageEvent counts grew 98 → 112 → 143 over 1/5/15 abandoned rounds;
Generator counts grew 131 → 145 → 176. The initial after comparison held those
counts at 4 and 48 respectively. AudioContext and ResizeObserver counts stayed
constant. Heap totals still grew, so this fixes an identified retention mechanism
without establishing that every source of growth is eliminated. Browser resource
timing entries, style caches, native task attribution and MessagePorts remain
visible. Their presence alone does not prove an application leak.

The isolated repeat before the illustrated interface confirms 4 MessageEvents, 48 Generators and zero retained
Simulation fingerprints at all three checkpoints. DOM nodes stayed at 404 and
listeners at 213. Used heap grew 6,717,336 → 7,616,636 → 8,301,040 bytes; MessagePorts
grew 53 → 57 → 73. The remaining total/native growth is explicitly unresolved.

`heap-summary-before.json` and `heap-retainers-before.json` preserve the baseline.
`heap-summary-after-msw.json` and `heap-retainers-after-msw.json` preserve that repeat
before the illustrated interface. `heap-summary.json` and `heap-retainers.json`
contain the latest illustrated-renderer repeat. Raw snapshots
are local, ignored files under heap/. Counts include browser prototypes and caches;
constructor names in optimized bundles cannot reliably identify Pixi instances.
The memory script separately detects Simulation objects by their own property
fingerprint and fails if an abandoned world survives forced GC or MessageEvents
continue accumulating. Retaining paths ignore weak edges; they are representative
paths, not dominator-based retained-byte accounting.

Reproduce: `npm.cmd run profile:memory`. Use an optimized test build and inspect
raw snapshots in Chrome DevTools Memory if deeper retained-size analysis is needed.

After the illustrated renderer, the repeat again finds zero Simulation fingerprints
and four MessageEvents at each checkpoint. DOM nodes stay at 385 and listeners at
218. Used heap is 6,709,352 / 7,610,624 / 8,396,852 bytes across 1/5/15 cycles.
Timing/resource/stream objects and native MessagePorts remain among the growing
groups. This confirms the specific cleanup regression checks, not a flat heap or
absence of every leak.

## Gameplay

Regression cases cover Chasers around both islands from both horizontal directions,
Shooters initially separated from the player by each island, and every fixed step
of a 180-second round with one spawn per second. Spawn checks observe positions
after the spawning step and allow exactly one step of movement. The dense fixture
uses only Shooters and extra hull to preserve all 180 seconds. It checks distance,
spawn overlap, island collision, finite headings and bounded entities. It does not
claim ship-to-ship collision avoidance after spawning.

A real browser test runs a full 180-second mixed-enemy simulation with one-second
spawns and checks canvas, completion and frozen results. Its deterministic clock
advances in one-minute chunks, so it verifies rules and rendering checkpoints;
the separate GPU profile verifies real-time frame delivery.

The tests exposed Shooters stopping within range while land blocked their shot.
Shooters now continue moving until the path is clear. Steering tests the complete
lookahead segment against expanded island circles, avoiding a missed intersection
when only the endpoint was checked. These are local steering rules, not a global
pathfinding guarantee for every future map or spawn configuration.

## Accessibility

Browser keyboard tests cover Enter to play, Escape to pause/resume, Tab/Shift+Tab
containment and focus restoration. Dialog Tab navigation now wraps at its first
and last controls; focus returns to Pause after React enables it and removes the
modal. Orientation and real CDP touch cancellation checks cover both layouts.

`contrast.json` records configured text pairs and button focus-ring contrast.
The ring opacity increased from 50% to 75% after the secondary background measured
2.65:1. Configured text pairs exceed 4.5:1 and measured button rings exceed 3:1.
These calculations do not certify every rendered state or screen-reader behavior.
Reproduce with `node scripts/check-contrast.mjs`.

Physical Xiaomi Android checks remain pending. Follow ../REAL-DEVICE-CHECK.md and
record device/browser versions plus PASS/FAIL/NOT TESTED for each item.
