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
- Investigator details at 568 × 320: modal spans y=12–308, with 481px content in a 294px scroll area; the Close button was reached and clicked successfully.
- Header and page padding account for display safe areas; pinch zoom is not disabled.
- Existing game and audio regression suite: `node --test tests/ambience.cjs tests/game-regressions.cjs` (41 checks).

No game rules, card data, random draw logic or audio lifecycle code changed.
