# Google API Setup Guide

The calendar connection is failing because the Google API configuration is missing. Here's how to fix it:

## 1. Create Environment Variables File

Create a `.env.local` file in your project root with the following variables:

```env
# Firebase Configuration (you already have these)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google API Configuration (NEW - for Calendar integration)
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## 2. Google Cloud Console Setup

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (or create a new one)

### Step 2: Enable Google Calendar API
1. Go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### Step 3: Create API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key and add it to your `.env.local` file as `NEXT_PUBLIC_GOOGLE_API_KEY`

### Step 4: Create OAuth 2.0 Client ID
1. In "Credentials", click "Create Credentials" > "OAuth 2.0 Client ID"
2. Choose "Web application"
3. Add your domain to "Authorized JavaScript origins":
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
4. Copy the Client ID and add it to your `.env.local` file as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Step 5: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required fields:
   - App name: "Syncly"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

## 3. Restart Your Development Server

After adding the environment variables:
```bash
npm run dev
```

## 4. Test the Connection

1. Go to the seller dashboard
2. Check the "Configuration Status" section
3. All items should show "✅ Set"
4. Click "Connect Google Calendar"
5. You should see a Google OAuth popup asking for calendar permissions

## Troubleshooting

### If you still get 403 errors:
1. Make sure the Google Calendar API is enabled
2. Check that your API key has the correct permissions
3. Verify the OAuth consent screen is configured
4. Ensure the Client ID is correct

### If you get CORS errors:
1. Add your domain to the "Authorized JavaScript origins" in OAuth settings
2. Make sure you're using the correct protocol (http vs https)

### If the Google API doesn't load:
1. Check your internet connection
2. Verify the Google API scripts are loaded in the HTML head
3. Check browser console for any script loading errors

## Current Status

The seller dashboard now shows a configuration status section that will help you identify what's missing. Once you add the environment variables and restart the server, the calendar connection should work properly.
