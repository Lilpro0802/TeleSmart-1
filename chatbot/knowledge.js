/**
 * Simple knowledge layer (token-based matching).
 * Returns an answer string or null if no match.
 */

import { calculateScore, tokenizeForMatching } from "./utils.js";
import { SCORE_BOOSTS } from "./score-boosts.js";

var K = SCORE_BOOSTS.knowledge;

/**
 * 6–8 knowledge entries only.
 * Each item: { keywords: string[], answer: string | () => string }
 */
export const KNOWLEDGE_BASE = [
  {
    keywords: ["artificial intelligence", "ai", "artificial", "intelligence"],
    answer:
      "Artificial Intelligence is the simulation of human intelligence in machines that can learn, reason, and solve problems.",
  },
  {
    keywords: ["internet"],
    answer:
      "The internet is a global network that connects computers and devices to share information.",
  },
  {
    keywords: ["programming", "coding"],
    answer:
      "Programming is the process of writing instructions that a computer can execute.",
  },
  {
    keywords: ["cloud computing", "cloud", "computing"],
    answer:
      "Cloud computing allows access to data and services over the internet instead of local storage.",
  },
  {
    keywords: ["time", "current time"],
    answer: function () {
      return new Date().toLocaleTimeString();
    },
  },
  {
    keywords: ["today's date", "date today", "date", "today", "current date"],
    answer: function () {
      return new Date().toDateString();
    },
  },
  {
    keywords: ["javascript", "js"],
    answer:
      "JavaScript is a programming language used to build interactive websites and web applications, running in browsers and on servers (via Node.js).",
  },
  {
    keywords: ["html"],
    answer:
      "HTML (HyperText Markup Language) is the standard markup language used to structure content on the web.",
  },
];

/**
 * @param {string} userInput
 * @returns {{ answer: string, score: number } | null}
 */
export function getKnowledgeMatch(userInput) {
  var tokens = tokenizeForMatching(userInput);
  if (!tokens.length) return null;

  var priorityWords = ["what", "explain", "define", "tell", "about"];
  var hasPriority =
    tokens.some(function (t) {
      return priorityWords.indexOf(t) !== -1;
    }) || false;

  var joinedTokens = tokens.join(" ");

  var bestItem = null;
  var bestScore = 0;

  for (var i = 0; i < KNOWLEDGE_BASE.length; i++) {
    var item = KNOWLEDGE_BASE[i];
    var score = 0;

    for (var k = 0; k < item.keywords.length; k++) {
      var kw = item.keywords[k];
      var kwScore = 0;

      // Base scoring (exact phrase / substring / token-partial).
      kwScore = calculateScore(tokens, kw);

      // Multi-word typo support:
      // If a keyword is a phrase (contains spaces) and the base score is 0,
      // try scoring each word part individually and also do a light
      // includes check on the full phrase (compressed) for robustness.
      if (kwScore <= 0 && kw.indexOf(" ") !== -1) {
        var parts = kw.split(/\s+/).filter(Boolean);
        var partsScore = 0;
        for (var p = 0; p < parts.length; p++) {
          partsScore += calculateScore(tokens, parts[p]);
        }

        // Light phrase-level includes:
        // This helps when each word has mild typos but still shares
        // recognizable start/end sequences.
        var kwNoSpace = kw.replace(/\s+/g, "");
        var textNoSpace = joinedTokens.replace(/\s+/g, "");
        var head = kwNoSpace.slice(0, K.PHRASE_HEAD_TAIL_SLICE_LEN);
        var tail = kwNoSpace.slice(-K.PHRASE_HEAD_TAIL_SLICE_LEN);
        var phraseIncludes = head && tail ? (textNoSpace.includes(head) || textNoSpace.includes(tail)) : false;

        kwScore =
          Math.max(partsScore, kwScore) +
          (phraseIncludes ? K.PHRASE_SUBSTRING_SIGNAL_BONUS : 0);
      }

      score += kwScore;
    }

    // Boost knowledge priority when the user is clearly asking for information.
    if (hasPriority && score > 0) {
      score += K.QUESTION_WORD_PRIORITY_BONUS;
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  // Unknown fallback tuning: if knowledge match is too weak, don't use it.
  if (!bestItem || bestScore < K.MIN_RETURN_SCORE) return null;

  var answer =
    typeof bestItem.answer === "function" ? bestItem.answer() : bestItem.answer;

  return { answer: answer, score: bestScore };
}

/**
 * Backwards-compatible helper for message flow.
 * @param {string} userInput
 * @returns {string|null}
 */
export function getKnowledgeResponse(userInput) {
  var match = getKnowledgeMatch(userInput);
  return match ? match.answer : null;
}

