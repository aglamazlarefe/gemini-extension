console.log('Gemini Extension v3.9 Active - sidepanel.js');

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
    summarize: "Summarize the following content focusing on the most important points: ",
    yks: "Explain this topic for a student following a standard curriculum (concise yet professional): ",
    code: "Explain the logic of this code block, find any bugs, and suggest a more optimized version: ",
    think: "Analyze this topic technically from a researcher's perspective: "
};

async function handleToolbarButtonClick(promptPrefix) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || tab.url.startsWith('chrome') || tab.url.startsWith('about')) {
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
                chrome.storage.local.set({ pendingPrompt: `${promptPrefix}:\n\n${pageText}` });
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
    
    let droppedText = e.dataTransfer.getData('text') || e.dataTransfer.getData('text/plain');

    if (droppedText) {
        console.log('Gemini Extension: Text captured, injecting...');
        chrome.storage.local.set({ pendingPrompt: droppedText });
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

async function loadTodos() {
    const data = await chrome.storage.local.get(['todos']);
    const todos = data.todos || [];
    renderTodos(todos);
}

function renderTodos(todos) {
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.done ? 'done' : ''}`;
        li.innerHTML = `
            <input type="checkbox" ${todo.done ? 'checked' : ''}>
            <span>${todo.text}</span>
            <button class="todo-delete">✕</button>
        `;

        li.querySelector('input').addEventListener('change', () => toggleTodo(index));
        li.querySelector('.todo-delete').addEventListener('click', () => deleteTodo(index));
        
        todoList.appendChild(li);
    });
}

async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    const data = await chrome.storage.local.get(['todos']);
    const todos = data.todos || [];
    todos.push({ text, done: false });
    
    await chrome.storage.local.set({ todos });
    todoInput.value = '';
    renderTodos(todos);
}

async function toggleTodo(index) {
    const data = await chrome.storage.local.get(['todos']);
    const todos = data.todos || [];
    todos[index].done = !todos[index].done;
    await chrome.storage.local.set({ todos });
    renderTodos(todos);
}

async function deleteTodo(index) {
    const data = await chrome.storage.local.get(['todos']);
    const todos = data.todos || [];
    todos.splice(index, 1);
    await chrome.storage.local.set({ todos });
    renderTodos(todos);
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

async function loadNotes() {
    const data = await chrome.storage.local.get(['notes']);
    notesArea.value = data.notes || '';
}

function saveNotes() {
    clearTimeout(saveTimeout);
    notesIndicator.textContent = 'Saving...';
    
    saveTimeout = setTimeout(async () => {
        await chrome.storage.local.set({ notes: notesArea.value });
        notesIndicator.textContent = '✓ Saved';
        setTimeout(() => {
            if (notesIndicator.textContent === '✓ Saved') {
                notesIndicator.textContent = '';
            }
        }, 2000);
    }, 800);
}

notesArea.addEventListener('input', saveNotes);

clearNotesBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all notes?')) {
        await chrome.storage.local.set({ notes: '' });
        notesArea.value = '';
        notesIndicator.textContent = '';
    }
});

// Initialize
loadTodos();
loadNotes();

