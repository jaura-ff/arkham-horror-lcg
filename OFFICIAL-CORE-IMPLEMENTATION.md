# Official Core Set integration — in progress

The user selected the official-rules version on 2026-10-23. Do not substitute
the existing ten-card adapted deck or parallel investigators.

## Implemented and tested, not enabled in the live game

- `official-session.js`: executable independent player setup, opening draw,
  once-only mulligan with held-out cards, atomic cost payments, physical uses,
  exhaustion, slot validation/replacement, simultaneous asset loss assignment,
  direct loss, defeat guards and empty-supply asset removal.
- `official-weaknesses.js`: executable draw/revelation queue, real Amnesia choice,
  signature threat counters, Dark Memory end-turn horror, debt limits, basic
  weakness enemy spawning, discard removal, deck exhaustion, forced-loss chains
  and once-only end-scenario trauma/XP penalties. Choice hooks still need UI.
- `official-tests.js`: executable independent test windows, icon commitment,
  token holding/chained draws, paid Wendy cancellation before effects, five elder
  signs, Detective blanking, Lucky and committed skill aftermath. Scene symbol
  consequences require an explicit callback; unresolved effects return to queue.
- No new module has been wired to `index.html`. Do not claim any of these are
  available through the public game or that all 76 cards are playable yet.

- Latest instruction (2026-10-23): deploy the work completed so far. This
  supersedes the earlier request to wait until every character was playable.
  Deployment publishes the inactive modules and tests only; it does not enable
  new characters or imply that the full official-rules integration is complete.
  Update PR #66 with all current work before merging; do not release its old
  foundation-only snapshot.
- `official-cards.js`: factual metadata for all 68 distinct starter cards plus
  the eight Core basic weaknesses (76 definitions); source is
  `zzorba/arkhamdb-json-data/pack/core/core.json`, read 2026-10-23.
- `official-card-rules.js`: explicit declarative effect/timing/cost recipes for
  every definition, including fast/reaction/forced/replacement windows. These
  are NOT executable integration handlers and must not be presented as playable.
- `official-decks.js`: builds each 33-card physical deck, normalizes skill icons,
  initializes uses, chooses a real random basic weakness from Core quantities,
  and blocks release if any execution handler is absent.

- `official-core.js`: standard five-investigator stats, independent FFG v2.0
  starter manifests, 30 ordinary cards + signature + signature weakness + one
  randomly selected basic weakness per investigator.
- Independent physical-card identity and nested mutable data per copy.
- Pure ability transitions: Skids once per own turn, Daisy's restricted Tome
  action, Agnes once per phase on horror placed on her, Roland once per round
  after defeating an enemy, Wendy's paid cancellation once per test/ability.
- Five distinct elder signs; Daisy's Necronomicon override. Skids gains resources
  only on success; Agnes's modifier uses horror on her, not committed icons.
- Missing official card definitions or a missing real basic weakness fail closed.

These are rule-model functions, not integrated gameplay handlers. No script tag
loads this module. The website still truthfully lists only Roland as playable.

## Remaining before any playable release

1. Audit all declarative card recipes against printed text and implement their
   execution handlers. Metadata and deck assembly are now present for all codes.
2. Integrate a choice/resolution queue for reaction windows and optional effects;
   do not auto-select a player's paid ability, target, discard or asset soak.
3. Implement action/fast/reaction timing, printed costs, uses (ammo/charges),
   exhaustion, slots/replacement choices, ally/asset damage and horror assignment.
4. Implement all referenced asset, event, skill and weakness effects, including
   search/reorder choices, enemy targets, evade/fight modifiers, after-test timing,
   discard replay, event destination replacement and campaign trauma/XP records.
5. Wire the five abilities at correct game windows; return cancelled chaos tokens
   before redraw and suppress all cancelled-token consequences. Keep pending
   skill tests intact across choices, including chained chaos draws.
6. Replace hard-coded Roland names/portraits/help/token explanations/deck views;
   select and lock investigator before prologue, initialize/reset per-game state.
7. Add end-to-end tests for each character, every starter card, optional choices,
   defeat during payment, no-repeat guards, cancellation, new game and old flows.
8. Only then enable role selection, publish, and verify deployed content.

## Sources

- FFG Starter Decklists v2.0 (2016), pp. 2–4:
  https://images-cdn.fantasyflightgames.com/filer_public/c0/87/c087e26e-c6d6-4533-ba2e-2b97b3f05917/ahc_decklists_v20_web.pdf
- Standard card transcriptions: https://arkhamdb.com/card/01001 through 01005.
  Do not use replacement cards or parallel investigator text.

The current scenario/map remains a web adaptation. Supporting official player
cards does not make this an implementation of the entire official campaign.
