// Side Panel behavior
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
    contexts: ["selection", "page"]
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'sidepanel.html',
    enabled: true
  });
});

// Handle URL updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_LAST_URL" && message.url) {
    if (message.url.includes('gemini.google.com')) {
      chrome.storage.local.set({ lastGeminiUrl: message.url });
    }
  }
});

function isRestrictedUrl(url) {
    if (!url) return true;
    return url.startsWith('chrome://') || 
           url.startsWith('brave://') || 
           url.startsWith('about:') ||
           url.startsWith('edge://') ||
           url.startsWith('view-source:');
}

// Handle Keyboard Commands (v3.2 - Gesture Fix)
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "explain-selection") {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // CRITICAL SYNC CALL: No await before this.
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(e => console.error(e));

        // Force New Chat for Alt+Q
        const NEW_CHAT_URL = "https://gemini.google.com/app";
        chrome.storage.local.set({ lastGeminiUrl: NEW_CHAT_URL });

        if (isRestrictedUrl(tab.url)) return;

        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString()
            });
            
            let textToUse = result[0]?.result;
            if (!textToUse) {
                const pageResult = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => document.body.innerText
                });
                textToUse = pageResult[0]?.result;
            }

            if (textToUse) {
                chrome.storage.local.set({ pendingPrompt: textToUse });
            }
        } catch (e) {
            console.warn('Scripting failed or blocked.');
        }
    }
});

// Handle Context Menu Click (v3.2 - Gesture Fix)
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "explainWithGemini") {
    // CRITICAL SYNC CALL: No await before this.
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
      console.error('SidePanel failed to open:', error);
    });

    if (isRestrictedUrl(tab.url)) return;

    let textToUse = info.selectionText;
    if (!textToUse) {
        try {
            const pageResult = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.body.innerText
            });
            textToUse = pageResult[0]?.result;
        } catch (e) {
            console.warn('Page capture failed.');
        }
    }

    if (textToUse) {
        chrome.storage.local.set({ pendingPrompt: textToUse });
    }
  }
});
