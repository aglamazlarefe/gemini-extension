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
    contexts: ["selection", "page"] // Support page context too
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

/**
 * RESTRICTED URL CHECK (v3.1)
 * Prevents script injection on restricted browser pages.
 */
function isRestrictedUrl(url) {
    if (!url) return true;
    return url.startsWith('chrome://') || 
           url.startsWith('brave://') || 
           url.startsWith('about:') ||
           url.startsWith('edge://') ||
           url.startsWith('view-source:');
}

// Capture page context safely
async function getPageContext(tabId, url) {
    if (isRestrictedUrl(url)) return "Restricted Page: Cannot capture context.";
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => document.body.innerText
        });
        return results[0]?.result || "";
    } catch (e) {
        console.error('Failed to get page context:', e);
        return "";
    }
}

// Handle Keyboard Commands (v3.1)
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "explain-selection") {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // CRITICAL: Call open immediately to maintain user gesture
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(e => console.error(e));

        // Force New Chat for Alt+Q
        const NEW_CHAT_URL = "https://gemini.google.com/app";
        chrome.storage.local.set({ lastGeminiUrl: NEW_CHAT_URL });

        let textToUse = "";
        if (!isRestrictedUrl(tab.url)) {
            try {
                const result = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => window.getSelection().toString()
                });
                textToUse = result[0]?.result || (await getPageContext(tab.id, tab.url));
            } catch (e) {
                console.warn('Script injection failed on this tab.');
            }
        }

        if (textToUse) {
            chrome.storage.local.set({ pendingPrompt: textToUse });
        }
    }
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "explainWithGemini") {
    // CRITICAL: Call open immediately
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
      console.error('SidePanel failed to open:', error);
    });

    if (isRestrictedUrl(tab.url)) {
      console.warn('Action blocked on restricted browser URL.');
      return;
    }

    const textToUse = info.selectionText || (await getPageContext(tab.id, tab.url));

    if (textToUse) {
        chrome.storage.local.set({ pendingPrompt: textToUse });
    }
  }
});
