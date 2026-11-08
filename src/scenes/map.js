import * as THREE from 'three';
import { island, mesh, material, colors, trees, label, ring } from './primitives.js';
export default function build({ catalog, state, onAction }) {
    const root = new THREE.Group();
    const nodes = [];
    const positions = [[-5, 0, 1.8], [-2.5, .35, -1.8], [1, .1, -2.6], [4, .45, -.3], [2.2, .1, 3.4]];
    catalog.worlds.forEach((w, i) => {
        const group = new THREE.Group();
        group.position.set(...positions[i]);
        const unlocked = w.start === 1 || state.completed.includes(`d${String(w.start - 1).padStart(2, '0')}`);
        group.add(island(1.4, unlocked ? ['#546d43', '#3f5771', '#65567b', '#79634f', '#426869'][i] : '#303944'));
        const title = label(`${w.id}. ${w.name}`, unlocked ? colors[i] : '#75808b', .63);
        title.position.set(0, 2.2, 0);
        group.add(title);
        const beacon = mesh(new THREE.OctahedronGeometry(.28, 0), unlocked ? colors[i] : '#58616d', [0, 1, 0]);
        group.add(beacon);
        const missions = catalog.lessons.filter(l => l.world === w.id);
        missions.forEach((l, j) => {
            const a = (j / missions.length) * Math.PI * 2;
            const completed = state.completed.includes(l.id);
            const available = l.prerequisites.every(id => state.completed.includes(id));
            const node = mesh(new THREE.SphereGeometry(.115, 8, 6), new THREE.MeshBasicMaterial({ color: completed ? '#e0f9b1' : available ? colors[i] : '#58616d' }), [Math.cos(a) * .98, .34, Math.sin(a) * .98]);
            node.userData.mission = l.id;
            group.add(node);
            nodes.push(node);
            if (available && !completed)
                group.add(ring(.19, colors[i], [node.position.x, .34, node.position.z], .022));
        });
        root.add(group);
        if (i > 0) {
            const from = new THREE.Vector3(...positions[i - 1]).add(new THREE.Vector3(0, .4, 0)), to = new THREE.Vector3(...positions[i]).add(new THREE.Vector3(0, .4, 0));
            const mid = from.clone().lerp(to, .5).add(new THREE.Vector3(0, .5, 0));
            const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
            const bridge = mesh(new THREE.TubeGeometry(curve, 16, .025, 4, false), new THREE.MeshBasicMaterial({ color: unlocked ? '#a4b88a' : '#3e4955' }));
            root.add(bridge);
        }
    });
    return { root, tick(t) { root.position.y = Math.sin(t * .4) * .07; }, camera: { position: [11, 12, 14], target: [0, .2, 0] }, focus(index) { return { position: new THREE.Vector3(...positions[index]).add(new THREE.Vector3(4, 4.5, 5)), target: new THREE.Vector3(...positions[index]) }; } };
}
