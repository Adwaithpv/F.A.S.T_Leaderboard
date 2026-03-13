# Add Gamified Animations

This is a code bundle for Add Gamified Animations. The original project is available at https://www.figma.com/design/F3d3EW9Ur0LmEabugCAnPP/Add-Gamified-Animations.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Firebase Realtime Database

Points and leaderboard data are stored in Firebase Realtime Database. Create a `.env` file with:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

If Firebase is not configured, the app falls back to local default data.
