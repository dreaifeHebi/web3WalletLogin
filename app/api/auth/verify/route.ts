import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { consumeNonce, createSession, getSession } from "@/lib/auth/store";

export const runtime = "nodejs";

const sessionCookieName = "wallet_session";

type VerifyRequestBody = {
  message?: string;
  signature?: string;
};

function getLoginIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "Unknown";
  }

  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("true-client-ip") ??
    "Unknown"
  );
}

function getBrowser(userAgent: string) {
  const browserChecks: Array<[RegExp, string]> = [
    [/Edg\/([\d.]+)/, "Microsoft Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/Version\/([\d.]+).*Safari\//, "Safari"]
  ];

  for (const [pattern, name] of browserChecks) {
    const match = userAgent.match(pattern);
    if (match?.[1]) {
      return `${name} ${match[1].split(".")[0]}`;
    }
  }

  return userAgent ? "Unknown browser" : "Unknown";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as VerifyRequestBody;

  if (!body.message || !body.signature) {
    return NextResponse.json(
      { error: "message and signature are required" },
      { status: 400 }
    );
  }

  const siwe = new SiweMessage(body.message);
  const expectedDomain = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!expectedDomain) {
    return NextResponse.json({ error: "missing request host" }, { status: 400 });
  }

  if (!consumeNonce(siwe.nonce)) {
    return NextResponse.json({ error: "nonce expired or already used" }, { status: 401 });
  }

  const result = await siwe.verify({
    signature: body.signature,
    domain: expectedDomain,
    nonce: siwe.nonce
  });

  if (!result.success) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const sessionId = createSession({
    address: result.data.address,
    chainId: Number(result.data.chainId),
    loginIp: getLoginIp(request.headers),
    browser: getBrowser(request.headers.get("user-agent") ?? ""),
    userAgent: request.headers.get("user-agent") ?? ""
  });
  const session = getSession(sessionId);

  const response = NextResponse.json(session);

  response.cookies.set(sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
