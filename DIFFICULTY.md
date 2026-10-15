# Difficulty selection

The opening screen offers Easy, Standard (default), Hard and Expert. The chosen key is validated and copied into new-game state; later changes to the menu do not affect the ongoing game. The header shows the locked difficulty. Returning to the menu allows a new selection. Starting health, sanity, resources, actions and hand count do not change with difficulty.

## Verified original-core sources

- FFG *Night of the Zealot Campaign Guide*, p. 1, campaign setup: https://images-cdn.fantasyflightgames.com/filer_public/8d/30/8d308b73-92f1-4b1e-aa7f-ce39e8d79786/night_of_the_zealot_campaign_guide.pdf
- FFG *Learn to Play* (2016), p. 3 shows The Gathering Hard/Expert reference and Roland's elder-sign text; pp. 5 and 8 explain reference sides and token resolution: https://images-cdn.fantasyflightgames.com/filer_public/88/53/88538d11-5274-4b4a-ac8c-e8d758f71132/ahc01_learn_to_play_web.pdf
- The official PDF was downloaded and the reference-card page was rendered and visually inspected to verify symbol mapping and small-print effects. No official card images are redistributed in the game.

Each bag includes two skulls, one cultist, one tablet, one autofail and one elder sign. Numerical tokens:

| Difficulty | Numerical tokens | Total |
| --- | --- | --- |
| Easy | +1,+1,0,0,0,-1,-1,-1,-2,-2 | 16 |
| Standard | +1,0,0,-1,-1,-1,-2,-2,-3,-4 | 16 |
| Hard | 0,0,0,-1,-1,-2,-2,-3,-3,-4,-5 | 17 |
| Expert | 0,-1,-1,-2,-2,-3,-3,-4,-4,-5,-6,-8 | 18 |

Easy/Standard skulls subtract local Ghoul count, cultists subtract one and cause one horror on failure, tablets subtract two and cause one damage if a local Ghoul is present. Hard/Expert skulls subtract two and search/draw a Ghoul on failure after the test; cultists reveal another token and cause two horror on failure; tablets subtract four and cause one damage plus one horror if a local Ghoul is present. Ghoul searches expose a choice from encounter deck/discard, remove exactly the selected physical card and shuffle the encounter deck. Only the simplified game's existing Ghouls can be searched, not the complete official encounter set.

Chained draws exclude previously revealed tokens until completion. The bag itself stays unchanged between tests. Elder sign now gives Roland +1 per remaining clue at his location, not automatic success/healing. Autofail fails even difficulty zero; negative modified skill values floor at zero. Fatal symbol consequences stop the test without replacing the defeat dialog; no post-test Ghoul is drawn after defeat.

This is a difficulty-rules integration into an existing simplified standalone game, not a claim that the deck, locations, all card effects, campaign or overall challenge reproduce the complete official scenario. This limitation is disclosed on the start screen. No unrelated card/scenario rules were expanded.

Verification: 80 automated checks with `node --test tests/ambience.cjs tests/game-regressions.cjs tests/tutorial.cjs tests/atlas.cjs`. Browser visual verification remains unauthorized and was not performed. Menu overflow uses top-safe scrolling with auto margins; native selection and search controls keep 44px touch targets.
