# Player loss notifications

Each damage/horror application now goes through `applyPlayerLoss`, preserving the existing health/sanity floor and defeat timing. It sends one read-only notice containing actual lost health and sanity, combined when both decrease together. Sources include enemy and opportunity attacks, deck exhaustion, drawn weakness, chaos symbol effects (including failure horror), and failed Whisper encounters. Healing, zero loss and repeated rendering send no notices.

A small fixed upper-right notice shows “生命 −X · 理智 −Y” and its source for 3000ms. Multiple applications queue separately, with no merged or dropped events. It does not move focus, block input, consume actions or occupy layout. Manual Popover places it in the top layer where supported; ordinary fixed positioning is the fallback. Text uses textContent, and a polite atomic status region provides screen-reader announcements. It stays visible alongside a fatal-hit ending modal. No animation, external media or dependencies added; landscape/safe-area sizing is provided.

Starting a new game or confirming return to menu clears current/queued notices and timers. Version checks prevent obsolete callbacks from hiding newer notifications. Presentation-script absence leaves game loss calculations functional.

Verification: 169 automated tests across nine test files, including 11 notification tests for timing, queueing, all loss paths, actual-vs-overkill values, fatal losses, healing, state/focus preservation, fallback rendering, reset/menu cleanup and plain text. Browser visual verification remains unauthorized and was not performed.
