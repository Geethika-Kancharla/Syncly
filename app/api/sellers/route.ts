import { NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const app = getApps()[0] || initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

export async function GET() {
  const q = query(collection(db, "users"), where("role", "==", "seller"));
  const snap = await getDocs(q);
  const sellers = snap.docs.map((d) => ({ uid: d.id, name: (d.data() as any).name || "Seller" }));
  return NextResponse.json({ sellers });
}


