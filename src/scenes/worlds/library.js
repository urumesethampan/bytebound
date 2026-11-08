import * as THREE from 'three';
import { island, box, instancedObjects, material, ring, particles } from '../primitives.js';
export default function build({ quality = 'medium' } = {}) {
    const root = new THREE.Group();
    root.add(island(2.7, '#685477'));
    const transforms = [];
    for (let i = 0; i < (quality === 'low' ? 18 : 36); i++)
        transforms.push({ position: [Math.cos(i * 2.4) * (1.4 + i % 3 * .2), .8 + (i % 4) * .5, Math.sin(i * 2.4) * (1.4 + i % 3 * .2)], rotation: [0, i * .3, 0], scale: .4 + (i % 3) * .1 });
    const cubes = instancedObjects(new THREE.BoxGeometry(.6, .6, .6), material('#c3b2e0'), transforms);
    root.add(cubes);
    root.add(ring(1, '#cab5ff', [0, .6, 0]));
    root.add(box([.8, .4, .8], '#352e4f', [0, .5, 0]));
    root.add(particles(48, '#c8adf2', 4));
    return { root, tick(t) { cubes.rotation.y = t * .07; root.position.y = Math.sin(t * .5) * .09; }, camera: { position: [6, 5, 7], target: [0, .7, 0] } };
}
