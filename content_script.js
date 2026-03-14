function injectPrompt(promptText) {
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
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('Gemini Extension: Prompt injected successfully via content script');
    // Clear storage after successful injection
    chrome.storage.local.remove('pendingPrompt');
  }
}

// Check for pending prompt on initial load
chrome.storage.local.get(['pendingPrompt'], (result) => {
  if (result.pendingPrompt) {
    // Small delay to ensure Gemini's UI is interactive
    setTimeout(() => injectPrompt(result.pendingPrompt), 1500);
  }
});

// Listen for updates while the page is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingPrompt && changes.pendingPrompt.newValue) {
    injectPrompt(changes.pendingPrompt.newValue);
  }
});
