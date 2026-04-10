/**
 * Chatbot entry — loads UI + messaging. Use as ES module:
 * <script type="module" src="/chatbot/chatbot.js"></script>
 */

import { setupChatbotUI, ROOT_ID } from "./ui.js";
import { setupMessaging } from "./messages.js";
import { setupSpaNavigation } from "./spa-nav.js";

var VERSION = "2.0.0";

var AUTO_OPEN_DELAY_MS = 2000;
var SS_PANEL_OPEN = "rishit-chatbot-panel-open";
var SS_KEYS_CLEAR_ON_RELOAD = [
  "rishit-chatbot-messages-v1",
  "rishit-chatbot-nav-v1",
  "rishit-chatbot-panel-open",
  "rishit-chatbot-panel-expanded",
];

function clearChatSessionIfReload() {
  try {
    var nav = performance.getEntriesByType("navigation")[0];
    var isReload =
      nav && nav.type === "reload"
        ? true
        : typeof performance.navigation !== "undefined" &&
          performance.navigation.type === 1;
    if (!isReload) return;
    for (var i = 0; i < SS_KEYS_CLEAR_ON_RELOAD.length; i++) {
      window.sessionStorage.removeItem(SS_KEYS_CLEAR_ON_RELOAD[i]);
    }
  } catch (err) {}
}

function init() {
  if (document.getElementById(ROOT_ID)) {
    return { ok: false, reason: "already-initialized" };
  }

  clearChatSessionIfReload();

  var savedOpen = null;
  try {
    savedOpen = window.sessionStorage.getItem(SS_PANEL_OPEN);
  } catch (err) {}

  var hasPanelPreference = savedOpen === "true" || savedOpen === "false";
  var refs = setupChatbotUI({
    initialPanelOpen: hasPanelPreference && savedOpen === "true",
  });
  var messaging = setupMessaging(refs);

  if (typeof window !== "undefined") {
    window.handleButtonAction = function (action) {
      messaging.handleButtonAction(action);
    };
  }

  var startedEmpty = messaging.isEmpty();
  if (startedEmpty) {
    messaging.showFirstInteraction();
  }

  if (typeof refs.setOpen === "function" && !hasPanelPreference && startedEmpty) {
    window.setTimeout(function () {
      refs.setOpen(true);
    }, AUTO_OPEN_DELAY_MS);
  }

  return { ok: true };
}

function boot() {
  setupSpaNavigation();
  init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

if (typeof window !== "undefined") {
  window.RishitChatbot = {
    init: init,
    version: VERSION,
  };
}

export { init, VERSION };
