/** The UI and browser test suite use this exact conversion. */
export function makeSubmission(challenge, value, inputs) {
    const c = challenge;
    let code = value;
    if (c.type === 'predict')
        code = c.source;
    if (c.type === 'fill')
        code = c.template.replace('___', value);
    if (c.type === 'reorder')
        code = Array.isArray(value) ? value.join('\n') : value;
    return {
        code, kind: c.type, answer: c.type === 'predict' ? value : undefined,
        tests: c.tests, inputs: inputs ?? c.inputs ?? [], packages: c.packages ?? []
    };
}
export function referenceValue(c) {
    return c.type === 'reorder' ? c.solution.split('\n') : c.solution;
}
