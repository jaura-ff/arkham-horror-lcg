# Noir Core card illustrations

Generated with the built-in image_gen tool, using assets/images/noir-atlas.webp as a style reference. These are original noir reading illustrations, not scans or official card artwork. Six independent image-generation calls produced six 4-column × 3-row sprite sheets. Every cell is 362 × 362 px in a 1448 × 1086 px image; no crop or redraw was applied after generation.

68 missing player-card illustrations plus four investigator portraits are covered. The existing eight official-code mappings and Roland portrait retain their original local illustrations. card-art.js maps each code to its texture and cell. cardArtStyle/setCardArt share the mapping across hand, atlas, assets, commitments, discard/deck lookup, weakness reveal, enemy panels and investigator UI. Card types, names, rules, hit targets and compact layout sizes remain unchanged.

Runtime images are WebP quality 88, 2.38 MB total. PNG generation originals are archived under art-sources/ and do not need publication. The original generated files also remain under the tool's default output directory.

## Files and cell index

### Sheet 1

- Runtime: [noir-core-1-v1.webp](assets/images/noir-core-1-v1.webp)
- Original (local archive, not published): `art-sources/noir-core-1-v1.png`

| Row | Column | Card / investigator ID | Subject |
| --- | --- | --- | --- |
| 1 | 1 | daisy | Daisy Walker, a thoughtful adult female librarian in a dark 1920s dress, short brown bob, round glasses, library behind her, chest-up portrait |
| 1 | 2 | skids | Skids O'Toole, lean adult male ex-con in worn dark coat, wary expression, stubble and small cheek scar, rain-slick alley, chest-up portrait |
| 1 | 3 | agnes | Agnes Baker, adult dark-haired waitress wearing a modest 1920s apron over blouse, intense haunted eyes, dim diner, chest-up portrait |
| 1 | 4 | wendy | Wendy Adams, fully clothed young orphan girl in oversized patched brown coat, short tousled hair, holding a brass amulet, resilient expression, chest-up portrait |
| 2 | 1 | 01006 | antique .38 police revolver on scratched oak with loose brass cartridges |
| 2 | 2 | 01007 | police case folder partly covered by a gloved hand, hidden photograph and smeared ink, cover-up |
| 2 | 3 | 01008 | large weathered leather book satchel, stacked dusty books protruding |
| 2 | 4 | 01009 | ancient locked Necronomicon, cracked embossed black leather cover, ominous dim amber symbols, no readable writing |
| 3 | 1 | 01010 | fugitive man fleeing down a narrow 1920s alley through golden fog |
| 3 | 2 | 01011 | overdue hospital invoice, coins and a small medical receipt on a desk, unreadable marks only |
| 3 | 3 | 01012 | ancient amber pendant relic suspended above dark velvet, Hyperborean heirloom |
| 3 | 4 | 01013 | woman holding her head as an uncanny ancient temple looms in her memory, psychological dread, no gore |

Prompt used:

```text
Use case: stylized-concept. Asset type: game texture atlas, ONE finished sprite-sheet asset for an existing noir card game. Create a brand-new 4-column by 3-row rectangular grid, exactly 12 equally sized paintings filling a single landscape 4:3 canvas, preferably 1536x1152. The attached image is STYLE REFERENCE ONLY: match its painterly cinematic realism, 1920s Arkham atmosphere, dark sepia/antique gold palette, readable warm highlights, textured worn objects and atmospheric shadows. Do NOT copy its subjects or layout content. No card frames, no text, no labels, no numbers, no watermarks, NO gutters, NO padding and NO decorative borders. Each of the 12 paintings is independent, center the important subject within its own exact cell, keep it large and legible at thumbnail size, no object crosses a cell boundary. The entire canvas is divided into 4 equal columns and 3 equal rows, continuous edge-to-edge tiles. Not a poster or mockup. Every cell must contain the subject assigned below, strictly row-major, left to right. Avoid modern objects, neon colors, bright fantasy effects or graphic violence.
Sprite sheet 1.
Row 1, column 1: Daisy Walker, a thoughtful adult female librarian in a dark 1920s dress, short brown bob, round glasses, library behind her, chest-up portrait.
Row 1, column 2: Skids O'Toole, lean adult male ex-con in worn dark coat, wary expression, stubble and small cheek scar, rain-slick alley, chest-up portrait.
Row 1, column 3: Agnes Baker, adult dark-haired waitress wearing a modest 1920s apron over blouse, intense haunted eyes, dim diner, chest-up portrait.
Row 1, column 4: Wendy Adams, fully clothed young orphan girl in oversized patched brown coat, short tousled hair, holding a brass amulet, resilient expression, chest-up portrait.
Row 2, column 1: antique .38 police revolver on scratched oak with loose brass cartridges.
Row 2, column 2: police case folder partly covered by a gloved hand, hidden photograph and smeared ink, cover-up.
Row 2, column 3: large weathered leather book satchel, stacked dusty books protruding.
Row 2, column 4: ancient locked Necronomicon, cracked embossed black leather cover, ominous dim amber symbols, no readable writing.
Row 3, column 1: fugitive man fleeing down a narrow 1920s alley through golden fog.
Row 3, column 2: overdue hospital invoice, coins and a small medical receipt on a desk, unreadable marks only.
Row 3, column 3: ancient amber pendant relic suspended above dark velvet, Hyperborean heirloom.
Row 3, column 4: woman holding her head as an uncanny ancient temple looms in her memory, psychological dread, no gore.
```

