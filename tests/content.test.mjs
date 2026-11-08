import { validateCatalog } from '../src/engine/lesson-schema.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeSubmission, referenceValue } from '../src/engine/submission.js';
const catalog = JSON.parse(fs.readFileSync(new URL('../public/lessons.json', import.meta.url)));
test('30 missions, five worlds, 150 consistent challenges, 30 AI audits', () => {
    validateCatalog(catalog);
    assert.equal(catalog.worlds.length, 5);
    assert.ok(catalog.lessons.length >= 30);
    const all = catalog.lessons.flatMap(l => l.challenges);
    assert.ok(all.length >= 150);
    assert.equal(new Set(all.map(c => c.id)).size, all.length);
    assert.equal(all.filter(c => c.aiAudit).length, catalog.lessons.length);
    for (const l of catalog.lessons) {
        assert.ok(l.challenges.length >= 3 && l.challenges.length <= 5);
        assert.ok(l.conceptLines.length <= 5);
        assert.ok(l.story && l.example && l.takeaway);
        for (const c of l.challenges) {
            assert.equal(c.hints.length, 3);
            assert.equal(c.wrongAnswers.length, 2);
            assert.ok(c.solution);
            assert.ok(makeSubmission(c, referenceValue(c)).code);
        }
    }
});
test('all five worlds end in exactly one boss', () => assert.deepEqual(catalog.lessons.filter(l => l.boss).map(l => l.day), [6, 12, 19, 25, 30]));
test('submission converter uses source for predictions and fills only one slot', () => { const c = catalog.lessons[0].challenges[2]; assert.equal(makeSubmission(c, 'wrong').code, c.source); assert.equal(makeSubmission(c, 'wrong').answer, 'wrong'); const f = catalog.lessons[1].challenges[2]; assert.equal(makeSubmission(f, '/').code, 'share = 9 / 2\nprint(share)'); });
