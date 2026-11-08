/** Inventory every production asset, including lazy chunks, for verified offline readiness. */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = path.resolve('dist');
const sha = data => createHash('sha256').update(data).digest('hex');
async function walk(dir) { const out = []; for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.name.startsWith('.'))
        continue;
    const p = path.join(dir, item.name);
    if (item.isDirectory())
        out.push(...await walk(p));
    else if (item.isFile())
        out.push(p);
} return out; }
const candidates = (await walk(root)).filter(p => !['sw.js', 'offline-manifest.json', '_headers'].includes(path.basename(p)) && !p.endsWith('.map'));
const files = [];
for (const p of candidates.sort()) {
    const data = await readFile(p), url = path.relative(root, p).split(path.sep).join('/');
    files.push({ url, bytes: data.length, sha256: sha(data), group: url.startsWith('pyodide/') ? 'runtime' : 'shell' });
}
for (const needed of ['index.html', 'lessons.json', 'grader.py', 'python-worker.js', 'pyodide/pyodide.mjs', 'pyodide/pyodide.asm.wasm', 'pyodide/python_stdlib.zip'])
    if (!files.some(f => f.url === needed))
        throw new Error(`Missing required production asset: ${needed}`);
const version = sha(JSON.stringify(files)).slice(0, 16);
const manifest = { version, files, totalBytes: files.reduce((n, f) => n + f.bytes, 0) };
await writeFile(path.join(root, 'offline-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const swPath = path.join(root, 'sw.js');
let sw = await readFile(swPath, 'utf8');
sw = sw.replaceAll('__BUILD_VERSION__', version);
await writeFile(swPath, sw);
await writeFile('qa/build-size-results.json', JSON.stringify({ version, totalBytes: manifest.totalBytes, files: files.length, groups: Object.fromEntries(['shell', 'runtime'].map(g => [g, files.filter(f => f.group === g).reduce((s, f) => s + f.bytes, 0)])) }, null, 2) + '\n');
console.log(`Build ${version}: ${files.length} offline assets, ${(manifest.totalBytes / 1048576).toFixed(1)} MiB total.`);
