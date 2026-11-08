# Add a procedural 3D visualization

The learning interface never depends on a canvas. Keep a text/DOM explanation available, then add an optional scene factory.

## Scene contract

Create a module under `src/scenes/`. It exports a default function accepting scene options. Return a `root` Object3D, camera placement, and optional update/interaction functions. Here is a complete visualization module:

```js
import * as THREE from 'three';
import {box, label} from './primitives.js';

export default function build() {
  const root = new THREE.Group();
  const input = box([0.8, 0.8, 0.8], '#a7c7ff', [-1.4, 0, 0]);
  const output = box([0.8, 0.8, 0.8], '#c9f66b', [1.4, 0, 0]);
  root.add(input, output);
  const caption = label('7  ->  double()  ->  14', '#e9eee6', 0.75);
  caption.position.set(0, 1.2, 0);
  root.add(caption);

  return {
    root,
    camera: {position: [4, 3, 5], target: [0, 0.2, 0]},
    tick(time) {
      output.position.y = Math.sin(time * 1.4) * 0.08;
    },
    react(success) {
      output.scale.setScalar(success ? 1.1 : 1);
    }
  };
}
```

Register its dynamic loader in `src/scenes/manager.js`, for example:

```js
signal: () => import('./signal.js')
```

The optional concept button currently calls the `concept` scene and passes the lesson's `visualizationId`. To integrate a new concept without changing screen code, add its branch inside `src/scenes/concepts.js`, or have that module select a dynamically imported dedicated factory. Set the lesson's `visualizationId` to the new identifier. Update the DOM explanation at the same time when the new concept needs a distinct table or control.

## Ownership and cleanup

Every geometry, material, and texture you create must remain reachable from your returned root so the scene manager can dispose it. Hide defeated objects rather than removing and losing their resource references. Reuse materials within a scene. Do not retain a scene in a global cache unless you add explicit reference-counted ownership.

Do not attach an independent requestAnimationFrame loop, document listener, or WebGL renderer. The manager already handles animation, visibility, focus, reduced motion, quality, and disposal. If an extension adds any listener, implement and invoke a cleanup path; the current factory contract owns only objects beneath its root.

## Performance discipline

Keep concept scenes near 6,000 triangles and 16 draw calls as design targets. Use instancing for repeated items. Prefer emissive geometry to post-processing bloom. Avoid real-time shadows and large transparent layers. Treat shader glow as an accent, not essential feedback.

Low quality reduces pixel ratio and particles. Battery Saver skips the WebGL path completely. The manager calls a static update in reduced-motion mode, so choose a representative pose that communicates the idea without motion. Every click target needs a standard DOM alternative.

## Test

Open the visualization with default, Low, Battery Saver, and reduced-motion settings. Focus the editor and hide the tab to confirm pausing. Reopen it repeatedly and inspect `window.__BYTEBOUND_QA__.getRenderStats()` for resource stability. Test context loss and a browser with WebGL disabled. Measure on actual phones; do not report software-rendered CI FPS as device performance.
