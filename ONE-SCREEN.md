# One-screen game board

The in-game table is a bounded viewport, not a vertically scrolling document. The home screen, prologue, tutorial and native dialogs retain their own layouts.

- Keep the original three-column composition and panel sequence: investigator, actions and goals on the left; map, enemies, assets and hand in the centre; the journal on the right. Each column sizes its own panels; wrappers are not flattened with display:contents. Source markup and all gameplay handlers are unchanged.
- The phase strip has a dedicated 50px row, explicit Chinese/English line heights and space for the diamond number. Expanded play guidance starts below it and cannot overlap its text.
- At least a 1000 × 720 logical table is used so the restored columns and readable phase strip fit together. Smaller displays, including landscape phones, scale the table uniformly to fit the available visual viewport; larger displays use their full dimensions without magnifying. This intentionally prioritizes all regions being on screen; very small screens have smaller text, with full card text available in the existing hand/asset dialogs.
- Hand cards stay in one short horizontal strip with Previous/Next controls and touch scrolling. Assets and enemies also stay in horizontal lanes when numerous. No card list can increase the document height.
- The play-guide explanation is initially collapsed on game entry. Expanding it overlays the board rather than pushing panels down. The next-step setting and complete explanation remain reachable.
- The log keeps its full underlying history, previews up to eight recent entries in the full-height right column, and opens all records in a native dialog. Scrolling inside a long dialog is allowed, but the game table has no vertical scrolling.
- Resize and visual-viewport changes recalculate scale. Returning to the menu removes the viewport lock. Dialogs and tutorial are outside the zoomed game node, so their text and buttons keep normal sizing.
- No game state, action count, cards, phase or sound is modified by the layout controller.
- Illustration sizing follows the square cells of the existing 4×3 atlas: portrait 72px (84px on taller screens), hand art 64px (88px on taller screens), assets 36px, enemies 32px and current-location marker 42px. Large-screen overrides must keep width equal to height. Button SVGs use 20px squares inside 40px controls. Phase diamonds rotate their frame only, keeping numbers upright. Scene information grows to a readable 360px block on tall screens. Card preview body text stays hidden rather than spilling out; full text remains in the accessible label and the card-effect dialog. These changes do not relocate any board region.

Verification: `node --test tests/*.cjs` (PowerShell can pass the file list explicitly). Source/DOM simulations and geometric scale tests cover ordinary desktop, landscape phone, portrait phone and short-screen sizes. Browser visual inspection was not performed.
