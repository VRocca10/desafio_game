# Illustrated interface

The menu, Options and Captain's Log follow the supplied sample_menu.png,
sample_options.png, sample_ranking.png and sample_history.png references. They
reuse the supplied panel, title, primary/secondary buttons, round controls and
background. Desktop panels retain their proportions; narrow screens stack the
utility area below the panel so it cannot cover navigation.

Options retains editable numeric fields and explicit validation. Its plus/minus
controls adjust the session by ten seconds and spawn interval by one second;
existing fractional spawn values remain supported. Main Menu saves valid values
before returning. Save settings remains available for explicit save/validation.

Captain's Log presents actual API records in aligned Captain/Date, Points,
Duration and Result columns, with five records per page. Dates and times come from
stored results, and durations use mm:ss. Empty, loading, error, retry and pending
registration behavior remain functional. The utility area retains audio, last
result, registration recovery, network scenarios and the control guide.

The battle uses live Pixi objects: tiled sea, atlas terrain clipped to the current
island colliders, palms, rocks, fort details, blue player sails, skull Chasers and
red Shooters. Damaged/wrecked ship sprites replace tint-only feedback. Retained
enemy bars and projectile geometry keep updates bounded. The HUD and six touch
controls overlay the canvas, using supplied illustrated frames and icons.

The reference battle image depicts a different coastline and staged ships. The
interactive arena retains the existing two circular island colliders and spawn
configuration; its layout is not a pixel-for-pixel recreation of that image.
The reference background is used only on menu screens, not as a combat screenshot
with baked-in ships.

`node scripts/review-ui.mjs` produces desktop/mobile captures under evidence/ui/.
Reviewed Playwright baselines cover menu, arena, result, options, ranking and
history on both Windows Chromium projects. The history screenshot fixes the date
to make repeat comparisons deterministic. To reproduce the application, build
normally and run preview; do not serve dist-test to end users.
