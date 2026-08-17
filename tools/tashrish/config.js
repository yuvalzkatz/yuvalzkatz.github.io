/*
 * ============================================================================
 *  CONFIG — paste your Google Apps Script Web App URL here.
 * ============================================================================
 *
 *  1. Follow the steps in apps-script/README-apps-script.md
 *  2. Copy the deployment URL. It looks like:
 *       https://script.google.com/macros/s/AKfycb....../exec
 *  3. Paste it between the quotes below.
 *
 *  If this is left empty the test still runs normally, but nothing is sent
 *  anywhere and the CSV download button is shown at the end.
 * ============================================================================
 */

const CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzuu6-RjbdMloIvcjYdj9q3Z2w1ERzubcAUXhRMrHofT0rUjhabpbyhZBMYL73MXLaxfQ/exec',

  /*
   *  Which tab inside the spreadsheet this task writes to. The tab is created
   *  with the right header row the first time data arrives. A second task can
   *  reuse the same WEB_APP_URL with a different name here, and its results
   *  land in their own tab.
   */
  SHEET_NAME: 'tashrish',

  /*
   *  Researcher code. The end screen shows the participant nothing but a
   *  thank-you. To reach the retry / CSV-download buttons — which do show
   *  responses and scores — tap the "תודה רבה!" heading 5 times and enter this
   *  code, or open the test as  index.html?researcher=<code>
   *
   *  Change it from the default. Setting it to '' removes the code prompt
   *  (5 taps alone then unlock the panel), which is not recommended.
   */
  RESEARCHER_CODE: '4726',

  /* Retry attempts for each individual post before it goes into the queue. */
  postRetries: 2
};
