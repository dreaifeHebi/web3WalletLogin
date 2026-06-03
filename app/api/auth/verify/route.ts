import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { consumeNonce, createSession } from "@/lib/auth/store";

export const runtime = "nodejs";

const sessionCookieName = "wallet_session";

type VerifyRequestBody = {
  message?: string;
  signature?: string;
};

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
    chainId: Number(result.data.chainId)
  });

  const response = NextResponse.json({
    address: result.data.address,
    chainId: Number(result.data.chainId)
  });

  response.cookies.set(sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
