import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI; // e.g. https://yourapp.com/api/google/callback
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "Missing Google OAuth env vars" }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
    "openid",
    "email",
    "profile",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: JSON.stringify({ uid }),
  });

  return NextResponse.json({ url: authUrl });
}


