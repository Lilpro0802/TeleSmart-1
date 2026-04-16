/**
 * Message sending, display, guided buttons, and persistence (UI layer only).
 */

import { getIntentMatch, getResponse } from "./intents.js";
import { getKnowledgeMatch } from "./knowledge.js";
import { SCORE_BOOSTS } from "./score-boosts.js";

var R = SCORE_BOOSTS.routing;

var STORAGE_KEYS = {
  messages: "rishit-chatbot-messages-v1",
  nav: "rishit-chatbot-nav-v1",
};

/** Delegated control for menu buttons (see setupMessaging click handler). */
var DATA_CHATBOT_ACTION = "data-chatbot-action";

var BOT_REPLY_DELAY_MS = 120;
var BUTTON_ACTION_DELAY_MS = 80;
var MAX_INPUT_PX = 120;

var URLS = {
  VIEW_PLANS: "/Pages/broadband-plans.html",
  CONTACT: "/Pages/Contactus.html",
  OPEN_FEASIBILITY: "/Pages/Check-feasibility.html",
};

const FAQ_DATA = {
  "Plans & Availability": [
    {
      q: "What services do you offer?",
      a: "We offer broadband internet, enterprise network solutions, and customer support services.",
      actions: ["View Services", "Back to Menu"],
    },
    {
      q: "What plans do you offer?",
      a: "We offer different broadband plans based on speed and usage.",
      actions: ["View Plans", "Contact Support"],
    },
    {
      q: "Is service available in my area?",
      a: "Availability depends on your location. You can quickly check if service is available in your area.",
      actions: ["Check Availability", "Back to Menu"],
    },
    {
      q: "Which plan is right for me?",
      a: "The best plan depends on your usage, speed needs, and number of users.",
      actions: ["View Plans", "Contact Support"],
    },
  ],
  "Installation & Setup": [
    {
      q: "How do I get a new connection?",
      a: "You can request a new connection by selecting your service type and sharing your location details.",
      actions: ["New Connection", "Check Availability"],
    },
    {
      q: "How long does installation take?",
      a: "Installation time can vary by location and service type. Our team will confirm the expected timeline.",
      actions: ["Request Installation", "Contact Support"],
    },
    {
      q: "What documents are needed for installation?",
      a: "The required documents may depend on the service you choose. Start your request to see what is needed.",
      actions: ["Start Request", "Contact Support"],
    },
    {
      q: "How do I set up my router or modem?",
      a: "After installation, you can follow the setup guide for your device or contact support for help.",
      actions: ["Setup Guide", "Contact Support"],
    },
  ],
  "Technical Issues": [
    {
      q: "My internet is slow, what should I do?",
      a: "Try restarting your router and checking if multiple devices are using the connection.",
      actions: ["Troubleshoot Internet", "Contact Support"],
    },
    {
      q: "My connection is not working, what can I do?",
      a: "Check that your modem and router are powered on and cables are connected properly.",
      actions: ["Troubleshoot Connection", "Report an Issue"],
    },
    {
      q: "Why does my internet disconnect often?",
      a: "Frequent disconnections can happen due to device, signal, or line issues.",
      actions: ["Troubleshoot Internet", "Contact Support"],
    },
    {
      q: "How do I report a technical problem?",
      a: "You can report internet, device, or network issues directly through support.",
      actions: ["Report an Issue", "Contact Support"],
    },
  ],
  "Billing & Payments": [
    {
      q: "How can I pay my bill?",
      a: "Use the billing section to view your account and complete your payment.",
      actions: ["Pay Bill", "View Billing"],
    },
    {
      q: "Where can I check my bill details?",
      a: "You can view your billing details, due information, and account summary in the billing section.",
      actions: ["View Billing", "Back to Menu"],
    },
    {
      q: "What should I do if my payment failed?",
      a: "If your payment did not go through, you can try again or contact support for help.",
      actions: ["Retry Payment", "Contact Support"],
    },
    {
      q: "I have a billing issue, how can I get help?",
      a: "If you notice an issue with your bill or payment, our team can help review it.",
      actions: ["Billing Support", "Contact Support"],
    },
  ],
  "Support & General Questions": [
    {
      q: "How can I contact customer support?",
      a: "You can reach support through the chatbot support options for service, billing, or technical help.",
      actions: ["Contact Support", "Back to Menu"],
    },
    {
      q: "What is enterprise network solutions?",
      a: "Enterprise network solutions are business connectivity services designed for company operations.",
      actions: ["View Enterprise Services", "Contact Sales"],
    },
    {
      q: "Can I get help for my business connection?",
      a: "Yes, business users can get support for setup, connectivity, and service-related questions.",
      actions: ["Business Support", "Contact Sales"],
    },
    {
      q: "How do I go back to the main menu?",
      a: "You can return to the main menu anytime to choose a different service or support option.",
      actions: ["Back to Menu", "View Services"],
    },
  ],
};

