/**
 * Typo-tolerance focused test harness.
 */

import { getIntentMatch, getResponse } from "./intents.js";
import { getKnowledgeMatch } from "./knowledge.js";
import { SCORE_BOOSTS } from "./score-boosts.js";

const R = SCORE_BOOSTS.routing;

const STYLE = {
  section: "font-weight: 800; letter-spacing: .05em;",
  pass: "color: #16a34a; font-weight: 800;",
  fail: "color: #dc2626; font-weight: 800;",
  label: "color: #334155; font-weight: 700;",
  muted: "color: #64748b;",
};

const TEST_CATEGORIES = [
  {
    key: "exact",
    name: "1. EXACT MATCH TESTS",
    cases: [
      { input: "hello", expectedType: "intent", expectedKey: "greeting" },
      { input: "sup", expectedType: "intent", expectedKey: "small_talk" },
      { input: "make me laugh", expectedType: "intent", expectedKey: "jokes" },
      { input: "good job", expectedType: "intent", expectedKey: "positive_feedback" },
      { input: "well done", expectedType: "intent", expectedKey: "positive_feedback" },
      { input: "perfect", expectedType: "intent", expectedKey: "positive_feedback" },
    ],
  },
  {
    key: "typo",
    name: "2. TYPO TESTS (LIGHT)",
    cases: [
      { input: "make me laugg", expectedType: "intent", expectedKey: "jokes" },
      { input: "make me laff", expectedType: "intent", expectedKey: "jokes" },
      { input: "make me laug", expectedType: "intent", expectedKey: "jokes" },
      { input: "helo", expectedType: "intent", expectedKey: "greeting" },
      { input: "perfct", expectedType: "intent", expectedKey: "positive_feedback" },
    ],
  },
  {
    key: "extremeTypo",
    name: "3. TYPO TESTS (EXTREME)",
    cases: [
      { input: "make me lgh", expectedType: "intent", expectedKey: "unknown" },
      { input: "h", expectedType: "intent", expectedKey: "unknown" },
    ],
  },
  {
    key: "missingWord",
    name: "4. MISSING WORD TESTS",
    cases: [
      { input: "make laugh", expectedType: "intent", expectedKey: "jokes" },
      { input: "make m laugh", expectedType: "intent", expectedKey: "jokes" },
    ],
  },
  {
    key: "noise",
    name: "5. NOISE TESTS",
    cases: [
      { input: "hey bro make me laugh pls", expectedType: "intent", expectedKey: "jokes" },
      { input: "yo can you make me laugh", expectedType: "intent", expectedKey: "jokes" },
    ],
  },
  {
    key: "mixed",
    name: "6. MIXED TESTS",
    cases: [
      { input: "thanks bro good job", expectedType: "intent", expectedKey: "positive_feedback" },
      { input: "ok make me laugg pls", expectedType: "intent", expectedKey: "jokes" },
    ],
  },
  {
    key: "negative",
    name: "7. NEGATIVE TESTS",
    cases: [
      { input: "asdasd qwerty", expectedType: "intent", expectedKey: "unknown" },
      { input: "zzzxxy random", expectedType: "intent", expectedKey: "unknown" },
      { input: "12345 blah", expectedType: "intent", expectedKey: "unknown" },
    ],
  },
  {
    key: "ambiguity",
    name: "8. AMBIGUITY TESTS",
    cases: [
      { input: "ok", expectedType: "intent", expectedKey: "acknowledgement" },
      { input: "okay", expectedType: "intent", expectedKey: "acknowledgement" },
      { input: "fine", expectedType: "intent", expectedKey: "acknowledgement" },
      { input: "hmm", expectedType: "intent", expectedKey: "unknown" },
      { input: "alright", expectedType: "intent", expectedKey: "acknowledgement" },
    ],
  },
  {
    key: "collision",
    name: "9. INTENT COLLISION TESTS",
    cases: [
      { input: "thanks good job", expectedType: "intent", expectedKey: "positive_feedback" },
      { input: "sorry my bad", expectedType: "intent", expectedKey: "apology" },
      { input: "yes correct thanks", expectedType: "intent", expectedKey: "confirmation" },
    ],
  },
  {
    key: "overlap",
    name: "10. KEYWORD OVERLAP TESTS",
    cases: [
      { input: "good", expectedType: "intent", expectedKey: "positive_feedback" },
      { input: "nice", expectedType: "intent", expectedKey: "positive_feedback" },
      { input: "great", expectedType: "intent", expectedKey: "positive_feedback" },
    ],
  },
  {
    key: "shortInput",
    name: "11. SHORT INPUT TESTS",
    cases: [
      { input: "yo", expectedType: "intent", expectedKey: "greeting" },
      { input: "ok", expectedType: "intent", expectedKey: "acknowledgement" },
      { input: "k", expectedType: "intent", expectedKey: "unknown" },
      { input: "hmm", expectedType: "intent", expectedKey: "unknown" },
    ],
  },
  {
    key: "longInput",
    name: "12. LONG INPUT TESTS",
    cases: [
      {
        input: "hey bro can you please make me laugh I am bored today",
        expectedType: "intent",
        expectedKey: "jokes",
      },
    ],
  },
  {
    key: "repetition",
    name: "13. REPETITION TESTS",
    cases: [
      { input: "laugh laugh laugh", expectedType: "intent", expectedKey: "jokes" },
      { input: "good good good job", expectedType: "intent", expectedKey: "positive_feedback" },
    ],
  },
  {
    key: "orderVariation",
    name: "14. ORDER VARIATION TESTS",
    cases: [
      { input: "laugh me make", expectedType: "intent", expectedKey: "jokes" },
      { input: "job good", expectedType: "intent", expectedKey: "positive_feedback" },
    ],
  },
  {
    key: "realNoise",
    name: "15. REAL NOISE TESTS",
    cases: [
      { input: "broooo make me laugg plsss 😂", expectedType: "intent", expectedKey: "jokes" },
      { input: "hey!! can u make me laugh??", expectedType: "intent", expectedKey: "jokes" },
      { input: "mak me laf", expectedType: "intent", expectedKey: "jokes" },
    ],
  },
  {
    key: "knowledgeVsIntent",
    name: "16. KNOWLEDGE VS INTENT TESTS",
    cases: [
      { input: "time bro", expectedType: "knowledge", expectedKey: "" },
      { input: "what is ai bro", expectedType: "knowledge", expectedKey: "" },
      { input: "tell me time please", expectedType: "knowledge", expectedKey: "" },
    ],
  },
  {
    key: "falsePositive",
    name: "17. FALSE POSITIVE TESTS",
    cases: [
      { input: "laughing stock market", expectedType: "intent", expectedKey: "unknown" },
      { input: "perfect number algorithm", expectedType: "intent", expectedKey: "unknown" },
      { input: "good morning physics", expectedType: "intent", expectedKey: "unknown" },
    ],
  },
  {
    key: "typoBoundary",
    name: "18. TYPO BOUNDARY TESTS",
    cases: [
      { input: "make me lauxh", expectedType: "intent", expectedKey: "unknown" },
      { input: "make me lgugh", expectedType: "intent", expectedKey: "unknown" },
    ],
  },
  {
    key: "casualChat",
    name: "19. CASUAL CHAT TESTS",
    cases: [
      { input: "how are you", expectedType: "intent", expectedKey: "mood" },
      { input: "how ar you", expectedType: "intent", expectedKey: "mood" },
      { input: "how r u", expectedType: "intent", expectedKey: "mood" },
      { input: "what are you doing", expectedType: "intent", expectedKey: "small_talk" },
      { input: "what r u doing", expectedType: "intent", expectedKey: "small_talk" },
    ],
  },
  {
    key: "brokenEnglish",
    name: "20. BROKEN ENGLISH TESTS",
    cases: [
      { input: "what you doing", expectedType: "intent", expectedKey: "small_talk" },
      { input: "you doing what", expectedType: "intent", expectedKey: "small_talk" },
      { input: "how you are", expectedType: "intent", expectedKey: "mood" },
    ],
  },
  {
    key: "internetSlang",
    name: "21. INTERNET SLANG TESTS",
    cases: [
      { input: "wru", expectedType: "intent", expectedKey: "small_talk" },
      { input: "sup bro", expectedType: "intent", expectedKey: "small_talk" },
      { input: "hru", expectedType: "intent", expectedKey: "mood" },
      { input: "wyd", expectedType: "intent", expectedKey: "small_talk" },
    ],
  },
  {
    key: "extremeRealNoise",
    name: "22. EXTREME NOISE TESTS",
    cases: [
      { input: "broooo how r uuuu 😂😂", expectedType: "intent", expectedKey: "mood" },
      { input: "heyyy what u doinggg", expectedType: "intent", expectedKey: "small_talk" },
    ],
  },
  {
    key: "mixedTypoSlang",
    name: "23. MIXED TYPO + SLANG TESTS",
    cases: [
      { input: "hru bro", expectedType: "intent", expectedKey: "mood" },
      { input: "what r u doin", expectedType: "intent", expectedKey: "small_talk" },
    ],
  },
  {
    key: "failureCheck",
    name: "24. FAILURE CHECK TESTS",
    cases: [
      { input: "zxqv nrtp", expectedType: "intent", expectedKey: "unknown" },
      { input: "financial optics theorem", expectedType: "intent", expectedKey: "unknown" },
      { input: "meteorological variance index", expectedType: "intent", expectedKey: "unknown" },
    ],
  },
];

