# Sync Chrome extension

Manifest V3 click-to-save capture for Ahmed's Sync instance. It does not auto-capture.

## Load unpacked

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Choose this folder: `extensions/sync-chrome`

## Pair

1. Sign in on the Sync site
2. Open **Settings** and click **Issue pairing code**
3. In the extension Options, set the Sync site URL (`http://localhost:3000` or the Vercel URL)
4. Paste the pairing code and click **Claim pairing code**
5. Chrome may ask for permission to reach that site — allow it

Privacy, Terms, and the add-on disclosure are linked in the popup and Options (`/privacy`, `/terms`, `/chrome-privacy`).

## Capture

1. Open ChatGPT, Claude, Grok, Cursor, or Gemini
2. Click the Sync extension icon
3. Click **Save this conversation**

Failed uploads stay in a local queue. Use **Retry queue** or **Clear queue** in the popup.

Supported page matches: `chatgpt.com`, `chat.openai.com`, `claude.ai`, `grok.com`, Grok paths on `x.com` (`/i/grok`, `/grok`), `cursor.com`, `gemini.google.com`. There is no `https://*/*` permission.

The first capture requires an in-popup disclosure and checkbox. Pairing uses a Settings code only — no owner secret in the add-on.

Before Chrome Web Store upload, add the production Sync origin to `host_permissions` (for example `https://your-domain.example/*`) and set `SYNC_EXTENSION_IDS` on the server to the published extension ID.
