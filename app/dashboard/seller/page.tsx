"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/lib/auth";
import { logout } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { 
  connectCalendar, 
  getSellerData, 
  updateAvailabilitySettings, 
  getFreeBusy, 
  getCalendarEvents,
  SellerData 
} from "@/app/lib/seller";

interface Booking {
  id: string;
  buyerUid: string;
  buyerName: string;
  buyerEmail: string;
  sellerUid: string;
  sellerName: string;
  sellerEmail: string;
  startTime: string;
  endTime: string;
  status: string;
  title: string;
  description: string;
  createdAt: string;
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [sellerData, setSellerData] = useState<SellerData | null>(null);
  const [busySlots, setBusySlots] = useState<{ start: string; end: string }[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<{ id: string; summary?: string; start?: { dateTime?: string; date?: string } }[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [availabilitySettings, setAvailabilitySettings] = useState({
    workingHours: { start: "09:00", end: "17:00" },
    workingDays: [1, 2, 3, 4, 5],
    slotDuration: 30
  });

  const fetchCalendarData = useCallback(async () => {
    if (!user) return;
    
    try {
      const now = new Date();
      const weekLater = new Date();
      weekLater.setDate(now.getDate() + 7);

      const [freeBusy, events] = await Promise.all([
        getFreeBusy(now.toISOString(), weekLater.toISOString()),
        getCalendarEvents(now.toISOString(), weekLater.toISOString())
      ]);

      setBusySlots(freeBusy.calendars["primary"].busy || []);
      setCalendarEvents(events);
    } catch (err) {
      console.error("Error fetching calendar data:", err);
    }
  }, [user]);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    
    try {
      const bookingsRef = collection(db, "bookings");
      const q = query(
        bookingsRef, 
        where("sellerUid", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const bookingsData: Booking[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      
      // Sort by startTime on the client side to avoid needing a composite index
      bookingsData.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      setBookings(bookingsData);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadSellerData = async () => {
      setLoading(true);
      try {
        const data = await getSellerData(user.uid);
        setSellerData(data);
        
        if (data?.availabilitySettings) {
          setAvailabilitySettings(data.availabilitySettings);
        }

        if (data?.calendarConnected) {
          await fetchCalendarData();
        }
        
        // Fetch bookings for this seller
        await fetchBookings();
      } catch (err) {
        console.error("Error loading seller data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSellerData();
  }, [user, fetchBookings, fetchCalendarData]);

  const handleConnectCalendar = async () => {
    if (!user) return;
    
    setConnecting(true);
    try {
      await connectCalendar(user);
      const updatedData = await getSellerData(user.uid);
      setSellerData(updatedData);
      await fetchCalendarData();
    } catch (err) {
      console.error("Error connecting calendar:", err);
      
      // Show more specific error messages
      let errorMessage = "Failed to connect calendar. ";
      if (err instanceof Error) {
        if (err.message.includes("Google API not loaded")) {
          errorMessage += "Please check your internet connection and try again.";
        } else if (err.message.includes("403")) {
          errorMessage += "API access denied. Please check your Google API configuration.";
        } else if (err.message.includes("API key")) {
          errorMessage += "Invalid API key. Please check your environment variables.";
        } else {
          errorMessage += err.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveAvailabilitySettings = async () => {
    if (!user) return;
    
    try {
      await updateAvailabilitySettings(user.uid, availabilitySettings);
      setSellerData(prev => prev ? { ...prev, availabilitySettings } : null);
      setShowAvailabilityEditor(false);
      alert("Availability settings saved!");
    } catch (err) {
      console.error("Error saving availability settings:", err);
      alert("Failed to save settings. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Error logging out:", err);
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your availability and bookings</p>
            </div>
            <div className="flex gap-3">
              {sellerData?.calendarConnected && (
                <button
                  onClick={() => setShowAvailabilityEditor(!showAvailabilityEditor)}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium"
                >
                  {showAvailabilityEditor ? "Hide" : "Edit"} Availability
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {user ? (
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Hello {user.displayName}! 👋</h2>
                <p className="text-blue-100 text-lg">Manage your calendar and availability settings</p>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Configuration Status</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-3 ${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-700">Google Client ID</span>
              </div>
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-3 ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-700">Firebase API Key</span>
              </div>
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-3 ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-700">Firebase Auth Domain</span>
              </div>
            </div>
            {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Setup Required:</strong> Please add the following environment variables to your <code>.env.local</code> file:
                </p>
                <pre className="text-xs mt-2 bg-white p-3 rounded border font-mono">
{`NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com`}
                </pre>
              </div>
            )}
          </div>

          {!sellerData?.calendarConnected ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Calendar</h3>
                  <p className="text-gray-600 mb-4">
                    Connect your Google Calendar to start managing your availability and appointments.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Note: Calendar permissions were already granted during sign-in. This will enable calendar features.
                  </p>
                  <button
                    onClick={handleConnectCalendar}
                    disabled={connecting}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium transition-colors duration-200"
                  >
                    {connecting ? "Connecting..." : "Enable Calendar Features"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar Connected</h3>
                  <p className="text-gray-600">
                    Your Google Calendar is connected and ready to use. 
                    You can manage your availability and view your schedule.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showAvailabilityEditor && sellerData?.calendarConnected && (
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Availability Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Working Hours
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={availabilitySettings.workingHours.start}
                      onChange={(e) => setAvailabilitySettings(prev => ({
                        ...prev,
                        workingHours: { ...prev.workingHours, start: e.target.value }
                      }))}
                      className="border border-gray-300 text-black rounded px-3 py-2"
                    />
                    <span className="self-center text-black">to</span>
                    <input
                      type="time"
                      value={availabilitySettings.workingHours.end}
                      onChange={(e) => setAvailabilitySettings(prev => ({
                        ...prev,
                        workingHours: { ...prev.workingHours, end: e.target.value }
                      }))}
                      className="border border-gray-300 text-black rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slot Duration (minutes)
                  </label>
                  <select
                    value={availabilitySettings.slotDuration}
                    onChange={(e) => setAvailabilitySettings(prev => ({
                      ...prev,
                      slotDuration: parseInt(e.target.value)
                    }))}
                    className="border text-black border-gray-300 rounded px-3 py-2 w-full"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Days
                  </label>
                  <div className="space-y-1 text-black">
                    {[
                      { value: 1, label: "Monday" },
                      { value: 2, label: "Tuesday" },
                      { value: 3, label: "Wednesday" },
                      { value: 4, label: "Thursday" },
                      { value: 5, label: "Friday" },
                      { value: 6, label: "Saturday" },
                      { value: 0, label: "Sunday" }
                    ].map(day => (
                      <label key={day.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={availabilitySettings.workingDays.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAvailabilitySettings(prev => ({
                                ...prev,
                                workingDays: [...prev.workingDays, day.value]
                              }));
                            } else {
                              setAvailabilitySettings(prev => ({
                                ...prev,
                                workingDays: prev.workingDays.filter(d => d !== day.value)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveAvailabilitySettings}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setShowAvailabilityEditor(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Your Bookings</h3>
            {loading ? (
              <p>Loading bookings...</p>
            ) : (
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <p className="text-gray-500">No bookings yet</p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="border border-green-200 bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-green-800">{booking.title}</p>
                          <p className="text-sm text-green-600">
                            <strong>Client:</strong> {booking.buyerName} ({booking.buyerEmail})
                          </p>
                          <p className="text-sm text-green-600">
                            <strong>Date:</strong> {new Date(booking.startTime).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-green-600">
                            <strong>Time:</strong> {new Date(booking.startTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {new Date(booking.endTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {sellerData?.calendarConnected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">This Week&apos;s Busy Times</h3>
          {loading ? (
            <p>Loading availability...</p>
          ) : (
                  <div className="space-y-2">
              {busySlots.length === 0 ? (
                      <p className="text-green-600">You&apos;re fully free this week 🎉</p>
              ) : (
                busySlots.map((slot, idx) => (
                        <div key={idx} className="border border-red-200 bg-red-50 p-3 rounded">
                          <p className="text-sm font-medium text-red-800">Busy</p>
                          <p className="text-sm text-red-600">
                            {new Date(slot.start).toLocaleString()} → {new Date(slot.end).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
                {loading ? (
                  <p>Loading events...</p>
                ) : (
                  <div className="space-y-2">
                    {calendarEvents.length === 0 ? (
                      <p className="text-gray-500">No upcoming events</p>
                    ) : (
                      calendarEvents.slice(0, 5).map((event, idx) => (
                        <div key={idx} className="border border-blue-200 bg-blue-50 p-3 rounded">
                          <p className="text-sm font-medium text-blue-800">{event.summary || "No title"}</p>
                          <p className="text-sm text-blue-600">
                            {event.start?.dateTime ? 
                              new Date(event.start.dateTime).toLocaleString() :
                              event.start?.date ? new Date(event.start.date).toLocaleDateString() : 'No date'
                            }
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Please sign in first.</p>
        </div>
      )}
      </main>
    </div>
  );
}