var FAQ_CATEGORY_NAMES = Object.keys(FAQ_DATA);
var FAQ_CATEGORY_PAGE_SIZE = 4;
var FAQ_PAGE_ACTION_PREFIX = "FAQ_PAGE::";
var FAQ_CATEGORY_ACTION_PREFIX = "FAQ_CATEGORY::";
var FAQ_QUESTION_ACTION_PREFIX = "FAQ_QUESTION::";
var FAQ_PAGE_STACK_PREFIX = "FAQ_PAGE::";
var FAQ_CATEGORY_STACK_PREFIX = "FAQ_CATEGORY::";
var FAQ_QUESTION_STACK_PREFIX = "FAQ_QUESTION::";
var FAQ_ACTION_TO_BUTTON_ACTION = {
  "View Services": "SERVICES_OVERVIEW",
  "Back to Menu": "MAIN_MENU",
  "View Plans": "VIEW_PLANS",
  "Contact Support": "CONTACT",
  "Check Availability": "CHECK_FEASIBILITY",
  "New Connection": "CONTACT",
  "Request Installation": "CONTACT",
  "Start Request": "CONTACT",
  "Setup Guide": "CONTACT",
  "Troubleshoot Internet": "CONTACT",
  "Troubleshoot Connection": "CONTACT",
  "Report an Issue": "CONTACT",
  "Pay Bill": "CONTACT",
  "View Billing": "CONTACT",
  "Retry Payment": "CONTACT",
  "Billing Support": "CONTACT",
  "View Enterprise Services": "ENTERPRISE",
  "Contact Sales": "CONTACT",
  "Business Support": "CONTACT",
};

function btn(label, action) {
  return { label: label, action: action };
}

function cloneButtons(buttons) {
  return buttons.map(function (button) {
    return { label: button.label, action: button.action };
  });
}

export var BUTTONS_MAIN_MENU = [
  btn("Internet", "INTERNET"),
  btn("FAQ", "FAQ"),
  btn("Contact Support", "CONTACT"),
  btn("More Options", "MORE_OPTIONS"),
];

var BUTTONS_INTERNET = [
  btn("Broadband", "BROADBAND"),
  btn("Enterprise Network", "ENTERPRISE"),
];

var BUTTONS_BROADBAND = [
  btn("View Plans", "VIEW_PLANS"),
  btn("Check Feasibility", "CHECK_FEASIBILITY"),
  btn("Contact Support", "CONTACT"),
];

var BUTTONS_ENTERPRISE = [
  btn("Small Business", "SMALL"),
  btn("Medium Business", "MEDIUM"),
  btn("Large Business", "LARGE"),
  btn("Contact Support", "CONTACT"),
];

var BUTTONS_AFTER_TIER = [
  btn("Contact Support", "CONTACT"),
];

var BUTTONS_MORE = [
  btn("Services Overview", "SERVICES_OVERVIEW"),
];

var BUTTONS_FEASIBILITY_PLACEHOLDER = [
  btn("Open feasibility page", "OPEN_FEASIBILITY"),
];

var BUTTONS_SERVICES_OVERVIEW = [];

var BUTTONS_FAQ = buildFaqCategoryButtons(0);

