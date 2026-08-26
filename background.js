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

// Context Menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explain-selection-menu" && info.selectionText) {
    processTextAction(info.selectionText, tab);
  }
});

// Shortcut command handler
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "explain-selection" && tab) {
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
        processTextAction(selectedText, tab);
      }
    });
  }
});

// URL tracking message handler - receives URL updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_LAST_URL" && message.url) {
    chrome.storage.local.set({ lastGeminiUrl: message.url }).catch((err) => {
      console.error("Failed to save last URL:", err);
    });
    // Acknowledge receipt
    sendResponse({ received: true });
    return true; // Keep message channel open for async response
  }
});

// Central text delivery engine
function processTextAction(text, tab) {
  if (!tab) return;

  // Open side panel synchronously within the user gesture context
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {
    // Fallback: try opening with tabId
    chrome.sidePanel.open({ tabId: tab.id }).catch((err) => {
      console.error("sidePanel.open failed:", err);
    });
  });

  // Save prompt asynchronously (doesn't need the gesture)
  chrome.storage.local.set({ pendingPrompt: text }).catch((err) => {
    console.error("Failed to save pendingPrompt:", err);
  });
}
