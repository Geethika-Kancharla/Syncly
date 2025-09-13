"use client";
import { useAuth } from "@/app/lib/auth";

export default function Appointments() {
  const { user } = useAuth();

  return (
    <main className="p-6">
      <h2 className="text-xl font-bold">Your Appointments</h2>
      {user ? (
        <div className="mt-4">
          {/* TODO: Fetch appointments from Firestore or Google Calendar */}
          <p>Show list of booked appointments here.</p>
        </div>
      ) : (
        <p>Please sign in first.</p>
      )}
    </main>
  );
}
