"""Execute the SAME Python grader as production, using native CPython.
This does NOT verify Pyodide/worker/browser compatibility; that is a separate gate.
"""
import importlib.util
import json
import os
from pathlib import Path
import signal
import sys
import time
ROOT=Path(__file__).resolve().parents[1]
os.environ['MPLBACKEND']='Agg'
import pandas
import matplotlib.pyplot as plt
spec=importlib.util.spec_from_file_location('grader',ROOT/'public/grader.py')
grader=importlib.util.module_from_spec(spec);spec.loader.exec_module(grader)
content=json.loads((ROOT/'public/lessons.json').read_text())
os.chdir(ROOT/'public/data')
def timeout(signum,frame): raise TimeoutError('Native QA guard interrupted an intentional infinite loop.')
signal.signal(signal.SIGALRM,timeout)
def payload(c,value):
 code=value
 if c['type']=='predict': code=c['source']
 if c['type']=='fill': code=c['template'].replace('___',value)
 return {'code':code,'kind':c['type'],'answer':value,'tests':c['tests'],'inputs':c['inputs'],'packages':c['packages']}
def run(p):
 signal.setitimer(signal.ITIMER_REAL,2)
 try: return grader.grade_submission(p)
 finally: signal.setitimer(signal.ITIMER_REAL,0)
report={'runtime':sys.version,'environment':'Native CPython; not a Pyodide/browser result','pandas':pandas.__version__,'reference':[],'negative':[]}
for l in content['lessons']:
 for c in l['challenges']:
  result=run(payload(c,c['solution']))
  report['reference'].append({'id':c['id'],'pass':bool(result['ok']),'errors':[] if result['ok'] else result})
  for i,wrong in enumerate(c['wrongAnswers']):
   res=run(payload(c,wrong))
   report['negative'].append({'id':c['id'],'fixture':i+1,'rejected':not res['ok'],'error':res.get('error',{}).get('type') if res.get('error') else None})
refs=sum(r['pass'] for r in report['reference']); neg=sum(r['rejected'] for r in report['negative'])
report['totals']={'referencePassed':refs,'referenceTotal':len(report['reference']),'negativeRejected':neg,'negativeTotal':len(report['negative'])}
(ROOT/'qa/native-reference-results.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report['totals'],indent=2))
for r in report['reference']:
 if not r['pass']: print('FAIL REFERENCE',r['id'],json.dumps(r['errors'])[:3000])
for r in report['negative']:
 if not r['rejected']: print('FAIL NEGATIVE',r)
sys.exit(0 if refs==len(report['reference']) and neg==len(report['negative']) else 1)
