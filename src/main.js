import { validateCatalog } from './engine/lesson-schema.js';
import { ProgressStore } from './game/storage.js';
import { COSMETICS, levelFor, nextMission, unlocked, MAX_IMPORT_BYTES, localDay, dueChallenges } from './game/state.js';
import { recordAttempt, completeMission, buyOrEquip, ensureQuest } from './game/systems.js';
import { Feedback } from './game/audio.js';
import { PythonRunner } from './engine/runner.js';
import { makeSubmission, referenceValue } from './engine/submission.js';
import { explain } from './engine/errors.js';
import { CodeEditor } from './ui/editor.js';
import { FocusTimer } from './ui/timer.js';
import { OfflineKit } from './platform/offline.js';
import { escapeHTML as e, icon, codeBlock, pipSVG, islandSVG } from './ui/dom.js';
import * as screens from './ui/screens.js';
const base = new URL('./', document.baseURI);
const app = document.getElementById('app');
let catalog, store, feedback, runner, offline, timer, editor, manager, managerPromise;
let page = 'home', selectedWorld = 1, session = null, arena = null, epoch = 0, modal = null, modalReturn = null;
let draftTimer, pendingDraft = null, lastActivity = Date.now(), runBusy = false, runEpoch = 0, toastTimer;
let pythonStatus = 'idle', lastRuntimeMessage = '', diagnosticMode = false;
const currentLesson = () => catalog.lessons.find(l => l.id === session?.lessonId);
const currentChallenge = () => currentLesson()?.challenges[session.index];
const reduced = () => store.state.settings.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
function announce(message) { document.getElementById('announcer').textContent = message; }
function toast(message) { const root = document.getElementById('toast-root'); if (!root)
    return; root.innerHTML = `<div class="toast">${e(message)}</div>`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { root.innerHTML = ''; }, 5500); announce(message); }
function safeSave(next) { try {
    store.save(next);
    return true;
}
catch (error) {
    toast(error.message);
    return false;
} }
function applySettings() { const s = store.state.settings; document.documentElement.dataset.theme = s.theme; document.documentElement.dataset.quality = s.quality; document.documentElement.dataset.motion = reduced() ? 'reduce' : 'full'; document.documentElement.dataset.colorblind = String(s.colorBlind); document.documentElement.dataset.palette = store.state.equipped.palette; document.documentElement.style.setProperty('--code-size', s.fontSize + 'px'); }
function updateHUD() {
    const s = store.state;
    const coin = document.getElementById('coin-value');
    if (coin)
        coin.textContent = s.coins;
    const topXP = document.getElementById('top-xp');
    if (topXP)
        topXP.textContent = s.xp + ' XP';
    const xpFill = document.getElementById('xp-fill');
    if (xpFill) {
        const l = levelFor(s.xp);
        xpFill.style.width = Math.min(100, 100 * (s.xp - l.at) / (l.next - l.at)) + '%';
    }
    const xp = document.getElementById('xp-number');
    if (xp)
        xp.textContent = s.xp.toLocaleString() + ' XP';
    const warning = document.getElementById('global-warning');
    if (warning)
        warning.innerHTML = store.conflicted ? `<div class="warning-banner">Another tab saved newer progress. Reload this tab before continuing. <button data-action="reload">Reload</button></div>` : store.warning ? `<div class="warning-banner">${e(store.warning)} <button data-action="export">Export now</button></div>` : '';
}
function updateRuntime(status, message = '') {
    pythonStatus = status;
    lastRuntimeMessage = message;
    const label = document.getElementById('runtime-status');
    if (label) {
        label.innerHTML = `<i class="tiny-dot ${status === 'ready' ? 'ready' : ''}"></i> ${e(status === 'ready' ? 'Python ready' : status === 'running' ? 'Running your program' : status === 'error' ? 'Python needs setup' : status === 'packages' ? 'Warming science toolkit' : 'Python is warming up')}`;
        label.title = message;
    }
    const retry = document.getElementById('retry-python');
    if (retry)
        retry.hidden = status !== 'error';
    const busy = document.getElementById('run-loading');
    if (busy)
        busy.querySelector('p').textContent = message || 'Preparing Python...';
}
function scheduleDraft(id, value) { pendingDraft = { id, value }; clearTimeout(draftTimer); draftTimer = setTimeout(flushDraft, 400); }
function flushDraft() { clearTimeout(draftTimer); if (!pendingDraft || !store)
    return; const { id, value } = pendingDraft; pendingDraft = null; const next = structuredClone(store.state); next.drafts[id] = value.slice(0, 50000); safeSave(next); }
function captureSession() { if (!session || page !== 'mission')
    return; const c = currentChallenge(); if (!c)
    return; if (editor)
    session.value = editor.getValue();
else if (document.querySelector('[data-answer]'))
    session.value = document.querySelector('[data-answer]').value; const inputs = document.getElementById('program-inputs'); if (inputs)
    session.inputs = inputs.value.split('\n'); }
