import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const app = getApps()[0] || initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return NextResponse.redirect(url.origin + "/seller?err=missing_code");
    const { uid } = JSON.parse(state);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(url.origin + "/seller?err=env");
    }

    const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(url.origin + "/seller?err=no_tokens");
    }

    await setDoc(doc(db, "calendarTokens", uid), {
      uid,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date || null,
      updatedAt: Date.now(),
    }, { merge: true });

    return NextResponse.redirect(url.origin + "/seller?connected=1");
  } catch (e) {
    return NextResponse.json({ error: "Callback error" }, { status: 500 });
  }
}


