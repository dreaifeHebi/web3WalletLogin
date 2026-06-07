import { NextResponse } from "next/server";
import { issueNonce } from "@/lib/auth/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ nonce: await issueNonce() });
}
