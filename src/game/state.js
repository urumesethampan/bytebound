export const SAVE_KEY = 'bytebound.progress.v1';
export const SAVE_VERSION = 1;
export const MAX_IMPORT_BYTES = 1000000;
export const COSMETICS = [
    { id: 'skin-mint', type: 'skin', name: 'Garden mint', color: '#c9f66b', price: 0, description: 'Pip, in its original explorer colors.' },
    { id: 'skin-lilac', type: 'skin', name: 'Moon orchid', color: '#baadff', price: 80, description: 'A little lunar lavender.' },
    { id: 'skin-peach', type: 'skin', name: 'Solar peach', color: '#ffb68a', price: 80, description: 'Warm light for faraway journeys.' },
    { id: 'skin-ice', type: 'skin', name: 'Glacier blue', color: '#86dce4', price: 120, description: 'A calm little science assistant.' },
    { id: 'decor-garden', type: 'decoration', name: 'Wild garden', price: 0, description: 'A cluster of procedural trees.' },
    { id: 'decor-beacon', type: 'decoration', name: 'Signal beacon', price: 60, description: 'A glowing tower on your island.' },
    { id: 'decor-rings', type: 'decoration', name: 'Orbital rings', price: 100, description: 'A small observatory, just for you.' },
    { id: 'theme-obsidian', type: 'palette', name: 'Obsidian', price: 0, description: 'The original midnight-and-lime palette.' },
    { id: 'theme-aurora', type: 'palette', name: 'Aurora', price: 150, description: 'A soft cyan accent for the archipelago.' }
];
export function localDay(now = Date.now(), zone = 'Asia/Kolkata') {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
    const get = type => parts.find(p => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
}
export function dayDistance(a, b) { return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000); }
export function newState(now = Date.now()) {
    return {
        version: 1, revision: 0, createdAt: now, updatedAt: now,
        xp: 0, coins: 0, streak: 0, bestStreak: 0, freezes: 1, lastDay: null,
        combo: 0, bestCombo: 0, activeSeconds: 0,
        completed: [], records: {}, concepts: {}, drafts: {}, badges: [],
        owned: ['skin-mint', 'decor-garden', 'theme-obsidian'],
        equipped: { skin: 'skin-mint', decoration: 'decor-garden', palette: 'theme-obsidian' },
        settings: { theme: 'dark', quality: 'auto', fontSize: 16, sound: false, haptics: true, calmRewards: false, motion: 'system', colorBlind: false, focusMinutes: 25, timeZone: 'Asia/Kolkata' },
        quest: { day: localDay(now), mission: 0, review: 0, bugs: 0, claimed: false },
        lastMission: 'd01', lastChallenge: 0
    };
}
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const num = (v, max = 100000000) => Number.isSafeInteger(v) && v >= 0 && v <= max;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
function assert(condition, message) { if (!condition)
    throw new Error(message); }
