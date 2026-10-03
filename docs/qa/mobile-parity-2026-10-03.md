# Mobile parity audit — October 3, 2026

Compared the running Inkog frontend on `127.0.0.1:3000` with desktop, using the existing backend on `127.0.0.1:3001`. The served checkout is `/Users/tanuj/Desktop/Projects/Inkog/inkog-frontend`.

## Gaps fixed

| Before | After |
| --- | --- |
| Mobile used a shorter headline and three different feature descriptions. | Both layouts render the same headline and feature strings. Exact rendered text comparison passed. |
| Tapping mobile Create started a separate guided flow and printed setup progress rows. | Mobile uses desktop's inline continuation. Partial fields stay in the composer; a real complete command creates and enters a room. |
| Homepage native input was 14px; its transparent text mirror had separate sizing. | Input, mirror, guided preview, and inline hints use 16px on phone and landscape keyboard layouts. Desktop retains 14px. |
| Keyboard could cover the homepage composer or resize its surrounding layout. | Visual viewport events move the composer above the keyboard, preserve the intro's layout height, and scroll content above the composer. Programmatic focus uses `preventScroll`. |
| Landscape phones lost mobile keyboard handling. | Keyboard handling includes widths through 1024px when height is at most 500px. Homepage presentation still switches at 640px. |
| Long mobile commands clipped their tappable inline hint. | The visible step question also provides a Continue command action using the same completion logic. |
| The room composer was fixed to the layout viewport; browser panning could move the header out of view. | Mobile room shell follows the visible viewport, header stays above its scrolling transcript, and composer is positioned inside the shell. |
| Newest room messages and polls could sit behind the floating composer. | Transcript bottom space follows actual composer height and bottom gap, including menus and status text. |
| Short room menus clipped options; arrow navigation could select an invisible command. | Menu scrolls, rows retain their height, and selected options stay visible during navigation, opening, and resizing. |
| Command help advertised four theme choices while the interface offers five. | Help lists `/style <1-5>`. |
| Room transcript always scrolled smoothly. | Reduced-motion preference uses immediate scrolling; normal preference retains smooth scrolling. |

## Verification

| Scenario | Evidence / result |
| --- | --- |
| Homepage copy parity | Rendered mobile and desktop headline/features normalized to the same text. |
| Responsive homepage | 320×568, 375×812, 390×844, 430×932, 639×800, 640×800, 768×1024, 844×390, 1440×900 checked; no horizontal page overflow, one visible header. |
| Responsive room | 320×568, 390×844, 430×932, 640×800, 844×390, 1440×900 checked; no horizontal page overflow, header top remains 0, composer remains inside viewport. |
| Keyboard-sized homepage | Focused input at 390×844 then resized to 390×450. Intro height remained 409.5px, layout minimum stayed 844px, content scrolled, composer bottom was 438px. |
| Keyboard-sized room | 390×450 and 390×250. Header remained at top; composer remained inside visible area. Last selected menu option fit entirely within its 50px-high menu. |
| iOS overlay / Android resize / viewport panning | Eight viewport behavior tests cover overlay inset, resized window, offset viewport, browser chrome, keyboard closure, orientation, batched events/cleanup, and missing visualViewport fallback. |
| Create | Mobile menu uses inline command continuation without setup transcript rows. Partial entry, long title, emoji, mobile submit activation and Continue command action checked. Real room created and joined. |
| Validation / cancellation | Invalid timer, invalid room ID, unknown command, Escape and Clear checked. Member-range expectations updated to the current 2–30 contract. Existing parser tests cover malformed/partial fields and password choices. |
| Join | Desktop joined the room created on mobile. Protected room redirected to the password prompt; incorrect password produced feedback; correct password successfully joined. A full fixture showed capacity copy. |
| Help | Homepage inline question entry and room Help entry checked. Seeded mixed help question/answer transcript checked at mobile size. Existing help rendering and fallback tests passed. Live external-provider timing was not benchmarked in this audit. |
| Style / Sound | Homepage and room commands checked, including sound status and theme change. Original blue theme restored after checks. |
| Room messages / polls | Real room message and poll creation checked. Seeded poll creation and voting verified; selected option showed one vote. Newest poll cleared composer. |
| Dense transcript | Long paragraphs, long aliases, unbroken links/text, emoji, multilingual/RTL text, many polls and 40-person roster checked through existing development scenario. No horizontal page overflow. |
| Scroll / history | Dense transcript scrolled upward; header stayed at 0 and body stayed at 0. Manual history position was preserved instead of forcing follow. |
| Room actions | Invite copied with confirmation feedback; member popover opened; leave confirmation opened and canceled; creator action menu opened. The final native end-room confirmation check stalled the automation, so cancellation/closure was not claimed. Existing command/action tests cover creator permissions and closure behavior. |
| Expired / full room | Both rendered their respective copy without horizontal overflow. |
| Regression suite | `node --test --test-reporter=tap lib/*.test.mjs`: 360 passed, 0 failed. |
| Backend suite | `npm test`: 24 passed, 0 failed. |
| TypeScript / production | `npx tsc --noEmit` and `npm run build` passed. |
| Independent review | Read-only review found no remaining Critical or Important issues after fixes. |

The pre-change frontend snapshot had five failing tests: four stale participant-range expectations and one stale mobile transcript visibility expectation. These now reflect the current contract; changed mobile layout assertions reflect shared copy and scrolling behavior.

## Evidence and limits

Screenshots are saved locally at `/Users/tanuj/Desktop/Inkog/mobile-audit/home-mobile.jpg` and `/Users/tanuj/Desktop/Inkog/mobile-audit/room-mobile.jpg`. Local development controls are present in the captures.

The browser checks use Chromium responsive viewports. They do not reproduce an actual iPhone Safari keyboard, safe-area hardware, or native zoom animation. The 16px input sizing, visual viewport event handling, stable-height measurement and overlay/resizing tests establish the implemented mechanics; physical Safari and Android keyboard animation remain device checks. Browser zoom remains available.

Temporary audit rooms expire automatically. No room closure or user data deletion was performed. Backend help-latency edits from the previous task are separate from this frontend delivery.
