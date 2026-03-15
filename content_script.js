console.log('Gemini Extension v3.9 Active - content_script.js');

// --- 0. GLOBAL DRAG LISTENER (v3.9 BRIDGE) ---
let lastDraggedText = "";

window.addEventListener('dragstart', (e) => {
    let text = window.getSelection().toString();
    if (!text && e.target && e.target.innerText) {
        text = e.target.innerText;
    }
    if (text) {
        lastDraggedText = text;
        console.log("Gemini Extension: Captured dragged text");
    }
});

window.addEventListener('dragend', () => {
    // Keep it briefly in case the drop event needs it immediately after
    setTimeout(() => { lastDraggedText = ""; }, 1000); 
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_DRAGGED_TEXT") {
        sendResponse({ text: lastDraggedText });
        return true; 
    }
});

// --- GEMINI SPECIFIC LOGIC ---
if (window.location.href.includes("gemini.google.com")) {
    
    // 1. URL TRACKING LOGIC
    let lastUrl = window.location.href;
    const reportUrlChange = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            chrome.runtime.sendMessage({ type: "UPDATE_LAST_URL", url: currentUrl });
        }
    };
    window.addEventListener('popstate', reportUrlChange);
    const urlObserver = new MutationObserver(() => reportUrlChange());
    urlObserver.observe(document.querySelector('head') || document.documentElement, { childList: true, subtree: true });
    reportUrlChange();


    // 2. RESILIENT PROMPT INJECTION (v3.9)
    function injectPromptWithRetry(promptText) {
      const selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        'textarea',
        '[aria-label="Prompt"]',
        '.input-area'
      ];

      let retryCount = 0;
      const maxRetries = 15;
      const intervalTime = 800;

      const attemptInjection = () => {
        try {
            if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
                return false;
            }

            let inputField = null;
            for (const s of selectors) {
              inputField = document.querySelector(s);
              if (inputField && inputField.offsetParent !== null) break;
            }

            if (inputField) {
              inputField.focus();

              // NATIVE INSERTION
              document.execCommand('insertText', false, promptText);

              // STRICT EVENT DISPATCH SEQUENCE (v3.9)
              const eventsToDispatch = ['keydown', 'input', 'keyup', 'change'];
              eventsToDispatch.forEach(type => {
                const event = new Event(type, { bubbles: true, cancelable: true });
                inputField.dispatchEvent(event);
              });

              // AUTO-SUBMIT
              setTimeout(() => {
                  const sendButton = document.querySelector('button[aria-label*="Send"], button[aria-label*="Gönder"], .send-button');
                  if (sendButton && !sendButton.disabled) {
                      sendButton.click();
                  }
              }, 800);

              chrome.storage.local.remove('pendingPrompt');
              return true;
            }
        } catch (e) {
            console.warn('Gemini Extension: Injection cycle suppressed tracker warning.');
        }
        
        retryCount++;
        return false;
      };

      const interval = setInterval(() => {
        if (attemptInjection() || retryCount >= maxRetries) {
          clearInterval(interval);
        }
      }, intervalTime);
    }

    // Prompt listeners
    chrome.storage.local.get(['pendingPrompt'], (result) => {
      if (result.pendingPrompt) {
        injectPromptWithRetry(result.pendingPrompt);
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.pendingPrompt && changes.pendingPrompt.newValue) {
        injectPromptWithRetry(changes.pendingPrompt.newValue);
      }
    });
}
