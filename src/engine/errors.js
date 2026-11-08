/** Explanations never replace the original traceback. */
export const explanations = {
    NameError: 'Python cannot find that name. Check its spelling, capital letters, and whether you created it before using it.',
    SyntaxError: 'Python could not read this instruction. Check quotes, brackets, and the colon after if, for, while, or def.',
    IndentationError: 'The spacing changes the meaning. Use four spaces for the body of a loop, condition, or function.',
    TabError: 'Tabs and spaces were mixed. Use the editor indentation buttons to keep four spaces consistently.',
    TypeError: 'These kinds of values do not work together in this operation. Check whether you have text, a number, or a collection.',
    KeyError: 'That dictionary key or DataFrame column is missing. Check the exact spelling and available keys.',
    ZeroDivisionError: 'The denominator is zero. Check it before dividing, or decide what an empty group should return.',
    IndexError: 'That position is outside the collection. Positions start at zero; the last is length minus one.',
    ValueError: 'The value has the right general type but cannot be used here. For example, int("hello") cannot create a number.',
    EOFError: 'Your program requested another input. Add a line in Program inputs, then run again.',
    ModuleNotFoundError: 'That package is not in the offline learning kit. The kit includes the standard library, pandas, NumPy, and matplotlib.',
    PermissionError: 'That operation is outside this private learning sandbox. Use the bundled virtual files rather than network access.',
    MemoryError: 'This program requested too much memory. Try a smaller collection and restart Python.',
    Timeout: 'That run reached the five-second limit. Python has restarted; your code is safe. Check that your loop makes progress.'
};
export function explain(error) {
    if (!error)
        return '';
    return explanations[error.type] || 'Read the final line of the error first, then inspect the highlighted instruction.';
}
