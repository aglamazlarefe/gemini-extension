# Privacy Policy for Gemini Side Panel

**Last Updated:** November 27, 2026

This Privacy Policy describes how "Gemini Side Panel" ("we", "our", or "the extension") handles user data. We are committed to ensuring your privacy and protecting any information processed during your use of the extension.

## 1. Data Collection and Usage
- **No Personal Data Collection:** The extension does not collect, store, or transmit any personally identifiable information (PII) to external servers owned by us or any third parties.
- **Local Storage:** The following is stored exclusively on your local machine using the `chrome.storage.local` API and never leaves your device:
  - the Todo list and notes you write in the extension;
  - the URL of the last Gemini chat opened in the side panel, so the panel can reopen it;
  - text you send to Gemini, briefly, until it has been typed into the Gemini input (then it is deleted).
- **Contextual Data Processing:** When you use features such as text selection or right-click context analysis, the text content is processed locally and passed directly into the standard official Google Gemini interface embedded inside your side panel. We do not inspect, log, or harvest this text.

## 2. Third-Party Services
The extension embeds the official Google Gemini interface (`https://gemini.google.com`) inside a secure iframe to facilitate AI assistant capabilities. Any interaction, prompt submission, or session tracking within that iframe is strictly subject to Google's own Privacy Policy and Terms of Service. We have no control over and assume no responsibility for Google's data handling practices.

## 3. Permissions
The extension requests specific browser permissions (`sidePanel`, `storage`, `contextMenus`, `scripting`, `activeTab`, `declarativeNetRequestWithHostAccess`, and host access to `https://gemini.google.com/*`) solely to provide core layout mechanics, iframe headers, local state retention, and context-based quick prompt actions.

The toolbar buttons additionally ask, on first use, for the optional permission to read web pages (`<all_urls>`). It is used only to read the selected text or page text of the active tab at the moment you click a toolbar button. You can decline it or remove it at any time from the browser's extension settings.

None of these permissions are utilized for user tracking or analytical profiling.

## 4. Changes to This Policy
We may update our Privacy Policy from time to time. Any changes will be reflected directly on this page with an updated modification date.

## 5. Contact
If you have any questions or concerns regarding this privacy statement, please open an issue on our official repository.