const CRITICAL_TESTS = [
  { input: "hello", expectedType: "intent", expectedKey: "greeting" },
  { input: "sup", expectedType: "intent", expectedKey: "small_talk" },
  { input: "good job", expectedType: "intent", expectedKey: "positive_feedback" },
  { input: "well done", expectedType: "intent", expectedKey: "positive_feedback" },
  { input: "perfect", expectedType: "intent", expectedKey: "positive_feedback" },
  { input: "make me laugh", expectedType: "intent", expectedKey: "jokes" },
  { input: "make me laugg", expectedType: "intent", expectedKey: "jokes" },
  { input: "how are you", expectedType: "intent", expectedKey: "mood" },
  { input: "how ar you", expectedType: "intent", expectedKey: "mood" },
  { input: "how r u", expectedType: "intent", expectedKey: "mood" },
];

function decideFinal(input) {
  const knowledge = getKnowledgeMatch(input);
  const intent = getIntentMatch(input);
  const knowledgeEligible =
    knowledge && knowledge.score >= R.KNOWLEDGE_ELIGIBLE_MIN_SCORE ? knowledge : null;
  const forceIntent =
    intent &&
    intent.score >= R.FORCE_INTENT_MIN_SCORE &&
    (intent.matches || 0) >= R.FORCE_INTENT_MIN_KEYWORD_MATCHES;
  const final =
    !forceIntent && knowledgeEligible && knowledgeEligible.score > intent.score
      ? { source: "knowledge", output: knowledgeEligible.answer, key: null }
      : { source: "intent", output: getResponse(intent.key), key: intent.key };
  return { knowledge, intent, final };
}