### Sheet 2

- Runtime: [noir-core-2-v1.webp](assets/images/noir-core-2-v1.webp)
- Original (local archive, not published): `art-sources/noir-core-2-v1.png`

| Row | Column | Card / investigator ID | Subject |
| --- | --- | --- | --- |
| 1 | 1 | 01014 | small weathered brass amulet on frayed string with a muted green stone |
| 1 | 2 | 01015 | lonely fully clothed orphan girl under a distant streetlamp in the rain, abandoned and alone, distant full-body silhouette |
| 1 | 3 | 01017 | worn leather punching bag and boxer's wrapped hands in a dim training room |
| 1 | 4 | 01018 | stern 1920s uniformed beat cop with badge and cap, warm side light |
| 2 | 1 | 01019 | open period first-aid tin with clean bandages, scissors and brown medicine bottle |
| 2 | 2 | 01021 | powerful dark shepherd guard dog alert in an old doorway, teeth just visible |
| 2 | 3 | 01022 | evidence envelope, magnified fingerprint and a single brass cartridge on detective's desk, no readable text |
| 2 | 4 | 01024 | bundle of red-brown vintage dynamite with old pocket watch and fuse on oak |
| 3 | 1 | 01025 | close-up of a clenched gloved fist striking from shadow, vicious blow, no gore |
| 3 | 2 | 01030 | brass magnifying glass catching candlelight above scattered police notes |
| 3 | 3 | 01031 | ancient open leather book on lectern, candlelit pages with unreadable faded marks |
| 3 | 4 | 01032 | older male research librarian wearing round spectacles and tweed, carrying a stack of books |

Prompt used:

```text
Use case: stylized-concept. Asset type: game texture atlas, ONE finished sprite-sheet asset for an existing noir card game. Create a brand-new 4-column by 3-row rectangular grid, exactly 12 equally sized paintings filling a single landscape 4:3 canvas, preferably 1536x1152. The attached image is STYLE REFERENCE ONLY: match its painterly cinematic realism, 1920s Arkham atmosphere, dark sepia/antique gold palette, readable warm highlights, textured worn objects and atmospheric shadows. Do NOT copy its subjects or layout content. No card frames, no text, no labels, no numbers, no watermarks, NO gutters, NO padding and NO decorative borders. Each of the 12 paintings is independent, center the important subject within its own exact cell, keep it large and legible at thumbnail size, no object crosses a cell boundary. The entire canvas is divided into 4 equal columns and 3 equal rows, continuous edge-to-edge tiles. Not a poster or mockup. Every cell must contain the subject assigned below, strictly row-major, left to right. Avoid modern objects, neon colors, bright fantasy effects or graphic violence.
Sprite sheet 2.
Row 1, column 1: small weathered brass amulet on frayed string with a muted green stone.
Row 1, column 2: lonely fully clothed orphan girl under a distant streetlamp in the rain, abandoned and alone, distant full-body silhouette.
Row 1, column 3: worn leather punching bag and boxer's wrapped hands in a dim training room.
Row 1, column 4: stern 1920s uniformed beat cop with badge and cap, warm side light.
Row 2, column 1: open period first-aid tin with clean bandages, scissors and brown medicine bottle.
Row 2, column 2: powerful dark shepherd guard dog alert in an old doorway, teeth just visible.
Row 2, column 3: evidence envelope, magnified fingerprint and a single brass cartridge on detective's desk, no readable text.
Row 2, column 4: bundle of red-brown vintage dynamite with old pocket watch and fuse on oak.
Row 3, column 1: close-up of a clenched gloved fist striking from shadow, vicious blow, no gore.
Row 3, column 2: brass magnifying glass catching candlelight above scattered police notes.
Row 3, column 3: ancient open leather book on lectern, candlelit pages with unreadable faded marks.
Row 3, column 4: older male research librarian wearing round spectacles and tweed, carrying a stack of books.
```

