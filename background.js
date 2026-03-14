// Basic Side Panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Context Menu and Global Config
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'sidepanel.html',
    enabled: true
  }).catch((error) => console.error(error));

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
  }).catch((error) => console.error(error));
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainWithGemini" && info.selectionText) {
    // 1. Store text as pending prompt
    chrome.storage.local.set({ pendingPrompt: info.selectionText });

    // 2. Open the side panel
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
