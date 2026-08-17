/**
 * ============================================================================
 *  Google Apps Script backend for Tashrish, and for any other task that wants
 *  to write into the same spreadsheet.
 *
 *  Paste this whole file into the Apps Script editor of your Google Sheet
 *  (Extensions -> Apps Script), then deploy it as a Web App.
 *  Full step-by-step instructions: README-apps-script.md
 *
 *  One endpoint serves every task. Each task posts its own tab name, so a new
 *  task needs no change here at all \u2014 just a different `sheet` in its config:
 *
 *    {
 *      "sheet":   "tashrish",          // tab to append to; created if missing
 *      "columns": ["timestamp", ...],  // header row, used only when creating
 *      "rows":    [ {...}, {...} ]     // one object per row, keyed by column
 *    }
 *
 *  If the tab already exists, its own header row decides the column order, so
 *  renaming or reordering columns in the sheet never breaks incoming data.
 * ============================================================================
 */

/** Used when a request does not name a tab. */
var DEFAULT_SHEET = 'tashrish';

/** Used when a tab has to be created and the request brought no column list. */
var DEFAULT_COLUMNS = [
  'timestamp',
  'participant_name',
  'block_number',
  'condition',
  'item_number_in_block',
  'item_type',
  'stimulus_1',
  'stimulus_2',
  'expected_answer',
  'raw_response',
  'score',
  'skipped'
];

/**
 * Receives one or more result rows and appends them to the right tab.
 * A single bare row object is also accepted.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return jsonOut({ status: 'error', message: 'busy' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ status: 'error', message: 'empty request' });
    }

    var body = JSON.parse(e.postData.contents);
    var rows = body && body.rows ? body.rows : [body];
    if (!Array.isArray(rows)) rows = [rows];
    if (rows.length === 0) return jsonOut({ status: 'ok', written: 0 });

    var name = sheetName_(body.sheet);
    var wanted = (Array.isArray(body.columns) && body.columns.length)
      ? body.columns
      : DEFAULT_COLUMNS;

    var sheet = getSheet_(name, wanted);
    var columns = headerRow_(sheet) || wanted;    // the sheet wins if it has one

    var values = rows.map(function (row) {
      return columns.map(function (key) {
        var v = row[key];
        return (v === undefined || v === null) ? '' : v;
      });
    });

    sheet
      .getRange(sheet.getLastRow() + 1, 1, values.length, columns.length)
      .setValues(values);

    return jsonOut({ status: 'ok', sheet: name, written: values.length });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Lets you check the deployment is alive by opening the URL in a browser. */
function doGet() {
  return jsonOut({ status: 'ok', message: 'tashrish endpoint is alive' });
}

/** Keeps a posted tab name to something Google Sheets will accept. */
function sheetName_(raw) {
  var name = String(raw === undefined || raw === null ? '' : raw)
    .replace(/[\[\]\*\?\/\\:]/g, '')
    .trim()
    .slice(0, 80);
  return name || DEFAULT_SHEET;
}

/** Returns the tab, creating it with a header row if it does not exist yet. */
function getSheet_(name, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    sheet.getRange(1, 1, 1, columns.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/** The tab's existing header row, or null if the tab is empty. */
function headerRow_(sheet) {
  if (sheet.getLastRow() === 0) return null;
  var width = sheet.getLastColumn();
  if (!width) return null;
  var head = sheet.getRange(1, 1, 1, width).getValues()[0];
  while (head.length && head[head.length - 1] === '') head.pop();
  return head.length ? head : null;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Optional: run this once from the editor (Run -> testAppend) to confirm the
 * script can write to the sheet and to trigger the authorisation prompt.
 */
function testAppend() {
  var sheet = getSheet_(DEFAULT_SHEET, DEFAULT_COLUMNS);
  sheet.appendRow([
    'TEST', '\u05D1\u05D3\u05D9\u05E7\u05D4', 0, 0, 0, 'verb',
    '\u05D0', '\u05D1', '\u05D2', '\u05D2', 1, 0
  ]);
}
