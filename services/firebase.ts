// services/firebase.ts

import * as firebaseApp from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Thêm GoogleAuthProvider
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
const app = (firebaseApp as any).initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- THÊM DÒNG NÀY ---
const googleProvider = new GoogleAuthProvider();

// Xuất googleProvider ra để dùng
export { auth, db, storage, googleProvider };