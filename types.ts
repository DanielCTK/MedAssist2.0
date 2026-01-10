
export enum DRGrade {
  NoDR = 0,
  Mild = 1,
  Moderate = 2,
  Severe = 3,
  Proliferative = 4
}

export interface UserProfile {
  uid: string;
  role: 'doctor' | 'patient' | 'admin'; // Added 'admin' role
  displayName: string;
  email: string;
  password?: string; // Added for Admin visibility (Demo purpose)
  photoURL?: string;
  bannerURL?: string;
  specialty?: string;
  hospital?: string;
  location?: string;
  phone?: string;
  bio?: string;
  language?: string;
  themePreference?: 'dark' | 'light';
  doctorUid?: string; 
  isOnline?: boolean; 
  lastSeen?: any;     
}

export interface AdminTask {
    id: string;
    title: string;
    description: string;
    assignedTo: string;
    assignedToName: string;
    createdBy: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Todo' | 'In Progress' | 'Completed';
    dueDate: string;
    createdAt: any;
}

export interface DiagnosisRecord {
    id: string;
    date: string;
    grade: DRGrade;
    confidence: number;
    note: string; 
    doctorNotes?: string; 
    imageUrl?: string;
    heatmapUrl?: string; 
}

export interface Patient {
  id: string; 
  uid?: string; 
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
    category: 'General' | 'Device' | 'Drops' | 'Protection' | 'Meds';
    price: string;
    img: string;
    stock: number;
    badge: string;
}

export interface Appointment {
    id: string;
    doctorId?: string; 
    patientId?: string;
    patientName: string;
    title: string;
    type: 'Diagnosis' | 'Consult' | 'Surgery' | 'Meeting';
    startTime: number;
    duration: number;
    status: 'Pending' | 'In Progress' | 'Done';
    date: string;
    notes?: string;
    priority?: string;
    room?: string;
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
    typing?: Record<string, boolean>; 
}

export interface ReferenceItem {
    id: string;
    title: string;
    category: 'Interface' | 'Research' | 'Article';
    imageData: string; 
    dateAdded: string;
    tags?: string[]; 
}
