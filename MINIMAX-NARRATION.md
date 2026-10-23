# User-supplied scene narration

Seven MiniMax / Serene Elder WAV recordings supplied by the user are mapped below. Original files are retained locally without modification; only MP3 derivatives are published. MP3 conversion: libmp3lame, 128 kbps, original 32 kHz mono, no gain, pitch, speed, trimming, mixing or emotion processing. No synthesis request was made. Duration/container checks and lifecycle tests do not constitute perceptual listening QA.

| Input basename | Game cue | Duration (s) | Published file |
| --- | --- | ---: | --- |
| MiniMax_第二幕_Serene_Elder.wav | Second chapter introduction | 33.49 | assets/audio/minimax-chapter-two-v1.mp3 |
| MiniMax_shufang_Serene_Elder.wav | Study | 5.56 | assets/audio/minimax-study-v1.mp3 |
| MiniMax_zoulang_Serene_Elder.wav | Hallway | 5.77 | assets/audio/minimax-hallway-v1.mp3 |
| MiniMax_gelou_Serene_Elder.wav | Attic | 4.97 | assets/audio/minimax-attic-v1.mp3 |
| MiniMax_shijierukou_Serene_Elder.wav | Stair entrance | 11.69 | assets/audio/minimax-stairs-v1.mp3 |
| MiniMax_dixiaqiaoshi_Serene_Elder.wav | Underground cellar | 10.21 | assets/audio/minimax-cellar-v1.mp3 |
| MiniMax_yishijitan_Serene_Elder.wav | Ritual altar | 12.59 | assets/audio/minimax-altar-v1.mp3 |

Locations narrate on the first visit per game, after mandatory phase/test/tutorial/enemy dialogs finish. Movement replaces an older scene, never queues stale destinations. Second-chapter introduction narrates inside its text modal, and stops when the player starts investigating or closes the modal. Stair entrance then narrates independently. Backgrounding pauses playback; returning resumes the same scene. Menu/new game/endgame/page exit stop audio. Unsupported or rejected playback never blocks gameplay. Rejected autoplay retries on a subsequent user click. Separate scene-narration toggle and stop-current control live in the existing sound settings. Existing prologue and victory recordings are unchanged.
