import { randomBytes } from "crypto";

type NonceRecord = {
  createdAt: number;
};

type SessionRecord = {
  address: string;
  chainId: number;
  createdAt: number;
  expiresAt: number;
};

type Store = {
  nonces: Map<string, NonceRecord>;
  sessions: Map<string, SessionRecord>;
};

const nonceTtlMs = 5 * 60 * 1000;
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000;

const globalStore = globalThis as typeof globalThis & {
  __web3WalletLoginStore?: Store;
};

function getStore() {
  if (!globalStore.__web3WalletLoginStore) {
    globalStore.__web3WalletLoginStore = {
      nonces: new Map(),
      sessions: new Map()
    };
  }

  return globalStore.__web3WalletLoginStore;
}

function pruneExpired() {
  const now = Date.now();
  const store = getStore();

  for (const [nonce, record] of store.nonces) {
    if (now - record.createdAt > nonceTtlMs) {
      store.nonces.delete(nonce);
    }
  }

  for (const [sessionId, record] of store.sessions) {
    if (record.expiresAt <= now) {
      store.sessions.delete(sessionId);
    }
  }
}

export function issueNonce() {
  pruneExpired();

  const nonce = randomBytes(16).toString("hex");
  getStore().nonces.set(nonce, { createdAt: Date.now() });
  return nonce;
}

export function consumeNonce(nonce: string) {
  pruneExpired();

  const store = getStore();
  const record = store.nonces.get(nonce);
  store.nonces.delete(nonce);

  return Boolean(record);
}

export function createSession({
  address,
  chainId
}: {
  address: string;
  chainId: number;
}) {
  pruneExpired();

  const sessionId = randomBytes(32).toString("base64url");
  getStore().sessions.set(sessionId, {
    address,
    chainId,
    createdAt: Date.now(),
    expiresAt: Date.now() + sessionTtlMs
  });

  return sessionId;
}

export function getSession(sessionId: string) {
  pruneExpired();

  const session = getStore().sessions.get(sessionId);
  if (!session) {
    return null;
  }

  return {
    address: session.address,
    chainId: session.chainId
  };
}

export function clearSession(sessionId: string) {
  getStore().sessions.delete(sessionId);
}
