import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDUUbQlOmkHsrEyMw9AmQBXbjNx11iM7w4",
  authDomain: "chatr-91067.firebaseapp.com",
  projectId: "chatr-91067",
  storageBucket: "chatr-91067.firebasestorage.app",
  messagingSenderId: "839345688435",
  appId: "1:839345688435:web:17283f3299c22c1c233f06",
  measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);

// Configure Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getFirestore(app);

// Messaging with support check
let messaging: any = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export { messaging };

export default app;
