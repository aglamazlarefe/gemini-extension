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
      // 2. Open panel with error handling and fallback
      if (tab && tab.id && tab.id !== chrome.tabs.TAB_ID_NONE) {
        // Try to open in the specific window to avoid restricted tab issues
        chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
          console.warn('Could not open side panel for specific window, trying global setOptions fallback.');
          chrome.sidePanel.setOptions({ enabled: true });
        });
      } else {
          // Fallback if no tab info (rare)
          chrome.sidePanel.setOptions({ enabled: true });
      }
    });
  }
});
