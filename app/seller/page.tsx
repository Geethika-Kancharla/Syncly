"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/Firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function SellerDashboard() {
  const [uid, setUid] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState<boolean>(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUid(u.uid);
        const snap = await getDoc(doc(db, "users", u.uid));
        const role = (snap.exists() ? (snap.data() as any).role : undefined) as string | undefined;
        setIsSeller(role === "seller");
      } else {
        setUid(null);
        setIsSeller(false);
      }
    });
    return () => unsub();
  }, []);

  const connectCalendar = async () => {
    if (!uid) return;
    setConnecting(true);
    setStatus("");
    try {
      const res = await fetch(`/api/google/connect?uid=${encodeURIComponent(uid)}`);
      if (!res.ok) throw new Error("Failed to create connect URL");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url as string;
      } else if (data.message) {
        setStatus(data.message as string);
      }
    } catch (e: any) {
      setStatus(e.message || "Error starting connect flow");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Seller Dashboard</h1>
      {!uid ? (
        <div>Please sign in from the Login page first.</div>
      ) : !isSeller ? (
        <div>You are signed in but not marked as a Seller.</div>
      ) : (
        <div className="flex flex-col gap-4">
          <button className="rounded border px-4 py-2 w-fit" onClick={connectCalendar} disabled={connecting}>
            {connecting ? "Connecting..." : "Connect Google Calendar"}
          </button>
          {status ? <div className="text-sm text-gray-600">{status}</div> : null}
          <div className="mt-4">
            <h2 className="font-medium mb-2">Availability</h2>
            <p className="text-sm text-gray-600">Once connected, your free slots will be shown to buyers.</p>
          </div>
        </div>
      )}
    </div>
  );
}


