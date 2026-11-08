import * as THREE from 'three';
import { island, mesh, instancedObjects, material, particles, box } from '../primitives.js';
export default function build({ quality = 'medium' } = {}) {
    const root = new THREE.Group();
    root.add(island(2.7, '#3e5374'));
    const transforms = Array.from({ length: quality === 'low' ? 14 : 30 }, (_, i) => ({ position: [Math.cos(i * 2.4) * 2.2, .5, Math.sin(i * 2.4) * 2.1], scale: .35 + (i % 5) * .2, rotation: [0, i, .1] }));
    const crystals = instancedObjects(new THREE.ConeGeometry(.35, 1.6, 5), material('#88b5db', { emissive: '#284961', emissiveIntensity: .25 }), transforms);
    root.add(crystals);
    for (let i = 0; i < 6; i++) {
        root.add(box([.24, .04, .22], '#bed6eb', [-i * .3, .28, i * .25]));
        root.add(box([.24, .04, .22], '#b0a0e5', [i * .3, .28, i * .25]));
    }
    root.add(particles(50, '#8cbeef', 4));
    return { root, tick(t) { root.position.y = Math.sin(t * .5) * .08; }, camera: { position: [6, 5.5, 7], target: [0, .2, 0] } };
}
