export const BREAKOUT_WIDTH = 800;
export const BREAKOUT_HEIGHT = 520;

const BASE_BALL_SPEED = 360;
const BASE_PADDLE_SPEED = 340;
const FAST_PADDLE_SPEED = 620;
const MAX_FRAME_DELTA = 1 / 20;
const PHYSICS_STEP = 1 / 120;
const BRICK_EVENTS = ["brickA", "brickB", "brickC"];

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
  const paddleWidth = clamp(width * 0.14, 78, 112);
  const paddle = {
    x: width / 2,
    y: height - 44,
    width: paddleWidth,
    height: 12,
  };
  const ball = createRestingBall(paddle);

  return {
    width,
    height,
    mode: "idle",
    lives: 3,
    speedMultiplier: 1,
    events: [],
    bricks: create404Bricks(width, height),
    paddle,
    ball,
  };
}

export function shouldLaunchBreakoutForKey(key) {
  if ([" ", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return true;
  return /^[a-z0-9]$/i.test(key) && key.toLowerCase() !== "r";
}

export function resizeBreakout(state, width, height) {
  const nextWidth = Math.max(1, width);
  const nextHeight = Math.max(1, height);
  const scaleX = nextWidth / state.width;
  const scaleY = nextHeight / state.height;
  const scale = Math.min(scaleX, scaleY);
  const activeById = new Map(state.bricks.map(brick => [brick.id, brick.isActive]));
  const paddleWidth = clamp(state.paddle.width * scaleX, 78, 112);
  const paddleHeight = clamp(state.paddle.height * scaleY, 8, 14);
  const paddle = {
    ...state.paddle,
    x: clamp(state.paddle.x * scaleX, paddleWidth / 2, nextWidth - paddleWidth / 2),
    y: clamp(state.paddle.y * scaleY, 0, nextHeight - paddleHeight),
    width: paddleWidth,
    height: paddleHeight,
  };
  const radius = clamp(state.ball.radius * scale, 5, 10);
  const speedMultiplier = state.speedMultiplier ?? 1;
  const ball = normalizeBallVelocity(
    {
      ...state.ball,
      x: clamp(state.ball.x * scaleX, radius, nextWidth - radius),
      y: clamp(state.ball.y * scaleY, radius, nextHeight - radius),
      radius,
    },
    BASE_BALL_SPEED * speedMultiplier,
  );

  return {
    ...state,
    width: nextWidth,
    height: nextHeight,
    speedMultiplier,
    events: [],
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
  if (state.mode !== "running" || direction === 0) return state;

  const speed = isFast ? FAST_PADDLE_SPEED : BASE_PADDLE_SPEED;
  return setPaddleFromPointer(state, state.paddle.x + direction * speed * deltaSeconds);
}

export function setPaddleFromPointer(state, pointerX) {
  if (state.mode !== "running") return state;

  const halfWidth = state.paddle.width / 2;
  const nextX = clamp(pointerX, halfWidth, state.width - halfWidth);
  const paddle = { ...state.paddle, x: nextX };

  return {
    ...state,
    paddle,
    ball: state.ball.isActive
      ? state.ball
      : {
          ...state.ball,
          x: nextX,
          y: paddle.y - state.ball.radius - 2,
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

function createRestingBall(paddle) {
  const radius = 7;

  return normalizeBallVelocity(
    {
      x: paddle.x,
      y: paddle.y - radius - 2,
      radius,
      vx: 240,
      vy: -300,
      isActive: false,
    },
    BASE_BALL_SPEED,
  );
}

function clearEvents(state) {
  return { ...state, events: [] };
}

function cloneState(state) {
  return {
    ...state,
    paddle: { ...state.paddle },
    ball: { ...state.ball },
    bricks: state.bricks.map(brick => ({ ...brick })),
    events: [...state.events],
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

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
    events = appendEvent(events, "wall");
  } else if (ball.x + ball.radius >= state.width) {
    ball.x = state.width - ball.radius;
    ball.vx = -Math.abs(ball.vx);
    events = appendEvent(events, "wall");
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
    events = appendEvent(events, "wall");
  }

  const bricks = state.bricks.map(brick => ({ ...brick }));
  const brickIndex = bricks.findIndex(brick => brick.isActive && circleIntersectsRectangle(ball, brick));
  const speedMultiplier = state.speedMultiplier ?? 1;

  if (brickIndex >= 0) {
    const brick = bricks[brickIndex];
    bricks[brickIndex] = { ...brick, isActive: false };
    reboundFromRectangle(ball, previousBall, brick);
    const destroyed = bricks.length - bricks.filter(candidate => candidate.isActive).length;
    const nextSpeedMultiplier = Math.min(1.7, 1 + (destroyed / bricks.length) * 0.7);
    Object.assign(ball, normalizeBallVelocity(ball, BASE_BALL_SPEED * nextSpeedMultiplier));
    events = appendEvent(events, BRICK_EVENTS[brick.row % BRICK_EVENTS.length]);

    if (!bricks.some(candidate => candidate.isActive)) {
      return {
        ...state,
        speedMultiplier: nextSpeedMultiplier,
        events: appendEvent(events, "clear"),
        bricks,
        ball: { ...ball, isActive: false },
        mode: "cleared",
      };
    }

    return { ...state, speedMultiplier: nextSpeedMultiplier, events, bricks, ball };
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
  }

  if (ball.y - ball.radius > state.height) {
    return resolveMiss({ ...state, speedMultiplier, events, bricks, ball });
  }

  return { ...state, speedMultiplier, events, bricks, ball };
}

function resolveMiss(state) {
  const lives = state.lives - 1;
  const events = appendEvent(state.events, "miss");

  if (lives <= 0) {
    return {
      ...createInitialBreakoutState({ width: state.width, height: state.height }),
      events,
    };
  }

  const paddle = { ...state.paddle, x: state.width / 2 };
  return {
    ...state,
    lives,
    mode: "waiting",
    events,
    paddle,
    ball: createRestingBall(paddle),
  };
}

function appendEvent(events, event) {
  return [...events, event];
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
    ball.vy *= -1;
    return;
  }

  if (previousBall.x + previousBall.radius <= left || previousBall.x - previousBall.radius >= right) {
    ball.vx *= -1;
    return;
  }

  const overlapX = Math.min(Math.abs(ball.x + ball.radius - left), Math.abs(right - (ball.x - ball.radius)));
  const overlapY = Math.min(Math.abs(ball.y + ball.radius - top), Math.abs(bottom - (ball.y - ball.radius)));

  if (overlapY <= overlapX) ball.vy *= -1;
  else ball.vx *= -1;
}
