import assert from "node:assert/strict";
import test from "node:test";
import * as module from "./mobile-viewport.mjs";

const cases = [
  ["iOS keyboard overlays the layout viewport", { windowHeight: 844, viewportHeight: 450, viewportTop: 0, layoutHeight: 844, focused: true }, { height: 450, top: 0, bottomInset: 394, layoutHeight: 844, keyboardOpen: true }],
  ["Android keyboard resizes the layout viewport", { windowHeight: 450, viewportHeight: 450, viewportTop: 0, layoutHeight: 844, focused: true }, { height: 450, top: 0, bottomInset: 0, layoutHeight: 844, keyboardOpen: true }],
  ["browser chrome does not count as a keyboard", { windowHeight: 844, viewportHeight: 780, viewportTop: 0, layoutHeight: 844, focused: false }, { height: 780, top: 0, bottomInset: 64, layoutHeight: 844, keyboardOpen: false }],
  ["panned visual viewport keeps the composer inside the visible area", { windowHeight: 844, viewportHeight: 450, viewportTop: 100, layoutHeight: 844, focused: true }, { height: 450, top: 100, bottomInset: 294, layoutHeight: 844, keyboardOpen: true }],
  ["keyboard closure restores full height", { windowHeight: 844, viewportHeight: 844, viewportTop: 0, layoutHeight: 844, focused: true }, { height: 844, top: 0, bottomInset: 0, layoutHeight: 844, keyboardOpen: false }],
];
for (const [name, input, expected] of cases) {
  test(name, () => assert.deepEqual(module.getMobileViewportMetrics?.(input), expected));
}

function fakeWindow() {
  const win = new EventTarget();
  win.innerWidth = 390;
  win.innerHeight = 844;
  win.document = new EventTarget();
  win.visualViewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 });
  const media = Object.assign(new EventTarget(), { matches: true });
  win.matchMedia = query => {
    assert.equal(query, "(max-width: 639px), (max-width: 1024px) and (max-height: 500px)");
    return media;
  };
  const frames = new Map();
  let id = 0;
  win.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
  win.cancelAnimationFrame = frame => frames.delete(frame);
  return { win, media, flush: () => { const current = [...frames.values()]; frames.clear(); current.forEach(callback => callback()); } };
}

test("viewport observer batches events, preserves the intro height, and cleans up", () => {
  assert.equal(typeof module.observeMobileViewport, "function");
  const { win, flush } = fakeWindow();
  const updates = [];
  let focused = false;
  const dispose = module.observeMobileViewport({ window: win, isFocused: () => focused, onChange: update => updates.push(update) });
  assert.equal(updates.at(-1).height, 844);
  focused = true;
  win.innerHeight = win.visualViewport.height = 450;
  win.visualViewport.dispatchEvent(new Event("resize"));
  win.document.dispatchEvent(new Event("focusin"));
  assert.equal(updates.length, 1);
  flush();
  assert.equal(updates.length, 2);
  assert.equal(updates.at(-1).layoutHeight, 844);
  assert.equal(updates.at(-1).keyboardOpen, true);
  dispose();
  win.dispatchEvent(new Event("resize"));
  flush();
  assert.equal(updates.length, 2);
});

test("orientation changes reset the stored layout height and desktop clears mobile metrics", () => {
  assert.equal(typeof module.observeMobileViewport, "function");
  const { win, media, flush } = fakeWindow();
  const updates = [];
  const dispose = module.observeMobileViewport({ window: win, isFocused: () => true, onChange: update => updates.push(update) });
  win.innerWidth = 844;
  win.innerHeight = win.visualViewport.height = 390;
  win.dispatchEvent(new Event("resize"));
  flush();
  assert.equal(updates.at(-1).layoutHeight, 390);
  win.innerWidth = 1440;
  win.innerHeight = win.visualViewport.height = 900;
  media.matches = false;
  media.dispatchEvent(new Event("change"));
  flush();
  assert.equal(updates.at(-1), null);
  dispose();
});

test("browsers without visualViewport use their window dimensions", () => {
  assert.equal(typeof module.observeMobileViewport, "function");
  const { win } = fakeWindow();
  delete win.visualViewport;
  let update;
  const dispose = module.observeMobileViewport({ window: win, isFocused: () => false, onChange: value => { update = value; } });
  assert.deepEqual(update, { height: 844, top: 0, bottomInset: 0, layoutHeight: 844, keyboardOpen: false });
  dispose();
});
