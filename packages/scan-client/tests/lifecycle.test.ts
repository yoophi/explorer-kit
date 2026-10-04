import test from "node:test";
import assert from "node:assert/strict";
import { ScanLifecycle } from "../src/scan-lifecycle";
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }

test("eager cancellation retries after ack, and dispose gates all future delivery", async () => {
  const ack = deferred<{ scanId: string }>();
  const calls: string[] = [];
  const session = new ScanLifecycle({ start: () => ack.promise, cancel: async (id) => { calls.push(id); } }, { onStartError: assert.fail, onCancelError: assert.fail }, { cancelBeforeAcknowledgement: true });
  assert.equal(session.state, "idle");
  assert.equal(session.start({ scanId: "a" }), true);
  assert.equal(session.start({ scanId: "b" }), false);
  assert.equal(session.accepts("other"), false);
  session.dispose();
  session.dispose();
  assert.equal(session.accepts("a"), false);
  ack.resolve({ scanId: "a" });
  await tick();
  assert.deepEqual(calls, ["a", "a"]);
  assert.equal(session.state, "disposed");
  assert.equal(session.finish("a"), false);
  assert.equal(session.start({ scanId: "b" }), false);
});

test("terminal before ack closes identity and permits a new job without late ack effects", async () => {
  const ack = deferred<{ scanId: string }>();
  const calls: string[] = [];
  const session = new ScanLifecycle({ start: ({ scanId }) => scanId === "a" ? ack.promise : Promise.resolve({ scanId }), cancel: async (id) => { calls.push(id); } }, { onStartError: assert.fail, onCancelError: assert.fail });
  session.start({ scanId: "a" });
  assert.equal(session.finish("other"), false);
  assert.equal(session.finish("a"), true);
  assert.equal(session.accepts("a"), false);
  assert.equal(session.start({ scanId: "b" }), true);
  ack.resolve({ scanId: "a" });
  await tick();
  assert.equal(session.accepts("b"), true);
  assert.deepEqual(calls, []);
});

test("ack mismatch and synchronous start failure release active identity", async () => {
  const errors: unknown[] = [];
  const session = new ScanLifecycle({ start: async () => ({ scanId: "wrong" }) }, { onStartError: (error) => errors.push(error), onCancelError: assert.fail });
  session.start({ scanId: "a" });
  await tick();
  assert.match(String(errors[0]), /mismatch/);
  assert.equal(session.accepts("a"), false);
  const sync = new ScanLifecycle({ start: () => { throw new Error("sync failure"); } }, { onStartError: (error) => errors.push(error), onCancelError: assert.fail });
  assert.doesNotThrow(() => sync.start({ scanId: "a" }));
  await tick();
  assert.match(String(errors[1]), /sync failure/);
});

test("post-ack cancel failure restores running state and permits retry", async () => {
  let count = 0;
  const errors: unknown[] = [];
  const session = new ScanLifecycle({ start: async ({ scanId }) => ({ scanId }), cancel: async () => { if (++count === 1) throw new Error("offline"); } }, { onStartError: assert.fail, onCancelError: (error) => errors.push(error) });
  session.start({ scanId: "a" });
  await tick();
  session.cancel();
  await tick();
  assert.equal(errors.length, 1);
  assert.equal(session.state, "running");
  session.cancel();
  await tick();
  assert.equal(count, 2);
  assert.equal(session.state, "cancelling");
});
