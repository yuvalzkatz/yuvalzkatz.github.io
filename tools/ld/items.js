/*
 * ============================================================================
 *  DATA FILE - the only file you need to edit to change the test.
 * ============================================================================
 *
 *  TEST_DATA.pairs = [ pair, pair, ... ]
 *
 *  Each pair:
 *    id        : pair number, written to the sheet as `pair_id`
 *    condition : how the non-word was built --
 *                  "doubling"      -- a doubled letter migrates  (ננהל -> נההל)
 *                  "transposition" -- two letters swap           (מטונפים -> מטופנים)
 *                  "morphological" -- wrong affix / inflection   (קטנטן -> קטנטנום)
 *    word      : the real Hebrew word
 *    nonword   : its matched non-word
 *
 *  Optional, to drop one member of a pair without losing the record of what it
 *  was paired with:
 *    showWord: false     -- do not present the real word
 *    showNonword: false  -- do not present the non-word
 *  The hidden string is still written to the sheet as `pair_word` on its
 *  partner's row.
 *
 *  Every pair contributes two trials, one per member, minus any that are
 *  switched off above. The order is reshuffled for each participant, with the
 *  two members of a pair kept at least `minPairGap` trials apart.
 * ============================================================================
 */

const TEST_DATA = {
  /* Text shown on the general instructions screen (screen 2). */
  generalInstructions:
    'בכל פריט תוצג על המסך מילה אחת, למשך זמן קצר מאוד.\n' +
    'מיד אחרי שהמילה תיעלם יופיעו שני כפתורים.\n' +
    'אם המילה שראיתם קיימת בעברית - לחצו על הכפתור הירוק, מימין.\n' +
    'אם המילה איננה קיימת בעברית - לחצו על הכפתור האדום, משמאל.\n' +
    'השתדלו להשיב מהר ככל האפשר, אבל לדייק.\n' +
    'אי אפשר לראות את המילה שוב, ואי אפשר לחזור אחורה.',

  /* Text shown on the last screen before the first trial. */
  readyText: 'המבחן מתחיל עכשיו.',

  /* How long the fixation cross (+) shows before each word, in milliseconds.
     Set to 0 to drop the cross and go straight to the word. */
  fixationDurationMs: 500,

  /* How long each word stays on screen, in milliseconds. */
  stimulusDurationMs: 400,

  /* How long the screen stays blank between trials, in milliseconds. This runs
     before the next trial's fixation cross, so the gap between one answer and
     the next word is blankDurationMs + fixationDurationMs. */
  blankDurationMs: 500,

  /* Minimum number of trials between the two members of the same pair. */
  minPairGap: 12,

  /* Offer a rest screen every N trials. Set to 0 to run straight through. */
  breakEveryTrials: 42,

  /* Text on the rest screen. Says nothing about how far along the test is. */
  breakText:
    'אפשר לנוח רגע.\n' +
    'כשתהיו מוכנים, המשיכו באותו אופן: ירוק מימין אם זו מילה בעברית, אדום משמאל אם לא.',

  /* Labels on the two response buttons. */
  wordLabel: 'מילה',
  nonwordLabel: 'לא מילה',

  pairs: [
    { id:  1, condition: 'transposition',  word: 'מטונפים',  nonword: 'מטופנים'   },
    { id:  2, condition: 'doubling',       word: 'מחטטים',   nonword: 'מחחטים'    },
    { id:  3, condition: 'doubling',       word: 'ננצל',     nonword: 'נצצל'      },
    { id:  4, condition: 'transposition',  word: 'מקצרים',   nonword: 'מרקצים'    },
    { id:  5, condition: 'doubling',       word: 'תתחתן',    nonword: 'תחחתן'     },
    { id:  6, condition: 'morphological',  word: 'השתעבד',   nonword: 'ישתעבדום'  },
    { id:  7, condition: 'morphological',  word: 'יתווכחו',  nonword: 'יתווכחים'  },
    { id:  8, condition: 'morphological',  word: 'קטנטן',    nonword: 'קטנטנום'   },
    { id:  9, condition: 'doubling',       word: 'תתקדמו',   nonword: 'תקקדמו'    },
    { id: 10, condition: 'doubling',       word: 'תתקלקל',   nonword: 'תקקלקל'    },
    { id: 11, condition: 'transposition',  word: 'התכנסו',   nonword: 'הכתנסו'    },
    { id: 12, condition: 'transposition',  word: 'מצולעים',  nonword: 'מצועלים'   },
    { id: 13, condition: 'morphological',  word: 'יתבוננו',  nonword: 'נתבוננת'   },
    { id: 14, condition: 'doubling',       word: 'ננהל',     nonword: 'נההל'      },
    { id: 15, condition: 'transposition',  word: 'מפלצתיים', nonword: 'מלפצתיים'  },
    { id: 16, condition: 'transposition',  word: 'להתפצל',   nonword: 'להתצפל'    },
    { id: 17, condition: 'doubling',       word: 'ללכת',     nonword: 'לככת'      },
    { id: 18, condition: 'doubling',       word: 'ללטף',     nonword: 'לטטף'      },
    { id: 19, condition: 'transposition',  word: 'התפרע',    nonword: 'התרפע'     },
    { id: 20, condition: 'transposition',  word: 'התנחלות',  nonword: 'התחנלות'   },
    { id: 21, condition: 'doubling',       word: 'מעלליה',   nonword: 'מעעליה'    },
    { id: 22, condition: 'doubling',       word: 'תתבלבל',   nonword: 'תבבלבל'    },
    { id: 23, condition: 'morphological',  word: 'מאיר',     nonword: 'יאירתם'    },
    { id: 24, condition: 'doubling',       word: 'תתבצע',    nonword: 'תבבצע'     },
    /* מלשבים is dropped from the running order; מבשלים is still shown. */
    { id: 25, condition: 'transposition',  word: 'מבשלים',   nonword: 'מלשבים',   showNonword: false },
    { id: 26, condition: 'transposition',  word: 'ישתבש',    nonword: 'יתבשש'     },
    { id: 27, condition: 'transposition',  word: 'נשתמע',    nonword: 'נשמתע'     },
    { id: 28, condition: 'doubling',       word: 'התחנן',    nonword: 'התחחן'     },
    { id: 29, condition: 'morphological',  word: 'משתוללת',  nonword: 'נשתוללת'   },
    { id: 30, condition: 'doubling',       word: 'התעלל',    nonword: 'התעעל'     },
    { id: 31, condition: 'transposition',  word: 'נשמעו',    nonword: 'נמשעו'     },
    { id: 32, condition: 'transposition',  word: 'הוקדשה',   nonword: 'הוקשדה'    },
    { id: 33, condition: 'doubling',       word: 'תתכונן',   nonword: 'תככונן'    },
    { id: 34, condition: 'doubling',       word: 'תתנוצץ',   nonword: 'תננוצץ'    },
    { id: 35, condition: 'transposition',  word: 'עצבניים',  nonword: 'עבצניים'   },
    { id: 36, condition: 'morphological',  word: 'ילמדו',    nonword: 'ילמדונים'  },
    { id: 37, condition: 'morphological',  word: 'תתחלפנה',  nonword: 'תתחלפונו'  },
    { id: 38, condition: 'doubling',       word: 'תתפרע',    nonword: 'תפפרע'     },
    { id: 39, condition: 'doubling',       word: 'ללבלב',    nonword: 'לבבלב'     },
    { id: 40, condition: 'transposition',  word: 'השתקפות',  nonword: 'השקתפות'   },
    { id: 41, condition: 'morphological',  word: 'הלבינו',   nonword: 'התלבנון'   },
    { id: 42, condition: 'morphological',  word: 'תטפלנה',   nonword: 'טופלנה'    },
    { id: 43, condition: 'morphological',  word: 'צלצלו',    nonword: 'מתצלצלך'   },
    { id: 44, condition: 'doubling',       word: 'מקלל',     nonword: 'מקקל'      },
    { id: 45, condition: 'morphological',  word: 'התקוטט',   nonword: 'להתקוטטו'  },
    { id: 46, condition: 'transposition',  word: 'לנטוש',    nonword: 'לטנוש'     },
    { id: 47, condition: 'doubling',       word: 'ממריץ',    nonword: 'מרריץ'     },
    { id: 48, condition: 'transposition',  word: 'מעולפים',  nonword: 'מעופלים'   },
    { id: 49, condition: 'transposition',  word: 'משתלטים',  nonword: 'משלתטים'   },
    { id: 50, condition: 'transposition',  word: 'מושלמים',  nonword: 'מולשמים'   },
    { id: 51, condition: 'morphological',  word: 'תשרוקנה',  nonword: 'תשרוקתן'   },
    { id: 52, condition: 'doubling',       word: 'תתפקע',    nonword: 'תפפקע'     },
    { id: 53, condition: 'morphological',  word: 'התחילה',   nonword: 'נתחלוה'    },
    { id: 54, condition: 'doubling',       word: 'ללדת',     nonword: 'לדדת'      },
    { id: 55, condition: 'morphological',  word: 'התבטל',    nonword: 'מתבטלה'    },
    { id: 56, condition: 'morphological',  word: 'מסתדרים',  nonword: 'להסתדרם'   },
    { id: 57, condition: 'doubling',       word: 'ישננו',    nonword: 'יששנו'     },
    { id: 58, condition: 'transposition',  word: 'יבלעו',    nonword: 'ילבעו'     },
    { id: 59, condition: 'morphological',  word: 'התבלבלה',  nonword: 'תתבלבלה'   },
    { id: 60, condition: 'transposition',  word: 'יתבהרו',   nonword: 'יתהברו'    },
    { id: 61, condition: 'doubling',       word: 'נתפלל',    nonword: 'נתפפל'     },
    { id: 62, condition: 'morphological',  word: 'חצויים',   nonword: 'נחצום'     },
    { id: 63, condition: 'doubling',       word: 'ננגן',     nonword: 'נגגן'      },
  ]
};
