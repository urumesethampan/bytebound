import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests', testMatch: 'browser.spec.mjs', fullyParallel: false, workers: 1,
    timeout: 180000, expect: { timeout: 12000 }, retries: 0,
    reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'qa/production-browser-results.json' }]],
    use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
    webServer: { command: 'node scripts/serve-dist.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 30000 }
});
