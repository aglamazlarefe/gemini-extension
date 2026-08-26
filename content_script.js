console.log('Gemini Extension v4.0 Active - content_script.js');

// Check hostname (not full URL) to avoid substring-match false positives
if (window.location.hostname === "gemini.google.com") {

    // 1. URL TRACKING LOGIC
    let lastUrl = window.location.href;
    const reportUrlChange = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            // Send message with error handling (background may not be listening during reload)
            chrome.runtime.sendMessage({ type: "UPDATE_LAST_URL", url: currentUrl }).catch(() => {
                // Background SW not available — this is normal during extension reload
            });
        }
    };
    window.addEventListener('popstate', reportUrlChange);

    // Narrow MutationObserver scope: only observe <title> for SPA navigation changes
    // This is much cheaper than observing <head> with subtree:true
    const titleEl = document.querySelector('title');
    let urlObserver = null;
    if (titleEl) {
        urlObserver = new MutationObserver(() => reportUrlChange());
        urlObserver.observe(titleEl, { childList: true });
    } else {
        // Fallback: observe head with reduced scope
        const head = document.querySelector('head');
        if (head) {
            urlObserver = new MutationObserver(() => reportUrlChange());
            urlObserver.observe(head, { childList: true, subtree: false });
        }
    }
    reportUrlChange();

    // 2. RESILIENT PROMPT INJECTION
    // In-flight lock to prevent duplicate concurrent injection attempts
    let isInjecting = false;
    let injectTimer = null;

    function injectPromptWithRetry(promptText) {
        // If already injecting, ignore duplicate trigger
        if (isInjecting) return;
        isInjecting = true;

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
                retryCount++; // Increment FIRST so early returns don't skip the budget

                if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
                    return false;
                }

                let inputField = null;
                let visibleFound = false;
                for (const s of selectors) {
                    const el = document.querySelector(s);
                    if (el && el.offsetParent !== null) {
                        inputField = el;
                        visibleFound = true;
                        break;
                    }
                }
                // Only keep the last element if none was visible
                if (!visibleFound) {
                    inputField = null;
                }

                if (inputField) {
                    inputField.focus();

                    // Use execCommand as primary (works in contenteditable).
                    // execCommand is deprecated but still functional for this use case
                    const success = document.execCommand('insertText', false, promptText);

                    // If execCommand fails (e.g., not a contenteditable), try direct value assignment
                    if (!success && (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT')) {
                        inputField.value = promptText;
                        // Dispatch an InputEvent for React/Angular listeners to detect
                        inputField.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
                    }

                    // Dispatch proper KeyboardEvent for framework compatibility
                    const keyboardEvents = ['keydown', 'keyup'];
                    keyboardEvents.forEach(type => {
                        inputField.dispatchEvent(new KeyboardEvent(type, {
                            bubbles: true,
                            cancelable: true,
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13
                        }));
                    });

                    // Also dispatch input/change events
                    const uiEvents = ['input', 'change'];
                    uiEvents.forEach(type => {
                        inputField.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
                    });

                    setTimeout(() => {
                        const sendButton = document.querySelector(
                            'button[aria-label*="Send"], button[aria-label*="Gönder"], .send-button'
                        );
                        if (sendButton && !sendButton.disabled) {
                            sendButton.click();
                        }
                    }, 800);

                    // Clean up pendingPrompt on success
                    chrome.storage.local.remove('pendingPrompt').catch(() => {});
                    clearInjectResources();
                    return true;
                }
            } catch (e) {
                console.error('Gemini Extension: Injection error:', e);
            }

            return false;
        };

        const clearInjectResources = () => {
            if (injectTimer) {
                clearInterval(injectTimer);
                injectTimer = null;
            }
            isInjecting = false;
        };

        injectTimer = setInterval(() => {
            if (attemptInjection() || retryCount >= maxRetries) {
                clearInjectResources();
                // Clean up pendingPrompt even on failure to prevent stale auto-send
                if (retryCount >= maxRetries) {
                    chrome.storage.local.remove('pendingPrompt').catch(() => {});
                    console.warn('Gemini Extension: Max retries reached, cleared pending prompt.');
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
            injectPromptWithRetry(changes.pendingPrompt.newValue);
        }
    });
}
