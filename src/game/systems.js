import { localDay, dayDistance, levelFor, COSMETICS } from './state.js';
function addDays(day, n) { return new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
export function ensureQuest(state, now = Date.now()) {
    const day = localDay(now, state.settings.timeZone);
    if (state.quest.day !== day)
        state.quest = { day, mission: 0, review: 0, bugs: 0, claimed: false };
}
export function recordAttempt(previous, challenge, passed, { hints = 0, review = false, now = Date.now(), rng = Math.random } = {}) {
    const s = structuredClone(previous);
    const effects = { xp: 0, coins: 0, chest: false, rare: false, levelUp: false, comeback: false, newBadges: [] };
    const badge = id => { if (!s.badges.includes(id)) {
        s.badges.push(id);
        effects.newBadges.push(id);
    } };
    const day = localDay(now, s.settings.timeZone);
    ensureQuest(s, now);
    const old = s.records[challenge.id];
    const r = old || { attempts: 0, correct: 0, solved: false, firstCorrect: false, hints: 0, lastReviewDay: null };
    const wasSolved = r.solved;
    r.attempts++;
    r.hints = Math.max(r.hints, hints);
    const first = r.attempts === 1;
    const topic = challenge.conceptTags[0];
    const concept = s.concepts[topic] || { correct: 0, wrong: 0, independentDays: [], interval: 0, dueDay: day };
    if (passed) {
        r.correct++;
        r.solved = true;
        if (first)
            r.firstCorrect = true;
        concept.correct++;
        if (hints === 0) {
            if (!concept.independentDays.includes(day))
                concept.independentDays.push(day);
            concept.independentDays = concept.independentDays.slice(-365);
            if (review && r.lastReviewDay !== day)
                concept.interval = Math.min(4, concept.interval + 1);
            concept.dueDay = addDays(day, [1, 3, 7, 14, 30][concept.interval]);
        }
        else {
            concept.interval = 0;
            concept.dueDay = addDays(day, 1);
        }
        if (s.lastDay !== day) {
            const gap = s.lastDay ? dayDistance(s.lastDay, day) : 1;
            if (gap === 1)
                s.streak++;
            else if (gap === 2 && s.freezes > 0) {
                s.freezes--;
                s.streak++;
            }
            else if (gap > 1) {
                s.streak = 1;
                effects.comeback = true;
                effects.xp += 15;
            }
            else if (!s.lastDay)
                s.streak = 1;
            // A backwards device clock never consumes freezes or multiplies a streak.
            if (gap > 0 || !s.lastDay)
                s.lastDay = day;
            s.bestStreak = Math.max(s.bestStreak, s.streak);
            if (gap > 0 && s.streak > 0 && s.streak % 7 === 0)
                s.freezes = Math.min(2, s.freezes + 1);
        }
        if (!wasSolved) {
            s.combo = first && hints === 0 ? s.combo + 1 : 0;
            s.bestCombo = Math.max(s.bestCombo, s.combo);
            effects.xp += 40 + Math.max(0, 10 - hints * 3) + (first && hints === 0 ? 5 : 0);
            if (s.combo > 0 && s.combo % 3 === 0)
                effects.xp += 10;
            effects.coins += 8;
            s.quest.mission++;
            if (challenge.aiAudit || challenge.type === 'debug')
                s.quest.bugs++;
            if (rng() < 0.2) {
                effects.chest = true;
                effects.coins += 12;
            }
            if (rng() < 0.04) {
                effects.rare = true;
                badge('rare-prism');
            }
            badge('first-spark');
            if (s.combo >= 5)
                badge('perfect-five');
        }
        else if (review && r.lastReviewDay !== day) {
            effects.xp += 15;
            effects.coins += 2;
        }
        if (review && r.lastReviewDay !== day) {
            s.quest.review++;
            s.quest.mission++;
            if (challenge.aiAudit || challenge.type === 'debug')
                s.quest.bugs++;
            r.lastReviewDay = day;
            badge('first-review');
        }
        if (s.streak >= 3)
            badge('three-days');
        if (s.streak >= 7)
            badge('seven-days');
        if (Object.values(s.records).filter(x => x.solved).length >= 20 && challenge.aiAudit)
            badge('bug-hunter');
    }
    else {
        s.combo = 0;
        concept.wrong++;
        concept.interval = 0;
        concept.dueDay = day;
    }
    s.records[challenge.id] = r;
    s.concepts[topic] = concept;
    if (!s.quest.claimed && s.quest.mission >= 1 && s.quest.review >= 1 && s.quest.bugs >= 1) {
        s.quest.claimed = true;
        effects.xp += 35;
        effects.coins += 10;
    }
    const oldLevel = levelFor(s.xp).level;
    s.xp += effects.xp;
    s.coins += effects.coins;
    effects.levelUp = levelFor(s.xp).level > oldLevel;
    s.updatedAt = now;
    s.revision++;
    return { state: s, effects };
}
export function completeMission(previous, lesson, now = Date.now()) {
    const s = structuredClone(previous);
    if (s.completed.includes(lesson.id) || !lesson.challenges.every(c => s.records[c.id]?.solved))
        return s;
    s.completed.push(lesson.id);
    if (lesson.boss) {
        s.xp += 100;
        s.coins += 30;
        const id = `world-${lesson.world}`;
        if (!s.badges.includes(id))
            s.badges.push(id);
    }
    if (lesson.day === 30 && !s.badges.includes('data-wizard'))
        s.badges.push('data-wizard');
    s.updatedAt = now;
    s.revision++;
    return s;
}
export function buyOrEquip(previous, id) {
    const item = COSMETICS.find(c => c.id === id);
    if (!item)
        throw new Error('Unknown cosmetic.');
    const s = structuredClone(previous);
    if (!s.owned.includes(id)) {
        if (s.coins < item.price)
            throw new Error('Keep exploring; this cosmetic will still be here.');
        s.coins -= item.price;
        s.owned.push(id);
    }
    s.equipped[item.type] = id;
    s.revision++;
    return s;
}
