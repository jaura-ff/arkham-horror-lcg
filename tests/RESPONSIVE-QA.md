# Responsive layout checks

2026-10-15, browser viewport emulation (not a physical-device certification).

The phone-landscape rule applies at landscape orientation, height <= 600 CSS pixels, and width 480–1200 CSS pixels. It retains the desktop left investigator / central scene, actions and hand / right journal composition. It does not shrink the entire page with zoom, lock rotation, or reset game state. Vertical scrolling remains available, including for large text and short browser windows.

| Viewport | Layout | Horizontal page overflow | Minimum action target |
| --- | --- | --- | --- |
| 568 × 320 | Three columns | None | 68 × 52 px |
| 667 × 375 | Three columns | None | 86 × 52 px |
| 740 × 360 | Three columns | None | 98 × 52 px |
| 844 × 390 | Three columns | None | 63 × 64 px |
| 932 × 430 | Three columns | None | 71 × 64 px |
| 390 × 844 | Portrait stack | None | 104 × 59 px |
| 1440 × 900 | Desktop three columns | None | 112 × 66 px |

Additional UI checks:

- Resource action followed by portrait → landscape rotation preserves resource count, action count, round and hand contents.
- Investigation modal fits 667 × 375 and its draw-token action remains usable.
- Short-landscape modals have a dynamic viewport maximum height and internal vertical scrolling rather than clipped buttons.
- Investigator details are now permanently displayed on the external character card. The previous clickable investigator modal has been removed; resource, clue, action and location values refresh together, including during skill tests.
- Header and page padding account for display safe areas; pinch zoom is not disabled.
- Game, audio, tutorial, difficulty, card atlas, hand-confirmation, discard and map/panel regression suite: `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs tests/atlas.cjs tests/difficulty-dialog.cjs tests/hand-dialog.cjs tests/discard.cjs` (124 checks).

No game rules, card data, random draw logic or audio lifecycle code changed.

Latest external-status consolidation and beginner tutorial were checked by regression tests and source inspection only; the previously recorded viewport checks were not repeated because browser preview was not authorized. Tutorial cards use a dynamic viewport maximum height, internal scrolling, 44px navigation targets and resize-based spotlight placement, but this update has not been visually verified in a browser.
