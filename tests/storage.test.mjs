import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ProgressStore } from '../src/game/storage.js';
import { SAVE_KEY, newState } from '../src/game/state.js';
const catalog = JSON.parse(fs.readFileSync(new URL('../public/lessons.json', import.meta.url)));
function environment(t, { read = null, throwRead = false, throwWrite = false } = {}) { const events = new EventTarget(), saved = new Map(); globalThis.window = { localStorage: { getItem() { if (throwRead)
            throw new Error('Denied'); return read; }, setItem(k, v) { if (throwWrite)
            throw new Error('Full'); saved.set(k, v); } }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) }; const store = new ProgressStore(catalog); t.after(() => store.destroy()); return { store, saved, events }; }
test('localStorage access denial keeps playable in-memory state', t => { const { store } = environment(t, { throwRead: true, throwWrite: true }); assert.ok(store.warning); const s = structuredClone(store.state); s.xp = 20; store.save(s); assert.equal(store.state.xp, 20); assert.ok(JSON.parse(store.export())); assert.match(store.warning, /memory/); });
test('corrupted saved JSON fails without crashing or losing export ability', t => { const { store } = environment(t, { read: '{broken' }); assert.equal(store.state.xp, 0); assert.ok(store.warning); assert.equal(JSON.parse(store.export()).version, 1); });
test('invalid import never overwrites an existing save; reset is complete', t => { const { store } = environment(t); let s = structuredClone(store.state); s.xp = 100; store.save(s); assert.throws(() => store.import('{')); assert.equal(store.state.xp, 100); store.reset(); assert.equal(store.state.xp, 0); assert.deepEqual(store.state.completed, []); });
test('newer external tab saves block stale writes', t => { const { store, events } = environment(t); const s = newState(Date.now() + 1000); const event = new Event('storage'); Object.assign(event, { key: SAVE_KEY, newValue: JSON.stringify(s) }); events.dispatchEvent(event); assert.equal(store.conflicted, true); assert.throws(() => store.save(store.state), /Another tab/); });
