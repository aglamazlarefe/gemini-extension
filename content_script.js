console.log('Gemini Extension v1.8 Active - content_script.js');

function injectPrompt(promptText) {
  const selectors = [
    'div[contenteditable="true"]',
    'textarea',
    'input[type="text"]',
    '[role="textbox"]',
    '.input-area',
    '#prompt-textarea'
  ];

  let retryCount = 0;
  const maxRetries = 15;

  const findAndFill = () => {
    let inputField = null;
    for (const s of selectors) {
      inputField = document.querySelector(s);
      if (inputField && inputField.offsetParent !== null) break;
    }

    if (inputField) {
      console.log('Gemini Extension: Target found. Injecting...');
      const finalPrompt = "Explain this: " + promptText;
      
      inputField.focus();

      if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
        inputField.value = finalPrompt;
      } else {
        // Handle contenteditable with more care
        if (inputField.innerText !== finalPrompt) {
            inputField.innerText = finalPrompt;
        }
      }

      // Trigger all possible events to update internal state
      ['input', 'change', 'blur', 'keyup'].forEach(type => {
        inputField.dispatchEvent(new Event(type, { bubbles: true }));
      });

      chrome.storage.local.remove('pendingPrompt');
      console.log('Gemini Extension: Injection success.');
      return true;
    }
    return false;
  };

  if (findAndFill()) return;

  const observer = new MutationObserver((mutations, obs) => {
    if (findAndFill()) {
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  const interval = setInterval(() => {
     retryCount++;
     if (findAndFill() || retryCount >= maxRetries) {
         clearInterval(interval);
         observer.disconnect();
     }
  }, 1000);
}

chrome.storage.local.get(['pendingPrompt'], (result) => {
  if (result.pendingPrompt) {
    injectPrompt(result.pendingPrompt);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingPrompt && changes.pendingPrompt.newValue) {
    injectPrompt(changes.pendingPrompt.newValue);
  }
});
