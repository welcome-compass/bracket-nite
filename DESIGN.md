# Bracket Nite: the modern scorecard

The tournament is the centerpiece. Use the visual language of a printed game scorecard: a navy masthead, serif entry titles, readable controls, round numbers and seeded chips. Gold marks winners; cobalt marks participation and the current round.

## Tokens

| Role | Value |
| --- | --- |
| Navy, masthead and structural ink | `#1d304e` |
| Cobalt, primary actions and selections | `#2859c5` |
| Gold, winners and champion | `#efbf50` |
| Page ground | `#e9edf1` |
| Paper | `#fafbf9` |
| Surface | `#ffffff` |
| Main text | `#20324e` |
| Secondary text | `#59697e` |
| Borders | `#c7d0dc` |
| Selected wash | `#e8effc` |

Define tokens once in `app/globals.css`. Avoid using gold for small text on pale backgrounds. Winner states also include text and check/trophy marks; state must never depend on color alone.

## Typography and geometry

Use the platform sans-serif for body text, forms and navigation. Use Georgia for tournament names, entry titles, starter titles and champion names. No external font requests. Body text is 16px, controls and routine labels 14px, secondary metadata 12–13px. Field values remain at least 16px on phones.

Use 5px corners, 1px borders, and a small solid offset edge on the main scorecard. Use spacing in roughly 4px increments. Avoid decorative stars, emoji, tilted surfaces and promotional illustrations.

## Components

- Scorecard: navy match header, two seeded entries, choice state, saved-vote message and explicit host controls. Entries stay readable when names wrap.
- Round strip: real round numbers, selected round in cobalt, completed rounds with a check.
- Tournament board: compact matchups connected across rounds. Constrain horizontal scrolling to the board.
- Champion: gold medal and border with serif winner name; preserve sharing actions.
- Setup: one clear form, the two modes, and review before starting.
- Home: saved brackets and usable starter lists. The sample scorecard is an illustration, never a live result.

## Responsive and accessible behavior

Stack page columns below tablet width. Keep matchup choices side by side on phones, wrap long names and metadata, and provide 44px touch targets. Preserve keyboard focus rings and native inputs. Host decisions stay explicit.
