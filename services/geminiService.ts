import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, DRGrade, Patient, ReportData } from "../types";

// NOTE: In a real production app, API calls should be routed through a backend to hide the key.
// Since this is a client-side demo tool connecting to a local model, we use env var directly.
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set process.env.API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

const getGradeName = (grade: DRGrade): string => {
  switch (grade) {
    case DRGrade.NoDR: return "No Diabetic Retinopathy";
    case DRGrade.Mild: return "Mild Non-Proliferative Diabetic Retinopathy";
    case DRGrade.Moderate: return "Moderate Non-Proliferative Diabetic Retinopathy";
    case DRGrade.Severe: return "Severe Non-Proliferative Diabetic Retinopathy";
    case DRGrade.Proliferative: return "Proliferative Diabetic Retinopathy";
    default: return "Unknown";
  }
};

export const generateClinicalReport = async (
  patient: Patient,
  analysis: AnalysisResult
): Promise<ReportData> => {
  const ai = getClient();
  
  const gradeText = getGradeName(analysis.grade);
  
  const prompt = `
    You are an expert ophthalmologist assistant. 
    
    Context:
    A deep learning model has analyzed a fundus image for patient ${patient.name} (Age: ${patient.age}, Gender: ${patient.gender}).
    Patient History: ${patient.history}.
    
    Model Findings:
    - Diagnosis: ${gradeText} (Grade ${analysis.grade})
    - Model Confidence: ${(analysis.confidence * 100).toFixed(1)}%
    
    Task:
    Generate a JSON object with two fields:
    1. "clinicalNotes": A professional, concise paragraph for a doctor's medical record, summarizing the automated finding and suggesting standard next steps (e.g., follow-up duration, OCT scan needed) based on the severity.
    2. "patientLetter": A gentle, easy-to-understand paragraph addressed to the patient explaining the result and what they should do next. Avoid overly alarming language but be clear about urgency if severe.
    
    Return ONLY raw JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as ReportData;

  } catch (error) {
    console.error("Gemini Report Generation Error:", error);
    return {
      clinicalNotes: "Error generating report. Please refer to manual diagnosis.",
      patientLetter: "Error generating letter."
    };
  }
};