# Incog Shell - Design Tokens

These tokens are derived from the Paper `Incog` terminal direction and the current frontend CSS. Paper currently exposes no stored tokens, so this file is the reusable source of truth for future implementation.

## CSS Custom Properties

```css
:root {
  /* Color */
  --color-black: #050505;
  --color-shell: #0b0b0c;
  --color-panel: #111113;
  --color-panel-raised: #16161a;
  --color-border: #2a2a32;
  --color-border-strong: #3a3a46;
  --color-text: #e8e8f0;
  --color-muted: #9a9aa8;
  --color-dim: #5c5c68;
  --color-action: #f2f2f0;
  --color-action-ink: #080809;
  --color-signal: #c8ff57;
  --color-signal-dim: #a8d940;
  --color-signal-glow: rgba(200, 255, 87, 0.16);
  --color-danger: #ff5757;
  --color-info: #57a8ff;
  --color-private: #a857ff;

  /* Semantic color aliases */
  --surface-canvas: var(--color-black);
  --surface-shell: var(--color-shell);
  --surface-panel: var(--color-panel);
  --surface-raised: var(--color-panel-raised);
  --text-primary: var(--color-text);
  --text-secondary: var(--color-muted);
  --text-tertiary: var(--color-dim);
  --border-default: var(--color-border);
  --border-focus: var(--color-action);
  --accent-status: var(--color-signal);

  /* Font families */
  --font-mono: "Departure Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  --font-sans: var(--font-mono);
  --font-serif: var(--font-mono);

  /* Font sizes */
  --text-micro: 11px;
  --text-label: 12px;
  --text-caption: 13px;
  --text-body: 14px;
  --text-output: 15px;
  --text-body-lg: 16px;
  --text-section: 18px;
  --text-shell-title: 32px;
  --text-display: 56px;

  /* Line heights */
  --leading-micro: 16px;
  --leading-label: 18px;
  --leading-caption: 18px;
  --leading-body: 22px;
  --leading-output: 24px;
  --leading-body-lg: 24px;
  --leading-section: 24px;
  --leading-shell-title: 38px;
  --leading-display: 58px;

  /* Letter spacing */
  --tracking-tight: -0.04em;
  --tracking-title: -0.02em;
  --tracking-normal: 0;
  --tracking-label: 0.02em;
  --tracking-command: 0.04em;
  --tracking-micro: 0.08em;

  /* Font weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-black: 800;

  /* Spacing */
  --space-2: 2px;
  --space-4: 4px;
  --space-6: 6px;
  --space-8: 8px;
  --space-10: 10px;
  --space-12: 12px;
  --space-16: 16px;
  --space-20: 20px;
  --space-24: 24px;
  --space-28: 28px;
  --space-32: 32px;
  --space-40: 40px;
  --space-48: 48px;
  --space-64: 64px;

  /* Radius */
  --radius-none: 0;
  --radius-xs: 3px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-shell: 12px;
  --radius-round: 9999px;

  /* Layout */
  --terminal-max-width: 980px;
  --shell-max-width: 1396px; /* legacy room shell only */
  --shell-height-desktop: 856px; /* legacy room shell only */
  --monitor-width: 330px; /* legacy room shell only; do not use on Direction 2 landing */
  --mobile-width: 390px;
  --topbar-height: 48px;
  --composer-height: 68px;

  /* Shadows */
  --shadow-none: none;
  --shadow-focus: 0 0 0 1px var(--color-action);
  --shadow-signal: 0 0 24px var(--color-signal-glow);
}
```

## Tailwind v4 Theme Shape

```css
@theme {
  --font-mono: "Departure Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  --font-sans: Inter, Syne, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-serif: "Instrument Serif", Georgia, serif;

  --color-black: #050505;
  --color-shell: #0b0b0c;
  --color-panel: #111113;
  --color-panel-raised: #16161a;
  --color-border: #2a2a32;
  --color-border-strong: #3a3a46;
  --color-text: #e8e8f0;
  --color-muted: #9a9aa8;
  --color-dim: #5c5c68;
  --color-action: #f2f2f0;
  --color-action-ink: #080809;
  --color-signal: #c8ff57;
  --color-danger: #ff5757;
  --color-info: #57a8ff;
  --color-private: #a857ff;

  --breakpoint-sm: 390px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1440px;

  --container-mobile: 390px;
  --container-shell: 1396px;
  --container-monitor: 330px;

  --text-micro: 11px;
  --text-label: 12px;
  --text-caption: 13px;
  --text-body: 14px;
  --text-output: 15px;
  --text-body-lg: 16px;
  --text-section: 18px;
  --text-shell-title: 32px;
  --text-display: 56px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-black: 800;

  --tracking-tight: -0.04em;
  --tracking-title: -0.02em;
  --tracking-normal: 0;
  --tracking-label: 0.02em;
  --tracking-command: 0.04em;
  --tracking-micro: 0.08em;

  --leading-micro: 16px;
  --leading-label: 18px;
  --leading-caption: 18px;
  --leading-body: 22px;
  --leading-output: 24px;
  --leading-body-lg: 24px;
  --leading-section: 24px;
  --leading-shell-title: 38px;
  --leading-display: 58px;

  --radius-none: 0;
  --radius-xs: 3px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-shell: 0;
  --radius-round: 9999px;
}
```

