# Action confirmations

All visible action entries use Back / Continue before execution. Draw, resource, act advancement, investigation completion, end turn and phase advancement open a confirmation. Movement selects a destination first, then confirms; map shortcuts use the same confirmation without revealing an unknown location's name. Hand-card inspection retains its explicit play gate, labeled Back / Continue · Play.

Investigation, fight and evade open the commitment preview directly. A staged test spends no action, commits no card and triggers no opportunity attack until Continue · Draw chaos token. Back discards the preview and selections only. Evade bonuses survive cancellation. Costs and opportunity attacks run exactly once before drawing; a fatal opportunity attack aborts the draw and commitment discard.

After a token is drawn, Back is disabled and Continue resolves the result. Already-triggered encounter tests cannot be cancelled, and do not spend another action. No snapshots are restored and no randomness or hidden information can be undone.

Confirmation locks prevent concurrent UI actions; continuing clears its pending callback before executing, preventing duplicate clicks from paying twice. New games clear pending callbacks. Existing direct engine calls retain their execution behavior for non-UI callers.

Buttons retain the noir palette and local Radix icons, with 44px minimum touch targets, visible focus indicators, wrapping and existing internally scrolling modal layout. No new dependencies or media assets.

Verification: 138 Node VM/unit regression checks across the seven existing test files. Ten additional tests cover cancellation, duplicate clicks, opportunity attacks, fatal interruption, skill commitments, evade bonus, forced tests, movement, act/phase confirmation and new-game lifecycle. Browser visual verification remains unauthorized and was not performed.
