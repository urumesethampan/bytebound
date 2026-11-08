/** Validate authored lesson modules before the app exposes any mission. */
export function validateCatalog(catalog) {
    const fail = message => { throw new Error('Lesson catalog: ' + message); };
    if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.worlds) || catalog.worlds.length !== 5 || !Array.isArray(catalog.lessons) || !catalog.lessons.length)
        fail('expected five worlds and at least one lesson.');
    const lessons = new Set(), challenges = new Set(), days = new Set();
    const text = value => typeof value === 'string' && value.trim().length > 0;
    for (const world of catalog.worlds)
        if (!Number.isInteger(world.id) || world.id < 1 || world.id > 5 || !text(world.name) || !/^#[0-9a-f]{6}$/i.test(world.color))
            fail('invalid world definition.');
    for (const lesson of catalog.lessons) {
        if (!text(lesson.id) || lessons.has(lesson.id) || !Number.isInteger(lesson.day) || lesson.day < 1 || days.has(lesson.day))
            fail('lesson IDs and days must be unique.');
        if (!Array.isArray(lesson.prerequisites) || !lesson.prerequisites.every(id => lessons.has(id)))
            fail(`${lesson.id}: prerequisites must refer to earlier lessons.`);
        if (!catalog.worlds.some(w => w.id === lesson.world) || ![lesson.title, lesson.topic, lesson.story, lesson.example, lesson.takeaway].every(text))
            fail(`${lesson.id}: missing required lesson text.`);
        if (!Array.isArray(lesson.conceptLines) || lesson.conceptLines.length < 1 || lesson.conceptLines.length > 5 || !lesson.conceptLines.every(text))
            fail(`${lesson.id}: use one to five short concept lines.`);
        if (!Array.isArray(lesson.challenges) || lesson.challenges.length < 3 || lesson.challenges.length > 5)
            fail(`${lesson.id}: use three to five challenges.`);
        lessons.add(lesson.id);
        days.add(lesson.day);
        for (const c of lesson.challenges) {
            if (!text(c.id) || challenges.has(c.id))
                fail('challenge IDs must be unique.');
            challenges.add(c.id);
            if (!['write', 'debug', 'predict', 'fill', 'reorder'].includes(c.type) || ![c.prompt, c.title, c.solution, c.explanation].every(text))
                fail(`${c.id}: missing challenge text or unsupported format.`);
            if (!Array.isArray(c.hints) || c.hints.length !== 3 || !c.hints.every(text) || !Array.isArray(c.wrongAnswers) || c.wrongAnswers.length < 2)
                fail(`${c.id}: provide three hints and at least two wrong answers.`);
            if (!Array.isArray(c.conceptTags) || c.conceptTags[0] !== lesson.topic)
                fail(`${c.id}: the first concept tag must match its lesson topic.`);
            if (!Array.isArray(c.inputs) || !c.inputs.every(x => typeof x === 'string') || !Array.isArray(c.packages) || !c.packages.every(x => ['pandas', 'numpy', 'matplotlib'].includes(x)))
                fail(`${c.id}: invalid inputs or offline packages.`);
            if (!Array.isArray(c.tests) || !c.tests.every(t => [t.expression, t.message, t.success].every(text)))
                fail(`${c.id}: tests need expression, message, and success.`);
            if (c.type !== 'predict' && !c.tests.length)
                fail(`${c.id}: provide a behavioral test.`);
            if (c.type === 'predict' && !text(c.source))
                fail(`${c.id}: missing prediction source.`);
            if (c.type === 'fill' && (!text(c.template) || c.template.split('___').length !== 2))
                fail(`${c.id}: fill templates need exactly one ___ slot.`);
            if (c.type === 'reorder' && (!Array.isArray(c.lines) || !c.lines.every(x => typeof x === 'string')))
                fail(`${c.id}: supply reorder lines.`);
        }
        if (!lesson.challenges.at(-1).aiAudit)
            fail(`${lesson.id}: finish with an AI-code audit.`);
    }
    return catalog;
}
