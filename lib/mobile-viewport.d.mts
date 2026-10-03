export type MobileViewportMetrics = {
  height: number;
  top: number;
  bottomInset: number;
  layoutHeight: number;
  keyboardOpen: boolean;
};
export function getMobileViewportMetrics(options: { windowHeight: number; viewportHeight?: number; viewportTop?: number; layoutHeight?: number; focused?: boolean }): MobileViewportMetrics;
export function observeMobileViewport(options: { window: Window; isFocused: () => boolean; onChange: (metrics: MobileViewportMetrics | null) => void; mediaQuery?: string }): () => void;
