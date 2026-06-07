# web3walletLogin

A minimal wallet-as-account starter for a Web3 website.

The first version keeps the scope intentionally small:

- Browser wallet connection through wagmi.
- Sign-In with Ethereum message signing.
- Server-issued nonce to prevent replay.
- HTTP-only session cookie after signature verification.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploy to Cloudflare Workers

This project is configured for Cloudflare Workers through the OpenNext
Cloudflare adapter. Use `next dev` for normal local development, and use the
Cloudflare preview command when you need to test the Workers runtime locally.

```bash
npm run typecheck
npm run d1:migrate:local
npm run preview
```

Create a production D1 database once if one does not already exist:

```bash
npm run d1:create
```

Then make sure `wrangler.jsonc` has the returned UUID in
`d1_databases[0].database_id`. The app code and migration scripts expect the D1
binding to be named `DB`.

Deploy with Wrangler after applying remote migrations:

```bash
npx wrangler login
npm run deploy
```

For Cloudflare Workers Builds, connect the Git repository to the Worker and set:

```text
Build command: npm run cf:build
Deploy command: npm run cf:deploy
Non-production branch deploy command: npm run cf:upload
```

In this mode, `cf:build` and `cf:deploy` run on Cloudflare's remote build
runner after each push. `cf:deploy` applies D1 migrations to the remote database
before uploading the Worker. The Worker name in Cloudflare must match the
`name` in `wrangler.jsonc`.

After deployment, `/skill.md` is available as a public agent quick-reference for
the project.

## Project shape

```text
app/
  api/auth/nonce/route.ts    Creates one-time SIWE nonces
  api/auth/verify/route.ts   Verifies wallet signatures and creates sessions
  api/auth/session/route.ts  Reads or clears the current wallet session
  page.tsx                   Wallet login screen
components/
  wallet-login-panel.tsx     Client-side connect/sign-in flow
lib/
  auth/store.ts              D1-backed nonce/session/user/wallet store
  wallet/config.ts           wagmi chain and connector config
```

## Production notes

The Cloudflare D1 schema lives in `migrations/`. Session cookie values are not
stored directly; the database stores a SHA-256 hash of the random session token.
The account model uses `users` plus `wallets`, where one user can bind multiple
verified wallet addresses later. That keeps recovery, primary wallet changes,
and future multi-chain support possible.
