# Chrome Web Store privacy disclosure

Single purpose: click-to-save the AI conversation on the current tab into the signed-in user’s Sync account.

Data used:
- Conversation text the user chooses to save (secrets redacted locally first)
- Page origin, provider, optional title, capture time
- Device pairing token (server stores a hash only)

Remote hosts: only the Sync site URL the user configures.

Not used for ads. Not sold. Not transferred except to operate Sync (see the site Privacy Policy and Limited Use statement at `/chrome-privacy`).

Host permissions stay limited to supported chat sites plus the user’s Sync origin. Do not use `<all_urls>`.
