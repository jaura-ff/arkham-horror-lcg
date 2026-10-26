# Card atlas

The menu and game header open a read-only, searchable catalogue. Visible category buttons wrap on narrow screens; selected states use aria-pressed. Search combines with the category and resets on reopening. Act and agenda cards are excluded from the atlas, without changing game progression.

With the Core modules loaded, the catalogue contains 96 records: five standard investigators, all 76 distinct Core player-card definitions used by the starter decks and basic-weakness pool, six distinct adapted encounter/guard cards, and nine locations. Same-name encounters merge. Numeric metadata, ownership, skill icons and concise Chinese rule summaries come from player-catalogue.js and the official modules. No deck is assembled or randomized while browsing; the atlas never reveals live deck order. Legacy-only test fixtures retain a 26-record fallback.

Sources: FFG original Rules Reference (2016), appendix IV, pp. 28–31 and glossary; FFG Starter Decklists v2.0, pp. 2–4. Source links remain in the page and OFFICIAL-CORE-IMPLEMENTATION.md. This is not the complete official card database. The three chapters, locations and encounters remain a web adaptation; there is no campaign save, free deckbuilding or XP upgrade UI.

Native dialogs provide focus containment and Escape dismissal. Closing restores scrolling and the initiating control. Existing modals and tutorial block opening. Cards are expandable reading entries and never call gameplay actions. Responsive layout uses two columns on wide screens and one below 650px, internal scrolling, and 44px minimum controls.

Validation: node --test tests/atlas.cjs tests/player-runtime.cjs, plus the full regression suite. No browser visual QA has been performed for this change.
