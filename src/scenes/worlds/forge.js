import * as THREE from 'three';
import { island, gear, box, particles, mesh } from '../primitives.js';
export default function build() {
    const root = new THREE.Group();
    root.add(island(2.8, '#725b49'));
    const gears = [];
    for (let i = 0; i < 4; i++) {
        const g = gear(.6 + i * .08, i % 2 ? '#c38c60' : '#e9ba8a');
        g.position.set((i - 1.5) * .85, .7 + (i % 2) * .3, -.5);
        g.rotation.x = Math.PI / 2;
        root.add(g);
        gears.push(g);
    }
    root.add(box([1.4, .8, 1.1], '#475461', [0, .65, .8]));
    root.add(mesh(new THREE.CylinderGeometry(.3, .32, 1.7, 8), '#a47958', [-1.5, 1.1, -.6]));
    root.add(particles(48, '#e1bb81', 4));
    return { root, tick(t) { gears.forEach((g, i) => g.rotation.y = t * .4 * (i % 2 ? 1 : -1)); root.position.y = Math.sin(t * .5) * .08; }, camera: { position: [6, 5, 7], target: [0, .5, 0] } };
}
