export const BREAKOUT_WIDTH = 800;
export const BREAKOUT_HEIGHT = 520;

const BASE_BALL_SPEED = 360;
const BASE_PADDLE_SPEED = 340;
const FAST_PADDLE_SPEED = 620;
const MAX_FRAME_DELTA = 1 / 20;
const PHYSICS_STEP = 1 / 120;
const BRICK_EVENTS = ["brickA", "brickB", "brickC"];
const MIN_HUD_BOTTOM_CLEARANCE = 48;
const MAX_BALLS = 4;
const DEFAULT_PADDLE_TIER = 1;
const MAX_PADDLE_TIER = 2;
const COMBO_WINDOW_SECONDS = 1.4;
const PADDLE_WIDTH_SCALES = [0.82, 1, 1.26];

const DIGIT_PATTERNS = [
  [
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "111111111",
    "000000001",
    "000000001",
    "000000001",
    "000000001",
    "000000001",
    "000000001",
  ],
  [
    "011111110",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "011111110",
  ],
  [
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "100000001",
    "111111111",
    "000000001",
    "000000001",
    "000000001",
    "000000001",
    "000000001",
    "000000001",
  ],
];

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

export function createResponsiveBreakoutGeometry(width = BREAKOUT_WIDTH, height = BREAKOUT_HEIGHT) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const shortestSide = Math.min(safeWidth, safeHeight);
  const paddleWidth = Math.min(
    clamp(safeWidth * 0.14, 78, 112),
    Math.max(1, safeWidth - 16),
  );
  const paddleHeight = Math.min(clamp(shortestSide * 0.024, 8, 12), safeHeight);
  const ballRadius = Math.min(
    clamp(shortestSide * 0.014, 5, 9),
    safeWidth / 2,
    safeHeight / 2,
  );
  const targetBottomClearance = clamp(
    safeHeight * 0.09,
    MIN_HUD_BOTTOM_CLEARANCE,
    64,
  );
  const bottomClearance = Math.min(
    targetBottomClearance,
    Math.max(0, safeHeight - paddleHeight),
  );

  return {
    width: safeWidth,
    height: safeHeight,
    paddleY: safeHeight - bottomClearance - paddleHeight,
    paddleWidth,
    paddleHeight,
    ballRadius,
    bottomClearance,
  };
}

export function create404Bricks(width = BREAKOUT_WIDTH, height = BREAKOUT_HEIGHT) {
  const cell = clamp(Math.min(width * 0.0275, height * 0.04), 6, 28);
  const gap = Math.max(2, Math.round(cell * 0.18));
  const digitGap = cell * 0.5;
  const digitWidth = cell * 9 + gap * 8;
  const totalWidth = digitWidth * 3 + digitGap * 2;
  const formationHeight = cell * 13 + gap * 12;
  const startX = (width - totalWidth) / 2;
  const startY = clamp(height * 0.1, 12, Math.max(12, height - formationHeight - 80));
  const bricks = [];

  DIGIT_PATTERNS.forEach((pattern, digit) => {
    const digitX = startX + digit * (digitWidth + digitGap);

    pattern.forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (pixel !== "1") return;

        bricks.push({
          id: `${digit}-${rowIndex}-${columnIndex}`,
          digit,
          row: rowIndex,
          column: columnIndex,
          x: digitX + columnIndex * (cell + gap),
          y: startY + rowIndex * (cell + gap),
          width: cell,
          height: cell,
          isActive: true,
        });
      });
    });
  });

  return bricks;
}

export function getPaddleTierLabel(tier) {
  return ["small", "normal", "wide"][clamp(Math.round(tier ?? DEFAULT_PADDLE_TIER), 0, MAX_PADDLE_TIER)];
}

export function getBreakoutEnergyLevel(state) {
  const activeBallCount = getBallsFromState(state).filter(ball => ball.isActive).length;
  const combo = state.combo ?? 0;
  const multiBallEnergy = activeBallCount > 1 ? 1 : 0;
  const comboEnergy = (combo >= 4 ? 1 : 0) + (combo >= 8 ? 1 : 0);

  return Math.min(3, multiBallEnergy + comboEnergy);
}

