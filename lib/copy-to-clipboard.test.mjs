import assert from "node:assert/strict";
import test from "node:test";

import { copyTextToClipboard } from "./copy-to-clipboard.mjs";

test("copies text with the async clipboard API when available", async () => {
  let copiedText = null;

  await copyTextToClipboard("https://inkog.chat/room/abc123", {
    clipboard: {
      async writeText(value) {
        copiedText = value;
      },
    },
  });

  assert.equal(copiedText, "https://inkog.chat/room/abc123");
});

test("falls back to the document copy command when the clipboard API is unavailable", async () => {
  let copiedText = null;
  let appendedTextarea = null;
  const textarea = {
    style: {},
    setAttribute() {},
    select() {},
    remove() {
      appendedTextarea = null;
    },
  };
  const document = {
    body: {
      appendChild(element) {
        appendedTextarea = element;
      },
    },
    createElement() {
      return textarea;
    },
    execCommand(command) {
      assert.equal(command, "copy");
      copiedText = appendedTextarea.value;
      return true;
    },
  };

  await copyTextToClipboard("https://inkog.chat/room/abc123", { document });

  assert.equal(copiedText, "https://inkog.chat/room/abc123");
  assert.equal(appendedTextarea, null);
});
