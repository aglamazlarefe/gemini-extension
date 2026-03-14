console.log('Gemini Extension v3.2 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Initial load
chrome.storage.local.get(['lastGeminiUrl'], (result) => {
  iframe.src = result.lastGeminiUrl || DEFAULT_URL;
});

// Sync iframe on storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastGeminiUrl) {
        iframe.src = changes.lastGeminiUrl.newValue;
    }
});

refreshBtn.addEventListener('click', () => {
    iframe.src = iframe.src; 
});

// --- CROSS-FRAME PROMPT INJECTION (v3.2) ---

const templates = {
    summarize: "Aşağıdaki içeriği en önemli noktalarıyla özetle: ",
    yks: "Bu konuyu bir 12. sınıf öğrencisi için YKS (TYT/AYT) müfredatına uygun, sade ve akademik derinliği koruyarak anlat: ",
    code: "Bu kod bloğunun mantığını açıkla, varsa hataları bul ve daha optimize bir versiyonunu öner: ",
    think: "Bu konuyu bir araştırmacı gözüyle teknik olarak analiz et: "
};

/**
 * Injection Function to be run in all frames of the active tab (targeting the Gemini iframe)
 */
function geminiFrameInjector(fullPrompt) {
    const inputField = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
    if (inputField && inputField.offsetParent !== null) {
        inputField.focus();
        // Clear old content if necessary, though insertText usually handles it
        document.execCommand('insertText', false, fullPrompt);
        
        // Auto-submit after a small delay
        setTimeout(() => {
            const sendButton = document.querySelector('button[aria-label*="Send"], button[aria-label*="Gönder"], .send-button');
            if (sendButton) sendButton.click();
        }, 500);
        return true;
    }
    return false;
}

async function handleToolbarClick(type) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;

    // Get the base text from storage (pendingPrompt) or selection
    chrome.storage.local.get(['pendingPrompt'], async (result) => {
        let baseText = result.pendingPrompt || "";
        
        // If storage empty, try to grab selection/page text
        if (!baseText && !tab.url.startsWith('chrome')) {
            try {
                const res = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => window.getSelection().toString() || document.body.innerText
                });
                baseText = res[0]?.result || "";
            } catch (e) {}
        }

        if (baseText) {
            const fullPrompt = templates[type] + baseText;
            
            // INJECT INTO ALL FRAMES (to reach the Gemini iframe cross-origin)
            chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                func: geminiFrameInjector,
                args: [fullPrompt]
            });
        }
    });
}

document.getElementById('btn-summarize').addEventListener('click', () => handleToolbarClick('summarize'));
document.getElementById('btn-yks').addEventListener('click', () => handleToolbarClick('yks'));
document.getElementById('btn-code').addEventListener('click', () => handleToolbarClick('code'));
document.getElementById('btn-think').addEventListener('click', () => handleToolbarClick('think'));
