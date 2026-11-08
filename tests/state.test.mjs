import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newState, parseImport, validateState, localDay, dayDistance, mastered, unlocked, nextMission } from '../src/game/state.js';
import { recordAttempt, completeMission, buyOrEquip } from '../src/game/systems.js';
const catalog = JSON.parse(fs.readFileSync(new URL('../public/lessons.json', import.meta.url)));
const c = catalog.lessons[0].challenges[0];
const now = Date.parse('2026-11-08T10:00:00Z');
test('fresh and exported state round-trip', () => { const s = newState(now); assert.deepEqual(parseImport(JSON.stringify(s), catalog), s); });
test('corrupt, oversized, unknown, prototype and incompatible imports fail', () => {
    for (const text of ['{', 'null', '[]', 'x'.repeat(1000001), JSON.stringify({ ...newState(now), version: 9 }), JSON.stringify({ ...newState(now), xp: -1 }), JSON.stringify({ ...newState(now), unexpected: true })])
        assert.throws(() => parseImport(text, catalog));
    const s = newState(now);
    s.records['__proto__'] = {};
    assert.throws(() => validateState(s, catalog));
});
test('schema rejects impossible completions and invalid settings', () => { const s = newState(now); s.completed = ['d01']; assert.throws(() => validateState(s, catalog)); s.completed = []; s.settings.fontSize = 200; assert.throws(() => validateState(s, catalog)); });
test('first success earns XP exactly once; repeated completion cannot farm coins', () => {
    const a = recordAttempt(newState(now), c, true, { now, rng: () => 1 });
    assert.equal(a.effects.xp, 55);
    const b = recordAttempt(a.state, c, true, { now, rng: () => 0 });
    assert.equal(b.effects.xp, 0);
    assert.equal(b.effects.coins, 0);
    assert.equal(b.effects.chest, false);
});
test('hints affect only bonus XP, never block completion', () => { const r = recordAttempt(newState(now), c, true, { now, hints: 3, rng: () => 1 }); assert.equal(r.state.records[c.id].solved, true); assert.equal(r.effects.xp, 41); assert.equal(r.state.concepts[c.conceptTags[0]].independentDays.length, 0); });
test('failure changes mastery and combo but never removes XP', () => { const s = newState(now); s.xp = 100; s.combo = 3; const r = recordAttempt(s, c, false, { now }); assert.equal(r.state.xp, 100); assert.equal(r.state.combo, 0); assert.equal(r.state.concepts[c.conceptTags[0]].wrong, 1); });
test('one missed day consumes one freeze; comeback does not shame or remove XP', () => {
    let s = recordAttempt(newState(now), c, true, { now, rng: () => 1 }).state;
    s = recordAttempt(s, c, true, { now: now + 2 * 86400000, rng: () => 1 }).state;
    assert.equal(s.streak, 2);
    assert.equal(s.freezes, 0);
    const r = recordAttempt(s, c, true, { now: now + 6 * 86400000, rng: () => 1 });
    assert.equal(r.state.streak, 1);
    assert.equal(r.effects.comeback, true);
});
test('review pays once per challenge per day', () => { let s = recordAttempt(newState(now), c, true, { now, rng: () => 1 }).state; let r = recordAttempt(s, c, true, { review: true, now, rng: () => 1 }); assert.equal(r.effects.xp, 15); r = recordAttempt(r.state, c, true, { review: true, now, rng: () => 1 }); assert.equal(r.effects.xp, 0); });
test('mastery requires independent retrieval on distinct days', () => { let s = newState(now); s = recordAttempt(s, c, true, { now, rng: () => 1 }).state; assert.equal(mastered(s.concepts[c.conceptTags[0]]), false); s = recordAttempt(s, c, true, { now: now + 86400000, review: true, rng: () => 1 }).state; assert.equal(mastered(s.concepts[c.conceptTags[0]]), true); });
test('cosmetics are validated, affordable, and purchased only once', () => { const s = newState(now); assert.throws(() => buyOrEquip(s, 'skin-lilac')); s.coins = 100; const a = buyOrEquip(s, 'skin-lilac'); assert.equal(a.coins, 20); assert.equal(buyOrEquip(a, 'skin-lilac').coins, 20); });
test('unlock and completion require all five challenges', () => { let s = newState(now); assert.equal(unlocked(s, catalog.lessons[1]), false); assert.equal(completeMission(s, catalog.lessons[0]).completed.length, 0); for (const ch of catalog.lessons[0].challenges)
    s = recordAttempt(s, ch, true, { now, rng: () => 1 }).state; s = completeMission(s, catalog.lessons[0], now); assert.equal(unlocked(s, catalog.lessons[1]), true); assert.equal(nextMission(s, catalog).day, 2); validateState(s, catalog); });
test('dates obey saved timezone and exact day distance', () => { assert.equal(localDay(Date.parse('2026-11-08T20:00:00Z'), 'Asia/Kolkata'), '2026-11-09'); assert.equal(dayDistance('2026-11-08', '2026-11-10'), 2); });
