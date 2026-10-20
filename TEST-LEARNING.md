# First-scenario skill-test explanations

The existing test modal now explains the values for the current check, without another popup or changes to the game board.

- Identify the investigator attribute actually used: intellect for investigation, combat for fighting, agility for evade, and the specified attribute for encounter/effect checks. Show the relevant difficulty source (shroud, enemy fight/evade, or effect difficulty).
- Break down the actual calculation into base attribute, this test's equipment/effect bonus, committed-card bonus and pre-token total. Committing/cancelling a card refreshes these values using the existing preview path.
- Clarify that reaching the difficulty before drawing is not a resolved success. The final post-token value must equal or exceed the difficulty; equal succeeds, with auto-fail as an exception.
- The result explanation uses the token resolver's real modifier, including symbol-token and chained-token effects. Negative totals are floored at zero. Auto-fail has a separate explanation rather than an incorrect numeric success comparison.
- Capture the explanation before committed cards are discarded, so the result retains the values that were actually used. Test bonuses remain visible even when their one-use source is consumed.
- The explanation helper only reads values. It does not consume actions/cards, call randomness, change callbacks, alter target selection or modify success rules. Existing forced-test, cancel and result-confirmation rules are unchanged.

Tests exercise actual game previews and resolutions for all four attributes, weapon and evade bonuses, commit/cancel, equality, auto-fail, negative totals, elder-sign and chained-token modifiers, and read-only rendering. Styles are scoped to the explanation block, with wrapping and compact short-landscape spacing. Browser visual inspection was not performed.