var TIER_TEXT = {
  SMALL:
    "Small business: compact branch sites and lighter workloads — flexible bandwidth and SLAs tailored to you.\n\nWe’ll create a custom plan tailored to your business needs. Please contact support to get started.",
  MEDIUM:
    "Medium business: growing teams and multi-site connectivity with stronger performance and SLAs.\n\nWe’ll create a custom plan tailored to your business needs. Please contact support to get started.",
  LARGE:
    "Large business: high-capacity links and premium SLA options for demanding enterprise needs.\n\nWe’ll create a custom plan tailored to your business needs. Please contact support to get started.",
};

/**
 * Navigation screens: text, buttons, and stackAfter (full nav stack on that screen).
 * @type {Record<string, { text?: string, resolveText?: (action: string) => string, buttons: {label: string, action: string}[], stackAfter: string[] }>}
 */
var NAV_STATES = {
  HOME: {
    text: "Here are the main options:",
    buttons: BUTTONS_MAIN_MENU,
    stackAfter: [],
  },
  INTRO: {
    text: "Hi! I can help you with:",
    buttons: BUTTONS_MAIN_MENU,
    stackAfter: [],
  },
  TRAILING_PROMPT: {
    text: "What would you like to do next?",
    buttons: BUTTONS_MAIN_MENU,
    stackAfter: [],
  },
  INTERNET: {
    text: "What kind of internet service are you interested in?",
    buttons: BUTTONS_INTERNET,
    stackAfter: ["INTERNET"],
  },
  BROADBAND: {
    text: "Broadband — explore plans or get in touch.",
    buttons: BUTTONS_BROADBAND,
    stackAfter: ["INTERNET", "BROADBAND"],
  },
  ENTERPRISE: {
    text: "Enterprise network — which size best describes your needs?",
    buttons: BUTTONS_ENTERPRISE,
    stackAfter: ["INTERNET", "ENTERPRISE"],
  },
  TIER: {
    resolveText: function (tierAction) {
      return TIER_TEXT[tierAction] || "";
    },
    buttons: BUTTONS_AFTER_TIER,
    stackAfter: ["INTERNET", "ENTERPRISE", "TIER"],
  },
  MORE: {
    text: "More ways we can help:",
    buttons: BUTTONS_MORE,
    stackAfter: ["MORE"],
  },
  FAQ: {
    text: "What would you like help with?\n\nFAQ Categories:",
    buttons: BUTTONS_FAQ,
    stackAfter: ["FAQ"],
  },
  FEASIBILITY: {
    text: "See if service is available at your location (placeholder — open our feasibility checker when you’re ready).",
    buttons: BUTTONS_FEASIBILITY_PLACEHOLDER,
    stackAfter: ["INTERNET", "BROADBAND", "FEASIBILITY"],
  },
  SERVICES: {
    text: "We offer WAN, managed services, enterprise internet, broadband, voice, and more. Use the site menu to explore, or pick a path below.",
    buttons: BUTTONS_SERVICES_OVERVIEW,
    stackAfter: ["MORE", "SERVICES"],
  },
};

/** Stack frame on top -> NAV_STATES id (static screens only). */
var STACK_TOP_TO_STATE = {
  INTERNET: "INTERNET",
  BROADBAND: "BROADBAND",
  ENTERPRISE: "ENTERPRISE",
  MORE: "MORE",
  FAQ: "FAQ",
  FEASIBILITY: "FEASIBILITY",
  SERVICES: "SERVICES",
};

/** Button action -> NAV_STATES id (non-tier). */
var ACTION_TO_NAV_STATE = {
  INTERNET: "INTERNET",
  BROADBAND: "BROADBAND",
  ENTERPRISE: "ENTERPRISE",
  MORE_OPTIONS: "MORE",
  FAQ: "FAQ",
  CHECK_FEASIBILITY: "FEASIBILITY",
  SERVICES_OVERVIEW: "SERVICES",
};

