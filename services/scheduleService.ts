import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, doc, orderBy, or } from "firebase/firestore";
import { Appointment } from "../types";

const COLLECTION_NAME = "appointments";

// --- GET APPOINTMENTS FOR A SPECIFIC DATE ---
// Updated to filter by doctorId
export const subscribeToAppointments = (
    dateStr: string,
    userId: string | undefined, // Added userId param
    onData: (appointments: Appointment[]) => void,
    onError: (error: any) => void
) => {
    const q = query(collection(db, COLLECTION_NAME), where("date", "==", dateStr));

    return onSnapshot(q,
        (snapshot) => {
            let items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];
            
            // Filter by Doctor ID if provided
            // FIX: Allow items that belong to the user OR have no doctor assigned (legacy/pending)
            if (userId) {
                items = items.filter(item => item.doctorId === userId || !item.doctorId);
            }

            // Client-side sort by startTime
            items.sort((a, b) => a.startTime - b.startTime);
            
            onData(items);
        },
        onError
    );
};

// --- NEW: GET ALL PENDING APPOINTMENTS (INBOX MODE) ---
export const subscribeToPendingAppointments = (
    onData: (appointments: Appointment[]) => void,
    onError: (error: any) => void
) => {
    const q = query(
        collection(db, COLLECTION_NAME), 
        where("status", "==", "Pending")
    );

    return onSnapshot(q,
        (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];
            // Sort by date created (oldest first usually, or newest)
            onData(items);
        },
        onError
    );
};

// --- SYNC: GET APPOINTMENTS FOR A SPECIFIC PATIENT (REAL-TIME) ---
export const subscribeToPatientAppointments = (
    patientUid: string,
    patientEmail: string,
    onData: (appointments: Appointment[]) => void,
    onError: (error: any) => void
) => {
    // Query appointments where patientId matches UID OR notes contains email (fallback linkage)
    // Using a simpler query for stability: Fetch recent appointments
    const q = query(
        collection(db, COLLECTION_NAME), 
        where("patientId", "==", patientUid)
    );

    return onSnapshot(q,
        (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];
            
            // Sort by date/time descending (newest first)
            items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            onData(items);
        },
        onError
    );
};

// --- GET APPOINTMENTS FOR A DATE RANGE (FOR CHARTS) ---
// Updated to filter by doctorId
export const subscribeToAppointmentsRange = (
    startDate: string,
    endDate: string,
    userId: string | undefined, // Added userId param
    onData: (appointments: Appointment[]) => void,
    onError: (error: any) => void
) => {
    // Firestore allows range filters on string dates (ISO format YYYY-MM-DD works perfectly)
    const q = query(
        collection(db, COLLECTION_NAME), 
        where("date", ">=", startDate),
        where("date", "<=", endDate)
    );

    return onSnapshot(q,
        (snapshot) => {
            let items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];

            // FIX: Allow items that belong to the user OR have no doctor assigned
            if (userId) {
                items = items.filter(item => item.doctorId === userId || !item.doctorId);
            }

            onData(items);
        },
        onError
    );
};

// --- ADD APPOINTMENT ---
export const addAppointment = async (appt: Omit<Appointment, "id">) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), {
            ...appt,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding appointment:", error);
        throw error;
    }
};

// --- UPDATE APPOINTMENT DATA ---
export const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    try {
        const { id: _, ...updateData } = data as any; 
        await updateDoc(doc(db, COLLECTION_NAME, id), updateData);
    } catch (error) {
        console.error("Error updating appointment:", error);
        throw error;
    }
};

// --- UPDATE STATUS ONLY ---
export const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, id), { status });
    } catch (error) {
        console.error("Error updating status:", error);
        throw error;
    }
};

// --- DELETE APPOINTMENT ---
export const deleteAppointment = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting appointment:", error);
        throw error;
    }
};