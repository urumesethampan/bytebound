"""Native tests of the production grader. Not a browser/Pyodide verification."""
from pathlib import Path
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('bytebound_grader', ROOT / 'public/grader.py')
grader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(grader)
rows = []

def submit(code, expression='True', **extra):
    return grader.grade_submission({'code': code, 'tests': [{'expression': expression,
        'message': 'The expected behavior was not observed.', 'success': 'Expected behavior observed.'}], **extra})

def check(name, assertion):
    try:
        assertion()
        rows.append({'name': name, 'passed': True})
        print('PASS', name)
    except Exception as exc:
        rows.append({'name': name, 'passed': False, 'error': str(exc)})
        print('FAIL', name, exc)

def require(condition, message='Assertion failed'):
    if not condition:
        raise AssertionError(message)

for name, code in [
    ('NameError', 'print(missing_name)'),
    ('SyntaxError', 'if True print(1)'),
    ('IndentationError', 'if True:\nprint(1)'),
    ('TypeError', '1 + "2"'),
    ('KeyError', '{}["missing"]'),
    ('ZeroDivisionError', '1 / 0'),
    ('IndexError', '[1][2]'),
    ('ValueError', 'int("not a number")'),
]:
    check(name + ' retains original error and traceback',
          lambda n=name, c=code: require(submit(c)['error']['type'] == n and bool(submit(c)['error']['traceback'])))

check('Empty input is rejected', lambda: require(submit('  ')['error']['type'] == 'EmptyInput'))
check('Oversized programs are rejected', lambda: require(submit('#' * 50001)['error']['type'] == 'ValueError'))
check('Missing queued stdin is specific', lambda: require(submit('input()')['error']['type'] == 'EOFError'))
check('Queued inputs preserve value order', lambda: require(submit('x = input(); y = input()', 'x == "7" and y == "8"', inputs=['7', '8'])['ok']))
check('Huge output is bounded before transport', lambda: require((lambda r: r['ok'] and r['truncated'] and len(r['output'].encode()) <= 32768)(submit('print("x" * 100000)'))))
check('Unicode output stays valid and byte-bounded', lambda: require((lambda r: r['ok'] and r['truncated'] and len(r['output'].encode()) <= 32768)(submit('print(chr(0x1F680) * 40000)'))))
check('Output line count is bounded', lambda: require((lambda r: r['ok'] and r['truncated'] and r['output'].count('\n') <= 300)(submit('for n in range(5000):\n    print(n)'))))
check('Fresh namespace does not leak earlier variables', lambda: require(submit('earlier_value = 7')['ok'] and submit('print(earlier_value)')['error']['type'] == 'NameError'))
check('Unavailable imports produce a clear restriction', lambda: require(submit('import socket')['error']['type'] == 'PermissionError'))
check('Wrong behavior receives a specific failed check', lambda: require((lambda r: not r['ok'] and not r['checks'][0]['ok'] and r['checks'][0]['message'] == 'The expected behavior was not observed.')(submit('x = 1', 'x == 2'))))
check('Different valid implementations pass behavior tests', lambda: require(submit('x = sum([1, 2, 3])', 'x == 6')['ok'] and submit('x = 0\nfor n in [1, 2, 3]:\n    x += n', 'x == 6')['ok']))
check('Predictions are judged against executed output', lambda: require(submit('print(2)', kind='predict', answer='2')['ok'] and not submit('print(2)', kind='predict', answer='3')['ok']))

def plot_check():
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    result = submit('import matplotlib.pyplot as plt\nplt.plot([1, 2], [3, 4])', 'len(plt.gca().lines) == 1')
    require(result['ok'] and len(result['plots']) == 1 and len(result['plots'][0]) < 1400000)
    require(not plt.get_fignums(), 'Plot figures were not closed')
check('Plots are captured, bounded, and closed', plot_check)
report = {'environment': 'Native CPython; production grader; not Pyodide/browser', 'runtime': sys.version,
          'passed': sum(row['passed'] for row in rows), 'total': len(rows), 'results': rows}
(ROOT / 'qa/grader-edge-results.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'passed': report['passed'], 'total': report['total']}))
raise SystemExit(0 if report['passed'] == report['total'] else 1)