function formatExpected(testCase) {
  if (testCase.expectedType === "knowledge") return "knowledge";
  return "intent:" + testCase.expectedKey;
}

function evaluateCase(testCase, result) {
  if (testCase.expectedType === "knowledge") {
    var okKnowledge = result.final.source === "knowledge" && result.knowledge && result.knowledge.score > 0;
    return { pass: okKnowledge, reason: okKnowledge ? "ok" : "knowledge-not-selected" };
  }

  if (result.final.source !== "intent") {
    return { pass: false, reason: "intent-not-selected" };
  }

  var isPass = result.intent.key === testCase.expectedKey;
  return { pass: isPass, reason: isPass ? "ok" : "intent-mismatch" };
}

function printCaseResult(testCase, result, verdict) {
  var kScore = result.knowledge ? result.knowledge.score.toFixed(2) : "—";
  var iScore = result.intent ? result.intent.score.toFixed(2) : "—";
  var statusStyle = verdict.pass ? STYLE.pass : STYLE.fail;
  var status = verdict.pass ? "PASS" : "FAIL";

  console.log(`%cInput:%c "${testCase.input}"`, STYLE.label, "");
  console.log(`%cExpected:%c ${formatExpected(testCase)}`, STYLE.label, STYLE.muted);
  console.log(`%cGot:%c intent:${result.intent.key} | source:${result.final.source}`, STYLE.label, STYLE.muted);
  console.log(`%cScores:%c knowledge=${kScore}, intent=${iScore}`, STYLE.label, STYLE.muted);
  console.log(`%cResult:%c ${status}`, STYLE.label, statusStyle);
  if (!verdict.pass) {
    console.log(`%cReason:%c ${verdict.reason}`, STYLE.label, STYLE.muted);
  }
  console.log("%c------------------------------", STYLE.muted);
}

