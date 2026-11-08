import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const loaders = { pip: () => import('./pip.js'), hub: () => import('./worlds/garden.js'), garden: () => import('./worlds/garden.js'), cavern: () => import('./worlds/cavern.js'), library: () => import('./worlds/library.js'), forge: () => import('./worlds/forge.js'), lab: () => import('./worlds/lab.js'), map: () => import('./map.js'), reward: () => import('./rewards.js'), level: () => import('./rewards.js'), shelf: () => import('./rewards.js'), boss: () => import('./boss.js'), dungeon: () => import('./boss.js'), concept: () => import('./concepts.js') };
/** Reuses one renderer. All scene-owned GPU resources are disposed on navigation. */
export class SceneManager {
    constructor(onFailure = () => { }) {
        this.onFailure = onFailure;
        this.generation = 0;
        this.raf = 0;
        this.visible = true;
        this.focused = false;
        this.time = 0;
        this.samples = [];
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
        this.renderer.setClearColor(0, 0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.domElement.setAttribute('aria-hidden', 'true');
        this.renderer.domElement.className = 'world-canvas';
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
        this.onLost = e => { e.preventDefault(); this.unmount(); this.onFailure('WebGL context lost. The 2D game is still available.'); };
        this.renderer.domElement.addEventListener('webglcontextlost', this.onLost);
        this.onVisibility = () => this.schedule();
        document.addEventListener('visibilitychange', this.onVisibility);
        this.onFocus = e => { this.focused = !!e.detail; this.schedule(); };
        window.addEventListener('bytebound-editor-focus', this.onFocus);
        this.onPointerDown = e => { this.down = { x: e.clientX, y: e.clientY }; };
        this.onPointerUp = e => { if (!this.down || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 8)
            return; const rect = this.renderer.domElement.getBoundingClientRect(); const mouse = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, this.camera); const hits = ray.intersectObjects(this.built?.root.children || [], true); for (const hit of hits) {
            const data = hit.object.userData;
            if (data.mission) {
                this.options.onAction?.('mission', data.mission);
                break;
            }
            if (data.action) {
                this.built?.react?.(true);
                this.options.onAction?.(data.action);
                this.renderOnce();
                break;
            }
        } };
        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    }
    async mount(host, type, options = {}) {
        this.unmount();
        const generation = ++this.generation;
        this.host = host;
        this.options = options;
        this.type = type;
        this.time = 0;
        this.samples = [];
        this.frameTimes = [];
        this.stats = null;
        window.__BYTEBOUND_RENDER_STATS__ = null;
        this.quality = options.quality === 'auto' ? 'medium' : options.quality || 'medium';
        this.auto = options.quality === 'auto';
        this.reduced = options.reduced;
        const built = (await loaders[type]()).default({ ...options, type });
        if (generation !== this.generation) {
            this.disposeTree(built.root);
            return;
        }
        this.built = built;
        this.scene.add(built.root);
        this.scene.add(new THREE.HemisphereLight('#e6edd7', '#25334a', 2.3));
        const sun = new THREE.DirectionalLight('#fff2d7', 2.1);
        sun.position.set(4, 8, 5);
        this.scene.add(sun);
        this.camera.position.set(...built.camera.position);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(...built.camera.target);
        this.controls.enableDamping = !this.reduced;
        this.controls.dampingFactor = .08;
        this.controls.enablePan = false;
        this.controls.enableZoom = type === 'map' || type === 'concept';
        this.controls.enableRotate = type === 'map' || type === 'concept';
        this.controls.minDistance = 4;
        this.controls.maxDistance = 28;
        this.controls.maxPolarAngle = Math.PI * .48;
        this.controls.minPolarAngle = .2;
        this.controls.addEventListener('change', () => { if (this.reduced || !this.active())
            this.renderOnce(); });
        this.controls.update();
        host.appendChild(this.renderer.domElement);
        host.classList.add('has-webgl');
        this.applyQuality();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);
        this.resize();
        this.intersection = new IntersectionObserver(entries => { this.visible = entries[0]?.isIntersecting !== false; this.schedule(); }, { threshold: .01 });
        this.intersection.observe(host);
        this.built.tick?.(this.reduced ? 1.5 : 0, 0);
        this.renderOnce();
        this.schedule();
    }
    applyQuality() { this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, { low: 1, medium: 1.5, high: 2 }[this.quality] || 1)); if (this.quality === 'low')
        this.built?.root.traverse(obj => { if (obj.userData.particles)
            obj.geometry.setDrawRange(0, Math.min(48, obj.geometry.attributes.position.count)); }); this.resize(); }
    resize() { if (!this.host)
        return; const { width, height } = this.host.getBoundingClientRect(); if (width < 1 || height < 1)
        return; this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.fov = width < 500 ? 48 : 40; this.camera.updateProjectionMatrix(); this.renderOnce(); }
    active() { const editorFocused = !!document.activeElement?.closest?.('.cm-editor, textarea[aria-label="Python code editor"]'); return !!this.host && !document.hidden && this.visible && !this.focused && !editorFocused && !this.reduced; }
    schedule() { cancelAnimationFrame(this.raf); this.lastTime = 0; if (this.active())
        this.raf = requestAnimationFrame(t => this.frame(t));
    else
        this.renderOnce(); }
    frame(now) {
        if (!this.active())
            return;
        const dt = this.lastTime ? Math.min(.1, (now - this.lastTime) / 1000) : 1 / 60;
        this.lastTime = now;
        this.time += dt;
        this.built?.tick?.(this.time, dt);
        this.controls?.update();
        if (this.travel) {
            const f = 1 - Math.exp(-dt * 5);
            this.camera.position.lerp(this.travel.position, f);
            this.controls.target.lerp(this.travel.target, f);
            if (this.camera.position.distanceTo(this.travel.position) < .02)
                this.travel = null;
        }
        this.renderOnce();
        this.samples.push(dt);
        this.frameTimes.push(dt * 1000);
        if (this.frameTimes.length > 600)
            this.frameTimes.shift();
        if (this.samples.length >= 120) {
            const fps = this.samples.length / this.samples.reduce((a, b) => a + b, 0);
            this.samples = [];
            this.stats = { fps, quality: this.quality, triangles: this.renderer.info.render.triangles, drawCalls: this.renderer.info.render.calls, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures };
            window.__BYTEBOUND_RENDER_STATS__ = this.stats;
            if (this.auto && fps < 42 && this.quality !== 'low') {
                this.quality = 'low';
                this.applyQuality();
                this.options.onQuality?.('low');
            }
        }
        this.raf = requestAnimationFrame(t => this.frame(t));
    }
    renderOnce() { if (!this.host || !this.built || document.hidden || !this.visible)
        return; this.renderer.render(this.scene, this.camera); this.stats = { ...this.stats, quality: this.quality, triangles: this.renderer.info.render.triangles, drawCalls: this.renderer.info.render.calls, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures }; window.__BYTEBOUND_RENDER_STATS__ = this.stats; }
    focus(index) { const target = this.built?.focus?.(index); if (!target)
        return; if (this.reduced) {
        this.camera.position.copy(target.position);
        this.controls.target.copy(target.target);
        this.controls.update();
        this.renderOnce();
    }
    else
        this.travel = target; }
    react(success) { this.built?.react?.(success); this.renderOnce(); }
    filter(value) { this.built?.filter?.(value); this.renderOnce(); }
    disposeTree(root) { const geos = new Set(), mats = new Set(), textures = new Set(); root?.traverse(obj => { if (obj.geometry)
        geos.add(obj.geometry); for (const mat of (Array.isArray(obj.material) ? obj.material : [obj.material]))
        if (mat) {
            mats.add(mat);
            for (const value of Object.values(mat))
                if (value?.isTexture)
                    textures.add(value);
        } }); textures.forEach(t => t.dispose()); mats.forEach(m => m.dispose()); geos.forEach(g => g.dispose()); }
    unmount() { ++this.generation; cancelAnimationFrame(this.raf); this.controls?.dispose(); this.resizeObserver?.disconnect(); this.intersection?.disconnect(); this.disposeTree(this.built?.root); this.scene?.clear(); this.built = null; this.host?.classList.remove('has-webgl'); this.renderer?.domElement.remove(); this.host = null; this.travel = null; this.focused = false; this.visible = true; }
    destroy() { this.unmount(); document.removeEventListener('visibilitychange', this.onVisibility); window.removeEventListener('bytebound-editor-focus', this.onFocus); this.renderer.domElement.removeEventListener('webglcontextlost', this.onLost); this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown); this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp); this.renderer.dispose(); }
}
