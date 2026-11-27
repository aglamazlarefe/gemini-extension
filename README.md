<p align="center">
  <img src="icon.png" width="128" height="128" alt="Gemini Side Panel Logo">
</p>

# Gemini Side Panel

[![Version](https://img.shields.io/badge/Version-4.1-blue.svg)](https://github.com/aglamazlarefe/gemini-extension/releases)
[![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Compatibility](https://img.shields.io/badge/Compatibility-Brave%20%7C%20Chrome-success.svg)](https://github.com/aglamazlarefe/gemini-extension)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Gemini Side Panel** is a high-performance productivity bridge that seamlessly integrates Google Gemini directly into the Brave and Chrome side panels. Designed for researchers, students, and power users, it eliminates tab-switching friction while providing context-aware AI assistance with a single click.

---

## 🚀 Features

| Feature | Description |
| :--- | :--- |
| **Send selection to Gemini** | Select text, then right-click → *Explain selection with Gemini* or press `Alt+Q`. The panel opens and the text is typed into Gemini and sent. |
| **Productivity toolbar** | One-click prompts that take the current page's selection (or the whole page text) and prepend an instruction. |
| **Drag and drop** | Drop text onto the panel to send it to Gemini. |
| **Session persistence** | The panel reopens the last Gemini chat you had open in it. |
| **Todo and Notes tabs** | A simple task list and a notes pad, saved locally in the browser. |

### 🛠 Toolbar buttons
- **Summarize**: key points of the selected text or page.
- **Exam Mode**: explains a topic for a student (concise but precise).
- **Code Analysis**: explains code, looks for bugs and suggests an optimized version.
- **AI Thoughts**: a technical analysis from a researcher's perspective.

The first time you use a toolbar button, the browser asks for permission to read pages. A click inside the side panel does not grant the temporary `activeTab` permission, so this optional permission is the only way for the buttons to read the page. If you decline, the right-click menu and `Alt+Q` keep working without it.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + S` | Open the Gemini side panel. |
| `Alt + Q` | Open the panel and send the selected text to Gemini (in the chat currently open in the panel). |

Shortcuts can be changed at `chrome://extensions/shortcuts`.

---

## ⚙️ How it works

- `sidepanel.html` embeds `https://gemini.google.com/app` in an iframe. `rules.json` removes the `X-Frame-Options` and `Content-Security-Policy` response headers on Gemini sub-frames so the page can load inside the panel.
- Text to send is written to `chrome.storage.local.pendingPrompt` (by `background.js` or `sidepanel.js`).
- `content_script.js` runs in Gemini frames but only acts inside the panel's own iframe (it checks that the parent frame is this extension). It types the prompt into Gemini's input with `document.execCommand('insertText')` and clicks Send. It also reports the current chat URL so the panel can reopen it.
- `chrome.sidePanel.open()` is called first in the context-menu and `Alt+Q` handlers, because Chrome only allows it in direct response to a user action.

Requires Chrome 116 or newer (or a Chromium browser such as Brave).

---

## 📥 Installation (Developer Mode)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/aglamazlarefe/gemini-extension.git
   ```
2. **Open Extensions Page**: Navigate to `brave://extensions/` or `chrome://extensions/`.
3. **Enable Developer Mode**: Toggle the switch in the top right corner.
4. **Load Unpacked**: Click "Load Unpacked" and select the root directory of this repository.

## 📦 Building the Chrome Web Store zip

Run `powershell -ExecutionPolicy Bypass -File paketle.ps1`. It writes `dist/gemini-side-panel-<version>.zip` containing only the files the extension needs (no `.git`, no `_metadata`).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<p align="center">
  Built with ❤️ for the future of AI productivity.
</p>