function makeSession(lesson, index = 0, { mode = 'normal', review = false } = {}) {
    const c = lesson.challenges[index], r = store.state.records[c.id];
    return { lessonId: lesson.id, index, mode, review, hints: review ? 0 : r?.hints || 0, attempts: 0, correct: 0, xp: 0, coins: 0, result: null,
        battleCleared: store.state.completed.includes(lesson.id) ? [] : lesson.challenges.filter(ch => store.state.records[ch.id]?.solved).map(ch => ch.id),
        value: review ? (c.starterCode || '') : (store.state.drafts[c.id] ?? c.starterCode ?? ''), order: [...(c.lines || [])], inputs: [...c.inputs], started: Date.now(), justPassed: false };
}
function moveToChallenge(index) {
    const l = currentLesson();
    const old = session;
    const next = makeSession(l, index, { mode: old.mode, review: old.review });
    next.attempts = old.attempts;
    next.correct = old.correct;
    next.xp = old.xp;
    next.coins = old.coins;
    next.started = old.started;
    next.battleCleared = old.battleCleared;
    session = next;
    const s = structuredClone(store.state);
    s.lastMission = l.id;
    s.lastChallenge = index;
    safeSave(s);
    render();
}
function navigate(target) { if (location.hash === `#${target}`) {
    handleRoute();
}
else
    location.hash = target; }
