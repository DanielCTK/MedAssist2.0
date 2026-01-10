
import { doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "firebase/auth";
import { UserProfile } from "../types";

const COLLECTION_NAME = "users";

const CLOUD_NAME = "dii5mvade"; 
const UPLOAD_PRESET = "medassist_preset"; 

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

export const setUserOnline = async (uid: string) => {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });
    } catch (error) { console.error(error); }
};

export const setUserOffline = async (uid: string) => {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        await updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() });
    } catch (error: any) {
        if (error.code === 'permission-denied') return;
        console.error(error);
    }
};

export const getUserProfile = async (user: User, role?: 'doctor' | 'patient' | 'admin'): Promise<UserProfile> => {
    const userRef = doc(db, COLLECTION_NAME, user.uid);
    const userSnap = await getDoc(userRef);

    // List of Super Admin Emails
    const ADMIN_EMAILS = ['qwer@admin.com', 'daniel@test.com'];

    if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        
        // --- FIX: FORCE ADMIN ROLE UPDATE ---
        // If the email matches an admin email but the role in DB is NOT admin, update it immediately.
        if (user.email && ADMIN_EMAILS.includes(user.email) && profile.role !== 'admin') {
            console.log("⚠️ Detected SuperUser with wrong role. Forcing upgrade to ADMIN...");
            await updateDoc(userRef, { 
                role: 'admin',
                displayName: profile.displayName || 'Root Administrator',
                bio: 'System God Mode. Authorized Personnel Only.'
            });
            profile.role = 'admin'; // Update local object to return immediately
        }
        // ------------------------------------

        return profile;
    } else {
        // SUPER ADMIN LOGIC: HARDCODED FOR TESTING
        let defaultRole = role || 'patient';
        
        if (user.email && ADMIN_EMAILS.includes(user.email)) {
            defaultRole = 'admin';
        }
        
        const newProfile: UserProfile = {
            uid: user.uid,
            role: defaultRole,
            displayName: user.displayName || (defaultRole === 'admin' ? 'Root Administrator' : (defaultRole === 'patient' ? 'Patient User' : 'Doctor Specialist')),
            email: user.email || '',
            photoURL: user.photoURL || '',
            bannerURL: '',
            location: 'Global Command Center',
            phone: '',
            bio: defaultRole === 'admin' ? 'System God Mode. Authorized Personnel Only.' : 'Standard user account.',
            language: 'English',
            isOnline: true,
            lastSeen: serverTimestamp()
        };

        if (defaultRole === 'doctor') {
            newProfile.specialty = 'Specialist';
            newProfile.hospital = 'MedAssist General';
        }

        await setDoc(userRef, newProfile);
        return newProfile;
    }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    try {
        const userRef = doc(db, COLLECTION_NAME, uid);
        const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
        await updateDoc(userRef, cleanData);
    } catch (error) { throw error; }
};

export const deleteUserProfile = async (uid: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, uid));
};

export const uploadUserImage = async (uid: string, file: File, type: 'avatar' | 'banner'): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET); 
    formData.append("folder", `medassist_users/${uid}`);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
    });
    const data = await response.json();
    return data.secure_url;
};
