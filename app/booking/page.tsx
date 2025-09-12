"use client";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/Firebase";
import { onAuthStateChanged } from "firebase/auth";

type Seller = { uid: string; name: string };
type Slot = { start: string; end: string };

export default function BookingPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null));
    return () => unsub();
  }, []);

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/sellers");
      if (res.ok) {
        const data = await res.json();
        setSellers((data?.sellers || []) as Seller[]);
      }
    };
    run();
  }, []);

  const loadSlots = async (sellerUid: string) => {
    setSelectedSeller(sellerUid);
    setSlots([]);
    if (!sellerUid) return;
    const res = await fetch(`/api/availability?sellerUid=${encodeURIComponent(sellerUid)}`);
    if (res.ok) {
      const data = await res.json();
      setSlots((data?.slots || []) as Slot[]);
    }
  };

  const book = async (slot: Slot) => {
    if (!uid || !selectedSeller) {
      setMessage("Sign in and select a seller.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-uid": uid },
        body: JSON.stringify({ sellerUid: selectedSeller, start: slot.start, end: slot.end }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to book");
      setMessage("Booked!");
    } catch (e: any) {
      setMessage(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const slotsView = useMemo(() => {
    if (!selectedSeller) return <div className="text-sm text-gray-600">Select a seller to view slots.</div>;
    if (!slots.length) return <div className="text-sm text-gray-600">No slots loaded.</div>;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((s, i) => (
          <button key={i} className="rounded border px-3 py-2 text-left" disabled={loading} onClick={() => book(s)}>
            <div className="font-medium">{new Date(s.start).toLocaleString()}</div>
            <div className="text-sm text-gray-600">to {new Date(s.end).toLocaleString()}</div>
          </button>
        ))}
      </div>
    );
  }, [slots, selectedSeller, loading]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Appointment Booking</h1>
      {!uid ? <div>Please sign in from the Login page first.</div> : null}
      <div className="mb-4">
        <label className="block mb-2">Pick a Seller</label>
        <select className="border rounded px-3 py-2" value={selectedSeller} onChange={(e) => loadSlots(e.target.value)}>
          <option value="">Select...</option>
          {sellers.map((s) => (
            <option key={s.uid} value={s.uid}>{s.name}</option>
          ))}
        </select>
      </div>
      {slotsView}
      {message ? <div className="mt-4 text-sm">{message}</div> : null}
    </div>
  );
}


