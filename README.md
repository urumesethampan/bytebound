# BYTEBOUND
## Thirty missions. Five floating worlds. Your first Python adventure.

A single-user, browser-only Python learning game for Swen. The production app has no backend, account system, analytics, cloud grader, remote fonts, or runtime CDN dependencies. All learning code runs in a dedicated Pyodide module worker. Progress stays in the current browser.

**Delivery status: complete application source; production release gate still pending.** The delivery environment could not download npm/Pyodide dependencies, and its browser policy blocked URL navigation. Therefore this archive is **not a prebuilt, production-certified website**. The actual curriculum, state systems, worker controller, offline-cache logic, and isolated DOM interface were tested. Real Pyodide, CodeMirror, Three.js, service-worker installation, and physical-phone performance still need the included release workflow. Read `docs/QA_REPORT.md` before publishing.

## Start here: no developer setup required

Open **`docs/DEPLOYMENT.md`**. The recommended route uses your personal GitHub account and GitHub Actions to build, verify, and publish the static website. You do not install Node or Python on your phone or laptop to use the published app. Installing the PWA is optional.

The workflow builds and self-hosts Python, NumPy, pandas, matplotlib, fonts, libraries, and app assets. It publishes only after the production-browser tests pass. A failed workflow is a failed release gate, not permission to skip verification.

## Included

- 30 authored missions, 150 challenges, 30 plausible AI-code audits, five multi-phase bosses, three-level hints, and 300 deliberately wrong fixtures.
- Variables, arithmetic, strings, inputs, conditionals, loops, collections, functions, imports, errors, files, CSVs, and a synthetic-data pandas finale.
- Mobile CodeMirror 6 editor with immediate textarea fallback, specific behavioral tests, bounded output, queued stdin, plots, and a five-second execution watchdog.
- XP, first-try combos, levels, earned cosmetic coins, badges, forgiving streaks, comeback rewards, daily goals, spaced review, Five-Minute Mode, and an optional focus timer.
- Procedural Three.js hub, five themed islands, world map, companion, concept visualizations, reward scenes, badge shelf, boss arena, and bug corridor.
- Static 2D fallback, Battery Saver, quality controls, reduced motion, color-safe settings, light/dark themes, font adjustment, and keyboard navigation.
- Guarded local saves, strict import validation, safe reset, manual JSON transfer, multi-tab conflict warning, and graceful storage failure.
- Versioned service worker with checksum-verified offline readiness and explicit between-mission updates.
- Synthetic datasets, source generators, test suites, deployment configuration, and extension guides.

## Repository map

```
index.html                     Accessible document and same-origin CSP
src/main.js                    Application orchestration and routing
src/engine/                    Runner, errors, lesson schema, grading payloads
src/game/                      Saves, rewards, mastery, streaks, sound
src/scenes/                    Scene lifecycle and procedural models
src/scenes/worlds/             Five themed world scenes
src/ui/                        Screens, editor, focus timer, responsive design
src/platform/                  Offline/install integration
public/lessons.json             Canonical editable course content
public/grader.py                Production Python grader
public/python-worker.js         Self-hosted Pyodide module worker
public/sw.js                    Offline cache lifecycle
public/data/                   Entirely synthetic CSV fixtures
public/icons/                  Original procedural app icons
scripts/                       Content generation, runtime preparation, build tools
.github/workflows/deploy.yml    Fail-closed browser verification and Pages deployment
tests/                         Native, unit, DOM-fixture, and production-browser tests
docs/                          Deployment, authoring, architecture, QA, privacy
qa/                            Actual verification evidence and labeled screenshots
```

`FILE_TREE.txt` lists every delivered file. `SOURCE_CHECKSUMS.sha256` verifies the delivered source and evidence files. Files are complete; `node_modules`, compiled `dist`, and downloaded scientific-runtime/font binaries are intentionally not in the source archive.

## Development, for someone who already uses a terminal

Use Node 22 or later and a platform with `tar` available. The first preparation needs internet access.

```sh
npm install
npm run prepare:runtime
npm run dev
```

For production:

```sh
npm run check
python3 -m pip install pandas matplotlib
npm run test:content
npm run test:grader
npm run build
npx playwright install --with-deps chromium
npm run test:browser
```

The development server is bound to localhost. Upload only the generated `dist` folder to a static host. Do not double-click `index.html`; module imports, workers, and service workers require a web origin.

## Architecture choices

The implementation uses clean ES-module JavaScript with JSDoc, explicit DOM components, and a handwritten allow-list validator rather than Preact/Zod. This reduces dependency surface and permits independent state/DOM testing. Vite, CodeMirror 6, Three.js, and Pyodide remain the production dependencies described in the plan.

Direct npm versions are pinned. **No generated npm lockfile is included because dependency resolution was unavailable here.** The first GitHub build creates `package-lock.json` and saves it in the verification artifact. Commit that file for subsequent `npm ci` builds. Pyodide core is pinned to version 314.0.7 and its official SHA-256; scientific packages are checked against that version's lockfile.

## Learning, not clinical authority

The 240-record clinical-style dataset is fictional and reproducible. It has no real patient source, real biomarker interpretation, or clinical validity. The course teaches a descriptive analysis and common coding mistakes; it does not certify ML, statistical, clinical, or data-governance competence.

## Privacy boundary

Local-only progress is not password-protected hosting. A public static URL can be opened by anyone; they get their own local save. A hosting provider may retain normal request logs. Do not put credentials, real clinical data, or proprietary company data into this learning environment. The interpreter guardrails are educational restrictions, not a hostile-code security sandbox.
