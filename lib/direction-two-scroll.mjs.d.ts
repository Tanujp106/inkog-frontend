export const directionTwoAutoScrollAnimationDurationMs: number;

export function getDirectionTwoAutoScrollTop(args: {
  allowReverse?: boolean;
  currentScrollY: number;
  floatingBottom?: number;
  floatingHeight?: number;
  promptTop: number;
  viewportPadding?: number;
  viewportHeight: number;
  anchorRatio?: number;
}): number;
export function getDirectionTwoScrollAnimationTop(args: {
  startScrollY: number;
  targetScrollY: number;
  elapsedMs: number;
  durationMs?: number;
}): number;
export function getDirectionTwoScrollReserveHeight(args: {
  floatingHeight?: number;
  viewportHeight: number;
  promptHeight: number;
  anchorRatio?: number;
}): number;
