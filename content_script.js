console.log('Gemini Extension v2.1 Active - content_script.js');

// 1. URL TRACKING LOGIC (v2.1)
// Monitor URL changes and report to background for persistence
let lastUrl = window.location.href;

const reportUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && currentUrl.includes('gemini.google.com')) {
        lastUrl = currentUrl;
        chrome.runtime.sendMessage({
            type: "UPDATE_LAST_URL",
            url: currentUrl
        });
    }
};

// Listen for popstate (back/forward)
window.addEventListener('popstate', reportUrlChange);

// Listen for pushState/replaceState by observing the title or DOM changes
const urlObserver = new MutationObserver(() => {
    reportUrlChange();
});
urlObserver.observe(document.querySelector('head') || document.documentElement, {
    childList: true,
    subtree: true
});

// Initial report
reportUrlChange();


// 2. PROMPT INJECTION LOGIC (From v1.9/v2.0)
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
        if (inputField.innerText !== finalPrompt) {
            inputField.innerText = finalPrompt;
        }
      }

      ['input', 'change', 'blur', 'keyup'].forEach(type => {
        inputField.dispatchEvent(new Event(type, { bubbles: true }));
      });

      chrome.storage.local.remove('pendingPrompt');
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

// Prompt listeners
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
