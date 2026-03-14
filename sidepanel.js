console.log('Gemini Extension v3.1 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Initial load: Restore lastGeminiUrl
chrome.storage.local.get(['lastGeminiUrl'], (result) => {
  const targetUrl = result.lastGeminiUrl || DEFAULT_URL;
  iframe.src = targetUrl;
});

// Listen for storage changes to sync iframe URL (For Alt+Q new chat force)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastGeminiUrl) {
        // Direct assignment to avoid SecurityError (Write-only)
        iframe.src = changes.lastGeminiUrl.newValue;
    }
});

// Refresh button
refreshBtn.addEventListener('click', () => {
    // Reload safely
    iframe.src = iframe.src; 
});

// --- SMART BUTTON LOGIC (v3.1) ---

const templates = {
    summarize: "Aşağıdaki içeriği en önemli noktalarıyla özetle: ",
    yks: "Bu konuyu bir 12. sınıf öğrencisi için YKS (TYT/AYT) müfredatına uygun, sade ve akademik derinliği koruyarak anlat: ",
    code: "Bu kod bloğunun mantığını açıkla, varsa hataları bul ve daha optimize bir versiyonunu öner: ",
    think: "Bu konuyu bir araştırmacı gözüyle teknik olarak analiz et: "
};

async function sendTemplatePrompt(type) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;

    let context = "";
    
    // Safety check for restricted URLs
    const isRestricted = tab.url.startsWith('chrome://') || tab.url.startsWith('brave://') || tab.url.startsWith('about:');
    
    if (!isRestricted) {
        try {
            // Try to get selection
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString()
            });
            context = result[0]?.result;

            // Fallback to page content
            if (!context) {
                const pageResult = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => document.body.innerText
                });
                context = pageResult[0]?.result;
            }
        } catch (e) {
            console.error('Context capture failed:', e);
        }
    }

    if (context) {
        const finalPrompt = templates[type] + context;
        chrome.storage.local.set({ pendingPrompt: finalPrompt });
    }
}

document.getElementById('btn-summarize').addEventListener('click', () => sendTemplatePrompt('summarize'));
document.getElementById('btn-yks').addEventListener('click', () => sendTemplatePrompt('yks'));
document.getElementById('btn-code').addEventListener('click', () => sendTemplatePrompt('code'));
document.getElementById('btn-think').addEventListener('click', () => sendTemplatePrompt('think'));
