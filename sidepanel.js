const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Restore state from storage
chrome.storage.local.get(['lastUrl'], (result) => {
  const targetUrl = result.lastUrl || DEFAULT_URL;
  // Initialize ONLY if empty or different to prevent unnecessary flicker
  if (iframe.src === "" || iframe.src === "about:blank" || iframe.src !== targetUrl) {
    iframe.src = targetUrl;
  }
});

// Save URL periodically and on load
const saveUrl = () => {
  try {
    const currentUrl = iframe.contentWindow.location.href;
    if (currentUrl && currentUrl.startsWith('http') && currentUrl !== 'about:blank') {
      chrome.storage.local.set({ lastUrl: currentUrl });
    }
  } catch (e) {
    // Cross-origin prevents reading
  }
};

iframe.addEventListener('load', saveUrl);
setInterval(saveUrl, 5000);

// Refresh button
refreshBtn.addEventListener('click', () => {
  iframe.src = iframe.src;
});
