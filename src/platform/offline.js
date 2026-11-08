export class OfflineKit extends EventTarget {
    constructor(base) { super(); this.base = base; this.status = 'checking'; this.done = 0; this.total = 0; this.message = 'Checking offline kit'; this.registration = null; this.controller = null; this.installEvent = null; this.onMessage = e => { if (e.data?.app !== 'bytebound')
        return; Object.assign(this, e.data); this.dispatchEvent(new Event('change')); }; navigator.serviceWorker?.addEventListener('message', this.onMessage); this.onInstall = e => { e.preventDefault(); this.installEvent = e; this.dispatchEvent(new Event('change')); }; window.addEventListener('beforeinstallprompt', this.onInstall); }
    async start() {
        if (!('serviceWorker' in navigator) || !window.isSecureContext) {
            this.status = 'unavailable';
            this.message = 'Offline needs HTTPS (or localhost).';
            this.dispatchEvent(new Event('change'));
            return;
        }
        try {
            this.registration = await navigator.serviceWorker.register(new URL('sw.js', this.base), { scope: new URL('./', this.base).pathname });
            await navigator.serviceWorker.ready;
            this.controller = this.registration.active || navigator.serviceWorker.controller;
            this.controller?.postMessage({ type: 'STATUS' });
            this.registration.addEventListener('updatefound', () => { const worker = this.registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                this.status = 'update';
                this.message = 'An update is ready between missions.';
                this.dispatchEvent(new Event('change'));
            } }); });
            this.prepare();
        }
        catch (e) {
            this.status = 'error';
            this.message = 'Offline kit not installed. Run the deployment build first, then reload.';
            this.dispatchEvent(new Event('change'));
        }
    }
    prepare() { (this.registration?.active || navigator.serviceWorker.controller)?.postMessage({ type: 'PREPARE' }); }
    async requestPersistence() { try {
        return await navigator.storage?.persist?.() || false;
    }
    catch {
        return false;
    } }
    async install() { if (!this.installEvent)
        return false; try {
        await this.installEvent.prompt();
        const result = await this.installEvent.userChoice;
        this.installEvent = null;
        return result.outcome === 'accepted';
    }
    catch {
        return false;
    } }
    applyUpdate() { if (this.registration?.waiting) {
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
        this.registration.waiting.postMessage({ type: 'ACTIVATE' });
    } }
    destroy() { navigator.serviceWorker?.removeEventListener('message', this.onMessage); window.removeEventListener('beforeinstallprompt', this.onInstall); }
}
