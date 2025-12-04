import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, doc, arrayUnion } from "firebase/firestore";
import { Patient, DiagnosisRecord } from "../types";

const COLLECTION_NAME = "patients";

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
      
      // Sort client-side to avoid composite index requirement issues
      // Sort by createdAt descending (newest first)
      patients.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
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

// --- ADD PATIENT ---
export const addPatient = async (doctorUid: string, patientData: Omit<Patient, "id" | "doctorUid">) => {
  if (!doctorUid) throw new Error("Doctor UID is required");
  
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...patientData,
      doctorUid: doctorUid, // Link to the current user
      createdAt: serverTimestamp(),
      lastExam: new Date().toISOString().split('T')[0],
      status: patientData.status || 'Active',
      diagnosisHistory: []
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
    await updateDoc(doc(db, COLLECTION_NAME, id), data);
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