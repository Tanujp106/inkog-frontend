# Inkog mobile homepage and invite-flow stress test

**Run date:** October 2, 2026
**Scope:** Homepage commands and shared-room links; mobile-first behavior, with a desktop comparison. Room chat, polls, and other in-room commands are outside this pass.

## What changed

| Finding | Before | Change | Status |
| --- | --- | --- | --- |
| Mobile help answers and command results were missing from the page transcript. The submitted question and answer were pushed into the composer hint, where answers were capped at 120px and internally scrolled. | Mobile transcript was hidden; desktop showed the question and answer below the USPs. | Render the homepage transcript beneath the intro at mobile widths too. Keep the composer for the current step and short validation feedback. Let the page scroll so long answers remain readable. | **Fixed in code.** Source tests pass; desktop browser screenshot confirms placement. A post-fix 390px browser screenshot was not available in this run. |
| Mobile create progress was mostly visible only in the guided command preview. | Guided answers did not appear as transcript lines on mobile. | Add the create prompt and safe progress lines to the shared transcript; password values remain masked. | **Fixed in code.** Covered by the focused test suite; mobile visual check pending. |
| `/join` could not extract an ID from a link ending in `/`, a query, or a fragment. | The whole URL reached the API as the room ID and failed. | Parse bare six-character IDs and `/room/<id>` URLs; ignore trailing slash, query, and fragment; reject unrelated paths. | **Fixed.** Unit tests pass; a pasted shared URL reached the expected room in the browser. |
| A first-time guest opening a protected room link landed on the room page's password gate. | Password entry worked, but skipped the homepage journey the user asked for. | Redirect protected links without a saved token to `/?join=<id>`. The homepage shows room details and an inline masked password prompt; wrong passwords can be retried. A successful join token is saved before routing into the room. | **Fixed.** Browser-tested wrong password and successful entry. No modal is used. |
| A stale help response could arrive after the user cleared the homepage. | A pending result was not tied to the cleared transcript. | Invalidate pending help requests when the prompt is cleared or replaced. | **Hardening added.** Focused source-contract test passes; timing race was not reproduced in a browser. |

## Persona-based test cases

| ID | Persona / level | Scenario | Result |
| --- | --- | --- | --- |
| C01 | First-time phone visitor · basic/common | Open homepage; check title, USPs, slash composer, and command suggestions. | Baseline passed at 390px and 320px. The 320px picker requires horizontal scrolling to reach later commands. |
| C02 | Curious visitor · basic/common | Run `/help`; read the command list. | Command worked. Before the fix the list sat in the bottom composer; it now uses the transcript area. Unit tests pass. |
| C03 | Curious visitor · basic/common | Run `/help / What is Inkog?`; verify the submitted question and full answer below the USPs. | Before: mobile question was absent and answer was clipped in composer. After: answer renders in transcript; browser screenshot confirms at 719px, and mobile layout contract passes. |
| C04 | Room host · basic/common | Create a public room with `/create`; enter a multi-word topic, timer, participant limit, and no password. | Room created and entered in browser. Mobile guided flow had passed in the baseline 390px run; new progress transcript is code-tested, not re-captured at phone width. |
| C05 | Room host · medium/common | Enter an invalid `0`-minute expiry, then correct it. | “At least 15 minutes, please.” appeared and Backspace recovery worked in the baseline mobile run. |
| C06 | Invited guest · basic/common | Open a public share URL in a fresh browser origin. | Joined directly. Reached the temporary room; it later expired as expected. |
| C07 | Invited guest · medium/common | Use `/join`, then enter a bare room code. | Join prompt appeared. Code path is covered by unit tests; a later browser attempt used a room that had expired and correctly reached the expired-room screen. |
| C08 | Invited guest · medium/common | Paste `/join https://…/room/<id>/?source=…#…`. | Parsed the room ID and reached the room. The room expired later in the run. |
| C09 | First-time guest · hard/common | Open a password-protected share URL. | Redirected to the homepage with `/join / <id>`, room title, and an inline password prompt. No modal appeared. |
| C10 | First-time guest · hard/uncommon | Enter a wrong room password, then retry with the correct test password. | Wrong password showed an inline retry message; the correct password stored a guest token and opened the room. |
| C11 | Returning guest · medium/uncommon | Open a protected link after a valid room token is saved. | The room page accepts the saved token; implementation retains this path. Not separately retested after the first-visit flow. |
| C12 | Sound-sensitive visitor · basic/common | Run `/sound status`, `/sound off`, and `/sound status`. | Reported `sound: on`, then `sound: off`. Earlier baseline reload check also preserved the setting. |
| C13 | Theme explorer · basic/common | Run `/style 2`. | Theme changed to blue and confirmation appeared in the transcript. |
| C14 | Visitor resetting a session · basic/common | Run `/clear` after transcript output. | Removed previous lines and announced “Terminal cleared.” |
| C15 | Link with copied tracking suffix · medium/uncommon | Join using URL with trailing slash, query, and fragment. | Parser test and browser path passed. |
| C16 | Typo-prone visitor · medium/uncommon | Submit an unrelated URL or malformed `/room/` path. | Parser rejects it; focused unit test passes. Browser error-copy review remains pending. |
| C17 | Visitor with slow help response · hard/uncommon | Clear the terminal while `/help` is still pending. | Late result is ignored by the request guard. Guard is unit/source tested; race was not induced in browser. |
| C18 | Visitor with an expired or nonexistent invite · hard/common | Open a room URL that cannot be joined. | Expired-room screen works. Current copy says “wrapped up” for both expired and never-existing rooms, so it cannot explain which happened. |
| C19 | Narrow-screen visitor · hard/common | Read a long answer and long URL at 320px without the composer covering output. | Before: answer was confined to the 120px composer scroller. New layout uses the transcript and page scroll; exact post-fix 320px visual pass remains pending. |

