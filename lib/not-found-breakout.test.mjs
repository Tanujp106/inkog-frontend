import assert from "node:assert/strict";
import test from "node:test";

import * as breakout from "./not-found-breakout.mjs";

const {
  BREAKOUT_HEIGHT,
  BREAKOUT_WIDTH,
  create404Bricks,
  createInitialBreakoutState,
  launchBreakout,
  loseBreakoutLife,
  movePaddle,
  restartBreakout,
  setPaddleFromPointer,
  stepBreakout,
} = breakout;

function withBallAtBrick(state, target, overrides = {}) {
  return {
    ...state,
    ball: {
      ...state.ball,
      x: target.x + target.width / 2,
      y: target.y + target.height + state.ball.radius - 1,
      vx: 0,
      vy: -360,
      ...overrides,
    },
  };
}

function strikeBrick(state, target) {
  return stepBreakout(withBallAtBrick(state, target), 1 / 120);
}

test("creates a hand-authored 9 by 13 404 with a large dense square footprint", () => {
  const bricks = create404Bricks(1200, 720);
  const compactBricks = create404Bricks(320, 200);
  const rows = new Set(bricks.map(brick => brick.row));
  const digits = new Set(bricks.map(brick => brick.digit));
  const left = Math.min(...bricks.map(brick => brick.x));
  const right = Math.max(...bricks.map(brick => brick.x + brick.width));

  assert.deepEqual([...rows], Array.from({ length: 13 }, (_, row) => row));
  assert.deepEqual([...digits], [0, 1, 2]);
  assert.ok(bricks.length >= 90 && bricks.length <= 110);
  assert.ok(bricks.every(brick => brick.width === brick.height && brick.isActive));
  assert.ok(right - left >= 1200 * 0.62);
  assert.ok(Math.min(...compactBricks.map(brick => brick.x)) >= 0);
  assert.ok(Math.max(...compactBricks.map(brick => brick.x + brick.width)) <= 320);
  assert.ok(Math.max(...compactBricks.map(brick => brick.y + brick.height)) <= 200);
});

test("resizes regenerated 404 geometry without reviving destroyed stable brick IDs", () => {
  const initial = launchBreakout(createInitialBreakoutState({ width: 1200, height: 720 }));
  const destroyedIds = new Set([initial.bricks[0].id, initial.bricks[27].id]);
  const changed = {
    ...initial,
    speedMultiplier: 1.4,
    events: ["brickA"],
    bricks: initial.bricks.map(brick => ({ ...brick, isActive: !destroyedIds.has(brick.id) })),
    paddle: { ...initial.paddle, x: 900, y: 660 },
    ball: { ...initial.ball, x: 1000, y: 600 },
  };
  const resized = breakout.resizeBreakout(changed, 640, 420);

  assert.equal(resized.width, 640);
  assert.equal(resized.height, 420);
  assert.equal(resized.mode, changed.mode);
  assert.equal(resized.lives, changed.lives);
  assert.equal(resized.speedMultiplier, 1.4);
  assert.deepEqual(resized.events, []);
  assert.deepEqual(resized.bricks.map(brick => brick.id), changed.bricks.map(brick => brick.id));
  assert.deepEqual(
    resized.bricks.filter(brick => !brick.isActive).map(brick => brick.id),
    [...destroyedIds],
  );
  assert.ok(resized.ball.x >= resized.ball.radius && resized.ball.x <= resized.width - resized.ball.radius);
  assert.ok(resized.ball.y >= resized.ball.radius && resized.ball.y <= resized.height - resized.ball.radius);
  assert.ok(resized.paddle.x >= resized.paddle.width / 2);
  assert.ok(resized.paddle.x <= resized.width - resized.paddle.width / 2);
});

test("launches from letters, numbers, space, enter, and arrow keys but not restart or modifiers", () => {
  for (const key of ["a", "Z", "0", "9", " ", "Enter", "ArrowLeft", "ArrowRight"]) {
    assert.equal(breakout.shouldLaunchBreakoutForKey(key), true, key);
  }

  for (const key of ["r", "R", "Shift", "Control", "Alt", "Meta", "CapsLock", ""]) {
    assert.equal(breakout.shouldLaunchBreakoutForKey(key), false, key);
  }
});