function buildFaqCategoryButtons(pageIndex) {
  var safePageIndex = pageIndex >= 0 ? pageIndex : 0;
  var start = safePageIndex * FAQ_CATEGORY_PAGE_SIZE;
  var end = Math.min(start + FAQ_CATEGORY_PAGE_SIZE, FAQ_CATEGORY_NAMES.length);
  var buttons = [];
  for (var i = start; i < end; i++) {
    buttons.push(btn(FAQ_CATEGORY_NAMES[i], FAQ_CATEGORY_ACTION_PREFIX + i));
  }
  if (end < FAQ_CATEGORY_NAMES.length) {
    buttons.push(btn("More Options →", FAQ_PAGE_ACTION_PREFIX + (safePageIndex + 1)));
  }
  if (safePageIndex > 0) {
    buttons.push(btn("← Back", FAQ_PAGE_ACTION_PREFIX + (safePageIndex - 1)));
  }
  return buttons;
}

function getFaqPageFrame(pageIndex) {
  return FAQ_PAGE_STACK_PREFIX + pageIndex;
}

function parseFaqPageIndex(value) {
  if (typeof value !== "string") return -1;
  if (value.indexOf(FAQ_PAGE_ACTION_PREFIX) !== 0) return -1;
  var pageIndex = parseInt(value.slice(FAQ_PAGE_ACTION_PREFIX.length), 10);
  return isNaN(pageIndex) ? -1 : pageIndex;
}

function getFaqCategoryFrame(categoryIndex) {
  return FAQ_CATEGORY_STACK_PREFIX + categoryIndex;
}

function getFaqQuestionFrame(categoryIndex, questionIndex) {
  return FAQ_QUESTION_STACK_PREFIX + categoryIndex + "::" + questionIndex;
}

function parseFaqCategoryIndex(value) {
  if (typeof value !== "string") return -1;
  if (value.indexOf(FAQ_CATEGORY_ACTION_PREFIX) !== 0) return -1;
  return parseInt(value.slice(FAQ_CATEGORY_ACTION_PREFIX.length), 10);
}

function parseFaqQuestionIndices(value) {
  if (typeof value !== "string") return null;
  if (value.indexOf(FAQ_QUESTION_ACTION_PREFIX) !== 0) return null;
  var parts = value.slice(FAQ_QUESTION_ACTION_PREFIX.length).split("::");
  if (parts.length !== 2) return null;
  var categoryIndex = parseInt(parts[0], 10);
  var questionIndex = parseInt(parts[1], 10);
  if (isNaN(categoryIndex) || isNaN(questionIndex)) return null;
  return {
    categoryIndex: categoryIndex,
    questionIndex: questionIndex,
  };
}

function getFaqCategoryQuestions(categoryIndex) {
  var categoryName = FAQ_CATEGORY_NAMES[categoryIndex];
  return categoryName ? FAQ_DATA[categoryName] : null;
}

function getFaqPagePayload(pageIndex) {
  var safePageIndex = pageIndex >= 0 ? pageIndex : 0;
  var start = safePageIndex * FAQ_CATEGORY_PAGE_SIZE;
  if (safePageIndex > 0 && start >= FAQ_CATEGORY_NAMES.length) return null;
  return createMessagePayload(
    "What would you like help with?\n\nFAQ Categories:",
    buildFaqCategoryButtons(safePageIndex)
  );
}

function getFaqCategoryPayload(categoryIndex) {
  var questions = getFaqCategoryQuestions(categoryIndex);
  if (!questions) return null;
  var buttons = [];
  for (var i = 0; i < questions.length; i++) {
    buttons.push(
      btn(questions[i].q, FAQ_QUESTION_ACTION_PREFIX + categoryIndex + "::" + i)
    );
  }
  return createMessagePayload("Select a question:", buttons);
}

function pushUniqueButton(buttons, buttonDef) {
  for (var i = 0; i < buttons.length; i++) {
    if (
      buttons[i].label === buttonDef.label &&
      buttons[i].action === buttonDef.action
    ) {
      return;
    }
  }
  buttons.push(buttonDef);
}

