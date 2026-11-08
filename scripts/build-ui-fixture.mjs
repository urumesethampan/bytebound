/** Isolated DOM QA fixture, NOT the distributable app. No real Python, WebGL, or CodeMirror. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve('.'), modules = {};
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory())
        walk(p);
    else if (p.endsWith('.js') && !p.includes('/scenes/') && !p.endsWith('/codemirror.js')) {
        const id = path.relative(root, p).split(path.sep).join('/');
        let source = fs.readFileSync(p, 'utf8').replaceAll('import.meta.url', JSON.stringify('https://bytebound.local/' + id)).replaceAll('document.baseURI', JSON.stringify('https://bytebound.local/'));
        modules[id] = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    }
} }
walk(path.join(root, 'src'));
const moduleSource = Object.entries(modules).map(([id, code]) => `${JSON.stringify(id)}:function(require,module,exports){\n${code}\n}`).join(',\n');
const catalog = fs.readFileSync('public/lessons.json', 'utf8');
const prelude = `window.__UI_FIXTURE__=true;window.__storageMap=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__storageMap.get(k)??null,setItem:(k,v)=>window.__storageMap.set(k,String(v)),removeItem:k=>window.__storageMap.delete(k),clear:()=>window.__storageMap.clear()}});window.fetch=async url=>{if(String(url).endsWith('/lessons.json'))return new Response(JSON.stringify(${catalog}));throw new Error('Network intentionally disabled in DOM fixture');};window.Worker=class{postMessage(m){if(m.type==='init')setTimeout(()=>this.onmessage?.({data:{type:'ready'}}),0);if(m.type==='run')setTimeout(()=>{this.onmessage?.({data:{type:'executing',id:m.id}});setTimeout(()=>this.onmessage?.({data:{type:'result',id:m.id,result:{ok:!m.payload.code.includes('# FORCE_WRONG'),checks:[{ok:!m.payload.code.includes('# FORCE_WRONG'),message:'UI fixture result; Python NOT executed',success:'UI fixture result; Python NOT executed'}],output:'UI fixture output',plots:[]}}}),15)},0);}terminate(){this.onmessage=null;}};`;
const loader = `(()=>{${prelude}\nconst modules={${moduleSource}},cache={};function load(id){if(cache[id])return cache[id].exports;if(!modules[id])throw new Error('Optional dependency unavailable in DOM fixture: '+id);const module={exports:{}};cache[id]=module;const req=relative=>{const url=new URL(relative,'https://bytebound.local/'+id);return load(url.pathname.slice(1));};modules[id](req,module,module.exports);return module.exports;}load('src/main.js');})();`;
let html = fs.readFileSync('index.html', 'utf8').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '').replace(/<link[^>]*>/g, '').replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
const css = fs.readFileSync('src/ui/styles.css', 'utf8').replace(/@font-face\s*\{[^}]*\}/g, '');
html = html.replace('</head>', '<style>' + css + '</style></head>');
fs.mkdirSync('.qa-fixture', { recursive: true });
fs.writeFileSync('.qa-fixture/index.html', html);
fs.writeFileSync('.qa-fixture/app.js', loader);
console.log('Created isolated DOM fixture. Worker responses are stubbed; not a Python/WebGL/offline verification.');
