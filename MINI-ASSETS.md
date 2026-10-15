# Compact equipped-asset icons

Equipped assets use 48px-high buttons with a 34px local artwork icon, name and ready/exhausted status. The strip never wraps; extra equipment scrolls horizontally inside the existing panel, capped at 58px including the scrollbar. Full-size cards and inline effects were removed so equipment does not expand the game layout. Events remain in discard/history.

Click/tap/Enter opens a small native read-only dialog with complete effect, Chinese slot usage and state. Escape/close dismiss it without gameplay changes. No play/re-equip controls. Test, move, confirmation and tutorial locks prevent conflicting opens. Native modality handles focus; shared dialog styles provide viewport limits and internal scrolling. Artwork uses the existing atlas with a neutral fallback. Button text is escaped; dialog values use textContent. No new dependencies.

Verification: 144 automated tests pass across the existing seven test files. Browser visual verification remains unauthorized and was not performed.
