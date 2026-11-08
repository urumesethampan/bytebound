import * as THREE from 'three';
import { box, mesh, ring, label, colors, gear } from './primitives.js';
export default function build({ concept = 'variables', filter = 'all' } = {}) {
    const root = new THREE.Group();
    const moving = [];
    const cells = [];
    const addBox = (x, y, text, color = '#c9f66b') => { const b = box([.7, .7, .7], color, [x, y, 0]); root.add(b); const l = label(text, '#e1e8d9', .5); l.position.set(x, y + .65, .1); root.add(l); return b; };
    if (concept === 'variables') {
        addBox(-1, 0, 'energy = 7');
        addBox(1, 0, 'name = Pip', '#c3b2ff');
    }
    else if (concept === 'loops') {
        root.add(ring(1.6, '#a7c7ff'));
        for (let i = 0; i < 5; i++) {
            const b = addBox(0, 0, String(i), '#a7c7ff');
            b.userData.phase = i / 5 * Math.PI * 2;
            moving.push(b);
        }
    }
    else if (concept === 'dictionary') {
        ['name: Pip', 'charge: 8', 'world: 3'].forEach((x, i) => addBox((i - 1) * 1.5, 0, x, '#c3b2ff'));
    }
    else if (concept === 'functions') {
        root.add(box([1.2, 1.3, 1.1], '#64727c', [0, .2, 0]));
        const title = label('double(x)', '#ffbd8a', .8);
        title.position.y = 1.4;
        root.add(title);
        const input = addBox(-2, 0, '4', '#a7c7ff');
        const output = addBox(2, 0, '8', '#c9f66b');
        moving.push(input, output);
    }
    else if (concept === 'dataframe') {
        for (let r = 0; r < 6; r++)
            for (let c = 0; c < 4; c++) {
                const b = box([.52, .17, .48], r % 2 ? '#82ddd5' : '#a7c7ff', [(c - 1.5) * .6, .1 + r * .25, (r - 2.5) * .57]);
                b.userData.row = r;
                root.add(b);
                cells.push(b);
            }
        const title = label('DataFrame: rows x columns', '#82ddd5', .9);
        title.position.set(0, 2.6, 0);
        root.add(title);
    }
    else {
        ['[0] key', '[1] map', '[2] cell', '[3] coil'].forEach((x, i) => addBox((i - 1.5) * 1.1, 0, x, '#c3b2ff'));
    }
    function applyFilter(value) { cells.forEach(b => { b.visible = value === 'all' || (value === 'outcome-1' ? b.userData.row % 2 === 1 : b.userData.row % 2 === 0); }); }
    applyFilter(filter);
    return { root, tick(t) { if (concept === 'loops')
            moving.forEach(b => { const a = t * .55 + b.userData.phase; b.position.set(Math.cos(a) * 1.6, .2, Math.sin(a) * 1.6); }); if (concept === 'functions')
            moving.forEach((b, i) => { b.position.y = Math.sin(t * 2 + i) * .1; }); }, filter: applyFilter, camera: { position: [4.3, 3.8, 6], target: [0, .4, 0] } };
}
