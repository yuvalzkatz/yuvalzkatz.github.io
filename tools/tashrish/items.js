/*
 * ============================================================================
 *  DATA FILE — this is the only file you need to edit to change the test.
 * ============================================================================
 *
 *  Structure:
 *    TEST_DATA.blocks = [ block, block, ... ]   // presented in this exact order
 *
 *  Each block:
 *    block_number : number shown in the data file (written to the sheet)
 *    condition    : 1 | 2 | 3  (written to the sheet)
 *    instructions : the text shown on the block's instruction screen.
 *                   Use "\n" to break lines.
 *    items        : array of items, presented in this exact order
 *
 *  Each item:
 *    type      : "verb" or "noun"   -> column item_type
 *    s1        : first  word shown (fixes the template / binyan / mishkal)
 *    s2        : second word shown (supplies the root)
 *    expected  : the expected answer (strict exact match, after trimming
 *                whitespace and stripping niqqud)
 *
 *  item_number_in_block is derived automatically from the position in `items`
 *  (1-based), so you can add / remove / reorder items freely.
 * ============================================================================
 */

const TEST_DATA = {
  /* Text shown on the general instructions screen (screen 2). */
  generalInstructions:
    'בכל פריט יוצגו על המסך שתי מילים, למשך שתי שניות בלבד.\n' +
    'המילה הראשונה קובעת את התבנית, כלומר את הבניין או המשקל.\n' +
    'המילה השנייה קובעת את השורש.\n' +
    'יש ליצור מילה חדשה: לחלץ את השורש של המילה השנייה, ולשבץ אותו בתבנית של המילה הראשונה.\n' +
    'אחרי שהמילים ייעלמו יופיע חלון הקלדה. אין הגבלת זמן לתשובה, אבל אי אפשר לראות את המילים שוב.\n' +
    'אם אינכם יודעים, אפשר לדלג.',

  /* How long the two stimulus words stay on screen, in milliseconds. */
  stimulusDurationMs: 2000,

  /* How long the screen stays blank between trials, in milliseconds. */
  blankDurationMs: 1000,

  blocks: [
    {
      block_number: 1,
      condition: 1,
      instructions:
        'בשלב הזה כל המילים שתיצרו הן מילים אמיתיות בעברית.\n' +
        'דוגמה: השלים, צעדים ← הצעיד',
      items: [
        { type: 'verb', s1: 'הכניס',  s2: 'רקד',      expected: 'הרקיד' },
        { type: 'noun', s1: 'מפסק',   s2: 'גיהץ',     expected: 'מגהץ' },
        { type: 'verb', s1: 'נרדם',   s2: 'תעלומה',   expected: 'נעלם' },
        { type: 'noun', s1: 'מברשת',  s2: 'גבעה',     expected: 'מגבעת' },
        { type: 'verb', s1: 'התחמם',  s2: 'זקנים',    expected: 'הזדקן' }
      ]
    },
    {
      block_number: 2,
      condition: 2,
      instructions:
        'בשלב הזה השורש קיים בעברית, אבל המילה שתיווצר איננה מילה אמיתית. זה בסדר, צרו אותה לפי אותו כלל.\n' +
        'דוגמה: השלים, פנסים ← הפניס',
      items: [
        { type: 'verb', s1: 'הרקיד',  s2: 'נשק',      expected: 'הנשיק' },
        { type: 'noun', s1: 'מסננת',  s2: 'ספוג',     expected: 'מספגת' },
        { type: 'verb', s1: 'נעלם',   s2: 'סיבוב',    expected: 'נסבב' },
        { type: 'noun', s1: 'תחבושת', s2: 'מקלדת',    expected: 'תקלודת' },
        { type: 'verb', s1: 'התקרר',  s2: 'זרוע',     expected: 'הזדרע' }
      ]
    },
    {
      block_number: 3,
      condition: 3,
      instructions:
        'בשלב הזה גם השורש איננו קיים בעברית, וגם המילה שתיווצר איננה מילה אמיתית.\n' +
        'דוגמה: השלים, פשגים ← הפשיג',
      items: [
        { type: 'verb', s1: 'הוציא',  s2: 'פנג',      expected: 'הפניג' },
        { type: 'noun', s1: 'משקולת', s2: 'פשד',      expected: 'מפשודת' },
        { type: 'verb', s1: 'נאבק',   s2: 'למיגה',    expected: 'נלמג' },
        { type: 'noun', s1: 'תרשומת', s2: 'פניגות',   expected: 'תפנוגת' },
        { type: 'verb', s1: 'התמרח',  s2: 'זבע',      expected: 'הזדבע' }
      ]
    },
    {
      block_number: 4,
      condition: 1,
      instructions: 'עכשיו שוב כל המילים שתיצרו הן מילים אמיתיות בעברית.',
      items: [
        { type: 'verb', s1: 'הרתיח',  s2: 'קפא',      expected: 'הקפיא' },
        { type: 'noun', s1: 'מחשבה',  s2: 'טחנו',     expected: 'מטחנה' },
        { type: 'verb', s1: 'התלבט',  s2: 'תשלום',    expected: 'השתלם' },
        { type: 'noun', s1: 'קליפה',  s2: 'מאכלים',   expected: 'אכילה' },
        { type: 'noun', s1: 'גלשן',   s2: 'הרעשתם',   expected: 'רעשן' }
      ]
    },
    {
      block_number: 5,
      condition: 2,
      instructions: 'עכשיו שוב השורש קיים בעברית, אבל המילה שתיווצר איננה מילה אמיתית.',
      items: [
        { type: 'verb', s1: 'החמיא',      s2: 'מנע',     expected: 'המניע' },
        { type: 'noun', s1: 'מחשבה',      s2: 'הצליח',   expected: 'מצלחה' },
        { type: 'verb', s1: 'התברג',      s2: 'שבירה',   expected: 'השתבר' },
        { type: 'noun', s1: 'מסעדות',     s2: 'למידה',   expected: 'מלמדות' },
        { type: 'noun', s1: 'סביבונינו',  s2: 'כסף',     expected: 'כסיפונינו' }
      ]
    },
    {
      block_number: 6,
      condition: 3,
      instructions: 'עכשיו שוב גם השורש איננו קיים בעברית וגם המילה שתיווצר איננה מילה אמיתית.',
      items: [
        { type: 'verb', s1: 'הריח',        s2: 'פדא',       expected: 'הפדיא' },
        { type: 'noun', s1: 'מברגותיהם',   s2: 'רמג',       expected: 'מרמגותיהם' },
        { type: 'verb', s1: 'התברג',       s2: 'תשמוגת',    expected: 'השתמג' },
        { type: 'noun', s1: 'תשלומים',     s2: 'הזדנגות',   expected: 'תזנוגים' },
        { type: 'verb', s1: 'התפעלות',     s2: 'שלסנו',     expected: 'השתלסות' }
      ]
    }
  ]
};
