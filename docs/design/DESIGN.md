# Incog Shell - Design Reference
> Private chat as a local command line: compact, inspectable, anonymous, and intentionally quiet.

**Primary reference:** Paper file `Incog`, artboard `14 Desktop Terminal Direction - Classic Shell`, revised into a browser-native terminal landing flow.  
**Supporting reference:** Steep-style documentation structure and token taxonomy supplied in the prompt  
**Theme:** dark terminal

Incog Shell turns an anonymous chat product into a private local console. The UI should feel less like a social feed and more like a command prompt where the user types `create` or `join` and the product responds inline. The mood is austere, privacy-first, and quiet: a black workspace, mono text everywhere, a single accent color for prompts and focus, and no dashboard chrome.

The design avoids decorative chrome. Its personality comes from terminal conventions: prompt markers, command history, inline flags, stdout-style responses, and matter-of-fact system copy. Use visual restraint as the privacy signal.

## Design Principles

### Local First
The interface should imply that nothing leaves the current room unless the user chooses to share it. Use labels like `local-only`, `masked`, `no profile sync`, `private room`, and `expires` as UI state, not marketing copy.

### Command Clarity
Actions read as executable commands: `ask --anonymous`, `note --mask-source`, `share --room`, `poll --create`. This makes the app feel precise and gives users a clear mental model.

### Quiet Inspection
Room setup should reveal only what is needed to act. On the landing flow, avoid sidebars, process monitors, and explanatory panels. Let command output and inline flags carry state.

### Compact Trust
The system should not feel oversized or salesy. Favor compact spacing, one-line labels, thin borders, and small controls. Trust comes from specificity and restraint.

## Visual Direction

| Attribute | Direction |
| --- | --- |
| Mood | private command line, secure local session |
| Canvas | full-browser near-black terminal |
| Surfaces | minimal black surfaces; no framed window chrome |
| Typography | mono-only across brand, commands, fields, and output |
| Accent | muted lime for prompt, focus, and active command only |
| Shape | no decorative cards; only functional input underlines/dividers |
| Density | compact, calm, and uncluttered |

## Layout System

### Desktop Terminal Landing

Use a full-browser terminal canvas.

- Page background: pure black or near-black.
- No Mac-style traffic lights, top chrome, or framed shell window.
- No process monitor/sidebar on the landing flow.
- Main content is a constrained terminal column, not a dashboard grid.
- User types `create`, `join`, `help`, or `clear` at the prompt.
- Room setup appears as inline command flags below the prompt history.
- Command input anchors near the bottom of the terminal column.

### Mobile Chat

Use the same terminal language, translated into a phone-scale room.

- Full-height black canvas.
- Header carries room ID, expiry, and member count.
- Messages are stacked as compact command output blocks.
- Composer is a single command row with a strong send affordance.
- Secondary tools such as polls and share live behind compact icon or text commands.

### Landing / Room Creation

Direction 2 should behave like a terminal launch screen.

- Replace broad marketing language with one quiet prompt.
- Avoid panels, cards, sidebars, and launch transcript blocks.
- Typing `create` reveals flags for topic, expiry, member limit, and password.
- Typing `join` reveals a single room id/link input.
- Enter submits the active command or form.

## Core Components

### Command Transcript
Main content area for prompts, system replies, and inline setup. Commands begin with `$`; output lines use `>` or `error:`. Keep the transcript short on landing.

### Stdout Block
Used for composed or generated output. Slightly lighter surface, 1px border, 18-20px padding, mono body text, no shadow.

### Command Composer
Single-line input with a `$` prompt marker. No visible submit button is required on landing; Enter should run the command.

### Privacy Flags
Short labels such as `masked`, `off`, `local-only`, `3 files`, `expires 42m`. Treat these as system state, not decorative chips.

## Content Voice

Incog speaks like a precise assistant inside a private console.

- Use short, concrete labels.
- Prefer commands and states over paragraphs.
- Avoid hype, delight copy, or casual social-app language.
- Make privacy visible through operational wording.

Good examples:

- `identity masked`
- `memory off`
- `room expires in 42m`
- `messages appear as local commands`
- `all output generated in a private shell session`

Avoid:

- "Chat freely with your friends!"
- "Super fun anonymous conversations"
- "AI-powered social collaboration"

## Implementation Guidance

The current app already has a dark mono identity in `app/globals.css`. Future UI work should migrate toward the Paper reference by:

1. Reducing neon-lime usage to focus and status only.
2. Making white the primary action fill for shell contexts.
3. Using low-radius terminal panels instead of soft SaaS cards.
4. Turning chat affordances into command-like interactions.
5. Keeping landing metadata inside command output rather than a persistent sidebar.

## Source Notes

The Paper file currently exposes no formal design tokens through Paper MCP, so the token docs in this folder are derived from:

- The visible Paper artboard style.
- The current frontend CSS variables.
- The supplied Steep reference format and token taxonomy.
