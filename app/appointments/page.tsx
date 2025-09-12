"use client";
import { useEffect, useState } from "react";
import { auth } from "@/Firebase";
import { onAuthStateChanged } from "firebase/auth";

type Appointment = {
  id: string;
  sellerUid: string;
  buyerUid: string;
  start: string;
  end: string;
  summary?: string;
};

export default function AppointmentsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      const newUid = u ? u.uid : null;
      setUid(newUid);
      if (newUid) {
        setLoading(true);
        const res = await fetch(`/api/appointments?uid=${encodeURIComponent(newUid)}`);
        const data = await res.json();
        setItems((data?.appointments || []) as Appointment[]);
        setLoading(false);
      } else {
        setItems([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Appointments</h1>
      {!uid ? <div>Please sign in from the Login page first.</div> : null}
      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <div>No appointments.</div>
      ) : (
        <div className="divide-y border rounded">
          {items.map((a) => (
            <div key={a.id} className="p-4">
              <div className="font-medium">{a.summary || "Meeting"}</div>
              <div className="text-sm text-gray-600">{new Date(a.start).toLocaleString()} - {new Date(a.end).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