function runCategory(category) {
  var summary = {
    key: category.key,
    name: category.name,
    total: 0,
    pass: 0,
    fail: 0,
    failedCases: [],
  };

  console.log("");
  console.log(`%c===== ${category.name} =====`, STYLE.section);

  for (var i = 0; i < category.cases.length; i++) {
    var testCase = category.cases[i];
    var result = decideFinal(testCase.input);
    var verdict = evaluateCase(testCase, result);

    summary.total += 1;
    if (verdict.pass) summary.pass += 1;
    else {
      summary.fail += 1;
      summary.failedCases.push({
        category: category.name,
        input: testCase.input,
        expected: formatExpected(testCase),
        got: "intent:" + result.intent.key + " (source:" + result.final.source + ")",
        reason: verdict.reason,
      });
    }

    printCaseResult(testCase, result, verdict);
  }

  return summary;
}

function percentage(num, den) {
  if (!den) return "0.0";
  return ((num / den) * 100).toFixed(1);
}

function printFailedCases(summaries) {
  var failures = [];
  for (var i = 0; i < summaries.length; i++) {
    failures = failures.concat(summaries[i].failedCases);
  }

  if (!failures.length) {
    console.log("");
    console.log("%cNo failed cases.", STYLE.pass);
    return;
  }

  console.log("");
  console.log("%cFailed Cases:", STYLE.section);
  for (var j = 0; j < failures.length; j++) {
    var f = failures[j];
    console.log(
      `%c- [${f.category}] "${f.input}" expected=${f.expected}, got=${f.got}, reason=${f.reason}`,
      STYLE.muted
    );
  }
}

