// Keep old state open on click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Global Config & Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'sidepanel.html',
    enabled: true
  });

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
  });
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainWithGemini" && info.selectionText) {
    // 1. RESTRICTED URL FILTERING (v1.9)
    // Avoid scripts and side panel triggers on restricted browser pages
    if (tab.url && (
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('brave://') || 
        tab.url.startsWith('about:') ||
        tab.url.startsWith('edge://')
    )) {
      console.warn('Action blocked: Gemini extension cannot access restricted browser URLs.');
      return;
    }

    // 2. Store prompt and open side panel
    chrome.storage.local.set({ pendingPrompt: info.selectionText }, () => {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
        console.error('SidePanel failed to open:', error);
      });
    });
  }
});
