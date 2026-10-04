import { test } from "node:test";
import assert from "node:assert/strict";
import { readImagePayload, clipboardImage, createImagePreview } from "../src/index.ts";

test("image payload preserves bytes and normalizes JPEG extension", async () => {
  assert.deepEqual(await readImagePayload(new Blob([new Uint8Array([0, 128, 255])], { type: "image/jpeg" })),
    { extension: "jpg", bytes: [0, 128, 255] });
  await assert.rejects(readImagePayload(new Blob(["x"], { type: "image/svg+xml" })), /PNG/);
});
test("clipboard input safely handles no image", () => {
  assert.equal(clipboardImage(null), null);
});
test("preview has an explicit disposal lifecycle", () => {
  const preview = createImagePreview(new Blob(["x"], { type: "image/png" }));
  assert.match(preview.url, /^blob:/);
  preview.dispose();
});
