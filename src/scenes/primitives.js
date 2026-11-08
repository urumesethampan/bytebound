import * as THREE from 'three';
export const colors = ['#c9f66b', '#a7c7ff', '#c3b2ff', '#ffbd8a', '#82ddd5'];
export function material(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: .12, flatShading: true, ...extra }); }
export function mesh(geometry, color, position = [0, 0, 0], extra = {}) {
    const m = new THREE.Mesh(geometry, typeof color === 'string' ? material(color, extra) : color);
    m.position.set(...position);
    return m;
}
export function box(size, color, position, extra = {}) { return mesh(new THREE.BoxGeometry(...size), color, position, extra); }
export function ring(radius, color, position = [0, 0, 0], tube = .035) {
    const m = mesh(new THREE.TorusGeometry(radius, tube, 5, 48), new THREE.MeshBasicMaterial({ color }), position);
    m.rotation.x = Math.PI / 2;
    return m;
}
export function island(radius = 2.6, color = '#597348') {
    const group = new THREE.Group();
    group.add(mesh(new THREE.CylinderGeometry(radius, radius * .78, .52, 9, 1), color, [0, 0, 0]));
    const rock = mesh(new THREE.ConeGeometry(radius * .81, 2.1, 7, 1), '#283443', [0, -1.28, 0]);
    rock.rotation.z = Math.PI;
    group.add(rock);
    for (let i = 0; i < 5; i++) {
        const a = i * 1.5;
        const stone = mesh(new THREE.IcosahedronGeometry(.35 + (i % 2) * .12, 0), '#344251', [Math.cos(a) * radius * .65, -.66, Math.sin(a) * radius * .65]);
        group.add(stone);
    }
    const line = ring(radius * .84, '#8aaf6b', [0, .28, 0], .018);
    group.add(line);
    return group;
}
export function robot(skin = '#c9f66b', scale = 1) {
    const g = new THREE.Group();
    g.scale.setScalar(scale);
    g.add(box([.62, .52, .42], '#dbe4d3', [0, .53, 0]));
    const head = box([.83, .6, .58], skin, [0, 1.12, 0]);
    head.rotation.z = -.07;
    g.add(head);
    g.add(box([.65, .3, .035], '#16242d', [0, 1.13, .302]));
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: '#d6ffe3' });
    g.add(mesh(new THREE.BoxGeometry(.08, .12, .04), eyeMaterial, [-.18, 1.13, .335]));
    g.add(mesh(new THREE.BoxGeometry(.08, .12, .04), eyeMaterial, [.18, 1.13, .335]));
    for (const x of [-.22, .22])
        g.add(box([.18, .21, .3], '#405763', [x, .13, .03]));
    for (const x of [-.43, .43]) {
        const arm = box([.15, .4, .18], skin, [x, .55, 0]);
        arm.rotation.z = x > 0 ? -.18 : .18;
        g.add(arm);
    }
    g.add(mesh(new THREE.CylinderGeometry(.025, .025, .2, 6), skin, [0, 1.49, 0]));
    g.add(mesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshBasicMaterial({ color: '#e6ffb8' }), [0, 1.61, 0]));
    g.traverse(obj => { if (obj.isMesh)
        obj.userData.action = 'pip'; });
    const shadow = mesh(new THREE.CircleGeometry(.52, 20), new THREE.MeshBasicMaterial({ color: '#101820', transparent: true, opacity: .28 }), [0, .015, 0]);
    shadow.rotation.x = -Math.PI / 2;
    g.add(shadow);
    return g;
}
export function instancedObjects(geometry, mat, transforms) {
    const inst = new THREE.InstancedMesh(geometry, mat, transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((t, i) => { dummy.position.set(...t.position); dummy.rotation.set(...(t.rotation || [0, 0, 0])); dummy.scale.setScalar(t.scale || 1); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); });
    inst.instanceMatrix.needsUpdate = true;
    return inst;
}
export function trees(count = 16, radius = 2.3) {
    const g = new THREE.Group();
    const transforms = [];
    for (let i = 0; i < count; i++) {
        const a = i * 2.39996;
        const r = radius * (.6 + .3 * ((i * 7) % 11) / 11);
        transforms.push({ position: [Math.cos(a) * r, .75, Math.sin(a) * r], scale: .45 + (i % 4) * .13, rotation: [0, i, 0] });
    }
    g.add(instancedObjects(new THREE.ConeGeometry(.42, 1.3, 5), material('#81ae6c'), transforms));
    return g;
}
export function particles(count = 96, color = '#d3eeb2', spread = 7) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = Math.sin(i * 8.37) * spread;
        positions[i * 3 + 1] = Math.cos(i * 3.87) * 3 + 1;
        positions[i * 3 + 2] = Math.sin(i * 2.17) * spread;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: .035, transparent: true, opacity: .6, depthWrite: false, sizeAttenuation: true }));
    points.userData.particles = true;
    return points;
}
export function label(text, color = '#e6eddf', size = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 384, 96);
    ctx.font = '600 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 192, 48);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(size * 3, size * .75, 1);
    return sprite;
}
export function gear(radius = .7, color = '#ffbd8a') {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(radius * .7, radius * .7, .18, 14), color));
    const teeth = [];
    for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        teeth.push({ position: [Math.cos(a) * radius, 0, Math.sin(a) * radius], rotation: [0, -a, 0], scale: 1 });
    }
    g.add(instancedObjects(new THREE.BoxGeometry(.25, .19, .22), material(color), teeth));
    return g;
}
export function rareMaterial(color = '#b8a0ff') {
    return new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(color) } },
        vertexShader: 'varying vec3 vNormal; varying vec3 vView; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
        fragmentShader: 'uniform float time; uniform vec3 tint; varying vec3 vNormal; varying vec3 vView; void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.0);float pulse=.75+.15*sin(time*2.0);gl_FragColor=vec4(tint*(pulse+rim*.7),1.0);}' });
}
