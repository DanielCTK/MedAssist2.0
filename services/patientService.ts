
import { db, firebaseConfig } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, doc, arrayUnion, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { Patient, DiagnosisRecord, UserProfile } from "../types";
import { User, getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";

const COLLECTION_NAME = "patients";
const USERS_COLLECTION = "users";

// Cloudinary Configuration (Mirrored from userService for consistency)
const CLOUD_NAME = "dii5mvade"; 
const UPLOAD_PRESET = "medassist_preset"; 

// --- UPLOAD HELPER ---
export const uploadDiagnosisImage = async (file: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET); 
        formData.append("folder", "medassist_diagnosis");

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Image upload failed");
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Upload error:", error);
        throw error;
    }
};

// --- GET REAL-TIME PATIENTS FOR SPECIFIC DOCTOR ---
export const subscribeToPatients = (
  doctorUid: string,
  onData: (patients: Patient[]) => void,
  onError: (error: any) => void
) => {
  if (!doctorUid) return () => {};

  // Query only patients belonging to this doctor
  const q = query(
      collection(db, COLLECTION_NAME), 
      where("doctorUid", "==", doctorUid)
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      const patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      
      // Sort client-side
      patients.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
      });

      onData(patients);
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      onError(error);
    }
  );
};

// --- AUTO-LINK FUNCTION (Run on Patient Login) ---
// Checks if a doctor has already added this patient by email. If so, links them.
export const checkAndAutoLinkPatient = async (currentUser: User, userProfile: UserProfile) => {
    if (!currentUser.email || userProfile.role !== 'patient') return null;

    try {
        // 1. Check if there is a patient record with this email but NO uid yet (created manually by doctor)
        // We look for ANY record in 'patients' collection matching the email
        const patientsRef = collection(db, COLLECTION_NAME);
        const q = query(patientsRef, where("email", "==", currentUser.email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Found a match!
            const patientDoc = snapshot.docs[0];
            const patientData = patientDoc.data();
            const doctorUid = patientData.doctorUid;

            console.log("Auto-linking found match with Doctor:", doctorUid);

            const updates: Promise<any>[] = [];

            // A. Update the Doctor's Patient Record with the real User UID
            if (patientData.uid !== currentUser.uid) {
                updates.push(updateDoc(doc(db, COLLECTION_NAME, patientDoc.id), {
                    uid: currentUser.uid,
                    avatarUrl: userProfile.photoURL || patientData.avatarUrl || '' // Sync avatar
                }));
            }

            // B. Update the Patient's User Profile with the Doctor UID
            if (userProfile.doctorUid !== doctorUid) {
                updates.push(updateDoc(doc(db, USERS_COLLECTION, currentUser.uid), {
                    doctorUid: doctorUid,
                    hospital: 'Linked Clinic' // Placeholder
                }));
            }

            await Promise.all(updates);
            return doctorUid;
        }
        return null;
    } catch (error) {
        console.error("Auto-link failed:", error);
        return null;
    }
};

// --- LINK PATIENT TO DOCTOR (Manual by Patient Settings) ---
export const linkPatientToDoctor = async (patientProfile: UserProfile, doctorEmail: string) => {
    try {
        console.log("Attempting to link patient:", patientProfile.email, "to doctor:", doctorEmail);

        // 1. Find the Doctor by Email in 'users' collection
        const usersRef = collection(db, USERS_COLLECTION);
        const q = query(usersRef, where("email", "==", doctorEmail)); // Removed role check to be safer, verify later
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Doctor not found with this email. Please check the spelling.");
        }

        const doctorDoc = querySnapshot.docs[0];
        const doctorData = doctorDoc.data() as UserProfile;
        
        // Verify role
        if (doctorData.role !== 'doctor') {
             throw new Error("The email provided does not belong to a Doctor account.");
        }

        const doctorUid = doctorDoc.id; 

        if (!doctorUid) throw new Error("Invalid doctor data: UID missing");

        // 2. Update Patient's User Profile with Doctor UID
        const patientUserRef = doc(db, USERS_COLLECTION, patientProfile.uid);
        await updateDoc(patientUserRef, {
            doctorUid: doctorUid,
            hospital: doctorData.hospital || 'Linked Clinic' 
        });

        // 3. Sync with Doctor's Patient List (The 'patients' collection)
        // Check if the doctor already has a record for this email
        const patientsRef = collection(db, COLLECTION_NAME);
        const existingPatientQ = query(patientsRef, where("email", "==", patientProfile.email), where("doctorUid", "==", doctorUid));
        const existingSnapshot = await getDocs(existingPatientQ);

        if (existingSnapshot.empty) {
            // Create NEW patient record for the doctor
            console.log("Creating new patient record for doctor...");
            await addDoc(patientsRef, {
                uid: patientProfile.uid, // Critical: Link auth UID
                doctorUid: doctorUid,
                name: patientProfile.displayName || 'New Patient',
                email: patientProfile.email || '',
                phone: patientProfile.phone || '',
                address: patientProfile.location || '',
                age: 0, // Default placeholders
                gender: 'Other',
                status: 'Active',
                createdAt: serverTimestamp(),
                lastExam: new Date().toISOString().split('T')[0],
                diagnosisHistory: [],
                avatarUrl: patientProfile.photoURL || ''
            });
        } else {
            // Update EXISTING record (e.g. Doctor added email manually before)
            console.log("Updating existing patient record...");
            const docId = existingSnapshot.docs[0].id;
            await updateDoc(doc(db, COLLECTION_NAME, docId), {
                uid: patientProfile.uid, // Ensure auth UID is linked
                avatarUrl: patientProfile.photoURL || '',
                name: patientProfile.displayName || existingSnapshot.docs[0].data().name
            });
        }

        return { ...doctorData, uid: doctorUid };
    } catch (error) {
        console.error("Linking error details:", error);
        throw error;
    }
};

