# Garage Web — Setup Guide

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project**, name it (e.g. `garage-app`)
3. Enable **Google Analytics** → optional, skip if you want
4. Click **Create project**

## 2. Enable Authentication

1. In the Firebase console, go to **Build → Authentication**
2. Click **Get started**
3. Enable **Email/Password** provider
4. Enable **Google** provider (add your support email)

## 3. Enable Firestore

1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Pick a region close to you (e.g. `europe-west1`)

## 4. Deploy Firestore security rules

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Init (from this folder): `firebase use --add` → select your project
4. Deploy rules: `firebase deploy --only firestore:rules`

## 5. Get your Firebase config

1. In the Firebase console, go to **Project settings** (gear icon)
2. Under **Your apps**, click **Add app → Web**
3. Register the app (any name)
4. Copy the `firebaseConfig` values

## 6. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase values:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 7. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 8. Deploy to Firebase Hosting (optional)

```bash
npm run build
firebase deploy --only hosting
```

---

## Migrating existing builds from the desktop app

The JSON format is identical. In the app, each build document in Firestore has:
- `items` — same array as the desktop `.json` files
- `trash` — same format
- `maintenance_log` — same format

You can import a desktop build by going to Firestore console,
navigating to `users/{your-uid}/builds`, and creating a document
with the contents of your existing `.json` file.
