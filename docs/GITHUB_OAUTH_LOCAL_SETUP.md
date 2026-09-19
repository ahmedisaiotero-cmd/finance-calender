# Local GitHub OAuth setup (Ahmed)

This is a **local, temporary** OAuth App so you can connect your real GitHub account to Sync on your machine. It does **not** mean Sync already has a live product connection until you finish authorization yourself.

There is **no usable Connections UI**. Use the API routes below while signed in. Do not put real secrets in this file or in git.

Do **not** run this against production Neon. Live connect/verify/revoke writes to whatever `DATABASE_URL` the Next.js app uses. Use a local or other non-production database for that URL.

## 1. Create a temporary GitHub OAuth App

Open this page while signed into GitHub:

**https://github.com/settings/applications/new**

(That is **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.)

Fill in:

| Field | Exact value |
|---|---|
| Application name | `Sync local GitHub verifier` |
| Homepage URL | `http://127.0.0.1:3000` |
| Authorization callback URL | `http://127.0.0.1:3000/api/connections/github/callback` |

Leave the app as a normal **OAuth App** (not a GitHub App). After create, generate a **client secret**. Copy **Client ID** and **Client secret** once. Do not commit them.

Sync only requests classic scope `read:user`. Do not add `repo` in GitHub.

## 2. Put values in local env files

Prisma CLI reads **`.env`**. Next.js `npm run dev` reads **`.env.local`**. Put the GitHub and vault values in **both** so the app and Prisma stay aligned. Never commit `.env` or `.env.local`.

Copy from `.env.example` if those files are missing.

### From GitHub (do not invent these)

```
GITHUB_CLIENT_ID=paste_client_id_from_github
GITHUB_CLIENT_SECRET=paste_client_secret_from_github
```

### Must match the GitHub callback field exactly

```
GITHUB_OAUTH_REDIRECT_URI=http://127.0.0.1:3000/api/connections/github/callback
```

### Generate locally (do not use a guess)

In PowerShell:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then:

```
SYNC_TOKEN_VAULT_KEY=paste_the_64_hex_characters_you_just_generated
```

That key must be **64 hex characters** (32 bytes). It encrypts GitHub tokens with AES-256-GCM.

### Already required to run Sync (not created by this slice)

```
DATABASE_URL=your_non_production_postgres_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`DATABASE_URL` must **not** be production Neon for this experiment.

### Isolated tests only (never the same as `DATABASE_URL`)

```
SYNC_TEST_DATABASE_URL=postgresql://sync:sync_test_only@127.0.0.1:5433/sync_test
```

Start that database with `npm run db:test:up`, then `npm run db:test:migrate`. That URL is localhost-only by design.

## 3. Restart the app

Stop the running Next.js process, then:

```
npm run dev
```

Open **http://127.0.0.1:3000** (not a different host/port unless you change the GitHub callback and `GITHUB_OAUTH_REDIRECT_URI` to match).

## 4. Sign in

Go to **http://127.0.0.1:3000/login** and sign in with your Sync account.

Every GitHub route uses `requireRequestIdentity`. Unsigned requests get `401`. There is no connect button.

## 5. Connect GitHub

In the same browser session (so cookies are sent), start OAuth. From PowerShell, after you are signed in, the simplest way is the browser’s developer tools on any signed-in page:

1. Open DevTools → Network (or Console).
2. Run:

```
fetch("/api/connections/github", { method: "POST" })
  .then((r) => r.json())
  .then(console.log)
