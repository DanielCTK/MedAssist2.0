export enum DRGrade {
  NoDR = 0,
  Mild = 1,
  Moderate = 2,
  Severe = 3,
  Proliferative = 4
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bannerURL?: string; // New: For profile cover image
  specialty?: string; // e.g. "Chief Surgeon"
  hospital?: string;  // e.g. "General Hospital"
  location?: string;  // New: e.g. "Sylhet, Bangladesh"
  phone?: string;
  bio?: string;
  language?: string; // New: e.g. "English" or "Vietnamese"
  themePreference?: 'dark' | 'light';
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
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  lastExam: string;
  history: string;
  status?: 'Active' | 'Follow-up' | 'Critical' | 'Discharged';
  phone?: string;
  email?: string;
  // New fields for the UI
  bloodType?: string;
  height?: number; // cm
  weight?: number; // kg
  avatarUrl?: string;
  diagnosisHistory?: DiagnosisRecord[];
}

export interface AnalysisResult {
  grade: DRGrade;
  confidence: number;
  heatmapUrl?: string; // Optional URL if your local model returns a heatmap image
  processingTime: number;
  timestamp: string;
  advice?: string; // Doctor's advice based on grade
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
    patientName: string;
    title: string;
    type: 'Diagnosis' | 'Consult' | 'Surgery' | 'Meeting';
    startTime: number;
    duration: number;
    status: 'Pending' | 'In Progress' | 'Done';
    date: string;
    notes?: string;
}