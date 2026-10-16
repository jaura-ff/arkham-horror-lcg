# Next-step assistance arrow

A presentation-only fixed arrow points to the next required continuation: End Turn when investigation actions reach zero, Continue in non-investigation phases, draw/resolve in the current test, or Continue in an explicit action confirmation (with a reminder that Back is available). It does not select ordinary actions or encourage ending a turn while actions remain. Movement/menu choices and endings are not automatically chosen.

The arrow hides during phase countdowns, onboarding/inert game state, native inspection dialogs, unavailable targets and the start menu. A default-on toggle in the collapsible play guide changes only this assistance, for the current page session. Native button keyboard behavior remains unchanged.

Position is computed from the current button's bounding rectangle. Scroll, resize, visual-viewport changes and UI mutations schedule at most one animation-frame update. Positions clamp within the viewport. For offscreen controls it indicates the appropriate scroll direction without changing scroll/focus. Observers watch the game/modal/tutorial/native dialogs, not the arrow itself, avoiding self-triggered loops. No polling, auto-clicks, new timers or gameplay mutations.

Styles reuse local Radix artwork and the noir palette. The arrow is static, pointer-events:none, aria-live polite, does not occupy layout or intercept touches. No dependencies added.

Verification: 187 tests across eleven test files, including 11 arrow tests for target selection, locks, modal states, disabled/missing/replaced targets, viewport position, all offscreen directions, toggle, state/focus preservation and observer scheduling. Browser visual verification remains unauthorized and was not performed.
