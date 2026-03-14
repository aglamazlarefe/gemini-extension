console.log('Gemini Extension v3.4 Active - content_script.js');

// 1. URL TRACKING LOGIC
let lastUrl = window.location.href;
const reportUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && currentUrl.includes('gemini.google.com')) {
        lastUrl = currentUrl;
        chrome.runtime.sendMessage({ type: "UPDATE_LAST_URL", url: currentUrl });
    }
};
window.addEventListener('popstate', reportUrlChange);
const urlObserver = new MutationObserver(() => reportUrlChange());
urlObserver.observe(document.querySelector('head') || document.documentElement, { childList: true, subtree: true });
reportUrlChange();


// 2. ROBUST PROMPT INJECTION (v3.4)
function injectPromptWithRetry(promptText) {
  const selectors = [
    'div[contenteditable="true"]',
    'textarea',
    '[aria-label="Prompt"]',
    '[role="textbox"]',
    '.input-area'
  ];

  let retryCount = 0;
  const maxRetries = 15; // ~12 seconds total with 800ms intervals
  const intervalTime = 800;

  console.log('Gemini Extension: Starting injection retry loop...');

  const attemptInjection = () => {
    // Check if the page is ready
    if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
        console.log('Gemini Extension: Document not ready, waiting...');
        return false;
    }

    let inputField = null;
    for (const s of selectors) {
      inputField = document.querySelector(s);
      if (inputField && inputField.offsetParent !== null) break;
    }

    if (inputField) {
      console.log('Gemini Extension: Target found. Injecting...');
      
      inputField.focus();

      // NATIVE INSERTION (execCommand)
      // This is the most robust way to trigger React/Angular state changes in Gemini
      try {
          // Select all and delete might be needed if there's old text
          // but usually insertText is safer for appending or starting fresh.
          document.execCommand('insertText', false, promptText);
      } catch (e) {
          console.warn('execCommand failed, falling back to direct property update');
          if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
            inputField.value = promptText;
          } else {
            inputField.innerText = promptText;
          }
      }

      // Trigger events to ensure internal state is updated
      ['input', 'change', 'blur', 'keyup'].forEach(type => {
        inputField.dispatchEvent(new Event(type, { bubbles: true }));
      });

      // --- AUTO-SUBMIT ---
      setTimeout(() => {
          const sendButton = document.querySelector('button[aria-label*="Send"], button[aria-label*="Gönder"], .send-button');
          if (sendButton) {
              sendButton.click();
              console.log('Gemini Extension: Auto-submitted successfully!');
          }
      }, 600);

      chrome.storage.local.remove('pendingPrompt');
      return true;
    }
    
    retryCount++;
    console.log(`Gemini Extension: Target not found, retry ${retryCount}/${maxRetries}...`);
    return false;
  };

  // Start the polling loop
  const interval = setInterval(() => {
    if (attemptInjection() || retryCount >= maxRetries) {
      clearInterval(interval);
      if (retryCount >= maxRetries) {
          console.error('Gemini Extension: Injection timed out after 10 seconds.');
      }
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
    console.log('Gemini Extension: New prompt detected in storage.');
    injectPromptWithRetry(changes.pendingPrompt.newValue);
  }
});
