// Side Panel behavior config
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Setup Context Menus on install (remove duplicates first)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "explain-selection-menu",
      title: "Explain selection with Gemini",
      contexts: ["selection"]
    });
  });
});

// chrome.sidePanel.open() is only allowed "in response to a user action". Call it first and
// synchronously inside the event listener, before any await or callback, so the user
// gesture is still active.
function openSidePanel(tab) {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch((err) => {
    console.error("sidePanel.open failed:", err);
  });
}

// Context Menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explain-selection-menu" && info.selectionText && tab) {
    openSidePanel(tab);
    savePendingPrompt(info.selectionText);
  }
});

// Shortcut command handler
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "explain-selection" && tab) {
    openSidePanel(tab); // must stay before executeScript (see openSidePanel)
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error("executeScript error:", chrome.runtime.lastError.message);
        return;
      }
      const selectedText = results?.[0]?.result;
      if (selectedText) {
        savePendingPrompt(selectedText);
      }
    });
  }
});

// URL tracking message handler - receives URL updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_LAST_URL" && message.url) {
    // Only accept Gemini URLs coming from a Gemini frame
    const fromGemini = sender.url?.startsWith("https://gemini.google.com/");
    if (!fromGemini || !message.url.startsWith("https://gemini.google.com/")) {
      return;
    }
    chrome.storage.local.set({ lastGeminiUrl: message.url }).catch((err) => {
      console.error("Failed to save last URL:", err);
    });
    // Acknowledge receipt
    sendResponse({ received: true });
    return true; // Keep message channel open for async response
  }
});

// Hands the text to the side panel: content_script.js (running in the panel's Gemini iframe)
// watches storage.local.pendingPrompt and types it into Gemini.
function savePendingPrompt(text) {
  chrome.storage.local.set({ pendingPrompt: text }).catch((err) => {
    console.error("Failed to save pendingPrompt:", err);
  });
}
