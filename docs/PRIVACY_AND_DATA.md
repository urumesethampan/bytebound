# Privacy, synthetic data, and license boundaries

## What stays in this browser

Your saved code, progress, attempts, hints, earned rewards, settings, local streak dates, and approximate active learning time are stored locally. No analytics SDK, tracking pixel, cloud grader, AI API, or upload endpoint is present. Scientific computation takes place in a worker on the current device.

Progress is not encrypted. Anyone with access to the same browser profile may access it. Public static hosting does not authenticate visitors or hide the application code. Hosting infrastructure can retain ordinary network/access logs outside this application's control. Use a personal account and keep this separate from company or clinical systems.

Only use the bundled fictional records. Do not paste patient records, credentials, secret keys, or proprietary information into code. The interpreter restrictions are teaching guardrails, not a security guarantee for hostile programs.

## Data dictionary

`patients.csv` has 240 seeded fictional rows:

| Field | Meaning in this exercise |
|---|---|
| `patient_id` | Unique fictional identifier, SYN001 through SYN240. |
| `age` | Synthetic age-like integer from a deterministic sequence. |
| `baseline_score` | Arbitrary synthetic numeric score; every 17th record has a missing value. No real scale or clinical interpretation. |
| `followup_days` | Synthetic follow-up-like integer. Not a time-to-event endpoint. |
| `outcome` | Generated binary label, 0 or 1. It is not a validated clinical outcome. |

`labs.csv` has the same 240 unique IDs plus `marker_a`, an arbitrary fictional measurement with controlled missingness. `labs-duplicates.csv` contains one extra duplicate ID, intentionally, for join-audit exercises. `bad-values.csv` contains an invalid numeric string and a missing value. `supplies.csv` supports the initial CSV-reading lesson.

The generation seed is 7319. Code in `scripts/create-content.py` is the full provenance. No real patients, source registry, outside dataset, or protected health information was used.

The generated outcome is intentionally associated with some generated values. This allows a descriptive coding exercise. It does not simulate a valid study design, representative population, clinical mechanism, causal relationship, diagnostic performance, or model-validation task.

## Licensing

Application code, authored lesson text, procedural models, procedural icons, and synthetic datasets are provided under the accompanying MIT license. This is an original project, not an imitation of a copyrighted game franchise. All sound effects are synthesized at runtime using Web Audio.

Three.js, CodeMirror, their dependencies, Pyodide/CPython, NumPy, pandas, matplotlib, and fonts retain their respective licenses. The runtime preparation script copies JavaScript/font license notices into the deployed `licenses/` directory. Python wheel archives retain their package license metadata and notices. Do not remove third-party notices when distributing a build.

No font binaries from the delivery environment are included in this source archive. The build obtains the declared Fontsource packages and serves those licensed fonts locally.
