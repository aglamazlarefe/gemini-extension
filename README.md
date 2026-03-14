<p align="center">
  <img src="icon.png" width="128" height="128" alt="Gemini Side Panel Logo">
</p>

# Gemini Side Panel

[![Version](https://img.shields.io/badge/Version-3.5-blue.svg)](https://github.com/aglamazlarefe/gemini-extension/releases)
[![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Compatibility](https://img.shields.io/badge/Compatibility-Brave%20%7C%20Chrome-success.svg)](https://github.com/aglamazlarefe/gemini-extension)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Gemini Side Panel** is a high-performance productivity bridge that seamlessly integrates Google Gemini directly into the Brave and Chrome side panels. Designed for researchers, students, and power users, it eliminates tab-switching friction while providing context-aware AI assistance with a single click.

---

## 💎 Key Pillars

- **Stability**: Robust polling and "Write-Only" security architecture prevent cross-origin errors and session loops.
- **Security**: Operates with strict adherence to Chromium's Manifest V3 security standards, ensuring user data privacy.
- **Speed**: Optimized injection engine ensures zero-latency prompt delivery even behind Brave's aggressive Shields.

---

## 🚀 Feature Showcase

| Feature | Description | Emojis |
| :--- | :--- | :---: |
| **Context-Aware Trigger** | Instantly analyze selected text or entire pages with a single shortcut. | 🧠⚡ |
| **Smart Productivity Toolbar** | One-click actions for Summarization, Code Analysis, and Academic Deep-Dives. | 🛠️📑 |
| **Zero-Reload Architecture** | Advanced state management prevents infinite refresh loops and ensures persistence. | 🔄🚫 |
| **Resilient Injection** | Robust polling (800ms) ensures prompts reach Gemini even if the UI is slow to load. | 🛡️🛰️ |
| **Session Persistence** | Resumes exactly where you left off, maintaining your ongoing research flow. | 💾📈 |

### 🛠 Smart Toolbar Breakdown
- **Summarize**: Condense arXiv papers or long articles into key bullet points.
- **YKS-Style Explain**: Simplifies complex academic topics for students preparing for higher-level exams (TYT/AYT).
- **Code Analysis**: Deep-dive into logic, bug detection, and optimization suggestions for developers.
- **Technical Analysis**: A researcher-focused analysis of the strengths and weaknesses of any technical document.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Alt + S` | **Toggle Panel** | Instantly opens or closes the Gemini Side Panel. |
| `Alt + Q` | **AI Context Trigger** | Captures selection (or page) and forces a *New Chat* in Gemini. |

---

## ⚙️ Under The Hood (Engineering Depth)

The Gemini Side Panel utilizes a sophisticated **Asynchronous Injection Engine** designed to handle the challenges of modern web security:
- **Brave Shield Compatibility**: The extension implements silent error-handling to bypass `ERR_BLOCKED_BY_CLIENT` warnings caused by tracker blocking, focusing purely on operational logic.
- **Native Input Simulation**: By utilizing `document.execCommand('insertText')` combined with synthetic event dispatching, the extension ensures that Gemini's internal state (React/Angular) reflects the injected prompt immediately.
- **Synchronous Gesture Preservation**: Special care is taken to call `chrome.sidePanel.open` synchronously at the exact moment of user input (`onCommand`), ensuring the "User Gesture" token never expires.

---

## 📥 Installation (Developer Mode)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/aglamazlarefe/gemini-extension.git
   ```
2. **Open Extensions Page**: Navigate to `brave://extensions/` or `chrome://extensions/`.
3. **Enable Developer Mode**: Toggle the switch in the top right corner.
4. **Load Unpacked**: Click "Load Unpacked" and select the root directory of this repository.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<p align="center">
  Built with ❤️ for the future of AI productivity.
</p>