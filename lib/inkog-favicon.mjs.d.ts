import type { InkogThemeChoice } from "./inkog-theme.mjs";

export declare const inkogFaviconThemeColors: Record<InkogThemeChoice["id"], string>;
export declare const defaultInkogFaviconTheme: InkogThemeChoice["id"];
export declare function resolveInkogFaviconTheme(themeId: string | null | undefined): InkogThemeChoice["id"];
export declare function buildInkogFaviconSvg(themeId?: string | null): string;
export declare function buildInkogFaviconHref(themeId?: string | null): string;
