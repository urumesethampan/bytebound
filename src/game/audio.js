/** All effects are synthesized; no recordings or external requests. */
export class Feedback {
    constructor(getSettings) { this.getSettings = getSettings; this.audio = null; this.visibility = () => { if (document.hidden)
        this.audio?.suspend(); }; document.addEventListener('visibilitychange', this.visibility); }
    play(kind = 'success') {
        const s = this.getSettings();
        if (s.haptics && navigator.vibrate)
            try {
                navigator.vibrate(kind === 'success' ? 18 : 8);
            }
            catch { }
        if (!s.sound || document.hidden)
            return;
        try {
            const A = window.AudioContext || window.webkitAudioContext;
            if (!A)
                return;
            this.audio ||= new A();
            this.audio.resume();
            const frequencies = kind === 'reward' ? [392, 523.25, 659.25, 783.99] : kind === 'success' ? [440, 659.25] : [220, 261.63];
            frequencies.forEach((frequency, i) => {
                const osc = this.audio.createOscillator(), gain = this.audio.createGain();
                const t = this.audio.currentTime + i * .075;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(frequency, t);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(.07, t + .015);
                gain.gain.exponentialRampToValueAtTime(.001, t + .2);
                osc.connect(gain);
                gain.connect(this.audio.destination);
                osc.start(t);
                osc.stop(t + .22);
            });
        }
        catch { }
    }
    destroy() { document.removeEventListener('visibilitychange', this.visibility); this.audio?.close(); }
}
