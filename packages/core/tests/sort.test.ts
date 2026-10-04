import assert from "node:assert/strict";
import test from "node:test";
import { compareLowercasedCodePoints, compareCodePoints } from "../src/index.ts";

test("lowercased Unicode code point order", () => {
  assert.ok(compareLowercasedCodePoints("\uE000.mp4", "\u{10000}.mp4") < 0);
  assert.ok(compareLowercasedCodePoints("\u{10000}.mp4", "\uE000.mp4") > 0);
  assert.ok(compareLowercasedCodePoints("Alpha", "beta") < 0);
  assert.equal(compareLowercasedCodePoints("ALPHA", "alpha"), 0);
  assert.ok(compareLowercasedCodePoints("a", "ab") < 0);
  assert.ok(compareLowercasedCodePoints("ab", "a") > 0);
  assert.equal(compareLowercasedCodePoints("same", "same"), 0);
});

test("pre-lowercased names retain the same code point order", () => {
  const names = ["\u{10000}.mp4", "\uE000.mp4", "ALPHA", "alpha", "ab", "a"];
  for (const left of names) {
    for (const right of names) {
      assert.equal(
        compareCodePoints(Array.from(left.toLowerCase()), Array.from(right.toLowerCase())),
        compareLowercasedCodePoints(left, right),
      );
    }
  }
});
