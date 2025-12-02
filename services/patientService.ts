import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, doc, arrayUnion, getDoc } from "firebase/firestore";
import { Patient, DiagnosisRecord } from "../types";

const COLLECTION_NAME = "patients";

// --- GET REAL-TIME PATIENTS ---
export const subscribeToPatients = (
  onData: (patients: Patient[]) => void,
  onError: (error: any) => void
) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  
  return onSnapshot(q, 
    (snapshot) => {
      const patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      onData(patients);
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      onError(error);
    }
  );
};

// --- ADD PATIENT ---
export const addPatient = async (patientData: Omit<Patient, "id">) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...patientData,
      createdAt: serverTimestamp(),
      lastExam: new Date().toISOString().split('T')[0], // Default to today
      status: patientData.status || 'Active',
      diagnosisHistory: [] // Initialize empty history
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
        
        // Push to history array and update lastExam date
        await updateDoc(patientRef, {
            diagnosisHistory: arrayUnion(diagnosis),
            lastExam: diagnosis.date.split('T')[0], // Update last exam date
            status: diagnosis.grade >= 3 ? 'Critical' : 'Active' // Auto-update status based on severity
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