import * as THREE from 'three';
import { island, box, ring, particles, instancedObjects, material } from '../primitives.js';
export default function build() {
    const root = new THREE.Group();
    root.add(island(2.8, '#385e62'));
    root.add(box([2.4, .15, 1.3], '#8fafab', [0, .85, 0]));
    const bars = [];
    for (let i = 0; i < 6; i++) {
        const b = box([.22, .3 + i * .16, .3], i % 2 ? '#a7b6ff' : '#88dcd2', [(i - 2.5) * .34, 1.05 + i * .08, 0], { emissive: '#264b50', emissiveIntensity: .3 });
        root.add(b);
        bars.push(b);
    }
    const points = particles(240, '#8bded1', 2);
    points.position.y = 1.1;
    root.add(points);
    const r = ring(1.8, '#82ddd5', [0, .3, 0]);
    root.add(r);
    return { root, tick(t) { points.rotation.y = t * .05; root.position.y = Math.sin(t * .5) * .06; }, camera: { position: [6, 5, 7], target: [0, .7, 0] } };
}
