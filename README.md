# AI Autofill Chrome Extension

A Chrome extension that uses a local LLM (Ollama) to classify and autofill web forms, streamlining repetitive data entry with AI-driven intelligence.

---

## Features

- **Form Extraction:** Automatically detects and extracts all visible input, textarea, and select fields from the current web page.
- **AI Classification:** Sends field attributes to a local LLM (Ollama) to classify each field (e.g., name, email, address).
- **Autofill:** Retrieves saved user data and fills in the appropriate fields, including intelligent selection for dropdowns.
- **Persistent Storage:** Saves user data locally for future autofill sessions.
- **User-Friendly UI:** Popup interface for reviewing and editing personal information.

---

## How It Works

### 1. Popup UI
- The extension popup (`popup.html`/`popup.js`) displays a multi-page form for users to enter and save their personal information.
- Data is saved to Chrome’s local storage as the user types.

### 2. Capturing Form Fields
- When the user clicks the **Capture** button, the extension:
  - Injects a content script (`content.js`) into the active tab.
  - Extracts all visible input, textarea, and select fields, collecting their attributes and context (labels, surrounding tags, etc.).
  - Sends this data back to the popup.

### 3. AI Classification
- The popup sends the extracted field data to a local Ollama LLM API (`/api/generate`) with a prompt to classify each field.
- The LLM returns a list of field types (e.g., `first_name`, `email`, etc.).

### 4. Autofilling
- The popup sends a message to the content script with the field IDs and their classifications.
- For each field:
  - If it’s a text input, the content script retrieves the corresponding value from local storage and fills it in.
  - If it’s a select (dropdown), the script uses the LLM to match the best option based on the stored value and available options.

### 5. Data Persistence
- All user data is stored in Chrome’s local storage and is automatically loaded into the popup form on subsequent visits.

---

## Implementation Details

- **Chrome Extension APIs:** Uses `chrome.storage.local` for data, `chrome.tabs` and `chrome.scripting` for communication and script injection.
- **Content Script:** Handles DOM extraction and autofilling, communicates with the popup via message passing.
- **Popup Script:** Manages the UI, user data, and orchestrates the AI classification and autofill process.
- **Ollama Integration:** Sends prompts and receives responses from a local Ollama LLM server for field classification and dropdown matching.

---

## Setting Up Ollama for CORS

By default, Ollama’s API does **not** allow cross-origin requests from browser extensions, which can cause CORS errors. To allow your extension to communicate with Ollama, you need to enable CORS on the Ollama server.

### How to Enable CORS in Ollama

1. **Stop Ollama if it’s running.**
2. **Start Ollama with the `OLLAMA_ALLOW_ORIGINS` environment variable:**

   On **Windows** (Command Prompt):
   ```
   set OLLAMA_ALLOW_ORIGINS=chrome-extension://<your-extension-id>
   ollama serve
   ```

   On **PowerShell**:
   ```
   $env:OLLAMA_ALLOW_ORIGINS="chrome-extension://<your-extension-id>"
   ollama serve
   ```

   On **macOS/Linux**:
   ```
   export OLLAMA_ALLOW_ORIGINS=chrome-extension://<your-extension-id>
   ollama serve
   ```

   Replace `<your-extension-id>` with your extension’s actual ID (found on `chrome://extensions` after loading your unpacked extension).

3. **Verify:**  
   Your extension should now be able to make requests to `http://localhost:11434/api/generate` without CORS errors.

---

## Installation & Usage

1. **Clone or download this repository.**
2. **Install [Ollama](https://ollama.com/) and start the server as described above.**
3. **Load the extension in Chrome:**
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project folder
4. **Open the extension popup, enter your information, and click "Capture" on any form page to autofill.**

## Pending Improvements

1. An improved model for processing information faster and more accurately.
2. An improved filtering process for better context.