### Sheet 3

- Runtime: [noir-core-3-v1.webp](assets/images/noir-core-3-v1.webp)
- Original (local archive, not published): `art-sources/noir-core-3-v1.png`

| Row | Column | Card / investigator ID | Subject |
| --- | --- | --- | --- |
| 1 | 1 | 01033 | Dr Milan Christopher, bespectacled middle-aged professor with mustache and tweed suit beside scientific books, bust portrait |
| 1 | 2 | 01034 | alert woman turning toward a barely opened dark door, hyperawareness |
| 1 | 3 | 01035 | open antique medical textbook with anatomical line diagrams, glass bottles and candle |
| 1 | 4 | 01036 | woman concentrating as a heavy iron key subtly levitates, mind over matter, subdued supernatural effect |
| 2 | 1 | 01037 | single revelatory light shaft illuminating a hidden key among messy papers, working a hunch |
| 2 | 2 | 01038 | wooden door firmly barricaded with old planks and a pushed cabinet |
| 2 | 3 | 01039 | detective's hand linking photographs with fine thread on a small evidence board, deduction, no readable words |
| 2 | 4 | 01044 | opened compact vintage switchblade on dark leather |
| 3 | 1 | 01045 | gloved hand quietly opening an antique cabinet lock at night, burglary |
| 3 | 2 | 01046 | deft hand slipping a leather wallet from an adult man's coat pocket in a crowded 1920s street |
| 3 | 3 | 01047 | small .41 derringer pistol with two cartridges on a wooden desk |
| 3 | 4 | 01048 | Leo De Luca, tough broad-shouldered adult male fixer in a pinstripe suit and fedora, confident expression, bust portrait |

Prompt used:

```text
Use case: stylized-concept. Asset type: game texture atlas, ONE finished sprite-sheet asset for an existing noir card game. Create a brand-new 4-column by 3-row rectangular grid, exactly 12 equally sized paintings filling a single landscape 4:3 canvas, preferably 1536x1152. The attached image is STYLE REFERENCE ONLY: match its painterly cinematic realism, 1920s Arkham atmosphere, dark sepia/antique gold palette, readable warm highlights, textured worn objects and atmospheric shadows. Do NOT copy its subjects or layout content. No card frames, no text, no labels, no numbers, no watermarks, NO gutters, NO padding and NO decorative borders. Each of the 12 paintings is independent, center the important subject within its own exact cell, keep it large and legible at thumbnail size, no object crosses a cell boundary. The entire canvas is divided into 4 equal columns and 3 equal rows, continuous edge-to-edge tiles. Not a poster or mockup. Every cell must contain the subject assigned below, strictly row-major, left to right. Avoid modern objects, neon colors, bright fantasy effects or graphic violence.
Sprite sheet 3.
Row 1, column 1: Dr Milan Christopher, bespectacled middle-aged professor with mustache and tweed suit beside scientific books, bust portrait.
Row 1, column 2: alert woman turning toward a barely opened dark door, hyperawareness.
Row 1, column 3: open antique medical textbook with anatomical line diagrams, glass bottles and candle.
Row 1, column 4: woman concentrating as a heavy iron key subtly levitates, mind over matter, subdued supernatural effect.
Row 2, column 1: single revelatory light shaft illuminating a hidden key among messy papers, working a hunch.
Row 2, column 2: wooden door firmly barricaded with old planks and a pushed cabinet.
Row 2, column 3: detective's hand linking photographs with fine thread on a small evidence board, deduction, no readable words.
Row 2, column 4: opened compact vintage switchblade on dark leather.
Row 3, column 1: gloved hand quietly opening an antique cabinet lock at night, burglary.
Row 3, column 2: deft hand slipping a leather wallet from an adult man's coat pocket in a crowded 1920s street.
Row 3, column 3: small .41 derringer pistol with two cartridges on a wooden desk.
Row 3, column 4: Leo De Luca, tough broad-shouldered adult male fixer in a pinstripe suit and fedora, confident expression, bust portrait.
```