test("launches only from idle or waiting states and emits launch", () => {
  const idle = createInitialBreakoutState();
  const running = launchBreakout(idle);

  assert.equal(idle.mode, "idle");
  assert.equal(idle.ball.isActive, false);
  assert.equal(running.mode, "running");
  assert.equal(running.ball.isActive, true);
  assert.deepEqual(running.events, ["launch"]);
  assert.deepEqual(launchBreakout(running).events, []);

  const waiting = { ...running, mode: "waiting", ball: { ...running.ball, isActive: false } };
  assert.deepEqual(launchBreakout(waiting).events, ["launch"]);
});

test("moves the paddle faster with shift and clamps keyboard movement", () => {
  const state = launchBreakout(createInitialBreakoutState());
  const normal = movePaddle(state, 1, 0.1, false);
  const fast = movePaddle(state, 1, 0.1, true);
  const clamped = movePaddle({ ...state, paddle: { ...state.paddle, x: BREAKOUT_WIDTH } }, 1, 1, true);

  assert.ok(normal.paddle.x > state.paddle.x);
  assert.ok(fast.paddle.x > normal.paddle.x);
  assert.equal(clamped.paddle.x, BREAKOUT_WIDTH - clamped.paddle.width / 2);
});

test("clears stale events before paddle movement, including direction-zero and non-running paths", () => {
  const running = { ...launchBreakout(createInitialBreakoutState()), events: ["wall"] };
  const idle = { ...createInitialBreakoutState(), events: ["miss"] };

  assert.deepEqual(movePaddle(running, 1, 0.1).events, []);
  assert.deepEqual(movePaddle(running, 0, 0.1).events, []);
  assert.deepEqual(movePaddle(idle, 1, 0.1).events, []);
});

test("maps pointer movement to a clamped paddle center", () => {
  const state = launchBreakout(createInitialBreakoutState());

  assert.equal(setPaddleFromPointer(state, -100).paddle.x, state.paddle.width / 2);
  assert.equal(
    setPaddleFromPointer(state, BREAKOUT_WIDTH + 100).paddle.x,
    BREAKOUT_WIDTH - state.paddle.width / 2,
  );
  assert.equal(setPaddleFromPointer(state, 321).paddle.x, 321);
});

test("clears stale events before pointer movement, including the non-running path", () => {
  const running = { ...launchBreakout(createInitialBreakoutState()), events: ["paddle"] };
  const waiting = { ...createInitialBreakoutState(), mode: "waiting", events: ["brickB"] };

  assert.deepEqual(setPaddleFromPointer(running, 321).events, []);
  assert.deepEqual(setPaddleFromPointer(waiting, 321).events, []);
});

test("keeps the paddle and resting ball frozen outside the running state", () => {
  const idle = createInitialBreakoutState();
  const cleared = {
    ...idle,
    mode: "cleared",
    bricks: idle.bricks.map(brick => ({ ...brick, isActive: false })),
  };

  assert.deepEqual(movePaddle(idle, 1, 1, true), idle);
  assert.deepEqual(setPaddleFromPointer(idle, 700), idle);
  assert.deepEqual(movePaddle(cleared, -1, 1, true), cleared);
  assert.deepEqual(setPaddleFromPointer(cleared, 100), cleared);
});

test("emits wall and paddle events for their resolved collisions", () => {
  const running = launchBreakout(createInitialBreakoutState());
  const wallResult = stepBreakout(
    { ...running, ball: { ...running.ball, x: running.ball.radius - 1, y: 400, vx: -360, vy: 0 } },
    1 / 60,
  );
  assert.ok(wallResult.ball.vx > 0);
  assert.deepEqual(wallResult.events, ["wall"]);

  const paddleResult = stepBreakout(
    {
      ...running,
      ball: {
        ...running.ball,
        x: running.paddle.x + running.paddle.width * 0.3,
        y: running.paddle.y - running.ball.radius - 1,
        vx: 0,
        vy: 360,
      },
    },
    1 / 60,
  );
  assert.ok(paddleResult.ball.vy < 0);
  assert.ok(paddleResult.ball.vx > 0);
  assert.deepEqual(paddleResult.events, ["paddle"]);
});

