"""Isolated DOM checks. Python responses are STUBBED; these are not runtime tests.
The fixture avoids external libraries and navigation. This supports restricted
QA environments. Production E2E tests are separately defined in browser.spec.mjs.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time,traceback,os
ROOT=Path(__file__).resolve().parent.parent
rows=[]
def check(name,fn):
 try: fn();rows.append({'name':name,'passed':True});print('PASS',name,flush=True)
 except Exception as exc: rows.append({'name':name,'passed':False,'error':str(exc)});print('FAIL',name,exc)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 errors=[]
 def fresh(width=1440,height=1000,reduced=False):
  page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference')
  page.set_default_timeout(3000);page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content((ROOT/'.qa-fixture/index.html').read_text());page.add_script_tag(content=(ROOT/'.qa-fixture/app.js').read_text());page.wait_for_function('window.__BYTEBOUND_QA__');page.wait_for_timeout(100)
  return page
 page=fresh();start=page.evaluate("performance.getEntriesByName('bytebound-interactive')[0].startTime")
 check('Home has one dominant Continue action',lambda: page.locator('[data-action="continue"]').wait_for(state='visible'))
 page.screenshot(path=str(ROOT/'qa/home-desktop.png'),full_page=True)
 t=time.perf_counter();page.locator('[data-action="continue"]').click();page.locator('textarea[aria-label="Python code editor"]').wait_for();editor_ms=(time.perf_counter()-t)*1000
 def empty():
  page.locator('textarea[aria-label="Python code editor"]').fill('');page.locator('[data-action="run"]').click();page.get_by_text('A first line is all you need.',exact=True).wait_for()
 check('Empty program shows specific feedback',empty)
 def correct():
  page.locator('textarea[aria-label="Python code editor"]').fill('print("Hello, Pip!")');page.locator('[data-action="run"]').click();page.locator('#next-step').wait_for(state='visible');assert page.evaluate('window.__BYTEBOUND_QA__.getState().xp')>=40
 check('UI routes a stubbed success into saved rewards',correct)
 page.screenshot(path=str(ROOT/'qa/mission-desktop.png'),full_page=True)
 def next_challenge():
  page.locator('[data-action="next"]').click();assert 'Step 2 of 5' in page.locator('body').inner_text();assert 'print("Hello, Pip!")' not in (page.locator('[data-answer]').input_value() if page.locator('[data-answer]').count() else page.locator('textarea[aria-label="Python code editor"]').input_value())
 check('Next challenge does not overwrite its draft with previous code',next_challenge)
 def hint():
  for _ in range(3):page.locator('[data-action="hint"]').click()
  assert page.locator('[data-action="use-solution"]').count()==1
 check('Three-step hint ladder reveals a usable solution',hint)
 def modal():
  page.locator('[data-action="see-it"]').click();page.locator('dialog').wait_for(state='visible');page.keyboard.press('Escape');page.locator('dialog').wait_for(state='detached')
 check('Optional visualization opens and Escape closes dialog',modal)
 page.evaluate("location.hash='settings'");page.locator('#setting-quality').wait_for()
 def battery():
  page.locator('#setting-quality').select_option('battery');assert page.locator('html').get_attribute('data-quality')=='battery';page.evaluate("location.hash='home'");page.locator('[data-action="continue"]').wait_for();assert page.locator('canvas').count()==0;assert page.evaluate("getComputedStyle(document.querySelector('.hero-scene svg')).animationName")=='none'
 check('Battery Saver is static and has no canvas',battery)
 page.evaluate("location.hash='settings'");page.locator('#setting-theme').wait_for()
 def light():
  page.locator('#setting-theme').select_option('light');assert page.locator('html').get_attribute('data-theme')=='light'
 check('Light theme setting applies',light)
 def corrupt_import():
  before=page.evaluate('window.__BYTEBOUND_QA__.getState().xp');page.locator('#import-file').set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{bad'});page.get_by_text('Import rejected:',exact=False).first.wait_for();assert page.evaluate('window.__BYTEBOUND_QA__.getState().xp')==before
 check('Corrupted import preserves existing progress',corrupt_import)
 def reset():
  page.locator('[data-action="reset"]').click();page.locator('#reset-confirm').fill('RESET');page.locator('[data-action="confirm-reset"]').click();page.locator('[data-action="continue"]').wait_for();assert page.evaluate('window.__BYTEBOUND_QA__.getState().xp')==0
 check('Confirmed reset clears saved progress',reset)
 def five():
  page.locator('[data-action="five-minute"]').first.click();page.locator('textarea[aria-label="Python code editor"]').fill('print("Hello, Pip!")');page.locator('[data-action="run"]').click();page.locator('#next-step').wait_for(state='visible');page.locator('[data-action="next"]').click();page.wait_for_function("location.hash==='#summary'")
 check('Five-Minute Mode ends after one correct step',five)
 for width,height,label in [(390,844,'phone'),(820,1180,'tablet')]:
  mobile=fresh(width,height)
  def no_overflow(m=mobile):assert m.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Horizontal overflow'
  check(label+' home has no horizontal overflow',no_overflow);mobile.screenshot(path=str(ROOT/f'qa/home-{label}.png'),full_page=True)
  mobile.locator('[data-action="continue"]').click();mobile.locator('textarea[aria-label="Python code editor"]').wait_for();check(label+' mission has no horizontal overflow',no_overflow);mobile.screenshot(path=str(ROOT/f'qa/mission-{label}.png'),full_page=True)
  def run_accessible(m=mobile):
   assert m.evaluate('''() => {const b=document.getElementById('run-button'),r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&b.contains(hit);}'''), 'Run button is obscured or outside the viewport'
  check(label+' Run control is visible and unobscured',run_accessible)
  mobile.close()
 reduced=fresh(390,844,True)
 check('Device reduced-motion preference applies',lambda: (_ for _ in ()).throw(AssertionError('Motion not reduced')) if reduced.locator('html').get_attribute('data-motion')!='reduce' else None)
 check('No uncaught JavaScript errors in DOM fixture',lambda: (_ for _ in ()).throw(AssertionError(str(errors))) if errors else None)
 browser.close()
report={'environment':'Headless Chromium; isolated in-memory DOM fixture; fake worker responses; system fonts; no Three.js/CodeMirror/Pyodide/service worker','passed':sum(r['passed'] for r in rows),'total':len(rows),'results':rows,'measurements':{'fixtureDocumentToInteractiveMs':round(start,1),'continueToFallbackEditorMs':round(editor_ms,1)},'productionPerformanceClaim':False}
(ROOT/'qa/ui-fixture-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));raise SystemExit(0 if all(r['passed'] for r in rows) else 1)
