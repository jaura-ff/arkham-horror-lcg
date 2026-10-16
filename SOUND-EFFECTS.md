# Locally hosted CC0 sound effects

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

Creator: Kenney / Kenney Vleugels. CC0 permits adaptation and redistribution; attribution is optional but retained here. Full downloaded ZIPs and OGG working copies are local preparation artifacts, not deployed files. The suggested Freesound recordings requiring login were not used. The pre-existing procedural horror ambience remains the environmental bed; this change does not claim to install the suggested basement or heartbeat recordings.

Playback shares the existing Web Audio context, master volume, limiter and saved mute settings. The global control now says 音效; a synchronized control is available while reading the prologue. Files preload/decode once after user entry, cache in memory and play as short one-shots with at most four simultaneous voices. Muting, zero volume, backgrounding, leaving for the menu and pagehide stop active samples. Version/context checks suppress late playback from an obsolete load. Invalid/failed files or unavailable Web Audio safely fall back to silent gameplay. There is no autoplay before interaction, extra gameplay delay or change to rules/random draws.

Verification: 208 Node checks across twelve files, including local-file/licence checks, cache/load/playback control/failure tests and exact gameplay cue tests. FFmpeg decoded every deployed MP3 successfully and ffprobe verified duration/size. Browser playback/visual verification remains unauthorized and was not performed; no claim of in-browser listening QA.