function keysOnly(obj, keys, context) {
    assert(plain(obj), `${context} must be an object.`);
    for (const key of Object.keys(obj))
        assert(keys.includes(key), `${context} contains an unsupported field.`);
    for (const key of keys)
        assert(Object.hasOwn(obj, key), `${context} is missing ${key}.`);
}
function safeArray(v, allowed, max) { return Array.isArray(v) && v.length <= max && new Set(v).size === v.length && v.every(x => allowed.has(x)); }
/** Full allow-list validation. No import data is executed or merged into prototypes. */
export function validateState(value, catalog) {
    const shape = newState();
    keysOnly(value, Object.keys(shape), 'Save');
    assert(value.version === SAVE_VERSION, 'This save version is not supported. Keep the file and use a matching app version.');
    const ids = new Set(catalog.lessons.map(l => l.id));
    const challengeIds = new Set(catalog.lessons.flatMap(l => l.challenges.map(c => c.id)));
    const topics = new Set(catalog.lessons.map(l => l.topic));
    const cosmeticIds = new Set(COSMETICS.map(c => c.id));
    const badgeIds = new Set(['first-spark', 'three-days', 'seven-days', 'first-review', 'bug-hunter', 'perfect-five', 'rare-prism', 'world-1', 'world-2', 'world-3', 'world-4', 'world-5', 'data-wizard']);
    for (const key of ['revision', 'createdAt', 'updatedAt', 'xp', 'coins', 'streak', 'bestStreak', 'freezes', 'combo', 'bestCombo', 'activeSeconds', 'lastChallenge']) {
        assert(num(value[key], ['createdAt', 'updatedAt'].includes(key) ? 9e15 : 1e8), `Invalid ${key}.`);
    }
    assert(value.lastChallenge < (catalog.lessons.find(l => l.id === value.lastMission)?.challenges.length || 0) && value.freezes <= 2, 'Invalid checkpoint or freeze count.');
    assert(value.lastDay === null || date(value.lastDay), 'Invalid streak date.');
    assert(ids.has(value.lastMission), 'Unknown mission checkpoint.');
    assert(safeArray(value.completed, ids, catalog.lessons.length), 'Invalid completed-mission list.');
    assert(safeArray(value.owned, cosmeticIds, 20), 'Unknown cosmetic.');
    assert(safeArray(value.badges, badgeIds, 20), 'Unknown badge.');
    keysOnly(value.equipped, ['skin', 'decoration', 'palette'], 'Equipped cosmetics');
    for (const type of ['skin', 'decoration', 'palette'])
        assert(value.owned.includes(value.equipped[type]) && COSMETICS.some(c => c.id === value.equipped[type] && c.type === type), 'Equipped cosmetic must be owned and have the correct type.');
    keysOnly(value.settings, Object.keys(shape.settings), 'Settings');
    assert(['dark', 'light'].includes(value.settings.theme), 'Invalid theme.');
    assert(['auto', 'low', 'medium', 'high', 'battery'].includes(value.settings.quality), 'Invalid quality.');
    assert(['system', 'reduce'].includes(value.settings.motion), 'Invalid motion preference.');
    assert(num(value.settings.fontSize, 24) && value.settings.fontSize >= 14, 'Font size must be 14-24.');
    assert(num(value.settings.focusMinutes, 60) && value.settings.focusMinutes >= 5, 'Focus duration must be 5-60 minutes.');
    for (const k of ['sound', 'haptics', 'calmRewards', 'colorBlind'])
        assert(typeof value.settings[k] === 'boolean', `Invalid ${k}.`);
    assert(typeof value.settings.timeZone === 'string' && value.settings.timeZone.length < 80, 'Invalid time zone.');
    try {
        localDay(Date.now(), value.settings.timeZone);
    }
    catch {
        throw new Error('Unknown time zone.');
    }
    keysOnly(value.quest, ['day', 'mission', 'review', 'bugs', 'claimed'], 'Daily quest');
    assert(date(value.quest.day) && ['mission', 'review', 'bugs'].every(k => num(value.quest[k], 10000)) && typeof value.quest.claimed === 'boolean', 'Invalid quest data.');
    for (const field of ['records', 'concepts', 'drafts'])
        assert(plain(value[field]), `Invalid ${field}.`);
    assert(Object.keys(value.records).length <= challengeIds.size && Object.keys(value.drafts).length <= challengeIds.size, 'Too many challenge records.');
    for (const [id, r] of Object.entries(value.records)) {
        assert(challengeIds.has(id), 'Unknown challenge.');
        keysOnly(r, ['attempts', 'correct', 'solved', 'firstCorrect', 'hints', 'lastReviewDay'], 'Challenge record');
        assert(num(r.attempts, 1e6) && num(r.correct, 1e6) && r.correct <= r.attempts && num(r.hints, 3), 'Invalid challenge performance.');
        assert(typeof r.solved === 'boolean' && typeof r.firstCorrect === 'boolean', 'Invalid completion flags.');
        assert(!r.solved || r.correct > 0, 'Solved challenges need a correct attempt.');
        assert(r.lastReviewDay === null || date(r.lastReviewDay), 'Invalid review date.');
    }
    for (const [id, text] of Object.entries(value.drafts))
        assert(challengeIds.has(id) && typeof text === 'string' && text.length <= 50000, 'Invalid saved code.');
    for (const [topic, r] of Object.entries(value.concepts)) {
        assert(topics.has(topic), 'Unknown concept.');
        keysOnly(r, ['correct', 'wrong', 'independentDays', 'interval', 'dueDay'], 'Concept record');
        assert(num(r.correct, 1e6) && num(r.wrong, 1e6) && num(r.interval, 4), 'Invalid mastery counts.');
        assert(Array.isArray(r.independentDays) && r.independentDays.length <= 365 && r.independentDays.every(date) && new Set(r.independentDays).size === r.independentDays.length, 'Invalid mastery dates.');
        assert(date(r.dueDay), 'Invalid due date.');
    }
    for (const id of value.completed) {
        const l = catalog.lessons.find(l => l.id === id);
        assert(l.challenges.every(c => value.records[c.id]?.solved), 'Completed mission has unfinished challenges.');
    }
    return structuredClone(value);
}
export function parseImport(text, catalog) {
    assert(typeof text === 'string' && new TextEncoder().encode(text).length <= MAX_IMPORT_BYTES, 'The progress file is too large (limit: 1 MB).');
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        throw new Error('This is not valid JSON. Your current progress has not changed.');
    }
    return validateState(data, catalog);
}
export function levelFor(xp) {
    const levels = [{ at: 0, title: 'Script Kiddie' }, { at: 400, title: 'Signal Seeker' }, { at: 1200, title: 'Pythonista' }, { at: 2600, title: 'Pattern Maker' }, { at: 4400, title: 'Data Navigator' }, { at: 6500, title: 'Data Wizard' }];
    let i = 0;
    while (i + 1 < levels.length && xp >= levels[i + 1].at)
        i++;
    return { level: i + 1, ...levels[i], next: levels[i + 1]?.at || levels[i].at + 2000 };
}
export function nextMission(state, catalog) { return catalog.lessons.find(l => !state.completed.includes(l.id)) || catalog.lessons.at(-1); }
export function unlocked(state, lesson) { return lesson.prerequisites.every(id => state.completed.includes(id)); }
export function mastery(record) {
    if (!record)
        return 0;
    const accuracy = record.correct / Math.max(1, record.correct + record.wrong);
    return Math.round(Math.min(1, record.independentDays.length / 3) * 60 + accuracy * 40);
}
export function mastered(record) { return !!record && record.independentDays.length >= 2 && record.correct / Math.max(1, record.correct + record.wrong) >= 0.7; }
export function dueChallenges(state, catalog, now = Date.now()) {
    const day = localDay(now, state.settings.timeZone);
    return catalog.lessons.flatMap(l => l.challenges.map(c => ({ ...c, lessonId: l.id, world: l.world }))).filter(c => {
        const record = state.records[c.id], concept = state.concepts[c.conceptTags[0]];
        return record && concept && concept.dueDay <= day && record.lastReviewDay !== day;
    }).sort((a, b) => {
        const ra = state.records[a.id], rb = state.records[b.id];
        return (rb.attempts - rb.correct) - (ra.attempts - ra.correct);
    });
}
