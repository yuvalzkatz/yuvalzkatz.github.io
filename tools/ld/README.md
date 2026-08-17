# LD · הכרעה לקסיקלית

A Hebrew lexical decision task, built from the paper version
*"הכרעה לקסיקלית באפר גרפמי V3"*.

A mobile-first, framework-free web app, and the second task on the same
platform as [`../tashrish/`](../tashrish/). Participants open it on their phone,
type their name, and work through **125 trials**. Each trial shows one Hebrew
word for 400 ms; after it disappears the participant taps **green (right) =
מילה** or **red (left) = לא מילה**. Results go to the private Google Sheet, one
row per trial.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole UI — one section per screen |
| `styles.css` | Mobile-first styling, RTL, light + dark |
| `app.js` | Flow, timing, running order, scoring, upload queue, CSV fallback |
| — | Screens in order: welcome → instructions → ready → *(fixation → word → buttons → blank)* × N → end |
| **`items.js`** | **The data file — the 63 word pairs, conditions, instruction texts, timings.** The only file you need to touch to change the test. |
| `config.js` | Web App URL, target tab name, researcher code |
| `sw.js` | Service worker — lets the test open and run with no connection |

There is no `apps-script/` folder here on purpose: the backend is already
deployed and serves every task. See
[`../tashrish/apps-script/README-apps-script.md`](../tashrish/apps-script/README-apps-script.md)
if it ever needs redeploying — but do not redeploy it just to add this task.

## The items

63 pairs, each a real Hebrew word matched with a non-word built from it. Both
members are shown, except for the one exclusion below, giving **125 trials: 63
real words, 62 non-words**.

The `condition` column records how the non-word was made:

| condition | how the non-word is built | example | pairs | non-words shown |
| --- | --- | --- | --- | --- |
| `doubling` | a doubled letter migrates to its neighbour | ננהל → נ**הה**ל | 24 | 24 |
| `transposition` | two adjacent letters swap | מטו**נפ**ים → מטו**פנ**ים | 21 | 20 |
| `morphological` | wrong affix or inflection | קטנטן → קטנטנ**ום** | 18 | 18 |

**Excluded:** the non-word `מלשבים` (pair 25) is not presented. Its partner
`מבשלים` still is, and `מלשבים` is still written to the sheet as that row's
`pair_word`, so the record of what the item was built from survives. This is
what makes the word/non-word split 63/62 rather than even; set
`showNonword: true` (or delete the flag) in `items.js` to put it back.

The paper version counterbalanced which side of the page held the real word
(31 right, 32 left). That is irrelevant here — one word is shown at a time —
so it is not recorded.

## Running order

Reshuffled for every participant, so no two people see the same sequence.
The two members of a pair are never closer together than `minPairGap`
(default **12** trials), so nobody sees `ננהל` and `נההל` back to back.

The order is built greedily: at each position it picks at random among the
words whose partner is not among the last `minPairGap` already placed. A greedy
run can occasionally paint itself into a corner, so it just restarts; if the
requested gap were ever impossible it relaxes by one and tries again, and a
plain shuffle is the last resort.

The participant is told nothing about the length of the test: no trial counter,
no progress, no total, and the rest screens carry no numbers either.

## Editing the test

Everything experiment-facing lives in `items.js`:

- `generalInstructions` — the text on the second screen
- `readyText` — the text on the screen just before the first trial
- `breakText` — the text on the rest screens
- `fixationDurationMs` (500; set to `0` to drop the cross),
  `stimulusDurationMs` (**400**) and `blankDurationMs` (500)
- `minPairGap` (12)
- `breakEveryTrials` (**42** → two rest screens; set to `0` to run straight through)
- `wordLabel` / `nonwordLabel` — the button captions
- `pairs[]` — each with `id`, `condition`, `word`, `nonword`, and optionally
  `showWord: false` / `showNonword: false` to drop one member from the running
  order while keeping it on record as the partner's `pair_word`

`trial_number` is derived from the running order, so adding, removing or
reordering pairs needs no other change.

## Behaviour worth knowing

