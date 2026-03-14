// Keep old state open on click
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

// Context Menu Click Handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainWithGemini" && info.selectionText) {
    // Store text for the content script to pick up
    chrome.storage.local.set({ pendingPrompt: info.selectionText }, () => {
      chrome.sidePanel.open({ tabId: tab.id }).catch((error) => console.error(error));
    });
  }
});
