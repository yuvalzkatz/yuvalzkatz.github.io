/*
 * ============================================================================
 *  CONFIG — the same Apps Script Web App as Tashrish, a different tab.
 * ============================================================================
 *
 *  One endpoint serves every task: the request names its own tab and columns,
 *  and the tab is created on the first upload. So this file is the only place
 *  that differs between tasks, and nothing has to change on the server.
 *
 *  If WEB_APP_URL is left empty the test still runs normally, but nothing is
 *  sent anywhere and only the CSV download is offered at the end.
 * ============================================================================
 */

const CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzuu6-RjbdMloIvcjYdj9q3Z2w1ERzubcAUXhRMrHofT0rUjhabpbyhZBMYL73MXLaxfQ/exec',

  /*
   *  Which tab inside the spreadsheet this task writes to. Must be empty (or
   *  absent) the first time data arrives — the header row is written then, and
   *  from that point on the sheet's own header decides the column order.
   */
  SHEET_NAME: 'LD',

  /*
   *  Researcher code. The end screen shows the participant nothing but a
   *  thank-you. To reach the retry / CSV-download buttons — which do show
   *  responses and scores — tap the "תודה רבה!" heading 5 times and enter this
   *  code, or open the test as  index.html?researcher=<code>
   *
   *  Setting it to '' removes the code prompt (5 taps alone then unlock the
   *  panel), which is not recommended.
   */
  RESEARCHER_CODE: '4726',

  /* Retry attempts for each individual post before it goes into the queue. */
  postRetries: 2
};
