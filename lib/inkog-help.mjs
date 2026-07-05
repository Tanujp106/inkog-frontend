export function extractInkogHelpQuestion(value) {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^\/?help(?:\s+([\s\S]+))?$/i);
  if (!match) return null;

  const question = (match[1] ?? "").trim().replace(/^\/+\s*/, "").trim();
  return question || null;
}