### Sheet 4

- Runtime: [noir-core-4-v1.webp](assets/images/noir-core-4-v1.webp)
- Original (local archive, not published): `art-sources/noir-core-4-v1.png`

| Row | Column | Card / investigator ID | Subject |
| --- | --- | --- | --- |
| 1 | 1 | 01049 | battered boxing gloves and a man's bandaged knuckles on rough oak, hard knocks |
| 1 | 2 | 01050 | silhouette slipping out of a locked courtyard gate into amber fog, elusive escape |
| 1 | 3 | 01051 | shadowy figure approaching an adult adversary from behind holding a dagger low, suspense, no blood |
| 1 | 4 | 01052 | crouched investigator emerging from behind crates to surprise a monstrous shadow, sneak attack, no gore |
| 2 | 1 | 01053 | clever investigator palming a brass key while watching an opportunity open in a doorway |
| 2 | 2 | 01058 | locked forbidden book cracked open, golden light and unsettling smoky tendrils, forbidden knowledge |
| 2 | 3 | 01059 | old rosary beads and small brass cross on folded dark cloth |
| 2 | 4 | 01060 | adult woman's hand casting a withering shadow toward a distant ghoul silhouette, muted amber energy and ash, no gore |
| 3 | 1 | 01061 | antique crystal scrying sphere showing a dim reflected doorway |
| 3 | 2 | 01062 | open arcane notebook with compass, unreadable geometric diagrams and candle |
| 3 | 3 | 01063 | young adult occult apprentice with spectacles and hooded brown coat, reading in candlelight |
| 3 | 4 | 01064 | investigator drawn toward a small uncanny flame through a ruined stone arch |

Prompt used:

```text
Use case: stylized-concept. Asset type: game texture atlas, ONE finished sprite-sheet asset for an existing noir card game. Create a brand-new 4-column by 3-row rectangular grid, exactly 12 equally sized paintings filling a single landscape 4:3 canvas, preferably 1536x1152. The attached image is STYLE REFERENCE ONLY: match its painterly cinematic realism, 1920s Arkham atmosphere, dark sepia/antique gold palette, readable warm highlights, textured worn objects and atmospheric shadows. Do NOT copy its subjects or layout content. No card frames, no text, no labels, no numbers, no watermarks, NO gutters, NO padding and NO decorative borders. Each of the 12 paintings is independent, center the important subject within its own exact cell, keep it large and legible at thumbnail size, no object crosses a cell boundary. The entire canvas is divided into 4 equal columns and 3 equal rows, continuous edge-to-edge tiles. Not a poster or mockup. Every cell must contain the subject assigned below, strictly row-major, left to right. Avoid modern objects, neon colors, bright fantasy effects or graphic violence.
Sprite sheet 4.
Row 1, column 1: battered boxing gloves and a man's bandaged knuckles on rough oak, hard knocks.
Row 1, column 2: silhouette slipping out of a locked courtyard gate into amber fog, elusive escape.
Row 1, column 3: shadowy figure approaching an adult adversary from behind holding a dagger low, suspense, no blood.
Row 1, column 4: crouched investigator emerging from behind crates to surprise a monstrous shadow, sneak attack, no gore.
Row 2, column 1: clever investigator palming a brass key while watching an opportunity open in a doorway.
Row 2, column 2: locked forbidden book cracked open, golden light and unsettling smoky tendrils, forbidden knowledge.
Row 2, column 3: old rosary beads and small brass cross on folded dark cloth.
Row 2, column 4: adult woman's hand casting a withering shadow toward a distant ghoul silhouette, muted amber energy and ash, no gore.
Row 3, column 1: antique crystal scrying sphere showing a dim reflected doorway.
Row 3, column 2: open arcane notebook with compass, unreadable geometric diagrams and candle.
Row 3, column 3: young adult occult apprentice with spectacles and hooded brown coat, reading in candlelight.
Row 3, column 4: investigator drawn toward a small uncanny flame through a ruined stone arch.
```

