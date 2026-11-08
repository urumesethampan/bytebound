/* Standalone ES module worker. A blob bootstrap gives it the document's CSP. */
const nativeFetch = globalThis.fetch.bind(globalThis);
let root;
globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, root || self.location.href);
    if (!root || url.origin !== new URL(root).origin || !url.pathname.startsWith(new URL(root).pathname)) {
        return Promise.reject(new Error('Bytebound permits only local app assets.'));
    }
    return nativeFetch(input, init);
};
for (const name of ['WebSocket', 'EventSource', 'XMLHttpRequest']) {
    try {
        Object.defineProperty(globalThis, name, { value: class {
                constructor() { throw new Error('Network connections are disabled.'); }
            }, writable: false });
    }
    catch { }
}
let py, initializing, occupied = false;
const bundledData = new Map();
async function initialize(base) {
    root = base;
    if (py)
        return py;
    if (initializing)
        return initializing;
    initializing = (async () => {
        postMessage({ type: 'status', status: 'loading', message: 'Assembling your Python engine...' });
        const module = await import(new URL('pyodide/pyodide.mjs', root).href);
        py = await module.loadPyodide({ indexURL: new URL('pyodide/', root).href,
            stdout: () => { }, stderr: () => { } });
        py.FS.mkdirTree('/home/pyodide/data');
        const files = ['patients.csv', 'labs.csv', 'labs-duplicates.csv', 'bad-values.csv', 'supplies.csv'];
        for (const name of files) {
            const response = await fetch(new URL(`data/${name}`, root));
            if (!response.ok)
                throw new Error(`Missing offline dataset: ${name}`);
            const content = await response.text();
            bundledData.set(name, content);
            py.FS.writeFile(`/home/pyodide/${name}`, content);
            py.FS.writeFile(`/home/pyodide/data/${name}`, content);
        }
        const response = await fetch(new URL('grader.py', root));
        if (!response.ok)
            throw new Error('Missing grading engine.');
        py.runPython(await response.text());
        postMessage({ type: 'ready' });
        return py;
    })();
    try {
        return await initializing;
    }
    catch (e) {
        py = undefined;
        initializing = undefined;
        throw e;
    }
}
self.onmessage = async ({ data }) => {
    const { type, id, base, payload } = data;
    if (type === 'init') {
        try {
            await initialize(base);
        }
        catch (error) {
            postMessage({ type: 'fatal', message: String(error) });
        }
        return;
    }
    if (type !== 'run')
        return;
    if (occupied) {
        postMessage({ type: 'result', id, result: { ok: false, error: { type: 'Busy', message: 'A run is already in progress.' } } });
        return;
    }
    occupied = true;
    try {
        await initialize(base);
        const requested = payload.packages || [];
        if (requested.some(p => !['pandas', 'numpy', 'matplotlib'].includes(p)))
            throw new Error('Package is not in the offline kit.');
        if (requested.length) {
            postMessage({ type: 'status', status: 'packages', message: 'Warming up the science toolkit...' });
            await py.loadPackage(requested);
            if (requested.includes('pandas'))
                py.runPython('import pandas');
            if (requested.includes('numpy'))
                py.runPython('import numpy');
            if (requested.includes('matplotlib'))
                py.runPython("import matplotlib\nmatplotlib.use('Agg')\nimport matplotlib.pyplot as plt\nplt.close('all')");
        }
        // Restore teaching fixtures before every run; learner scratch files remain separate.
        for (const [name, content] of bundledData) {
            py.FS.writeFile(`/home/pyodide/${name}`, content);
            py.FS.writeFile(`/home/pyodide/data/${name}`, content);
        }
        postMessage({ type: 'executing', id });
        py.globals.set('__payload_json', JSON.stringify(payload));
        const json = py.runPython('json.dumps(grade_submission(json.loads(__payload_json)))');
        py.globals.delete('__payload_json');
        postMessage({ type: 'result', id, result: JSON.parse(json) });
    }
    catch (error) {
        postMessage({ type: 'result', id, result: { ok: false, output: '', checks: [], plots: [], error: { type: 'RuntimeError', message: String(error), traceback: String(error.stack || '') } } });
    }
    finally {
        occupied = false;
    }
};
