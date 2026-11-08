/** Release gate: real bundled CodeMirror, Three.js, Pyodide, worker, and service worker.
 * This file is intentionally separate from the isolated DOM fixture tests.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const origin = 'http://127.0.0.1:4173';
const harmlessTest = { expression: '__output__ == "2"', message: 'Print 2.', success: 'Printed 2.' };
async function boot(page, path = '/') { await page.goto(path); await page.waitForFunction(() => !!window.__BYTEBOUND_QA__); }
async function run(page, payload) { return page.evaluate(p => window.__BYTEBOUND_QA__.run(p), payload); }
async function ready(page) { await expect.poll(() => page.evaluate(() => window.__BYTEBOUND_QA__.getRunnerStatus()), { timeout: 120000 }).toBe('ready'); }
async function offlineReady(page) { await expect(page.locator('#offline-status')).toContainText('Ready offline', { timeout: 180000 }); await page.evaluate(async () => { await navigator.serviceWorker.ready; }); }
function payload(code, tests = [harmlessTest], packages = []) { return { code, tests, inputs: [], packages }; }
test('all 150 reference solutions pass and all 300 wrong answers fail through production worker', async ({ page }) => {
    test.setTimeout(600000);
    await boot(page);
    await ready(page);
    const catalog = await page.evaluate(() => window.__BYTEBOUND_QA__.catalog);
    const rows = [];
    for (const lesson of catalog.lessons)
        for (const challenge of lesson.challenges) {
            const reference = await page.evaluate(async (c) => window.__BYTEBOUND_QA__.run(window.__BYTEBOUND_QA__.makeSubmission(c, window.__BYTEBOUND_QA__.referenceValue(c))), challenge);
            rows.push({ id: challenge.id, kind: 'reference', passed: reference.ok, error: reference.error, checks: reference.checks });
            for (const [index, value] of challenge.wrongAnswers.entries()) {
                const result = await page.evaluate(async ({ c, value }) => window.__BYTEBOUND_QA__.run(window.__BYTEBOUND_QA__.makeSubmission(c, value)), { c: challenge, value });
                rows.push({ id: challenge.id, kind: 'negative', index, passed: !result.ok && !['RuntimeError', 'Busy', 'Stopped'].includes(result.error?.type), error: result.error });
            }
        }
    const report = { environment: 'Real Pyodide in Chromium module worker; production grader and UI payload conversion', referencePassed: rows.filter(r => r.kind === 'reference' && r.passed).length, referenceTotal: rows.filter(r => r.kind === 'reference').length, negativeRejected: rows.filter(r => r.kind === 'negative' && r.passed).length, negativeTotal: rows.filter(r => r.kind === 'negative').length, results: rows };
    await fs.writeFile('qa/pyodide-reference-results.json', JSON.stringify(report, null, 2) + '\n');
    expect(rows.filter(r => !r.passed), JSON.stringify(rows.filter(r => !r.passed), null, 2)).toEqual([]);
});
test('empty input, five-second timeout, huge output, rapid runs, and recovery', async ({ page }) => {
    await boot(page);
    await ready(page);
    expect((await run(page, payload(''))).error.type).toBe('EmptyInput');
    const started = Date.now();
    const loop = await run(page, payload('while True:\n    pass'));
    expect(loop.error.type).toBe('Timeout');
    expect(Date.now() - started).toBeGreaterThanOrEqual(4900);
    expect(Date.now() - started).toBeLessThan(9000);
    expect((await run(page, payload('print(2)'))).ok).toBe(true);
    const noisy = await run(page, payload("for i in range(20000):\n    print('x' * 100)", [{ expression: 'True', message: 'No check failed.', success: 'Finished.' }]));
    expect(noisy.truncated).toBe(true);
    expect(Buffer.byteLength(noisy.output)).toBeLessThanOrEqual(32768);
    const repeated = await page.evaluate(async (p) => { const q = window.__BYTEBOUND_QA__; const first = q.run(p), second = q.run(p); return Promise.all([first, second]); }, payload('print(2)'));
    expect(repeated[0].ok).toBe(true);
    expect(repeated[1].error.type).toBe('Busy');
});
test('mobile editor, specific feedback, hints, and idempotent rewards', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await boot(page);
    await page.locator('[data-action="continue"]').click();
    await expect(page.locator('.cm-editor')).toBeVisible();
    await page.locator('.cm-content').fill('');
    await page.locator('[data-action="run"]').click();
    await expect(page.locator('#run-output')).toContainText('A first line');
    await page.locator('.cm-content').fill('print("Hello, Pip!")');
    await page.locator('[data-action="run"]').click();
    await page.waitForTimeout(10000); console.log('DIAG', JSON.stringify(await page.locator('#run-output').innerText()), await page.evaluate(() => window.__BYTEBOUND_QA__.getRunnerStatus()));
    await expect(page.locator('#next-step')).toBeVisible({ timeout: 120000 });
    const before = await page.evaluate(() => window.__BYTEBOUND_QA__.getState().xp);
    await page.locator('[data-action="run"]').click();
    await expect(page.locator('[data-action="run"]')).toBeEnabled();
    expect(await page.evaluate(() => window.__BYTEBOUND_QA__.getState().xp)).toBe(before);
    await page.locator('[data-action="next"]').click();
    for (let n = 0; n < 3; n++)
        await page.locator('[data-action="hint"]').click();
    await expect(page.locator('[data-action="use-solution"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('corrupt import fails safely, valid import works, and reset clears progress', async ({ page }) => {
    await boot(page, '/#settings');
    await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    await expect(page.locator('#toast-root')).toContainText('Import rejected');
    const saved = await page.evaluate(() => window.__BYTEBOUND_QA__.getState());
    saved.xp = 123;
    await page.locator('#import-file').setInputFiles({ name: 'progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
    await page.locator('#confirm-import').click();
    await expect.poll(() => page.evaluate(() => window.__BYTEBOUND_QA__.getState().xp)).toBe(123);
    await page.goto('/#settings');
    await page.locator('[data-action="reset"]').click();
    await page.locator('#reset-confirm').fill('RESET');
    await page.locator('[data-action="confirm-reset"]').click();
    expect(await page.evaluate(() => window.__BYTEBOUND_QA__.getState().xp)).toBe(0);
});
test('complete offline pack survives reload and unseen scientific packages', async ({ page, context }) => {
    test.setTimeout(300000);
    await boot(page);
    await offlineReady(page);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => !!window.__BYTEBOUND_QA__);
    await ready(page);
    const catalog = await page.evaluate(() => window.__BYTEBOUND_QA__.catalog);
    const c = catalog.lessons[27].challenges.find(c => c.packages.includes('matplotlib'));
    expect(c).toBeTruthy();
    const result = await page.evaluate(async (c) => window.__BYTEBOUND_QA__.run(window.__BYTEBOUND_QA__.makeSubmission(c, window.__BYTEBOUND_QA__.referenceValue(c))), c);
    expect(result.ok).toBe(true);
    expect(result.plots.length).toBeGreaterThan(0);
    expect((await run(page, payload('while True:\n    pass'))).error.type).toBe('Timeout');
    expect((await run(page, payload('print(2)'))).ok).toBe(true);
    await context.setOffline(false);
});
test('interrupted offline preparation resumes without declaring premature readiness', async ({ page, context }) => {
    test.setTimeout(300000);
    await context.route('**/pyodide/*', route => route.abort());
    await boot(page, '/#settings');
    await page.waitForTimeout(1500);
    await expect(page.locator('#offline-status')).not.toContainText('Ready offline');
    await context.unroute('**/pyodide/*');
    await page.locator('[data-action="prepare-offline"]').click();
    await offlineReady(page);
});
test('WebGL unavailable still permits editing and solving', async ({ page }) => {
    await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...args) { if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')
        return null; return original.call(this, type, ...args); }; });
    await boot(page);
    await expect(page.locator('#scene-mode')).toContainText('2D');
    await page.locator('[data-action="continue"]').click();
    await expect(page.locator('.cm-editor')).toBeVisible();
    expect((await run(page, payload('print(2)'))).ok).toBe(true);
});
test('quality modes, reduced motion, editor focus, and viewport layouts', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page, '/#settings');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    await page.locator('#setting-quality').selectOption('battery');
    await page.goto('/#home');
    await expect(page.locator('html')).toHaveAttribute('data-quality', 'battery');
    await expect(page.locator('canvas')).toHaveCount(0);
    for (const [width, height] of [[390, 844], [820, 1180], [1440, 1000]]) {
        await page.setViewportSize({ width, height });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `qa/production-${width}.png`, fullPage: true });
    }
    await page.goto('/#settings');
    await page.locator('#setting-quality').selectOption('low');
    await page.goto('/#home');
    await expect(page.locator('html')).toHaveAttribute('data-quality', 'low');
});
test('same-origin runtime requests and repository-subpath deployment', async ({ page }) => {
    const external = [];
    page.on('request', r => { const url = new URL(r.url()); if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin)
        external.push(r.url()); });
    await boot(page, '/bytebound/');
    await ready(page);
    expect((await run(page, payload('print(2)'))).ok).toBe(true);
    await offlineReady(page);
    expect(external).toEqual([]);
});
test('accessible interface on main screens', async ({ page }) => {
    for (const route of ['/#home', '/#map', '/#settings', '/#profile']) {
        await boot(page, route);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        await fs.writeFile(`qa/accessibility-${route.split('#')[1]}.json`, JSON.stringify(results, null, 2));
        expect(results.violations.filter(v => ['critical', 'serious'].includes(v.impact))).toEqual([]);
    }
});
test('production performance diagnostics and scene resource stability', async ({ page }) => {
    await boot(page);
    const interactive = await page.evaluate(() => performance.getEntriesByName('bytebound-interactive')[0]?.startTime);
    await page.waitForTimeout(4000);
    const home = await page.evaluate(() => window.__BYTEBOUND_QA__.getRenderStats());
    await page.goto('/#map');
    await page.waitForTimeout(4000);
    const map = await page.evaluate(() => window.__BYTEBOUND_QA__.getRenderStats());
    const resources = [];
    for (let n = 0; n < 6; n++) {
        await page.goto(n % 2 ? '/#home' : '/#map');
        await page.waitForTimeout(2500);
        resources.push(await page.evaluate(() => window.__BYTEBOUND_QA__.getRenderStats()));
    }
    const report = { environment: 'GitHub Actions headless Chromium; NOT physical phone measurements', interfaceReadyMs: interactive, home, map, resources, physicalPhoneFPS: 'NOT TESTED' };
    await fs.writeFile('qa/production-performance.json', JSON.stringify(report, null, 2) + '\n');
    expect(interactive).toBeLessThan(3000);
    if (resources.every(Boolean)) {
        const same = resources.filter((_, i) => i % 2 === 1);
        expect(Math.max(...same.map(s => s.geometries)) - Math.min(...same.map(s => s.geometries))).toBeLessThanOrEqual(5);
    }
});
