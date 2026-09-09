import assert from "node:assert/strict";
import test from "node:test";

import { buildExpiredRoomPixelCells } from "./expired-room-pixel-bubble.mjs";
import {
  createExpiredRoomPixelWorld,
  expiredRoomPixelPhysics,
  getExpiredRoomPixelRelease,
  getExpiredRoomPixelSettledCells,
  releaseExpiredRoomPixelBodies,
} from "./expired-room-pixel-physics.mjs";

test("creates one dynamic body per pixel with a static floor and side boundaries", () => {
  const cells = buildExpiredRoomPixelCells();
  const world = createExpiredRoomPixelWorld({
    cells,
    floorY: 120,
    height: 140,
    originX: 20,
    originY: 10,
    pixelSize: 5,
    width: 220,
  });

  assert.equal(world.bodies.length, cells.length);
  assert.equal(world.floor.isStatic, true);
  assert.equal(world.walls.length, 2);
  assert.ok(world.walls.every(wall => wall.isStatic === true));
  assert.ok(world.bodies.every(body => body.isStatic === false));
  assert.equal(world.engine.world.bodies.length, cells.length + 3);
});

test("generates deterministic release values and a finite settled fallback", () => {
  assert.equal(expiredRoomPixelPhysics.pixelGap, 2);
  assert.equal(expiredRoomPixelPhysics.pixelSize, 8);
  const cell = buildExpiredRoomPixelCells()[4];
  const first = getExpiredRoomPixelRelease(cell, 4);
  const second = getExpiredRoomPixelRelease(cell, 4);
  const settled = getExpiredRoomPixelSettledCells(buildExpiredRoomPixelCells());

  assert.deepEqual(first, second);
  assert.ok(Object.values(first).every(value => Number.isFinite(value)));
  assert.equal(settled.length, buildExpiredRoomPixelCells().length);
  assert.ok(settled.every(cellPosition => Number.isFinite(cellPosition.x) && Number.isFinite(cellPosition.y)));
});

test("releases every body without throwing and gives the pile initial motion", () => {
  const cells = buildExpiredRoomPixelCells();
  const world = createExpiredRoomPixelWorld({
    cells,
    floorY: 120,
    height: 140,
    width: 220,
  });

  assert.doesNotThrow(() => releaseExpiredRoomPixelBodies(world, cells));
  assert.ok(world.bodies.some(body => body.velocity.y < 0));
});
