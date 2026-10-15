# Card atlas

Menu and in-game header provide a read-only catalogue. Native modal dialog supplies focus containment, Escape dismissal and an inert background; closing restores page scrolling and the initiating control. Existing game modals and the tutorial block atlas opening. No gameplay actions are called.

The 23 entries are derived from `INVESTIGATOR`, `ENCOUNTER`, `LOCATIONS`, `ACT_DECK`, `AGENDA_DECK` and existing local artwork. Same-name encounters merge. Search covers names, effects, fields and usage; category filtering and expandable entries work offline.

Official anatomy/type concepts are paraphrased from FFG's original *Rules Reference* (2016), pp. 28–31 and relevant glossary entries: https://images-cdn.fantasyflightgames.com/filer_public/c4/b0/c4b0d66c-d79e-411b-bdb5-b5d8c457d4bc/ahc01_rules_reference_web.pdf

This is not the official complete card database or a reproduction of physical card text. The atlas explicitly distinguishes this implementation's simplified costs, two hand slots, no ammunition, limited commitment options, no experience upgrades, simplified investigator and card effects. Scenario entries disclose spoilers. Numbers come from initial definitions, not hidden live deck order or remaining clue counts.

Verification: `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs tests/atlas.cjs`. Browser visual verification remains unauthorized and has not been performed. Responsive rules use a two-column catalogue on wide displays, a single column below 650px, dynamic viewport height, internal scrolling and 44px minimum controls.
