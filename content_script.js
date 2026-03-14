console.log('Gemini Extension: content_script.js v1.6 loaded');

function injectPrompt(promptText) {
  const selectors = [
    'div[contenteditable="true"]',
    'textarea',
    '.input-area',
    '[role="textbox"]'
  ];

  const findAndFill = () => {
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
        // Handle contenteditable
        inputField.innerText = finalPrompt;
      }
      
      // Essential for triggering React/Angular/Vue internal state updates
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('Gemini Extension: Prompt injected!');
      chrome.storage.local.remove('pendingPrompt');
      return true;
    }
    return false;
  };

  // Try immediately
  if (findAndFill()) return;

  // Use MutationObserver for dynamic load
  const observer = new MutationObserver((mutations, obs) => {
    if (findAndFill()) {
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Timeout fallback
  setTimeout(() => observer.disconnect(), 10000);
}

// Initial check
chrome.storage.local.get(['pendingPrompt'], (result) => {
  if (result.pendingPrompt) {
    injectPrompt(result.pendingPrompt);
  }
});

// Real-time listener
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingPrompt && changes.pendingPrompt.newValue) {
    injectPrompt(changes.pendingPrompt.newValue);
  }
});
