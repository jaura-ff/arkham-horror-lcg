# Beginner tutorial

- Only the explicit menu Learn entry or in-game `?` opens the five illustrated lessons plus a sixth reassuring practice invitation. Normal Start Game never opens or queues it, even on a first visit or when local storage is blocked. Learn requests wait until the first phase announcement finishes.
- The explanation initially sits centre-right, inset from the edges. Drag its labelled header with a mouse or touch to reposition; arrow keys move it (Shift for larger steps), Home restores the default. Buttons and body text are not drag handles.
- User placement survives steps, scrolling and reopening within the page session. Resizing or taller content clamps it inside a 12px viewport margin. Pointer cancellation, capture loss and closing safely stop dragging. Only the spotlight follows each target.
- Opening-screen entry: `第一次玩？新人指导`. In-game entry: the `?` button (`重看新人指导`).
- Five compact steps cover investigation and the win condition, actions, cards, enemies and the phase loop. Each has one short instruction, one reminder and a local-artwork illustration or diagram. Health/sanity failure and adjacent-only movement remain visible in the first reminder. More detailed card rules stay in the atlas.
- After the five lessons, a dedicated full-screen page uses the study background and a reassuring invitation to try playing. It has no floating guide frame, spotlight, lesson counter or drag handle. Return to Teaching restores the last lesson and its placement; Start Practice closes the guide without automatically taking an action or resetting the game. Hidden controls are excluded from the focus loop. The tour never calls game actions, draws cards or changes resources. During the tour the game surface is inert; focus stays inside the guide.
- Skip, close and completion are recorded locally under `arkham-tutorial-v1`; this record no longer decides whether a normal start shows a tutorial. Explicit replay is always available. Local-storage failure does not prevent use.
- Existing game dialogs are not overwritten. Close or complete the active dialog before replaying the guide.
- Escape exits, Tab stays in the guide, and focus and page-scroll settings are restored on exit. Portrait/landscape changes reposition the highlight without resetting the game.
- No external service, library or artwork is required. Browser visual verification was not authorized; regression coverage is in `tests/tutorial.cjs`.

Run all checks: `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs`.
