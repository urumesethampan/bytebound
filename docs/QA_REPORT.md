# BYTEBOUND - delivery QA report

**Report date:** November 8, 2026  
**Release decision:** SOURCE DELIVERED; PRODUCTION RELEASE GATE NOT YET VERIFIED.

This package contains the source implementation for stages A-F, complete curriculum, synthetic datasets, build/deployment scripts, and tests. It is not a prebuilt website and must not be described as a production-certified release. The delivery environment could not resolve/download npm or Pyodide packages. Its managed Chromium configuration blocked URL navigation. No managed browser policy was changed or bypassed.

The GitHub Actions workflow is configured to build with real dependencies, execute the production-browser suite, and publish only after that suite passes. That workflow has not been run as part of this delivery. A test definition is not a test result.

## 1. Executed verification

| Test group | Result | What actually ran | Evidence |
|---|---:|---|---|
| Curriculum reference solutions | **150/150 pass** | Production `public/grader.py`, production challenge payloads, native CPython 3.13.5 with pandas 2.2.3 | `qa/native-reference-results.json`, `qa/native-reference.log` |
| Deliberately wrong submissions | **300/300 rejected** | Two negative fixtures per core challenge, same native grading path | Same files |
| Grader edge cases | **21/21 pass** | Native production grader, including real matplotlib image capture | `qa/grader-edge-results.json`, `qa/grader-edge.log` |
| JavaScript unit/model tests | **30/30 pass** | Actual state/schema/storage logic; mocked Worker/timers; simulated service-worker cache/fetch environment | `qa/node-tests.tap` |
| Isolated browser-interface checks | **19/19 pass** | Actual UI modules and styles in headless Chromium through an in-memory fixture; stubbed worker responses, mock storage, system fonts, textarea/SVG fallbacks | `qa/ui-fixture-results.json`, `qa/ui-fixture.log` |
| JavaScript syntax | **42/42 modules parse** | Node syntax checks, excluding generated fixtures and dependency/build directories | `qa/syntax-check.log` |

**Important distinction:** the native reference suite uses the same grading function as the app, but it does not prove that Pyodide can initialize, load scientific packages, or execute those submissions within its browser time budget. The DOM fixture does not load CodeMirror, Three.js, Pyodide, the actual service worker, or the production Content Security Policy.

### Native grader edge cases

The 21 executed checks cover the eight requested Python error types and their original tracebacks; empty and oversized submissions; exhausted and ordered stdin; huge ASCII and Unicode output; line-count limits; fresh execution namespaces; unavailable imports; explanatory failed checks; alternate valid implementations; predictions graded against executed output; and plot capture, size bounding, and figure cleanup.

### JavaScript coverage

Thirty passing tests cover lesson structure and submission payloads, reward idempotency, assisted versus independent mastery, streak/review behavior, schema rejection, guarded storage failures, runner boot/execution phases, the five-second watchdog's timer logic, stale worker messages, overlapping runs, and cache preparation/integrity/resumption algorithms.

**The mocked watchdog test is not a real Pyodide infinite-loop test.** Similarly, the simulated cache tests do not establish real browser offline support.

### Interface coverage

The 19 executed browser-fixture checks cover the dominant Continue action, empty-code feedback, applying a simulated successful result to progress, preserving the next challenge's draft, the three-step hint ladder, optional visualization dialogs, Escape handling, static Battery Saver, theme changes, malformed imports preserving saves, reset, Five-Minute Mode, phone/tablet overflow, unobscured Run controls, reduced-motion preference, and uncaught JavaScript errors.

Phone viewport: **390 x 844**. Tablet viewport: **820 x 1180**. Desktop preview: **1440 x 1000**. These are browser viewport simulations, not physical device testing.

## 2. Implemented but NOT VERIFIED in this environment

| Release gate | Current status |
|---|---|
| npm dependency resolution and transitive dependency lock | NOT RUN; network unavailable |
| Pinned Pyodide archive/package download and SHA verification | IMPLEMENTED; download NOT RUN |
| Production Vite build and generated offline inventory | NOT RUN |
| Real CodeMirror editor behavior | NOT RUN; textarea fallback tested |
| All reference/negative fixtures through the actual module worker | NOT RUN |
| Real five-second infinite-loop termination and worker restart | NOT RUN |
| Scientific package loading, plot capture, and unseen World 5 lesson offline | NOT RUN in Pyodide |
| Actual service-worker install, update lifecycle, and complete-pack offline reload | NOT RUN |
| Full production CSP and network isolation | NOT RUN |
| WebGL scene rendering, context-loss recovery, scene disposal, GPU memory behavior | NOT RUN |
| Automated production accessibility audit | NOT RUN |
| Safari/iOS, Android browser, Firefox, and actual tablet/laptop compatibility | NOT RUN |
| Physical-device FPS, power use, and virtual-keyboard interaction | NOT RUN |
| Live GitHub Pages / Netlify / Cloudflare deployment | NOT RUN |

`tests/browser.spec.mjs` defines the production-browser checks and writes separate evidence when executed. It includes real-runtime curriculum evaluation, timeout/output/overlap tests, mobile CodeMirror behavior, imports/reset, complete/interrupted offline preparation, WebGL-unavailable fallback, quality/motion layouts, same-origin requests, repository-subpath hosting, accessibility scans, and rendering/resource diagnostics. Its automated project currently targets Chromium only; broader browser and physical-device checks still require additional verification.

## 3. Performance: measured versus estimated

**Physical-device FPS: NOT MEASURED.** No Three.js FPS results are claimed.

