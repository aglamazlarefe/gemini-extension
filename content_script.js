console.log('Gemini Extension v3.5 Active - content_script.js');

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


// 2. RESILIENT PROMPT INJECTION (v3.5)
function injectPromptWithRetry(promptText) {
  const selectors = [
    'div[contenteditable="true"]',
    'textarea',
    '[aria-label="Prompt"]',
    '[role="textbox"]',
    '.input-area'
  ];

  let retryCount = 0;
  const maxRetries = 15;
  const intervalTime = 800;

  const attemptInjection = () => {
    // BRAVE SHIELD COMPATIBILITY: Guard entire logic with try-catch
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

          // EVENT DISPATCHING (React/Angular Compatibility)
          // Using bubbles: true is critical for internal state recognition
          ['input', 'change', 'blur', 'keyup'].forEach(type => {
            inputField.dispatchEvent(new Event(type, { bubbles: true }));
          });

          // AUTO-SUBMIT
          setTimeout(() => {
              const sendButton = document.querySelector('button[aria-label*="Send"], button[aria-label*="Gönder"], .send-button');
              if (sendButton) {
                  sendButton.click();
              }
          }, 600);

          chrome.storage.local.remove('pendingPrompt');
          return true;
        }
    } catch (e) {
        // Silently ignore Brave Shield / Tracker block errors
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
