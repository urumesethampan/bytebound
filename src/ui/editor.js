/** Immediate accessible textarea, upgraded lazily to CodeMirror 6 when available. */
export class CodeEditor {
    constructor(host, { value = '', onChange = () => { }, onRun = () => { }, fontSize = 16, theme = 'dark' } = {}) {
        this.host = host;
        this.dead = false;
        this.options = { onChange, onRun, fontSize, theme };
        this.textarea = document.createElement('textarea');
        this.textarea.className = 'plain-editor';
        this.textarea.value = value;
        this.textarea.setAttribute('aria-label', 'Python code editor');
        this.textarea.spellcheck = false;
        this.textarea.autocapitalize = 'off';
        this.textarea.autocomplete = 'off';
        this.textarea.wrap = 'off';
        this.textarea.style.fontSize = `${fontSize}px`;
        this.textarea.addEventListener('input', () => onChange(this.getValue()));
        this.textarea.addEventListener('focus', () => this.focusEvent(true));
        this.textarea.addEventListener('blur', () => this.focusEvent(false));
        this.textarea.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            onRun();
        } if (e.key === 'Escape') {
            e.preventDefault();
            document.getElementById('run-button')?.focus();
        } if (e.key === 'Tab') {
            e.preventDefault();
            this.insert('    ');
        } });
        host.append(this.textarea);
        this.upgrade();
    }
    async upgrade() { try {
        const { createEditor } = await import('./codemirror.js');
        if (this.dead)
            return;
        const value = this.textarea.value, focused = document.activeElement === this.textarea;
        this.textarea.remove();
        this.cm = createEditor(this.host, { ...this.options, value, onFocus: v => this.focusEvent(v) });
        if (focused)
            this.cm.view.focus();
        this.host.dataset.editor = 'codemirror';
    }
    catch {
        if (!this.dead) {
            this.host.dataset.editor = 'textarea';
            this.host.dataset.fallbackReason = 'CodeMirror dependency unavailable; accessible editor active.';
        }
    } }
    focusEvent(value) { window.dispatchEvent(new CustomEvent('bytebound-editor-focus', { detail: value })); }
    getValue() { return this.cm ? this.cm.view.state.doc.toString() : this.textarea.value; }
    setValue(value) { if (this.cm)
        this.cm.view.dispatch({ changes: { from: 0, to: this.cm.view.state.doc.length, insert: value } });
    else {
        this.textarea.value = value;
        this.options.onChange(value);
    } }
    insert(text) { if (this.cm) {
        const v = this.cm.view;
        v.dispatch(v.state.replaceSelection(text));
        v.focus();
    }
    else {
        const t = this.textarea;
        const start = t.selectionStart;
        t.setRangeText(text, start, t.selectionEnd, 'end');
        t.focus();
        this.options.onChange(t.value);
    } }
    indent(out = false) { if (this.cm)
        this.cm.indent(out);
    else if (out) {
        const t = this.textarea, start = t.selectionStart;
        const line = t.value.lastIndexOf('\n', start - 1) + 1;
        const count = (t.value.slice(line).match(/^ {1,4}/) || [''])[0].length;
        if (count) {
            t.setRangeText('', line, line + count, 'preserve');
            this.options.onChange(t.value);
        }
    }
    else
        this.insert('    '); }
    undo() { if (this.cm)
        this.cm.undo(); }
    focus() { if (this.cm)
        this.cm.view.focus();
    else
        this.textarea.focus(); }
    destroy() { this.dead = true; this.cm?.view.destroy(); this.textarea?.remove(); this.focusEvent(false); }
}
