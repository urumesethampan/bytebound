import { SAVE_KEY, newState, parseImport, validateState } from './state.js';
/** The only module permitted to touch localStorage. Every access is guarded. */
export class ProgressStore extends EventTarget {
    constructor(catalog) {
        super();
        this.catalog = catalog;
        this.memory = newState();
        this.warning = '';
        this.conflicted = false;
        try {
            const raw = window.localStorage.getItem(SAVE_KEY);
            if (raw)
                this.memory = parseImport(raw, catalog);
        }
        catch (e) {
            this.warning = 'Saved progress could not be read. You can still play; export a backup before closing. ' + e.message;
        }
        this.handleExternal = event => {
            if (event.key === SAVE_KEY && event.newValue) {
                try {
                    const other = parseImport(event.newValue, this.catalog);
                    if (other.updatedAt >= this.memory.updatedAt) {
                        this.conflicted = true;
                        this.dispatchEvent(new Event('conflict'));
                    }
                }
                catch { }
            }
        };
        window.addEventListener('storage', this.handleExternal);
    }
    get state() { return this.memory; }
    save(next) {
        if (this.conflicted)
            throw new Error('Another tab changed your progress. Reload this tab before continuing.');
        next.updatedAt = Date.now();
        this.memory = next;
        try {
            window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
            this.warning = '';
        }
        catch {
            this.warning = 'Browser storage is unavailable or full. Progress is in memory only. Export a JSON backup before closing.';
        }
        this.dispatchEvent(new Event('change'));
        return next;
    }
    export() { return JSON.stringify(validateState(this.memory, this.catalog), null, 2); }
    import(text) { const clean = parseImport(text, this.catalog); return this.save(clean); }
    reset() { this.save(newState()); }
    destroy() { window.removeEventListener('storage', this.handleExternal); }
}
