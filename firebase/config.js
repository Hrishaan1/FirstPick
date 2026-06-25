/*
  Firebase Configuration
  ======================
  To set up your own Firebase backend:

  1. Go to https://console.firebase.google.com
  2. Create a new project (or use existing)
  3. Enable Firestore Database in "Native" mode
  4. Register a Web app and copy the config values below
  5. Deploy Firestore security rules:

     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /sessions/{sessionCode} {
           allow read, write: if true;
         }
       }
     }
*/

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(FIREBASE_CONFIG);
const FIRESTORE = firebase.firestore();
FIRESTORE.enablePersistence({ synchronizeTabs: true }).catch(() => {});
