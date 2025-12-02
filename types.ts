export enum DRGrade {
  NoDR = 0,
  Mild = 1,
  Moderate = 2,
  Severe = 3,
  Proliferative = 4
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
}

export interface AnalysisResult {
  grade: DRGrade;
  confidence: number;
  heatmapUrl?: string; // Optional URL if your local model returns a heatmap image
  processingTime: number;
  timestamp: string;
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