function startMission(id, { mode = 'normal', review = false, index = null, skipArena = false } = {}) {
    if (runBusy) {
        runEpoch++;
        runner.stop('Run stopped while changing missions.');
        runBusy = false;
    }
    const l = catalog.lessons.find(x => x.id === id);
    if (!l) {
        toast('That mission is not in this course.');
        return;
    }
    if (!unlocked(store.state, l) && !review) {
        toast('Finish the previous mission to open this path.');
        return;
    }
    const first = l.challenges.findIndex(c => !store.state.records[c.id]?.solved);
    const chosen = index ?? (first < 0 ? 0 : first);
    session = makeSession(l, chosen, { mode, review });
    if (l.boss && !review && mode !== 'five' && !skipArena) {
        arena = { lessonId: id, mode: 'boss' };
        navigate('arena');
        return;
    }
    const next = structuredClone(store.state);
    next.lastMission = id;
    next.lastChallenge = chosen;
    safeSave(next);
    navigate(`mission/${id}`);
}
function handleRoute() {
    flushDraft();
    const route = location.hash.slice(1) || 'home';
    const parts = route.split('/');
    const name = parts[0];
    if (page === 'mission' && runBusy && (name !== 'mission' || parts[1] !== session?.lessonId)) {
        runEpoch++;
        runner.stop('Run stopped while leaving the mission.');
        runBusy = false;
    }
    if (name === 'mission') {
        const l = catalog.lessons.find(x => x.id === parts[1]);
        if (!l || !unlocked(store.state, l)) {
            page = 'home';
            render();
            toast('That mission is not unlocked yet.');
            return;
        }
        if (!session || session.lessonId !== l.id)
            session = makeSession(l, l.challenges.findIndex(c => !store.state.records[c.id]?.solved) >= 0 ? l.challenges.findIndex(c => !store.state.records[c.id]?.solved) : 0);
        page = 'mission';
    }
    else if (name === 'arena' && arena)
        page = 'arena';
    else if (name === 'summary' && session)
        page = 'summary';
    else
        page = ['home', 'map', 'review', 'collection', 'profile', 'settings'].includes(name) ? name : 'home';
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
}
async function getManager() {
    if (manager)
        return manager;
    if (!managerPromise)
        managerPromise = import('./scenes/manager.js').then(({ SceneManager }) => { manager = new SceneManager(message => { document.getElementById('scene-mode')?.replaceChildren(document.createTextNode('2D mode - every mission still works')); toast(message); }); return manager; }).catch(() => null);
    return managerPromise;
}
async function mountScene(type, options = {}, hostId = 'main-scene') {
    const host = document.getElementById(hostId);
    if (!host)
        return;
    const token = epoch;
    const s = store.state;
    if (s.settings.quality === 'battery') {
        manager?.unmount();
        const label = document.getElementById('scene-mode');
        if (label)
            label.textContent = 'Battery Saver - static 2D';
        return;
    }
    const m = await getManager();
    if (token !== epoch || !host.isConnected)
        return;
    if (!m) {
        const label = document.getElementById('scene-mode');
        if (label)
            label.textContent = '2D mode - every mission is available below';
        return;
    }
    try {
        const color = COSMETICS.find(c => c.id === s.equipped.skin)?.color || '#c9f66b';
        await m.mount(host, type, { catalog, state: s, skin: color, decoration: s.equipped.decoration, quality: s.settings.quality, reduced: reduced(), ...options,
            onAction: (action, id) => { if (action === 'mission')
                startMission(id); if (action === 'pip')
                companionReaction(); }, onQuality: () => { const label = document.getElementById('scene-mode'); if (label)
                label.textContent = 'Adaptive quality: low - keeping things light'; } });
    }
    catch {
        host.classList.remove('has-webgl');
        toast('The 2D view is active. All learning features remain available.');
    }
}
function mountCurrentScene() {
    if (page === 'home') {
        const n = nextMission(store.state, catalog);
        const type = ['hub', 'cavern', 'library', 'forge', 'lab'][n.world - 1];
        mountScene(type, { mood: store.state.streak === 0 ? 'sleepy' : store.state.combo >= 5 ? 'celebrating' : 'happy' });
    }
    if (page === 'map')
        mountScene('map').then(() => { if (selectedWorld !== 1)
            manager?.focus(selectedWorld - 1); });
    if (page === 'mission')
        mountScene('pip');
    if (page === 'collection')
        mountScene('shelf');
    if (page === 'arena') {
        const l = catalog.lessons.find(x => x.id === arena.lessonId);
        mountScene(arena.mode === 'dungeon' ? 'dungeon' : 'boss', { world: l.world, health: l.challenges.length - (session?.battleCleared?.length || 0) });
    }
}
function render() {
    ++epoch;
    flushDraft();
    editor?.destroy();
    editor = null;
    manager?.unmount();
    applySettings();
    document.documentElement.dataset.page = page;
    const ctx = { state: store.state, catalog, page, selectedWorld, session, arena, offline, pythonStatus };
    const fn = { home: screens.home, map: screens.mapScreen, mission: screens.missionScreen, summary: screens.summaryScreen, review: screens.reviewScreen, arena: screens.arenaScreen, collection: screens.collectionScreen, profile: screens.profileScreen, settings: screens.settingsScreen }[page];
    app.innerHTML = screens.shell(fn(ctx), ctx);
    document.title = `${page === 'mission' ? currentLesson().title : page === 'home' ? 'Basecamp' : page.charAt(0).toUpperCase() + page.slice(1)} - Bytebound`;
    updateHUD();
    updateTimer();
    updateOffline();
    if (page === 'mission') {
        const c = currentChallenge();
        const host = document.getElementById('code-editor');
        const id = c.id;
        if (host)
            editor = new CodeEditor(host, { value: session.value, onChange: value => { if (currentChallenge()?.id === id)
                    session.value = value; scheduleDraft(id, value); }, onRun: runCurrent, fontSize: store.state.settings.fontSize, theme: store.state.settings.theme });
        if (session.result)
            paintResult(session.result);
    }
    mountCurrentScene();
    if (!performance.getEntriesByName('bytebound-interactive').length)
        performance.mark('bytebound-interactive');
}
function companionReaction() { manager?.react(true); feedback.play('success'); const texts = ['One line is a perfectly good start.', 'Curiosity counts. So does taking a break.', 'The bugs are small. Your progress is real.', 'Nothing to catch up on. This is your pace.']; toast(texts[Math.floor(Math.random() * texts.length)]); document.querySelector('.pip-greeting')?.classList.add('boop'); }
function paintResult(result) {
    const output = document.getElementById('run-output');
    if (!output)
        return;
    const c = currentChallenge();
    let html = '';
    if (result.error) {
        html = `<div class="feedback-message retry"><strong>${result.error.type === 'EmptyInput' ? 'A first line is all you need.' : result.error.type === 'Stopped' ? 'Paused safely.' : result.error.type === 'Timeout' ? 'A loop took the scenic route.' : 'A useful clue, not a setback.'}</strong><p>${e(result.error.message)}</p>${explain(result.error) ? `<p>${e(explain(result.error))}</p>` : ''}</div>${result.error.traceback ? `<details class="traceback"><summary>Original Python traceback</summary>${codeBlock(result.error.traceback)}</details>` : ''}`;
    }
    else {
        html = `<div class="feedback-message ${result.ok ? 'success' : 'retry'}"><strong>${icon(result.ok ? 'check' : 'spark')} ${result.ok ? 'That works. A little more of the world is yours.' : 'Not quite yet. Here is what to inspect.'}</strong></div>`;
        if (result.output && !(c.type === 'predict' && !result.ok))
            html += `<pre class="program-output">${e(result.output)}</pre>`;
        if (result.truncated)
            html += '<p class="output-limit">Output capped at 32 KiB or 300 lines. The rest was discarded safely.</p>';
        if (result.checks?.length)
            html += `<ul class="test-results">${result.checks.map(check => `<li class="${check.ok ? 'passed' : 'failed'}">${icon(check.ok ? 'check' : 'spark')}<span>${e(check.message)}${check.detail ? `<small>${e(check.detail)}</small>` : ''}</span></li>`).join('')}</ul>`;
        for (const [i, plot] of (result.plots || []).entries())
            html += `<figure class="plot-result"><img alt="Your generated analysis plot ${i + 1}. The code and checks describe its values." src="data:image/png;base64,${plot}"/><figcaption>Generated locally from synthetic data.</figcaption></figure>`;
    }
    output.innerHTML = html;
    const next = document.getElementById('next-step');
    if (next)
        next.hidden = !result.ok;
    const pip = document.getElementById('pip-message');
    if (pip)
        pip.textContent = result.ok ? 'A small, excellent discovery.' : 'Try one change. I am still here.';
}
async function runCurrent() {
    if (runBusy || page !== 'mission' || !session)
        return;
    if (store.conflicted) {
        toast('Reload after the other tab saves before continuing.');
        return;
    }
    captureSession();
    flushDraft();
    const c = currentChallenge();
    const lesson = currentLesson();
    const value = c.type === 'reorder' ? session.order : editor ? editor.getValue() : session.value;
    if (c.type === 'predict' && !String(value).trim()) {
        toast('Make a prediction before checking.');
        return;
    }
    if (c.type === 'fill' && !String(value).trim()) {
        toast('Add one expression to fill the gap.');
        return;
    }
    const inputs = document.getElementById('program-inputs');
    if (inputs)
        session.inputs = inputs.value.split('\n');
    const token = ++runEpoch;
    const sessionRef = session;
    runBusy = true;
    const button = document.getElementById('run-button');
    button.disabled = true;
    document.getElementById('stop-button').hidden = false;
    document.getElementById('run-output').innerHTML = `<div id="run-loading" class="run-loading"><div class="cube-loader" aria-hidden="true"><i></i><i></i><i></i></div><div><strong>${pythonStatus === 'ready' ? 'Following your instructions...' : 'Pip is assembling the Python engine.'}</strong><p>${e(lastRuntimeMessage || 'The editor stays responsive. Your code is safe.')}</p><small>First preparation can take longer. The five-second code timer starts after packages are ready.</small></div></div>`;
    let result;
    try {
        result = await runner.run(makeSubmission(c, value, session.inputs));
    }
    catch (error) {
        result = { ok: false, error: { type: 'RuntimeError', message: String(error) }, checks: [], output: '' };
    }
    if (token !== runEpoch || sessionRef !== session)
        return;
    runBusy = false;
    const runButton = document.getElementById('run-button');
    if (runButton)
        runButton.disabled = false;
    const stop = document.getElementById('stop-button');
    if (stop)
        stop.hidden = true;
    session.result = result;
    const infra = ['RuntimeError', 'Busy', 'Stopped', 'EmptyInput'];
    if (!infra.includes(result.error?.type)) {
        session.attempts++;
        if (result.ok)
            session.correct++;
        const { state, effects } = recordAttempt(store.state, c, result.ok, { hints: session.hints, review: session.review });
        session.xp += effects.xp;
        session.coins += effects.coins;
        safeSave(state);
        if (result.ok) {
            feedback.play('success');
            manager?.react(true);
            session.justPassed = true;
            if (lesson.boss && !session.battleCleared.includes(c.id))
                session.battleCleared.push(c.id);
            if (effects.xp)
                toast(`${effects.levelUp ? 'Level up! ' : ''}+${effects.xp} XP${effects.chest ? ' - a bonus chest added 12 coins.' : ''}${effects.rare ? ' A rare prism found you.' : ''}`);
            if (!store.state.settings.calmRewards && !reduced() && store.state.settings.quality !== 'battery') {
                animateXP();
            }
            if (effects.levelUp && !store.state.settings.calmRewards)
                setTimeout(() => { if (page === 'mission' && session === sessionRef)
                    openReward('level'); }, 650);
        }
        else {
            feedback.play('retry');
            manager?.react(false);
        }
    }
    const bossStatus = document.querySelector('.boss-status');
    if (bossStatus) {
        const count = session.battleCleared.length;
        bossStatus.querySelectorAll('.boss-shields i').forEach((shield, i) => shield.classList.toggle('down', i < count));
        bossStatus.classList.remove('boss-hit', 'boss-retry');
        void bossStatus.offsetWidth;
        bossStatus.classList.add(result.ok ? 'boss-hit' : 'boss-retry');
    }
    paintResult(result);
    updateHUD();
    announce(result.ok ? 'Correct. Next step is available.' : 'Feedback is ready below the editor.');
}
function animateXP() {
    const from = document.getElementById('run-button')?.getBoundingClientRect(), to = document.getElementById('xp-target')?.getBoundingClientRect();
    if (!from || !to)
        return;
    for (let i = 0; i < 8; i++) {
        const orb = document.createElement('i');
        orb.className = 'xp-orb';
        orb.setAttribute('aria-hidden', 'true');
        const x = from.x + from.width / 2 + (i - 4) * 8, y = from.y + from.height / 2;
        orb.style.left = x + 'px';
        orb.style.top = y + 'px';
        document.body.append(orb);
        const animation = orb.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${to.x + to.width / 2 - x}px,${to.y + to.height / 2 - y}px) scale(.2)`, opacity: 0 }], { duration: 650 + i * 45, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' });
        animation.onfinish = () => orb.remove();
    }
}
function nextStep() {
    if (!session?.result?.ok)
        return;
    const lesson = currentLesson();
    if (lesson.boss && !session.review && session.mode !== 'five') {
        const remaining = lesson.challenges.length - session.battleCleared.length;
        showModal(remaining ? 'One shield down.' : 'The arena is yours.', `<div id="modal-scene" class="scene-host reward-scene"><div class="reward-fallback">${icon(remaining ? 'flag' : 'chest')}</div></div><p class="center">${remaining ? `${remaining} shield${remaining === 1 ? '' : 's'} remain. Your correct step is saved.` : 'Every phase is solved. Pip found the exit and a little treasure.'}</p>${screens.button('advance-boss', remaining ? 'Next coding phase' : 'Collect the victory', { cls: 'primary full' })}`, { scene: 'boss', sceneOptions: { world: lesson.world, health: remaining } });
        return;
    }
    advanceStep();
}
function advanceStep() {
    if (!session?.result?.ok)
        return;
    const lesson = currentLesson();
    if (session.review || session.mode === 'five') {
        const before = store.state.xp;
        const next = completeMission(store.state, lesson);
        session.xp += next.xp - before;
        safeSave(next);
        navigate('summary');
        return;
    }
    if (session.index < lesson.challenges.length - 1) {
        moveToChallenge(session.index + 1);
        document.querySelector('.challenge-header')?.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' });
    }
    else {
        const before = store.state.xp;
        const next = completeMission(store.state, lesson);
        session.xp += next.xp - before;
        safeSave(next);
        feedback.play('reward');
        navigate('summary');
    }
}
function revealHint() {
    if (!session || session.hints >= 3)
        return;
    captureSession();
    session.hints++;
    if (!session.review) {
        const c = currentChallenge(), next = structuredClone(store.state);
        const r = next.records[c.id] || { attempts: 0, correct: 0, solved: false, firstCorrect: false, hints: 0, lastReviewDay: null };
        r.hints = Math.max(r.hints, session.hints);
        next.records[c.id] = r;
        safeSave(next);
    }
    render();
    document.getElementById('hint-panel')?.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'nearest' });
}
function useSolution() { const c = currentChallenge(); session.hints = 3; if (c.type === 'reorder')
    session.order = c.solution.split('\n');
else
    session.value = c.solution; session.result = null; render(); }
function showModal(title, body, { scene = null, sceneOptions = {} } = {}) {
    captureSession();
    modalReturn = document.activeElement;
    modal = { title, scene, sceneOptions };
    const root = document.getElementById('modal-root');
    root.innerHTML = `<dialog class="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title">${e(title)}</h2><button data-action="close-modal" class="icon-button" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body">${body}</div></dialog>`;
    const dialog = root.querySelector('dialog');
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
            closeModal();
    } });
    dialog.showModal();
    if (scene) {
        manager?.unmount();
        mountScene(scene, sceneOptions, 'modal-scene');
    }
}
function closeModal() { document.querySelector('dialog')?.close(); document.getElementById('modal-root').innerHTML = ''; const hadScene = !!modal?.scene; modal = null; if (hadScene)
    mountCurrentScene(); if (modalReturn?.isConnected)
    modalReturn.focus(); }