export function createInitialBreakoutState({ width = BREAKOUT_WIDTH, height = BREAKOUT_HEIGHT } = {}) {
  const geometry = createResponsiveBreakoutGeometry(width, height);
  const paddleTier = DEFAULT_PADDLE_TIER;
  const paddle = createResponsivePaddle(geometry, geometry.width / 2, paddleTier);
  const ball = createRestingBall(paddle, geometry.ballRadius, 1, "ball-0");
  const balls = [ball];

  return {
    width: geometry.width,
    height: geometry.height,
    mode: "idle",
    lives: 3,
    speedMultiplier: 1,
    score: 0,
    combo: 0,
    comboTimer: 0,
    paddleTier,
    nextBallId: 1,
    events: [],
    impactEvents: [],
    bricks: create404Bricks(geometry.width, geometry.height),
    paddle,
    balls,
    ball,
  };
}

export function shouldLaunchBreakoutForKey(key) {
  if ([" ", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return true;
  return /^[a-z0-9]$/i.test(key) && key.toLowerCase() !== "r";
}

export function clientXToBreakoutX(clientX, bounds, gameWidth) {
  const width = Number(bounds?.width);
  const left = Number(bounds?.left);
  const safeGameWidth = Math.max(0, Number(gameWidth) || 0);

  if (!Number.isFinite(clientX) || !Number.isFinite(left) || !Number.isFinite(width) || width <= 0) {
    return safeGameWidth / 2;
  }

  return clamp(((clientX - left) / width) * safeGameWidth, 0, safeGameWidth);
}

export function shouldHandleBreakoutPointer(pointerType, isPointerActive) {
  if (pointerType === "mouse") return true;
  return (pointerType === "touch" || pointerType === "pen") && isPointerActive;
}

export function resizeBreakout(state, width, height) {
  const geometry = createResponsiveBreakoutGeometry(width, height);
  const nextWidth = geometry.width;
  const nextHeight = geometry.height;
  const scaleX = nextWidth / Math.max(1, state.width);
  const scaleY = nextHeight / Math.max(1, state.height);
  const activeById = new Map(state.bricks.map(brick => [brick.id, brick.isActive]));
  const paddleTier = state.paddleTier ?? DEFAULT_PADDLE_TIER;
  const paddle = createResponsivePaddle(geometry, state.paddle.x * scaleX, paddleTier);
  const speedMultiplier = state.speedMultiplier ?? 1;
  const balls = getBallsFromState(state).map((currentBall, index) => currentBall.isActive
    ? normalizeBallVelocity(
        {
          ...currentBall,
          id: currentBall.id ?? `ball-${index}`,
          x: clamp(
            currentBall.x * scaleX,
            geometry.ballRadius,
            nextWidth - geometry.ballRadius,
          ),
          y: clamp(
            currentBall.y * scaleY,
            geometry.ballRadius,
            nextHeight - geometry.ballRadius,
          ),
          radius: geometry.ballRadius,
        },
        BASE_BALL_SPEED * speedMultiplier,
      )
    : createRestingBall(paddle, geometry.ballRadius, speedMultiplier, currentBall.id ?? `ball-${index}`));

  return withBallAliases({
    ...state,
    width: nextWidth,
    height: nextHeight,
    speedMultiplier,
    paddleTier,
    events: [],
    impactEvents: [],
    bricks: create404Bricks(nextWidth, nextHeight).map(brick => ({
      ...brick,
      isActive: activeById.get(brick.id) ?? true,
    })),
    paddle,
    balls,
  }, balls);
}

export function launchBreakout(state) {
  const nextState = clearEvents(state);
  if (nextState.mode !== "idle" && nextState.mode !== "waiting") return nextState;

  const speedMultiplier = nextState.speedMultiplier ?? 1;
  const balls = getBallsFromState(nextState).map((currentBall, index) => normalizeBallVelocity(
    {
      ...currentBall,
      id: currentBall.id ?? `ball-${index}`,
      isActive: true,
      vx: currentBall.vx || 240,
      vy: -Math.abs(currentBall.vy || 300),
    },
    BASE_BALL_SPEED * speedMultiplier,
  ));

  return withBallAliases({
    ...nextState,
    speedMultiplier,
    mode: "running",
    events: ["launch"],
    balls,
  }, balls);
}

export function movePaddle(state, direction, deltaSeconds, isFast = false) {
  const nextState = clearEvents(state);
  if (nextState.mode !== "running" || direction === 0) return nextState;

  const speed = isFast ? FAST_PADDLE_SPEED : BASE_PADDLE_SPEED;
  return setPaddleFromPointer(nextState, nextState.paddle.x + direction * speed * deltaSeconds);
}

export function setPaddleFromPointer(state, pointerX) {
  const nextState = clearEvents(state);
  if (nextState.mode !== "running") return nextState;

  const halfWidth = nextState.paddle.width / 2;
  const nextX = clamp(pointerX, halfWidth, nextState.width - halfWidth);
  const paddle = { ...nextState.paddle, x: nextX };
  const balls = getBallsFromState(nextState).map((currentBall, index) => index === 0 && !currentBall.isActive
    ? {
        ...currentBall,
        x: nextX,
        y: paddle.y - currentBall.radius - 2,
      }
    : currentBall);

  return withBallAliases({
    ...nextState,
    paddle,
    balls,
  }, balls);
}

export function stepBreakout(state, deltaSeconds) {
  const nextState = clearEvents(state);
  if (
    nextState.mode !== "running"
    || !getBallsFromState(nextState).some(ball => ball.isActive)
  ) return nextState;

  const frameDelta = clamp(deltaSeconds, 0, MAX_FRAME_DELTA);
  const substepCount = Math.max(1, Math.ceil(frameDelta / PHYSICS_STEP));
  const substepDelta = frameDelta / substepCount;
  let steppedState = decayCombo(cloneState(nextState), frameDelta);

  for (let step = 0; step < substepCount; step += 1) {
    steppedState = advanceSubstep(steppedState, substepDelta);
    if (steppedState.mode !== "running") break;
  }

  return steppedState;
}

export function restartBreakout(state) {
  return createInitialBreakoutState({ width: state.width, height: state.height });
}

export function loseBreakoutLife(state) {
  return resolveMiss(clearEvents(state));
}

function createResponsivePaddle(geometry, x, paddleTier = DEFAULT_PADDLE_TIER) {
  const tier = clamp(Math.round(paddleTier), 0, MAX_PADDLE_TIER);
  const width = Math.min(
    geometry.paddleWidth * PADDLE_WIDTH_SCALES[tier],
    Math.max(1, geometry.width - 16),
  );

  return {
    x: clamp(
      x,
      width / 2,
      geometry.width - width / 2,
    ),
    y: geometry.paddleY,
    width,
    height: geometry.paddleHeight,
  };
}

function createRestingBall(paddle, radius, speedMultiplier = 1, id = "ball-0") {
  return normalizeBallVelocity(
    {
      id,
      x: paddle.x,
      y: paddle.y - radius - 2,
      radius,
      vx: 240,
      vy: -300,
      isActive: false,
    },
    BASE_BALL_SPEED * speedMultiplier,
  );
}

function clearEvents(state) {
  return { ...state, events: [], impactEvents: [] };
}

function getBallsFromState(state) {
  if (Array.isArray(state.balls) && state.balls.length > 0) {
    if (state.ball && state.ball !== state.balls[0]) {
      return [state.ball, ...state.balls.slice(1)];
    }
    return state.balls;
  }

  return state.ball ? [state.ball] : [];
}

function withBallAliases(state, balls) {
  return {
    ...state,
    balls,
    ball: balls[0] ?? state.ball,
  };
}

function cloneState(state) {
  const balls = getBallsFromState(state).map(ball => ({ ...ball }));

  return {
    ...state,
    paddle: { ...state.paddle },
    balls,
    ball: balls[0] ?? state.ball,
    bricks: state.bricks.map(brick => ({ ...brick })),
    events: [...state.events],
    impactEvents: [...(state.impactEvents ?? [])],
  };
}

function advanceSubstep(state, deltaSeconds) {
  const sourceBalls = getBallsFromState(state);
  let workingState = {
    ...state,
    bricks: state.bricks.map(brick => ({ ...brick })),
    events: state.events,
    impactEvents: state.impactEvents ?? [],
  };
  let liveBalls = [];
  let missedBall = null;
  let nextBallId = workingState.nextBallId ?? sourceBalls.length;
  let remainingSourceBalls = sourceBalls.filter(ball => ball.isActive).length;

  for (const currentBall of sourceBalls) {
    if (!currentBall.isActive) continue;
    remainingSourceBalls -= 1;

    const result = advanceBall(workingState, currentBall, deltaSeconds);
    workingState = result;

    if (result.mode === "cleared") return result;

    if (result.ball.isActive) {
      liveBalls.push(result.ball);

      const spawnCount = Math.min(
        getBonusBallCount(result.clusterSize ?? 0),
        Math.max(0, MAX_BALLS - liveBalls.length - remainingSourceBalls),
      );
      if (spawnCount > 0) {
        const bonusBalls = createBonusBalls(
          result.ball,
          spawnCount,
          BASE_BALL_SPEED * (result.speedMultiplier ?? workingState.speedMultiplier ?? 1),
          nextBallId,
        );
        nextBallId += bonusBalls.length;
        liveBalls.push(...bonusBalls);
      }
    } else {
      missedBall = result.ball;
    }
  }

  if (!liveBalls.length) {
    return resolveMiss({
      ...workingState,
      balls: [],
      ball: missedBall ?? sourceBalls[0],
      nextBallId,
    });
  }

  if (missedBall) {
    const geometry = createResponsiveBreakoutGeometry(workingState.width, workingState.height);
    const paddleTier = Math.max(DEFAULT_PADDLE_TIER, (workingState.paddleTier ?? DEFAULT_PADDLE_TIER) - 1);
    const paddle = createResponsivePaddle(geometry, workingState.paddle.x, paddleTier);
    const impact = {
      type: "miss",
      x: clamp(missedBall.x, 0, workingState.width),
      y: workingState.height,
      normalX: 0,
      normalY: 1,
    };

    return withBallAliases({
      ...workingState,
      balls: liveBalls,
      nextBallId,
      combo: 0,
      comboTimer: 0,
      paddleTier,
      paddle,
      events: appendEvent(workingState.events, "miss"),
      impactEvents: appendImpactEvent(workingState.impactEvents, impact),
    }, liveBalls);
  }

  return withBallAliases({ ...workingState, balls: liveBalls, nextBallId }, liveBalls);
}

function advanceBall(state, currentBall, deltaSeconds) {
  const previousBall = { ...currentBall };
  const ball = {
    ...currentBall,
    x: currentBall.x + currentBall.vx * deltaSeconds,
    y: currentBall.y + currentBall.vy * deltaSeconds,
  };
  let events = state.events;
  let impactEvents = state.impactEvents ?? [];

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
    events = appendEvent(events, "wall");
    impactEvents = appendImpactEvent(impactEvents, {
      type: "wall",
      x: 0,
      y: ball.y,
      normalX: 1,
      normalY: 0,
    });
  } else if (ball.x + ball.radius >= state.width) {
    ball.x = state.width - ball.radius;
    ball.vx = -Math.abs(ball.vx);
    events = appendEvent(events, "wall");
    impactEvents = appendImpactEvent(impactEvents, {
      type: "wall",
      x: state.width,
      y: ball.y,
      normalX: -1,
      normalY: 0,
    });
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
    events = appendEvent(events, "wall");
    impactEvents = appendImpactEvent(impactEvents, {
      type: "wall",
      x: ball.x,
      y: 0,
      normalX: 0,
      normalY: 1,
    });
  }

  const bricks = state.bricks.map(brick => ({ ...brick }));
  const touchingBricks = bricks.filter(brick => brick.isActive && circleIntersectsRectangle(ball, brick));
  const hitBricks = collectBrickCluster(ball, touchingBricks);
  const speedMultiplier = state.speedMultiplier ?? 1;

  if (hitBricks.length > 0) {
    const normal = reboundFromRectangle(ball, previousBall, hitBricks[0]);
    for (const brick of hitBricks) {
      const index = bricks.findIndex(candidate => candidate.id === brick.id);
      bricks[index] = { ...brick, isActive: false };
      const type = BRICK_EVENTS[brick.row % BRICK_EVENTS.length];
      events = appendEvent(events, type);
      impactEvents = appendImpactEvent(
        impactEvents,
        createRectangleImpact(brick, ball, normal, type),
      );
    }

    const clusterSize = hitBricks.length;
    const destroyed = bricks.length - bricks.filter(candidate => candidate.isActive).length;
    const nextSpeedMultiplier = Math.min(1.7, 1 + (destroyed / bricks.length) * 0.7);
    const combo = (state.comboTimer ?? 0) > 0 ? (state.combo ?? 0) + clusterSize : clusterSize;
    const score = (state.score ?? 0) + clusterSize * 10 * Math.max(1, Math.ceil(combo / 3));
    const paddleTier = clusterSize >= 2
      ? Math.min(MAX_PADDLE_TIER, (state.paddleTier ?? DEFAULT_PADDLE_TIER) + 1)
      : state.paddleTier ?? DEFAULT_PADDLE_TIER;
    const geometry = createResponsiveBreakoutGeometry(state.width, state.height);
    const paddle = createResponsivePaddle(geometry, state.paddle.x, paddleTier);
    const nextEvents = clusterSize >= 2 ? appendEvent(events, "cluster") : events;
    const spawnCount = getBonusBallCount(clusterSize);
    const finalEvents = spawnCount > 0 ? appendEvent(nextEvents, "multiBall") : nextEvents;

    Object.assign(ball, normalizeBallVelocity(ball, BASE_BALL_SPEED * nextSpeedMultiplier));

    if (!bricks.some(candidate => candidate.isActive)) {
      const clearedBalls = getBallsFromState(state).map(candidate => candidate.id === ball.id
        ? { ...ball, isActive: false }
        : { ...candidate, isActive: false });
      return withBallAliases({
        ...state,
        speedMultiplier: nextSpeedMultiplier,
        score,
        combo,
        comboTimer: COMBO_WINDOW_SECONDS,
        paddleTier,
        paddle,
        events: appendEvent(finalEvents, "clear"),
        impactEvents: appendImpactEvent(
          impactEvents,
          { ...createRectangleImpact(hitBricks[0], ball, normal, "clear"), type: "clear" },
        ),
        bricks,
        balls: clearedBalls,
        mode: "cleared",
      }, clearedBalls);
    }

    return {
      ...state,
      speedMultiplier: nextSpeedMultiplier,
      score,
      combo,
      comboTimer: COMBO_WINDOW_SECONDS,
      paddleTier,
      paddle,
      events: finalEvents,
      impactEvents,
      bricks,
      ball,
      clusterSize,
      nextBallId: state.nextBallId,
    };
  }

  if (ball.vy > 0 && circleIntersectsRectangle(ball, state.paddle)) {
    const impact = clamp((ball.x - state.paddle.x) / (state.paddle.width / 2), -1, 1);
    const speed = BASE_BALL_SPEED * speedMultiplier;
    const horizontalVelocity = speed * impact * 0.82;

    ball.x = clamp(ball.x, state.paddle.x - state.paddle.width / 2, state.paddle.x + state.paddle.width / 2);
    ball.y = state.paddle.y - ball.radius;
    ball.vx = horizontalVelocity;
    ball.vy = -Math.sqrt(Math.max(speed * speed - horizontalVelocity * horizontalVelocity, speed * speed * 0.34));
    Object.assign(ball, normalizeBallVelocity(ball, speed));
    events = appendEvent(events, "paddle");
    impactEvents = appendImpactEvent(impactEvents, {
      type: "paddle",
      x: ball.x,
      y: state.paddle.y,
      normalX: 0,
      normalY: -1,
    });
  }

  if (ball.y - ball.radius > state.height) {
    return {
      ...state,
      speedMultiplier,
      events,
      impactEvents,
      bricks,
      ball: { ...ball, isActive: false },
    };
  }

  return { ...state, speedMultiplier, events, impactEvents, bricks, ball, clusterSize: 0 };
}

function getBonusBallCount(clusterSize) {
  if (clusterSize >= 4) return 2;
  if (clusterSize >= 2) return 1;
  return 0;
}

function collectBrickCluster(ball, touchingBricks) {
  if (touchingBricks.length <= 1) return touchingBricks;

  const cluster = [touchingBricks[0]];
  const maxCenterDistance = ball.radius * 2.05;
  let changed = true;

  while (changed) {
    changed = false;
    for (const candidate of touchingBricks) {
      if (cluster.includes(candidate)) continue;

      const candidateCenterX = candidate.x + candidate.width / 2;
      const candidateCenterY = candidate.y + candidate.height / 2;
      const touchesCluster = cluster.some(brick => {
        const centerX = brick.x + brick.width / 2;
        const centerY = brick.y + brick.height / 2;
        return Math.hypot(candidateCenterX - centerX, candidateCenterY - centerY) <= maxCenterDistance;
      });

      if (touchesCluster) {
        cluster.push(candidate);
        changed = true;
      }
    }
  }

  return cluster;
}

function createBonusBalls(ball, count, speed, startingId) {
  const baseAngle = Math.atan2(ball.vy, ball.vx);
  const offsets = count === 1 ? [-0.48] : [-0.62, 0.62];

  return offsets.slice(0, count).map((offset, index) => {
    const angle = baseAngle + offset;
    return {
      id: `ball-${startingId + index}`,
      x: ball.x,
      y: ball.y,
      radius: ball.radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      isActive: true,
    };
  });
}

function decayCombo(state, deltaSeconds) {
  const comboTimer = Math.max(0, (state.comboTimer ?? 0) - deltaSeconds);
  return {
    ...state,
    combo: comboTimer > 0 ? state.combo ?? 0 : 0,
    comboTimer,
  };
}

function resolveMiss(state) {
  const lives = state.lives - 1;
  const missedBall = getBallsFromState(state)[0] ?? state.ball;
  const events = appendEvent(state.events, "miss");
  const impactEvents = appendImpactEvent(state.impactEvents ?? [], {
    type: "miss",
    x: clamp(missedBall?.x ?? state.width / 2, 0, state.width),
    y: state.height,
    normalX: 0,
    normalY: 1,
  });

  if (lives <= 0) {
    return {
      ...createInitialBreakoutState({ width: state.width, height: state.height }),
      events,
      impactEvents,
    };
  }

  const geometry = createResponsiveBreakoutGeometry(state.width, state.height);
  const paddleTier = Math.max(DEFAULT_PADDLE_TIER, (state.paddleTier ?? DEFAULT_PADDLE_TIER) - 1);
  const paddle = createResponsivePaddle(geometry, geometry.width / 2, paddleTier);
  const ball = createRestingBall(
    paddle,
    geometry.ballRadius,
    state.speedMultiplier ?? 1,
    "ball-0",
  );
  return {
    ...state,
    lives,
    mode: "waiting",
    combo: 0,
    comboTimer: 0,
    paddleTier,
    nextBallId: 1,
    events,
    impactEvents,
    paddle,
    balls: [ball],
    ball,
  };
}

function appendEvent(events, event) {
  return [...events, event];
}

function appendImpactEvent(impactEvents, impactEvent) {
  return [...impactEvents, impactEvent];
}

function normalizeBallVelocity(ball, speed) {
  const magnitude = Math.hypot(ball.vx, ball.vy);
  const fallbackMagnitude = Math.hypot(240, 300);
  const directionX = magnitude ? ball.vx / magnitude : 240 / fallbackMagnitude;
  const directionY = magnitude ? ball.vy / magnitude : -300 / fallbackMagnitude;

  return {
    ...ball,
    vx: directionX * speed,
    vy: directionY * speed,
  };
}

function circleIntersectsRectangle(circle, rectangle) {
  const left = rectangle.x - ("column" in rectangle ? 0 : rectangle.width / 2);
  const right = left + rectangle.width;
  const top = rectangle.y;
  const bottom = top + rectangle.height;
  const nearestX = clamp(circle.x, left, right);
  const nearestY = clamp(circle.y, top, bottom);
  const deltaX = circle.x - nearestX;
  const deltaY = circle.y - nearestY;

  return deltaX * deltaX + deltaY * deltaY <= circle.radius * circle.radius;
}

function reboundFromRectangle(ball, previousBall, rectangle) {
  const left = rectangle.x;
  const right = rectangle.x + rectangle.width;
  const top = rectangle.y;
  const bottom = rectangle.y + rectangle.height;

  if (previousBall.y + previousBall.radius <= top || previousBall.y - previousBall.radius >= bottom) {
    const normalY = previousBall.y + previousBall.radius <= top ? -1 : 1;
    ball.vy *= -1;
    return { normalX: 0, normalY };
  }

  if (previousBall.x + previousBall.radius <= left || previousBall.x - previousBall.radius >= right) {
    const normalX = previousBall.x + previousBall.radius <= left ? -1 : 1;
    ball.vx *= -1;
    return { normalX, normalY: 0 };
  }

  const overlapX = Math.min(Math.abs(ball.x + ball.radius - left), Math.abs(right - (ball.x - ball.radius)));
  const overlapY = Math.min(Math.abs(ball.y + ball.radius - top), Math.abs(bottom - (ball.y - ball.radius)));

  if (overlapY <= overlapX) {
    const normalY = ball.vy > 0 ? -1 : 1;
    ball.vy *= -1;
    return { normalX: 0, normalY };
  }

  const normalX = ball.vx > 0 ? -1 : 1;
  ball.vx *= -1;
  return { normalX, normalY: 0 };
}

function createRectangleImpact(rectangle, ball, normal, type) {
  if (normal.normalX < 0) {
    return { type, x: rectangle.x, y: clamp(ball.y, rectangle.y, rectangle.y + rectangle.height), ...normal };
  }

  if (normal.normalX > 0) {
    return {
      type,
      x: rectangle.x + rectangle.width,
      y: clamp(ball.y, rectangle.y, rectangle.y + rectangle.height),
      ...normal,
    };
  }

  return {
    type,
    x: clamp(ball.x, rectangle.x, rectangle.x + rectangle.width),
    y: normal.normalY < 0 ? rectangle.y : rectangle.y + rectangle.height,
    ...normal,
  };
}
