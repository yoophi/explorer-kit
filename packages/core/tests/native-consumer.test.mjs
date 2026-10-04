import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("core package exports load in native TypeScript consumers", {
  skip: !process.allowedNodeEnvironmentFlags.has("--experimental-strip-types"),
}, () => {
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `
    import { compareCodePoints, compareLowercasedCodePoints, formatBytes } from "@yoophi/explorer-core";
    if (compareCodePoints("a", "b") >= 0 || compareLowercasedCodePoints("A", "a") !== 0 || typeof formatBytes !== "function") process.exit(2);
  `], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
