import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "firebase/auth";
import { UserProfile } from "../types";

const COLLECTION_NAME = "users";

// =================================================================================
// ☁️ CẤU HÌNH CLOUDINARY
// =================================================================================

const CLOUD_NAME = "dii5mvade"; 
const UPLOAD_PRESET = "medassist_preset"; 

// =================================================================================

// --- GET OR CREATE USER PROFILE ---
export const getUserProfile = async (user: User, role?: 'doctor' | 'patient'): Promise<UserProfile> => {
    const userRef = doc(db, COLLECTION_NAME, user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        // Ensure role exists for backward compatibility (default to doctor if undefined)
        if (!data.role) {
            data.role = 'doctor'; 
        }
        return data;
    } else {
        const newProfile: UserProfile = {
            uid: user.uid,
            role: role || 'doctor', // Use provided role or default to doctor
            displayName: user.displayName || (role === 'patient' ? 'Patient' : 'Doctor'),
            email: user.email || '',
            photoURL: user.photoURL || '',
            bannerURL: '',
            specialty: role === 'doctor' ? 'Medical Specialist' : undefined,
            hospital: role === 'doctor' ? 'General Hospital' : undefined,
            location: 'Ho Chi Minh City, Vietnam',
            phone: '',
            bio: role === 'doctor' ? 'Dedicated medical professional.' : 'Patient account.',
            language: 'English'
        };
        await setDoc(userRef, newProfile);
        return newProfile;
    }
};

// --- UPDATE USER PROFILE ---
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(userRef, data);
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

// --- RESIZE IMAGE & GET BASE64 (LOCAL OPTIMIZATION) ---
const resizeImageToBase64 = (file: File, maxWidth: number = 1000): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        const timeoutId = setTimeout(() => reject(new Error("Image processing timeout")), 5000);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                clearTimeout(timeoutId);
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl);
                } else {
                    reject(new Error("Canvas context failed"));
                }
            };
            img.onerror = (err) => {
                clearTimeout(timeoutId);
                reject(err);
            };
        };
        reader.onerror = (error) => {
            clearTimeout(timeoutId);
            reject(error);
        };
    });
};

// --- ROBUST UPLOAD FUNCTION (CLOUDINARY + FALLBACK) ---
export const uploadUserImage = async (uid: string, file: File, type: 'avatar' | 'banner'): Promise<string> => {
    let base64String: string;

    // 1. Prepare Base64
    const maxWidth = type === 'avatar' ? 300 : 1200;
    try {
        base64String = await resizeImageToBase64(file, maxWidth);
    } catch (e) {
        console.error("Resize failed, reading raw file", e);
        base64String = await new Promise((r) => {
            const reader = new FileReader();
            reader.onload = (evt) => r(evt.target?.result as string);
            reader.readAsDataURL(file);
        });
    }

    // 2. Try Uploading to Cloudinary
    try {
        const formData = new FormData();
        formData.append("file", base64String);
        formData.append("upload_preset", UPLOAD_PRESET); 
        formData.append("folder", `medassist_users/${uid}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        console.log(`Starting upload to Cloudinary: ${CLOUD_NAME}`);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Cloudinary error: ${response.status} - ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.secure_url;

    } catch (error) {
        console.warn("Cloudinary upload failed. Using Firestore Base64 Fallback.", error);
        return base64String;
    }
};