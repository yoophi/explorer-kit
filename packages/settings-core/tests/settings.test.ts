import { test } from "node:test";
import assert from "node:assert/strict";
import { createSettingsStore } from "../src/index.ts";

function fixture(format?: "raw") {
  let text: string | null = null;
  let denied = false;
  let writes = 0;
  const parse = (input: unknown) => {
    if (!input || typeof input !== "object" || !("hidden" in input) || typeof input.hidden !== "boolean"
      || !("depth" in input) || !Number.isInteger(input.depth) || Number(input.depth) < 0) throw new Error("Invalid settings");
    return { hidden: input.hidden, depth: Number(input.depth) };
  };
  const store = createSettingsStore({ key: "settings", defaults: { hidden: false, depth: 4 }, parse, format,
    storage: () => ({ getItem: () => text, setItem: (_key, value) => {
      if (denied) throw new Error("Storage denied");
      text = value; writes++;
    } }),
  });
  return { store, text: () => text, set: (value: string) => { text = value; }, deny: () => { denied = true; }, writes: () => writes };
}

test("missing settings read uses defaults without writing; snapshot is stable", () => {
  const f = fixture();
  assert.deepEqual(f.store.getSnapshot().value, { hidden: false, depth: 4 });
  assert.equal(f.store.getSnapshot(), f.store.getSnapshot());
  assert.equal(f.writes(), 0);
});

test("malformed and unsupported documents are preserved until explicit reset", () => {
  for (const text of ["{broken", JSON.stringify({ version: 2, value: { hidden: true, depth: 9 } }), JSON.stringify({ version: 1, value: { hidden: "yes" } })]) {
    const f = fixture(); f.set(text);
    assert.ok(f.store.getSnapshot().error);
    assert.equal(f.store.update((value) => ({ ...value, hidden: true })), false);
    assert.equal(f.text(), text);
    assert.equal(f.store.reset(), true);
    assert.equal(f.store.getSnapshot().error, null);
  }
});

test("denied writes keep confirmed state and expose error", () => {
  const f = fixture(); f.store.getSnapshot(); f.deny();
  assert.equal(f.store.update((value) => ({ ...value, depth: 8 })), false);
  assert.equal(f.store.getSnapshot().value.depth, 4);
  assert.match(f.store.getSnapshot().error!, /denied/);
  assert.equal(f.text(), null);
});

test("updates reread latest storage to preserve unrelated changed settings", () => {
  const f = fixture(); f.store.getSnapshot();
  f.set(JSON.stringify({ version: 1, value: { hidden: false, depth: 9 } }));
  assert.equal(f.store.update((value) => ({ ...value, hidden: true })), true);
  assert.deepEqual(JSON.parse(f.text()!).value, { hidden: true, depth: 9 });
});

test("raw codec preserves existing key format and invalid updates do not persist", () => {
  const f = fixture("raw"); f.set('{"hidden":true,"depth":2}');
  assert.equal(f.store.getSnapshot().value.hidden, true);
  assert.equal(f.writes(), 0);
  assert.equal(f.store.update((value) => ({ ...value, depth: -1 })), false);
  assert.equal(f.text(), '{"hidden":true,"depth":2}');
  f.store.update((value) => ({ ...value, depth: 3 }));
  assert.deepEqual(JSON.parse(f.text()!), { hidden: true, depth: 3 });
});

test("blocked storage access is reported without throwing during render", () => {
  const store = createSettingsStore({ key: "denied", defaults: false,
    parse: (value) => { if (typeof value !== "boolean") throw new Error("Invalid"); return value; },
    storage: () => { throw new Error("Access denied"); },
  });
  assert.equal(store.getSnapshot().value, false);
  assert.match(store.getSnapshot().error!, /Access denied/);
  assert.equal(store.update(() => true), false);
});

test("no-op update does not create a missing key or require write access", () => {
  const f = fixture(); f.deny();
  assert.equal(f.store.update((value) => ({ ...value })), true);
  assert.equal(f.text(), null);
  assert.equal(f.store.getSnapshot().error, null);
});

test("subscribers observe confirmed changes and unsubscribe cleanly", () => {
  const f = fixture(); const seen: number[] = [];
  const unsubscribe = f.store.subscribe(() => seen.push(f.store.getSnapshot().value.depth));
  f.store.update((value) => ({ ...value, depth: 6 }));
  unsubscribe();
  f.store.update((value) => ({ ...value, depth: 7 }));
  assert.deepEqual(seen, [6]);
});

test("storage events refresh matching keys and remove listener on unsubscribe", () => {
  const target = new EventTarget();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  try {
    const f = fixture();
    const unsubscribe = f.store.subscribe(() => {});
    const event = (key: string | null) => {
      const event = new Event("storage");
      Object.defineProperties(event, { key: { value: key }, storageArea: { value: null } });
      target.dispatchEvent(event);
    };
    f.set(JSON.stringify({ version: 1, value: { hidden: true, depth: 9 } }));
    event("unrelated");
    assert.equal(f.store.getSnapshot().value.hidden, false);
    event("settings");
    assert.equal(f.store.getSnapshot().value.hidden, true);
    unsubscribe();
    f.set(JSON.stringify({ version: 1, value: { hidden: false, depth: 2 } }));
    event(null);
    assert.equal(f.store.getSnapshot().value.depth, 9);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
