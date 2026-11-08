import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, indentMore, indentLess, undo } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
export function createEditor(host, { value, onChange, onRun, onFocus, fontSize, theme }) {
    const dark = theme === 'dark';
    const highlight = HighlightStyle.define([{ tag: tags.keyword, color: dark ? '#c5b5ff' : '#6339a5' }, { tag: tags.string, color: dark ? '#c9e899' : '#43651d' }, { tag: tags.number, color: dark ? '#f6bd8c' : '#92501f' }, { tag: tags.comment, color: dark ? '#9aa8a9' : '#596a6b', fontStyle: 'italic' }, { tag: tags.function(tags.variableName), color: dark ? '#9dd9e2' : '#206570' }]);
    const view = new EditorView({ parent: host, state: EditorState.create({ doc: value, extensions: [
                lineNumbers(), history(), drawSelection(), highlightActiveLine(), python(), bracketMatching(), indentOnInput(), indentUnit.of('    '), syntaxHighlighting(highlight),
                keymap.of([{ key: 'Mod-Enter', run: () => { onRun(); return true; } }, { key: 'Escape', run: v => { v.contentDOM.blur(); document.getElementById('run-button')?.focus(); return true; } }, ...defaultKeymap, ...historyKeymap, indentWithTab]),
                EditorView.contentAttributes.of({ 'aria-label': 'Python code editor', 'autocapitalize': 'off', 'spellcheck': 'false' }),
                EditorView.updateListener.of(u => { if (u.docChanged)
                    onChange(u.state.doc.toString()); }),
                EditorView.domEventHandlers({ focus: () => onFocus(true), blur: () => onFocus(false) }),
                EditorView.theme({ '&': { height: '100%', fontSize: `${fontSize}px`, backgroundColor: 'transparent', color: dark ? '#edf0e9' : '#25312e' }, '.cm-content': { fontFamily: '"IBM Plex Mono", ui-monospace, monospace', padding: '18px 0', minHeight: '250px' }, '.cm-scroller': { overflow: 'auto', lineHeight: '1.7' }, '.cm-gutters': { backgroundColor: 'transparent', color: dark ? '#7c8a8e' : '#6b7874', border: 'none' }, '.cm-lineNumbers .cm-gutterElement': { padding: '0 14px 0 10px' }, '.cm-activeLine': { backgroundColor: dark ? '#ffffff05' : '#10203006' }, '.cm-cursor': { borderLeftColor: dark ? '#c9f66b' : '#426719' }, '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: dark ? '#34474d' : '#c4d6de' } }, { dark })
            ] }) });
    return { view, indent: out => (out ? indentLess : indentMore)(view), undo: () => undo(view) };
}
