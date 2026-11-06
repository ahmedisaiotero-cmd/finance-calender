# Sync Chrome extension

Manifest V3 click-to-save capture for Ahmed's Sync instance. It does not auto-capture.

## Load unpacked

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Choose this folder: `extensions/sync-chrome`

## Pair

1. On the Sync site, open `/sync-lab/activity`
2. Enter `SYNC_OWNER_SECRET` and click **Issue pairing code**
3. In the extension Options, set the Sync site URL (`http://localhost:3000` or the Vercel URL)
4. Paste the pairing code and click **Claim pairing code**
5. Chrome may ask for permission to reach that site — allow it

Owner-secret fallback is supported in Options if you do not want to pair yet.

## Capture

1. Open ChatGPT, Claude, Grok, Cursor, or Gemini
2. Click the Sync extension icon
3. Click **Save this conversation**

Failed uploads stay in a local queue. Use **Retry queue** or **Clear queue** in the popup.

Supported page matches: `chatgpt.com`, `chat.openai.com`, `claude.ai`, `grok.com`, Grok on `x.com`, `cursor.com`, `gemini.google.com`.
