// Keep old state open on click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Context Menu Setup and Global Side Panel Config
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

// Ensure settings are applied on startup as well
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'sidepanel.html',
    enabled: true
  }).catch((error) => console.error(error));
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explainWithGemini" && info.selectionText) {
    // Open the side panel
    chrome.sidePanel.open({ tabId: tab.id });
    
    // We can't directly write to clipboard here easily without a DOM context, 
    // but we can use the offscreen API or simply message the sidepanel.
    // However, the user specifically asked to copy to clipboard.
    // In MV3, writing to clipboard in background is tricky. 
    // We will send a message to the sidepanel which has a DOM and can write to clipboard
    // or we can use a small script injection if permitted.
    // But since the side panel will be open, let's use it.
    
    // Actually, in MV3 background workers can't use document.execCommand('copy').
    // But we have 'clipboardWrite' permission. 
    // The most robust way is to store the text and let sidepanel handle it or 
    // use a temporary offscreen document.
    
    chrome.storage.local.set({ lastSelectedText: info.selectionText });
  }
});
