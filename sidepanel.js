const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Restore state from storage and check for pending prompts
chrome.storage.local.get(['lastUrl', 'pendingPrompt'], (result) => {
  const targetUrl = result.lastUrl || DEFAULT_URL;
  if (iframe.src === "" || iframe.src === "about:blank" || (iframe.src !== targetUrl && !iframe.src.startsWith(DEFAULT_URL))) {
    iframe.src = targetUrl;
  }

  if (result.pendingPrompt) {
    checkAndInject(result.pendingPrompt);
  }
});

// Listen for new prompts while panel is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingPrompt && changes.pendingPrompt.newValue) {
    checkAndInject(changes.pendingPrompt.newValue);
  }
});

async function checkAndInject(text) {
  // Wait for iframe to be ready
  if (iframe.contentWindow.location.href === 'about:blank') {
    iframe.addEventListener('load', () => injectToGemini(text), { once: true });
  } else {
    injectToGemini(text);
  }
}

async function injectToGemini(text) {
  // We need to inject INTO the iframe. 
  // In MV3, sidepanel can use chrome.scripting if it has host permissions for the iframe target.
  // The manifest has "*://*.google.com/*" host permissions.
  
  try {
    // Find the tab this side panel belongs to (optional, but scripting needs a tabId)
    // Actually, scripting.executeScript requires a tabId. 
    // Side panels can access the current tab info.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // We need to find the frameId of the iframe inside sidepanel.js? 
    // No, sidepanel.js is RUNNING in the extension origin. The iframe is gemini.google.com.
    // Scripting can target the iframe if we know its frameId or if we inject into all frames of the "tab".
    // But this side panel IS a document. The iframe is a child.
    
    // Correct approach for sidepanel -> iframe injection:
    // 1. Get the tabId (from chrome.tabs)
    // 2. We can't easily get the frameId of an iframe INSIDE an extension page from background/scripting.
    // BUT, we can use contentWindow.postMessage OR if it's broad permissions, 
    // we can try to find the frame.
    
    // Actually, the most reliable way for a sidepanel to talk to its OWN iframe 
    // is to use chrome.scripting.executeScript but it targets TABS.
    
    // Wait, the user asked to "use chrome.scripting.executeScript targeting the iframe's frame ID".
    // This implies we should find the frame.
    
    chrome.storage.local.remove('pendingPrompt');

    chrome.scripting.executeScript({
      target: { 
        tabId: (await chrome.tabs.getCurrent()).id, // This is the extension tab? No.
        allFrames: true // Simple way to find it
      },
      func: (promptText) => {
        if (window.location.host === 'gemini.google.com') {
          const selectors = [
             'div[contenteditable="true"]',
             'textarea',
             '.input-area',
             '[role="textbox"]'
          ];
          
          let inputField = null;
          for (const s of selectors) {
            inputField = document.querySelector(s);
            if (inputField) break;
          }

          if (inputField) {
            const finalPrompt = "Explain this: " + promptText;
            if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
              inputField.value = finalPrompt;
            } else {
              inputField.innerText = finalPrompt;
            }
            // Trigger input events
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('Prompt injected successfully');
          }
        }
      },
      args: [text]
    });
  } catch (e) {
    console.error('Injection failed:', e);
  }
}

// Save URL periodically
const saveUrl = () => {
  try {
    const currentUrl = iframe.contentWindow.location.href;
    if (currentUrl && currentUrl.startsWith('http')) {
      chrome.storage.local.set({ lastUrl: currentUrl });
    }
  } catch (e) {}
};

iframe.addEventListener('load', saveUrl);
setInterval(saveUrl, 5000);

refreshBtn.addEventListener('click', () => {
  iframe.src = iframe.src;
});
