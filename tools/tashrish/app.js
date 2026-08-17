/* ---------------------------------------------------------------------------
   Tashrish (תשריש) — application logic.
   Edit items.js for stimuli / block order, config.js for the Web App URL.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  /* --- element helpers --------------------------------------------------- */

  const $ = (id) => document.getElementById(id);

  const screens = {
    welcome:  $('screen-welcome'),
    general:  $('screen-general'),
    block:    $('screen-block'),
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

  const STORAGE_KEY = 'tashrish_pending_rows_v1';

  const state = {
    participant: '',
    blockIndex: 0,
    itemIndex: 0,
    rows: [],            // every row collected this session (for CSV)
    pending: [],         // rows that have not been accepted by the server
    timer: null,
    testRunning: false,
    answered: false,
    researcher: false,   // true once the researcher panel has been unlocked
    flushing: false      // a queue flush is in progress
  };

  /* --- answer normalisation & scoring ------------------------------------ */

  // Hebrew niqqud, cantillation marks and the like: U+0591-U+05C7.
  const NIQQUD = new RegExp('[\\u0591-\\u05C7]', 'g');
  // Directional / zero-width characters a keyboard may sneak in.
  const INVISIBLE = new RegExp('[\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]', 'g');

  function normalize(str) {
    return String(str == null ? '' : str)
      .normalize('NFC')
      .replace(NIQQUD, '')
      .replace(INVISIBLE, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function scoreAnswer(raw, expected) {
    return normalize(raw) === normalize(expected) ? 1 : 0;
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
    'timestamp', 'participant_name', 'block_number', 'condition',
    'item_number_in_block', 'item_type', 'stimulus_1', 'stimulus_2',
    'expected_answer', 'raw_response', 'score', 'skipped'
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
          sheet: CONFIG.SHEET_NAME || 'tashrish',
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
    a.download = 'tashrish_' + safeName + '_' + timestamp().replace(/[: ]/g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* --- flow --------------------------------------------------------------- */

  const blocks = TEST_DATA.blocks;

  function currentBlock() { return blocks[state.blockIndex]; }
  function currentItem()  { return currentBlock().items[state.itemIndex]; }

  function startTest() {
    const name = $('participant-name').value.trim();
    if (!name) {
      $('name-error').hidden = false;
      return;
    }
    $('name-error').hidden = true;
    state.participant = name;
    state.testRunning = true;
    lockNavigation();
    $('general-instructions').textContent = TEST_DATA.generalInstructions;
    show('general');
  }

  function showBlockInstructions() {
    const block = currentBlock();
    $('block-heading').textContent = 'שלב ' + block.block_number + ' מתוך ' + blocks.length;
    $('block-instructions').textContent = block.instructions;
    show('block');
  }

  function startTrial() {
    const item = currentItem();
    state.answered = false;
    $('stim-1').textContent = item.s1;
    $('stim-2').textContent = item.s2;
    show('stimulus');
    clearTimeout(state.timer);
    state.timer = setTimeout(showResponse, TEST_DATA.stimulusDurationMs);
  }

  function showResponse() {
    const input = $('response-input');
    input.value = '';
    $('btn-submit').disabled = false;
    $('btn-skip').disabled = false;
    show('response');
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  }

  function finishTrial(rawResponse, skipped) {
    if (state.answered) return;
    state.answered = true;
    $('btn-submit').disabled = true;
    $('btn-skip').disabled = true;

    const block = currentBlock();
    const item = currentItem();
    const raw = skipped ? '' : rawResponse;

    const row = {
      timestamp: timestamp(),
      participant_name: state.participant,
      block_number: block.block_number,
      condition: block.condition,
      item_number_in_block: state.itemIndex + 1,
      item_type: item.type,
      stimulus_1: item.s1,
      stimulus_2: item.s2,
      expected_answer: item.expected,
      raw_response: raw,
      score: skipped ? 0 : scoreAnswer(raw, item.expected),
      skipped: skipped ? 1 : 0
    };

    state.rows.push(row);
    sendRow(row);

    show('blank');
    clearTimeout(state.timer);
    state.timer = setTimeout(nextTrial, TEST_DATA.blankDurationMs);
  }

  function nextTrial() {
    state.itemIndex++;
    if (state.itemIndex < currentBlock().items.length) {
      startTrial();
      return;
    }
    state.itemIndex = 0;
    state.blockIndex++;
    if (state.blockIndex < blocks.length) {
      showBlockInstructions();
    } else {
      endTest();
    }
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
    history.pushState({ tashrish: true }, '', location.href);
    history.pushState({ tashrish: true }, '', location.href);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
  }

  function onPopState() {
    if (state.testRunning) history.pushState({ tashrish: true }, '', location.href);
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

  $('btn-general-continue').addEventListener('click', showBlockInstructions);

  $('btn-block-continue').addEventListener('click', startTrial);

  $('response-form').addEventListener('submit', (e) => {
    e.preventDefault();
    finishTrial($('response-input').value, false);
  });

  $('btn-skip').addEventListener('click', () => finishTrial('', true));

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
