import assert from "node:assert/strict";
import test from "node:test";

import {
  createRouteHandoffState,
  reduceRouteHandoff,
  reducedRouteHandoffDurationMs,
  routeComposerGeometry,
  routeHandoffDurationMs,
} from "./route-transition.mjs";

test("begins a pending room handoff without starting visible motion", () => {
  const state = reduceRouteHandoff(createRouteHandoffState(), { type: "begin", roomId: "abc123" });

  assert.deepEqual(state, {
    phase: "pending",
    roomId: "abc123",
    reducedMotion: false,
    durationMs: routeHandoffDurationMs,
    liftPx: 6,
  });
});

test("starts the visible handoff only for the matching ready room", () => {
  const pending = reduceRouteHandoff(createRouteHandoffState(), { type: "begin", roomId: "abc123" });

  assert.equal(reduceRouteHandoff(pending, { type: "ready", roomId: "wrong1" }), pending);
  assert.deepEqual(reduceRouteHandoff(pending, { type: "ready", roomId: "abc123" }), {
    ...pending,
    phase: "ready",
  });
});

test("ignores mismatched blocks and clears matching password, expired, or error destinations", () => {
  const pending = reduceRouteHandoff(createRouteHandoffState(), { type: "begin", roomId: "abc123" });

  assert.equal(reduceRouteHandoff(pending, { type: "blocked", roomId: "wrong1" }), pending);
  assert.deepEqual(reduceRouteHandoff(pending, { type: "blocked", roomId: "abc123" }), createRouteHandoffState());
});

test("completes only the active matching destination", () => {
  const ready = reduceRouteHandoff(
    reduceRouteHandoff(createRouteHandoffState(), { type: "begin", roomId: "abc123" }),
    { type: "ready", roomId: "abc123" },
  );

  assert.equal(reduceRouteHandoff(ready, { type: "complete", roomId: "wrong1" }), ready);
  assert.deepEqual(reduceRouteHandoff(ready, { type: "complete", roomId: "abc123" }), createRouteHandoffState());
});

test("a newer destination replaces an older pending handoff", () => {
  const first = reduceRouteHandoff(createRouteHandoffState(), { type: "begin", roomId: "abc123" });
  const second = reduceRouteHandoff(first, { type: "begin", roomId: "xyz789" });

  assert.equal(second.roomId, "xyz789");
  assert.equal(second.phase, "pending");
});

test("reduced motion removes lift and uses a near-immediate duration", () => {
  const reduced = reduceRouteHandoff(createRouteHandoffState(), { type: "reduced-motion", value: true });
  const pending = reduceRouteHandoff(reduced, { type: "begin", roomId: "abc123" });

  assert.equal(pending.reducedMotion, true);
  assert.equal(pending.durationMs, reducedRouteHandoffDurationMs);
  assert.equal(pending.liftPx, 0);
});

test("exports one shared composer geometry contract", () => {
  assert.deepEqual(routeComposerGeometry, {
    maxWidth: "1120px",
    horizontalPadding: "clamp(24px, 2.7778vw, 40px)",
    bottomPadding: "var(--route-composer-bottom-padding)",
    framePadding: "16px",
    fontSize: "14px",
    lineHeight: "24px",
  });
});
