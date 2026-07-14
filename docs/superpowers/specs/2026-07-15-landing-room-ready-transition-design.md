# Landing-to-Room Ready Transition Design

## Goal

Make a successful room creation or successful `/join <room-id>` feel like a continuous terminal-state handoff instead of a page change. The landing content fades away while lifting slightly; the ready room surface then appears smoothly. The background shader must remain visibly continuous, and the landing and room composers must be visually indistinguishable throughout the handoff.

## Scope

- Trigger only after a create or join request succeeds and the destination room is ready for interaction.
- Cover both creation from the landing flow and direct joins initiated from the landing command flow.
- Keep the existing landing page visible while the request and destination-room initialization are still pending.
- Preserve the current URL, authentication, room creation, join, socket, and history behavior.
- Do not change the visual design, dimensions, typography, or behavior of either composer outside the brief transition.

## Visual Sequence

1. The user submits a valid create or join command. The landing keeps its current pending/success feedback; no transition starts yet.
2. After the room route is mounted, authenticated, has loaded its initial state, and can accept input, it signals `ready` to the transition coordinator.
3. The landing-specific content, including the `INKOG` mark and everything below it other than the composer anchor, fades to transparent and translates upward by a small amount.
4. The room surface fades in at its final geometry. Its transcript and room chrome may appear together, but must not translate or reflow during the visible handoff.
5. The persistent composer anchor releases to the room composer, focus transfers to the room input, and the landing route is removed from the visible transition state.

The transition uses a short, restrained ease (roughly 350–450 ms), with the room reaching full opacity at the end. There is no slide of the composer, no full-screen wipe, and no shader motion added specifically for navigation.

## Composer Continuity

- Treat the composer as the shared visual anchor rather than two independently animated bars.
- Keep its exact bounding box, padding, prompt glyph position, font metrics, caret behavior, colors, and background unchanged through the handoff.
- During the overlap, render one persistent visual composer shell in the transition layer. The route-local landing and room input elements remain responsible for their normal command and accessibility behavior, but only the persistent shell is visible until focus is handed to the ready room input.
- Measure and assert parity between the landing and room compositor tokens before enabling the transition. Any required alignment should be extracted to shared constants/components instead of duplicating values.

## Shader Continuity

- Hoist `AmbientShaderBackground` from route-local landing/room surfaces into a single persistent client transition provider mounted under the root layout.
- Maintain one `GrainGradient` canvas for the whole handoff. Do not mount a second canvas, crossfade canvases, reset uniforms, or recreate the shader on route change.
- Keep the existing route/theme color resolution and performance limits. Route changes may update the already-mounted shader's target colors only through the current interpolation mechanism.
- Remove or suppress only the redundant local shader mounts once the provider owns the background; the visual output must retain the current landing and room route-specific appearance.

## Architecture

- Add a client-side `RouteTransitionProvider` beneath the existing root providers. It owns the persistent shader, transition overlay, route handoff state, and reduced-motion preference.
- Expose a small transition API for the landing flow: begin a pending handoff once the API returns the room ID, then navigate to `/room/<id>` without starting the visible animation.
- The room page reports readiness only after its existing bootstrap path completes successfully: room fetch, password/authentication gate when applicable, initial history hydration, and the interactive room stage.
- The provider coordinates the visible sequence only when the pending destination room ID matches the ready room ID. Failed, expired, password-blocked, or cancelled room flows clear the pending handoff and retain their existing states without animation.
- Keep route concerns localized: the landing starts a handoff, the room reports readiness, and the provider owns animation. Do not introduce a global router replacement or replace the current Next App Router navigation.

## Performance and Accessibility

- Animate only `opacity` and `transform` on the landing content and room reveal. Do not animate layout, dimensions, blur, filters, clip paths, or shader properties for the transition.
- Do not add a `requestAnimationFrame` loop, polling loop, extra socket connection, image preload, or GPU canvas.
- Do not delay room initialization, request completion, or input readiness for cosmetic timing. If the room is ready before the animation completes, it remains interactive only once the composer focus transfer occurs at the end.
- Under `prefers-reduced-motion`, skip the lift and use a near-immediate opacity handoff after readiness while retaining the same shader and composer continuity.
- Preserve focus, keyboard behavior, and screen-reader semantics. Mark outgoing landing content inert during the handoff and avoid duplicate visible input controls.

## Testing and Verification

- Add focused unit tests for handoff state transitions: pending, matching ready destination, failed/mismatched destination, password gate, expired/error, completion, and reduced motion.
- Add source/component contract tests that assert one shared shader mount during a route handoff and shared composer geometry tokens.
- Extend room bootstrap tests so `ready` cannot fire before the room is interactive.
- Run the focused transition, ambient shader, landing command, and room composer tests; then run `npm run build` and `git diff --check`.
- Reuse the existing `127.0.0.1:3000` listener for browser verification. Confirm a create and a join stay on landing while pending; then confirm the mark/content lifts and fades only after the room is interactive, the composer has no visible geometry change, exactly one shader canvas stays mounted, the shader does not blink/restart, and the room is responsive immediately after the handoff.

## Out of Scope

- WebGPU image-plane transitions, a new router, full-screen wipes, changes to room creation or join APIs, new shader effects, persistent loading overlays, reverse room-to-landing animation, and unrelated landing/room redesign.
