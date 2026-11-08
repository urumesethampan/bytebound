/** Service-worker logic under a simulated Cache/Fetch API; NOT browser offline certification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';
const sha = data => createHash('sha256').update(data).digest('hex');
async function setup({ corrupt = false } = {}) {
    const base = 'https://example.test/bytebound/', version = 'unit-version', assets = new Map([['index.html', '<h1>Bytebound</h1>'], ['assets/app.js', 'export const ready=true;'], ['pyodide/python_stdlib.zip', 'small simulated package']]);
    const files = [...assets].map(([url, text]) => ({ url, bytes: Buffer.byteLength(text), sha256: sha(text), group: url.startsWith('pyodide/') ? 'runtime' : 'shell' }));
    const inventory = { version, files }, listeners = {}, messages = [], stores = new Map();
    let online = true, broken = corrupt, requests = 0;
    const urlOf = r => typeof r === 'string' ? r : r.href || r.url;
    const caches = { async open(name) { if (!stores.has(name))
            stores.set(name, new Map()); const map = stores.get(name); return { async match(r) { return map.get(urlOf(r))?.clone(); }, async put(r, v) { map.set(urlOf(r), v.clone()); }, async delete(r) { return map.delete(urlOf(r)); }, async keys() { return [...map.keys()].map(url => ({ url })); } }; }, async keys() { return [...stores.keys()]; }, async delete(k) { return stores.delete(k); } };
    const self = { registration: { scope: base }, clients: { async matchAll() { return [{ postMessage: m => messages.push(m) }]; }, async claim() { } }, addEventListener: (name, fn) => listeners[name] = fn, async skipWaiting() { } };
    const fetch = async (url) => { requests++; if (!online)
        throw new Error('Offline'); const rel = urlOf(url).slice(base.length); if (rel === 'offline-manifest.json')
        return new Response(JSON.stringify(inventory)); if (assets.has(rel))
        return new Response(broken && rel.startsWith('pyodide/') ? 'CORRUPTED' : assets.get(rel)); return new Response('Missing', { status: 404 }); };
    const context = { self, caches, fetch, URL, Response, crypto: webcrypto, console };
    vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8').replaceAll('__BUILD_VERSION__', version), context);
    async function dispatch(type, data) { let promise; listeners[type]({ data, waitUntil: p => promise = p }); await promise; }
    return { messages, dispatch, offline: () => online = false, repair: () => broken = false, get requests() { return requests; }, async request(url, mode = 'navigate') { let p; listeners.fetch({ request: { url: base + url, method: 'GET', mode }, respondWith: value => p = value }); return p; } };
}
test('offline marker appears only after every checksum-verified file is saved', async () => { const env = await setup(); await env.dispatch('install'); assert.equal(env.messages.some(m => m.status === 'ready'), false); await env.dispatch('message', { type: 'PREPARE' }); assert.equal(env.messages.at(-1).status, 'ready'); assert.equal(env.messages.at(-1).done, 3); });
test('corrupt package fails readiness and a retry resumes successfully', async () => { const env = await setup({ corrupt: true }); await env.dispatch('install'); await env.dispatch('message', { type: 'PREPARE' }); assert.equal(env.messages.at(-1).status, 'error'); assert.equal(env.messages.some(m => m.status === 'ready'), false); env.repair(); await env.dispatch('message', { type: 'PREPARE' }); assert.equal(env.messages.at(-1).status, 'ready'); });
test('cached navigation and runtime assets are served with network unavailable', async () => { const env = await setup(); await env.dispatch('install'); await env.dispatch('message', { type: 'PREPARE' }); env.offline(); assert.match(await (await env.request('')).text(), /Bytebound/); assert.equal(await (await env.request('pyodide/python_stdlib.zip', 'same-origin')).text(), 'small simulated package'); });
test('repeat preparation re-verifies cache without downloading asset bytes again', async () => { const env = await setup(); await env.dispatch('install'); await env.dispatch('message', { type: 'PREPARE' }); const before = env.requests; await env.dispatch('message', { type: 'PREPARE' }); assert.equal(env.requests, before); assert.equal(env.messages.at(-1).status, 'ready'); });
