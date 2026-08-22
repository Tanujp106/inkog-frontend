import assert from "node:assert/strict";
import test from "node:test";

test("exposes a route handoff state machine and shared composer geometry", async () => {
  const routeHandoff = await import("./route-handoff.mjs").catch(() => ({}));

  assert.equal(typeof routeHandoff.createRouteHandoffState, "function");
  assert.equal(typeof routeHandoff.reduceRouteHandoff, "function");
  assert.equal(typeof routeHandoff.getLandingHandoffStyle, "function");
  assert.equal(typeof routeHandoff.getRoomHandoffStyle, "function");
  assert.equal(typeof routeHandoff.getRouteStatusPresentation, "function");
  assert.equal(typeof routeHandoff.getRouteComposerStyle, "function");
});

test("keeps the landing present until a matching room reports readiness", async () => {
  const { createRouteHandoffState, reduceRouteHandoff } = await import("./route-handoff.mjs");
  const idle = createRouteHandoffState();
  const pending = reduceRouteHandoff(idle, { type: "begin", roomId: "abc123" });
  const transitioning = reduceRouteHandoff(pending, { type: "ready", roomId: "abc123" });
  const settled = reduceRouteHandoff(transitioning, { type: "complete", roomId: "abc123" });
  const complete = reduceRouteHandoff(settled, { type: "cleanup", roomId: "abc123" });

  assert.deepEqual(idle, { phase: "idle", roomId: null });
  assert.deepEqual(pending, { phase: "pending", roomId: "abc123" });
  assert.deepEqual(transitioning, { phase: "transitioning", roomId: "abc123" });
  assert.deepEqual(settled, { phase: "settled", roomId: "abc123" });
  assert.deepEqual(complete, { phase: "idle", roomId: null });
});

test("keeps the outgoing landing hidden until its retained layer is removed", async () => {
  const { getLandingHandoffStyle } = await import("./route-handoff.mjs");
  const settled = { phase: "settled", roomId: "abc123" };

  assert.deepEqual(
    getLandingHandoffStyle({ part: "title", state: settled }),
    {
      opacity: 0,
      pointerEvents: "none",
      transform: "translateY(-14px)",
      transition: "none",
    },
  );
  assert.deepEqual(
    getLandingHandoffStyle({ part: "composer", state: settled }),
    {
      opacity: 0,
      pointerEvents: "none",
      transform: "translateX(-50%)",
      transition: "none",
    },
  );
});

test("keeps the destination at its final pose while the outgoing layer is removed", async () => {
  const { getRoomHandoffStyle } = await import("./route-handoff.mjs");
  const settled = { phase: "settled", roomId: "abc123" };

  assert.deepEqual(
    getRoomHandoffStyle({ part: "header", roomId: "abc123", state: settled }),
    {
      opacity: 1,
      transform: "translateY(0)",
      transition: "none",
    },
  );
  assert.deepEqual(
    getRoomHandoffStyle({ part: "composer", roomId: "abc123", state: settled }),
    {
      opacity: 1,
      transform: "translate(-50%, 0)",
      transition: "none",
    },
  );
});

test("keeps the route handoff active through the longest entrance animation", async () => {
  const { routeHandoffTransitionMs } = await import("./route-handoff.mjs");

  assert.equal(routeHandoffTransitionMs, 800);
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

test("does not move landing content or reveal room content while the destination is pending", async () => {
  const { getLandingHandoffStyle, getRoomHandoffStyle } = await import("./route-handoff.mjs");

  assert.deepEqual(
    getLandingHandoffStyle({
      part: "title",
      state: { phase: "pending", roomId: "abc123" },
    }),
    {},
  );
  assert.deepEqual(
    getRoomHandoffStyle({
      part: "header",
      state: { phase: "pending", roomId: "abc123" },
      roomId: "abc123",
    }),
    {
      opacity: 0,
      pointerEvents: "none",
      transform: "translateY(-8px)",
    },
  );
});

test("orders the landing exit from USP rows to body copy to title", async () => {
  const { getLandingHandoffStyle } = await import("./route-handoff.mjs");
  const state = { phase: "transitioning", roomId: "abc123" };
  const bottomUsp = getLandingHandoffStyle({ part: "usp", order: 0, state });
  const nextUsp = getLandingHandoffStyle({ part: "usp", order: 1, state });
  const body = getLandingHandoffStyle({ part: "body", state });
  const title = getLandingHandoffStyle({ part: "title", state });

  assert.equal(bottomUsp.transitionDelay, "0ms");
  assert.equal(nextUsp.transitionDelay, "45ms");
  assert.equal(body.transitionDelay, "135ms");
  assert.equal(title.transitionDelay, "210ms");
  assert.equal(title.opacity, 0);
  assert.equal(title.transform, "translateY(-14px)");
});

test("orders the room entrance from navbar to transcript to composer", async () => {
  const { getRoomHandoffStyle } = await import("./route-handoff.mjs");
  const state = { phase: "transitioning", roomId: "abc123" };
  const header = getRoomHandoffStyle({ part: "header", roomId: "abc123", state });
  const transcript = getRoomHandoffStyle({ part: "transcript", roomId: "abc123", state });
  const composer = getRoomHandoffStyle({ part: "composer", roomId: "abc123", state });

  assert.equal(header.transitionDelay, "280ms");
  assert.equal(transcript.transitionDelay, "360ms");
  assert.equal(composer.transitionDelay, "440ms");
  assert.equal(header.opacity, 1);
  assert.equal(header.transform, "translateY(0)");
  assert.equal(composer.transform, "translate(-50%, 0)");
});

test("presents create and join activity as live landing terminal statuses", async () => {
  const { getRouteStatusPresentation } = await import("./route-handoff.mjs");

  assert.deepEqual(
    getRouteStatusPresentation("create"),
    { ariaLabel: "Creating private room", text: "creating private room..." },
  );
  assert.deepEqual(
    getRouteStatusPresentation("join"),
    { ariaLabel: "Joining room", text: "joining room..." },
  );
});

test("uses one fixed composer layout at desktop and mobile widths", async () => {
  const { getRouteComposerStyle } = await import("./route-handoff.mjs");

  assert.deepEqual(getRouteComposerStyle(), {
    bottom: "24px",
    left: "50%",
    maxWidth: "1200px",
    position: "fixed",
    transform: "translateX(-50%)",
    width: "min(calc(100vw - var(--route-composer-inline-gutter)), 1200px)",
    zIndex: 20,
  });
});

test("removes movement, shimmer timing, and stagger under reduced motion", async () => {
  const { getLandingHandoffStyle, getRoomHandoffStyle } = await import("./route-handoff.mjs");
  const state = { phase: "transitioning", roomId: "abc123" };

  assert.deepEqual(
    getLandingHandoffStyle({
      part: "title",
      reducedMotion: true,
      state,
    }),
    {
      opacity: 0,
      transition: "opacity 1ms linear",
    },
  );
  assert.deepEqual(
    getRoomHandoffStyle({
      part: "transcript",
      reducedMotion: true,
      roomId: "abc123",
      state,
    }),
    {
      opacity: 1,
      transition: "opacity 1ms linear",
    },
  );
});
