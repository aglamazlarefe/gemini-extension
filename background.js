// Side Panel behavior config
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Setup Context Menus on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain-selection-menu",
    title: "Explain selection with Gemini",
    contexts: ["selection"]
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
      const selectedText = results?.[0]?.result;
      if (selectedText) {
        processTextAction(selectedText, tab);
      }
    });
  }
});

// Central text delivery engine
function processTextAction(text, tab) {
  if (!tab) return;
  chrome.storage.local.set({ pendingPrompt: text }, () => {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((err) => {
      chrome.sidePanel.open({ tabId: tab.id }).catch((err2) => console.error(err2));
    });
  });
}
