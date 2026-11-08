# Put Bytebound on your personal devices

## Before starting

This archive contains the complete source, not an already compiled website. Use a **personal** account, not your employer's workspace. The recommended workflow performs the downloads and build on GitHub, so you do not need to install programming tools on your computer. The app has no server process, database, subscription logic, or paid service integration. Hosting remains subject to each provider's current free-tier terms and limits.

A public website is not an authenticated private website. Your code and progress remain local, but someone else can open the same address and begin their own separate adventure.

## Option 1: GitHub Pages, entirely through the browser

1. Extract `bytebound-source.zip` into a folder. Open it and locate `package.json`, `index.html`, `src`, `public`, `scripts`, and `tests`.
2. Sign in to your personal GitHub account. Choose **New repository**, name it **bytebound**, choose **Public**, and create it. Public is the straightforward free Pages route. Never upload work documents or real clinical data.
3. Choose **uploading an existing file** or **Add file -> Upload files**. Upload the **contents** of the extracted `bytebound` folder, not the ZIP and not an extra outer folder. `package.json` must appear at the repository root. The larger `qa` screenshots are optional for hosting; keep them locally as evidence.
4. Commit the upload to the `main` branch.
5. Ensure the workflow exists at `.github/workflows/deploy.yml`. Hidden folders can be missed during drag-and-drop. When necessary, choose **Add file -> Create new file**, enter that complete path, and paste the complete contents of the supplied `deploy.yml`. Commit it. Do the same for `.gitignore` when needed.
6. Open **Settings -> Pages**. Under **Build and deployment**, choose **GitHub Actions** as the source.
7. Open **Actions -> Verify and publish Bytebound**. If the first run occurred before Pages was configured, choose **Run workflow**, or rerun the failed job after enabling Pages.
8. The workflow installs pinned direct dependencies, obtains the checksum-verified Python runtime, runs native/unit tests, builds the complete static site, then executes the real-browser release gate. A red run must be investigated. **Do not remove the test step to force publication.**
9. After the verification and deploy jobs are green, open **Settings -> Pages -> Visit site**, or open the environment URL shown by the deploy job.
10. Keep the first visit online until the app says **Ready offline**. It verifies all lessons, scientific packages, fonts, and scene chunks; merely opening the home screen is not enough.
11. Open Day 1 and run a solution. Then disconnect the device from the network, close the app, reopen it, and run again. The included browser gate also checks an offline scientific plotting task before publication.
12. In the successful Actions run, download **bytebound-verification-and-lock**. Extract `package-lock.json` and upload that file to the repository root. Later runs use `npm ci` for repeatable dependency resolution. Retain the generated browser reports.

The app uses relative deployment URLs, and the browser tests exercise `/bytebound/` as well as the site root. The expected Pages address has the structure `https://YOUR-USERNAME.github.io/bytebound/`.

### A red workflow: what to inspect

Open the failed step and read its final error. The artifact **bytebound-verification-and-lock** retains test reports even on failure when those files were produced.

- **Download or checksum failure:** do not weaken checksum checks. Confirm network access and the official release asset, then rerun.
- **npm version or dependency resolution failure:** keep the error and resolve the pinned dependency mismatch; this delivery could not execute npm installation locally.
- **Browser reference test failure:** inspect `qa/pyodide-reference-results.json`, the HTML Playwright report, and the retained trace. Native Python passing does not override a Pyodide failure.
- **Offline failure:** check the failing asset path, MIME type, checksum, quota, and deployment subpath. Never relabel a partial pack as ready.
- **Accessibility failure:** fix the reported element rather than disabling the audit.

## Option 2: Netlify

Use the same personal repository. In Netlify, import an existing project from GitHub. Set the build command to `npm run build`, publish directory to `dist`, and Node version to `22`; `netlify.toml` supplies these values. Use a free static hosting plan without paid add-ons.

**Verification matters:** a Netlify build alone is not the browser release gate. First obtain a green verification run from the included GitHub workflow. Alternatively, download its **bytebound-static-site** artifact, extract the inner site ZIP, and upload that compiled folder through Netlify's manual static deployment interface. The deployed folder must contain `index.html`, assets, Python packages, and `offline-manifest.json` at its top level.

## Option 3: Cloudflare Pages

In your personal Cloudflare account, open **Workers & Pages**, create a **Pages** project, and connect the repository. Choose the `main` branch, build command `npm run build`, output directory `dist`, and environment variable `NODE_VERSION=22`. Do not create a database or backend Worker for this app.

As with Netlify, run the included real-browser gate before treating a deployment as verified. A direct-upload Pages project can receive the already compiled static artifact from a successful GitHub run. Ensure the entire output folder is included, not just `index.html`.

## Add to a phone or tablet home screen

### iPhone / iPad

Open the deployed HTTPS address in Safari. Tap **Share**, then **Add to Home Screen**. Confirm the name and tap **Add**. Open the new icon. Browser/OS versions can display slightly different wording. Verify **Ready offline inside the installed app**; do not assume storage is shared identically across browser and installed contexts.

### Android

Open the deployed address in Chrome. Use the browser menu and choose **Install app** or **Add to Home screen**, then confirm. The in-app **Settings -> Add to home screen** control also opens a native prompt when the browser provides one.

### Personal laptop

In a supporting browser such as Chrome or Edge, look for the install icon in the address bar. Installing is optional: the ordinary browser tab also works. Browser-specific installation support varies.

## Backups, transfer, and updates

Use **Settings -> Export JSON** before changing devices, clearing site data, removing an installed app, or applying a major update. On the new device, use **Import JSON** and confirm replacement only after validation succeeds. There is no cloud sync and no account recovery.

When an update is available, finish the current challenge, export a backup, open Settings, and apply it. Updates do not force-reload a running mission. Browser caches can be evicted despite an earlier successful download; the app checks readiness and offers a retry. A persistence request helps only when the browser grants it.

## Official references

The implementation and instructions were checked against official documentation on 8 November 2026:

- Vite deployment: `https://vite.dev/guide/static-deploy`
- GitHub Pages creation: `https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site`
- PWA installation: `https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing`
- Pyodide self-hosting: `https://pyodide.org/en/stable/usage/downloading-and-deploying.html`

Provider interfaces and limits can change. These instructions create no paid account, backend, or recurring server process.
