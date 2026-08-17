# Tashrish · תשריש

A Hebrew morphology test (lexical decision / root extraction).

A mobile-first, framework-free web app. Participants open it on their phone,
type their name, and work through 6 blocks × 5 items. Each item shows two
Hebrew words for exactly 2000 ms; the participant then types the root of the
second word in the template of the first. Results go to a private Google Sheet,
one row per item.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole UI — one section per screen |
| `styles.css` | Mobile-first styling, RTL, light + dark |
| `app.js` | Flow, timing, scoring, upload queue, CSV fallback |
| **`items.js`** | **The data file — stimuli, expected answers, block order, instruction texts, timings.** This is the only file you need to touch to change the test. |
| `config.js` | One line: your Apps Script Web App URL |
| `sw.js` | Service worker — lets the test open and run with no connection |
| `apps-script/Code.gs` | The `doPost` backend to paste into Apps Script |
| `apps-script/README-apps-script.md` | Step-by-step deployment of the backend |

## Setup

1. Deploy the backend and paste the URL into `config.js` — see
   [`apps-script/README-apps-script.md`](apps-script/README-apps-script.md).
2. Deploy this folder as a static site (below).
3. Send participants the URL.

If `WEB_APP_URL` is left empty the test still runs end to end; at the end it
just offers a CSV download instead of uploading. Useful for piloting.

## Running it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Opening `index.html` straight from disk
also works, but a local server matches the real conditions more closely.)

## Deploying

All three options serve this folder as-is; there is no build step.

**Netlify** — drag the folder onto <https://app.netlify.com/drop>, or connect
the repo and set: build command *empty*, publish directory `.`.

**Vercel** — `vercel deploy` in this folder, or import the repo and choose the
"Other" framework preset with no build command.

**GitHub Pages** — push the folder to a repo, then Settings → Pages → Source:
*Deploy from a branch* → branch `main`, folder `/ (root)`. If it lives in a
subfolder of your website repo, put it in `/docs` or a subdirectory and use
that path; the app has no absolute paths, so any subdirectory works.

## Editing the test

Everything experiment-facing lives in `items.js`:

- `generalInstructions` — the text on the second screen
- `stimulusDurationMs` (2000) and `blankDurationMs` (1000)
- `blocks[]` — each with `block_number`, `condition`, `instructions`, `items[]`
- each item — `type` (`verb`/`noun`), `s1`, `s2`, `expected`

`item_number_in_block` is derived from position, so adding, removing or
reordering items needs no other change. Blocks run in the array's order; there
is no randomisation anywhere.

## Behaviour worth knowing

- **Timing.** Stimuli show for exactly `stimulusDurationMs`, then the input
  appears. Answering is untimed. After submit or skip the screen goes blank for
  `blankDurationMs` and the next trial starts on its own — no tap needed.
- **No autocorrect.** The answer field sets `autocorrect`, `autocapitalize`,
  `autocomplete` and `spellcheck` all off, plus password-manager opt-outs, so
  nonce answers are not silently rewritten by the phone.
- **No going back.** Browser back is trapped for the duration of the test, and
  a reload prompts a confirmation. Participants get no feedback and never see a
  score.
- **Scoring.** Strict exact match after trimming whitespace, collapsing inner
  spaces, NFC-normalising, and stripping niqqud (U+0591–U+05C7) and invisible
  direction marks. 1 or 0. Skipped items score 0 and set `skipped = 1`. The raw
  typed string is stored verbatim alongside the score, so you can always
  re-score offline with looser criteria.
- **Upload.** Each trial is posted as it completes, with retries. Anything that
  fails goes into a queue held in `localStorage` and is retried at the end of
  the session (and, if a session is abandoned, at the end of the next one). If
  it still fails, the end screen tells the participant to call the researcher;
  the **retry** and **download CSV** buttons themselves are behind the
  researcher gate described below. The CSV has the same 12 columns as the sheet.

## Where it is deployed

This copy lives in the personal site repo at
`tools/tashrish/`, served as

```
https://yuvalzkatz.github.io/tools/tashrish/
```

It is **unlisted, not protected**: nothing on the site links to it, and
`index.html` carries `<meta name="robots" content="noindex, nofollow,
noarchive">` so search engines that do stumble on it will not list it. Anyone
who has the URL can open it — that is the intended level of access. If you ever
need it to be harder to guess, rename the folder to something unguessable
(`tools/tashrish-7f3a91/`); the app uses only relative paths, so nothing else has to
change.

## Working offline

The test does not need a live connection while it runs:

- `sw.js` caches the app on first load, so after a participant has opened it
  once the page starts even with no signal. The strategy is network-first, so
  an online phone always gets the current `items.js` — no cache-busting, no
  version bumping when you edit stimuli.
- Results are queued in `localStorage` if a post fails, and go out when the
  connection returns (`online` event), at the end of the session, and on the
  next page load on that device. Rows in flight are tracked so a reconnect
  cannot send the same row twice.
- What still needs a connection: the very first load on a given phone, and of
  course the upload itself, eventually.

## Who can see the results

Only you. The results live in one Google Sheet in your Drive, shared with
nobody, and participants never get read access to it:

- The phone only knows the `/exec` URL, and that endpoint **only appends**.
  `doPost` writes a row; `doGet` returns nothing but `{"status":"ok"}`. There is
  no code path that reads the sheet back out, so the URL cannot be used to see
  anyone's data — not even the participant's own.
- The script runs **as you** ("Execute as: Me"), so the participant's Google
  account is never involved and needs no permissions.
- Participants get no feedback and no score at any point, and the end screen is
  a bare thank-you.

Two details worth knowing:

- **The end-screen tools are gated.** The retry and CSV-download buttons do show
  responses and scores, so they are hidden behind a researcher gate: tap the
  "תודה רבה!" heading **5 times**, then enter `RESEARCHER_CODE` from
  `config.js`. Or open the test as `…/index.html?researcher=<code>` — the panel
  then appears by itself at the end. Change the code from its default.
  This matters most on a shared lab phone: rows that failed to upload stay
  queued on that device, so without the gate a later participant could have
  downloaded an earlier one's data. Note the gate is a speed bump, not a
  secret — `config.js` is served to the browser, so the code is readable by
  anyone who opens the page source. It stops a curious participant tapping
  around, not a determined one.
- **The URL is visible in the page source**, so a determined participant could
  post junk rows to your sheet. They still cannot read anything. If a row ever
  looks like noise, it will be obvious — a real row always carries a
  participant name you handed out, and the block/item numbers line up with the
  fixed item list. Locking this down further would require a secret in the
  client code, which would be just as visible, so it buys nothing.

To get the results onto your own machine as Excel: **File → Download →
Microsoft Excel (.xlsx)** from the spreadsheet.

The script asks for a single permission, `spreadsheets.currentonly` — *this
spreadsheet only*, no access to anything else in your Drive. It is pinned in
`apps-script/appsscript.json`.

If you would rather the data never touched Google, the alternative is running a
small local server that writes a CSV on your own machine — but then the phones
must reach your machine, which means it cannot be a plain static site. The
Sheet approach is simpler and equally private.

## Sheet columns

```
timestamp | participant_name | block_number | condition | item_number_in_block |
item_type | stimulus_1 | stimulus_2 | expected_answer | raw_response | score | skipped
```

`timestamp` is the participant's device local time, `YYYY-MM-DD HH:MM:SS`,
captured when the trial is answered.
