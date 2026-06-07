---
name: web3wallet-login
description: Use this when working on the web3walletLogin project, a Next.js wallet-as-account starter deployed to Cloudflare Workers with OpenNext and D1.
---

# web3walletLogin

## Project Summary

This project is a minimal wallet-as-account web app. The browser connects an
EVM wallet with wagmi, signs a Sign-In with Ethereum message, and the server
verifies the signature before issuing an HTTP-only session cookie.

The app is built with Next.js App Router and deployed to Cloudflare Workers
through OpenNext. Runtime state for nonces, sessions, users, and wallets is
stored in Cloudflare D1.

## Important Files

- `app/page.tsx`: main wallet login page.
- `components/wallet-login-panel.tsx`: client wallet connect, SIWE signing, and session UI.
- `app/api/auth/nonce/route.ts`: creates one-time SIWE nonces.
- `app/api/auth/verify/route.ts`: verifies SIWE signatures and creates sessions.
- `app/api/auth/session/route.ts`: reads or clears the current session.
- `lib/auth/store.ts`: D1-backed nonce, session, user, and wallet persistence.
- `lib/wallet/config.ts`: wagmi chain and connector configuration.
- `migrations/`: D1 schema migrations.
- `wrangler.jsonc`: Cloudflare Worker, assets, and D1 binding config.
- `open-next.config.ts`: OpenNext Cloudflare adapter config.

## Runtime Model

- Static and dynamic Next.js output is built by `opennextjs-cloudflare`.
- Worker entrypoint is `.open-next/worker.js`.
- Static assets are served through the `ASSETS` binding.
- D1 is bound as `DB`.
- `nodejs_compat` is enabled because the app uses Node-compatible crypto and Next.js server code.

## Authentication Flow

1. Client calls `GET /api/auth/nonce`.
2. Server inserts a short-lived nonce into D1.
3. Client prepares a SIWE message with `window.location.host` as the domain.
4. Wallet signs the SIWE message.
5. Client posts `{ message, signature }` to `POST /api/auth/verify`.
6. Server consumes the nonce, verifies the signature, upserts user/wallet records, creates a session, and sets the `wallet_session` HTTP-only cookie.
7. Client calls `GET /api/auth/session` to display the active server session.

Session cookie tokens are random. D1 stores only a SHA-256 hash of the token.

## Common Commands

```bash
npm run typecheck
npm run d1:migrate:local
npm run preview
npm run d1:create
npm run deploy
```

After `npm run d1:create`, make sure the returned D1 database UUID is in
`wrangler.jsonc` at `d1_databases[0].database_id`. The app code and migration
scripts expect the D1 binding to be named `DB`.

For Cloudflare Workers Builds, configure the remote build settings as:

```text
Build command: npm run cf:build
Deploy command: npm run cf:deploy
Non-production branch deploy command: npm run cf:upload
```

`cf:deploy` applies remote D1 migrations before publishing the Worker. Do not use
`d1:migrate:local` as a production deploy step; it is only for local Wrangler
state used by preview/debug runs.

## Guardrails

- Do not replace SIWE verification with client-only address checks.
- Do not store session cookie tokens in D1 as plaintext.
- Keep API routes server-side; wallet signing stays client-side.
- Keep secrets out of `.env.example`, `README.md`, and this file.
- Run `npm run typecheck` and `npx opennextjs-cloudflare build` after auth or deployment changes.
