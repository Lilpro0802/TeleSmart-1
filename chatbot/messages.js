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
  btn("Contact Support", "CONTACT"),
  btn("More Options", "MORE_OPTIONS"),
];

var BUTTONS_INTERNET = [
  btn("Broadband", "BROADBAND"),
  btn("Enterprise Network", "ENTERPRISE"),
  btn("⬅ Back", "BACK"),
  btn("Main Menu", "MAIN_MENU"),
];

var BUTTONS_BROADBAND = [
  btn("View Plans", "VIEW_PLANS"),
  btn("Check Feasibility", "CHECK_FEASIBILITY"),
  btn("Contact Support", "CONTACT"),
  btn("Main Menu", "MAIN_MENU"),
];

var BUTTONS_ENTERPRISE = [
  btn("Small Business", "SMALL"),
  btn("Medium Business", "MEDIUM"),
  btn("Large Business", "LARGE"),
  btn("Contact Support", "CONTACT"),
  btn("⬅ Back", "BACK"),
  btn("Main Menu", "MAIN_MENU"),
];

var BUTTONS_AFTER_TIER = [
  btn("Contact Support", "CONTACT"),
  btn("Main Menu", "MAIN_MENU"),
];

var BUTTONS_MORE = [
  btn("Services Overview", "SERVICES_OVERVIEW"),
  btn("⬅ Back", "BACK"),
  btn("Main Menu", "MAIN_MENU"),
];

var BUTTONS_FEASIBILITY_PLACEHOLDER = [
  btn("Open feasibility page", "OPEN_FEASIBILITY"),
  btn("⬅ Back", "BACK"),
  btn("Main Menu", "MAIN_MENU"),
];

var BUTTONS_SERVICES_OVERVIEW = [
  btn("⬅ Back", "BACK"),
  btn("Main Menu", "MAIN_MENU"),
];

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
  FEASIBILITY: "FEASIBILITY",
  SERVICES: "SERVICES",
};

/** Button action -> NAV_STATES id (non-tier). */
var ACTION_TO_NAV_STATE = {
  INTERNET: "INTERNET",
  BROADBAND: "BROADBAND",
  ENTERPRISE: "ENTERPRISE",
  MORE_OPTIONS: "MORE",
  CHECK_FEASIBILITY: "FEASIBILITY",
  SERVICES_OVERVIEW: "SERVICES",
};

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
  return STACK_TOP_TO_STATE[top] || "HOME";
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
  var delegateRoot = els.root || messagesEl;

  /** @type {string[]} */
  var navStack = [];

  /** @type {{ role: string, text: string, buttons?: {label: string, action: string}[] }[]} */
  var messagesStore = [];
  var isRestoringHistory = false;

  function persistNav() {
    setStorageJson(STORAGE_KEYS.nav, navStack);
  }

  function loadNavStack() {
    var parsed = getStorageJson(STORAGE_KEYS.nav, []);
    navStack = Array.isArray(parsed) ? parsed : [];
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
    appendMessage(getNavMessagePayload(stateId, tierAction), "bot");
  }

  function padTrailingMenuIfNeeded() {
    if (messagesStore.length === 0) return;
    var last = messagesStore[messagesStore.length - 1];
    if (last.buttons && last.buttons.length > 0) return;
    navStack = [];
    persistNav();
    appendMessage(getNavMessagePayload("TRAILING_PROMPT"), "bot");
  }

  function renderMenuFromStackTop() {
    if (navStack.length && navStack[navStack.length - 1] === "TIER") {
      navStack = [];
      persistNav();
    }
    appendMessage(getNavMessagePayload(getCurrentNavStateId(navStack)), "bot");
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
    e.preventDefault();
    var action = actionBtn.getAttribute(DATA_CHATBOT_ACTION);
    if (action) runButtonFeedbackThen(action, actionBtn);
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
