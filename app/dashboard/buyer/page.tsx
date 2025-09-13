"use client";
import { useAuth } from "@/app/lib/auth";
import { logout } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, addDoc, orderBy } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { createBookingEvents } from "@/app/lib/calendar";

interface Seller {
  uid: string;
  name: string;
  email: string;
  calendarConnected: boolean;
  availabilitySettings?: {
    workingHours: { start: string; end: string };
    workingDays: number[];
    slotDuration: number;
  };
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

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

export default function BuyerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [showPastBookings, setShowPastBookings] = useState(false);

  // Fetch sellers from Firestore
  useEffect(() => {
    const fetchSellers = async () => {
      setLoading(true);
      try {
        const sellersRef = collection(db, "sellers");
        const q = query(sellersRef, where("calendarConnected", "==", true));
        const querySnapshot = await getDocs(q);
        const sellersData = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as Seller[];
        setSellers(sellersData);
      } catch (error) {
        console.error("Error fetching sellers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
    fetchUserBookings();
  }, [user]);

  // Fetch user's bookings
  const fetchUserBookings = async () => {
    if (!user) return;
    
    try {
      const bookingsRef = collection(db, "bookings");
      const q = query(
        bookingsRef, 
        where("buyerUid", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const bookingsData: Booking[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      
      // Sort by startTime on the client side to avoid needing a composite index
      bookingsData.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      setUserBookings(bookingsData);
    } catch (err) {
      console.error("Error fetching user bookings:", err);
    }
  };

  // Generate time slots for selected seller
  const generateTimeSlots = (seller: Seller) => {
    if (!seller.availabilitySettings) return [];

    const slots: TimeSlot[] = [];
    const { workingHours, workingDays, slotDuration } = seller.availabilitySettings;
    
    // Generate slots for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();
      
      if (!workingDays.includes(dayOfWeek)) continue;

      const [startHour, startMinute] = workingHours.start.split(':').map(Number);
      const [endHour, endMinute] = workingHours.end.split(':').map(Number);
      
      const startTime = new Date(date);
      startTime.setHours(startHour, startMinute, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const slotEnd = new Date(currentTime);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
        
        if (slotEnd <= endTime) {
          slots.push({
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
            available: Math.random() > 0.3 // Mock availability - 70% chance of being available
          });
        }
        
        currentTime = new Date(slotEnd);
      }
    }
    
    return slots;
  };

  const handleSellerSelect = (seller: Seller) => {
    setSelectedSeller(seller);
    const slots = generateTimeSlots(seller);
    setTimeSlots(slots);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.available) {
      setSelectedSlot(slot);
      setShowBookingModal(true);
    }
  };

  const handleBookingConfirm = async () => {
    if (!selectedSlot || !selectedSeller || !user) return;
    
    setBookingLoading(true);
    try {
      // Create booking record in Firestore
      const bookingRef = collection(db, "bookings");
      const bookingData = {
        buyerUid: user.uid,
        buyerName: user.displayName,
        buyerEmail: user.email,
        sellerUid: selectedSeller.uid,
        sellerName: selectedSeller.name,
        sellerEmail: selectedSeller.email,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        title: `Meeting with ${selectedSeller.name}`,
        description: `Appointment between ${user.displayName} and ${selectedSeller.name}`
      };
      
      // Save booking to Firestore
      const docRef = await addDoc(bookingRef, bookingData);
      console.log("Booking created with ID:", docRef.id);
      
      // Create calendar events for both buyer and seller
      const calendarResult = await createBookingEvents(
        user.email!,
        selectedSeller.email,
        bookingData.title,
        bookingData.description,
        selectedSlot.start,
        selectedSlot.end
      );
      
      if (calendarResult.buyerEvent && calendarResult.sellerEvent) {
        console.log("Calendar events created successfully for both parties");
      } else {
        console.warn("Some calendar events failed to create:", calendarResult);
      }
      
      alert("Appointment booked successfully! You'll receive a calendar invite shortly.");
      setShowBookingModal(false);
      setSelectedSlot(null);
      setSelectedSeller(null);
      setTimeSlots([]);
      
      // Refresh user bookings
      await fetchUserBookings();
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to book appointment. Please try again.");
    } finally {
      setBookingLoading(false);
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

  // Filter sellers based on search term
  const filteredSellers = sellers.filter(seller =>
    seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter bookings based on time
  const now = new Date();
  const upcomingBookings = userBookings.filter(booking => 
    new Date(booking.startTime) >= now
  );
  const pastBookings = userBookings.filter(booking => 
    new Date(booking.startTime) < now
  );
  const displayedBookings = showPastBookings ? pastBookings : upcomingBookings;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>
              <p className="text-gray-600 mt-1">Find and schedule meetings with sellers</p>
              {userBookings.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {upcomingBookings.length} upcoming, {pastBookings.length} past booking{userBookings.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {user ? (
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Hello {user.displayName}! 👋</h2>
                <p className="text-purple-100 text-lg">Find a seller and book your appointment</p>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* User's Bookings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {showPastBookings ? 'Past Bookings' : 'Upcoming Bookings'}
                </h3>
              </div>
              {userBookings.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPastBookings(false)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors duration-200 ${
                      !showPastBookings 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Upcoming ({upcomingBookings.length})
                  </button>
                  <button
                    onClick={() => setShowPastBookings(true)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors duration-200 ${
                      showPastBookings 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Past ({pastBookings.length})
                  </button>
                </div>
              )}
            </div>
            
            {loading ? (
              <p>Loading bookings...</p>
            ) : (
              <div className="space-y-3">
                {displayedBookings.length === 0 ? (
                  <p className="text-gray-500">
                    {showPastBookings 
                      ? 'No past bookings' 
                      : 'No upcoming bookings. Book your first appointment below!'
                    }
                  </p>
                ) : (
                  displayedBookings.map((booking) => {
                    const isPast = new Date(booking.startTime) < now;
                    return (
                      <div key={booking.id} className={`border p-4 rounded-lg ${
                        isPast 
                          ? 'border-gray-200 bg-gray-50' 
                          : 'border-blue-200 bg-blue-50'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-medium ${
                              isPast ? 'text-gray-800' : 'text-blue-800'
                            }`}>
                              {booking.title}
                            </p>
                            <p className={`text-sm ${
                              isPast ? 'text-gray-600' : 'text-blue-600'
                            }`}>
                              <strong>Seller:</strong> {booking.sellerName} ({booking.sellerEmail})
                            </p>
                            <p className={`text-sm ${
                              isPast ? 'text-gray-600' : 'text-blue-600'
                            }`}>
                              <strong>Date:</strong> {new Date(booking.startTime).toLocaleDateString()}
                            </p>
                            <p className={`text-sm ${
                              isPast ? 'text-gray-600' : 'text-blue-600'
                            }`}>
                              <strong>Time:</strong> {new Date(booking.startTime).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })} - {new Date(booking.endTime).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-1 rounded ${
                              isPast 
                                ? 'bg-gray-100 text-gray-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {booking.status}
                            </span>
                            {isPast && (
                              <span className="text-xs text-gray-500">Completed</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {!selectedSeller ? (
            /* Seller Selection */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-black">Choose a Seller</h3>
              </div>
              
              {/* Search Bar */}
              <div className="mb-6 text-black">
                <input
                  type="text"
                  placeholder="Search sellers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                />
              </div>

              {/* Sellers List */}
              {loading ? (
                <p>Loading sellers...</p>
              ) : filteredSellers.length === 0 ? (
                <p className="text-gray-500">No sellers available at the moment.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSellers.map((seller) => (
                    <div
                      key={seller.uid}
                      onClick={() => handleSellerSelect(seller)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                    >
                      <h4 className="font-semibold text-black text-lg">{seller.name}</h4>
                      <p className="text-gray-600 text-sm">{seller.email}</p>
                      <div className="mt-2">
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Available
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Time Slot Selection */
            <div className="space-y-4">
              {/* Selected Seller Info */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800">
                      {selectedSeller.name}
                    </h3>
                    <p className="text-blue-600">{selectedSeller.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSeller(null);
                      setTimeSlots([]);
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Back to Sellers
                  </button>
                </div>
              </div>

              {/* Available Time Slots */}
              <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Available Time Slots</h3>
                
                {timeSlots.length === 0 ? (
                  <p className="text-gray-500">No available slots found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {timeSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          slot.available
                            ? 'border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400'
                            : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="font-medium">
                          {new Date(slot.start).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(slot.start).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {new Date(slot.end).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        <div className="text-xs mt-1">
                          {slot.available ? 'Available' : 'Booked'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Confirmation Modal */}
          {showBookingModal && selectedSlot && selectedSeller && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Confirm Booking</h3>
                
                <div className="space-y-3 mb-6">
                  <div>
                    <span className="font-medium">Seller:</span> {selectedSeller.name}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {new Date(selectedSlot.start).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {new Date(selectedSlot.start).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {new Date(selectedSlot.end).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleBookingConfirm}
                    disabled={bookingLoading}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    disabled={bookingLoading}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
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
