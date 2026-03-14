console.log('Gemini Extension v3.8 Active - sidepanel.js');

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

// --- ROBUST DRAG AND DROP OVERLAY (v3.8) ---

let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
        dropOverlay.style.display = 'flex';
        iframe.style.pointerEvents = 'none'; // Prevent iframe from flickering
    }
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        dropOverlay.style.display = 'none';
        iframe.style.pointerEvents = 'auto';
    }
});

// Important: Must preventDefault on dragover to allow drop
dropOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
});

dropOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter = 0;
    dropOverlay.style.display = 'none';
    iframe.style.pointerEvents = 'auto';
    
    const droppedText = e.dataTransfer.getData('text');
    if (droppedText) {
        console.log('Gemini Extension: Text dropped on overlay, injecting...');
        chrome.storage.local.set({ pendingPrompt: droppedText });
    }
});
