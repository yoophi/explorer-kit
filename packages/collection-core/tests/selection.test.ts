import { test } from "node:test";
import assert from "node:assert/strict";
import { isSelectionAvailable, reconcileSelection } from "../src/index";

test("partial Movie results retain a still-visible selection", () => {
  assert.equal(reconcileSelection("movie-2", ["movie-1", "movie-2"]), "movie-2");
  assert.equal(isSelectionAvailable("movie-2", ["movie-1", "movie-2"]), true);
  assert.equal(reconcileSelection("movie-2", ["movie-1"]), "movie-1");
});

test("empty or unavailable fallback clears selection, ordered caller fallback wins", () => {
  assert.equal(reconcileSelection("gone", [] as string[]), null);
  assert.equal(reconcileSelection("gone", ["a", "b"], () => "missing"), null);
  assert.equal(reconcileSelection("gone", ["a", "b"], (ids) => ids.at(-1) ?? null), "b");
});
