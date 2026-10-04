import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consumeScan } from '../src/consume-scan.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(start = async () => {}) {
  let receive;
  let removed = 0;
  let started = 0;
  return {
    transport: {
      listen: async (callback) => { receive = callback; return () => removed++; },
      start: () => { started++; return start(); },
    },
    send: (event) => receive(event),
    get removed() { return removed; },
    get started() { return started; },
  };
}

test('streams single folders before completion, ignores other scans, and waits beyond the command response', async () => {
  const h = harness();
  const received = [];
  let finished = false;
  const result = consumeScan(h.transport, 'a', folder => received.push(folder))
    .then(() => { finished = true; });
  await tick();
  assert.equal(h.started, 1);
  h.send({ scanId: 'other', status: 'item', item: { path: '/other' } });
  h.send({ scanId: 'other', status: 'completed' });
  h.send({ scanId: 'a', status: 'item', item: { path: '/first' } });
  await tick();
  assert.deepEqual(received, [{ path: '/first' }]);
  assert.equal(finished, false);
  h.send({ scanId: 'a', status: 'item', item: { path: '/last' } });
  h.send({ scanId: 'a', status: 'completed' });
  await result;
  assert.equal(received.length, 2);
  assert.equal(h.removed, 1);
});

test('empty search completes and releases listener', async () => {
  const h = harness();
  const result = consumeScan(h.transport, 'a', () => assert.fail('unexpected folder'));
  await tick();
  h.send({ scanId: 'a', status: 'completed' });
  await result;
  assert.equal(h.removed, 1);
});

test('failure retains already delivered folders and releases listener', async () => {
  const h = harness();
  const received = [];
  const result = consumeScan(h.transport, 'a', folder => received.push(folder));
  const rejected = assert.rejects(result, /permission denied/);
  await tick();
  h.send({ scanId: 'a', status: 'item', item: { path: '/first' } });
  h.send({ scanId: 'a', status: 'failed', error: 'permission denied' });
  await rejected;
  assert.equal(received.length, 1);
  assert.equal(h.removed, 1);
});

test('command rejection does not leave a waiting listener', async () => {
  const h = harness(async () => { throw new Error('IPC failed'); });
  await assert.rejects(consumeScan(h.transport, 'a', () => {}), /IPC failed/);
  assert.equal(h.removed, 1);
});

test('abort ignores late results and releases listener', async () => {
  const h = harness();
  const controller = new AbortController();
  const result = consumeScan(h.transport, 'a', () => assert.fail('late folder'), controller.signal);
  const rejected = assert.rejects(result, { name: 'AbortError' });
  await tick();
  controller.abort();
  h.send({ scanId: 'a', status: 'item', item: { path: '/late' } });
  await rejected;
  assert.equal(h.removed, 1);
});

test('abort while listener is being installed cleans it up without starting scan', async () => {
  let installed;
  let removed = 0;
  const controller = new AbortController();
  const result = consumeScan({
    listen: () => new Promise(resolve => { installed = resolve; }),
    start: async () => assert.fail('cancelled scan started'),
  }, 'a', () => {}, controller.signal);
  const rejected = assert.rejects(result, { name: 'AbortError' });
  controller.abort();
  await rejected;
  installed(() => removed++);
  await tick();
  assert.equal(removed, 1);
});

test('subscription failure never starts work', async () => {
  await assert.rejects(consumeScan({
    listen: async () => { throw new Error('listen failed'); },
    start: async () => assert.fail('unexpected start'),
  }, 'a', () => {}), /listen failed/);
});

test('abort sends cancellation after start acknowledgement', async () => {
  const h = harness();
  let cancelled = 0;
  h.transport.cancel = async () => { cancelled++; };
  const controller = new AbortController();
  const result = consumeScan(h.transport, 'a', () => {}, controller.signal);
  const rejected = assert.rejects(result, { name: 'AbortError' });
  await tick();
  controller.abort();
  await rejected;
  assert.equal(cancelled, 1);
  assert.equal(h.removed, 1);
});

test('abort during start waits for registration before cancelling worker', async () => {
  let acknowledge;
  let cancelled = 0;
  const h = harness(() => new Promise(resolve => { acknowledge = resolve; }));
  h.transport.cancel = async () => { cancelled++; };
  const controller = new AbortController();
  const result = consumeScan(h.transport, 'a', () => {}, controller.signal);
  const rejected = assert.rejects(result, { name: 'AbortError' });
  await tick();
  controller.abort();
  await rejected;
  assert.equal(cancelled, 0);
  acknowledge();
  await tick();
  assert.equal(cancelled, 1);
});

test('backend cancellation terminates subscription', async () => {
  const h = harness();
  const result = consumeScan(h.transport, 'a', () => {});
  const rejected = assert.rejects(result, { name: 'AbortError' });
  await tick();
  h.send({ scanId: 'a', status: 'cancelled' });
  await rejected;
  assert.equal(h.removed, 1);
});

test('terminal event excludes immediately following stale items', async () => {
  const h = harness();
  const result = consumeScan(h.transport, 'a', () => assert.fail('item after completion'));
  await tick();
  h.send({ scanId: 'a', status: 'completed' });
  h.send({ scanId: 'a', status: 'item', item: { path: '/late' } });
  await result;
  assert.equal(h.removed, 1);
});
