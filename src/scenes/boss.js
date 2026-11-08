import * as THREE from 'three';
import { island, mesh, box, colors, ring, particles, gear } from './primitives.js';
export default function build({ world = 1, health = 5, type = 'boss' } = {}) {
    const root = new THREE.Group();
    root.add(island(3, '#394452'));
    const enemy = new THREE.Group();
    const tint = colors[world - 1];
    enemy.add(mesh(new THREE.IcosahedronGeometry(.85, 1), tint, [0, 1.5, 0], { emissive: tint, emissiveIntensity: .08 }));
    enemy.add(box([1.1, .25, .12], '#17212c', [0, 1.6, .7]));
    for (const x of [-.3, .3])
        enemy.add(box([.15, .08, .06], '#eefbd0', [x, 1.65, .79]));
    for (const x of [-1.05, 1.05]) {
        const hand = gear(.35, tint);
        hand.position.set(x, 1, 0);
        hand.rotation.x = Math.PI / 2;
        enemy.add(hand);
    }
    root.add(enemy);
    const shields = [];
    for (let i = 0; i < health; i++) {
        const a = i / 5 * Math.PI * 2;
        const shield = mesh(new THREE.OctahedronGeometry(.2, 0), tint, [Math.cos(a) * 1.65, 1.2, Math.sin(a) * 1.65]);
        root.add(shield);
        shields.push(shield);
    }
    root.add(ring(2.2, tint, [0, .31, 0]));
    root.add(particles(64, tint, 4));
    let reaction = 0, hurt = false;
    if (type === 'dungeon') {
        for (let i = 0; i < 5; i++) {
            root.add(box([2.8, .1, 1.2], '#344253', [0, .1, -i * 1.2]));
            root.add(box([.2, 2, .2], '#526078', [-1.5, 1, -i * 1.2]));
            root.add(box([.2, 2, .2], '#526078', [1.5, 1, -i * 1.2]));
        }
    }
    return { root, tick(t, dt) { reaction = Math.max(0, reaction - dt * 2); enemy.position.y = Math.sin(t * 1.2) * .1; enemy.position.x = Math.sin(reaction * 20) * reaction * .15; enemy.rotation.y = Math.sin(t * .4) * .12; shields.forEach((s, i) => s.position.y = 1.2 + Math.sin(t * 2 + i) * .1); if (health <= 0) {
            enemy.scale.setScalar(Math.max(.01, 1 - t * .4));
            enemy.rotation.z = t * .6;
        } }, react(success) { reaction = 1; if (success && shields.length)
            shields.pop().visible = false; }, camera: { position: [5.5, 4.4, 7], target: [0, .9, 0] } };
}
