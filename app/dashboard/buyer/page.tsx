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
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Book an Appointment</h2>
          {userBookings.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {upcomingBookings.length} upcoming, {pastBookings.length} past booking{userBookings.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      
      {user ? (
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-lg">Hello {user.displayName}! 👋</p>
            <p className="text-gray-600">Find a seller and book your appointment.</p>
          </div>

          {/* User's Bookings Section */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {showPastBookings ? 'Past Bookings' : 'Upcoming Bookings'}
              </h3>
              {userBookings.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPastBookings(false)}
                    className={`px-3 py-1 text-sm rounded ${
                      !showPastBookings 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Upcoming ({upcomingBookings.length})
                  </button>
                  <button
                    onClick={() => setShowPastBookings(true)}
                    className={`px-3 py-1 text-sm rounded ${
                      showPastBookings 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Choose a Seller</h3>
              
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search sellers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <h4 className="font-semibold text-lg">{seller.name}</h4>
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
        <p>Please sign in first.</p>
      )}
    </main>
  );
}