function openReward(type = 'reward') {
    const level = levelFor(store.state.xp);
    showModal(type === 'level' ? `Level ${level.level}: ${level.title}` : 'A little treasure, earned.', `<div id="modal-scene" class="scene-host reward-scene"><div class="reward-fallback">${icon(type === 'level' ? 'spark' : 'chest')}</div></div><p class="center">${type === 'level' ? 'Your XP grew. Your world grew with it.' : 'Your coins and XP are already saved. Nothing depends on opening this chest.'}</p>${screens.button('close-modal', 'Back to the adventure', { cls: 'primary full' })}`, { scene: type });
    feedback.play('reward');
}
function seeIt() {
    const l = currentLesson();
    const grid = l.visualizationId === 'dataframe';
    showModal('See the idea, then return.', `<div id="modal-scene" class="scene-host concept-scene">${islandSVG(l.world)}</div>${grid ? `<label class="setting-row" for="visual-filter">Filter the example grid <select id="visual-filter"><option value="all">All six records</option><option value="outcome-1">Outcome = 1</option><option value="outcome-0">Outcome = 0</option></select></label><p class="muted small-text">An illustrative six-row grid, not the full course dataset.</p><table class="example-grid"><thead><tr><th>ID</th><th>Age</th><th>Score</th><th>Outcome</th></tr></thead><tbody>${Array.from({ length: 6 }, (_, i) => `<tr data-visual-outcome="${i % 2}"><td>S0${i + 1}</td><td>${42 + i * 3}</td><td>${60 + i * 2}</td><td>${i % 2}</td></tr>`).join('')}</tbody></table>` : `<p class="center">${e(l.takeaway)}</p>${codeBlock(l.example)}`}<p class="small-text muted">Every concept has a text example. 3D is optional.</p>${screens.button('close-modal', 'Return to the challenge', { cls: 'primary full' })}`, { scene: 'concept', sceneOptions: { concept: l.visualizationId } });
}
function updateTimer() { const label = document.getElementById('timer-label'); if (label)
    label.textContent = timer.running ? timer.label() : 'Focus'; const display = document.getElementById('timer-display'); if (display)
    display.textContent = timer.label(); const toggle = document.getElementById('timer-toggle'); if (toggle)
    toggle.textContent = timer.running ? 'Pause' : 'Start'; }
