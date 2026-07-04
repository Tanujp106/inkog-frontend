export const roomThemeBackground = {
  baseColor: "var(--bg)",
  background: [
    "radial-gradient(ellipse at 52% 0%, color-mix(in srgb, var(--color-signal-dim) 5.6%, transparent) 0%, color-mix(in srgb, var(--color-signal-dim) 2.2%, transparent) 30%, rgba(0, 0, 0, 0) 62%)",
    "linear-gradient(180deg, color-mix(in srgb, var(--color-signal-dim) 3%, transparent) 0%, rgba(0, 0, 0, 0) 42%)",
    "radial-gradient(circle at 18% 6%, color-mix(in srgb, var(--color-signal-glow) 62%, transparent) 0%, rgba(0, 0, 0, 0) 38%)",
  ].join(", "),
  blendMode: "screen",
};
