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

// Handle URL updates from content script (Navigation Persistence)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_LAST_URL" && message.url) {
    if (message.url.includes('gemini.google.com')) {
      chrome.storage.local.set({ lastGeminiUrl: message.url });
    }
  }
});

// Capture page context if no selection exists
async function getPageContext(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => document.body.innerText
        });
        return results[0].result;
    } catch (e) {
        console.error('Failed to get page context:', e);
        return "";
    }
}

// Handle Keyboard Commands (v3.0)
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "explain-selection") {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // Try to get selection first via script
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString()
        });
        
        const selection = result[0].result;
        const textToUse = selection || (await getPageContext(tab.id));

        if (textToUse) {
            chrome.storage.local.set({ pendingPrompt: textToUse }, () => {
                chrome.sidePanel.open({ windowId: tab.windowId }).catch(e => console.error(e));
            });
        }
    }
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "explainWithGemini") {
    // RESTRICTED URL FILTERING
    if (tab.url && (
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('brave://') || 
        tab.url.startsWith('about:') ||
        tab.url.startsWith('edge://')
    )) {
      console.warn('Action blocked: Gemini extension cannot access restricted browser URLs.');
      return;
    }

    const textToUse = info.selectionText || (await getPageContext(tab.id));

    // Store prompt and open side panel
    chrome.storage.local.set({ pendingPrompt: textToUse }, () => {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
        console.error('SidePanel failed to open:', error);
      });
    });
  }
});