function updateOffline() { const status = document.getElementById('offline-status'); if (status) {
    status.innerHTML = icon(offline.status === 'ready' ? 'check' : 'download') + `<span>${offline.status === 'ready' ? 'Ready offline' : offline.status === 'downloading' ? `Saving ${Math.round(offline.done / Math.max(1, offline.total) * 100)}%` : 'Offline kit'}</span>`;
    status.title = offline.message;
} const detail = document.getElementById('offline-detail'); if (detail)
    detail.innerHTML = `<strong>${e(offline.message)}</strong>${offline.total ? `<progress max="${offline.total}" value="${offline.done}" aria-label="Offline preparation"></progress><small>${offline.done}/${offline.total} files verified</small>` : ''}`; if (detail && offline.status === 'update' && !document.querySelector('[data-action="apply-update"]'))
    detail.insertAdjacentHTML('afterend', screens.button('apply-update', 'Apply update and reload', { cls: 'secondary' })); }
function exportProgress() { flushDraft(); try {
    const blob = new Blob([store.export()], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = `bytebound-progress-${localDay(Date.now(), store.state.settings.timeZone)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Your JSON backup is ready. Keep it somewhere you control.');
}
catch (error) {
    toast('Could not export: ' + error.message);
} }
function installHelp() { showModal('A home for the islands.', `<p><strong>iPhone or iPad:</strong> Open the deployed HTTPS site in Safari. Tap Share, then Add to Home Screen.</p><p><strong>Android:</strong> Open the site in Chrome. Use the browser menu, then Add to Home screen or Install app.</p><p><strong>Laptop:</strong> Look for the install icon in the browser address bar when supported.</p><p class="privacy-note">Wait for Ready offline before disconnecting. Export progress before removing the app or clearing website data.</p>${offline.installEvent ? screens.button('install-native', 'Install Bytebound', { cls: 'primary full' }) : screens.button('close-modal', 'Got it', { cls: 'primary full' })}`); }
function beginDungeon() { const all = catalog.lessons.flatMap(l => l.challenges.filter(c => c.aiAudit).map(c => ({ lesson: l, challenge: c }))); const choice = all.find(x => store.state.records[x.challenge.id]?.attempts > store.state.records[x.challenge.id]?.correct) || all.find(x => store.state.records[x.challenge.id]?.solved) || all[0]; session = makeSession(choice.lesson, 4, { mode: 'dungeon', review: true }); arena = { lessonId: choice.lesson.id, mode: 'dungeon' }; navigate('arena'); }
async function action(action, el) {
    switch (action) {
        case 'continue':
            startMission(nextMission(store.state, catalog).id);
            break;
        case 'five-minute':
            startMission(nextMission(store.state, catalog).id, { mode: 'five' });
            break;
        case 'mission':
            startMission(el.dataset.id);
            break;
        case 'world':
            selectedWorld = Number(el.dataset.world);
            navigate('map');
            break;
        case 'select-world':
            selectedWorld = Number(el.dataset.world);
            render();
            break;
        case 'pip':
            companionReaction();
            break;
        case 'run':
            await runCurrent();
            break;
        case 'stop':
            runner.stop();
            break;
        case 'retry-python':
            runner.restart();
            toast('Retrying the local Python engine.');
            break;
        case 'next':
            nextStep();
            break;
        case 'advance-boss':
            closeModal();
            advanceStep();
            break;
        case 'hint':
            revealHint();
            break;
        case 'use-solution':
            useSolution();
            break;
        case 'indent':
            editor?.indent();
            break;
        case 'outdent':
            editor?.indent(true);
            break;
        case 'undo':
            editor?.undo();
            break;
        case 'reset-code':
            showModal('Restore the starter code?', `<p>Your current draft for this challenge will be replaced. Completed progress stays safe.</p>${screens.button('confirm-reset-code', 'Restore starter', { cls: 'secondary' })}${screens.button('close-modal', 'Keep my code', { cls: 'quiet' })}`);
            break;
        case 'confirm-reset-code': {
            const c = currentChallenge();
            session.value = c.starterCode || '';
            session.result = null;
            scheduleDraft(c.id, session.value);
            closeModal();
            render();
            break;
        }
        case 'choice':
            session.value = currentChallenge().choices[Number(el.dataset.choice)];
            document.querySelector('[data-answer]').value = session.value;
            break;
        case 'line-up':
        case 'line-down': {
            const i = Number(el.dataset.line), j = i + (action === 'line-up' ? -1 : 1);
            if (j >= 0 && j < session.order.length) {
                [session.order[i], session.order[j]] = [session.order[j], session.order[i]];
                session.result = null;
                render();
                document.querySelector(`[data-action="${action}"][data-line="${j}"]`)?.focus();
            }
            break;
        }
        case 'see-it':
            seeIt();
            break;
        case 'reward':
            openReward();
            break;
        case 'close-modal':
            closeModal();
            break;
        case 'review-challenge': {
            const l = catalog.lessons.find(l => l.challenges.some(c => c.id === el.dataset.id));
            startMission(l.id, { review: true, index: l.challenges.findIndex(c => c.id === el.dataset.id) });
            break;
        }
        case 'dungeon':
            beginDungeon();
            break;
        case 'enter-arena': {
            const mode = arena.mode;
            if (mode === 'dungeon') {
                navigate(`mission/${session.lessonId}`);
            }
            else
                startMission(arena.lessonId, { skipArena: true });
            break;
        }
        case 'cosmetic':
            try {
                safeSave(buyOrEquip(store.state, el.dataset.id));
                render();
                toast('A small change of scenery. Equipped.');
            }
            catch (error) {
                toast(error.message);
            }
            break;
        case 'timer':
            showModal('A gentle focus window.', `<div class="timer-display" id="timer-display">${timer.label()}</div><p class="center">Focus while it helps. Pause whenever you need.</p><div class="button-row center">${screens.button('timer-toggle', timer.running ? 'Pause' : 'Start', { cls: 'primary', attrs: 'id="timer-toggle"' })}${screens.button('timer-reset', 'Reset', { cls: 'secondary' })}</div><p class="small-text muted center">${store.state.settings.focusMinutes} minute window. Hidden tabs pause the timer. Settings lets you change the duration.</p>`);
            break;
        case 'timer-toggle':
            timer.toggle(store.state.settings.focusMinutes);
            updateTimer();
            break;
        case 'timer-reset':
            timer.reset(store.state.settings.focusMinutes);
            break;
        case 'export':
            exportProgress();
            break;
        case 'import':
            document.getElementById('import-file')?.click();
            break;
        case 'reset':
            showModal('Begin a fresh adventure?', `<p>This removes progress, saved code, badges, and cosmetics from this browser. There is no cloud copy.</p><div class="button-row">${screens.button('export', 'Export a backup first', { cls: 'secondary', symbol: 'download' })}</div><label class="input-label" for="reset-confirm">Type RESET to confirm</label><input id="reset-confirm" class="answer-input" autocomplete="off"/><div class="button-row">${screens.button('confirm-reset', 'Reset local progress', { cls: 'danger' })}${screens.button('close-modal', 'Keep my adventure', { cls: 'quiet' })}</div>`);
            break;
        case 'confirm-reset':
            if (document.getElementById('reset-confirm').value === 'RESET') {
                closeModal();
                store.reset();
                session = null;
                timer.reset(25);
                navigate('home');
                toast('A fresh adventure. No judgment, just a new beginning.');
            }
            else
                toast('Type RESET exactly to confirm.');
            break;
        case 'offline-info':
            navigate('settings');
            break;
        case 'prepare-offline':
            offline.prepare();
            toast('Checking and saving the complete offline kit.');
            break;
        case 'persist':
            toast(await offline.requestPersistence() ? 'Persistent storage granted. Still keep an exported backup.' : 'The browser did not grant persistent storage. The app still works; keep an exported backup.');
            break;
        case 'install':
            installHelp();
            break;
        case 'install-native':
            await offline.install();
            closeModal();
            break;
        case 'apply-update':
            flushDraft();
            offline.applyUpdate();
            break;
        case 'reload':
            location.reload();
            break;
    }
}
async function change(event) {
    const el = event.target;
    if (el.matches('[data-setting]')) {
        const name = el.dataset.setting, next = structuredClone(store.state);
        next.settings[name] = el.type === 'checkbox' ? el.checked : ['fontSize', 'focusMinutes'].includes(name) ? Number(el.value) : el.value;
        if (safeSave(next)) {
            if (name === 'focusMinutes')
                timer.configure(next.settings.focusMinutes);
            render();
            document.getElementById('setting-' + name)?.focus();
        }
    }
    if (el.id === 'visual-filter') {
        manager?.filter(el.value);
        document.querySelectorAll('[data-visual-outcome]').forEach(row => { row.hidden = el.value !== 'all' && row.dataset.visualOutcome !== el.value.at(-1); });
    }
    if (el.id === 'import-file' && el.files?.length) {
        const file = el.files[0];
        try {
            if (file.size > MAX_IMPORT_BYTES)
                throw new Error('This file is larger than the 1 MB progress limit.');
            const text = await file.text();
            const { parseImport } = await import('./game/state.js');
            const clean = parseImport(text, catalog);
            showModal('Replace this local save?', `<p>The file contains <strong>${clean.completed.length} completed missions</strong> and <strong>${clean.xp} XP</strong>. Export your current adventure before replacing it.</p><div class="button-row">${screens.button('export', 'Export current save', { cls: 'secondary' })}<button id="confirm-import" class="button primary">Import validated save</button></div>`);
            document.getElementById('confirm-import').addEventListener('click', () => { try {
                store.import(text);
                closeModal();
                session = null;
                timer.reset(store.state.settings.focusMinutes);
                navigate('home');
                toast('Progress imported. Your next island is ready.');
            }
            catch (error) {
                toast(error.message);
            } });
        }
        catch (error) {
            toast('Import rejected: ' + error.message);
        }
        el.value = '';
    }
}
async function boot() {
    try {
        const response = await fetch(new URL('lessons.json', base));
        if (!response.ok)
            throw new Error('The lesson file could not be loaded.');
        catalog = validateCatalog(await response.json());
        if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.lessons) || catalog.lessons.length < 1)
            throw new Error('The lesson catalog is incomplete.');
        store = new ProgressStore(catalog);
        feedback = new Feedback(() => store.state.settings);
        runner = new PythonRunner(base.href);
        offline = new OfflineKit(base);
        timer = new FocusTimer();
        timer.configure(store.state.settings.focusMinutes);
        ensureQuest(store.state);
        store.addEventListener('change', updateHUD);
        store.addEventListener('conflict', () => { runner.stop(); updateHUD(); });
        runner.addEventListener('status', event => updateRuntime(event.detail.status, event.detail.message));
        offline.addEventListener('change', updateOffline);
        timer.addEventListener('change', updateTimer);
        timer.addEventListener('complete', () => { feedback.play('reward'); toast('A good stopping point. Stretch, drink some water, or just look away from the screen.'); });
        app.addEventListener('click', event => { const el = event.target.closest('[data-action]'); if (el && !el.disabled)
            action(el.dataset.action, el).catch(error => toast(error.message)); });
        document.querySelector('.skip')?.addEventListener('click', event => { event.preventDefault(); document.getElementById('main')?.focus(); });
        app.addEventListener('change', change);
        app.addEventListener('input', event => { if (event.target.matches('[data-answer]') && session)
            session.value = event.target.value; if (event.target.id === 'program-inputs' && session)
            session.inputs = event.target.value.split('\n'); });
        matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { if (!modal)
            render();
        else
            applySettings(); });
        window.addEventListener('hashchange', handleRoute);
        window.addEventListener('beforeunload', flushDraft);
        document.addEventListener('visibilitychange', () => { if (document.hidden) {
            captureSession();
            flushDraft();
        } });
        for (const name of ['pointerdown', 'keydown', 'touchstart'])
            window.addEventListener(name, () => { lastActivity = Date.now(); }, { passive: true });
        document.addEventListener('keydown', event => { if (event.key === '?' && !event.target.closest('input,textarea,[contenteditable]'))
            showModal('A few helpful keys.', `<p><strong>Ctrl / Cmd + Enter</strong> runs code.</p><p><strong>Tab</strong> indents inside the editor. <strong>Escape</strong> leaves the editor so Tab can navigate normally.</p><p>Every 3D action also has a standard button. No dragging is required.</p>`); });
        setInterval(() => { if (!document.hidden && Date.now() - lastActivity < 60000 && !store.conflicted) {
            const next = structuredClone(store.state);
            next.activeSeconds += 15;
            safeSave(next);
        } }, 15000);
        handleRoute();
        setTimeout(() => { runner.start(); offline.start(); }, 250);
        // Local diagnostics only. No telemetry or network reporting. QA uses the production runner.
        window.__BYTEBOUND_QA__ = Object.freeze({ catalog, run: payload => runner.run(payload), referenceValue, makeSubmission, getState: () => structuredClone(store.state), getRunnerStatus: () => runner.status, getRenderStats: () => manager?.stats || null });
    }
    catch (error) {
        app.innerHTML = `<main class="boot error-boot"><div class="boot-mark">B.</div><h1>The islands could not load.</h1><p>${e(error.message)}</p><p>Serve the built dist folder over HTTPS. Double-clicking index.html cannot run the app.</p><a href="./">Reload</a></main>`;
    }
}
boot();
