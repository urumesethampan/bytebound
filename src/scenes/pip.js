import * as THREE from 'three';
import { robot } from './primitives.js';
export default function build({ skin = '#c9f66b' } = {}) { const root = new THREE.Group(), pip = robot(skin); root.add(pip); let pulse = 0; return { root, tick(t, dt) { pip.position.y = Math.sin(t * 2) * .025 + Math.sin(pulse * Math.PI) * .15; pulse = Math.max(0, pulse - dt * 2); }, react() { pulse = 1; }, camera: { position: [2, 1.5, 3.3], target: [0, .85, 0] } }; }
