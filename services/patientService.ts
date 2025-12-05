import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, doc, arrayUnion, getDocs, setDoc } from "firebase/firestore";
import { Patient, DiagnosisRecord, UserProfile } from "../types";
import { User } from "firebase/auth";

const COLLECTION_NAME = "patients";
const USERS_COLLECTION = "users";

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
        // 1. Find the Doctor by Email
        const usersRef = collection(db, USERS_COLLECTION);
        const q = query(usersRef, where("email", "==", doctorEmail), where("role", "==", "doctor"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Doctor not found with this email.");
        }

        const doctorDoc = querySnapshot.docs[0];
        const doctorData = doctorDoc.data() as UserProfile;
        const doctorUid = doctorDoc.id; 

        if (!doctorUid) throw new Error("Invalid doctor data: UID missing");

        // 2. Update Patient's User Profile
        const patientUserRef = doc(db, USERS_COLLECTION, patientProfile.uid);
        await updateDoc(patientUserRef, {
            doctorUid: doctorUid,
            hospital: doctorData.hospital || 'Linked Clinic' 
        });

        // 3. Sync with Doctor's Patient List
        const patientsRef = collection(db, COLLECTION_NAME);
        const existingPatientQ = query(patientsRef, where("email", "==", patientProfile.email), where("doctorUid", "==", doctorUid));
        const existingSnapshot = await getDocs(existingPatientQ);

        if (existingSnapshot.empty) {
            // Create new record
            await addDoc(patientsRef, {
                uid: patientProfile.uid,
                doctorUid: doctorUid,
                name: patientProfile.displayName || 'Unknown',
                email: patientProfile.email || '',
                phone: patientProfile.phone || '',
                address: patientProfile.location || '',
                age: 0,
                gender: 'Other',
                status: 'Active',
                createdAt: serverTimestamp(),
                lastExam: new Date().toISOString().split('T')[0],
                diagnosisHistory: [],
                avatarUrl: patientProfile.photoURL || ''
            });
        } else {
            // Update existing record
            const docId = existingSnapshot.docs[0].id;
            await updateDoc(doc(db, COLLECTION_NAME, docId), {
                uid: patientProfile.uid,
                avatarUrl: patientProfile.photoURL || '',
                name: patientProfile.displayName || 'Unknown'
            });
        }

        return { ...doctorData, uid: doctorUid };
    } catch (error) {
        console.error("Linking error:", error);
        throw error;
    }
};

// --- ADD PATIENT (Manual by Doctor) ---
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
        await updateDoc(patientRef, {
            diagnosisHistory: arrayUnion(diagnosis),
            lastExam: diagnosis.date.split('T')[0],
            status: diagnosis.grade >= 3 ? 'Critical' : 'Active'
        });
    } catch (error) {
        console.error("Error adding diagnosis history:", error);
        throw error;
    }
}

// --- DELETE PATIENT ---
export const deletePatient = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting patient: ", error);
    throw error;
  }
};