# Standard Core investigators — local playable integration

The five standard Core investigators are connected to the existing single-player web game through player-runtime.js. The original pure rule modules remain independently testable. Publication is handled by the repository's GitHub Pages deployment.

## Loaded modules

- official-core.js: five investigator specifications, abilities, elder signs and FFG v2.0 starter manifests.
- official-cards.js / official-card-rules.js: 76 factual card definitions and declarative printed-rule recipes.
- official-decks.js: 33 physical cards per investigator: 30 regular cards, signature, signature weakness and a randomly chosen Core basic weakness. Each copy has independent identity and mutable state.
- official-session.js: opening draw/mulligan, payments, capacity/slot checks and simultaneous loss allocation.
- official-tests.js: commitments, held tokens, paid Wendy cancellation, five elder signs, Lucky and committed aftermath.
- player-catalogue.js: Chinese reading aids and metadata adapter; original printed slot names remain available for slot validation.
- player-runtime.js: executable UI bridge, optional choices, reactions, play/asset actions, uses, weakness revelations, phase windows and scenario-state synchronization.

The independent official-weaknesses.js queue is still tested as a pure module. The active browser bridge supplies its own UI continuations for the same weakness operations; it does not load that independent queue into the legacy state shape.

## Playable behavior

Selection is tentative until confirmed and applies only to the next run. Start gives the selected investigator's real attributes and independent starter deck. The initial five-card draw excludes weaknesses; a once-only mulligan holds rejected cards out until replacements have been drawn.

Daisy receives a restricted Tome action; Skids pays two resources once per own turn; Agnes reacts only to horror placed on herself, once per phase; Wendy pays an uncommitted non-weakness card to cancel and return a token before redraw, once per test. Roland's once-per-round clue reaction is optional. A colocated Stubborn Detective blanks investigator abilities and elder signs.

A selected weapon pays its own action/use costs and never stacks every equipped weapon. Ammo, charges, secrets, supplies, exhaustion and actual remaining uses are displayed. Slot replacements and damage/horror allocation are player choices. Assets reset their uses and placed tokens on re-entry. Fast cards cost no action; conditional reactions appear only in their windows. Other player-window fast abilities are accessible between phases and before test token reveal.

Weaknesses reveal immediately, then follow their own destination and consequences: threat-area weaknesses persist, Dark Memory stays in hand and can be played, Amnesia requires a keep choice, enemy weaknesses spawn enemies, and direct loss bypasses assets. A defeated player enemy returns to the player discard as a weakness, not the encounter discard. The state queue and choice nonce prevent duplicate confirmations and interruption of pending effects.

Role, deck, hand, assets and threats persist across the adapted chapters. Final weakness penalties are recorded for the current run. The deck reference sorts the initial composition by collector number and does not expose shuffled order. The atlas includes five investigators and 76 player definitions, with act/agenda excluded.

## Scope and presentation

The map, encounters, chaos-symbol reference and three-chapter story remain the existing web adaptation, not the official full campaign. There is no campaign persistence, XP upgrade shop, arbitrary deck construction, multiplayer or parallel-investigator support. Non-Roland investigators use profession medallions. Their first prologue page uses character-specific text without the prerecorded Roland identity line; later generic narration remains.

Verification uses VM integration tests that execute the same scripts and rule paths as the page, alongside the existing pure-module and regression suites. Browser visual QA has not been performed. Do not describe this as a full official campaign or as a deployed update before an actual publication.

## Sources

- FFG Starter Decklists v2.0 (2016), pp. 2–4: https://images-cdn.fantasyflightgames.com/filer_public/c0/87/c087e26e-c6d6-4533-ba2e-2b97b3f05917/ahc_decklists_v20_web.pdf
- FFG Rules Reference (2016): https://images-cdn.fantasyflightgames.com/filer_public/c4/b0/c4b0d66c-d79e-411b-bdb5-b5d8c457d4bc/ahc01_rules_reference_web.pdf
- Existing factual card metadata was sourced from zzorba/arkhamdb-json-data, pack/core/core.json on 2026-10-23; standard original cards only, no taboo substitutions or parallel signatures.