function getFaqAnswerButtons(actionLabels) {
  var buttons = [];
  for (var i = 0; i < actionLabels.length; i++) {
    var label = actionLabels[i];
    var mappedAction = FAQ_ACTION_TO_BUTTON_ACTION[label] || "CONTACT";
    pushUniqueButton(buttons, btn(label, mappedAction));
  }
  pushUniqueButton(buttons, btn("Contact Support", "CONTACT"));
  return buttons;
}

function getFaqAnswerPayload(categoryIndex, questionIndex) {
  var questions = getFaqCategoryQuestions(categoryIndex);
  if (!questions || !questions[questionIndex]) return null;
  var faqItem = questions[questionIndex];
  return createMessagePayload(
    faqItem.a,
    getFaqAnswerButtons(Array.isArray(faqItem.actions) ? faqItem.actions : [])
  );
}

function getNavMessagePayload(stateId, tierAction) {
  var def = NAV_STATES[stateId];
  if (!def) return createMessagePayload("");
  var text = def.resolveText ? def.resolveText(tierAction || "") : def.text || "";
  return createMessagePayload(text, def.buttons);
}

function getStorageJson(key, fallbackValue) {
  try {
    var raw = window.sessionStorage.getItem(key);
    if (!raw) return fallbackValue;
    var parsed = JSON.parse(raw);
    return parsed == null ? fallbackValue : parsed;
  } catch (err) {
    return fallbackValue;
  }
}

function setStorageJson(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) {}
}

function createMessagePayload(text, buttons) {
  return {
    text: text || "",
    buttons: buttons ? cloneButtons(buttons) : undefined,
  };
}

function createMessageRecord(role, payload) {
  return {
    role: role,
    text: payload.text,
    buttons: payload.buttons,
  };
}

function getCurrentNavStateId(navStack) {
  if (!navStack.length) return "HOME";
  var top = navStack[navStack.length - 1];
  if (top === "TIER") return "HOME";
  if (
    top.indexOf(FAQ_PAGE_STACK_PREFIX) === 0 ||
    top.indexOf(FAQ_CATEGORY_STACK_PREFIX) === 0 ||
    top.indexOf(FAQ_QUESTION_STACK_PREFIX) === 0
  ) {
    return "FAQ";
  }
  return STACK_TOP_TO_STATE[top] || "HOME";
}

function getCurrentNavPayload(navStack) {
  if (!navStack.length) return getNavMessagePayload("HOME");
  var top = navStack[navStack.length - 1];
  if (top === "TIER") return getNavMessagePayload("HOME");

  var faqPageIndex = parseFaqPageIndex(top);
  if (faqPageIndex >= 0) {
    return getFaqPagePayload(faqPageIndex);
  }

  var faqQuestion = parseFaqQuestionIndices(top);
  if (faqQuestion) {
    return (
      getFaqAnswerPayload(faqQuestion.categoryIndex, faqQuestion.questionIndex) ||
      getNavMessagePayload("FAQ")
    );
  }

  var faqCategoryIndex = parseFaqCategoryIndex(top);
  if (faqCategoryIndex >= 0) {
    return getFaqCategoryPayload(faqCategoryIndex) || getNavMessagePayload("FAQ");
  }

  return getNavMessagePayload(STACK_TOP_TO_STATE[top] || "HOME");
}

function getReplyFromMatches(rawText) {
  var knowledgeMatch = getKnowledgeMatch(rawText);
  var intentMatch = getIntentMatch(rawText);
  var knowledgeEligible =
    knowledgeMatch && knowledgeMatch.score >= R.KNOWLEDGE_ELIGIBLE_MIN_SCORE
      ? knowledgeMatch
      : null;

  var forceIntent =
    intentMatch &&
    intentMatch.score >= R.FORCE_INTENT_MIN_SCORE &&
    (intentMatch.matches || 0) >= R.FORCE_INTENT_MIN_KEYWORD_MATCHES;

  if (
    !forceIntent &&
    knowledgeEligible &&
    knowledgeEligible.score > intentMatch.score
  ) {
    return knowledgeEligible.answer;
  }

  return getResponse(intentMatch.key);
}