## Verification evidence

- Focused Node tests: **108 passed, 0 failed** (`direction-two-mobile-composer`, `direction-two-mobile-layout`, `direction-two-shell`, `room-lookup`, `room-header-ui`).
- TypeScript: `tsc --noEmit --tsBuildInfoFile /tmp/inkog-tsconfig.tsbuildinfo` passed.
- `git diff --check` passed.
- Browser testing used the already-running local app. Tested help, sound, style, clear, public create, protected create, public invite entry, first-time protected invite, wrong/correct password, and a pasted URL with slash/query/fragment.
- The in-app browser viewport was 719px wide, just above Inkog’s 639px mobile breakpoint. Earlier 390px and 320px screenshots in this folder are **before the fix**. The current browser tool did not expose a viewport override, so I have not labeled desktop-width screenshots as mobile verification.
- The development-only Agentation button overlaps the lower-right composer edge in screenshots; it is a dev overlay, not an Inkog send control.

## Remaining design ideas

1. Keep the terminal transcript directly after the USPs on mobile. Give long help answers room to wrap, and let the page scroll while the composer remains anchored.
2. For protected links, keep the existing terminal language, show the room topic and password request inline, then preserve the room ID during retries. The current flow does this; showing the remaining room time beside the topic could make the invite feel more trustworthy.
3. On 320px screens, consider a two-row slash-command picker or a visible scroll cue so the last suggestions are easier to discover.
4. Make expired-link copy explain that the room may have expired or the link may be mistyped; the server response currently maps both cases to one screen.
5. Repeat browser screenshots at 390px and 320px after the fix, including a long help answer, active `/create`, protected invite retry, soft keyboard open, and keyboard dismissal. Test mobile rotation and safe-area behavior on a real device before treating those states as verified.

## Screenshots

The saved mobile screenshots capture the **before** state so the original problems remain reviewable:

- [390px homepage](./home-390.png)
- [390px help answer in composer](./help-answer-mobile-390.png)
- [320px help list](./help-list-mobile-320.png)
- [390px create prompt](./create-mobile-390.png)
- [390px pasted-URL failure](./join-url-error-mobile-390.png)
- [390px public invite](./public-link-mobile-390.png)
- [390px protected invite before redirect](./protected-link-mobile-390.png)
- [390px wrong password](./wrong-password-mobile-390.png)
- [1440px desktop help transcript](./help-desktop-1440.png)

The after-fix help transcript and protected-link prompt were visually captured in the live browser during this run, but this browser session exposed image output rather than a file-save path. The stored mobile files above are deliberately labeled as before-state evidence.
