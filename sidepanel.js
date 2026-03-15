console.log('Gemini Extension v3.9 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const dropOverlay = document.getElementById('drop-overlay');
const DEFAULT_URL = "https://gemini.google.com/app";

/**
 * INITIALIZATION-ONLY LOAD (v3.5)
 */
chrome.storage.local.get(['lastGeminiUrl'], (result) => {
  iframe.src = result.lastGeminiUrl || DEFAULT_URL;
});

refreshBtn.addEventListener('click', () => {
    iframe.src = iframe.src; 
});

// --- TOOLBAR LOGIC ---

const templates = {
    summarize: "Aşağıdaki içeriği en önemli noktalarıyla özetle: ",
    yks: "Bu konuyu bir 12. sınıf öğrencisi için YKS (TYT/AYT) müfredatına uygun, sade ve akademik derinliği koruyarak anlat: ",
    code: "Bu kod bloğunun mantığını açıkla, varsa hataları bul ve daha optimize bir versiyonunu öner: ",
    think: "Bu konuyu bir araştırmacı gözüyle teknik olarak analiz et: "
};

async function handleToolbarClick(type) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab) return;

    chrome.storage.local.get(['pendingPrompt'], async (result) => {
        let baseText = result.pendingPrompt || "";
        
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
            chrome.storage.local.set({ pendingPrompt: finalPrompt });
        }
    });
}

document.getElementById('btn-summarize').addEventListener('click', () => handleToolbarClick('summarize'));
document.getElementById('btn-yks').addEventListener('click', () => handleToolbarClick('yks'));
document.getElementById('btn-code').addEventListener('click', () => handleToolbarClick('code'));
document.getElementById('btn-think').addEventListener('click', () => handleToolbarClick('think'));

// --- ROBUST DRAG AND DROP OVERLAY BRIDGE (v3.9) ---

let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
        dropOverlay.style.display = 'flex';
        iframe.style.setProperty('pointer-events', 'none', 'important');
    }
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        dropOverlay.style.display = 'none';
        iframe.style.setProperty('pointer-events', 'auto', 'important');
    }
});

dropOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
});

dropOverlay.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter = 0;
    dropOverlay.style.display = 'none';
    iframe.style.setProperty('pointer-events', 'auto', 'important');
    
    let droppedText = e.dataTransfer.getData('text');
    
    // Cross-Origin Bridge: If text is empty due to security, ask the content script
    if (!droppedText) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0] && !tabs[0].url.startsWith('chrome')) {
                const response = await chrome.tabs.sendMessage(tabs[0].id, { type: "GET_DRAGGED_TEXT" });
                if (response && response.text) {
                    droppedText = response.text;
                }
            }
        } catch (err) {
            console.warn("Gemini Extension: Failed to fetch dragged text via bridge.", err);
        }
    }

    if (droppedText) {
        console.log('Gemini Extension: Text captured, injecting...');
        chrome.storage.local.set({ pendingPrompt: droppedText });
    }
});
