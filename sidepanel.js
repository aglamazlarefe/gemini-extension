console.log('Gemini Extension v4.0 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const dropOverlay = document.getElementById('drop-overlay');
const warningBanner = document.getElementById('warning-banner');
const warningMessage = document.getElementById('warning-message');
const closeWarningBtn = document.getElementById('close-warning-btn');
const DEFAULT_URL = "https://gemini.google.com/app";

let warningTimeout = null;
function showWarningBanner(msg) {
    warningMessage.textContent = msg;
    warningBanner.style.display = 'flex';

    if (warningTimeout) clearTimeout(warningTimeout);
    warningTimeout = setTimeout(() => {
        warningBanner.style.display = 'none';
    }, 8000);
}

closeWarningBtn.addEventListener('click', () => {
    warningBanner.style.display = 'none';
    if (warningTimeout) clearTimeout(warningTimeout);
});

/**
 * INITIALIZATION-ONLY LOAD (v4.0)
 */
chrome.storage.local.get(['lastGeminiUrl'], (result) => {
  iframe.src = result.lastGeminiUrl || DEFAULT_URL;
});

refreshBtn.addEventListener('click', () => {
    // Refresh preserving the current Gemini in-app URL (not the initial src attribute)
    try {
        const currentSrc = iframe.contentWindow?.location?.href;
        iframe.src = currentSrc || iframe.src || DEFAULT_URL;
    } catch (e) {
        // Cross-origin error when iframe is on a different origin; fall back to reloading current src
        iframe.src = iframe.src || DEFAULT_URL;
    }
});

// --- TOOLBAR LOGIC ---

const templates = {
    summarize: "Summarize the following content focusing on the most important points:\n\n",
    yks: "Explain this topic for a student following a standard curriculum (concise yet professional):\n\n",
    code: "Explain the logic of this code block, find any bugs, and suggest a more optimized version:\n\n",
    think: "Analyze this topic technically from a researcher's perspective:\n\n"
};

async function handleToolbarButtonClick(promptPrefix) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Safe URL check using optional chaining — tab.url may be undefined without "tabs" permission
        if (!tab) {
            showWarningBanner("Lütfen geçerli bir web sayfasında bu butonu kullanın.");
            return;
        }

        const url = tab.url || '';
        if (url.startsWith('chrome') || url.startsWith('about') || url.startsWith('brave') || url.startsWith('edge')) {
            showWarningBanner("Lütfen geçerli bir web sayfasında bu butonu kullanın.");
            return;
        }

        // activeTab izni kontrolü ile sayfa text'ini okuma hamlesi
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString() || document.body.innerText
        }, (results) => {
            if (chrome.runtime.lastError || !results || !results[0]) {
                // activeTab tetiklenmediğinde banner'ı gösterir
                showWarningBanner("Lütfen metni seçip sağ tıklayın veya Alt+Q kısayolunu kullanın");
                return;
            }

            const pageText = results[0].result;
            if (pageText) {
                // Limit text to 500KB to stay within storage.local quota (10MB total)
                const trimmed = pageText.length > 512000 ? pageText.slice(0, 512000) : pageText;
                chrome.storage.local.set({ pendingPrompt: `${promptPrefix}${trimmed}` });
            }
        });
    } catch (err) {
        console.error("Error executing toolbar action:", err);
        showWarningBanner("Lütfen metni seçip sağ tıklayın veya Alt+Q kısayolunu kullanın");
    }
}

document.getElementById('btn-summarize').addEventListener('click', () => handleToolbarButtonClick(templates.summarize));
document.getElementById('btn-yks').addEventListener('click', () => handleToolbarButtonClick(templates.yks));
document.getElementById('btn-code').addEventListener('click', () => handleToolbarButtonClick(templates.code));
document.getElementById('btn-think').addEventListener('click', () => handleToolbarButtonClick(templates.think));

// --- ROBUST DRAG AND DROP OVERLAY BRIDGE (v4.0) ---

let dragCounter = 0;

function hideDropOverlay() {
    dragCounter = 0;
    dropOverlay.style.display = 'none';
    iframe.style.setProperty('pointer-events', 'auto', 'important');
}

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
    if (dragCounter <= 0) {
        hideDropOverlay();
    }
});

// Safety net: if drag is cancelled (Esc) or ends outside the overlay, reset state
window.addEventListener('dragend', () => {
    // Small delay to let any remaining dragleave fire first
    setTimeout(() => {
        if (dragCounter > 0) {
            hideDropOverlay();
        }
    }, 0);
});

dropOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
});

dropOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    hideDropOverlay();

    let droppedText = e.dataTransfer.getData('text') || e.dataTransfer.getData('text/plain');

    if (droppedText) {
        console.log('Gemini Extension: Text captured, injecting...');
        // Limit text to 500KB
        const trimmed = droppedText.length > 512000 ? droppedText.slice(0, 512000) : droppedText;
        chrome.storage.local.set({ pendingPrompt: trimmed });
    }
});

