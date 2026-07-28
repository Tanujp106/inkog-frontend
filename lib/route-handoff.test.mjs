import assert from "node:assert/strict";
import test from "node:test";

test("exposes a route handoff state machine and shared composer geometry", async () => {
  const routeHandoff = await import("./route-handoff.mjs").catch(() => ({}));

  assert.equal(typeof routeHandoff.createRouteHandoffState, "function");
  assert.equal(typeof routeHandoff.reduceRouteHandoff, "function");
  assert.equal(typeof routeHandoff.getRouteForegroundStyle, "function");
  assert.equal(typeof routeHandoff.getRouteComposerStyle, "function");
});

test("moves a matching room handoff through leave, wait, enter, and completion", async () => {
  const { createRouteHandoffState, reduceRouteHandoff } = await import("./route-handoff.mjs");
  const idle = createRouteHandoffState();
  const leaving = reduceRouteHandoff(idle, { type: "begin", roomId: "abc123" });
  const pending = reduceRouteHandoff(leaving, { type: "left", roomId: "abc123" });
  const entering = reduceRouteHandoff(pending, { type: "ready", roomId: "abc123" });
  const complete = reduceRouteHandoff(entering, { type: "complete", roomId: "abc123" });

  assert.deepEqual(idle, { phase: "idle", roomId: null });
  assert.deepEqual(leaving, { phase: "leaving", roomId: "abc123" });
  assert.deepEqual(pending, { phase: "pending", roomId: "abc123" });
  assert.deepEqual(entering, { phase: "entering", roomId: "abc123" });
  assert.deepEqual(complete, { phase: "idle", roomId: null });
});

test("ignores readiness for a different destination and cancels safely", async () => {
  const { createRouteHandoffState, reduceRouteHandoff } = await import("./route-handoff.mjs");
  const pending = { phase: "pending", roomId: "abc123" };

  assert.deepEqual(
    reduceRouteHandoff(pending, { type: "ready", roomId: "wrong1" }),
    pending,
  );
  assert.deepEqual(
    reduceRouteHandoff(pending, { type: "cancel" }),
    createRouteHandoffState(),
  );
});

test("fades only route foregrounds while leaving composer geometry untouched", async () => {
  const { getRouteForegroundStyle } = await import("./route-handoff.mjs");

  assert.deepEqual(
    getRouteForegroundStyle({
      state: { phase: "leaving", roomId: "abc123" },
      surface: "landing",
    }),
    {
      opacity: 0,
      transition: "opacity 120ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
  );
  assert.deepEqual(
    getRouteForegroundStyle({
      state: { phase: "pending", roomId: "abc123" },
      surface: "landing",
    }),
    {
      opacity: 0,
      transition: "none",
    },
  );
  assert.deepEqual(
    getRouteForegroundStyle({
      state: { phase: "pending", roomId: "abc123" },
      surface: "room",
      roomId: "abc123",
    }),
    {
      opacity: 0,
      transition: "none",
    },
  );
  assert.deepEqual(
    getRouteForegroundStyle({
      state: { phase: "entering", roomId: "abc123" },
      surface: "room",
      roomId: "abc123",
    }),
    {
      opacity: 1,
      transition: "opacity 160ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
  );
});

test("uses one fixed composer layout at desktop and mobile widths", async () => {
  const { getRouteComposerStyle } = await import("./route-handoff.mjs");

  assert.deepEqual(getRouteComposerStyle(), {
    bottom: "24px",
    left: "50%",
    maxWidth: "1120px",
    position: "fixed",
    transform: "translateX(-50%)",
    width: "min(calc(100vw - 5rem), 1120px)",
    zIndex: 20,
  });
});

test("reduces the handoff to an effectively immediate opacity change", async () => {
  const { getRouteForegroundStyle } = await import("./route-handoff.mjs");

  assert.deepEqual(
    getRouteForegroundStyle({
      reducedMotion: true,
      state: { phase: "pending", roomId: "abc123" },
      surface: "landing",
    }),
    {
      opacity: 0,
      transition: "opacity 1ms linear",
    },
  );
  assert.deepEqual(
    getRouteForegroundStyle({
      reducedMotion: true,
      state: { phase: "entering", roomId: "abc123" },
      surface: "room",
      roomId: "abc123",
    }),
    {
      opacity: 1,
      transition: "opacity 1ms linear",
    },
  );
});