- **Timing.** Each trial runs fixation cross → word → buttons:

  ```
  +            500 ms   fixationDurationMs
  מבשלים       400 ms   stimulusDurationMs
  [buttons]    untimed  no deadline, no timeout
  (blank)      500 ms   blankDurationMs, then the next trial starts on its own
  ```

  The cross sits exactly where the word will appear, so the eye is already on
  the right spot. The gap between one answer and the next word is
  `blankDurationMs + fixationDurationMs` — 1000 ms as configured.
- **Button sides are fixed.** Green `מילה` is always on the right, red
  `לא מילה` always on the left, on every trial. The page is `dir="rtl"`, so the
  green button is simply written first in `index.html`.
- **Reaction time.** `rt_ms` is measured from the moment the buttons are painted
  to the tap, using `performance.now()`. Since the word is on screen for a fixed
  400 ms first, RT measured from word onset is `rt_ms + 400`. The clock is set
  synchronously and then refined on the next animation frame, so a phone that
  never delivers a frame (screen off, tab backgrounded) still records a real
  number rather than a stale one.
- **No going back.** Browser back is trapped for the duration of the test, and a
  reload prompts a confirmation. Participants get no feedback and never see a
  score.
- **Scoring.** `score` is 1 when `response` equals `is_word`, else 0. Both are
  stored, so you can always re-derive anything offline. There is no skip button:
  every trial gets one of the two answers.
- **Upload.** Each trial is posted as it completes, with retries. Anything that
  fails goes into a queue held in `localStorage` and is retried at the end of the
  session (and, if a session is abandoned, at the end of the next one). If it
  still fails, the end screen tells the participant to call the researcher; the
  **retry** and **download CSV** buttons are behind the researcher gate below.
  The CSV has the same 11 columns as the sheet.

## Where it is deployed

This copy lives in the personal site repo at `tools/ld/`, served as

```
https://yuvalzkatz.github.io/tools/ld/
```

Unlisted, exactly like Tashrish: nothing on the site links to it, and
`index.html` carries `<meta name="robots" content="noindex, nofollow,
noarchive">`. Anyone with the URL can open it. To make it harder to guess,
rename the folder — the app uses only relative paths.

## Running it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/ld/>. Set `WEB_APP_URL` to `''` in `config.js`
while piloting and nothing is uploaded; the CSV download is offered instead.

## Where the results go

Tab **`LD`** in the same private spreadsheet as Tashrish. Nothing on the server
had to change to add this task: the request carries its own tab name and column
list, and the tab's header row is written on the first upload. The tab must be
empty the first time data arrives — if row 1 already holds something, that row
becomes the authoritative column order.

The endpoint only appends. `doPost` writes a row, `doGet` returns nothing but
`{"status":"ok"}`, and there is no code path that reads the sheet back out, so
the URL cannot be used to see anyone's data. The script runs as you, so the
participant's Google account is never involved.

**The end-screen tools are gated.** The retry and CSV buttons show responses and
scores, so they are hidden behind the researcher gate: tap the "תודה רבה!"
heading **5 times**, then enter `RESEARCHER_CODE` from `config.js`. Or open the
test as `…/?researcher=<code>` and the panel appears by itself at the end. This
matters most on a shared lab phone — rows that failed to upload stay queued on
that device. The gate is a speed bump, not a secret: `config.js` is served to
the browser, so the code is readable in the page source.

## Sheet columns

```
timestamp | participant_name | trial_number | pair_id | condition | word |
is_word | pair_word | response | score | rt_ms
```

- `timestamp` — the participant's device local time, `YYYY-MM-DD HH:MM:SS`,
  captured when the trial is answered
- `trial_number` — 1–125, position in this participant's shuffled order
- `pair_id` — 1–63, the pair this word belongs to (both its trials share it)
- `word` — the string actually shown
- `is_word` — 1 real word, 0 non-word
- `pair_word` — the other member of the pair, carried along for convenience
- `response` — 1 the participant tapped green (מילה), 0 red (לא מילה)
- `score` — 1 correct, 0 incorrect
- `rt_ms` — milliseconds from the buttons appearing to the tap
