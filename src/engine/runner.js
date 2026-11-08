/** One worker, one in-flight execution; stale generations can never update UI. */
export class PythonRunner extends EventTarget {
    constructor(base) {
        super();
        this.base = base;
        this.worker = null;
        this.pending = null;
        this.sequence = 0;
        this.generation = 0;
        this.status = 'idle';
        this.onVisibility = () => { if (document.hidden && this.pending)
            this.stop('Paused while the app was hidden. Your code is saved.'); };
        document.addEventListener('visibilitychange', this.onVisibility);
    }
    emit(status, message = '') {
        this.status = status;
        this.dispatchEvent(new CustomEvent('status', { detail: { status, message } }));
    }
    start() {
        if (this.worker)
            return;
        if (!('Worker' in window) || !('WebAssembly' in window)) {
            this.emit('error', 'This browser cannot run WebAssembly workers. Try an updated Safari, Chrome, Firefox, or Edge.');
            return;
        }
        this.emit('loading', 'Assembling your Python engine...');
        const generation = ++this.generation;
        const entry = new URL('python-worker.js', this.base).href;
        const url = URL.createObjectURL(new Blob([`import ${JSON.stringify(entry)};`], { type: 'text/javascript' }));
        this.blobURL = url;
        try {
            this.worker = new Worker(url, { type: 'module', name: 'bytebound-python' });
            this.bootTimer = setTimeout(() => this.fail('Python could not finish loading. Check offline preparation or retry when connected.'), 120000);
            this.worker.onmessage = ({ data }) => {
                if (generation !== this.generation)
                    return;
                if (data.type === 'status')
                    this.emit(data.status, data.message);
                if (data.type === 'ready') {
                    clearTimeout(this.bootTimer);
                    this.emit('ready', 'Python ready');
                }
                if (data.type === 'fatal')
                    this.fail('Python assets are unavailable. Complete the deployment build or offline download, then retry. ' + data.message);
                if (data.type === 'executing' && this.pending?.id === data.id) {
                    clearTimeout(this.pending.timer);
                    this.emit('running', 'Running your program...');
                    this.pending.timer = setTimeout(() => this.timeout(), 5000);
                }
                if (data.type === 'result' && this.pending?.id === data.id) {
                    const pending = this.pending;
                    this.pending = null;
                    clearTimeout(pending.timer);
                    this.emit('ready', 'Python ready');
                    pending.resolve(data.result);
                }
            };
            this.worker.onerror = () => this.fail('The Python worker could not start. Retry after the offline kit is ready.');
            this.worker.postMessage({ type: 'init', base: this.base });
        }
        catch (error) {
            this.fail(String(error));
        }
    }
    run(payload) {
        if (this.pending)
            return Promise.resolve({ ok: false, output: '', checks: [], error: { type: 'Busy', message: 'One run at a time. Your current run is still active.' } });
        if (!payload.code?.trim())
            return Promise.resolve({ ok: false, output: '', checks: [], error: { type: 'EmptyInput', message: 'Add a line of Python before running.' } });
        this.start();
        if (!this.worker)
            return Promise.resolve({ ok: false, output: '', checks: [], error: { type: 'RuntimeError', message: 'Python is unavailable. Use Retry Python after checking the offline kit.' } });
        return new Promise(resolve => {
            const id = ++this.sequence;
            this.pending = { id, resolve, timer: setTimeout(() => this.fail('The Python toolkit did not finish preparing. Retry when the offline kit is ready.'), 120000) };
            this.worker.postMessage({ type: 'run', id, base: this.base, payload });
        });
    }
    clearWorker() {
        ++this.generation;
        this.worker?.terminate();
        this.worker = null;
        clearTimeout(this.bootTimer);
        if (this.blobURL)
            URL.revokeObjectURL(this.blobURL);
        this.blobURL = null;
    }
    timeout() {
        const pending = this.pending;
        this.pending = null;
        if (pending) {
            clearTimeout(pending.timer);
            pending.resolve({ ok: false, output: '', checks: [], plots: [], error: { type: 'Timeout', message: 'Five seconds reached. Python restarted; your code was preserved.' } });
        }
        this.clearWorker();
        this.start();
    }
    stop(message = 'Run stopped. Your code is safe.') {
        const pending = this.pending;
        this.pending = null;
        if (pending) {
            clearTimeout(pending.timer);
            pending.resolve({ ok: false, output: '', checks: [], error: { type: 'Stopped', message } });
        }
        this.clearWorker();
        this.emit('idle', message);
    }
    fail(message) { this.stop(message); this.emit('error', message); }
    restart() { this.stop(); this.start(); }
    destroy() { this.stop(); document.removeEventListener('visibilitychange', this.onVisibility); }
}
