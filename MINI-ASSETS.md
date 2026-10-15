# Mini equipped cards

The central equipped-assets panel now renders compact 168px cards rather than text chips. Each shows local shared card artwork, name, complete current game effect, Chinese slot label and ready/exhausted state. Effects are not clipped or hidden behind hover. Flex wrapping preserves the same design on desktop and landscape phones; cards shrink inside narrower containers. Events remain in the discard/history, not equipped assets.

Rendering is read-only: no additional play controls, costs, state changes or game-rule changes. Artwork uses the existing atlas; unknown assets get a neutral text fallback. Dynamic text is escaped. Empty and new-game states remain intact.

Verification: 142 automated tests pass across the existing seven test files, including four new mini-card tests. Browser visual verification remains unauthorized and was not performed.
