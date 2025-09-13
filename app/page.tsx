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
  const [checkingRole, setCheckingRole] = useState(true); 

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
            
            router.replace(`/dashboard/${data.role}`);
          } else {
            console.log("No role found, showing role selection");
            setRole(null); 
          }
        } else {
          console.log("User document doesn't exist, creating new document");
      
          await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
          });
          setRole(null); 
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
        
     
        if (user) {
          try {
            console.log("Connecting calendar for seller...");
            const { connectCalendar } = await import("@/app/lib/seller");
            await connectCalendar(user);
            console.log("Calendar connected successfully during sign-in");
          } catch (calendarError) {
            console.warn("Calendar connection failed during sign-in:", calendarError);
           
            alert("Calendar connection will be available in your dashboard. You can connect it later if needed.");
          }
        }
      } else {
        user = await loginWithGoogle();
        console.log("Buyer logged in:", user);
      }
      
      
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-16">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Welcome to <span className="text-blue-600">Syncly</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                The modern platform for seamless appointment scheduling. 
                Connect with clients, manage your calendar, and grow your business.
              </p>
            </div>

            {!selectedRole ? (
           
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">I am a Seller</h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        Manage your availability, sync with Google Calendar, and let clients book appointments with you.
                      </p>
                      <button
                        onClick={() => handleRoleSelection("seller")}
                        className="w-full bg-green-500 text-white px-8 py-4 rounded-xl hover:bg-green-600 text-lg font-semibold transition-all duration-200 transform hover:scale-105"
                      >
                        Get Started as Seller
                      </button>
                      <p className="text-sm text-gray-500 mt-3">
                        Calendar permissions will be requested during sign-in
                      </p>
                    </div>
                  </div>

    
                  <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">I am a Buyer</h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        Find and book appointments with sellers. Browse available time slots and schedule your meetings.
                      </p>
                      <button
                        onClick={() => handleRoleSelection("buyer")}
                        className="w-full bg-purple-500 text-white px-8 py-4 rounded-xl hover:bg-purple-600 text-lg font-semibold transition-all duration-200 transform hover:scale-105"
                      >
                        Get Started as Buyer
                      </button>
                      <p className="text-sm text-gray-500 mt-3">
                        Book appointments with sellers
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-16 grid md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Smart Scheduling</h4>
                    <p className="text-gray-600 text-sm">Automated availability management and conflict detection</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Calendar Sync</h4>
                    <p className="text-gray-600 text-sm">Seamless integration with Google Calendar</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Instant Booking</h4>
                    <p className="text-gray-600 text-sm">Real-time availability and instant confirmations</p>
                  </div>
                </div>
              </div>
            ) : (
          
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                  <div className="text-center mb-8">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                      selectedRole === "seller" ? "bg-green-100" : "bg-purple-100"
                    }`}>
                      {selectedRole === "seller" ? (
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                      You selected: <span className={`${selectedRole === "seller" ? "text-green-600" : "text-purple-600"}`}>
                        {selectedRole === "seller" ? "Seller" : "Buyer"}
                      </span>
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedRole === "seller" 
                        ? "You'll be asked to grant calendar permissions for availability management during sign-in"
                        : "You'll have access to book appointments with sellers"
                      }
                    </p>
                    {selectedRole === "seller" && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> Calendar access is required to manage your availability and sync with Google Calendar.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="flex-1 bg-blue-500 text-white px-8 py-4 rounded-xl hover:bg-blue-600 disabled:opacity-50 text-lg font-semibold transition-all duration-200 flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing in...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Sign in with Google
                        </>
                      )}
                    </button>
                   
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome, {user.displayName}!</h2>
              <p className="text-xl text-gray-600">Please select your role to continue</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">I am a Seller</h3>
                  <p className="text-gray-600 mb-6">Connect your calendar to manage availability</p>
                  <button
                    disabled={loading}
                    onClick={() => handleRoleConfirm("seller")}
                    className="w-full bg-green-500 text-white px-8 py-4 rounded-xl hover:bg-green-600 disabled:opacity-50 text-lg font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? "Setting up..." : "Continue as Seller"}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">I am a Buyer</h3>
                  <p className="text-gray-600 mb-6">Book appointments with sellers</p>
                  <button
                    disabled={loading}
                    onClick={() => handleRoleConfirm("buyer")}
                    className="w-full bg-purple-500 text-white px-8 py-4 rounded-xl hover:bg-purple-600 disabled:opacity-50 text-lg font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? "Setting up..." : "Continue as Buyer"}
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 underline transition-colors duration-200"
            >
              Sign out and choose different account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome back, {user.displayName}!</h2>
            <p className="text-gray-600 mb-8">You should have been redirected to your dashboard.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/dashboard/seller" 
                className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 font-semibold transition-all duration-200"
              >
                Go to Seller Dashboard
              </Link>
              <Link 
                href="/dashboard/buyer" 
                className="bg-purple-500 text-white px-6 py-3 rounded-xl hover:bg-purple-600 font-semibold transition-all duration-200"
              >
                Go to Buyer Dashboard
              </Link>
            </div>
            <button
              onClick={logout}
              className="mt-6 text-gray-500 hover:text-gray-700 underline transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
