"use client";

import { SiweMessage } from "siwe";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage
} from "wagmi";

type LoginState = {
  address: string;
  chainId: number;
  loginIp: string;
  browser: string;
  userAgent: string;
  loginAt: string;
} | null;

function compactAddress(address?: string) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatLoginTime(loginAt?: string) {
  if (!loginAt) {
    return "Not signed in";
  }

  const date = new Date(loginAt);
  if (Number.isNaN(date.getTime())) {
    return loginAt;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(date);
}

function getSiteOrigin() {
  const { hostname, host, origin, protocol } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";

  if (protocol === "https:" || isLocalHost) {
    return origin;
  }

  return `https://${host}`;
}

export function WalletLoginPanel() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [loginState, setLoginState] = useState<LoginState>(null);
  const [message, setMessage] = useState("Connect a wallet, then sign in without sending a transaction.");

  const injectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === "injected") ?? connectors[0],
    [connectors]
  );

  useEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/auth/session");
      const data = (await response.json()) as { session?: LoginState };
      setLoginState(data.session ?? null);
    }

    void loadSession();
  }, []);

  async function handleConnect() {
    if (!injectedConnector) {
      setMessage("No browser wallet connector is available.");
      return;
    }

    connect({ connector: injectedConnector });
  }

  async function handleSignIn() {
    if (!address || !chainId) {
      setMessage("Connect a wallet before signing in.");
      return;
    }

    setMessage("Preparing sign-in message...");

    const nonceResponse = await fetch("/api/auth/nonce");
    const { nonce } = (await nonceResponse.json()) as { nonce: string };
    const siteOrigin = getSiteOrigin();
    const siweMessage = new SiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to web3walletLogin with this wallet.",
      uri: siteOrigin,
      version: "1",
      chainId,
      nonce
    });

    const preparedMessage = siweMessage.prepareMessage();
    const signature = await signMessageAsync({ message: preparedMessage });

    const verifyResponse = await fetch("/api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: preparedMessage, signature })
    });

    if (!verifyResponse.ok) {
      const error = (await verifyResponse.json()) as { error?: string };
      setMessage(error.error ?? "Signature verification failed.");
      return;
    }

    const verified = (await verifyResponse.json()) as LoginState;
    setLoginState(verified);
    setMessage("Signed in. The server has issued an HTTP-only session cookie.");
  }

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setLoginState(null);
    setMessage("Signed out of the server session.");
  }

  return (
    <section className="login-panel" aria-label="Wallet login">
      <div className="panel-header">
        <div>
          <h1>Wallet login layer</h1>
          <p className="lead">
            Use the wallet address as the account identity, then let the server
            verify a standard SIWE signature before creating a session.
          </p>
        </div>
        <div className="brand-mark" aria-hidden="true">
          <img src="/dreaifekks-avatar.jpg" alt="" />
        </div>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <p className="status-label">Wallet</p>
          <p className="status-value">{compactAddress(address)}</p>
        </div>
        <div className="status-item">
          <p className="status-label">Server session</p>
          <p className="status-value">
            {loginState ? compactAddress(loginState.address) : "Not signed in"}
          </p>
        </div>
        <div className="status-item">
          <p className="status-label">Chain</p>
          <p className="status-value">{chainId ? `EVM chain ${chainId}` : "Unknown"}</p>
        </div>
        <div className="status-item">
          <p className="status-label">Auth mode</p>
          <p className="status-value">SIWE + HTTP-only cookie</p>
        </div>
        <div className="status-item">
          <p className="status-label">Login IP</p>
          <p className="status-value">{loginState?.loginIp ?? "Not signed in"}</p>
        </div>
        <div className="status-item">
          <p className="status-label">Browser</p>
          <p className="status-value" title={loginState?.userAgent}>
            {loginState?.browser ?? "Not signed in"}
          </p>
        </div>
        <div className="status-item">
          <p className="status-label">Login time</p>
          <p className="status-value">{formatLoginTime(loginState?.loginAt)}</p>
        </div>
      </div>

      <div className="actions">
        {!isConnected ? (
          <button className="button button-primary" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect wallet"}
          </button>
        ) : (
          <button className="button button-secondary" onClick={() => disconnect()}>
            Disconnect wallet
          </button>
        )}
        <button
          className="button button-primary"
          onClick={handleSignIn}
          disabled={!isConnected || isSigning}
        >
          {isSigning ? "Signing..." : "Sign in"}
        </button>
        <button className="button button-secondary" onClick={handleLogout} disabled={!loginState}>
          Sign out
        </button>
      </div>

      <p className={message.includes("failed") ? "message message-warning" : "message"}>
        {message}
      </p>
    </section>
  );
}