function printFinalReport(summaries) {
  var total = 0;
  var passed = 0;
  var failed = 0;
  for (var i = 0; i < summaries.length; i++) {
    total += summaries[i].total;
    passed += summaries[i].pass;
    failed += summaries[i].fail;
  }

  function byKey(key) {
    for (var k = 0; k < summaries.length; k++) {
      if (summaries[k].key === key) return summaries[k];
    }
    return { total: 0, pass: 0, fail: 0 };
  }

  var exact = byKey("exact");
  var typo = byKey("typo");
  var extreme = byKey("extremeTypo");
  var ambiguity = byKey("ambiguity");
  var collision = byKey("collision");
  var noise = byKey("realNoise");
  var falsePositive = byKey("falsePositive");
  var casualChat = byKey("casualChat");
  var internetSlang = byKey("internetSlang");
  var weakToken = byKey("mixedTypoSlang");

  var falsePositives = falsePositive.fail;
  var falsePositiveRate = percentage(falsePositive.fail, falsePositive.total);
  var extremeRejectionRate = percentage(extreme.pass, extreme.total);

  console.log("");
  console.log("%c===== FINAL REPORT =====", STYLE.section);
  console.log(`%cTotal tests:%c ${total}`, STYLE.label, STYLE.muted);
  console.log(`%cPassed:%c ${passed}`, STYLE.label, STYLE.pass);
  console.log(`%cFailed:%c ${failed}`, STYLE.label, STYLE.fail);
  console.log(`%cAccuracy %:%c ${percentage(passed, total)}%`, STYLE.label, STYLE.muted);

  console.log("");
  console.log("%cBreakdown", STYLE.section);
  console.log(`%cExact accuracy:%c ${percentage(exact.pass, exact.total)}%`, STYLE.label, STYLE.muted);
  console.log(`%cTypo accuracy:%c ${percentage(typo.pass, typo.total)}%`, STYLE.label, STYLE.muted);
  console.log(`%cExtreme typo rejection rate:%c ${extremeRejectionRate}%`, STYLE.label, STYLE.muted);
  console.log(
    `%cAmbiguity accuracy:%c ${percentage(ambiguity.pass, ambiguity.total)}%`,
    STYLE.label,
    STYLE.muted
  );
  console.log(
    `%cCollision resolution accuracy:%c ${percentage(collision.pass, collision.total)}%`,
    STYLE.label,
    STYLE.muted
  );
  console.log(
    `%cNoise handling accuracy:%c ${percentage(noise.pass, noise.total)}%`,
    STYLE.label,
    STYLE.muted
  );
  console.log(
    `%cConversational accuracy:%c ${percentage(casualChat.pass, casualChat.total)}%`,
    STYLE.label,
    STYLE.muted
  );
  console.log(
    `%cSlang handling accuracy:%c ${percentage(internetSlang.pass, internetSlang.total)}%`,
    STYLE.label,
    STYLE.muted
  );
  console.log(
    `%cWeak-token recovery rate:%c ${percentage(weakToken.pass, weakToken.total)}%`,
    STYLE.label,
    STYLE.muted
  );
  console.log(`%cFalse positives:%c ${falsePositives}`, STYLE.label, STYLE.muted);
  console.log(`%cFalse positive rate:%c ${falsePositiveRate}%`, STYLE.label, STYLE.muted);

  var criticalPassed = 0;
  var criticalFailed = [];
  for (var c = 0; c < CRITICAL_TESTS.length; c++) {
    var t = CRITICAL_TESTS[c];
    var r = decideFinal(t.input);
    var v = evaluateCase(t, r);
    if (v.pass) criticalPassed += 1;
    else criticalFailed.push(t.input);
  }
  console.log("");
  console.log("%cCRITICAL REGRESSION CHECK", STYLE.section);
  console.log(
    `%cCritical pass rate:%c ${criticalPassed}/${CRITICAL_TESTS.length}`,
    STYLE.label,
    criticalPassed === CRITICAL_TESTS.length ? STYLE.pass : STYLE.fail
  );
  if (criticalFailed.length) {
    console.log(`%cCritical failures:%c ${criticalFailed.join(", ")}`, STYLE.label, STYLE.fail);
  }
}

export function runAllTests() {
  var summaries = [];
  for (var i = 0; i < TEST_CATEGORIES.length; i++) {
    summaries.push(runCategory(TEST_CATEGORIES[i]));
  }
  printFinalReport(summaries);
  printFailedCases(summaries);
  return summaries;
}

function runWhenReady() {
  try {
    console.log("Running typo-tolerance test suite...");
    runAllTests();
    console.log("All tests completed.");
  } catch (error) {
    console.error("Test execution error:", error);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", runWhenReady);
  } else {
    runWhenReady();
  }
}

