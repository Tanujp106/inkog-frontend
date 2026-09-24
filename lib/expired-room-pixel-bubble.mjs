export const expiredRoomPixelBubblePattern = [
  "0111111111111110",
  "1111111111111111",
  "1100000000000011",
  "1100000000000011",
  "1100000000000011",
  "1100000000000011",
  "1100000000000011",
  "1100000000000011",
  "1100000000000011",
  "0110001111111110",
  "0010011111111100",
  "0010100000000000",
  "0011000000000000",
];

export const expiredRoomPixelBubbleMotion = {
  holdMs: 780,
  fractureMs: 180,
  fallMs: 560,
  settleMs: 180,
};

function round(value) {
  return Number(value.toFixed(3));
}

function getCellRole(row, column) {
  if (row >= 11 || (row === 10 && column === 2)) return "tail";
  return "shell";
}

function getSettledPosition(index, column, row) {
  const pileColumn = (index % 13) - 6;
  const pileRow = index % 4;
  const pixelPitch = 10;
  const settledX = pileColumn * pixelPitch + ((row % 3) - 1) * 2.5;
  const settledY = 141 - pileRow * pixelPitch;
  const baseX = column * pixelPitch;
  const baseY = row * pixelPitch;

  return {
    x: round(settledX - baseX),
    y: round(settledY - baseY),
  };
}

export function buildExpiredRoomPixelCells(pattern = expiredRoomPixelBubblePattern) {
  return pattern.flatMap((row, rowIndex) =>
    [...row].flatMap((cell, columnIndex) => {
      if (cell !== "1") return [];

      const role = getCellRole(rowIndex, columnIndex);
      const settled = getSettledPosition(
        rowIndex * row.length + columnIndex,
        columnIndex,
        rowIndex,
      );

      return [{
        id: `${rowIndex}-${columnIndex}`,
        column: columnIndex,
        row: rowIndex,
        role,
        dropX: settled.x,
        dropY: settled.y,
        fractureX: round(((columnIndex % 3) - 1) * 1.5),
        fractureY: round((rowIndex % 2) * 1.5),
        rotate: round(((rowIndex + columnIndex) % 5 - 2) * 1.8),
        delay: (rowIndex * 23 + columnIndex * 11) % 90,
      }];
    }),
  );
}

export function getExpiredRoomPixelPhase(elapsedMs, reducedMotion = false) {
  if (reducedMotion || !Number.isFinite(elapsedMs) || elapsedMs < 0) return "interactive";

  const {
    holdMs,
    fractureMs,
    fallMs,
    settleMs,
  } = expiredRoomPixelBubbleMotion;
  const fractureEnd = holdMs + fractureMs;
  const fallEnd = fractureEnd + fallMs;
  const settleEnd = fallEnd + settleMs;

  if (elapsedMs < holdMs) return "present";
  if (elapsedMs < fractureEnd) return "fracturing";
  if (elapsedMs < fallEnd) return "falling";
  if (elapsedMs < settleEnd) return "settling";
  return "interactive";
}