// --- CREATE REAL PATIENT ACCOUNT (DOCTOR FEATURE) ---
export const createPatientAccount = async (
    doctorUid: string, 
    patientData: Omit<Patient, "id" | "doctorUid" | "uid"> & { password?: string }
) => {
    // 1. Initialize a secondary Firebase App to create user without logging out the doctor
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);

    try {
        if (!patientData.email || !patientData.password) {
            throw new Error("Email and Password are required to create an account.");
        }

        // 2. Create Authentication User
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, patientData.email, patientData.password);
        const newPatientUid = userCredential.user.uid;

        // 3. Create 'users' collection profile (For Patient Login)
        await setDoc(doc(db, USERS_COLLECTION, newPatientUid), {
            uid: newPatientUid,
            role: 'patient',
            displayName: patientData.name,
            email: patientData.email,
            password: patientData.password, // Store password for Admin View (Demo requirement)
            phone: patientData.phone,
            location: patientData.address,
            doctorUid: doctorUid, // Link to creating doctor immediately
            createdAt: serverTimestamp(),
            photoURL: ''
        });

        // 4. Create 'patients' collection record (For Doctor's Dashboard)
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            uid: newPatientUid, // Link to the new Auth UID
            doctorUid: doctorUid,
            name: patientData.name,
            age: patientData.age,
            gender: patientData.gender,
            history: patientData.history,
            phone: patientData.phone,
            email: patientData.email,
            address: patientData.address,
            status: patientData.status || 'Active',
            createdAt: serverTimestamp(),
            lastExam: new Date().toISOString().split('T')[0],
            diagnosisHistory: [],
            avatarUrl: ''
        });

        // 5. Cleanup: Sign out the secondary user and delete app instance
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);

        return docRef.id;

    } catch (error: any) {
        // Cleanup if error
        await deleteApp(secondaryApp);
        console.error("Error creating patient account: ", error);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("Email already exists. Cannot create a new account.");
        }
        throw error;
    }
};

// --- ADD PATIENT (Manual Data Only - Deprecated if using full flow) ---
export const addPatient = async (doctorUid: string, patientData: Omit<Patient, "id" | "doctorUid">) => {
  if (!doctorUid) throw new Error("Doctor UID is required");
  
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...patientData,
      doctorUid: doctorUid, 
      createdAt: serverTimestamp(),
      lastExam: new Date().toISOString().split('T')[0],
      status: patientData.status || 'Active',
      diagnosisHistory: [],
      avatarUrl: patientData.avatarUrl || '' 
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding patient: ", error);
    throw error;
  }
};

// --- UPDATE PATIENT ---
export const updatePatient = async (id: string, data: Partial<Patient>) => {
  try {
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(doc(db, COLLECTION_NAME, id), cleanData);
  } catch (error) {
    console.error("Error updating patient: ", error);
    throw error;
  }
};

// --- ADD DIAGNOSIS TO HISTORY ---
export const addPatientDiagnosis = async (patientId: string, diagnosis: DiagnosisRecord) => {
    try {
        const patientRef = doc(db, COLLECTION_NAME, patientId);
        
        // STRICT SANITIZATION: Ensure all properties are primitives to avoid "invalid nested entity" error in arrayUnion
        const safeDiagnosis = {
            id: String(diagnosis.id),
            date: String(diagnosis.date),
            grade: Number(diagnosis.grade), // Force number
            confidence: Number(diagnosis.confidence), // Force number
            note: String(diagnosis.note || ""),
            doctorNotes: String(diagnosis.doctorNotes || ""),
            imageUrl: diagnosis.imageUrl ? String(diagnosis.imageUrl) : null,
            heatmapUrl: diagnosis.heatmapUrl ? String(diagnosis.heatmapUrl) : null
        };

        // WARNING: If imageUrl is Base64, this will likely fail Firestore 1MB limit.
        // The calling component (DiagnosisView) should ensure imageUrl is a URL (from upload) before calling this.

        await updateDoc(patientRef, {
            diagnosisHistory: arrayUnion(safeDiagnosis),
            lastExam: safeDiagnosis.date.split('T')[0],
            status: safeDiagnosis.grade >= 3 ? 'Critical' : 'Active'
        });
    } catch (error) {
        console.error("Error adding diagnosis history:", error);
        throw error;
    }
}

// --- DELETE PATIENT (With Cascading Delete of Appointments) ---
export const deletePatient = async (id: string) => {
  try {
    // We use a Batch Write to ensure both the Patient record and their Appointments are deleted together.
    const batch = writeBatch(db);

    // 1. Reference the Patient Document
    const patientRef = doc(db, COLLECTION_NAME, id);
    batch.delete(patientRef);

    // 2. Find all Appointments associated with this Patient ID
    // Note: We query the 'appointments' collection where 'patientId' matches.
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef, where("patientId", "==", id));
    const snapshot = await getDocs(q);

    // 3. Queue deletion for each appointment found
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // 4. Commit the batch
    await batch.commit();
    console.log(`Successfully deleted patient ${id} and ${snapshot.size} associated appointments.`);

  } catch (error) {
    console.error("Error deleting patient and cascading data: ", error);
    throw error;
  }
};
