# Architecture and operational boundaries

## Screen and execution paths

The initial screen depends only on the lightweight interface modules, CSS, and lesson catalog. The editor first renders an accessible textarea; the bundled CodeMirror module upgrades it without losing text. Three.js is dynamically imported only for a visible 3D scene. Python initialization is independent of both paths.

The UI sends a challenge payload to `PythonRunner`, which maintains one in-flight request and a generation ID. A blob bootstrap imports the same-origin module worker and inherits the document's Content Security Policy. The module worker imports self-hosted Pyodide, installs bundled CSV fixtures in its virtual filesystem, and loads the production grader.

Scientific packages are loaded and imported before the five-second execution watchdog starts. An `executing` message starts the main-thread deadline. Timeout terminates the entire worker and starts a new one. Late messages from old generations cannot update the UI. Hiding the page cancels an active run because background timer throttling makes wall-clock promises unreliable.

The initialization/package preparation limit is 120 seconds, not five. A first download can be substantial. There is no claim that first-ever Python execution takes less than three seconds.

## Grading

`public/grader.py` is used in production and native QA. `src/engine/submission.js` is shared by the interface and browser QA. Code runs in a fresh namespace. Tests evaluate observable variables, stdout, collections, DataFrame equality, numeric tolerances, and chart values rather than comparing code text.

Reference solutions and two negative fixtures accompany every core challenge. Native QA executes the same Python grader under CPython; it is explicitly not a substitute for Pyodide verification. The production suite runs the references and negatives through `window.__BYTEBOUND_QA__.run`, which delegates to the actual worker controller.

Output is capped at 32 KiB or 300 lines inside the worker. Up to two matplotlib PNGs are captured, with bounded rendering dimensions and byte size. Tracebacks remain available beside translations for common exceptions. The simple conclusion check in Day 30 is a vocabulary scaffold, not an automated clinical-reasoning assessment.

`input()` reads the prefilled Program inputs queue. This avoids blocking prompts and cross-origin-isolation requirements. An exhausted queue produces an EOFError explanation. Bundled datasets are restored before each run; learner-created scratch files are temporary and disappear when the worker restarts.

## Storage and game evidence

Only `src/game/storage.js` accesses localStorage, and every access is guarded. Import is allow-list validated before replacement. The current schema is version 1; unsupported versions are rejected without overwriting the save. A future schema change requires an explicit, tested migration; no migration from hypothetical versions is claimed.

Saved code is capped per challenge, import size is capped at 1 MB, unsupported fields/IDs are rejected, and prototypes are never merged. Save failures leave a playable in-memory session with an export warning. Another tab's newer save blocks stale writes until reload.

Hints reduce only optional bonus XP. Completion and mastery are separate. Independent retrieval on different dates provides mastery evidence. Initial review intervals are 1, 3, 7, 14, and 30 days; another incorrect or assisted result brings review forward. Local clocks are not a tamper-proof time source, which is acceptable for a private learning game.

The learning schedule is a practical design, not a validated ADHD treatment or a guaranteed 30-day skill outcome. Breaks do not remove XP. Variable rewards can be disabled with Calm rewards, and every session has a stopping point.

## 3D lifecycle

A single renderer is reused. Scene factories return owned root objects, optional `tick`, `react`, and `filter` methods, and camera settings. Geometries, materials, textures, event listeners, observers, and orbit controls are disposed or detached at scene change. Instancing is used for repeated trees, crystals, gears, cubes, and map objects. No physics or heavy post-processing is required.

A perspective camera, hemisphere light, directional light, low-poly geometry, emissive materials, and simple contact shadows provide the art direction. Pixel ratio caps are Low 1, Medium 1.5, High 2. Adaptive mode reduces rendering quality after sustained low frame rate. Battery Saver does not create a WebGL scene.

Rendering pauses for hidden tabs, off-screen scene hosts, and editor focus. Reduced motion uses static composition or direct camera placement. Essential navigation and feedback always exist as DOM controls. Boss arena reactions occur between coding phases; the editor background stays quiet.

The present quality modes primarily change pixel ratio, particles, and selected decorative counts. High does not add a separate high-poly asset set. A software-rendered CI browser is not evidence of 60 FPS on a physical phone.

## Offline lifecycle

The build downloads an official, checksum-pinned Pyodide core and resolves only the NumPy/pandas/matplotlib dependency closure from its own package lock. Font packages and libraries are bundled or copied locally at build time. There is no runtime CDN fallback.

`finalize-build.mjs` inventories production assets with SHA-256, byte counts, and a version derived from the inventory. The service worker installs the small app shell, then verifies and stores all lazy scene chunks, datasets, scientific packages, and other assets. Only a complete verified pack receives the ready marker. Failed or interrupted preparation is resumable. An update waits for explicit activation rather than replacing a mission mid-run.

Cache verification uses bounded concurrency of two files. Hashing and package storage still consume memory and disk. Storage eviction, exhausted quota, and device resource limits remain browser constraints. Exported progress backups are the durable user-controlled recovery mechanism.

## Security and privacy

The deployed app has no accounts, API keys, upload endpoint, telemetry, AI service, or server-side execution. Same-origin CSP and worker request restrictions prevent ordinary application code from requesting third-party assets. An educational AST allow-list blocks direct networking and interpreter escape APIs; it is not a formal security boundary against malicious code. Do not paste untrusted hostile programs.

WebAssembly workers isolate execution from the DOM but do not provide a hard memory quota. Huge allocations can still exhaust or crash a tab before a timeout recovers it. This is a documented limitation, not a guarantee of never freezing any device.

The host may retain ordinary HTTP access logs. Browser saves are not encrypted, authenticated, or synchronized. Public hosting does not hide the code or website URL. Synthetic records are the only bundled data.
