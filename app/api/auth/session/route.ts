import { NextRequest, NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth/store";

export const runtime = "nodejs";

const sessionCookieName = "wallet_session";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(sessionCookieName)?.value;
  const session = sessionId ? await getSession(sessionId) : null;

  return NextResponse.json({ session });
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.cookies.get(sessionCookieName)?.value;

  if (sessionId) {
    await clearSession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(sessionCookieName);
  return response;
}
