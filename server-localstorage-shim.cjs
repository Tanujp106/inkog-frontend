const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

if (descriptor && (typeof descriptor.get === "function" || typeof descriptor.value?.getItem !== "function")) {
  delete globalThis.localStorage;
}
