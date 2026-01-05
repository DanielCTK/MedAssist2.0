
import * as firebaseApp from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyBHjEDhhFTa4SfX2J5MPNmPzzr39O_iYKs",
  authDomain: "medassist-ed4cd.firebaseapp.com",
  projectId: "medassist-ed4cd",
  storageBucket: "medassist-ed4cd.firebasestorage.app",
  messagingSenderId: "62628079798",
  appId: "1:62628079798:web:656b47d3855e6fba8fde17",
  measurementId: "G-9ZXPF54YSQ"
};

// Initialize Firebase (Modular SDK)
// Use type casting to bypass potential type definition mismatch for initializeApp
const app = (firebaseApp as any).initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
