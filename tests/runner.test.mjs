import test from 'node:test';
import assert from 'node:assert/strict';
import { PythonRunner } from '../src/engine/runner.js';
function environment(t) {
    const workers = [];
    globalThis.document = new EventTarget();
    document.hidden = false;
    globalThis.window = { Worker: true, WebAssembly: true };
    class MockWorker {
        constructor() { this.messages = []; this.terminated = false; workers.push(this); }
        postMessage(m) { this.messages.push(m); }
        terminate() { this.terminated = true; }
        receive(data) { this.onmessage?.({ data }); }
    }
    globalThis.Worker = MockWorker;
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const runner = new PythonRunner('https://example.test/bytebound/');
    t.after(() => { runner.destroy(); t.mock.timers.reset(); });
    return { runner, workers };
}
const payload = { code: 'print(1)', tests: [], inputs: [], packages: [] };
test('runner rejects empty input without starting a worker', async (t) => { const { runner, workers } = environment(t); assert.equal((await runner.run({ ...payload, code: ' ' })).error.type, 'EmptyInput'); assert.equal(workers.length, 0); });
test('rapid repeated runs produce Busy, not overlapping execution', async (t) => { const { runner, workers } = environment(t); const first = runner.run(payload); assert.equal((await runner.run(payload)).error.type, 'Busy'); const id = workers[0].messages.at(-1).id; workers[0].receive({ type: 'result', id, result: { ok: true } }); assert.equal((await first).ok, true); });
test('five-second watchdog starts after executing, not during package loading', async (t) => { const { runner, workers } = environment(t); const run = runner.run(payload), worker = workers[0], id = worker.messages.at(-1).id; worker.receive({ type: 'ready' }); t.mock.timers.tick(15000); assert.equal(worker.terminated, false); worker.receive({ type: 'executing', id }); t.mock.timers.tick(4999); assert.equal(worker.terminated, false); t.mock.timers.tick(1); assert.equal((await run).error.type, 'Timeout'); assert.equal(worker.terminated, true); assert.equal(workers.length, 2); });
test('late messages from a terminated worker cannot overwrite the new run', async (t) => { const { runner, workers } = environment(t); const a = runner.run(payload), old = workers[0], id = old.messages.at(-1).id; runner.stop(); assert.equal((await a).error.type, 'Stopped'); const b = runner.run(payload), fresh = workers[1], newId = fresh.messages.at(-1).id; old.receive({ type: 'result', id, result: { ok: true, output: 'stale' } }); assert.equal(runner.pending.id, newId); fresh.receive({ type: 'result', id: newId, result: { ok: true, output: 'current' } }); assert.equal((await b).output, 'current'); });
test('hidden page cancels a pending run', async (t) => { const { runner, workers } = environment(t); const run = runner.run(payload); document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); assert.equal((await run).error.type, 'Stopped'); assert.equal(workers[0].terminated, true); });
test('initialization timeout fails gracefully and clears pending state', async (t) => { const { runner } = environment(t); const run = runner.run(payload); t.mock.timers.tick(120000); assert.equal((await run).error.type, 'Stopped'); assert.equal(runner.status, 'error'); assert.equal(runner.pending, null); });
test('successful run clears watchdog so it does not restart later', async (t) => { const { runner, workers } = environment(t); const run = runner.run(payload), worker = workers[0], id = worker.messages.at(-1).id; worker.receive({ type: 'ready' }); worker.receive({ type: 'executing', id }); worker.receive({ type: 'result', id, result: { ok: true } }); await run; t.mock.timers.tick(10000); assert.equal(workers.length, 1); assert.equal(worker.terminated, false); });
