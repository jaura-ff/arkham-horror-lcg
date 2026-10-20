# One-screen game board

The in-game table is a bounded viewport, not a vertically scrolling document. The home screen, prologue, tutorial and native dialogs retain their own layouts.

- CSS Grid places investigator and actions on the left; map, compact assets and hand in the centre; goals, enemies and recent log entries on the right. Source markup and all gameplay handlers are unchanged.
- At least a 1000 × 620 logical table is used. Smaller displays, including landscape phones, scale the table uniformly to fit the available visual viewport; larger displays use their full dimensions without magnifying. This intentionally prioritizes all regions being on screen; very small screens have smaller text, with full card text available in the existing hand/asset dialogs.
- Hand cards stay in one short horizontal strip with Previous/Next controls and touch scrolling. Assets and enemies also stay in horizontal lanes when numerous. No card list can increase the document height.
- The play-guide explanation is initially collapsed on game entry. Expanding it overlays the board rather than pushing panels down. The next-step setting and complete explanation remain reachable.
- The log keeps its full underlying history, previews the last two entries, and opens all records in a native dialog. Scrolling inside a long dialog is allowed, but the game table has no vertical scrolling.
- Resize and visual-viewport changes recalculate scale. Returning to the menu removes the viewport lock. Dialogs and tutorial are outside the zoomed game node, so their text and buttons keep normal sizing.
- No game state, action count, cards, phase or sound is modified by the layout controller.

Verification: `node --test tests/*.cjs` (PowerShell can pass the file list explicitly). Source/DOM simulations and geometric scale tests cover ordinary desktop, landscape phone, portrait phone and short-screen sizes. Browser visual inspection was not performed.
