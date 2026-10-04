import { test } from "node:test";
import assert from "node:assert/strict";
import { ImagePasteSession } from "../src/paste-session";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const payload = { extension: "png" as const, bytes: [1] };
const image = new Blob([new Uint8Array([1])], { type: "image/png" });

test("same-target saves are serial and only the newest paste owns preview", async () => {
  const first = deferred<boolean>();
  const calls: string[] = [];
  const disposed: string[] = [];
  const session = new ImagePasteSession(
    async (_key, value) => { calls.push(String(value.bytes[0])); return calls.length === 1 ? first.promise : true; },
    () => {},
    async () => ({ ...payload, bytes: [calls.length + 1] }),
    () => ({ url: `preview-${calls.length}`, dispose: () => disposed.push("preview") }),
  );
  session.setTarget(true, "cover");
  const firstPaste = session.paste(image);
  await new Promise((resolve) => setImmediate(resolve));
  const secondPaste = session.paste(image);
  assert.deepEqual(calls, ["1"]);
  first.resolve(true);
  await Promise.all([firstPaste, secondPaste]);
  assert.deepEqual(calls, ["1", "2"]);
  assert.equal(session.getState().previewUrl, "preview-2");
  session.clear();
  assert.deepEqual(disposed, ["preview"]);
});

test("close or target change during image read never starts a stale save", async () => {
  for (const change of [() => [false, null] as const, () => [true, "other"] as const]) {
    const read = deferred<typeof payload>();
    let saves = 0;
    const session = new ImagePasteSession(async () => { saves++; return true; }, () => {}, () => read.promise);
    session.setTarget(true, "initial");
    const paste = session.paste(image);
    await new Promise((resolve) => setImmediate(resolve));
    const [active, key] = change();
    session.setTarget(active, key);
    read.resolve(payload);
    await paste;
    assert.equal(saves, 0);
  }
});

test("an already-started save remains effective after close but cannot restore stale preview", async () => {
  const save = deferred<boolean>();
  const writes: string[] = [];
  const session = new ImagePasteSession(async (key) => { writes.push(key); return save.promise; }, () => {}, async () => payload);
  session.setTarget(true, "cover");
  const paste = session.paste(image);
  await new Promise((resolve) => setImmediate(resolve));
  session.setTarget(false, null);
  save.resolve(true);
  await paste;
  assert.deepEqual(writes, ["cover"]);
  assert.equal(session.getState().previewUrl, null);
});

test("failed latest save retains previous preview and reports error", async () => {
  let succeed = true;
  const session = new ImagePasteSession(async () => succeed, () => {}, async () => payload,
    () => ({ url: "preview", dispose: () => {} }));
  session.setTarget(true, "cover");
  await session.paste(image);
  succeed = false;
  await session.paste(image);
  assert.equal(session.getState().previewUrl, "preview");
  assert.match(session.getState().error ?? "", /저장하지 못했습니다/);
});

test("a slow old target does not block another target; returning to it preserves write order", async () => {
  const oldSave = deferred<boolean>();
  const writes: string[] = [];
  const revoked: string[] = [];
  const session = new ImagePasteSession(async (key) => {
    writes.push(key);
    return writes.length === 1 ? oldSave.promise : true;
  }, () => {}, async () => payload, () => ({ url: `preview-${writes.at(-1)}`, dispose: () => revoked.push("revoked") }));
  session.setTarget(true, "A");
  const firstA = session.paste(image);
  await new Promise((resolve) => setImmediate(resolve));
  session.setTarget(true, "B");
  const firstB = session.paste(image);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, ["A", "B"]);
  assert.equal(session.getState().previewUrl, "preview-B");
  session.setTarget(true, "A");
  const secondA = session.paste(image);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, ["A", "B"]);
  assert.equal(session.getState().pending, true);
  oldSave.resolve(true);
  await Promise.all([firstA, firstB, secondA]);
  assert.deepEqual(writes, ["A", "B", "A"]);
  assert.equal(session.getState().previewUrl, "preview-A");
  assert.deepEqual(revoked, ["revoked"]);
});
