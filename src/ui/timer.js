export class FocusTimer extends EventTarget {
    constructor() { super(); this.seconds = 25 * 60; this.running = false; this.interval = null; this.last = 0; }
    configure(minutes) { if (!this.running)
        this.seconds = minutes * 60; this.emit(); }
    toggle(minutes = 25) { if (this.seconds <= 0)
        this.seconds = minutes * 60; this.running = !this.running; this.last = performance.now(); clearInterval(this.interval); if (this.running)
        this.interval = setInterval(() => this.tick(), 250); this.emit(); }
    tick() { const now = performance.now(), dt = (now - this.last) / 1000; this.last = now; if (!document.hidden)
        this.seconds = Math.max(0, this.seconds - Math.min(dt, 1)); if (this.seconds === 0) {
        this.running = false;
        clearInterval(this.interval);
        this.dispatchEvent(new Event('complete'));
    } this.emit(); }
    reset(minutes = 25) { this.running = false; clearInterval(this.interval); this.seconds = minutes * 60; this.emit(); }
    emit() { this.dispatchEvent(new Event('change')); }
    label() { const s = Math.ceil(this.seconds); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
    destroy() { clearInterval(this.interval); }
}