```

3. If GitHub env vars are missing, you get `503` and code `github_oauth_unconfigured`.
4. If it works, open the returned `authorizeUrl` in that same browser.
5. Approve the GitHub prompt for **your** account.
6. GitHub redirects to `/api/connections/github/callback?code=...&state=...`.
7. A successful JSON body looks like:

```
{
  "connectionId": "github-<your-sync-user-id>-<github-numeric-id>",
  "grantId": "grant-github-<your-sync-user-id>-<github-numeric-id>",
  "githubUserId": "<github-numeric-id>"
}
```

Copy `connectionId`. That is **not** a live product until this step succeeds with your account.

`state` is a random CSRF value stored server-side for your signed-in user. PKCE (`S256`) is used on the authorize URL. The callback rejects a missing/expired `state` and a redirect URI that does not match `GITHUB_OAUTH_REDIRECT_URI`.

## 6. Record a self-reported claim, then confirm one real public commit

Use a **public** repository you can see. Private repos are out of scope (`read:user` only).

Pick a real commit SHA (full or first 7+ hex characters) for `YOUR_REPO_OWNER` / `YOUR_REPO` / `YOUR_SHA`.

### Self-reported (agent or you claiming it)

In the signed-in browser console:

```
fetch("/api/activity", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    idempotencyKey: "agent-said-this-commit-passed",
    event: {
      id: "evt-agent-commit-1",
      kind: "result",
      actor: { kind: "assistant", id: "cursor", label: "Cursor" },
      source: { service: "cursor", external: true },
      timestamp: "2026-09-19T18:00:00.000Z",
      affectedAreas: ["work"],
      summary: "Tests passed on that commit.",
      evidence: [{ kind: "system_log", description: "Agent reported tests passed." }],
      verification: "self_reported",
      confidence: 0.4,
      reversibility: "reversible",
      permission: { scope: "repo.read", state: "granted" },
      visibility: "visible"
    }
  })
}).then((r) => r.json()).then(console.log)
```

A successful **self_reported** receipt has:

- `record.event.verification` = `"self_reported"`
- `record.event.source.service` = `"cursor"` (or whatever you sent)
- `reused` = `false` the first time
- **no** GitHub token fields

Posting the same body with `"verification": "source_confirmed"` to `/api/activity` must fail (`403`, code `privileged_verification`).

### Source-confirmed (official GitHub API)

```
fetch("/api/connections/github/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    connectionId: "PASTE_CONNECTION_ID",
    repoOwner: "YOUR_REPO_OWNER",
    repo: "YOUR_REPO",
    sha: "YOUR_SHA",
    priorEventId: "evt-agent-commit-1",
    idempotencyKey: "github-confirm-that-commit"
  })
}).then((r) => r.json()).then(console.log)
```

A successful **source_confirmed** receipt has:

- HTTP `201` (`200` if you replay the same `idempotencyKey`)
- `record.event.verification` = `"source_confirmed"`
- `record.event.source.service` = `"github"`
- `record.event.source.connectionId` = your connection id
- `record.priorEventId` = `"evt-agent-commit-1"`
- evidence `kind` = `"source_record"` and a `sourceRef` like `github:YOUR_REPO_OWNER/YOUR_REPO/commit/<full-sha>`
- **no** access token, client secret, or vault key in the JSON

The original self-reported row is **not** upgraded. GitHub writes a **new** row.

Replay the same verify body. You should get `reused: true` and the same event id.

## 7. Revoke

```
fetch("/api/connections/github/revoke", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ connectionId: "PASTE_CONNECTION_ID" })
}).then((r) => r.json()).then(console.log)
```

Success looks like `"status": "revoked"` and a `revokedAt` timestamp. Ciphertext is destroyed.

## 8. Confirm revoke worked

Run the same `/api/connections/github/verify` request again. It must fail with `403` and code `connection_revoked`.

## 9. Delete the temporary OAuth App (optional)

1. Open **https://github.com/settings/developers**
2. Open **OAuth Apps**
3. Open `Sync local GitHub verifier`
4. Choose **Delete application**

Also delete `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SYNC_TOKEN_VAULT_KEY` from `.env` / `.env.local` if you do not need them.

## Routes (from the code)

| Action | Method | Path |
|---|---|---|
| Start OAuth | `POST` | `/api/connections/github` |
| GitHub callback | `GET` | `/api/connections/github/callback` |
| Confirm a commit | `POST` | `/api/connections/github/verify` |
| Revoke | `POST` | `/api/connections/github/revoke` |
| Public activity (cannot mint `source_confirmed`) | `POST` | `/api/activity` |

## What this does not do

- No ChatGPT / MCP doorway
- No identity proofing
- No private-repo confirmation
- No Connections page in the website
