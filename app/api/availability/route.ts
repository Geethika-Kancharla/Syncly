import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const app = getApps()[0] || initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerUid = searchParams.get("sellerUid");
  if (!sellerUid) return NextResponse.json({ error: "Missing sellerUid" }, { status: 400 });

  const tokenSnap = await getDoc(doc(db, "calendarTokens", sellerUid));
  if (!tokenSnap.exists()) return NextResponse.json({ slots: [] });
  const tokens = tokenSnap.data() as any;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "Missing Google OAuth env vars" }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate || undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const events = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const busy: Array<{ start: string; end: string }> = (events.data.items || [])
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({ start: e.start!.dateTime!, end: e.end!.dateTime! }));

  // Simple availability: propose 30-min slots 9am-5pm for next 7 days excluding busy ranges
  const slots: Array<{ start: string; end: string }> = [];
  for (let d = new Date(now); d < end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    for (let h = 9; h < 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        const s = new Date(day);
        s.setHours(h, m, 0, 0);
        const e = new Date(s);
        e.setMinutes(e.getMinutes() + 30);
        if (s < now) continue;
        const overlap = busy.some((b) => !(e <= new Date(b.start) || s >= new Date(b.end)));
        if (!overlap) slots.push({ start: s.toISOString(), end: e.toISOString() });
      }
    }
  }

  return NextResponse.json({ slots: slots.slice(0, 50) });
}


