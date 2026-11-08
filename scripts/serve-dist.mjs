/** Local/CI static preview only; never handles learner code or data. */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve('dist'), port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.csv': 'text/csv', '.py': 'text/plain; charset=utf-8', '.zip': 'application/zip', '.whl': 'application/zip' };
http.createServer((req, res) => {
    let name;
    try {
        name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    }
    catch {
        res.writeHead(400);
        res.end();
        return;
    }
    // Exercise a repository subpath without duplicating the production files.
    if (name.startsWith('/bytebound/'))
        name = name.slice('/bytebound'.length);
    if (name.endsWith('/'))
        name += 'index.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
    }
    fs.stat(file, (error, stat) => { if (error || !stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
    } res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }); fs.createReadStream(file).pipe(res); });
}).listen(port, '127.0.0.1', () => console.log(`Static QA preview: http://127.0.0.1:${port}/`));
