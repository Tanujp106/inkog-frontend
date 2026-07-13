import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../node_modules/interface-kit/dist/react.js", import.meta.url);
const source = await readFile(file, "utf8");
const marker = "/* inkog interface-kit React compatibility */";

if (source.includes(marker)) {
  process.exit(0);
}

const firstImport = 'import { useEffect as useEffect26, useEffectEvent, useRef as useRef27 } from "react";';
const firstReplacement = `import { useEffect as useEffect26, useRef as useRef27 } from "react";
${marker}
const useEffectEvent = callback => {
  const callbackRef = useRef27(callback);
  useEffect26(() => {
    callbackRef.current = callback;
  });
  return (...args) => callbackRef.current(...args);
};`;
const secondImport = 'import { useEffect as useEffect27, useEffectEvent as useEffectEvent2 } from "react";';
const secondReplacement = `import { useEffect as useEffect27 } from "react";
const useEffectEvent2 = useEffectEvent;`;

if (!source.includes(firstImport) || !source.includes(secondImport)) {
  throw new Error("Unsupported interface-kit version: expected React event-hook imports were not found.");
}

await writeFile(file, source.replace(firstImport, firstReplacement).replace(secondImport, secondReplacement));
