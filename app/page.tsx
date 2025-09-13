"use client";
import { loginWithGoogle, loginWithGoogleForSeller, logout, db } from "@/app/lib/firebase";
import { useAuth } from "@/app/lib/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller" | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true); // Track first fetch

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        console.log("No user found, skipping role fetch");
        setCheckingRole(false);
        return;
      }
      
      console.log("User found:", user.uid, user.displayName);
      setCheckingRole(true);

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as any;
          console.log("User document exists:", data);
          
          if (data.role) {
            console.log("Role found:", data.role, "Redirecting to:", `/dashboard/${data.role}`);
            setRole(data.role);
            // Use replace instead of push to avoid back button issues
            router.replace(`/dashboard/${data.role}`);
          } else {
            console.log("No role found, showing role selection");
            setRole(null); // first-time login, show role selection
          }
        } else {
          console.log("User document doesn't exist, creating new document");
          // Create basic document for first-time login
          await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
          });
          setRole(null); // show role selection
        }
      } catch (error) {
        console.error("Error fetching role:", error);
      } finally {
        setCheckingRole(false);
      }
    };

    fetchRole();
  }, [user, router]);

  const handleRoleSelection = (role: "buyer" | "seller") => {
    console.log("Role selected:", role);
    setSelectedRole(role);
  };

  const handleGoogleLogin = async () => {
    if (!selectedRole) return;
    
    try {
      setLoading(true);
      console.log(`Logging in as ${selectedRole}...`);
      
      let user;
      if (selectedRole === "seller") {
        user = await loginWithGoogleForSeller();
        console.log("Seller logged in with calendar scopes:", user);
        
        // For sellers, also connect calendar immediately after login
        if (user) {
          try {
            console.log("Connecting calendar for seller...");
            const { connectCalendar } = await import("@/app/lib/seller");
            await connectCalendar(user);
            console.log("Calendar connected successfully during sign-in");
          } catch (calendarError) {
            console.warn("Calendar connection failed during sign-in:", calendarError);
            // Don't fail the entire login process if calendar connection fails
            // The user can still connect it later from the dashboard
            // Show a user-friendly message
            alert("Calendar connection will be available in your dashboard. You can connect it later if needed.");
          }
        }
      } else {
        user = await loginWithGoogle();
        console.log("Buyer logged in:", user);
      }
      
      // Save the role immediately after successful login
      if (user) {
        console.log("Saving role to database:", selectedRole);
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { 
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          role: selectedRole 
        }, { merge: true });
        
        console.log("Role saved, redirecting to:", `/dashboard/${selectedRole}`);
        setRole(selectedRole);
        router.replace(`/dashboard/${selectedRole}`);
      }
    } catch (error) {
      console.error("Error with Google login:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleConfirm = async (roleToConfirm: "buyer" | "seller") => {
    if (!user) return;
    
    console.log("Confirming role:", roleToConfirm);
    setLoading(true);

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { role: roleToConfirm }, { merge: true });
      console.log("Role saved to database, redirecting to:", `/dashboard/${roleToConfirm}`);

      setRole(roleToConfirm);
      setLoading(false);
      router.replace(`/dashboard/${roleToConfirm}`);
    } catch (error) {
      console.error("Error saving role:", error);
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center h-screen space-y-6">
        <h1 className="text-3xl font-bold">Welcome to Syncly</h1>
        <p className="text-gray-600 text-center max-w-md">
          Choose your role to get started with the appropriate permissions
        </p>
        
        {!selectedRole ? (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <button
                onClick={() => handleRoleSelection("seller")}
                className="bg-green-500 text-white px-8 py-4 rounded-lg hover:bg-green-600 text-lg font-semibold w-64"
              >
                I am a Seller
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Calendar permissions will be requested during sign-in
              </p>
            </div>
            <div className="text-center">
              <button
                onClick={() => handleRoleSelection("buyer")}
                className="bg-purple-500 text-white px-8 py-4 rounded-lg hover:bg-purple-600 text-lg font-semibold w-64"
              >
                I am a Buyer
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Book appointments with sellers
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">
                You selected: <span className="text-blue-600">{selectedRole === "seller" ? "Seller" : "Buyer"}</span>
              </h2>
              <p className="text-sm text-gray-600">
                {selectedRole === "seller" 
                  ? "You'll be asked to grant calendar permissions for availability management during sign-in"
                  : "You'll have access to book appointments with sellers"
                }
              </p>
              {selectedRole === "seller" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> Calendar access is required to manage your availability and sync with Google Calendar.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in with Google"}
              </button>
              <button
                onClick={() => setSelectedRole(null)}
                disabled={loading}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >
                Change Role
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (checkingRole) {
    return (
      <main className="flex items-center justify-center h-screen">
        Loading...
      </main>
    );
  }

  if (!role) {
    return (
      <main className="flex flex-col items-center justify-center h-screen space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome, {user.displayName}!</h2>
          <p className="text-gray-600">Please select your role to continue</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <button
              disabled={loading}
              onClick={() => handleRoleConfirm("seller")}
              className="bg-green-500 text-white px-8 py-4 rounded-lg hover:bg-green-600 disabled:opacity-50 text-lg font-semibold w-64"
            >
              I am a Seller
            </button>
            <p className="text-sm text-gray-600 mt-2">Connect your calendar to manage availability</p>
          </div>
          <div className="text-center">
            <button
              disabled={loading}
              onClick={() => handleRoleConfirm("buyer")}
              className="bg-purple-500 text-white px-8 py-4 rounded-lg hover:bg-purple-600 disabled:opacity-50 text-lg font-semibold w-64"
            >
              I am a Buyer
            </button>
            <p className="text-sm text-gray-600 mt-2">Book appointments with sellers</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="text-red-500 underline mt-4"
        >
          Sign out and choose different account
        </button>
      </main>
    );
  }

  // User already has role - this should rarely be seen due to automatic redirection
  return (
    <main className="flex flex-col items-center justify-center h-screen space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Welcome back, {user.displayName}!</h2>
        <p className="text-gray-600 mb-4">You should have been redirected to your dashboard.</p>
        <div className="space-x-4">
          <Link 
            href="/dashboard/seller" 
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Go to Seller Dashboard
          </Link>
          <Link 
            href="/dashboard/buyer" 
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Go to Buyer Dashboard
          </Link>
        </div>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-3 py-1 rounded mt-4"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
