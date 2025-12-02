import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, doc } from "firebase/firestore";
import { Appointment } from "../types";

const COLLECTION_NAME = "appointments";

// --- GET APPOINTMENTS FOR A SPECIFIC DATE ---
export const subscribeToAppointments = (
    dateStr: string,
    onData: (appointments: Appointment[]) => void,
    onError: (error: any) => void
) => {
    const q = query(collection(db, COLLECTION_NAME), where("date", "==", dateStr));

    return onSnapshot(q,
        (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];
            
            // Client-side sort by startTime
            items.sort((a, b) => a.startTime - b.startTime);
            
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