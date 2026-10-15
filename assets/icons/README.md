# Common game icons

Local SVG sprite, based on Radix Icons 1.3.2 (MIT; full notice in LICENSE-RADIX.txt).

| Symbol | Meaning | Used in |
| --- | --- | --- |
| play | Start / continue | Opening screen, cancel-return action |
| home | Return to menu | Header, return confirmation |
| restart | Start a new run | End-game restart action |
| close | Close dialog | Investigator and resolution dialogs |
| sound | Environment audio enabled | Audio control |
| mute | Audio disabled / zero volume | Audio control |
| back | Cancel / go back | Action dialogs |
| next | Confirm / continue | Token result, end turn |

Example: `<svg class="ui-icon" aria-hidden="true"><use href="assets/icons/ui.svg#play"></use></svg>`.

Use currentColor for the existing black-and-brass palette. Decorative symbols are hidden from screen readers; buttons retain text or a descriptive aria-label. No icon-font service, CDN script, image-generation asset, or new runtime dependency is needed.

Returning to the menu asks for confirmation and discards only the current game after confirmation. Cancel preserves progress. Skill tests and move dialogs must finish or cancel before menu navigation. Returning suspends environment audio; starting again reuses the audio graph.

Validation: `node --test tests/ambience.cjs tests/game-regressions.cjs` (45 passing checks). Interactive browser preview for this update was not authorized and was not bypassed.
