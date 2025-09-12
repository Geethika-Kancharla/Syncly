"use client";
import { useEffect, useMemo, useState } from "react";
import { auth, db, googleProvider } from "@/Firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type Role = "buyer" | "seller";

export default function LoginPage() {
  const [user, setUser] = useState<null | { uid: string; displayName: string | null; email: string | null; photoURL: string | null }>(null);
  const [role, setRole] = useState<Role>("buyer");
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
        // Load stored role if exists
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.role === "seller" || data?.role === "buyer") setRole(data.role);
        }
      } else {
        setUser(null);
      }
      setProfileLoaded(true);
    });
    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role,
        updatedAt: Date.now(),
      }, { merge: true });
      alert("Profile saved.");
    } finally {
      setLoading(false);
    }
  };

  const content = useMemo(() => {
    if (!profileLoaded) return <div>Loading...</div>;
    if (!user)
      return (
        <div className="flex flex-col gap-4 items-center">
          <button className="rounded border px-4 py-2" onClick={handleSignIn} disabled={loading}>
            Continue with Google
          </button>
        </div>
      );

    return (
      <div className="flex flex-col gap-4 max-w-md w-full">
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="avatar" className="w-10 h-10 rounded-full" />
          ) : null}
          <div className="flex-1">
            <div className="font-medium">{user.displayName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
          <button className="text-sm underline" onClick={() => signOut(auth)}>Sign out</button>
        </div>
        <div>
          <label className="block mb-2 font-medium">Choose your role</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="buyer" checked={role === "buyer"} onChange={() => setRole("buyer")} />
              Buyer
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="seller" checked={role === "seller"} onChange={() => setRole("seller")} />
              Seller
            </label>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="rounded border px-4 py-2" onClick={handleSaveProfile} disabled={loading}>Save</button>
        </div>
      </div>
    );
  }, [profileLoaded, user, role, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {content}
    </div>
  );
}


