import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { Patient } from "../types";

const COLLECTION_NAME = "patients";

// --- GET REAL-TIME PATIENTS ---
// Added onError callback to handle permission denied or network errors
export const subscribeToPatients = (
  onData: (patients: Patient[]) => void,
  onError: (error: any) => void
) => {
  // Simple query without ordering first to avoid index issues during initial setup,
  // or handle the error if index is missing.
  // Note: orderBy might require a composite index if mixed with where(), but here it's simple.
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
      status: patientData.status || 'Active'
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
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error("Error updating patient: ", error);
    throw error;
  }
};

// --- DELETE PATIENT ---
export const deletePatient = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting patient: ", error);
    throw error;
  }
};