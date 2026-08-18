/* ---------------------------------------------------------------------------
   LD (הכרעה לקסיקלית) — application logic.
   Edit items.js for the word pairs and timings, config.js for the Web App URL.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  /* --- element helpers --------------------------------------------------- */

  const $ = (id) => document.getElementById(id);

  const screens = {
    welcome:  $('screen-welcome'),
    general:  $('screen-general'),
    ready:    $('screen-ready'),
    fixation: $('screen-fixation'),
    stimulus: $('screen-stimulus'),
    response: $('screen-response'),
    blank:    $('screen-blank'),
    end:      $('screen-end')
  };

  function show(name) {
    Object.keys(screens).forEach((key) => {
      screens[key].classList.toggle('active', key === name);
    });
    window.scrollTo(0, 0);
  }

  /* --- session state ------------------------------------------------------ */

  const STORAGE_KEY = 'ld_pending_rows_v1';

  const state = {
    participant: '',
    trials: [],          // the running order for this session, built at start
    trialIndex: 0,
    rows: [],            // every row collected this session (for CSV)
    pending: [],         // rows that have not been accepted by the server
    timer: null,
    testRunning: false,
    answered: false,
    shownAt: 0,          // performance.now() when the buttons appeared
    researcher: false,
    flushing: false
  };

  /* --- building the running order ----------------------------------------- */

  /* Every pair contributes two trials, the real word and its non-word, unless
     one of them is switched off in items.js with showWord / showNonword. */
  function buildTrials() {
    const trials = [];
    TEST_DATA.pairs.forEach((pair) => {
      if (pair.showWord !== false) {
        trials.push({
          pair_id: pair.id, condition: pair.condition,
          word: pair.word, is_word: 1, pair_word: pair.nonword
        });
      }
      if (pair.showNonword !== false) {
        trials.push({
          pair_id: pair.id, condition: pair.condition,
          word: pair.nonword, is_word: 0, pair_word: pair.word
        });
      }
    });
    return trials;
  }

  /* The running order. Normally the fixed sequence in TEST_DATA.order; if that
     is absent, a fresh random order is generated for this participant instead.

     The fixed order is given as plain words, so it stays readable and editable
     in items.js. Every word must resolve to exactly one item, and every item
     must be listed exactly once — anything else is a mistake in the data file
     that would silently run a wrong test, so it raises instead. */
  function runningOrder() {
    const trials = buildTrials();
    const list = TEST_DATA.order;

    if (!Array.isArray(list) || list.length === 0) {
      return orderTrials(trials, TEST_DATA.minPairGap || 1, 200);
    }

    const byWord = {};
    trials.forEach((t) => { byWord[t.word] = t; });

    const unknown = list.filter((w) => !byWord[w]);
    if (unknown.length) {
      throw new Error('items.js: order lists words that are not in pairs: ' + unknown.join(', '));
    }

    const counts = {};
    list.forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
    const repeated = Object.keys(counts).filter((w) => counts[w] > 1);
    if (repeated.length) {
      throw new Error('items.js: order repeats: ' + repeated.join(', '));
    }

    const missing = trials.filter((t) => counts[t.word] === undefined).map((t) => t.word);
    if (missing.length) {
      throw new Error('items.js: order is missing: ' + missing.join(', '));
    }

    return list.map((w) => byWord[w]);
  }

  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /* Random order in which the two members of a pair are never closer together
     than `gap` trials. Built greedily: at each position, choose at random among
     the trials whose partner is not among the last `gap` already placed. The
     greedy run can paint itself into a corner near the end, so it simply
     restarts; if a gap turns out to be unreachable it relaxes and tries again,
     and a plain shuffle is the last resort. */
  function orderTrials(list, gap, triesPerGap) {
    for (let g = gap; g >= 1; g--) {
      for (let attempt = 0; attempt < triesPerGap; attempt++) {
        const order = greedyOrder(list, g);
        if (order) return order;
      }
    }
    return shuffle(list);
  }

  function greedyOrder(list, gap) {
    const left = list.slice();
    const out = [];

    while (left.length) {
      const recent = out.slice(Math.max(0, out.length - gap));
      const eligible = [];
      for (let i = 0; i < left.length; i++) {
        let clash = false;
        for (let k = 0; k < recent.length; k++) {
          if (recent[k].pair_id === left[i].pair_id) { clash = true; break; }
        }
        if (!clash) eligible.push(i);
      }
      if (eligible.length === 0) return null;           // stuck — restart
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      out.push(left[pick]);
      left.splice(pick, 1);
    }
    return out;
  }

  /* --- timestamp ---------------------------------------------------------- */

  function timestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /* --- network ------------------------------------------------------------ */

  const COLUMNS = [
    'timestamp', 'participant_name', 'trial_number', 'pair_id', 'condition',
    'word', 'is_word', 'pair_word', 'response', 'score', 'rt_ms'
  ];

  function savePending() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.pending));
    } catch (e) { /* private mode / storage full — ignore */ }
  }

  function loadPending() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(stored)) return stored;
    } catch (e) { /* ignore */ }
    return [];
  }

  /* Posts an array of rows. Resolves true on success, false on any failure.
     Content-Type is text/plain so the browser sends no CORS preflight —
     Apps Script does not answer OPTIONS requests. */
  async function postRows(rows) {
    if (!CONFIG.WEB_APP_URL) return false;
    try {
      const res = await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          sheet: CONFIG.SHEET_NAME || 'LD',
          columns: COLUMNS,
          rows: rows
        }),
        redirect: 'follow',
        keepalive: rows.length <= 20
      });
      if (!res.ok) return false;
      const text = await res.text();
      try {
        return JSON.parse(text).status === 'ok';
      } catch (e) {
        return false;              // an HTML login page, not our JSON reply
      }
    } catch (e) {
      return false;
    }
  }

  async function postWithRetries(rows, attempts) {
    for (let i = 0; i <= attempts; i++) {
      if (await postRows(rows)) return true;
      if (i < attempts) await sleep(600 * (i + 1));
    }
    return false;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* Rows currently being posted, so a queue flush cannot send them twice. */
  const inFlight = new WeakSet();

  /* Fire-and-forget per-trial post; failures land in the retry queue. */
  function sendRow(row) {
    state.pending.push(row);
    savePending();
    inFlight.add(row);
    postWithRetries([row], CONFIG.postRetries).then((ok) => {
      inFlight.delete(row);
      if (ok) {
        const i = state.pending.indexOf(row);
        if (i !== -1) state.pending.splice(i, 1);
        savePending();
        if (state.researcher) refreshResearcherPanel();
      }
    });
  }

  /* Sends whatever is queued. Silent: safe to fire mid-test, e.g. the moment
     the connection comes back. Returns true if the queue emptied. */
  async function retryQueue(attempts) {
    if (!CONFIG.WEB_APP_URL || state.flushing) return false;

    const batch = state.pending.filter((r) => !inFlight.has(r));
    if (batch.length === 0) return state.pending.length === 0;

    state.flushing = true;
    batch.forEach((r) => inFlight.add(r));
    let ok = false;
    try {
      ok = await postWithRetries(batch, attempts);
      if (ok) {
        state.pending = state.pending.filter((r) => batch.indexOf(r) === -1);
        savePending();
      }
    } finally {
      batch.forEach((r) => inFlight.delete(r));
      state.flushing = false;
    }
    if (state.researcher) refreshResearcherPanel();
    return ok;
  }

  /* --- CSV ---------------------------------------------------------------- */

  function toCsv(rows) {
    const esc = (v) => {
      if (typeof v === 'number') return String(v);
      return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    };
    const lines = [COLUMNS.join(',')];
    rows.forEach((row) => {
      lines.push(COLUMNS.map((c) => esc(row[c])).join(','));
    });
    return String.fromCharCode(0xFEFF) + lines.join('\r\n');   // BOM so Excel reads the Hebrew
  }

  function downloadCsv() {
    // Includes anything left over from an earlier session that never uploaded.
    const all = state.rows.concat(
      state.pending.filter((r) => state.rows.indexOf(r) === -1)
    );
    const blob = new Blob([toCsv(all)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (state.participant || 'participant').replace(/[^\p{L}\p{N}_-]+/gu, '_');
    a.href = url;
    a.download = 'ld_' + safeName + '_' + timestamp().replace(/[: ]/g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* --- flow --------------------------------------------------------------- */

  function currentTrial() { return state.trials[state.trialIndex]; }

  function startTest() {
    const name = $('participant-name').value.trim();
    if (!name) {
      $('name-error').hidden = false;
      return;
    }
    $('name-error').hidden = true;
    state.participant = name;
    state.testRunning = true;
    try {
      state.trials = runningOrder();
    } catch (err) {
      // A broken data file must never reach a participant unnoticed.
      $('name-error').textContent = String(err.message || err);
      $('name-error').hidden = false;
      state.testRunning = false;
      throw err;
    }
    lockNavigation();
    $('general-instructions').textContent = TEST_DATA.generalInstructions;
    $('btn-word').textContent = TEST_DATA.wordLabel;
    $('btn-nonword').textContent = TEST_DATA.nonwordLabel;
    show('general');
  }

  /* The screen before the first trial, and again at every rest break.
     Deliberately says nothing about how many trials are done, left or in
     total — the participant should get no sense of the length of the test. */
  function showReady() {
    if (state.trialIndex === 0) {
      $('ready-heading').textContent = '';
      $('ready-text').textContent = TEST_DATA.readyText;
      $('btn-ready-continue').textContent = 'מוכנים, להתחיל';
    } else {
      $('ready-heading').textContent = 'הפסקה קצרה';
      $('ready-text').textContent = TEST_DATA.breakText;
      $('btn-ready-continue').textContent = 'להמשיך';
    }
    show('ready');
  }

  /* A trial is: fixation cross -> the word -> the two buttons. */
  function startTrial() {
    state.answered = false;
    const fixation = TEST_DATA.fixationDurationMs;
    if (!(fixation > 0)) { showStimulus(); return; }   // 0 or absent: no cross
    show('fixation');
    clearTimeout(state.timer);
    state.timer = setTimeout(showStimulus, fixation);
  }

  function showStimulus() {
    $('stimulus').textContent = currentTrial().word;
    show('stimulus');
    clearTimeout(state.timer);
    state.timer = setTimeout(showResponse, TEST_DATA.stimulusDurationMs);
  }

  function showResponse() {
    $('btn-word').disabled = false;
    $('btn-nonword').disabled = false;
    state.shownAt = performance.now();
    show('response');
    // Prefer the moment the frame actually paints, so rt_ms is time-to-tap from
    // the buttons being visible rather than from the timer firing. The value
    // above is set first and unconditionally: a backgrounded tab may never give
    // us a frame, and a stale shownAt would silently corrupt the RT.
    requestAnimationFrame(() => {
      if (!state.answered) state.shownAt = performance.now();
    });
  }

  function finishTrial(saidWord) {
    if (state.answered) return;
    state.answered = true;
    const rt = Math.round(performance.now() - state.shownAt);
    $('btn-word').disabled = true;
    $('btn-nonword').disabled = true;

    const trial = currentTrial();
    const response = saidWord ? 1 : 0;

    const row = {
      timestamp: timestamp(),
      participant_name: state.participant,
      trial_number: state.trialIndex + 1,
      pair_id: trial.pair_id,
      condition: trial.condition,
      word: trial.word,
      is_word: trial.is_word,
      pair_word: trial.pair_word,
      response: response,
      score: response === trial.is_word ? 1 : 0,
      rt_ms: rt
    };

    state.rows.push(row);
    sendRow(row);

    show('blank');
    clearTimeout(state.timer);
    state.timer = setTimeout(nextTrial, TEST_DATA.blankDurationMs);
  }

  function nextTrial() {
    state.trialIndex++;
    if (state.trialIndex >= state.trials.length) {
      endTest();
      return;
    }
    const every = TEST_DATA.breakEveryTrials;
    if (every > 0 && state.trialIndex % every === 0) {
      showReady();
      return;
    }
    startTrial();
  }

  /* --- end of session ----------------------------------------------------- */

  async function endTest() {
    state.testRunning = false;
    show('end');
    if (codeInUrl()) state.researcher = true;
    await flushPending();
  }

  async function flushPending() {
    const status = $('upload-status');

    if (!CONFIG.WEB_APP_URL) {
      status.textContent = '';       // pilot mode: nothing to send
      refreshResearcherPanel();
      return;
    }

    // Give the per-trial posts a moment to land before judging them failed.
    await sleep(1500);
    if (state.pending.length === 0) {
      status.textContent = '';
      refreshResearcherPanel();
      return;
    }

    status.textContent = 'שולח נתונים…';

    const ok = await retryQueue(3);

    if (ok) {
      status.textContent = '';
    } else {
      // No data is revealed here — only a note asking to fetch the researcher.
      status.textContent = 'לא הצלחנו לשלוח את הנתונים. נא להראות מסך זה לחוקר.';
    }
    refreshResearcherPanel();
  }

  /* --- researcher-only panel ----------------------------------------------- */
  /* The CSV and retry buttons expose responses and scores, so they stay hidden
     from the participant. To reveal them: tap the thank-you heading 5 times and
     enter RESEARCHER_CODE, or open the test with ?researcher=<code> appended. */

  function refreshResearcherPanel() {
    const unlocked = state.researcher;
    $('btn-download-csv').hidden = !unlocked;
    $('btn-retry-upload').hidden = !unlocked || state.pending.length === 0;
    if (unlocked) {
      $('upload-status').textContent = state.pending.length
        ? ('מצב חוקר: ' + state.pending.length + ' שורות טרם נשלחו.')
        : 'מצב חוקר: כל הנתונים נשלחו.';
    }
  }

  function unlockResearcher() {
    state.researcher = true;
    refreshResearcherPanel();
  }

  function askForResearcherCode() {
    const code = String(CONFIG.RESEARCHER_CODE || '');
    if (!code) { unlockResearcher(); return; }
    let entered;
    try { entered = window.prompt('קוד חוקר:'); } catch (e) { entered = null; }
    if (entered !== null && entered.trim() === code) unlockResearcher();
  }

  function codeInUrl() {
    const code = String(CONFIG.RESEARCHER_CODE || '');
    try {
      const param = new URLSearchParams(location.search).get('researcher');
      return param !== null && (!code || param === code);
    } catch (e) {
      return false;
    }
  }

  /* --- back-navigation lock ----------------------------------------------- */

  function lockNavigation() {
    history.pushState({ ld: true }, '', location.href);
    history.pushState({ ld: true }, '', location.href);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
  }

  function onPopState() {
    if (state.testRunning) history.pushState({ ld: true }, '', location.href);
  }

  function onBeforeUnload(e) {
    if (!state.testRunning) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  }

  /* --- wiring -------------------------------------------------------------- */

  $('btn-start').addEventListener('click', startTest);

  $('participant-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); startTest(); }
  });

  $('btn-general-continue').addEventListener('click', showReady);

  $('btn-ready-continue').addEventListener('click', startTrial);

  $('btn-word').addEventListener('click', () => finishTrial(true));
  $('btn-nonword').addEventListener('click', () => finishTrial(false));

  $('btn-download-csv').addEventListener('click', downloadCsv);

  // Five taps on the thank-you heading, then the code, reveal the panel.
  let tapCount = 0;
  let tapTimer = null;
  $('end-title').addEventListener('click', () => {
    if (state.researcher) return;
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 2500);
    if (tapCount >= 5) { tapCount = 0; askForResearcherCode(); }
  });

  $('btn-retry-upload').addEventListener('click', async () => {
    $('btn-retry-upload').disabled = true;
    await flushPending();
    $('btn-retry-upload').disabled = false;
  });

  // A previous session that never managed to upload gets carried along and
  // retried at the end of this one.
  state.pending = loadPending();

  // Anything still queued goes out the moment the connection returns, and once
  // more on start-up in case a session was abandoned offline.
  window.addEventListener('online', () => { retryQueue(2); });
  if (state.pending.length) setTimeout(() => retryQueue(1), 1500);

  // Cache the app so a phone with no signal can still open and run the test.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      } catch (e) { /* file:// or a browser without support — no offline mode */ }
    });
  }

  show('welcome');
})();
