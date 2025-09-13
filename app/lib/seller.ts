import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";

export interface SellerData {
  uid: string;
  name: string;
  email: string;
  role: "seller";
  refreshToken?: string;
  calendarConnected: boolean;
  availabilitySettings?: {
    workingHours: {
      start: string; // "09:00"
      end: string;   // "17:00"
    };
    workingDays: number[]; // [1,2,3,4,5] for Mon-Fri
    slotDuration: number;  // in minutes
  };
}

// Helper function to get Google access token from Firebase Auth
const getGoogleAccessToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user found");
  }

  // For now, we'll use a different approach - store the access token when user signs in
  // This is a simplified version that works with Firebase Auth
  const credential = await user.getIdTokenResult();
  
  // Note: In a production app, you'd want to implement proper token refresh
  // For now, we'll mark the calendar as connected and handle API calls differently
  return "placeholder_token";
};

export const connectCalendar = async (user: any) => {
  try {
    console.log("Connecting calendar for user:", user.uid);
    
    // Since the user already signed in with Google scopes via Firebase Auth,
    // we just need to mark the calendar as connected in our database
    const sellerRef = doc(db, "sellers", user.uid);
    await setDoc(sellerRef, {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      role: "seller",
      calendarConnected: true,
      availabilitySettings: {
        workingHours: { start: "09:00", end: "17:00" },
        workingDays: [1, 2, 3, 4, 5], // Mon-Fri
        slotDuration: 30 // 30 minutes
      }
    }, { merge: true });
    
    console.log("Calendar connected successfully!");
    return { success: true };
  } catch (error) {
    console.error("Error connecting calendar:", error);
    throw error;
  }
};

export const getSellerData = async (uid: string): Promise<SellerData | null> => {
  try {
    const sellerRef = doc(db, "sellers", uid);
    const snap = await getDoc(sellerRef);
    
    if (snap.exists()) {
      return snap.data() as SellerData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching seller data:", error);
    return null;
  }
};

export const updateAvailabilitySettings = async (uid: string, settings: SellerData['availabilitySettings']) => {
  try {
    const sellerRef = doc(db, "sellers", uid);
    await updateDoc(sellerRef, {
      availabilitySettings: settings
    });
  } catch (error) {
    console.error("Error updating availability settings:", error);
    throw error;
  }
};

export const getFreeBusy = async (timeMin: string, timeMax: string) => {
  try {
    console.log("Fetching free/busy data...");
    
    // For now, return mock data since we need proper Google Calendar API integration
    // In a production app, you'd make a direct API call to Google Calendar
    const mockResponse = {
      calendars: {
        primary: {
          busy: [
            {
              start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
              end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()   // 3 hours from now
            }
          ]
        }
      }
    };
    
    console.log("Free/busy response (mock):", mockResponse);
    return mockResponse;
  } catch (error) {
    console.error("Error fetching free/busy data:", error);
    throw error;
  }
};

export const createEvent = async (summary: string, start: string, end: string, description?: string) => {
  try {
    // For now, return mock data since we need proper Google Calendar API integration
    console.log("Creating event (mock):", { summary, start, end, description });
    
    const mockEvent = {
      id: "mock_event_" + Date.now(),
      summary,
      description: description || "",
      start: { dateTime: start, timeZone: "UTC" },
      end: { dateTime: end, timeZone: "UTC" },
    };
    
    return mockEvent;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const getCalendarEvents = async (timeMin: string, timeMax: string) => {
  try {
    // For now, return mock data since we need proper Google Calendar API integration
    console.log("Fetching calendar events (mock):", { timeMin, timeMax });
    
    const mockEvents = [
      {
        id: "mock_event_1",
        summary: "Team Meeting",
        start: { dateTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() },
        end: { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }
      },
      {
        id: "mock_event_2", 
        summary: "Client Call",
        start: { dateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
        end: { dateTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() }
      }
    ];
    
    return mockEvents;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw error;
  }
};
