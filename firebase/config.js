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
  apiKey: "AIzaSyB6cpLcjvQwDolqaXLkBYkJI2kVNeIvNmU",
  authDomain: "firstpick-afc34.firebaseapp.com",
  projectId: "firstpick-afc34",
  storageBucket: "firstpick-afc34.firebasestorage.app",
  messagingSenderId: "833592591457",
  appId: "1:833592591457:web:723770369abfbaf4179620",
  measurementId: "G-LDS7BTDG9S"
};

firebase.initializeApp(FIREBASE_CONFIG);
const FIRESTORE = firebase.firestore();
FIRESTORE.enablePersistence({ synchronizeTabs: true }).catch(() => {});
