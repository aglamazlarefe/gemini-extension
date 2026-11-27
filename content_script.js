// This script is injected into every gemini.google.com frame (manifest: all_frames: true),
// but it must only act inside the Gemini iframe of OUR side panel. Otherwise prompts would be
// auto-sent into every ordinary Gemini tab the user has open.
//
// location.ancestorOrigins[0] is the origin of the direct parent frame. For the side panel
// iframe that is this extension's own chrome-extension:// origin.
function isInsideOurSidePanel() {
    if (window.top === window) return false; // a normal Gemini tab, not an iframe
    const ancestors = window.location.ancestorOrigins;
    if (!ancestors || ancestors.length === 0) return false;
    return ancestors[0] === `chrome-extension://${chrome.runtime.id}`;
}

if (window.location.hostname === "gemini.google.com" && isInsideOurSidePanel()) {

    // 1. URL TRACKING LOGIC
    // Gemini is a single-page app: opening a chat changes the URL with history.pushState,
    // which fires no popstate. The Navigation API reports those changes too (Chrome 102+).
    // lastUrl starts empty so the URL the panel loaded is reported once.
    let lastUrl = '';
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
    if (window.navigation) {
        window.navigation.addEventListener('currententrychange', reportUrlChange);
    }
    window.addEventListener('popstate', reportUrlChange);
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
