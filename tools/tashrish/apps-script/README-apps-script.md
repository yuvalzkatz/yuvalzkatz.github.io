# Connecting the test to your Google Sheet

Do this once. It takes about five minutes. Nothing here puts a key or a secret
into the participant-facing code — the browser only ever knows a URL that is
allowed to *append* rows, and never gets read access to the spreadsheet.

## 1. Create the spreadsheet

1. Go to <https://sheets.google.com> and create a new blank spreadsheet.
2. Name it something like `Tashrish — results`.
3. Leave it as is. The script creates the `results` tab and the header row
   itself the first time data arrives.

A new spreadsheet is **private by default** — only the account that created it
can open it. There is nothing to configure; just never share it. To check:
**Share** → "General access" must read **Restricted**, with only your address
listed. Two things to watch:

- **Which account you are signed in as.** The sheet belongs to that account, and
  that is also the account the script will run as. On an institutional account
  a domain administrator can technically reach your files; use a personal
  account if that matters to you.
- **Create it in "My Drive", not in a Shared Drive.** Anything inside a Shared
  Drive is visible to every member of that drive even if you never shared it.

The "Anyone" you will pick in step 4 is a different setting entirely: it lets
anyone *call the script*, not read the sheet.

## 2. Add the script

1. In that spreadsheet: **Extensions → Apps Script**.
2. Delete whatever is in `Code.gs` in the editor.
3. Open `apps-script/Code.gs` from this repo, copy the whole file, paste it in.
4. Click the save icon (or ⌘S).
5. Pin the permissions: gear icon (**Project Settings**) → tick **"Show
   'appsscript.json' manifest file in editor"**. Go back to the editor, open
   `appsscript.json`, and replace its contents with `apps-script/appsscript.json`
   from this repo. Save. See [Permissions](#permissions) below for why.

All the Hebrew in `Code.gs` is written as `\uXXXX` escapes, so the file is pure
ASCII and survives any copy-paste route without turning into mojibake.

## 3. Authorise it (optional but recommended)

1. In the toolbar's function dropdown pick `testAppend`, then click **Run**.
2. Google asks for permission. Choose your account → **Advanced** →
   **Go to <project name> (unsafe)** → **Allow**.
   (The "unsafe" wording is what Google shows for any personal, unverified
   script. It is your own script, writing to your own sheet.)
3. Check the spreadsheet: a `results` tab now exists with a header row and one
   `TEST` row. Delete that test row once you have seen it.

## 4. Deploy as a Web App

1. Top right: **Deploy → New deployment**.
2. Click the gear next to "Select type" and pick **Web app**.
3. Fill in:
   - **Description**: `tashrish endpoint`
   - **Execute as**: **Me (your@gmail.com)** ← this is what keeps the sheet private
   - **Who has access**: **Anyone**
4. **Deploy**, then **Authorize access** if prompted.
5. Copy the **Web app URL**. It looks like:

   ```
   https://script.google.com/macros/s/AKfycb.................../exec
   ```

> **"Execute as: Me" + "Who has access: Anyone"** is the correct combination.
> "Anyone" means anyone can *call the script*; the script then runs under your
> account and only ever appends rows. Nobody can read the sheet through it.
> If you set "Who has access" to anything else, participants' phones will get a
> Google login page instead of your script and no data will be saved.

## 5. Paste the URL into the app

Open `config.js` in this repo and put the URL between the quotes:

```js
const CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycb.................../exec',
  postRetries: 2
};
```

Redeploy the site (Netlify/Vercel/GitHub Pages) after changing it.

## 6. Check it works

1. Open the deployment URL in a browser. You should see
   `{"status":"ok","message":"tashrish endpoint is alive"}`.
2. Run the test yourself on a phone with the name `pilot`, answer a couple of
   items, and confirm rows appear in the sheet within a second or two.

## Getting the results as an Excel file

**File → Download → Microsoft Excel (.xlsx)** from the spreadsheet. That is the
whole procedure, and it costs no permissions at all.

An earlier version of this script could email you the `.xlsx` on a schedule.
That was removed on purpose: emailing required "send email as you", "connect to
an external service", and — the deal-breaker — Google's *broad* Sheets scope,
which covers every spreadsheet in the account rather than just this one. A
weekly click on File → Download is a better trade.

## Adding a second task later

One deployment serves every task you build. Each request names the tab it wants:

```json
{ "sheet": "task2", "columns": ["timestamp", "..."], "rows": [ { } ] }
```

So a new task needs **no change to this script and no new deployment** — copy the
app folder, and in its `config.js` keep the same `WEB_APP_URL` but set a
different `SHEET_NAME`. The tab is created with that task's own header row the
first time data arrives, and may have completely different columns.

If the tab already exists, its header row decides the column order, so
reordering columns in the sheet by hand never breaks incoming data. Keys that do
not match any header are dropped.

## Permissions

`appsscript.json` pins the script to exactly one scope:

```json
"oauthScopes": ["https://www.googleapis.com/auth/spreadsheets.currentonly"]
```

`spreadsheets.currentonly` means *this spreadsheet only* — the script cannot
see, open or touch any other file in your Drive. That is why the consent screen
should read **"View and manage the spreadsheet this application is bound to"**
and nothing else. If you are ever asked for more than that line, stop: something
in the script is reaching beyond the sheet.

## Changing the script later

Every time you edit `Code.gs` you must **Deploy → Manage deployments → edit
(pencil) → Version: New version → Deploy**. The URL stays the same. If you
instead create a *new deployment* you get a *new URL* and must update
`config.js` again.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Participant sees "לא הצלחנו לשלוח את הנתונים" | URL wrong, or deployment access is not "Anyone" | Re-check step 4; open the URL in a private browser window — you must see the JSON, not a login page |
| Rows appear but Hebrew is garbled | You opened the CSV export in Excel without the BOM | The app's CSV already includes a BOM; in Sheets use File → Import |
| Nothing arrives and the browser console shows a CORS error | The deployment is set to "Only myself" | Redeploy with "Anyone" |
| Data arrives twice for one trial | A participant reloaded mid-session and the queued rows were resent | Deduplicate on `participant_name` + `timestamp` in your analysis |
