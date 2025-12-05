import { doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
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

// --- SUBSCRIBE TO USER PROFILE (REAL-TIME) ---
export const subscribeToUserProfile = (uid: string, onUpdate: (profile: UserProfile | null) => void) => {
    return onSnapshot(doc(db, COLLECTION_NAME, uid), (docSnap) => {
        if (docSnap.exists()) {
            onUpdate(docSnap.data() as UserProfile);
        } else {
            onUpdate(null);
        }
    }, (error) => {
        console.error("Profile subscription error:", error);
        onUpdate(null);
    });
};

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
        const defaultRole = role || 'doctor';
        
        // Construct the base profile to ensure no 'undefined' values are passed to Firestore
        const newProfile: UserProfile = {
            uid: user.uid,
            role: defaultRole,
            displayName: user.displayName || (defaultRole === 'patient' ? 'Patient' : 'Doctor'),
            email: user.email || '',
            photoURL: user.photoURL || '',
            bannerURL: '',
            location: 'Ho Chi Minh City, Vietnam',
            phone: '',
            bio: defaultRole === 'doctor' ? 'Dedicated medical professional.' : 'Patient account.',
            language: 'English'
        };

        // Only add specific fields if they apply. 
        // IMPORTANT: Firestore throws error if value is 'undefined', so we strictly add these only for doctors.
        if (defaultRole === 'doctor') {
            newProfile.specialty = 'Medical Specialist';
            newProfile.hospital = 'General Hospital';
        }

        await setDoc(userRef, newProfile);
        return newProfile;
    }
};

// --- UPDATE USER PROFILE ---
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        // Clean data to remove undefined values before updating
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined)
        );
        await updateDoc(userRef, cleanData);
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

// --- DELETE USER PROFILE ---
export const deleteUserProfile = async (uid: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, uid));
    } catch (error) {
        console.error("Error deleting user profile:", error);
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