test("emits brickA, brickB, and brickC from the 404's brick bands", () => {
  const running = launchBreakout(createInitialBreakoutState());

  for (const [row, event] of [[0, "brickA"], [1, "brickB"], [2, "brickC"]]) {
    const target = running.bricks.find(brick => brick.row === row);
    const result = strikeBrick(running, target);
    assert.equal(result.bricks.find(brick => brick.id === target.id).isActive, false);
    assert.deepEqual(result.events, [event]);
  }
});

test("increases ball speed after a brick and caps it at 1.7", () => {
  const running = launchBreakout(createInitialBreakoutState());
  const initialSpeed = Math.hypot(running.ball.vx, running.ball.vy);
  const afterOne = strikeBrick(running, running.bricks[0]);
  const almostClear = {
    ...running,
    bricks: running.bricks.map((brick, index) => ({ ...brick, isActive: index === 0 })),
  };
  const cleared = strikeBrick(almostClear, almostClear.bricks[0]);

  assert.ok(afterOne.speedMultiplier > 1);
  assert.ok(Math.hypot(afterOne.ball.vx, afterOne.ball.vy) > initialSpeed);
  assert.equal(cleared.speedMultiplier, 1.7);
  assert.ok(Math.abs(Math.hypot(cleared.ball.vx, cleared.ball.vy) - initialSpeed * 1.7) < 0.001);
});

test("emits brick and clear events after the final pixel", () => {
  const running = launchBreakout(createInitialBreakoutState());
  const target = running.bricks[0];
  const finalBrickState = {
    ...running,
    bricks: running.bricks.map((brick, index) => ({ ...brick, isActive: index === 0 })),
  };
  const result = strikeBrick(finalBrickState, target);

  assert.equal(result.bricks.filter(brick => brick.isActive).length, 0);
  assert.equal(result.mode, "cleared");
  assert.equal(result.ball.isActive, false);
  assert.deepEqual(result.events, ["brickA", "clear"]);
});

test("emits miss and preserves speed and destroyed bricks after a life loss", () => {
  const running = launchBreakout(createInitialBreakoutState());
  const withDestroyedPixel = {
    ...running,
    speedMultiplier: 1.4,
    bricks: running.bricks.map((brick, index) => ({ ...brick, isActive: index !== 0 })),
    ball: { ...running.ball, y: BREAKOUT_HEIGHT + running.ball.radius + 1, vy: 360 },
  };
  const firstMiss = stepBreakout(withDestroyedPixel, 1 / 60);

  assert.equal(firstMiss.mode, "waiting");
  assert.equal(firstMiss.lives, 2);
  assert.equal(firstMiss.bricks[0].isActive, false);
  assert.equal(firstMiss.ball.isActive, false);
  assert.equal(firstMiss.speedMultiplier, 1.4);
  assert.deepEqual(firstMiss.events, ["miss"]);
});

test("resets speed to one on restart and after the third miss", () => {
  const running = launchBreakout(createInitialBreakoutState());
  const changed = { ...running, speedMultiplier: 1.6, events: ["brickB"] };
  const restarted = restartBreakout(changed);
  const thirdMiss = loseBreakoutLife({ ...changed, lives: 1 });

  assert.equal(restarted.speedMultiplier, 1);
  assert.deepEqual(restarted.events, []);
  assert.equal(thirdMiss.mode, "idle");
  assert.equal(thirdMiss.lives, 3);
  assert.equal(thirdMiss.speedMultiplier, 1);
  assert.deepEqual(thirdMiss.events, ["miss"]);
});

test("exposes deterministic life loss independently from collision stepping", () => {
  const running = launchBreakout(createInitialBreakoutState());
  const changed = {
    ...running,
    bricks: running.bricks.map((brick, index) => ({ ...brick, isActive: index !== 0 })),
  };
  const waiting = loseBreakoutLife(changed);

  assert.equal(waiting.mode, "waiting");
  assert.equal(waiting.lives, 2);
  assert.equal(waiting.bricks[0].isActive, false);
  assert.equal(waiting.ball.isActive, false);
  assert.deepEqual(waiting.events, ["miss"]);
});