### Sheet 5

- Runtime: [noir-core-5-v1.webp](assets/images/noir-core-5-v1.webp)
- Original (local archive, not published): `art-sources/noir-core-5-v1.png`

| Row | Column | Card / investigator ID | Subject |
| --- | --- | --- | --- |
| 1 | 1 | 01065 | protective hand gesture before a thin luminous amber ward against a lurking shadow, restrained occult magic |
| 1 | 2 | 01066 | brilliant warm flash illuminating a dark corridor as a silhouette shields its eyes, blinding light |
| 1 | 3 | 01067 | resolute adult investigator walking calmly toward a looming shadow, fearless courage |
| 1 | 4 | 01072 | worn brown leather coat hanging from an iron hook, heavy seams and period cut |
| 2 | 1 | 01073 | gloved hands retrieving a useful brass tool from a heap of old discarded equipment, scavenging |
| 2 | 2 | 01074 | weathered wooden baseball bat resting diagonally on an oak floor, no modern branding |
| 2 | 3 | 01075 | old rabbit-foot lucky charm tied with worn thread and tarnished brass clasp |
| 2 | 4 | 01076 | scruffy tabby stray cat with bright watchful eyes in a dark alley |
| 3 | 1 | 01077 | determined dirt-streaked investigator bracing both hands against a heavy stone door, digging deep reserves |
| 3 | 2 | 01078 | rolling bottle drawing a ghoul's attention away from a hidden investigator, cunning distraction |
| 3 | 3 | 01079 | hand revealing a small hidden silver key beneath scattered papers, an unexpected discovery |
| 3 | 4 | 01080 | old lucky coin landing on its edge beside antique dice, warm glint of improbable luck |

Prompt used:

```text
Use case: stylized-concept. Asset type: game texture atlas, ONE finished sprite-sheet asset for an existing noir card game. Create a brand-new 4-column by 3-row rectangular grid, exactly 12 equally sized paintings filling a single landscape 4:3 canvas, preferably 1536x1152. The attached image is STYLE REFERENCE ONLY: match its painterly cinematic realism, 1920s Arkham atmosphere, dark sepia/antique gold palette, readable warm highlights, textured worn objects and atmospheric shadows. Do NOT copy its subjects or layout content. No card frames, no text, no labels, no numbers, no watermarks, NO gutters, NO padding and NO decorative borders. Each of the 12 paintings is independent, center the important subject within its own exact cell, keep it large and legible at thumbnail size, no object crosses a cell boundary. The entire canvas is divided into 4 equal columns and 3 equal rows, continuous edge-to-edge tiles. Not a poster or mockup. Every cell must contain the subject assigned below, strictly row-major, left to right. Avoid modern objects, neon colors, bright fantasy effects or graphic violence.
Sprite sheet 5.
Row 1, column 1: protective hand gesture before a thin luminous amber ward against a lurking shadow, restrained occult magic.
Row 1, column 2: brilliant warm flash illuminating a dark corridor as a silhouette shields its eyes, blinding light.
Row 1, column 3: resolute adult investigator walking calmly toward a looming shadow, fearless courage.
Row 1, column 4: worn brown leather coat hanging from an iron hook, heavy seams and period cut.
Row 2, column 1: gloved hands retrieving a useful brass tool from a heap of old discarded equipment, scavenging.
Row 2, column 2: weathered wooden baseball bat resting diagonally on an oak floor, no modern branding.
Row 2, column 3: old rabbit-foot lucky charm tied with worn thread and tarnished brass clasp.
Row 2, column 4: scruffy tabby stray cat with bright watchful eyes in a dark alley.
Row 3, column 1: determined dirt-streaked investigator bracing both hands against a heavy stone door, digging deep reserves.
Row 3, column 2: rolling bottle drawing a ghoul's attention away from a hidden investigator, cunning distraction.
Row 3, column 3: hand revealing a small hidden silver key beneath scattered papers, an unexpected discovery.
Row 3, column 4: old lucky coin landing on its edge beside antique dice, warm glint of improbable luck.
```

### Sheet 6

- Runtime: [noir-core-6-v1.webp](assets/images/noir-core-6-v1.webp)
- Original (local archive, not published): `art-sources/noir-core-6-v1.png`

