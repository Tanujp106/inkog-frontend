import assert from "node:assert/strict";
import test from "node:test";

import { extractInkogHelpQuestion } from "./inkog-help.mjs";

test("extracts help questions from slash and bare commands", () => {
  assert.equal(extractInkogHelpQuestion("/help who made inkog?"), "who made inkog?");
  assert.equal(extractInkogHelpQuestion("help why terminal?"), "why terminal?");
});

test("extracts direction two slash-delimited help questions", () => {
  assert.equal(extractInkogHelpQuestion("help / who made inkog?"), "who made inkog?");
  assert.equal(extractInkogHelpQuestion("/help / why terminal?"), "why terminal?");
});

test("returns null for bare help commands", () => {
  assert.equal(extractInkogHelpQuestion("help"), null);
  assert.equal(extractInkogHelpQuestion("/help"), null);
  assert.equal(extractInkogHelpQuestion("hello"), null);
});