// --- TAB SWITCHING LOGIC ---

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');

        // Update buttons
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `tab-${tabId}`) {
                content.classList.add('active');
            }
        });
    });
});

// --- TODO LIST LOGIC ---

const todoInput = document.getElementById('todo-input');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');

// Stable ID counter for todo items (avoids stale index issues)
let todoIdCounter = Date.now();

async function loadTodos() {
    try {
        const data = await chrome.storage.local.get(['todos']);
        const todos = data.todos || [];
        renderTodos(todos);
    } catch (err) {
        console.error("Failed to load todos:", err);
    }
}

function createSafeElement(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
        el.setAttribute(key, val);
    }
    if (text) el.textContent = text;
    return el;
}

function renderTodos(todos) {
    todoList.innerHTML = '';
    todos.forEach((todo) => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.done ? 'done' : ''}`;

        // Use createElement to avoid XSS via innerHTML
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        if (todo.done) checkbox.checked = true;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));

        const span = document.createElement('span');
        span.textContent = todo.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'todo-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);

        todoList.appendChild(li);
    });
}

async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    try {
        const data = await chrome.storage.local.get(['todos']);
        const todos = data.todos || [];
        todos.push({ id: todoIdCounter++, text, done: false });
        await chrome.storage.local.set({ todos });
        todoInput.value = '';
        renderTodos(todos);
    } catch (err) {
        console.error("Failed to add todo:", err);
    }
}

async function toggleTodo(id) {
    try {
        const data = await chrome.storage.local.get(['todos']);
        const todos = data.todos || [];
        const todo = todos.find(t => t.id === id);
        if (todo) {
            todo.done = !todo.done;
            await chrome.storage.local.set({ todos });
            renderTodos(todos);
        }
    } catch (err) {
        console.error("Failed to toggle todo:", err);
    }
}

async function deleteTodo(id) {
    try {
        const data = await chrome.storage.local.get(['todos']);
        const todos = data.todos || [];
        const filtered = todos.filter(t => t.id !== id);
        await chrome.storage.local.set({ todos: filtered });
        renderTodos(filtered);
    } catch (err) {
        console.error("Failed to delete todo:", err);
    }
}

addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});

// --- NOTES LOGIC ---

const notesArea = document.getElementById('notes-area');
const notesIndicator = document.getElementById('notes-saved-indicator');
const clearNotesBtn = document.getElementById('clear-notes-btn');
let saveTimeout;

// Flush pending save on page unload/hide to prevent data loss
function flushNotesSave() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
        chrome.storage.local.set({ notes: notesArea.value }).catch(err => {
            console.error("Failed to save notes on pagehide:", err);
        });
    }
}

window.addEventListener('pagehide', flushNotesSave);
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        flushNotesSave();
    }
});

async function loadNotes() {
    try {
        const data = await chrome.storage.local.get(['notes']);
        notesArea.value = data.notes || '';
    } catch (err) {
        console.error("Failed to load notes:", err);
    }
}

function saveNotes() {
    clearTimeout(saveTimeout);
    notesIndicator.textContent = 'Saving...';

    saveTimeout = setTimeout(async () => {
        try {
            await chrome.storage.local.set({ notes: notesArea.value });
            notesIndicator.textContent = '✓ Saved';
            setTimeout(() => {
                if (notesIndicator.textContent === '✓ Saved') {
                    notesIndicator.textContent = '';
                }
            }, 2000);
        } catch (err) {
            console.error("Failed to save notes:", err);
            notesIndicator.textContent = '✗ Save failed';
        }
    }, 800);
}

notesArea.addEventListener('input', saveNotes);

// Custom inline confirmation for clearing notes (replaces unreliable confirm() in panel)
const clearConfirmOverlay = document.getElementById('clear-confirm-overlay');
const clearConfirmYes = document.getElementById('clear-confirm-yes');
const clearConfirmNo = document.getElementById('clear-confirm-no');

clearNotesBtn.addEventListener('click', () => {
    clearConfirmOverlay.style.display = 'flex';
});

clearConfirmYes.addEventListener('click', async () => {
    clearConfirmOverlay.style.display = 'none';
    try {
        await chrome.storage.local.set({ notes: '' });
        notesArea.value = '';
        notesIndicator.textContent = '';
    } catch (err) {
        console.error("Failed to clear notes:", err);
    }
});

clearConfirmNo.addEventListener('click', () => {
    clearConfirmOverlay.style.display = 'none';
});

// Initialize (with error handling)
loadTodos().catch(err => console.error("Todo init error:", err));
loadNotes().catch(err => console.error("Notes init error:", err));
