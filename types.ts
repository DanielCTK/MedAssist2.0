
export enum DRGrade {
  NoDR = 0,
  Mild = 1,
  Moderate = 2,
  Severe = 3,
  Proliferative = 4
}

export interface UserProfile {
  uid: string;
  role: 'doctor' | 'patient'; // Added role distinction
  displayName: string;
  email: string;
  photoURL?: string;
  bannerURL?: string;
  specialty?: string;
  hospital?: string;
  location?: string;
  phone?: string;
  bio?: string;
  language?: string;
  themePreference?: 'dark' | 'light';
  doctorUid?: string; // For patients linked to a doctor
}

export interface DiagnosisRecord {
    id: string;
    date: string;
    grade: DRGrade;
    confidence: number;
    note: string;
    imageUrl?: string;
}

export interface Patient {
  id: string; // Firestore Document ID
  uid?: string; // Linked User Auth ID (Crucial for Chat)
  doctorUid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  lastExam: string;
  history: string;
  status?: 'Active' | 'Follow-up' | 'Critical' | 'Discharged';
  phone?: string;
  email?: string;
  address?: string;
  bloodType?: string;
  height?: number;
  weight?: number;
  avatarUrl?: string;
  diagnosisHistory?: DiagnosisRecord[];
}

export interface AnalysisResult {
  grade: DRGrade;
  confidence: number;
  heatmapUrl?: string;
  processingTime: number;
  timestamp: string;
  advice?: string;
}

export interface ReportData {
  clinicalNotes: string;
  patientLetter: string;
}

export interface ChartData {
  name: string;
  value: number;
  fill: string;
  [key: string]: any;
}

export interface InventoryItem {
    id: string;
    name: string;
    category: 'General' | 'Device' | 'Drops' | 'Protection';
    price: string;
    img: string;
    stock: number;
    badge: string;
}

export interface Appointment {
    id: string;
    doctorId?: string; // NEW: Associate appointment with a specific doctor
    patientId?: string;
    patientName: string;
    title: string;
    type: 'Diagnosis' | 'Consult' | 'Surgery' | 'Meeting';
    startTime: number;
    duration: number;
    status: 'Pending' | 'In Progress' | 'Done';
    date: string;
    notes?: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    createdAt: any;
}

export interface ChatUser extends UserProfile {
    status?: 'online' | 'offline';
}

export interface ChatSession {
    id: string;
    participants: string[];
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: any;
        seen: boolean;
    };
    updatedAt: any;
}

export interface ReferenceItem {
    id: string;
    title: string;
    category: 'Interface' | 'Research' | 'Article';
    imageData: string; // Base64 string
    dateAdded: string;
}
