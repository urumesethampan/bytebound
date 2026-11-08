import * as THREE from 'three';
import { box, mesh, ring, particles, rareMaterial, label, robot } from './primitives.js';
export default function build({ type = 'reward', state, skin = '#c9f66b' } = {}) {
    const root = new THREE.Group();
    const pivot = new THREE.Group();
    let shader;
    if (type === 'shelf') {
        const n = Math.max(1, state?.badges.length || 0);
        for (let i = 0; i < n; i++) {
            const x = (i % 5 - 2) * 1.1, y = 1 - Math.floor(i / 5) * 1.15;
            root.add(box([1, .12, .65], '#344351', [x, y - .45, 0]));
            const rare = state?.badges[i] === 'rare-prism';
            const mat = rare ? rareMaterial() : new THREE.MeshStandardMaterial({ color: ['#c9f66b', '#a7c7ff', '#c3b2ff', '#ffbd8a', '#82ddd5'][i % 5], metalness: .25, roughness: .5 });
            if (rare)
                shader = mat;
            const badge = mesh(new THREE.CylinderGeometry(.3, .3, .13, 6), mat, [x, y, 0]);
            badge.rotation.x = Math.PI / 2;
            root.add(badge);
        }
    }
    else if (type === 'level') {
        const pip = robot(skin, 1.3);
        pip.position.y = -.5;
        root.add(pip);
        for (let i = 0; i < 3; i++)
            root.add(ring(1.3 + i * .3, '#d5f5a0', [0, i * .4 - .4, 0]));
        root.add(particles(140, '#d6f69d', 3));
    }
    else {
        root.add(box([1.7, .75, 1.1], '#9c7555', [0, 0, 0]));
        root.add(box([1.78, .1, 1.14], '#c9a66c', [0, -.2, 0]));
        pivot.position.set(0, .4, -.55);
        pivot.add(box([1.75, .3, 1.15], '#c9a66c', [0, 0, .55]));
        root.add(pivot);
        root.add(box([.25, .3, .06], '#c9f66b', [0, .15, .58]));
        shader = rareMaterial('#c9f66b');
        root.add(mesh(new THREE.OctahedronGeometry(.35, 0), shader, [0, 1.3, 0]));
        const orbs = [];
        for (let i = 0; i < 24; i++) {
            const orb = mesh(new THREE.IcosahedronGeometry(.045, 0), new THREE.MeshBasicMaterial({ color: i % 3 ? '#c9f66b' : '#c3b2ff' }));
            orb.userData.seed = i;
            root.add(orb);
            orbs.push(orb);
        }
        root.userData.orbs = orbs;
    }
    return { root, tick(t) { pivot.rotation.x = -Math.min(1, t / 1.1) * 1.25; if (shader)
            shader.uniforms.time.value = t; root.rotation.y = Math.sin(t * .3) * .08; for (const o of root.userData.orbs || []) {
            const a = o.userData.seed * 2.4;
            const p = (t * .3 + o.userData.seed / 24) % 1;
            o.position.set(Math.cos(a) * p * 3, (p * 4) + .6, Math.sin(a) * p * 2);
            o.scale.setScalar(1 - p * .7);
        } }, camera: { position: [4, 3.1, 5], target: [0, .5, 0] } };
}
