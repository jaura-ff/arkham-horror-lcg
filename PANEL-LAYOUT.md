# Action / asset panel arrangement

The actual DOM places the action panel immediately below the investigator in the left column, followed by objective progress. The equipped-assets panel moves to the previous central action position (after enemies, before hand). Hand cards now occupy the entire central bottom width. All existing rendering IDs and gameplay handlers remain unchanged, including tutorial targets and keyboard reading order.

Left-column actions use two columns on desktop, full-width investigation and stacked phase controls. Phone landscape keeps the established three-column page and uses one action per row within the narrow left column. Portrait retains the investigator/objective top pair with actions across the next row. Asset chips wrap horizontally in the central panel. Action controls retain at least 44px height; page scrolling is available rather than hiding overflowing controls.

Verification: 110 automated checks via `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs tests/atlas.cjs tests/difficulty-dialog.cjs tests/hand-dialog.cjs`. Four additional source/runtime checks cover placement, unique IDs, responsive stylesheet wiring and unchanged costs/status updates. Browser visual verification remains unauthorized and was not performed.
