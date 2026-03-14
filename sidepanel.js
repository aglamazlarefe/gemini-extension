const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Restore state from storage and check for pending prompts
chrome.storage.local.get(['lastUrl', 'pendingPrompt'], (result) => {
  const targetUrl = result.lastUrl || DEFAULT_URL;
  
  // Set src only if not already loading a valid Gemini URL to prevent feedback loops/reloads
  if (!iframe.src || iframe.src === 'about:blank') {
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

function checkAndInject(text) {
  // Instead of checking location.href (which throws SecurityError), 
  // we use a flag or just attempt injection after a short delay/load event.
  if (iframe.dataset.loaded === "true") {
    injectToGemini(text);
  } else {
    iframe.addEventListener('load', () => {
      iframe.dataset.loaded = "true";
      injectToGemini(text);
    }, { once: true });
  }
}

async function injectToGemini(text) {
  try {
    // Clear the prompt from storage so it won't re-run on manual refresh
    chrome.storage.local.remove('pendingPrompt');

    // We can't easily get the frameId for an iframe in an extension page from scripting.executeScript.
    // However, we can use the "allFrames: true" strategy to find it.
    // We need to target the tab that the side panel is currently associated with.
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.scripting.executeScript({
      target: { 
        tabId: tab.id,
        allFrames: true 
      },
      func: (promptText) => {
        // Only run on the Gemini frame
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
            // Trigger input events so Gemini UI updates
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('Gemini Extension: Prompt injected');
          }
        }
      },
      args: [text]
    });
  } catch (e) {
    console.error('Injection failed:', e);
  }
}

// Track load state
iframe.addEventListener('load', () => {
  iframe.dataset.loaded = "true";
  // We can't read the URL, but we can assume it's loading Gemini
});

// Refresh button
refreshBtn.addEventListener('click', () => {
  iframe.src = iframe.src;
});
