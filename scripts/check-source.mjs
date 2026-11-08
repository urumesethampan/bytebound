import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '__pycache__', '.qa-fixture', '.build-cache'].includes(item.name))
        continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory())
        walk(full);
    else if (/\.(mjs|js)$/.test(item.name)) {
        execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
        count++;
    }
} }
walk(root);
console.log(`Syntax checked ${count} JavaScript modules.`);