| Row | Column | Card / investigator ID | Subject |
| --- | --- | --- | --- |
| 1 | 1 | 01081 | alert investigator instinctively ducking under a falling timber in a ruined house, survival instinct |
| 1 | 2 | 01086 | plain old utility knife with worn wooden handle lying diagonally on a dark table |
| 1 | 3 | 01087 | 1920s metal flashlight throwing a focused warm beam through cellar dust |
| 1 | 4 | 01093 | ordinary investigator standing against a vast menacing doorway, unexpected courage, intimate dramatic scale |
| 2 | 1 | 01096 | confused adult man looking at a broken pocket mirror while scattered photos blur behind him, amnesia |
| 2 | 2 | 01097 | anxious investigator surrounded by looming distorted watcher shadows, paranoia, psychological not graphic |
| 2 | 3 | 01098 | faint ghostly figure reflected in a dark old mirror while room remains empty, haunted |
| 2 | 4 | 01099 | adult man at desk with hands at temples as shadow patterns distort around him, psychosis, no caricature, no gore |
| 3 | 1 | 01100 | worried adult investigator examining a faint mark on his hand beside sealed medical bottles, hypochondria, no gore |
| 3 | 2 | 01101 | menacing adult mob enforcer in a dark 1920s overcoat with heavy shoulders, alley background, bust portrait |
| 3 | 3 | 01102 | sinister Silver Twilight acolyte in an understated dark ceremonial robe, candlelight on face, bust portrait |
| 3 | 4 | 01103 | stubborn hard-eyed detective in a fedora and worn trench coat holding a notebook, bust portrait |

Prompt used:

```text
Use case: stylized-concept. Asset type: game texture atlas, ONE finished sprite-sheet asset for an existing noir card game. Create a brand-new 4-column by 3-row rectangular grid, exactly 12 equally sized paintings filling a single landscape 4:3 canvas, preferably 1536x1152. The attached image is STYLE REFERENCE ONLY: match its painterly cinematic realism, 1920s Arkham atmosphere, dark sepia/antique gold palette, readable warm highlights, textured worn objects and atmospheric shadows. Do NOT copy its subjects or layout content. No card frames, no text, no labels, no numbers, no watermarks, NO gutters, NO padding and NO decorative borders. Each of the 12 paintings is independent, center the important subject within its own exact cell, keep it large and legible at thumbnail size, no object crosses a cell boundary. The entire canvas is divided into 4 equal columns and 3 equal rows, continuous edge-to-edge tiles. Not a poster or mockup. Every cell must contain the subject assigned below, strictly row-major, left to right. Avoid modern objects, neon colors, bright fantasy effects or graphic violence.
Sprite sheet 6.
Row 1, column 1: alert investigator instinctively ducking under a falling timber in a ruined house, survival instinct.
Row 1, column 2: plain old utility knife with worn wooden handle lying diagonally on a dark table.
Row 1, column 3: 1920s metal flashlight throwing a focused warm beam through cellar dust.
Row 1, column 4: ordinary investigator standing against a vast menacing doorway, unexpected courage, intimate dramatic scale.
Row 2, column 1: confused adult man looking at a broken pocket mirror while scattered photos blur behind him, amnesia.
Row 2, column 2: anxious investigator surrounded by looming distorted watcher shadows, paranoia, psychological not graphic.
Row 2, column 3: faint ghostly figure reflected in a dark old mirror while room remains empty, haunted.
Row 2, column 4: adult man at desk with hands at temples as shadow patterns distort around him, psychosis, no caricature, no gore.
Row 3, column 1: worried adult investigator examining a faint mark on his hand beside sealed medical bottles, hypochondria, no gore.
Row 3, column 2: menacing adult mob enforcer in a dark 1920s overcoat with heavy shoulders, alley background, bust portrait.
Row 3, column 3: sinister Silver Twilight acolyte in an understated dark ceremonial robe, candlelight on face, bust portrait.
Row 3, column 4: stubborn hard-eyed detective in a fedora and worn trench coat holding a notebook, bust portrait.
```

## Verification

The generated PNG sheets were visually inspected for 12-cell alignment and correct subject order. WebP copies keep the same dimensions. Tests verify complete 76-card coverage, 68 distinct new cells, four separate portraits, existing-art preservation, file headers, per-image size budget, helper reset behavior and shared presentation mappings. The complete game regression suite also runs. Browser visual QA has not been performed.