## Design Tokens JSON

```json
{
  "color": {
    "black": { "$value": "#050505", "$type": "color", "$description": "Deep page background" },
    "shell": { "$value": "#0b0b0c", "$type": "color", "$description": "Primary terminal shell surface" },
    "panel": { "$value": "#111113", "$type": "color", "$description": "Output blocks, side panels, and form surfaces" },
    "panel-raised": { "$value": "#16161a", "$type": "color", "$description": "Raised or hovered panel surface" },
    "border": { "$value": "#2a2a32", "$type": "color", "$description": "Default graphite divider" },
    "border-strong": { "$value": "#3a3a46", "$type": "color", "$description": "Focused or active divider" },
    "text": { "$value": "#e8e8f0", "$type": "color", "$description": "Primary shell text" },
    "muted": { "$value": "#9a9aa8", "$type": "color", "$description": "Secondary labels and metadata" },
    "dim": { "$value": "#5c5c68", "$type": "color", "$description": "Inactive hints and low-emphasis text" },
    "action": { "$value": "#f2f2f0", "$type": "color", "$description": "Primary action fill in terminal layouts" },
    "action-ink": { "$value": "#080809", "$type": "color", "$description": "Text on the primary action fill" },
    "signal": { "$value": "#c8ff57", "$type": "color", "$description": "Rare focus and status accent" },
    "danger": { "$value": "#ff5757", "$type": "color", "$description": "Error and destructive state" },
    "info": { "$value": "#57a8ff", "$type": "color", "$description": "Informational state" },
    "private": { "$value": "#a857ff", "$type": "color", "$description": "Private or masked state when a separate state color is useful" }
  },
  "font": {
    "mono": { "$value": "Departure Mono, ui-monospace, monospace", "$type": "fontFamily", "$description": "Primary shell and chat UI family" },
    "sans": { "$value": "Inter, Syne, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily", "$description": "Secondary brand and landing family" },
    "serif": { "$value": "Instrument Serif, Georgia, serif", "$type": "fontFamily", "$description": "Rare expressive italic accent" }
  },
  "spacing": {
    "4": { "$value": "4px", "$type": "dimension" },
    "8": { "$value": "8px", "$type": "dimension" },
    "12": { "$value": "12px", "$type": "dimension" },
    "16": { "$value": "16px", "$type": "dimension" },
    "20": { "$value": "20px", "$type": "dimension" },
    "24": { "$value": "24px", "$type": "dimension" },
    "32": { "$value": "32px", "$type": "dimension" },
    "40": { "$value": "40px", "$type": "dimension" },
    "64": { "$value": "64px", "$type": "dimension" }
  },
  "radius": {
    "xs": { "$value": "3px", "$type": "dimension" },
    "sm": { "$value": "4px", "$type": "dimension" },
    "md": { "$value": "8px", "$type": "dimension" },
    "shell": { "$value": "12px", "$type": "dimension" },
    "round": { "$value": "9999px", "$type": "dimension" }
  }
}
```

## Migration Notes For Current CSS

The current `app/globals.css` variables can map to these tokens gradually:

| Existing | New |
| --- | --- |
| `--bg` | `--color-black` |
| `--bg-2` | `--color-panel` |
| `--bg-3` | `--color-panel-raised` |
| `--border` | `--color-border` |
| `--border-light` | `--color-border-strong` |
| `--text` | `--color-text` |
| `--text-muted` | `--color-muted` |
| `--text-dim` | `--color-dim` |
| `--accent` | `--color-signal` |
| `--red` | `--color-danger` |
| `--blue` | `--color-info` |
| `--purple` | `--color-private` |
