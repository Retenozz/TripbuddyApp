# TripBuddy

TripBuddy is a mobile trip planning app built with Expo and React Native.  
The idea behind the project is simple: instead of planning travel in chat threads, spreadsheets, and separate map apps, users can create a trip, invite friends, organize plans together, and share the trip as a reusable public template.

This project was built as an MVP portfolio app to demonstrate product thinking, mobile UI/UX, state management, authentication, and backend integration with Supabase.

## What The App Does

TripBuddy focuses on two main use cases:

1. Collaborative trip planning
Users can create a trip, invite friends with an invite code, and manage the trip together.

2. Public trip templates
Users can publish a trip as a public recommendation/template. Other users can discover it in the recommended trips flow, copy it into their own trip list, and edit it as their own version.

## Key Features

- User registration and login
- Persistent session handling
- Create a trip with:
  - trip name
  - description
  - dates
  - cover image
  - invitees
- Personal trip list on the home screen
- Trip calendar / free-busy style overview
- Trip detail workspace with tabs for:
  - itinerary
  - expenses
  - map
  - voting
  - chat
- Invite friends via invite code / invite link
- Share a trip as a public template
- Browse recommended shared trips
- Copy a shared trip into your own list and continue editing
- Profile and notification settings
- Realtime trip updates using Supabase subscriptions

## Core Product Flow

### 1. Join a real trip

- A user creates a trip
- The trip gets an `inviteCode`
- Another user enters that code in the join flow
- They become a real member of the original trip

### 2. Use a shared trip as a template

- A user shares a trip publicly
- The trip appears in the recommended/explore flow
- Another user selects it
- The app clones that trip into the new user's own trip list
- The new user can edit it freely without affecting the original trip

This distinction between `joining a trip` and `using a shared template` is one of the main ideas behind the app.

## Tech Stack

- React Native
- Expo
- Supabase
  - Auth
  - Postgres
  - Realtime
- AsyncStorage
- Expo Image Picker
- Expo Clipboard
- Expo Linking
- React Native Safe Area Context

## Project Structure

```text
.
├─ App.js
├─ src/
│  ├─ components/
│  ├─ constants/
│  ├─ lib/
│  │  └─ supabase.js
│  ├─ screens/
│  │  ├─ AuthScreen.js
│  │  ├─ HomeScreen.js
│  │  ├─ CreateScreen.js
│  │  ├─ TripCalendarScreen.js
│  │  ├─ TripDetailScreen.js
│  │  ├─ ExploreScreen.js
│  │  ├─ JoinTripScreen.js
│  │  ├─ NotificationScreen.js
│  │  └─ ProfileScreen.js
│  ├─ services/
│  │  ├─ authService.js
│  │  └─ tripService.js
│  └─ utils/
├─ supabase_schema.sql
└─ README.md
```

## Architecture Notes

- The app currently uses a custom screen-state flow in [`App.js`](./App.js) instead of React Navigation.
- Authentication logic is separated into [`src/services/authService.js`](./src/services/authService.js).
- Trip CRUD, fetch, share, and join logic is handled in [`src/services/tripService.js`](./src/services/tripService.js).
- Supabase client setup lives in [`src/lib/supabase.js`](./src/lib/supabase.js).
- Shared/public templates and invite-based joins are intentionally handled as different flows.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

Copy `.env.example` to `.env` and fill in your keys:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=optional_google_maps_key
```

Important:

- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are required
- the app will throw an error at startup if they are missing
- Google Maps API key is optional depending on your map setup

### 3. Set up the database

Open Supabase Dashboard:

1. Go to `SQL Editor`
2. Create a new query
3. Paste the contents of [`supabase_schema.sql`](./supabase_schema.sql)
4. Run the script

This will create:

- the `trips` table
- indexes
- row-level security policies
- realtime support hooks
- avatar storage bucket policies

### 4. Run the app

```bash
npm run start
```

Or directly:

```bash
npm run android
npm run ios
npm run web
```

## Environment Variables

The app expects these values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (optional)

Supabase client initialization is defined in [`src/lib/supabase.js`](./src/lib/supabase.js).

## Backend Model

The backend stores trips in a `trips` table with:

- `owner_id`
- `owner_name`
- `invite_code`
- `share_code`
- `shared_at`
- `data` (JSONB payload for trip details)

This allows the app to:

- fetch the current user's own/member trips
- fetch publicly shared trips
- join a trip by invite code
- clone a public shared trip as a template

## What This Project Demonstrates

This project was designed to show more than just UI screens. It demonstrates:

- mobile-first product design
- feature planning beyond a simple CRUD app
- authentication flow
- backend integration
- optimistic updates
- realtime data syncing
- social interaction design
- separation between private collaboration and public template sharing

## Current Status

TripBuddy is currently an MVP.

It already has:

- a working front-end flow
- Supabase auth integration
- Supabase trip persistence
- realtime trip subscription support

Areas that could be improved further:

- move navigation/state out of `App.js` into a cleaner architecture
- improve error handling and loading states
- add stronger validation and tests
- refine encoding/text consistency across the app
- improve production readiness for larger-scale data models

## Future Improvements

- React Navigation integration
- push notifications
- better map/location integration
- offline caching
- richer trip analytics and budgeting tools
- media upload for trip covers and destinations
- role-based permissions inside a trip

## Portfolio Summary

If I were presenting this project in an internship or junior developer portfolio, I would describe it like this:

> TripBuddy is a social trip planning mobile app where users can create trips, invite friends, manage itineraries together, and publish trip templates that other users can copy and customize.

That framing highlights both the product idea and the engineering work behind it.
