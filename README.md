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
  auth/store.ts              Development in-memory nonce/session store
  wallet/config.ts           wagmi chain and connector config
```

## Production notes

Replace the in-memory store with Redis or Postgres before deployment. The
recommended account model is `users` plus `wallets`, where one user can bind
multiple verified wallet addresses. That keeps recovery, primary wallet changes,
and future multi-chain support possible.
