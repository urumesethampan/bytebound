/** Build-time downloads only. The deployed application uses same-origin assets exclusively. */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rm, copyFile, readdir, stat, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = '314.0.7';
const coreSHA = '2abdcc2e35208af406e07724cffa85bc582ced97e9028383ecf5462541393f95';
const cdn = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;
const dest = path.join(root, 'public/pyodide');
const cache = path.join(root, '.build-cache');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function exists(p) { try {
    await access(p);
    return true;
}
catch {
    return false;
} }
async function download(url, target, expected) {
    if (await exists(target)) {
        const data = await readFile(target);
        if (!expected || sha(data) === expected)
            return data;
        await rm(target);
    }
    console.log(`Downloading ${new URL(url).pathname.split('/').at(-1)} ...`);
    let last;
    for (let n = 0; n < 3; n++) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(180000), redirect: 'follow' });
            if (!response.ok)
                throw new Error(`HTTP ${response.status} at ${url}`);
            const data = Buffer.from(await response.arrayBuffer());
            if (expected && sha(data) !== expected)
                throw new Error(`SHA-256 mismatch for ${path.basename(target)}; refusing this asset.`);
            await mkdir(path.dirname(target), { recursive: true });
            await writeFile(target + '.part', data);
            const { rename } = await import('node:fs/promises');
            await rename(target + '.part', target);
            return data;
        }
        catch (error) {
            last = error;
            if (n < 2)
                await new Promise(r => setTimeout(r, 1000 * (n + 1)));
        }
    }
    throw new Error(`Could not obtain ${url}. This is a build-time internet requirement. ${last?.message}`);
}
async function findFile(dir, name) { for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === name)
        return p;
    if (entry.isDirectory()) {
        const found = await findFile(p, name);
        if (found)
            return found;
    }
} return null; }
async function copyTree(from, to) { await mkdir(to, { recursive: true }); for (const e of await readdir(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory())
        await copyTree(a, b);
    else if (e.isFile())
        await copyFile(a, b);
} }
async function run() {
    await mkdir(cache, { recursive: true });
    await mkdir(dest, { recursive: true });
    const archive = path.join(cache, `pyodide-core-${version}.tar.bz2`);
    await download(`https://github.com/pyodide/pyodide/releases/download/${version}/pyodide-core-${version}.tar.bz2`, archive, coreSHA);
    const extract = path.join(cache, 'core');
    await rm(extract, { recursive: true, force: true });
    await mkdir(extract, { recursive: true });
    // Only the pinned, checksum-verified official archive is extracted.
    execFileSync('tar', ['-xjf', archive, '-C', extract], { stdio: 'inherit' });
    const entry = await findFile(extract, 'pyodide.mjs');
    if (!entry)
        throw new Error('The verified core archive does not contain pyodide.mjs.');
    await rm(dest, { recursive: true, force: true });
    await copyTree(path.dirname(entry), dest);
    const lock = JSON.parse(await readFile(path.join(dest, 'pyodide-lock.json'), 'utf8'));
    if (!lock.packages || typeof lock.packages !== 'object')
        throw new Error('Unsupported Pyodide lockfile schema.');
    const included = new Set();
    function include(name) { const normalized = name.toLowerCase().replaceAll('_', '-'); if (included.has(normalized))
        return; const item = lock.packages[normalized] || lock.packages[name]; if (!item)
        throw new Error(`Pyodide has no package: ${name}`); included.add(normalized); for (const dep of item.depends || [])
        include(dep); }
    for (const name of ['numpy', 'pandas', 'matplotlib'])
        include(name);
    for (const name of included) {
        const item = lock.packages[name];
        if (!item?.file_name || !/^[a-zA-Z0-9_.+-]+$/.test(item.file_name))
            throw new Error(`Unsafe package filename: ${name}`);
        if (!/^[a-f0-9]{64}$/i.test(item.sha256 || ''))
            throw new Error(`Missing package checksum: ${name}`);
        const cached = path.join(cache, 'packages', item.file_name);
        await download(cdn + item.file_name, cached, item.sha256);
        await copyFile(cached, path.join(dest, item.file_name));
    }
    const fonts = path.join(root, 'public/fonts'), licenses = path.join(root, 'public/licenses');
    await mkdir(fonts, { recursive: true });
    await mkdir(licenses, { recursive: true });
    for (const [pkg, files] of [
        ['@fontsource/space-grotesk', ['space-grotesk-latin-400-normal.woff2', 'space-grotesk-latin-500-normal.woff2', 'space-grotesk-latin-600-normal.woff2', 'space-grotesk-latin-700-normal.woff2']],
        ['@fontsource/ibm-plex-mono', ['ibm-plex-mono-latin-400-normal.woff2', 'ibm-plex-mono-latin-500-normal.woff2']]
    ]) {
        const dir = path.join(root, 'node_modules', pkg);
        for (const file of files)
            await copyFile(path.join(dir, 'files', file), path.join(fonts, file));
        for (const name of ['LICENSE', 'LICENSE.txt', 'OFL.txt'])
            if (await exists(path.join(dir, name))) {
                await copyFile(path.join(dir, name), path.join(licenses, pkg.split('/').at(-1) + '-LICENSE.txt'));
                break;
            }
    }
    for (const pkg of ['three', '@codemirror/commands', '@codemirror/lang-python', '@codemirror/language', '@codemirror/state', '@codemirror/view', '@lezer/highlight']) {
        const dir = path.join(root, 'node_modules', pkg);
        for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt'])
            if (await exists(path.join(dir, name))) {
                await copyFile(path.join(dir, name), path.join(licenses, pkg.replaceAll('/', '-') + '-LICENSE.txt'));
                break;
            }
    }
    const files = [];
    for (const filename of (await readdir(dest)).sort()) {
        const p = path.join(dest, filename);
        if (!(await stat(p)).isFile())
            continue;
        const data = await readFile(p);
        files.push({ file: filename, bytes: data.length, sha256: sha(data) });
    }
    const metadata = { version, coreArchiveSHA256: coreSHA, packages: [...included].sort(), files, totalBytes: files.reduce((n, f) => n + f.bytes, 0) };
    await writeFile(path.join(root, 'public/runtime-meta.json'), JSON.stringify(metadata, null, 2) + '\n');
    console.log(`Prepared self-hosted Python ${version}: ${included.size} packages; ${(metadata.totalBytes / 1048576).toFixed(1)} MiB of runtime assets.`);
}
run().catch(error => { console.error('\nRuntime preparation failed:', error.message); process.exitCode = 1; });
