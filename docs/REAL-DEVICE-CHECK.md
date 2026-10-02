# Xiaomi Android acceptance check

Status: functional gameplay accepted by the user on Xiaomi Android on 2026-10-02.
The user confirmed that the updated deployment is aligned and mobile gameplay is
OK. Exact model, Android/browser versions and item-by-item results have not been
recorded. This confirmation does not certify TalkBack or phone FPS.

The public HTTPS deployment can be opened directly on the phone. Local USB setup
below remains available for development. The newest requirements/UI changes passed
the automated desktop/mobile suite and local production smoke. The public deployment
was subsequently confirmed as updated by the user. The procedure below remains
available for future regression checks.

## Connect using USB and Chrome

1. In the project PowerShell terminal, run `npm.cmd run build`, then `npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Keep this terminal open.
2. Enable Developer options and USB debugging in the phone's settings. Xiaomi menu names vary by MIUI/HyperOS version. Connect the unlocked phone using a USB data cable and accept the debugging prompt.
3. In desktop Chrome, open `chrome://inspect/#devices` and enable **Discover USB devices**. Open Chrome on the phone; it should appear in the device list.
4. Select **Port forwarding**. Add device port `4173` with destination `localhost:4173`, enable forwarding and click **Done**.
5. In phone Chrome, open `http://localhost:4173`. This localhost route permits the service worker; an HTTP LAN IP does not validate the same service-worker path.

Official setup: https://developer.chrome.com/docs/devtools/remote-debugging/local-server?hl=pt-br

## Run checks

Record the exact Xiaomi model, Android version, Chrome version and refresh rate. Use portrait and landscape; disable rotation lock.

| Action | Expected result |
| --- | --- |
| Open the page, select Options, save 60 seconds / 1 second spawn, refresh | Values persist; readable labels and validation messages |
| Start a match in portrait | Arena, Hull/Score/Time and all six controls fit and remain readable |
| Hold Forward and Fire right with two fingers; add Turn left | Movement, turning and broadside fire work together |
| Release fingers; slide a held finger off its button and release | Movement/fire stop; no stuck input |
| Rotate during play | Canvas resizes; HUD and controls remain usable without page scrolling |
| Inspect the latest portrait/landscape layout | Portrait shows the complete 8:5 arena with controls below; landscape places controls beside the arena; ships and islands retain their proportions |
| Press Pause, resume, switch apps, return, lock/unlock the phone | Backgrounding pauses; explicit Resume is required; previous held inputs do not resume |
| Play a complete round; inspect enemies near both islands | Ships go around land; new ships appear away from the player; no persistent stuck enemies |
| Finish by timer and by sinking; use Play Again | Correct result and registration message; fresh health, score and timer |
| Return to menu and open History / Ranking; refresh | Completed result persists and appears once; unfinished matches are absent |
| Open Network scenarios in the main menu, select outage, finish a round, refresh, select success, open Last result and retry registration | Failure is understandable; recovery produces one record |
| Turn sound on/off, then refresh | Audio preference persists; background app has no battle sound |
| Enable TalkBack and navigate menu, Options and pause/result dialogs | Controls have meaningful labels; status/failure messages are understandable; dialog navigation stays coherent |
| Optional external keyboard: Tab, Shift+Tab, Enter, Escape, W/A/D, Space, Q/E | Visible focus; menu activation, battle controls, pause/resume work; focus stays inside the modal |
| Inspect under normal daylight with default brightness | Text, focus indicators and disabled controls remain distinguishable |

Report each item as PASS / FAIL / NOT TESTED. For failures, include orientation, steps and observed behavior. Contrast certification and real-device FPS require separate measurement; subjective readability alone does not prove WCAG contrast compliance.