/**
 * @param {object} els
 * @param {HTMLElement} els.messagesEl
 * @param {HTMLTextAreaElement} els.inputEl
 * @param {HTMLButtonElement} els.sendBtn
 * @param {HTMLElement} [els.root] Widget root for event delegation (`[data-chatbot-action]` clicks).
 */
export function setupMessaging(els) {
  var messagesEl = els.messagesEl;
  var inputEl = els.inputEl;
  var sendBtn = els.sendBtn;
  var navBackEl = els.navBackEl || null;
  var navHomeEl = els.navHomeEl || null;
  var navBarEl = els.navBarEl || null;
  var delegateRoot = els.root || messagesEl;

  /** @type {string[]} */
  var navStack = [];

  /** @type {{ role: string, text: string, buttons?: {label: string, action: string}[] }[]} */
  var messagesStore = [];
  var isRestoringHistory = false;

  function persistNav() {
    setStorageJson(STORAGE_KEYS.nav, navStack);
  }

  function setNavControlState(el, enabled) {
    if (!el) return;
    el.disabled = !enabled;
  }

  function syncHeaderNav() {
    var canBack = navStack.length > 0;
    var canHome = getCurrentNavStateId(navStack) !== "HOME";
    setNavControlState(navBackEl, canBack);
    setNavControlState(navHomeEl, canHome);
    if (navBarEl) {
      if (!canBack && !canHome) {
        navBarEl.style.display = "none";
      } else {
        navBarEl.style.display = "";
      }
    }
  }

  function loadNavStack() {
    var parsed = getStorageJson(STORAGE_KEYS.nav, []);
    navStack = Array.isArray(parsed) ? parsed : [];
    syncHeaderNav();
  }

  function scrollToBottom() {
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
      requestAnimationFrame(function () {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    });
  }

  function appendTypingIndicator() {
    var existing = messagesEl.querySelector('.rishit-chatbot-typing-row');
    if (existing) return;
    var row = document.createElement('div');
    row.className = 'rishit-chatbot-message rishit-chatbot-message--bot rishit-chatbot-typing-row';
    var bubble = document.createElement('div');
    bubble.className = 'rishit-chatbot-bubble rishit-chatbot-typing-indicator';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    var row = messagesEl.querySelector('.rishit-chatbot-typing-row');
    if (row) row.remove();
  }

  function persistMessages() {
    setStorageJson(STORAGE_KEYS.messages, messagesStore);
  }

  function adjustTextareaHeight() {
    inputEl.style.height = "auto";
    var next = Math.min(inputEl.scrollHeight, MAX_INPUT_PX);
    inputEl.style.height = next + "px";
  }

  function removeAllActionContainers() {
    var nodes = messagesEl.querySelectorAll(".rishit-chatbot-actions");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].remove();
    }
  }

  function createActionButton(buttonDef) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "rishit-chatbot-action-btn";
    button.setAttribute(DATA_CHATBOT_ACTION, buttonDef.action);
    button.textContent = buttonDef.label;
    return button;
  }

  function createMessageNode(role, payload) {
    var row = document.createElement("div");
    row.className = "rishit-chatbot-message rishit-chatbot-message--" + role;

    if (role === "bot" && payload.buttons && payload.buttons.length) {
      removeAllActionContainers();

      var block = document.createElement("div");
      block.className = "rishit-chatbot-bot-block";

      var bubble = document.createElement("div");
      bubble.className = "rishit-chatbot-bubble";
      bubble.textContent = payload.text;
      block.appendChild(bubble);

      var actions = document.createElement("div");
      actions.className = "rishit-chatbot-actions";
      for (var i = 0; i < payload.buttons.length; i++) {
        actions.appendChild(createActionButton(payload.buttons[i]));
      }
      block.appendChild(actions);
      row.appendChild(block);
      return row;
    }

    var bubbleSingle = document.createElement("div");
    bubbleSingle.className = "rishit-chatbot-bubble";
    bubbleSingle.textContent = payload.text;
    row.appendChild(bubbleSingle);
    return row;
  }

  /**
   * @param {string | { text: string, buttons?: {label: string, action: string}[] }} content
   * @param {"user"|"bot"} role
   * @param {{ skipPersist?: boolean, skipScroll?: boolean }} [opts]
   */
  function appendMessage(content, role, opts) {
    var skipPersist = opts && opts.skipPersist;
    var skipScroll = opts && opts.skipScroll;
    var payload =
      typeof content === "string"
        ? createMessagePayload(content)
        : createMessagePayload(
            content && content.text,
            content && content.buttons
          );
    var row = createMessageNode(role, payload);

    messagesEl.appendChild(row);
    if (!skipScroll && !isRestoringHistory) scrollToBottom();

    if (!skipPersist) {
      messagesStore.push(createMessageRecord(role, payload));
      persistMessages();
    }
  }

  function transitionToNavState(stateId, tierAction) {
    var def = NAV_STATES[stateId];
    if (!def) return;
    navStack = def.stackAfter.slice();
    persistNav();
    syncHeaderNav();
    appendMessage(getNavMessagePayload(stateId, tierAction), "bot");
  }

  function padTrailingMenuIfNeeded() {
    if (messagesStore.length === 0) return;
    var last = messagesStore[messagesStore.length - 1];
    if (last.buttons && last.buttons.length > 0) return;
    navStack = [];
    persistNav();
    syncHeaderNav();
    appendMessage(getNavMessagePayload("TRAILING_PROMPT"), "bot");
  }

  function renderMenuFromStackTop() {
    if (navStack.length && navStack[navStack.length - 1] === "TIER") {
      navStack = [];
      persistNav();
    }
    syncHeaderNav();
    appendMessage(getCurrentNavPayload(navStack), "bot");
  }

  function handleButtonAction(action) {
    if (action === "BACK") {
      if (navStack.length > 0) navStack.pop();
      persistNav();
      renderMenuFromStackTop();
      return;
    }
    if (action === "MAIN_MENU") {
      transitionToNavState("HOME");
      return;
    }
    if (action === "SMALL" || action === "MEDIUM" || action === "LARGE") {
      transitionToNavState("TIER", action);
      return;
    }
    var faqPageIndex = parseFaqPageIndex(action);
    if (faqPageIndex >= 0) {
      var faqPagePayload = getFaqPagePayload(faqPageIndex);
      if (!faqPagePayload) return;
      navStack = faqPageIndex > 0 ? ["FAQ", getFaqPageFrame(faqPageIndex)] : ["FAQ"];
      persistNav();
      syncHeaderNav();
      appendMessage(faqPagePayload, "bot");
      return;
    }
    var faqCategoryIndex = parseFaqCategoryIndex(action);
    if (faqCategoryIndex >= 0) {
      var faqCategoryPayload = getFaqCategoryPayload(faqCategoryIndex);
      if (!faqCategoryPayload) return;
      var categoryPageIndex = Math.floor(faqCategoryIndex / FAQ_CATEGORY_PAGE_SIZE);
      navStack = ["FAQ"];
      if (categoryPageIndex > 0) navStack.push(getFaqPageFrame(categoryPageIndex));
      navStack.push(getFaqCategoryFrame(faqCategoryIndex));
      persistNav();
      syncHeaderNav();
      appendMessage(faqCategoryPayload, "bot");
      return;
    }
    var faqQuestion = parseFaqQuestionIndices(action);
    if (faqQuestion) {
      var faqAnswerPayload = getFaqAnswerPayload(
        faqQuestion.categoryIndex,
        faqQuestion.questionIndex
      );
      if (!faqAnswerPayload) return;
      navStack = [
        "FAQ",
        getFaqCategoryFrame(faqQuestion.categoryIndex),
        getFaqQuestionFrame(faqQuestion.categoryIndex, faqQuestion.questionIndex),
      ];
      var questionPageIndex = Math.floor(
        faqQuestion.categoryIndex / FAQ_CATEGORY_PAGE_SIZE
      );
      if (questionPageIndex > 0) {
        navStack.splice(1, 0, getFaqPageFrame(questionPageIndex));
      }
      persistNav();
      syncHeaderNav();
      appendMessage(faqAnswerPayload, "bot");
      return;
    }
    var navStateId = ACTION_TO_NAV_STATE[action];
    if (navStateId) {
      transitionToNavState(navStateId);
      return;
    }
    var targetUrl = URLS[action];
    if (targetUrl) {
      window.location.assign(targetUrl);
      return;
    }
  }

  function isInstantNavAction(action) {
    return !!URLS[action];
  }

  function runButtonFeedbackThen(action, actionBtn) {
    if (isInstantNavAction(action)) {
      handleButtonAction(action);
      return;
    }
    var actions = actionBtn.closest(".rishit-chatbot-actions");
    if (!actions || !delegateRoot.contains(actions)) {
      handleButtonAction(action);
      return;
    }
    actions.classList.add("rishit-chatbot-actions--busy");
    var btns = actions.querySelectorAll("button");
    for (var j = 0; j < btns.length; j++) {
      btns[j].disabled = true;
    }
    window.setTimeout(function () {
      handleButtonAction(action);
    }, BUTTON_ACTION_DELAY_MS);
  }

  delegateRoot.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof HTMLElement)) return;
    var actionBtn = target.closest("[" + DATA_CHATBOT_ACTION + "]");
    if (!actionBtn || !delegateRoot.contains(actionBtn)) return;
    if (actionBtn.getAttribute("aria-disabled") === "true") return;
    e.preventDefault();
    var action = actionBtn.getAttribute(DATA_CHATBOT_ACTION);
    if (action) runButtonFeedbackThen(action, actionBtn);
  });

  delegateRoot.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var target = e.target;
    if (!(target instanceof HTMLElement)) return;
    var actionBtn = target.closest("[" + DATA_CHATBOT_ACTION + "]");
    if (!actionBtn || !delegateRoot.contains(actionBtn)) return;
    if (actionBtn.getAttribute("aria-disabled") === "true") return;
    e.preventDefault();
    actionBtn.click();
  });

  function loadPersistedMessages() {
    var parsed = getStorageJson(STORAGE_KEYS.messages, []);
    if (!Array.isArray(parsed)) return;

    messagesStore = [];
    isRestoringHistory = true;
    for (var i = 0; i < parsed.length; i++) {
      var m = parsed[i];
      if (!m || !m.role || typeof m.text !== "string") continue;
      var payload = createMessagePayload(
        m.text,
        Array.isArray(m.buttons) ? m.buttons : undefined
      );
      messagesStore.push(createMessageRecord(m.role, payload));
      appendMessage(payload, m.role === "user" ? "user" : "bot", {
        skipPersist: true,
        skipScroll: true,
      });
    }
    padTrailingMenuIfNeeded();
    isRestoringHistory = false;
    syncHeaderNav();
    scrollToBottom();
  }

  loadNavStack();
  loadPersistedMessages();

  function send() {
    var rawText = inputEl.value;
    var trimmed = rawText.trim();
    if (!trimmed) return;

    appendMessage(trimmed, "user");
    inputEl.value = "";
    adjustTextareaHeight();

    var reply = getReplyFromMatches(rawText);

    appendTypingIndicator();
    window.setTimeout(function () {
      removeTypingIndicator();
      appendMessage(reply, "bot");
      padTrailingMenuIfNeeded();
    }, BOT_REPLY_DELAY_MS);
  }

  sendBtn.addEventListener("click", function () {
    send();
  });

  inputEl.addEventListener("input", adjustTextareaHeight);

  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  adjustTextareaHeight();
  syncHeaderNav();

  function isEmpty() {
    return messagesStore.length === 0;
  }

  function showFirstInteraction() {
    transitionToNavState("INTRO");
  }

  return {
    appendMessage: appendMessage,
    isEmpty: isEmpty,
    handleButtonAction: handleButtonAction,
    scrollToBottom: scrollToBottom,
    showFirstInteraction: showFirstInteraction,
  };
}
