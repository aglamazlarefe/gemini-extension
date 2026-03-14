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

/**
 * v3.3 STRICT GESTURE HANDLING
 * We must NOT await anything before chrome.sidePanel.open()
 */

// Handle Keyboard Commands
chrome.commands.onCommand.addListener((command, tab) => {
    if (!tab) return;
    
    if (command === "explain-selection") {
        // 1. SYNC OPEN: This preserves the user gesture token
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(e => console.error(e));

        // 2. ASYNC LOGIC: Runs after the panel open command
        (async () => {
            // Force New Chat
            chrome.storage.local.set({ lastGeminiUrl: "https://gemini.google.com/app" });

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
                console.warn('Context capture failed.');
            }
        })();
    }
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;

  if (info.menuItemId === "explainWithGemini") {
    // 1. SYNC OPEN
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
      console.error('SidePanel failed to open:', error);
    });

    // 2. ASYNC LOGIC
    (async () => {
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
    })();
  }
});