The isolated DOM fixture recorded approximately **155 ms** from its synthetic document start to the interactive marker and **96 ms** from Continue to its textarea editor in the final run. These values exclude all network transfer, production bundling, real Python, CodeMirror, Three.js, and custom font loading. They are debugging measurements, **not** evidence that the production three-second target is achieved.

Production targets are under three seconds to the actionable interface/editor on a documented normal connection and approximately 60 FPS on a named mid-range phone, degrading gracefully when necessary. They remain unverified. The release browser suite will report local CI startup and render diagnostics, but CI software rendering must not be relabeled as phone performance.

No actual scientific-runtime download size was measured here. The build writes exact sizes to `qa/build-size-results.json` and `public/runtime-meta.json`. A transfer estimate should use those values: minimum transfer seconds = bytes x 8 / connection bits per second, plus initialization. For illustration only, a hypothetical 60 MiB pack over a sustained 10 Mbps connection takes about 50 seconds just to transfer. That is not a measurement or a claim about this build's eventual size.

### Rendering budgets: design targets only

| Scene | Target triangle ceiling | Target draw-call ceiling | Expected pressure |
|---|---:|---:|---|
| Home hub | 16,000 | 32 | Geometry, companion, small particle cloud |
| Five-island map | 24,000 | 45 | Five simultaneous islands, nodes, bridges; likely heaviest overview |
| Garden / cavern / library | 12,000 / 18,000 / 14,000 | 28 / 32 / 24 | Repeated procedural props |
| Forge | 20,000 | 38 | Rotating gears and machine details |
| Medical lab | 16,000 | 30 | Bars and point cloud; scientific Python is a separate memory cost |
| Boss arena | 22,000 | 40 | Animated enemy and reaction effects |
| Reward / concept / companion | 8,000 / 6,000 / 1,500 | 20 / 16 / 6 | Short, isolated scenes |

These ceilings have **not** been measured or proven. The renderer exposes triangle, draw-call, texture, geometry, and sampled-FPS diagnostics for tuning. Low mode, capped pixel ratio, no heavy post-processing, instancing, focus/visibility pauses, and 2D fallback are implemented mitigation paths, not proof of a 60 FPS result.

## 4. Defects found and addressed during this build

- Phone home layout could overflow horizontally; corrected and regression checked.
- Fixed mobile navigation could cover Run at the initial mission scroll position. Missions now have a dedicated fixed Run bar and hide global mobile navigation. Both phone/tablet Run targets pass visibility and hit-testing checks.
- Moving to a new challenge could overwrite its draft with the previous editor contents; corrected and regression checked.
- Run results could arrive after navigation; request generation and route cancellation prevent applying stale results.
- Repeating an already-completed challenge could create duplicate reward risk; idempotent completion is unit-tested.
- Corrupted imports could endanger a current save; validation precedes replacement and is tested.
- Battery Saver's SVG fallback could still animate; static behavior is now tested.
- Scene statistics could retain the previous scene's counts; counts now refresh on rendered frames.
- Editor focus could precede lazy scene initialization; continuous-render eligibility also inspects the active editor element.
- An update appearing while Settings was already open could lack an Apply button; notification insertion is implemented.

The last four scene/update integration details are code-reviewed but not full production-WebGL/service-worker verified.

## 5. Known limitations and boundaries

1. **Source, not a prebuilt release.** npm dependencies and the scientific runtime are deliberately not fabricated or replaced with a mock app. The first real build may expose dependency/API/asset issues that require fixes. There is no live URL in this delivery.
2. **No generated dependency lock yet.** Direct versions are pinned. The first successful dependency installation creates `package-lock.json`; the workflow stores it for committing before subsequent `npm ci` builds.
3. **Local privacy is not access control.** A public static site has no authentication; the host can receive normal request metadata. Progress and editor drafts remain local and are not encrypted.
4. **No automatic device sync.** Transfer JSON backups manually. Browser storage can be denied or evicted, so offline operation is not guaranteed forever after one visit.
5. **A worker is not a hard memory sandbox.** The execution watchdog limits time; huge allocations can still exhaust resources. Educational import checks and CSP are not an assurance for malicious code. Do not enter secrets or real clinical data.
6. **Input is queued before Run**, not an interactive blocking terminal. Python state starts fresh per submission; bundled data is restored before each run. Scratch files exist only until the worker restarts.
7. **No clinical inference certification.** Data is synthetic. The final interpretation uses a deliberately small textual scaffold and cannot robustly grade all scientific reasoning or prove causal understanding.
8. **The DataFrame 3D concept view is illustrative.** Its six-row filter is mirrored in an accessible table; actual 240-record analyses execute separately through pandas.
9. **Accessibility and graphics claims remain conditional.** Phone virtual keyboards, real screen readers, contrast scans, GPU cleanup, scene budgets, and broad platform support require the outstanding release tests.
10. **No claim of no bugs.** Passing native and model tests does not establish correctness of unexecuted production integrations.

## 6. Reproduction

```sh
npm install
npm run check
python3 -m pip install pandas matplotlib
npm run test:content
npm run test:grader
npm run build
npx playwright install --with-deps chromium
npm run test:browser
```

For the isolated UI fixture only, install Python Playwright and provide a compatible Chromium executable, then run `npm run test:ui`. That fixture is never deployed and must not be used as a substitute for the production browser suite.

Screenshots in `qa/home-*.png` and `qa/mission-*.png` show the real interface's **2D fallback with system fonts** in the isolated fixture. They are not screenshots of verified Three.js scenes or real Python execution.
