# Card atlas

The first navigation level has exactly three buttons: All, Investigators and Enemies. All shows investigator entry buttons and enemy reading entries. Other player cards appear only after opening an investigator's deck. Locations, acts and agendas are excluded from the atlas; their gameplay definitions and progression are unchanged. The card-reading primer is collapsed initially.

Each of the five standard investigators links to its own FFG starter manifest. The deck page shows the investigator's stats and abilities, then assets, events, skills and weaknesses grouped below. Same-name physical copies merge with an explicit copy count. Fixed cards total 32; one random basic weakness brings the starting deck to 33. The eight possible basic weaknesses are listed separately in a collapsed pool, never mistaken for eight guaranteed deck cards. Browsing does not assemble a deck, call random, alter character selection or expose actual shuffled order. A legacy-only fixture can still display Roland's adapted ten-card deck.

Enemies include the four distinct adapted scenario enemies/guards and the three Core enemy weaknesses. Enemy weaknesses appear both in the enemy reference and the possible basic-weakness pool, with their appropriate stats and card effects. Non-enemy encounter treacheries are not a standalone browsing category.

Search in the top level finds investigators by their names, abilities or fixed deck cards, and enemies by their reading data. Search within a deck stays scoped to that investigator. A back button returns to the investigator list and restores focus; changing top-level tabs exits the deck. Reopening resets to All with an empty search.

Native dialogs retain focus containment, Escape dismissal, scroll restoration and modal/tutorial blocking. Investigator entries are native buttons, so keyboard activation follows the same delegated click route as pointer activation. Card effects remain native expandable details. Two-column grids become one column below 650px; controls retain at least 44px height.

Sources: FFG original Rules Reference (2016), appendix IV, pp. 28–31 and glossary; FFG Starter Decklists v2.0, pp. 2–4. Existing source links remain in the page and OFFICIAL-CORE-IMPLEMENTATION.md. Chinese names and summaries are reading aids. The game still uses an adapted three-chapter scenario rather than the full official campaign.

Verification: node --test tests/atlas.cjs and the full regression suite. Tests cover manifest membership and physical copy totals for all five investigators, random-pool separation, navigation, scoped search, keyboard-compatible markup, escaping, readonly state, focus restoration and responsive CSS. Browser visual QA has not been performed for this change.
