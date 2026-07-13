"use client";

import * as React from "next/dist/compiled/react";

const ReactRuntime = React as unknown as typeof import("react");

export * from "next/dist/compiled/react";
export default React;

export function useEffectEvent<Args extends unknown[], Result>(callback: (...args: Args) => Result) {
  const callbackRef = ReactRuntime.useRef(callback);

  ReactRuntime.useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return ReactRuntime.useCallback((...args: Args) => callbackRef.current(...args), []);
}
