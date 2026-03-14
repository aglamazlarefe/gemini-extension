console.log('Gemini Extension v1.7 Active - content_script.js');

function injectPrompt(promptText) {
  const selectors = [
    'div[contenteditable="true"]',
    'textarea',
    'input[type="text"]',
    '[role="textbox"]',
    '.input-area',
    '#prompt-textarea' // Specific identifier some versions use
  ];

  let retryCount = 0;
  const maxRetries = 10;

  const findAndFill = () => {
    let inputField = null;
    for (const s of selectors) {
      inputField = document.querySelector(s);
      if (inputField && inputField.offsetParent !== null) break; // Ensure it's visible
    }

    if (inputField) {
      console.log('Gemini Extension: Target input found. Injecting...');
      const finalPrompt = "Explain this: " + promptText;
      
      // Focus first
      inputField.focus();

      if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
        inputField.value = finalPrompt;
      } else {
        // Handle contenteditable
        inputField.innerText = finalPrompt;
        // Also try innerHTML for some frameworks
        if (inputField.innerHTML === '') {
            inputField.innerHTML = `<div>${finalPrompt}</div>`;
        }
      }

      // Dispatch a sequence of events to satisfy complex UI frameworks (Angular/React/etc)
      const events = ['input', 'change', 'blur'];
      events.forEach(type => {
        inputField.dispatchEvent(new Event(type, { bubbles: true }));
      });

      // Clear the prompt from storage once handled
      chrome.storage.local.remove('pendingPrompt');
      return true;
    }
    return false;
  };

  // Immediate attempt
  if (findAndFill()) return;

  // MutationObserver for dynamic load
  const observer = new MutationObserver((mutations, obs) => {
    if (findAndFill()) {
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Polling fallback every 1s for 10 seconds
  const interval = setInterval(() => {
     retryCount++;
     if (findAndFill() || retryCount >= maxRetries) {
         clearInterval(interval);
         observer.disconnect();
     }
  }, 1000);
}

// Check for pending prompt on initial load
chrome.storage.local.get(['pendingPrompt'], (result) => {
  if (result.pendingPrompt) {
    injectPrompt(result.pendingPrompt);
  }
});

// Listen for updates while the page is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingPrompt && changes.pendingPrompt.newValue) {
    injectPrompt(changes.pendingPrompt.newValue);
  }
});
