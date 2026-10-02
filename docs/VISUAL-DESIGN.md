# Illustrated interface

The menu, Options and Captain's Log follow the supplied sample_menu.png,
sample_options.png, sample_ranking.png and sample_history.png references. They
reuse the supplied panel, title, primary/secondary buttons, round controls and
background. Desktop panels retain their proportions. The floating utility panel
has been removed. Controls and Network scenarios use compact links below the menu
tabs and open illustrated modal dialogs with keyboard focus containment/restoration.
Last result is available in the same row when a completed result exists; sound is
configured in Options. Their focus and scenario reset flows are now covered by
desktop/mobile browser tests.

Options retains editable numeric fields and explicit validation. Its plus/minus
controls adjust the session by ten seconds and spawn interval by one second;
existing fractional spawn values remain supported. Main Menu saves valid values
before returning. Save settings remains available for explicit save/validation.

Captain's Log presents actual API records: Rank, Captain, Points and Played for
ranking; Date, Points, Duration and Result for history, with five records per page. Dates and times come from
stored results, and durations use mm:ss. Empty, loading, error, retry and pending
registration behavior remain implemented. Registration recovery is accessible on
the result screen, including Last result after refresh. Network scenario selection
and reset remain available in their dedicated dialog.

The battle uses live Pixi objects: tiled sea, atlas terrain clipped to the current
island colliders, palms, rocks, fort details, blue player sails, skull Chasers and
red Shooters. Damaged/wrecked ship sprites replace tint-only feedback. Retained
player/enemy bars and projectile geometry keep updates bounded. The player's
overhead bar is green and enemy bars are red, in addition to the HUD health display.
The HUD and six touch
controls overlay the canvas, using supplied illustrated frames and icons.

The reference battle image depicts a different coastline and staged ships. The
interactive arena retains the existing two circular island colliders and spawn
configuration; its layout is not a pixel-for-pixel recreation of that image.
The reference background is used only on menu screens, not as a combat screenshot
with baked-in ships.

Mobile combat has separate portrait and landscape layouts. Portrait centers the
complete 960×600 arena in an 8:5 panel, with HUD above and touch controls below.
Landscape reserves left/right areas for the steering and weapon buttons, with a
compact HUD above the arena. Pixi uses a uniform contain scale in both layouts;
water is limited to the actual world bounds, making unused space distinguishable
from playable water. Safe-area insets protect controls from cutouts and system
navigation. No gameplay dimensions, collision rules or spawn positions change
when rotating. Orientation/touch checks and landscape pause screenshots now cover
these layouts; complete physical-device acceptance remains partial.

`node scripts/review-ui.mjs` produces desktop/mobile captures under evidence/ui/.
Reviewed Playwright baselines cover menu, arena, result, options, ranking, history
and landscape arena/pause on both Windows Chromium projects (sixteen PNGs). The
history screenshot fixes the date to make repeat comparisons deterministic. The
latest baselines and evidence/ui copies include the updated menu, player health
bar, mobile arena boundaries, side controls and compact pause dialog.
To reproduce the application, build
normally and run preview; do not serve dist-test to end users.
