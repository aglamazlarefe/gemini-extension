console.log('Gemini Extension v3.0 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Initial load: Restore lastGeminiUrl
chrome.storage.local.get(['lastGeminiUrl', 'lastVisitedGeminiUrl'], (result) => {
  const targetUrl = result.lastGeminiUrl || result.lastVisitedGeminiUrl || DEFAULT_URL;
  iframe.src = targetUrl;
});

// Refresh button
refreshBtn.addEventListener('click', () => {
  chrome.storage.local.get(['lastGeminiUrl'], (result) => {
      iframe.src = result.lastGeminiUrl || DEFAULT_URL;
  });
});

// --- SMART BUTTON LOGIC (v3.0) ---

const templates = {
    summarize: "Aşağıdaki içeriği en önemli noktalarıyla özetle: ",
    yks: "Bu konuyu bir 12. sınıf öğrencisi için YKS (TYT/AYT) müfredatına uygun, sade ve akademik derinliği koruyarak anlat: ",
    code: "Bu kod bloğunun mantığını açıkla, varsa hataları bul ve daha optimize bir versiyonunu öner: ",
    analyze: "Bu konuya/makaleye bir araştırmacı gözüyle bakmanı istiyorum. Buradaki yaklaşımın güçlü ve zayıf yönleri nelerdir? Alternatif ne yapılabilirdi? "
};

async function sendTemplatePrompt(type) {
    // Get current tab content or selection
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;

    // Try to get selection
    const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
    });

    let context = result[0].result;
    
    // Fallback to page content if no selection
    if (!context) {
        const pageResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
        });
        context = pageResult[0].result;
    }

    if (context) {
        const finalPrompt = templates[type] + context;
        chrome.storage.local.set({ pendingPrompt: finalPrompt });
    }
}

document.getElementById('summarizeBtn').addEventListener('click', () => sendTemplatePrompt('summarize'));
document.getElementById('yksBtn').addEventListener('click', () => sendTemplatePrompt('yks'));
document.getElementById('codeBtn').addEventListener('click', () => sendTemplatePrompt('code'));
document.getElementById('analyzeBtn').addEventListener('click', () => sendTemplatePrompt('analyze'));
