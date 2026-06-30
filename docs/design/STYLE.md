# Incog Shell - Style Guide

## Quick Read

Incog Direction 2 should look like a private terminal session rather than a generic chat app or dashboard. The design is black, mono-only, compact, and command-driven. The prompt, command history, and inline flags carry the interface.

## Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Page black | `--color-black` | `#050505` | Browser background and deepest shell regions |
| Shell | `--color-shell` | `#0b0b0c` | Primary terminal surface |
| Panel | `--color-panel` | `#111113` | Output blocks, forms, side panels |
| Raised panel | `--color-panel-raised` | `#16161a` | Hovered panels and elevated controls |
| Border | `--color-border` | `#2a2a32` | Default 1px dividers |
| Border strong | `--color-border-strong` | `#3a3a46` | Focused or active borders |
| Text | `--color-text` | `#e8e8f0` | Primary text |
| Muted text | `--color-muted` | `#9a9aa8` | Secondary labels and metadata |
| Dim text | `--color-dim` | `#5c5c68` | Inactive hints |
| Action white | `--color-action` | `#f2f2f0` | Primary shell button fill |
| Action ink | `--color-action-ink` | `#080809` | Text on white action |
| Signal | `--color-signal` | `#c8ff57` | Rare focus/status accent |
| Danger | `--color-danger` | `#ff5757` | Errors and destructive actions |

## Typography

### IBM Plex Mono / DM Mono - Shell Voice

Use mono type for all Direction 2 UI, including brand text, headings, command labels, fields, output, buttons, and status copy.

- 11px for micro metadata.
- 12px for labels and side-panel rows.
- 14px for chat body and form controls.
- 16px for important output.
- 30-38px only when a terminal heading is truly needed. Direction 2 landing should usually stay closer to 14-16px terminal text.

## Type Recipes

| Role | Font | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Micro | Mono | 11px | 400 | 16px | 0.08em |
| Label | Mono | 12px | 400 | 18px | 0.02em |
| Body | Mono | 14px | 400 | 22px | 0 |
| Output | Mono | 15px | 400 | 24px | 0 |
| Section title | Mono | 18px | 700 | 24px | 0 |
| Shell title | Mono | 32px | 700 | 38px | 0 |
| Terminal brand | Mono | 15px | 400 | 24px | 0 |

## Spacing

Use a 4px base grid.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-4` | 4px | tight icon gaps |
| `--space-8` | 8px | label/control gaps |
| `--space-12` | 12px | compact row spacing |
| `--space-16` | 16px | field padding, row groups |
| `--space-20` | 20px | output block padding |
| `--space-24` | 24px | panel padding |
| `--space-32` | 32px | section padding |
| `--space-40` | 40px | desktop shell content inset |
| `--space-64` | 64px | major vertical separation |

## Radius

The Paper reference uses low-radius terminal geometry. Keep corners intentional and restrained.

| Element | Radius |
| --- | --- |
| Terminal landing canvas | 0 |
| Panels | Avoid on landing |
| Inputs | 0 |
| Buttons | 0 |
| Mobile cards | 8px maximum |
| Pills | Only for avatars or rare status dots |

## Borders And Elevation

Use borders, not shadows.

- Use borders only when they represent a real terminal divider or input underline.
- Do not wrap the Direction 2 landing in a window frame.
- Do not use Mac traffic-light chrome.
- Avoid large drop shadows in shell screens.
- If focus is needed, use the lime signal on an underline or ring.

## Component Rules

### Buttons

Direction 2 landing actions should mostly be typed commands. If a visible action is needed, render it like terminal text rather than a filled CTA.

```css
.button-command {
  background: transparent;
  color: var(--color-signal);
  border: 0;
  font: 400 14px/24px var(--font-mono);
}
```

Use the lime signal for prompt markers, active command text, and focused input underlines. Do not introduce secondary accent systems.

### Inputs

Inputs should feel like command lines.

- Transparent or black background.
- Underline only when structure is needed.
- Prompt marker at the left when possible.
- Placeholder text uses dim color.
- Submit happens with Enter.

### Message Rows

Messages do not need bubbles. Use command-output rhythm:

- User input: `$ ask --anonymous "message"`
- Assistant/system output: `assistant: message`
- System events: `system: alias joined`
- Long generated text: stdout block.

## Do

- Use mono type for the interface core.
- Keep the background close to black.
- Make privacy state visible only when it helps the current command.
- Use thin dividers sparingly.
- Treat actions as commands.
- Reserve lime for prompt, active command, and focus.
- Let Enter be the primary action.

## Don't

- Do not make chat bubbles the main visual language.
- Do not use soft pastel data-card styling inside the terminal shell.
- Do not turn every state into a rounded badge.
- Do not use heavy shadows or glassmorphism.
- Do not overuse the lime accent.
- Do not write promotional copy where a state label would work.
- Do not add a process monitor, right sidebar, launch transcript panel, Mac chrome, or framed terminal window to Direction 2 landing.
- Do not use sans or serif type in Direction 2 landing.

## Example Prompts For Future UI Work

1. Create a Direction 2 landing screen as a full-browser terminal: black page, mono-only text, no inner frame, no top chrome, one prompt, command history, and inline `create`/`join` setup.

2. Create a mobile anonymous chat room using command-output message rows instead of bubbles. Header shows room ID, expiry, and online count. Composer uses a prompt marker and compact send control.

3. Create a room creation form as command flags: topic, expiry, password, and member limit inside a bordered terminal panel. Primary action is white fill, secondary action is muted text.
