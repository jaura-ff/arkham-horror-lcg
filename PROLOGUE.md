# Story prologue before the game

The menu Start Game entry now opens a three-scene native story dialog before any game state is created. Original Chinese fiction establishes Arkham in 1926, Roland's study, unsettling sounds and the reason to investigate the house. It explicitly labels itself a web adaptation, not official scenario text. It reuses the local study background and noir typography, with manual Previous/Continue reading, Begin Investigation, Skip and Return to Menu controls. There are no automatic story timers or text animations.

Reading/backtracking/cancelling does not shuffle, deal cards, spend actions or start phase effects. Difficulty is captured when opening and preserved for the actual game. Final confirmation or Skip calls startGame once, then emits arkham:game-started. The existing three-second first-phase announcement runs next, followed by optional onboarding. The Learn entry passes a forced tutorial request through the prologue. Start-button audio behavior remains; the actual-start event also supports the Learn path. Cancelling dispatches the existing menu event to stop ambience/clear tutorial queues.

Native modality provides keyboard containment; scene titles receive focus and Escape returns to the menu. Return restores focus and body overflow. The background is local, the dialog is viewport-height bounded and scrollable, and short-landscape/narrow layouts retain 44px controls. Ongoing games cannot reopen the prologue; fresh games replay it. Missing presentation script falls back to the original game start.

Verification: 198 automated tests across twelve files, including eight prologue flow tests, two onboarding event tests and one audio event test. Browser visual verification remains unauthorized and was not performed.
