# Discard area and played archive

The hand panel has a pile-style button with current discard count and successful-play count. A native read-only dialog defaults to all played cards; another view shows actual current player discards. Both show artwork, effects and shared usage, newest first, including appropriate empty states.

`S.playedCards` resets per new game, recording a snapshot and round only after valid costs and survival of opportunity attacks. Assets and events are recorded; repeats remain separate. Skills committed and weaknesses drawn are not plays, but do appear in actual discard when appropriate. Equipped assets stay in play. Encounter discard is excluded. Reshuffling clears current discards but preserves play history.

Viewing, switching, closing and Escape do not play/recycle/shuffle cards or consume actions. Existing dialogs/tutorial block opening. Native modality restores scroll/focus, and narrow screens use one column with internal scrolling.

Verification: 120 automated checks via `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs tests/atlas.cjs tests/difficulty-dialog.cjs tests/hand-dialog.cjs tests/discard.cjs`. Includes recording semantics, duplicates, reshuffle/new-game lifecycle, state preservation, conflicts and escaping. Browser visual verification remains unauthorized and was not performed.
