/**
 * Message sending, display, guided buttons, and persistence (UI layer only).
 */

import { getIntentMatch, getResponse } from "./intents.js";
import { getKnowledgeMatch } from "./knowledge.js";

var SS_MESSAGES = "rishit-chatbot-messages-v1";
var SS_NAV = "rishit-chatbot-nav-v1";

var BOT_REPLY_DELAY_MS = 120;
var BUTTON_ACTION_DELAY_MS = 80;

var URL_PLANS = "/Pages/broadband-plans.html";
var URL_CONTACT = "/Pages/Contactus.html";
var URL_FEASIBILITY = "/Pages/Check-feasibility.html";

function btn(label, action) {
  return { label: label, action: action };
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
 * @param {object} els
 * @param {HTMLElement} els.messagesEl
 * @param {HTMLTextAreaElement} els.inputEl
 * @param {HTMLButtonElement} els.sendBtn
 */
export function setupMessaging(els) {
  var messagesEl = els.messagesEl;
  var inputEl = els.inputEl;
  var sendBtn = els.sendBtn;
  var maxInputPx = 120;

  /** @type {string[]} */
  var navStack = [];

  /** @type {{ role: string, text: string, buttons?: {label: string, action: string}[] }[]} */
  var messagesStore = [];
  var isRestoringHistory = false;

  function persistNav() {
    try {
      window.sessionStorage.setItem(SS_NAV, JSON.stringify(navStack));
    } catch (err) {}
  }

  function loadNavStack() {
    try {
      var raw = window.sessionStorage.getItem(SS_NAV);
      if (!raw) {
        navStack = [];
        return;
      }
      var p = JSON.parse(raw);
      navStack = Array.isArray(p) ? p : [];
    } catch (e) {
      navStack = [];
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
      requestAnimationFrame(function () {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    });
  }

  function persistMessages() {
    try {
      window.sessionStorage.setItem(SS_MESSAGES, JSON.stringify(messagesStore));
    } catch (err) {}
  }

  function adjustTextareaHeight() {
    inputEl.style.height = "auto";
    var next = Math.min(inputEl.scrollHeight, maxInputPx);
    inputEl.style.height = next + "px";
  }

  function removeAllActionContainers() {
    var nodes = messagesEl.querySelectorAll(".rishit-chatbot-actions");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].remove();
    }
  }

  /**
   * @param {string | { text: string, buttons?: {label: string, action: string}[] }} content
   * @param {"user"|"bot"} role
   * @param {{ skipPersist?: boolean, skipScroll?: boolean }} [opts]
   */
  function appendMessage(content, role, opts) {
    var skipPersist = opts && opts.skipPersist;
    var skipScroll = opts && opts.skipScroll;
    var text =
      typeof content === "string" ? content : (content && content.text) || "";
    var buttons =
      typeof content === "object" && content && content.buttons
        ? content.buttons
        : undefined;

    var row = document.createElement("div");
    row.className =
      "rishit-chatbot-message rishit-chatbot-message--" + role;

    if (role === "bot" && buttons && buttons.length) {
      removeAllActionContainers();
      var block = document.createElement("div");
      block.className = "rishit-chatbot-bot-block";
      var bubble = document.createElement("div");
      bubble.className = "rishit-chatbot-bubble";
      bubble.textContent = text;
      block.appendChild(bubble);

      var actions = document.createElement("div");
      actions.className = "rishit-chatbot-actions";
      for (var i = 0; i < buttons.length; i++) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "rishit-chatbot-action-btn";
        b.setAttribute("data-chatbot-action", buttons[i].action);
        b.textContent = buttons[i].label;
        actions.appendChild(b);
      }
      block.appendChild(actions);
      row.appendChild(block);
    } else {
      var bubbleSingle = document.createElement("div");
      bubbleSingle.className = "rishit-chatbot-bubble";
      bubbleSingle.textContent = text;
      row.appendChild(bubbleSingle);
    }

    messagesEl.appendChild(row);
    if (!skipScroll && !isRestoringHistory) scrollToBottom();

    if (!skipPersist) {
      messagesStore.push({
        role: role,
        text: text,
        buttons: buttons,
      });
      persistMessages();
    }
  }

  function padTrailingMenuIfNeeded() {
    if (messagesStore.length === 0) return;
    var last = messagesStore[messagesStore.length - 1];
    if (last.buttons && last.buttons.length > 0) return;
    navStack = [];
    persistNav();
    appendMessage(
      {
        text: "What would you like to do next?",
        buttons: BUTTONS_MAIN_MENU,
      },
      "bot"
    );
  }

  function renderMenuFromStackTop() {
    if (navStack.length === 0) {
      appendMessage(
        {
          text: "Here are the main options:",
          buttons: BUTTONS_MAIN_MENU,
        },
        "bot"
      );
      return;
    }
    var top = navStack[navStack.length - 1];
    switch (top) {
      case "INTERNET":
        appendMessage(
          {
            text: "What kind of internet service are you interested in?",
            buttons: BUTTONS_INTERNET,
          },
          "bot"
        );
        break;
      case "BROADBAND":
        appendMessage(
          {
            text: "Broadband — explore plans or get in touch.",
            buttons: BUTTONS_BROADBAND,
          },
          "bot"
        );
        break;
      case "ENTERPRISE":
        appendMessage(
          {
            text: "Enterprise network — which size best describes your needs?",
            buttons: BUTTONS_ENTERPRISE,
          },
          "bot"
        );
        break;
      case "MORE":
        appendMessage(
          {
            text: "More ways we can help:",
            buttons: BUTTONS_MORE,
          },
          "bot"
        );
        break;
      case "FEASIBILITY":
        appendMessage(
          {
            text: "See if service is available at your location (placeholder — open our feasibility checker when you’re ready).",
            buttons: BUTTONS_FEASIBILITY_PLACEHOLDER,
          },
          "bot"
        );
        break;
      case "SERVICES":
        appendMessage(
          {
            text: "We offer WAN, managed services, enterprise internet, broadband, voice, and more. Use the site menu to explore, or pick a path below.",
            buttons: BUTTONS_SERVICES_OVERVIEW,
          },
          "bot"
        );
        break;
      default:
        navStack = [];
        persistNav();
        appendMessage(
          {
            text: "Here are the main options:",
            buttons: BUTTONS_MAIN_MENU,
          },
          "bot"
        );
    }
  }

  function handleButtonAction(action) {
    switch (action) {
      case "BACK":
        if (navStack.length > 0) navStack.pop();
        persistNav();
        renderMenuFromStackTop();
        break;
      case "MAIN_MENU":
        navStack = [];
        persistNav();
        appendMessage(
          {
            text: "Here are the main options:",
            buttons: BUTTONS_MAIN_MENU,
          },
          "bot"
        );
        break;
      case "INTERNET":
        navStack = ["INTERNET"];
        persistNav();
        appendMessage(
          {
            text: "What kind of internet service are you interested in?",
            buttons: BUTTONS_INTERNET,
          },
          "bot"
        );
        break;
      case "BROADBAND":
        navStack = ["INTERNET", "BROADBAND"];
        persistNav();
        appendMessage(
          {
            text: "Broadband — explore plans or get in touch.",
            buttons: BUTTONS_BROADBAND,
          },
          "bot"
        );
        break;
      case "ENTERPRISE":
        navStack = ["INTERNET", "ENTERPRISE"];
        persistNav();
        appendMessage(
          {
            text: "Enterprise network — which size best describes your needs?",
            buttons: BUTTONS_ENTERPRISE,
          },
          "bot"
        );
        break;
      case "SMALL":
      case "MEDIUM":
      case "LARGE":
        navStack = ["INTERNET", "ENTERPRISE", "TIER"];
        persistNav();
        appendMessage(
          {
            text: TIER_TEXT[action],
            buttons: BUTTONS_AFTER_TIER,
          },
          "bot"
        );
        break;
      case "MORE_OPTIONS":
        navStack = ["MORE"];
        persistNav();
        appendMessage(
          {
            text: "More ways we can help:",
            buttons: BUTTONS_MORE,
          },
          "bot"
        );
        break;
      case "CHECK_FEASIBILITY":
        navStack = ["INTERNET", "BROADBAND", "FEASIBILITY"];
        persistNav();
        appendMessage(
          {
            text: "See if service is available at your location (placeholder — open our feasibility checker when you’re ready).",
            buttons: BUTTONS_FEASIBILITY_PLACEHOLDER,
          },
          "bot"
        );
        break;
      case "OPEN_FEASIBILITY":
        window.location.assign(URL_FEASIBILITY);
        break;
      case "SERVICES_OVERVIEW":
        navStack = ["MORE", "SERVICES"];
        persistNav();
        appendMessage(
          {
            text: "We offer WAN, managed services, enterprise internet, broadband, voice, and more. Use the site menu to explore, or pick a path below.",
            buttons: BUTTONS_SERVICES_OVERVIEW,
          },
          "bot"
        );
        break;
      case "VIEW_PLANS":
        window.location.assign(URL_PLANS);
        break;
      case "CONTACT":
        window.location.assign(URL_CONTACT);
        break;
      default:
        break;
    }
  }

  function isInstantNavAction(action) {
    return (
      action === "VIEW_PLANS" ||
      action === "CONTACT" ||
      action === "OPEN_FEASIBILITY"
    );
  }

  function runButtonFeedbackThen(action, actionBtn) {
    if (isInstantNavAction(action)) {
      handleButtonAction(action);
      return;
    }
    var actions = actionBtn.closest(".rishit-chatbot-actions");
    if (!actions || !messagesEl.contains(actions)) {
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

  messagesEl.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof HTMLElement)) return;
    var actionBtn = target.closest("[data-chatbot-action]");
    if (!actionBtn || !messagesEl.contains(actionBtn)) return;
    e.preventDefault();
    var action = actionBtn.getAttribute("data-chatbot-action");
    if (action) runButtonFeedbackThen(action, actionBtn);
  });

  function loadPersistedMessages() {
    var raw = null;
    try {
      raw = window.sessionStorage.getItem(SS_MESSAGES);
    } catch (err) {
      return;
    }
    if (!raw) return;
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!Array.isArray(parsed)) return;

    messagesStore = [];
    isRestoringHistory = true;
    for (var i = 0; i < parsed.length; i++) {
      var m = parsed[i];
      if (!m || !m.role || typeof m.text !== "string") continue;
      messagesStore.push({
        role: m.role,
        text: m.text,
        buttons: Array.isArray(m.buttons) ? m.buttons : undefined,
      });
      appendMessage(
        {
          text: m.text,
          buttons: Array.isArray(m.buttons) ? m.buttons : undefined,
        },
        m.role === "user" ? "user" : "bot",
        { skipPersist: true, skipScroll: true }
      );
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

    var knowledgeMatch = getKnowledgeMatch(rawText);
    var intentMatch = getIntentMatch(rawText);
    var knowledgeEligible =
      knowledgeMatch && knowledgeMatch.score >= 2 ? knowledgeMatch : null;

    var forceIntent =
      intentMatch &&
      intentMatch.score >= 5 &&
      (intentMatch.matches || 0) >= 2;

    var reply;
    if (
      !forceIntent &&
      knowledgeEligible &&
      knowledgeEligible.score > intentMatch.score
    ) {
      reply = knowledgeEligible.answer;
    } else {
      reply = getResponse(intentMatch.key);
    }

    window.setTimeout(function () {
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
    navStack = [];
    persistNav();
    appendMessage(
      {
        text: "Hi! I can help you with:",
        buttons: BUTTONS_MAIN_MENU,
      },
      "bot"
    );
  }

  return {
    appendMessage: appendMessage,
    isEmpty: isEmpty,
    handleButtonAction: handleButtonAction,
    showFirstInteraction: showFirstInteraction,
  };
}
