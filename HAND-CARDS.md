# Hand inspection and explicit play confirmation

Update: the common central inspection layer now opens this existing hand dialog on the first click/activation. Click static card content or the backdrop to collapse it; explicit play confirmation remains required. The two-activation handler described below remains the standalone fallback when the common layer is absent. See BOARD-INSPECTION.md.

Hovering a bottom hand card now opens a read-only tooltip with the existing local illustration, type/cost, effect and shared `CARD_USAGE` instructions. Keyboard focus also shows it. The tooltip sits outside the scaled board, prefers space above the card, and clamps to the viewport without resizing the hand. Moving into it allows reading/scrolling; leaving or Escape dismisses it. Native dialogs, teaching/inert mode, phase announcements, menu navigation, card removal and hand-index replacement clear stale help. The original `handInteractionHint` description is preserved and restored. No click/double-click handlers are added, and no gameplay state is modified.

Single click selects the physical card and shows a selection outline, without mutating game state. A second click on the same card within 500ms (including quick touch taps), or an OS double-click, opens an explanation. Keyboard button activation (`detail=0`, e.g. Enter/Space) opens it directly. The native modal contains the existing illustration, effect, shared `CARD_USAGE` explanation, action/resource cost and any opportunity-attack warning.

Only the modal's play button calls the existing `onHandCard` action. Confirmation revalidates the physical card by object identity, available resources, actions, phase and hand slots. Cancellation, closing and Escape do not consume anything. Duplicate confirmation is ignored. Fatal opportunity attacks retain the existing defeat handling and do not apply the card effect. Skill and weakness cards remain inspectable but not playable; skill commitment continues in the existing test UI.

The native dialog contains focus and blocks background interaction. Closing restores scrolling and focus, except when a game dialog such as defeat has opened. Cards have button semantics and interaction hints. Short/narrow displays use reduced art size, dynamic viewport height and internal scrolling. No new artwork, service or library is required.

The atlas and hand explanation share `CARD_USAGE`; actual effects remain defined by game data and rules. No balance or card-effect changes are introduced here.

Verification: 100 tests using `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs tests/atlas.cjs tests/difficulty-dialog.cjs tests/hand-dialog.cjs`. Browser visual verification remains unauthorized and was not performed.
