import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("public scan API supports existing native TypeScript consumers", {
  skip: !process.allowedNodeEnvironmentFlags.has("--experimental-strip-types"),
}, () => {
  const source = new URL("../src/index.ts", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `const api = await import(${JSON.stringify(source)}); if (typeof api.ScanLifecycle !== 'function' || typeof api.consumeScan !== 'function') process.exit(2);`], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
