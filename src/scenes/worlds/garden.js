import * as THREE from 'three';
import { island, trees, robot, ring, mesh, box, particles } from '../primitives.js';
export default function build({ skin = '#c9f66b', decoration = 'decor-garden', quality = 'medium', mood = 'happy' } = {}) {
    const root = new THREE.Group();
    root.add(island(2.8, '#607949'));
    root.add(trees(quality === 'low' ? 10 : 18, 2.6));
    for (let i = 0; i < 7; i++)
        root.add(box([.35, .04, .34], '#bed19c', [-1.4 + i * .4, .29, .42 + Math.sin(i * .7) * .2]));
    const portal = new THREE.Group();
    portal.position.set(-.8, 1.22, -1);
    const halo = ring(.68, '#d4e5a5');
    halo.rotation.x = 0;
    portal.add(halo);
    portal.add(box([.17, 1.4, .18], '#d1d8b9', [-.62, -.55, 0]));
    portal.add(box([.17, 1.4, .18], '#d1d8b9', [.62, -.55, 0]));
    root.add(portal);
    const pip = robot(skin, .92);
    pip.position.set(.6, .3, .45);
    root.add(pip);
    const cloud = particles(quality === 'low' ? 36 : 88, '#d2e6ac', 5);
    root.add(cloud);
    const satellite = island(.6, '#6f8758');
    satellite.position.set(-3.9, .3, 1.5);
    root.add(satellite);
    const crystal = mesh(new THREE.OctahedronGeometry(.3, 0), '#b9a6ff', [-3.9, 1.1, 1.5], { emissive: '#8871bc', emissiveIntensity: .25 });
    root.add(crystal);
    if (decoration === 'decor-beacon') {
        root.add(mesh(new THREE.CylinderGeometry(.18, .3, 1.4, 8), '#e8d6ad', [1.5, 1, -1]));
        root.add(mesh(new THREE.OctahedronGeometry(.26, 0), '#c9f66b', [1.5, 1.9, -1], { emissive: '#c9f66b', emissiveIntensity: .5 }));
    }
    if (decoration === 'decor-rings') {
        const rings = new THREE.Group();
        rings.position.set(1.5, 1.1, -1);
        for (let i = 0; i < 3; i++) {
            const r = ring(.45 + i * .12, '#b5a4ed');
            r.rotation.set(i * .8, i * .6, 0);
            rings.add(r);
        }
        root.add(rings);
    }
    let pulse = 0;
    return { root, tick(t, dt) { root.position.y = Math.sin(t * .5) * .12; pip.position.y = .3 + Math.sin(t * 2.3) * .035 + Math.max(0, Math.sin(pulse * Math.PI)) * .4; pip.rotation.y = Math.sin(t * .45) * .16; pip.rotation.z = mood === 'sleepy' ? -.1 : mood === 'celebrating' ? Math.sin(t * 5) * .12 : 0; pulse = Math.max(0, pulse - dt * 2); crystal.rotation.y = t * .5; cloud.rotation.y = t * .015; }, react() { pulse = 1; }, camera: { position: [7.2, 5.7, 8.8], target: [-.1, .1, 0] } };
}
