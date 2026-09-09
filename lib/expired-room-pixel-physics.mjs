import Matter from "matter-js";

const { Body, Bodies, Composite, Engine, Sleeping } = Matter;

export const expiredRoomPixelPhysics = {
  pixelGap: 2,
  pixelSize: 8,
  floorHeight: 4,
  gravityScale: 0.0012,
  density: 0.0015,
  friction: 0.82,
  frictionAir: 0.035,
  restitution: 0.08,
};

function round(value) {
  return Number(value.toFixed(7));
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function getPixelPosition(
  cell,
  {
    originX = 0,
    originY = 0,
    pixelGap = expiredRoomPixelPhysics.pixelGap,
    pixelSize = expiredRoomPixelPhysics.pixelSize,
  } = {},
) {
  const pixelPitch = pixelSize + pixelGap;
  return {
    x: originX + (cell.column + 0.5) * pixelPitch,
    y: originY + (cell.row + 0.5) * pixelPitch,
  };
}

export function getExpiredRoomPixelRelease(
  cell,
  index,
  options = {},
) {
  const position = getPixelPosition(cell, options);
  const safeIndex = Number.isFinite(index) ? index : 0;

  return {
    x: round(position.x + finite(cell.fractureX) * 1.4),
    y: round(position.y + finite(cell.fractureY) * 1.4),
    velocityX: round(((safeIndex % 7) - 3) * 0.12 + ((cell.column % 3) - 1) * 0.04),
    velocityY: round(-0.72 - (safeIndex % 5) * 0.055),
    angularVelocity: round(((safeIndex % 5) - 2) * 0.035),
  };
}

export function createExpiredRoomPixelWorld({
  cells,
  floorY,
  height,
  originX = 0,
  originY = 0,
  pixelGap = expiredRoomPixelPhysics.pixelGap,
  pixelSize = expiredRoomPixelPhysics.pixelSize,
  width,
}) {
  const safeWidth = Math.max(pixelSize, finite(width, pixelSize));
  const safeHeight = Math.max(pixelSize, finite(height, pixelSize));
  const safeFloorY = Math.min(Math.max(pixelSize, finite(floorY, safeHeight - pixelSize)), safeHeight);
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = expiredRoomPixelPhysics.gravityScale;

  const floor = Bodies.rectangle(
    safeWidth / 2,
    safeFloorY + expiredRoomPixelPhysics.floorHeight / 2,
    safeWidth,
    expiredRoomPixelPhysics.floorHeight,
    {
      friction: 1,
      isStatic: true,
      label: "expired-room-pixel-floor",
      restitution: 0,
    },
  );

  const walls = [
    Bodies.rectangle(-expiredRoomPixelPhysics.floorHeight / 2, safeHeight / 2, expiredRoomPixelPhysics.floorHeight, safeHeight, {
      isStatic: true,
      label: "expired-room-pixel-left-wall",
      restitution: 0,
    }),
    Bodies.rectangle(safeWidth + expiredRoomPixelPhysics.floorHeight / 2, safeHeight / 2, expiredRoomPixelPhysics.floorHeight, safeHeight, {
      isStatic: true,
      label: "expired-room-pixel-right-wall",
      restitution: 0,
    }),
  ];

  const bodies = cells.map((cell, index) => {
    const position = getPixelPosition({ ...cell }, { originX, originY, pixelGap, pixelSize });
    return Bodies.rectangle(position.x, position.y, pixelSize, pixelSize, {
      density: expiredRoomPixelPhysics.density,
      friction: expiredRoomPixelPhysics.friction,
      frictionAir: expiredRoomPixelPhysics.frictionAir,
      label: `expired-room-pixel-${cell.id ?? index}`,
      restitution: expiredRoomPixelPhysics.restitution,
      sleepThreshold: 18,
    });
  });

  Composite.add(engine.world, [floor, ...walls, ...bodies]);

  return {
    bodies,
    engine,
    floor,
    height: safeHeight,
    width: safeWidth,
    walls,
  };
}

export function releaseExpiredRoomPixelBodies(world, cells, options = {}) {
  world.bodies.forEach((body, index) => {
    const release = getExpiredRoomPixelRelease(cells[index], index, options);
    Body.setPosition(body, { x: release.x, y: release.y });
    Body.setVelocity(body, { x: release.velocityX, y: release.velocityY });
    Body.setAngularVelocity(body, release.angularVelocity);
    Sleeping.set(body, false);
  });
}

export function stepExpiredRoomPixelWorld(world, deltaMs) {
  if (!world?.engine || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
  Engine.update(world.engine, Math.min(16, deltaMs));
}

export function getExpiredRoomPixelSettledCells(cells) {
  return cells.map(cell => ({
    id: cell.id,
    rotation: 0,
    x: finite(cell.dropX),
    y: finite(cell.dropY),
  }));
}

export function destroyExpiredRoomPixelWorld(world) {
  if (!world?.engine?.world) return;
  Composite.clear(world.engine.world, false, true);
  Engine.clear(world.engine);
}
