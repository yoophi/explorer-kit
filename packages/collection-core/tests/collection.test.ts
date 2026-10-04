import { test } from "node:test";
import assert from "node:assert/strict";
import { countTags, shuffledRank } from "../src/index.ts";

test("tag counts deduplicate each item and merge normalized names", () => {
  assert.deepEqual(countTags([[" Alice ", "alice", ""], ["ALICE"]], x => x),
    [{ key: "alice", label: "Alice", count: 2 }]);
});
test("seeded ranks remain stable across re-renders", () => {
  assert.equal(shuffledRank("/folder", 42), shuffledRank("/folder", 42));
  assert.notEqual(shuffledRank("/folder", 42), shuffledRank("/folder", 43));
});
