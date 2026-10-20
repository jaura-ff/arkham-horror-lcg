# Locally hosted CC0 sound effects

## Creature-specific generated cues (2026-10-20)

The user approved two distinct short creature sounds before generation and requested their integration. These new assets are generated production media, **not Kenney CC0 recordings**. They live outside the kenney/ directory; existing CC0 attribution remains unchanged.

- `assets/audio/ghoul-servant-v1.mp3`: 1.5-second raspy zombie-like guttural moan, decayed breath and short throat rattle in a dark wooden room. Runway task `d783f9dc-9427-47d7-a7df-4b488bc7c5f7`.
- `assets/audio/ghoul-hunter-v1.mp3`: 2-second deeper undead growl with two short approaching wooden-floor footfalls and snarling breath. Runway task `f3e270b5-81d9-4409-a190-27df8b29bd38`.

Prompts specified no intelligible words, no music, no screaming or loud jump-scare blasts; each naturally decays. Local preparation applies high-pass 75 Hz, low-pass 6500 Hz, short edge fades, mono 44.1 kHz/128 kbps MP3 and loudness I=-23, TP=-6. Per-cue gain is .65 under the existing master volume. Neither loops. No perceptual listening QA is claimed.

On actual creation, `monsterSfx(card)` checks enemy type and existing ghoul identification; ghoul `hunter:true` selects the hunter cue, other ghouls select the servant cue, non-ghoul enemies retain the generic monster sound. Both encounter draws and chaos ghoul searches route through it. Rendering, moving, engaging existing enemies or empty searches cannot trigger an extra emergence cue. Thirteen selected cues now preload after entry, share caching/mute controls and stop on leaving/backgrounding. No changes to gameplay or prologue narration.

## Expanded interaction feedback (2026-10-20)

Four short derivatives of the already retained Kenney CC0 source packs add distinct feedback. No newly generated voice, runtime service or download is used. Original license texts remain in this directory. The player preloads eleven selected cues only after entry; all cues share the existing sound toggle/volume, four-voice cap and background/menu cleanup. First/second/third-scene narration and premixed environment assets are unchanged.

| File | Original source | Trigger / processing |
| --- | --- | --- |
| sanity-alert.mp3 | Interface Sounds / error_003.ogg | Actual sanity loss only; lowered playback pitch, short echo, 1.15 s, I=-21/TP=-6; per-cue gain .85 replaces .5. Existing quantity notice remains. |
| attack-miss.mp3 | RPG Audio / cloth3.ogg | Attack failure at result resolution only; filtered fabric swish, 0.65 s, I=-23/TP=-6. |
| monster-appear.mp3 | RPG Audio / creak2.ogg | Actual enemy creation, both encounter draws and chaos-token ghoul search; lowered creak with short echo, 1.5 s, I=-22/TP=-6. |
| clue-found.mp3 | Interface Sounds / confirmation_001.ogg | Actual successful clue discovery only, not failed/empty-location tests; softened confirmation, 0.85 s, I=-24/TP=-6. |

Existing door.mp3 continues to signal successful entry to any adjacent location, including newly revealed rooms. Cancelling movement has no cue. Cancelled previews, duplicate result confirmations, empty encounter decks and unsuccessful clue discovery never produce the new event cues. Processing used local FFmpeg; automated decode/trigger/control checks are not a claim of perceptual listening QA.

Eight Kenney recordings are deployed as mono 44.1kHz/96kbps MP3 files, normalized with FFmpeg loudnorm (I=-23, TP=-6, LRA=7). Combined size: 56,145 bytes. Original downloaded package license texts are preserved alongside them. No third-party runtime URLs or logins are required by the game.

| Deployed file | Original pack/file | Trigger |
| --- | --- | --- |
| card-draw.mp3 | Casino Audio / Audio/card-slide-1.ogg | Successfully drawing a player card |
| card-play.mp3 | Casino Audio / Audio/card-place-1.ogg | Valid asset/event play after costs and opportunity attack survival |
| chaos-token.mp3 | Casino Audio / Audio/chips-handle-1.ogg | Actually revealing a chaos token, once per test |
| hurt.mp3 | Impact Sounds / Audio/impactPunch_medium_000.ogg | Actual health loss |
| sanity.mp3 | Interface Sounds / Audio/error_003.ogg | Actual sanity loss |
| phase.mp3 | Interface Sounds / Audio/bong_001.ogg | Phase announcement |
| door.mp3 | RPG Audio / Audio/doorOpen_1.ogg | Successful location movement |
| page.mp3 | RPG Audio / Audio/bookFlip3.ogg | Prologue next/previous scene |

Official CC0 sources checked October 16, 2026:

- https://kenney.nl/assets/casino-audio
- https://kenney.nl/assets/impact-sounds
- https://kenney.nl/assets/interface-sounds
- https://kenney.nl/assets/rpg-audio

Creator: Kenney / Kenney Vleugels. CC0 permits adaptation and redistribution; attribution is optional but retained here. Full downloaded ZIPs and OGG working copies are local preparation artifacts, not deployed files. The suggested Freesound recordings requiring login were not used; this does not claim to install the suggested basement or heartbeat recordings.

## Quieter environment redesign

Following feedback that the continuous environment sounded like noise, the brown-noise buffer, continuous 48/48.35/71.8Hz beating sub-bass and random creak/pitch sweeps were removed entirely. The replacement is a sparse original tonal pad: two stable sine tones at 130.81/196Hz, each ramping gently from/to zero and ending within 6.4 seconds. A pair plays at most once per 20 seconds, leaving over 13 seconds of silence between pads. No random-number calls, noise generators or endless ambient sources remain.

An independent 氛围 toggle in the game header and prologue stops only ambient voices/timer, leaving operation samples audible. Its ambientEnabled preference is saved alongside the old master enabled/volume preferences without discarding them. Muting, zero volume, backgrounding and leaving for the menu stop both kinds of sound. Resuming does not stack ambient layers. The existing 音效 toggle remains the master control.

Playback shares the existing Web Audio context, master volume, limiter and saved mute settings. The global control now says 音效; a synchronized control is available while reading the prologue. Files preload/decode once after user entry, cache in memory and play as short one-shots with at most four simultaneous voices. Muting, zero volume, backgrounding, leaving for the menu and pagehide stop active samples. Version/context checks suppress late playback from an obsolete load. Invalid/failed files or unavailable Web Audio safely fall back to silent gameplay. There is no autoplay before interaction, extra gameplay delay or change to rules/random draws.

Verification: 213 Node checks across twelve files, including five quieter-ambience tests, local-file/licence checks, cache/load/playback control/failure tests and exact gameplay cue tests. FFmpeg decoded every deployed MP3 successfully and ffprobe verified duration/size. Browser playback/visual verification remains unauthorized and was not performed; no claim of in-browser listening QA.
