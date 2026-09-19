# ADR 003 — Downloadable Sync: PWA first, no desktop rewrite

**Status:** accepted  
**Date:** 2026-09-19

## Decision

1. Keep the existing Next.js/Vercel app as the cloud control plane.
2. Treat “downloadable” as **installable web/PWA** first, distributed from AOT Creatives.
3. Keep identity callbacks, OAuth, encrypted tokens, permissions, revocation, credentials, and the activity ledger **in the cloud**.
4. Do **not** start an Electron or Tauri rewrite in this phase.
5. Revisit Tauri only if local agent discovery, OS credential-vault access, background MCP bridging, or offline agent runtime becomes a real requirement.

## Why

A desktop rewrite would delay the identity and connection system. Sensitive identity data must not live unencrypted on a laptop. “Downloadable” is a distribution story, not a reason to move the trust plane into local storage.

## Later desktop requirements (if ever)

Code-signed packages, signed updates, no bundled secrets, uninstall/data-removal story, and the same server-side authorization model.
