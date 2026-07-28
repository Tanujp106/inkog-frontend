export const BREAKOUT_WIDTH = 800;
export const BREAKOUT_HEIGHT = 520;

const BASE_BALL_SPEED = 360;
const BASE_PADDLE_SPEED = 340;
const FAST_PADDLE_SPEED = 620;
const MAX_FRAME_DELTA = 1 / 20;
const PHYSICS_STEP = 1 / 120;
const BRICK_EVENTS = ["brickA", "brickB", "brickC"];
const MIN_HUD_BOTTOM_CLEARANCE = 48;

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

export function createInitialBreakoutState({ width = BREAKOUT_WIDTH, height = BREAKOUT_HEIGHT } = {}) {
  const geometry = createResponsiveBreakoutGeometry(width, height);
  const paddle = createResponsivePaddle(geometry, geometry.width / 2);
  const ball = createRestingBall(paddle, geometry.ballRadius);

  return {
    width: geometry.width,
    height: geometry.height,
    mode: "idle",
    lives: 3,
    speedMultiplier: 1,
    events: [],
    impactEvents: [],
    bricks: create404Bricks(geometry.width, geometry.height),
    paddle,
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
  const paddle = createResponsivePaddle(geometry, state.paddle.x * scaleX);
  const speedMultiplier = state.speedMultiplier ?? 1;
  const ball = state.ball.isActive
    ? normalizeBallVelocity(
        {
          ...state.ball,
          x: clamp(
            state.ball.x * scaleX,
            geometry.ballRadius,
            nextWidth - geometry.ballRadius,
          ),
          y: clamp(
            state.ball.y * scaleY,
            geometry.ballRadius,
            nextHeight - geometry.ballRadius,
          ),
          radius: geometry.ballRadius,
        },
        BASE_BALL_SPEED * speedMultiplier,
      )
    : createRestingBall(paddle, geometry.ballRadius, speedMultiplier);

  return {
    ...state,
    width: nextWidth,
    height: nextHeight,
    speedMultiplier,
    events: [],
    impactEvents: [],
    bricks: create404Bricks(nextWidth, nextHeight).map(brick => ({
      ...brick,
      isActive: activeById.get(brick.id) ?? true,
    })),
    paddle,
    ball,
  };
}

export function launchBreakout(state) {
  const nextState = clearEvents(state);
  if (nextState.mode !== "idle" && nextState.mode !== "waiting") return nextState;

  const speedMultiplier = nextState.speedMultiplier ?? 1;
  return {
    ...nextState,
    speedMultiplier,
    mode: "running",
    events: ["launch"],
    ball: normalizeBallVelocity(
      {
        ...nextState.ball,
        isActive: true,
        vx: nextState.ball.vx || 240,
        vy: -Math.abs(nextState.ball.vy || 300),
      },
      BASE_BALL_SPEED * speedMultiplier,
    ),
  };
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

  return {
    ...nextState,
    paddle,
    ball: nextState.ball.isActive
      ? nextState.ball
      : {
          ...nextState.ball,
          x: nextX,
          y: paddle.y - nextState.ball.radius - 2,
        },
  };
}

export function stepBreakout(state, deltaSeconds) {
  const nextState = clearEvents(state);
  if (nextState.mode !== "running" || !nextState.ball.isActive) return nextState;

  const frameDelta = clamp(deltaSeconds, 0, MAX_FRAME_DELTA);
  const substepCount = Math.max(1, Math.ceil(frameDelta / PHYSICS_STEP));
  const substepDelta = frameDelta / substepCount;
  let steppedState = cloneState(nextState);

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

function createResponsivePaddle(geometry, x) {
  return {
    x: clamp(
      x,
      geometry.paddleWidth / 2,
      geometry.width - geometry.paddleWidth / 2,
    ),
    y: geometry.paddleY,
    width: geometry.paddleWidth,
    height: geometry.paddleHeight,
  };
}

function createRestingBall(paddle, radius, speedMultiplier = 1) {
  return normalizeBallVelocity(
    {
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

function cloneState(state) {
  return {
    ...state,
    paddle: { ...state.paddle },
    ball: { ...state.ball },
    bricks: state.bricks.map(brick => ({ ...brick })),
    events: [...state.events],
    impactEvents: [...(state.impactEvents ?? [])],
  };
}

function advanceSubstep(state, deltaSeconds) {
  const previousBall = { ...state.ball };
  const ball = {
    ...state.ball,
    x: state.ball.x + state.ball.vx * deltaSeconds,
    y: state.ball.y + state.ball.vy * deltaSeconds,
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
  const brickIndex = bricks.findIndex(brick => brick.isActive && circleIntersectsRectangle(ball, brick));
  const speedMultiplier = state.speedMultiplier ?? 1;

  if (brickIndex >= 0) {
    const brick = bricks[brickIndex];
    bricks[brickIndex] = { ...brick, isActive: false };
    const normal = reboundFromRectangle(ball, previousBall, brick);
    const destroyed = bricks.length - bricks.filter(candidate => candidate.isActive).length;
    const nextSpeedMultiplier = Math.min(1.7, 1 + (destroyed / bricks.length) * 0.7);
    Object.assign(ball, normalizeBallVelocity(ball, BASE_BALL_SPEED * nextSpeedMultiplier));
    const type = BRICK_EVENTS[brick.row % BRICK_EVENTS.length];
    const impact = createRectangleImpact(brick, ball, normal, type);
    events = appendEvent(events, type);
    impactEvents = appendImpactEvent(impactEvents, impact);

    if (!bricks.some(candidate => candidate.isActive)) {
      return {
        ...state,
        speedMultiplier: nextSpeedMultiplier,
        events: appendEvent(events, "clear"),
        impactEvents: appendImpactEvent(impactEvents, { ...impact, type: "clear" }),
        bricks,
        ball: { ...ball, isActive: false },
        mode: "cleared",
      };
    }

    return { ...state, speedMultiplier: nextSpeedMultiplier, events, impactEvents, bricks, ball };
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
    return resolveMiss({ ...state, speedMultiplier, events, impactEvents, bricks, ball });
  }

  return { ...state, speedMultiplier, events, impactEvents, bricks, ball };
}

function resolveMiss(state) {
  const lives = state.lives - 1;
  const events = appendEvent(state.events, "miss");
  const impactEvents = appendImpactEvent(state.impactEvents ?? [], {
    type: "miss",
    x: clamp(state.ball.x, 0, state.width),
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
  const paddle = createResponsivePaddle(geometry, geometry.width / 2);
  return {
    ...state,
    lives,
    mode: "waiting",
    events,
    impactEvents,
    paddle,
    ball: createRestingBall(paddle, geometry.ballRadius, state.speedMultiplier ?? 1),
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
