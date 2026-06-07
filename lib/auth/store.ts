import { createHash, randomBytes } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type SessionRow = {
  userId: string;
  address: string;
  chainId: number;
  loginIp: string;
  browser: string;
  userAgent: string;
  createdAt: number;
};

const nonceTtlMs = 5 * 60 * 1000;
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000;

function getDb() {
  const db = getCloudflareContext().env.DB;

  if (!db) {
    throw new Error("Cloudflare D1 binding DB is not configured.");
  }

  return db;
}

function hashSessionId(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

async function pruneExpired(db = getDb()) {
  const now = Date.now();

  await db.batch([
    db.prepare("DELETE FROM auth_nonces WHERE expires_at <= ?").bind(now),
    db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(now)
  ]);
}

async function getOrCreateUserId({
  db,
  address,
  chainId,
  now
}: {
  db: D1Database;
  address: string;
  chainId: number;
  now: number;
}) {
  const normalizedAddress = address.toLowerCase();
  const existingWallet = await db
    .prepare("SELECT user_id AS userId FROM wallets WHERE normalized_address = ?")
    .bind(normalizedAddress)
    .first<{ userId: string }>();

  if (existingWallet) {
    await db
      .prepare(
        `UPDATE wallets
         SET address = ?, chain_id = ?, last_login_at = ?
         WHERE normalized_address = ?`
      )
      .bind(address, chainId, now, normalizedAddress)
      .run();

    return existingWallet.userId;
  }

  const userId = randomBytes(16).toString("hex");

  try {
    await db.batch([
      db
        .prepare("INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
        .bind(userId, now, now),
      db
        .prepare(
          `INSERT INTO wallets
           (normalized_address, user_id, address, chain_id, verified_at, last_login_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(normalizedAddress, userId, address, chainId, now, now)
    ]);

    return userId;
  } catch {
    const racedWallet = await db
      .prepare("SELECT user_id AS userId FROM wallets WHERE normalized_address = ?")
      .bind(normalizedAddress)
      .first<{ userId: string }>();

    if (racedWallet) {
      return racedWallet.userId;
    }

    throw new Error("Failed to create wallet user record.");
  }
}

export async function issueNonce() {
  const db = getDb();
  await pruneExpired(db);

  const nonce = randomBytes(16).toString("hex");
  const createdAt = Date.now();

  await db
    .prepare("INSERT INTO auth_nonces (nonce, created_at, expires_at) VALUES (?, ?, ?)")
    .bind(nonce, createdAt, createdAt + nonceTtlMs)
    .run();

  return nonce;
}

export async function consumeNonce(nonce: string) {
  const db = getDb();
  await pruneExpired(db);

  const consumed = await db
    .prepare(
      `DELETE FROM auth_nonces
       WHERE nonce = ? AND expires_at > ?
       RETURNING nonce`
    )
    .bind(nonce, Date.now())
    .first<{ nonce: string }>();

  return Boolean(consumed);
}

export async function createSession({
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
  const db = getDb();
  await pruneExpired(db);

  const sessionId = randomBytes(32).toString("base64url");
  const createdAt = Date.now();
  const userId = await getOrCreateUserId({ db, address, chainId, now: createdAt });

  await db
    .prepare(
      `INSERT INTO auth_sessions
       (id, user_id, address, chain_id, login_ip, browser, user_agent, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      hashSessionId(sessionId),
      userId,
      address,
      chainId,
      loginIp,
      browser,
      userAgent,
      createdAt,
      createdAt + sessionTtlMs
    )
    .run();

  return sessionId;
}

export async function getSession(sessionId: string) {
  const db = getDb();
  await pruneExpired(db);

  const session = await db
    .prepare(
      `SELECT
         user_id AS userId,
         address,
         chain_id AS chainId,
         login_ip AS loginIp,
         browser,
         user_agent AS userAgent,
         created_at AS createdAt
       FROM auth_sessions
       WHERE id = ? AND expires_at > ?`
    )
    .bind(hashSessionId(sessionId), Date.now())
    .first<SessionRow>();

  if (!session) {
    return null;
  }

  return {
    userId: session.userId,
    address: session.address,
    chainId: session.chainId,
    loginIp: session.loginIp ?? "Unknown",
    browser: session.browser ?? "Unknown browser",
    userAgent: session.userAgent ?? "",
    loginAt: new Date(session.createdAt).toISOString()
  };
}

export async function clearSession(sessionId: string) {
  await getDb()
    .prepare("DELETE FROM auth_sessions WHERE id = ?")
    .bind(hashSessionId(sessionId))
    .run();
}
