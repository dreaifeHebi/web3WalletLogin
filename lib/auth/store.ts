import { randomBytes } from "crypto";

type NonceRecord = {
  createdAt: number;
};

type SessionRecord = {
  address: string;
  chainId: number;
  loginIp: string;
  browser: string;
  userAgent: string;
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
  chainId,
  loginIp,
  browser,
  userAgent
}: {
  address: string;
  chainId: number;
  loginIp: string;
  browser: string;
  userAgent: string;
}) {
  pruneExpired();

  const sessionId = randomBytes(32).toString("base64url");
  const createdAt = Date.now();
  getStore().sessions.set(sessionId, {
    address,
    chainId,
    loginIp,
    browser,
    userAgent,
    createdAt,
    expiresAt: createdAt + sessionTtlMs
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
    chainId: session.chainId,
    loginIp: session.loginIp ?? "Unknown",
    browser: session.browser ?? "Unknown browser",
    userAgent: session.userAgent ?? "",
    loginAt: new Date(session.createdAt).toISOString()
  };
}

export function clearSession(sessionId: string) {
  getStore().sessions.delete(sessionId);
}
