import { db } from "./firebase";
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, doc } from "firebase/firestore";
import { Appointment } from "../types";

const COLLECTION_NAME = "appointments";

// ============================================================================
// 1. LẤY LỊCH HẸN THEO NGÀY (DÀNH CHO LỊCH LÀM VIỆC CỦA BÁC SĨ)
// ============================================================================
export const subscribeToAppointments = (
    dateStr: string,
    userId: string | undefined,
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
            
            // Lọc theo Doctor ID (nếu có)
            if (userId) {
                items = items.filter(item => item.doctorId === userId); 
            }

            // Sắp xếp theo giờ tăng dần
            items.sort((a, b) => a.startTime - b.startTime);
            
            onData(items);
        },
        onError
    );
};

// ============================================================================
// 2. LẤY DANH SÁCH CHỜ DUYỆT (INBOX - DÀNH CHO BÁC SĨ)
// ============================================================================
export const subscribeToPendingAppointments = (
    doctorId: string | undefined, // Thêm tham số này để lọc
    onData: (appointments: Appointment[]) => void,
    onError: (error: any) => void
) => {
    // Nếu chưa có ID bác sĩ (ví dụ mới login chưa load xong), chưa gọi vội
    if (!doctorId) return () => {};

    const q = query(
        collection(db, COLLECTION_NAME), 
        where("status", "==", "Pending"),
        where("doctorId", "==", doctorId) // QUAN TRỌNG: Chỉ lấy khách của bác sĩ này
    );

    return onSnapshot(q,
        (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Appointment[];
            
            // Sắp xếp: Mới nhất lên đầu
            items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            onData(items);
        },
        onError
    );
};

// ============================================================================
// 3. LẤY LỊCH SỬ KHÁM (DÀNH CHO BỆNH NHÂN)
// ============================================================================
export const subscribeToPatientAppointments = (
    patientUid: string,
    // Bỏ tham số patientEmail thừa thãi
    onData: (appointments: Appointment[]) => void,
    onError: (error: any) => void
) => {
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
            
            // Sắp xếp: Mới nhất lên đầu
            items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            onData(items);
        },
        onError
    );
};

// ============================================================================
// 4. LẤY LỊCH HẸN TRONG KHOẢNG THỜI GIAN (DÙNG CHO BIỂU ĐỒ THỐNG KÊ)
// ============================================================================
export const subscribeToAppointmentsRange = (
    startDate: string,                  // Tham số 1
    endDate: string,                    // Tham số 2
    userId: string | undefined,         // Tham số 3 (Doctor ID)
    onData: (appointments: Appointment[]) => void, // Tham số 4
    onError: (error: any) => void       // Tham số 5
) => {
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

            // Lọc theo bác sĩ
            if (userId) {
                items = items.filter(item => item.doctorId === userId);
            }

            onData(items);
        },
        onError
    );
};

// ============================================================================
// CÁC HÀM CRUD (THÊM, SỬA, XÓA)
// ============================================================================

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

export const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    try {
        // Loại bỏ trường id nếu có lỡ lọt vào data update
        const { id: _, ...updateData } = data as any; 
        await updateDoc(doc(db, COLLECTION_NAME, id), updateData);
    } catch (error) {
        console.error("Error updating appointment:", error);
        throw error;
    }
};

export const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, id), { status });
    } catch (error) {
        console.error("Error updating status:", error);
        throw error;
    }
};

export const deleteAppointment = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting appointment:", error);
        throw error;
    }
};