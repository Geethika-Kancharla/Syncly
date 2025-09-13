# Syncly - Appointment Scheduling Platform

A modern, full-stack appointment scheduling platform built with Next.js, Firebase, and Google Calendar integration. Syncly enables seamless booking between sellers and buyers with real-time availability management and calendar synchronization.

## Demo Video

https://github.com/user-attachments/assets/41d06685-c190-45b0-9b68-fdb384b3f4b0

##  Features

### For Sellers
- **Google Calendar Integration**: Connect your Google Calendar to manage availability
- **Availability Management**: Set working hours, days, and slot durations
- **Real-time Booking Management**: View and manage incoming appointment requests
- **Calendar Sync**: Automatic synchronization with Google Calendar events
- **Dashboard Analytics**: Track bookings and availability status

### For Buyers
- **Seller Discovery**: Browse and search available sellers
- **Real-time Availability**: View available time slots in real-time
- **Instant Booking**: Book appointments with immediate confirmation
- **Booking History**: Track past and upcoming appointments
- **Calendar Integration**: Receive calendar invites for booked appointments

### Technical Features
- **Authentication**: Secure Google OAuth integration
- **Real-time Database**: Firebase Firestore for instant data synchronization
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **TypeScript**: Full type safety throughout the application
- **Modern UI/UX**: Clean, intuitive interface with smooth animations

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Authentication**: Firebase Auth with Google OAuth
- **Database**: Firebase Firestore
- **Calendar Integration**: Google Calendar API


##  Prerequisites

Before running this project, ensure you have:

- Node.js 18+ installed
- A Google Cloud Platform account
- A Firebase project
- Git installed

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fet
```

### 2. Install Dependencies

```bash
npm i
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication and Firestore Database
4. In Authentication, enable Google as a sign-in provider
5. In Firestore, create the following collections:
   - `users` - for user profiles and roles
   - `sellers` - for seller-specific data
   - `bookings` - for appointment records

### 4. Google Cloud Platform Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - Your production domain (for deployment)

### 5. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

##  Project Structure

```
fet/
├── app/
│   ├── dashboard/
│   │   ├── buyer/          # Buyer dashboard pages
│   │   └── seller/         # Seller dashboard pages
│   ├── lib/
│   │   ├── auth.tsx        # Authentication context
│   │   ├── calendar.ts     # Calendar integration functions
│   │   ├── firebase.ts     # Firebase configuration
│   │   ├── google.ts       # Google API utilities
│   │   └── seller.ts       # Seller-specific functions
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── public/                 # Static assets
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

##  Authentication Flow

1. **Role Selection**: Users choose between "Seller" or "Buyer" roles
2. **Google OAuth**: Authentication via Google with appropriate scopes
3. **Calendar Permissions**: Sellers grant calendar access during signup
4. **Database Storage**: User data and role stored in Firestore
5. **Dashboard Redirect**: Automatic redirect to role-specific dashboard

##  Booking Flow

### For Sellers:
1. Connect Google Calendar
2. Configure availability settings (hours, days, slot duration)
3. View incoming booking requests
4. Manage calendar synchronization

### For Buyers:
1. Browse available sellers
2. Select a seller and view available time slots
3. Choose a time slot and confirm booking
4. Receive calendar invite and confirmation

```

### Google Calendar API Scopes

The application requires the following Google Calendar scopes:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

##  Troubleshooting

### Common Issues

1. **Calendar not connecting**: Check Google API credentials and scopes
2. **Authentication errors**: Verify Firebase configuration
3. **Environment variables**: Ensure all required variables are set
4. **CORS issues**: Check Google OAuth redirect URIs

### Debug Mode

Enable debug logging by checking browser console for detailed error messages.

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  License

This project is licensed under the MIT License - see the LICENSE file for details.


