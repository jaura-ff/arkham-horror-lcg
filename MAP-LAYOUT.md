# Centred room route

The old full-width bottom strip is replaced by a central route stage. Room order follows actual connections: Study (lower left), Hallway (centre), Attic (upper right). The old blank spacer is removed, icons are visible again, and two visible SVG lines connect only the two real adjacency edges. Node and line coordinates share the same source values. Lines use non-scaling strokes and do not intercept clicks.

The route is centred within the map area and capped at 820px width, with the existing scene background and readout preserved. Current, reachable and unexplored rooms have distinct styles; the existing current marker, clue/enemy counts and explicit reachable label remain. Narrow map containers use a taller route stage so nodes do not overlap, independently of phone orientation. Existing three-column phone-landscape gameplay layout remains intact, with scrolling available.

This is presentation only. Unrevealed rooms still require the existing Move action, only revealed adjacent rooms are clickable, movement spends the same action and opportunity-attack cost, and no room connections or game data changed.

Verification: 106 checks using `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs tests/atlas.cjs tests/difficulty-dialog.cjs tests/hand-dialog.cjs`. Added route topology, state rendering, legal movement, stylesheet wiring and assumed node-bound geometry checks at map widths 160–820px. Geometry checks are source-level checks, not DOM measurements; browser visual verification remains unauthorized and was not performed.
