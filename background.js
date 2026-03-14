// Basic Side Panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// Global Side Panel Config
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'sidepanel.html',
    enabled: true
  }).catch((error) => console.error('Error setting side panel options:', error));

  chrome.contextMenus.create({
    id: "explainWithGemini",
    title: "Explain with Gemini",
    contexts: ["selection"]
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'sidepanel.html',
    enabled: true
  }).catch((error) => console.error('Error on startup:', error));
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainWithGemini" && info.selectionText) {
    // 1. Store text FIRST
    chrome.storage.local.set({ pendingPrompt: info.selectionText }, () => {
      // 2. Open panel SECOND to ensure storage is ready when panel content script loads
      if (tab.id !== chrome.tabs.TAB_ID_NONE) {
        chrome.sidePanel.open({ tabId: tab.id }).catch((error) => {
          console.error('Error opening side panel:', error);
          // Fallback if tab-specific open fails
          chrome.sidePanel.setOptions({ enabled: true });
        });
      }
    });
  }
});
