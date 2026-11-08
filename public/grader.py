"""Production grader, shared by browser execution and the native reference suite.

This is a teaching sandbox, not a hostile-code security boundary. Do not execute
untrusted programs. Network restrictions are also enforced by the worker and CSP.
"""
import ast
import builtins
import contextlib
import io
import json
import math
import traceback

MAX_OUTPUT = 32768
MAX_LINES = 300
ALLOWED_IMPORTS = {
    'math', 'statistics', 'csv', 'io', 'json', 'random', 'collections',
    'itertools', 'functools', 'datetime', 're', 'decimal', 'fractions',
    'pandas', 'numpy', 'matplotlib'
}

class BoundedOutput(io.TextIOBase):
    def __init__(self):
        self.parts = []
        self.size = 0
        self.lines = 0
        self.truncated = False
    def write(self, value):
        text = str(value)
        length = len(text)
        if self.truncated:
            return length
        encoded = text.encode('utf-8', errors='replace')
        remaining = max(0, MAX_OUTPUT - self.size)
        keep = encoded[:remaining].decode('utf-8', errors='ignore')
        lines = keep.splitlines(keepends=True)
        if self.lines + len(lines) > MAX_LINES:
            keep = ''.join(lines[:max(0, MAX_LINES-self.lines)])
        self.parts.append(keep)
        self.size += len(keep.encode('utf-8'))
        self.lines += keep.count('\n')
        if len(encoded) > remaining or self.lines >= MAX_LINES:
            self.truncated = True
        return length
    def flush(self):
        return None
    def getvalue(self):
        return ''.join(self.parts)


def validate_program(code):
    tree = ast.parse(code, filename='<mission>')
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names = [alias.name.split('.')[0] for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            names = [(node.module or '').split('.')[0]]
        else:
            names = []
        for name in names:
            if name not in ALLOWED_IMPORTS:
                raise PermissionError(f'Import {name!r} is not available in this offline learning kit.')
        if isinstance(node, ast.Name) and node.id in {'__import__', 'eval', 'exec', 'compile', 'globals', 'locals', 'breakpoint'}:
            raise PermissionError(f'{node.id} is outside the fundamentals sandbox.')
        if isinstance(node, ast.Attribute) and node.attr.startswith('__'):
            raise PermissionError('Private interpreter attributes are outside the learning sandbox.')
    return tree


def grade_submission(payload, capture_plots=True):
    """Return only JSON-compatible data; one fresh namespace per run."""
    code = payload.get('code', '')
    if not isinstance(code, str) or not code.strip():
        return {'ok': False, 'output': '', 'checks': [], 'plots': [],
                'error': {'type': 'EmptyInput', 'message': 'Add a line of Python before running.', 'traceback': ''}}
    if len(code) > 50000:
        return {'ok': False, 'output': '', 'checks': [], 'plots': [],
                'error': {'type': 'ValueError', 'message': 'Keep each program under 50,000 characters.', 'traceback': ''}}
    output = BoundedOutput()
    checks = []
    figures = []
    queue = iter(payload.get('inputs', []))
    def queued_input(prompt=''):
        # Input prompts are not mixed into the program-output grading stream.
        try:
            return str(next(queue))
        except StopIteration:
            raise EOFError('No more Program inputs are available.') from None
    safe_builtins = dict(vars(builtins))
    safe_builtins['input'] = queued_input
    namespace = {'__builtins__': safe_builtins, '__name__': '__main__', 'math': math}
    error = None
    try:
        tree = validate_program(code)
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            exec(compile(tree, '<mission>', 'exec'), namespace)
        namespace['__output__'] = output.getvalue().strip()
        if payload.get('kind') == 'predict':
            expected = output.getvalue().strip()
            actual = str(payload.get('answer', '')).strip()
            checks.append({'ok': actual == expected, 'message':
                'The prediction matches.' if actual == expected else
                'Trace one instruction at a time. Your prediction does not match the printed output.'})
        else:
            for check in payload.get('tests', []):
                try:
                    with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                        valid = bool(eval(check['expression'], namespace))
                    checks.append({'ok': valid, 'message': check['success'] if valid else check['message']})
                except BaseException as exc:
                    checks.append({'ok': False, 'message': check['message'], 'detail': f'{type(exc).__name__}: {exc}'})
        if capture_plots:
            import sys
            if 'matplotlib.pyplot' in sys.modules:
                import base64
                import matplotlib.pyplot as plt
                numbers = plt.get_fignums()
                for number in numbers[:2]:
                    fig = plt.figure(number)
                    fig.set_size_inches(6, 3.5)
                    data = io.BytesIO()
                    fig.savefig(data, format='png', dpi=100, bbox_inches='tight')
                    if data.tell() <= 1_000_000:
                        figures.append(base64.b64encode(data.getvalue()).decode('ascii'))
                plt.close('all')
    except BaseException as exc:
        error = {'type': type(exc).__name__, 'message': str(exc)[:1500],
                 'traceback': ''.join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-7000:]}
    finally:
        import sys
        if 'matplotlib.pyplot' in sys.modules:
            import matplotlib.pyplot as plt
            plt.close('all')
    return {'ok': error is None and bool(checks) and all(c['ok'] for c in checks),
            'output': output.getvalue(), 'truncated': output.truncated,
            'checks': checks, 'plots': figures, 'error': error}
