// Basic Side Panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// Context Menu and Global Config
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
    // Store text for the content script to pick up
    chrome.storage.local.set({ pendingPrompt: info.selectionText }, () => {
      // Avoid opening on chrome:// tabs if it causes issues
      if (tab.url && tab.url.startsWith('chrome://')) {
          console.warn('Cannot open side panel on chrome:// URLs via context menu handler');
          return;
      }
      
      chrome.sidePanel.open({ tabId: tab.id }).catch((error) => {
          console.error('Error opening side panel:', error);
          // Fallback: system-wide open if possible
          chrome.sidePanel.setOptions({ enabled: true });
      });
    });
  }
});
