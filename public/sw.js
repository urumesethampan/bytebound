/* Bytebound service worker: versioned same-origin caches; no analytics or third-party URLs. */
const VERSION = '__BUILD_VERSION__';
const SCOPE = new URL(self.registration.scope);
const PREFIX = 'bytebound-' + SCOPE.pathname.replaceAll('/', '_') + '-';
const CACHE = PREFIX + VERSION;
const META = new URL('__offline_ready__', SCOPE).href;
let preparing = null, inventory = null;
function safeURL(relative) { const url = new URL(relative, SCOPE); if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname))
    throw new Error('Asset outside app scope.'); return url; }
async function manifest() {
    if (inventory)
        return inventory;
    const cache = await caches.open(CACHE), url = safeURL('offline-manifest.json');
    let response;
    const saved = await cache.match(url);
    try {
        const candidate = await fetch(url, { cache: 'no-store' });
        if (!candidate.ok)
            throw new Error('Offline manifest is unavailable.');
        const candidateData = await candidate.clone().json();
        if (candidateData.version === VERSION) {
            response = candidate;
            await cache.put(url, response.clone());
        }
        else if (saved)
            response = saved;
        else
            throw new Error('Offline version mismatch. Reload online before preparing again.');
    }
    catch (error) {
        response = saved;
        if (!response)
            throw error;
    }
    const data = await response.json();
    if (data.version !== VERSION || !Array.isArray(data.files) || data.files.length > 5000)
        throw new Error('Offline version mismatch. Reload online before preparing again.');
    for (const file of data.files)
        if (typeof file.url !== 'string' || !Number.isSafeInteger(file.bytes) || !/^[a-f0-9]{64}$/.test(file.sha256 || ''))
            throw new Error('Invalid offline asset manifest.');
    inventory = data;
    return data;
}
async function notify(data) { for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
    client.postMessage({ app: 'bytebound', ...data }); }
function hex(bytes) { return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function verified(response, file) { if (!response?.ok)
    return false; const bytes = await response.clone().arrayBuffer(); return bytes.byteLength === file.bytes && hex(await crypto.subtle.digest('SHA-256', bytes)) === file.sha256; }
async function storeFile(cache, file) {
    const url = safeURL(file.url);
    let response = await cache.match(url);
    if (await verified(response, file))
        return;
    response = await fetch(url, { cache: 'no-store' });
    if (!(await verified(response, file)))
        throw new Error(`Could not verify ${file.url}. Stay online and retry the offline kit.`);
    await cache.put(url, response);
}
async function status() { const cache = await caches.open(CACHE), mark = await cache.match(META); if (mark) {
    const data = await mark.json();
    const keys = new Set((await cache.keys()).map(r => r.url));
    const m = await manifest();
    if (m.files.every(f => keys.has(safeURL(f.url).href))) {
        await notify({ status: 'ready', done: m.files.length, total: m.files.length, message: 'Ready offline - all lessons and Python packages are saved.' });
        return true;
    }
    await cache.delete(META);
} await notify({ status: 'not-ready', message: 'Preparing your offline kit.' }); return false; }
async function prepare() {
    if (preparing)
        return preparing;
    preparing = (async () => {
        try {
            const m = await manifest(), cache = await caches.open(CACHE);
            await cache.delete(META);
            let done = 0;
            await notify({ status: 'downloading', done, total: m.files.length, message: 'Saving the app, Python, and science toolkit. Keep this tab open.' });
            // Two concurrent fetches cap memory and avoid saturating low-end devices.
            const queue = [...m.files].sort((a, b) => (a.group === 'shell' ? 0 : 1) - (b.group === 'shell' ? 0 : 1));
            let next = 0;
            async function consume() { while (next < queue.length) {
                const file = queue[next++];
                await storeFile(cache, file);
                done++;
                await notify({ status: 'downloading', done, total: m.files.length, message: `Saving offline kit: ${done} / ${m.files.length} files` });
            } }
            await Promise.all([consume(), consume()]);
            await cache.put(META, new Response(JSON.stringify({ version: VERSION, files: m.files.length }), { headers: { 'Content-Type': 'application/json' } }));
            await status();
        }
        catch (error) {
            await notify({ status: 'error', message: error.name === 'QuotaExceededError' ? 'Not enough browser storage for the offline kit. Free space, export progress, and retry.' : error.message });
        }
        finally {
            preparing = null;
        }
    })();
    return preparing;
}
self.addEventListener('install', event => event.waitUntil((async () => {
    const m = await manifest(), cache = await caches.open(CACHE);
    // Install only the small complete shell. Scientific packages are downloaded on PREPARE.
    for (const f of m.files.filter(f => f.group === 'shell'))
        await storeFile(cache, f);
    // Do not force an update over an open mission. The UI explicitly activates waiting updates.
})()));
self.addEventListener('activate', event => event.waitUntil((async () => { await self.clients.claim(); for (const key of await caches.keys())
    if (key.startsWith(PREFIX) && key !== CACHE)
        await caches.delete(key); })()));
self.addEventListener('message', event => {
    if (event.data?.type === 'PREPARE')
        event.waitUntil(prepare());
    if (event.data?.type === 'STATUS')
        event.waitUntil(status().catch(() => notify({ status: 'not-ready', message: 'Offline preparation is incomplete.' })));
    if (event.data?.type === 'ACTIVATE')
        event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname))
        return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE), direct = await cache.match(event.request, { ignoreSearch: false });
        if (direct)
            return direct;
        if (event.request.mode === 'navigate') {
            // Hash routing: both /app/ and /app/index.html use the same cached entry document.
            const shell = await cache.match(safeURL('index.html'));
            if (shell)
                return shell;
        }
        return fetch(event.request);
    })());
});
