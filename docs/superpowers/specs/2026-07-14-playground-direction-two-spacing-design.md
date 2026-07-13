# Playground Direction 2 Spacing Design

## Goal

Refine the Direction 2 `/playground` layout at the reported 1428×846 viewport without changing behavior or Direction 1.

## Design

- Lower the terminal frame by reducing the Direction 2 terminal wrapper bottom padding from `pb-6` to `pb-3`.
- Reduce the hidden desktop intro header top padding by 12px, from `pt-8` to `pt-5`.
- Reduce the vertical gap between desktop intro highlight rows by 2px, from `space-y-6` to `space-y-4`.
- Preserve existing breakpoints, colors, animation, transcript behavior, and all unrelated uncommitted changes.

## Verification

Run the focused Direction 2 layout tests, then inspect `/playground` through the existing `127.0.0.1:3000` listener. Do not create a fallback port.
