console.log('Gemini Extension v3.4 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Initial load
chrome.storage.local.get(['lastGeminiUrl'], (result) => {
  iframe.src = result.lastGeminiUrl || DEFAULT_URL;
});

// Sync iframe on storage changes (For Alt+Q new chat force)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastGeminiUrl) {
        iframe.src = changes.lastGeminiUrl.newValue;
    }
});

refreshBtn.addEventListener('click', () => {
    iframe.src = iframe.src; 
});

// --- TOOLBAR LOGIC (v3.4) ---

const templates = {
    summarize: "Aşağıdaki içeriği en önemli noktalarıyla özetle: ",
    yks: "Bu konuyu bir 12. sınıf öğrencisi için YKS (TYT/AYT) müfredatına uygun, sade ve akademik derinliği koruyarak anlat: ",
    code: "Bu kod bloğunun mantığını açıkla, varsa hataları bul ve daha optimize bir versiyonunu öner: ",
    think: "Bu konuyu bir araştırmacı gözüyle teknik olarak analiz et: "
};

async function handleToolbarClick(type) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;

    // Get the base text from storage (pendingPrompt) or capture from page
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
            } catch (e) {
                console.warn('Failed to capture context from page.');
            }
        }

        if (baseText) {
            const finalPrompt = templates[type] + baseText;
            // Update storage - content_script.js will see this and attempt injection in all Gemini instances
            chrome.storage.local.set({ pendingPrompt: finalPrompt });
        }
    });
}

document.getElementById('btn-summarize').addEventListener('click', () => handleToolbarClick('summarize'));
document.getElementById('btn-yks').addEventListener('click', () => handleToolbarClick('yks'));
document.getElementById('btn-code').addEventListener('click', () => handleToolbarClick('code'));
document.getElementById('btn-think').addEventListener('click', () => handleToolbarClick('think'));
