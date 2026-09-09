export async function copyTextToClipboard(
  text,
  {
    clipboard = globalThis.navigator?.clipboard,
    document = globalThis.document,
  } = {},
) {
  let clipboardError = null;

  if (typeof clipboard?.writeText === "function") {
    try {
      await clipboard.writeText(text);
      return;
    } catch (error) {
      clipboardError = error;
    }
  }

  if (typeof document?.createElement !== "function" || !document.body || typeof document.execCommand !== "function") {
    throw clipboardError ?? new Error("clipboard is unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw clipboardError ?? new Error("copy command failed");
    }
  } finally {
    textarea.remove?.();
  }
}
