/**
 * ============================================================================
 *  Google Apps Script backend for Tashrish.
 *  Paste this whole file into the Apps Script editor of your Google Sheet
 *  (Extensions -> Apps Script), then deploy it as a Web App.
 *  Full step-by-step instructions: README-apps-script.md
 * ============================================================================
 */

/** Name of the tab inside the spreadsheet. Created automatically if missing. */
var SHEET_NAME = 'results';

var HEADERS = [
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
 * Receives one or more result rows from the web app and appends them.
 * Expected body: {"rows": [ {timestamp: ..., participant_name: ...}, ... ]}
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

    var sheet = getSheet_();

    var values = rows.map(function (row) {
      return HEADERS.map(function (key) {
        var v = row[key];
        return (v === undefined || v === null) ? '' : v;
      });
    });

    sheet
      .getRange(sheet.getLastRow() + 1, 1, values.length, HEADERS.length)
      .setValues(values);

    return jsonOut({ status: 'ok', written: values.length });
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

/** Returns the results sheet, creating it (with a header row) if needed. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
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
  var sheet = getSheet_();
  sheet.appendRow([
    'TEST', '\u05D1\u05D3\u05D9\u05E7\u05D4', 0, 0, 0, 'verb', '\u05D0', '\u05D1', '\u05D2', '\u05D2', 1, 0
  ]);
}
