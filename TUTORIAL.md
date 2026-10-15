# Beginner tutorial

- First start opens a seven-step, read-only tour with a highlight over the relevant game area.
- The explanation stays docked at the bottom right with a 12px viewport margin; only the spotlight follows each target. Narrow screens keep the panel within the viewport.
- Opening-screen entry: `第一次玩？新人指导`. In-game entry: the `?` button (`重看新人指导`).
- Steps cover the actual simplified scenario rules: win condition, investigator state, movement/investigation, actions, cards, enemies and the phase loop.
- The tour never calls game actions, draws cards or changes resources. During the tour the game surface is inert; focus stays inside the guide.
- Skip, close and completion are remembered locally under `arkham-tutorial-v1`; explicit replay is always available. Local-storage failure does not prevent use.
- Existing game dialogs are not overwritten. Close or complete the active dialog before replaying the guide.
- Escape exits, Tab stays in the guide, and focus and page-scroll settings are restored on exit. Portrait/landscape changes reposition the highlight without resetting the game.
- No external service, library or artwork is required. Browser visual verification was not authorized; regression coverage is in `tests/tutorial.cjs`.

Run all checks: `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs`.
