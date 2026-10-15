# Three-second phase announcements

Opening a game announces Investigation. Every later transition announces Enemy, Upkeep, Mythos or Investigation in the existing engine order, with its upcoming round number. A centered native modal reads “即将进入 … 阶段” and closes automatically after 3000ms. Phase effects execute only after closure. No new automatic phase advancement is introduced: existing Back / Continue confirmations remain.

The phase lock disables actions, cards, navigation and repeated phase requests during the wait. Escape cannot bypass it. Resetting a game cancels the timer, invalidates its callback and closes the prior announcement. Callbacks also verify game identity, phase and defeat state. They execute once; they do not redraw encounters, restore snapshots or close result/test modals created by the phase.

The initial tutorial queues behind the announcement; a phase-ready event opens it only when requested. Seen/tutorial-menu behavior remains intact. After the announcement, focus moves to the next available game action unless the tutorial or another game modal needs it.

Styles reuse the noir palette, remain static (no motion), fit short landscape viewports and use the native modal top layer, so the page layout does not expand. No media, libraries or dependencies added. If the optional presentation script fails to load, the original synchronous engine still runs.

Verification: 155 automated Node checks across eight test files, including 9 phase-timing tests with a deterministic fake clock and 2 tutorial-queue tests. Tests check the 2999/3000ms boundary, all phases, phase effects, locks, forced tests, defeat, resets and obsolete callbacks. Browser visual verification remains unauthorized and was not performed.
