import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";

const app = getApps()[0] || initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function getOAuthClientFor(uid: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Missing Google OAuth env vars");
  const tokenSnap = await getDoc(doc(db, "calendarTokens", uid));
  if (!tokenSnap.exists()) throw new Error("No calendar tokens for user");
  const tokens = tokenSnap.data() as any;
  const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate || undefined,
  });
  return oauth2Client;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  const q = query(collection(db, "appointments"), where("participants", "array-contains", uid));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return NextResponse.json({ appointments: items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sellerUid, start, end } = body as { sellerUid: string; start: string; end: string };
    if (!sellerUid || !start || !end) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Buyer must be authenticated on client and pass their uid via header or token; for simplicity assume buyerUid in body is not trusted. In real app, verify Firebase ID token.
    const buyerUid = req.headers.get("x-user-uid") || "";
    if (!buyerUid) return NextResponse.json({ error: "Missing user" }, { status: 401 });

    const sellerAuth = await getOAuthClientFor(sellerUid);
    const buyerAuth = await getOAuthClientFor(buyerUid).catch(() => null);

    const calendarSeller = google.calendar({ version: "v3", auth: sellerAuth });
    const event = {
      summary: "Appointment",
      start: { dateTime: start },
      end: { dateTime: end },
    } as any;
    const createdSeller = await calendarSeller.events.insert({ calendarId: "primary", requestBody: event });

    if (buyerAuth) {
      const calendarBuyer = google.calendar({ version: "v3", auth: buyerAuth });
      await calendarBuyer.events.insert({ calendarId: "primary", requestBody: event });
    }

    const savedRef = await addDoc(collection(db, "appointments"), {
      sellerUid,
      buyerUid,
      start,
      end,
      summary: "Appointment",
      participants: [sellerUid, buyerUid],
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ id: savedRef.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Booking error" }, { status: 500 });
  }
}


