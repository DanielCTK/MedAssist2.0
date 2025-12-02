import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBHjEDhhFTa4SfX2J5MPNmPzzr39O_iYKs",
  authDomain: "medassist-ed4cd.firebaseapp.com",
  projectId: "medassist-ed4cd",
  storageBucket: "medassist-ed4cd.firebasestorage.app",
  messagingSenderId: "62628079798",
  appId: "1:62628079798:web:656b47d3855e6fba8fde17",
  measurementId: "G-9ZXPF54YSQ"
};

// Initialize Firebase
// Using a check to prevent multiple initializations in development hot-reload environments
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth instance
const auth = getAuth(app);

// Initialize Firestore instance
const db = getFirestore(app);

export { auth, db };
export default app;