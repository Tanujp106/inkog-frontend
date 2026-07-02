export const roomThemeBackground = {
  baseColor: "var(--bg)",
  background: [
    "radial-gradient(ellipse at 52% 0%, color-mix(in srgb, var(--color-signal) 8%, transparent) 0%, color-mix(in srgb, var(--color-signal) 3.4%, transparent) 30%, rgba(0, 0, 0, 0) 62%)",
    "linear-gradient(180deg, color-mix(in srgb, var(--color-signal) 4.5%, transparent) 0%, rgba(0, 0, 0, 0) 42%)",
    "radial-gradient(circle at 18% 6%, var(--color-signal-glow) 0%, rgba(0, 0, 0, 0) 38%)",
  ].join(", "),
  blendMode: "screen",
};
