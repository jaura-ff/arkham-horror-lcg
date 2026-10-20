# Prologue audio provenance

## Deployment update: first and third scenes (2026-10-20)

The first scene now uses `assets/audio/prologue-intro-soft-v2.mp3` (38.8 seconds), copied byte-for-byte from `arkham-intro-fear-v2-clearer-voice.mp3`. SHA-256: `26c20c3d99c8bb5baab89d04727b07891227aff676468f09372fefa7bf17ba84`. Narration is the stronger horror take from task `b8ac08ab-1c2f-421c-8edc-eaddc748ec50`, Ragnar, Chinese, speed 0.8. The latest requested balance retains narration gain 1 (about 3 dB above the previous 0.71 setting), quieter rain and foreground effects, and overlapping equal-power crossfades rather than abrupt rain loops. Rain/bell source remains task `19608b9d-ebb9-45bb-8640-9b89d91bd574`.

The third scene uses `assets/audio/prologue-investigation-v10-rats-v2.mp3` (40.3 seconds), copied byte-for-byte from `third-scene-v10-environment-rats-v2.mp3`. SHA-256: `a395f52505a319b79cdd78807adbf68b8a0135cdf1f86b005fe030f8a8327eb1`. The user explicitly selected the v10 voice performance, not the later v11/v12 replacement takes. Its original narration is task `0815700a-47bc-436c-a52b-7c7d04dc7ee7`, Ragnar, Chinese, speed 0.8, with locally adjusted opening and phrase-by-phrase middle pacing. Narration words correspond to the existing third-scene text; punctuation and pauses differ.

New third-scene foley tasks: chair/clothing `7324ba1d-785c-4563-b160-fc3ba2cb158a`; quiet night study `84e335b3-4574-4b3b-ae46-c679f68d9b70`; unintelligible wall whisper `72c22d51-89a2-4629-b977-9cfec5493f65`; muffled closed-door sounds `9061aed3-9260-4748-9bb7-2fdc4c6922c3`. These were prompted as restrained realistic effects without music or intelligible speech. Cue starts: chair 0.15 s, whisper 9.4 s, closed-door sound 29.1 s. The 10-second study bed uses five overlapping clips with 1.5-second crossfades, a 2-second opening fade and 3.5-second ending fade. Effects are ducked under narration; mono-to-stereo narration gain is compensated.

Rat squeaks reuse the second-scene alley source task `ad88a515-04ae-4676-a23b-ee4d3035055e`, source excerpt 3.45–4.45 s. Short quiet cues begin at 31.7 and 38.5 s. The second-scene asset is unchanged. Mix processing and peak checks were performed; no perceptual listening QA is claimed. The user requested publishing the first and third scenes after auditioning these revisions. The earlier first-scene notes below describe the retained historical v1 asset, no longer selected by the player.

## First scene: Arkham at night

Published file: assets/audio/prologue-intro-rain-v1.mp3 (31 seconds, 44.1 kHz stereo, 192 kbps MP3). SHA-256: a38c2ef3c4e9c3ca1e5613c8764b73b1b1200f81407a712b73521f796cf22752.

Full first-scene story is narrated by the same Ragnar voice (Chinese, speed 0.8), Runway task 555c7f30-fe28-4cdc-b072-6d06403deb6e. Delivery cues: somber opening, long pause before the investigator introduction, tense/trembling last sentence. Original on-screen text is unchanged; “1926” is spoken as “一九二六”.

Rain/bell foley: task 19608b9d-ebb9-45bb-8640-9b89d91bd574. Prompt describes sparse soft window raindrops, very faint disappearing footsteps and one distant low church bell with a natural decay; no continuous rain wash, hiss, drone, thunder or jump scare. A quiet opening excerpt and a low-volume nine-second cue beginning at 5.5 seconds avoid a persistent noisy bed. Narration gain is reduced by about 3 dB to match the second scene. No changes are made to the already approved second-scene asset.

## Second scene: Underfloor sounds

Published file: assets/audio/prologue-study-foley-v2.mp3. Duration 33.5 seconds, 44.1 kHz stereo, 192 kbps MP3. The final user-approved preview is copied without transcoding.

Narration: Runway task 1be38680-7f95-470b-9276-520b2430153e, Ragnar voice, Chinese, speed 0.8. Approved third audition. Delivery cues: somber, scared, trembling, shaky breath and a whispered ending. Text: 台灯照着摊开的文件，旧木书架，在阴影里沉默。突然……地板下，传来一阵抓挠声。你停下笔……声音，却又消失了。可这栋房子里……本该……只有你，一个人。

Underfloor foley: Runway task e8bd10bd-e07d-45f9-95e3-fb9462e9766d. Prompt describes quiet old timber creaks, irregular muffled claw scraping below thick boards and small hollow wooden thuds, decaying into silence; no voices, music, hiss, constant rumble or jump scare. Main cue begins at 10.5 seconds, with softer short creaks near 2.4 and 29.5 seconds.

Alley foley: Runway task ad88a515-04ae-4676-a23b-ee4d3035055e. Prompt describes sparse distant nocturnal bird calls, tiny rats scurrying on stone/under timber, quiet squeaks and dry claw rustles; no voices, music, hiss, wind drone or loud hits. Very quiet opening excerpt and ending bed beginning at 23.2 seconds.

Final revision: extracted the prominent squeak at source 3.45–4.45 seconds, removed it from its former ending-bed position, placed it at 27.85 seconds, and raised its gain to 2.2 (+6.85 dB). Narration performance and timing remain unchanged. Peaks were checked below clipping; no perceptual/listening QA was claimed. Audio was approved by the user for this game's deployment.
