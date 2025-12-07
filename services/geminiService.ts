import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, DRGrade, Patient, ReportData } from "../types";

// ============================================================================
// 1. CẤU HÌNH API KEY
// ============================================================================
const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ Lỗi: Không tìm thấy VITE_GEMINI_API_KEY trong file .env");
    throw new Error("API Key config missing");
  }
  return new GoogleGenAI({ apiKey });
};

// Hàm chuyển đổi số (0-4) thành chữ
const getGradeDescription = (grade: DRGrade): string => {
  const descriptions = [
    "No Diabetic Retinopathy (Grade 0) - Mắt bình thường.",
    "Mild Non-Proliferative DR (Grade 1) - Bệnh võng mạc tiểu đường nhẹ.",
    "Moderate Non-Proliferative DR (Grade 2) - Bệnh võng mạc tiểu đường trung bình.",
    "Severe Non-Proliferative DR (Grade 3) - Bệnh võng mạc tiểu đường nặng.",
    "Proliferative DR (Grade 4) - Bệnh võng mạc tiểu đường tăng sinh (Nghiêm trọng)."
  ];
  return descriptions[grade] || "Unknown diagnosis";
};

// ============================================================================
// 2. HÀM TẠO BÁO CÁO
// ============================================================================
export const generateClinicalReport = async (
  patient: Patient,
  analysis: AnalysisResult,
  language: 'en' | 'vi' = 'en'
): Promise<ReportData> => {
  try {
    const ai = getClient();
    
    // --- SỬA TẠI ĐÂY ---
    // Dùng tên phiên bản CỤ THỂ (-001).
    // Nếu vẫn lỗi, bạn có thể thử 'gemini-1.5-pro-001' hoặc 'gemini-pro'
    const modelId = 'gemini-2.5-flash'; 

    const diagnosisInfo = getGradeDescription(analysis.grade);
    const confidenceScore = (analysis.confidence * 100).toFixed(1);

    const prompt = `
      ROLE: You are an expert Medical AI Assistant specializing in Ophthalmology.
      
      INPUT DATA (From Local AI Diagnosis Model):
      - Patient Name: ${patient.name}
      - Age/Gender: ${patient.age} / ${patient.gender}
      - History: ${patient.history}
      - AI Model Diagnosis: ${diagnosisInfo}
      - Model Confidence: ${confidenceScore}%

      TASK:
      Based ONLY on the diagnosis provided above, write a clinical report in ${language === 'vi' ? 'VIETNAMESE (Tiếng Việt)' : 'ENGLISH'}.
      
      OUTPUT FORMAT (JSON ONLY):
      You must return a valid JSON object with exactly these two keys:
      1. "clinicalNotes": A professional paragraph for the doctor.
      2. "patientLetter": A warm, simple paragraph for the patient.

      Ensure the JSON is valid and parsed correctly.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        responseMimeType: "application/json" 
      }
    });

    // Xử lý kết quả
    let textData = response.text; 
    
    // Safe check cho các phiên bản SDK khác nhau
    if (typeof textData === 'function') {
        // @ts-ignore
        textData = textData();
    }

    if (!textData) throw new Error("Empty response from Gemini");

    const cleanJson = textData.replace(/```json|```/g, '').trim();

    return JSON.parse(cleanJson) as ReportData;

  } catch (error: any) {
    console.error("Gemini Report Error:", error);
    
    // Kiểm tra lỗi 404 cụ thể để thông báo rõ hơn
    let errorMsg = "AI Service Unavailable.";
    if (error.message && error.message.includes("404")) {
        errorMsg = "Model Error: Tên Model AI không đúng hoặc chưa được cấp quyền.";
    }

    return {
      clinicalNotes: language === 'vi' 
        ? `${errorMsg} Vui lòng kiểm tra lại.` 
        : `${errorMsg} Please check configuration.`,
      patientLetter: language === 'vi' 
        ? "Vui lòng tham khảo ý kiến bác sĩ trực tiếp." 
        : "Please consult your doctor directly."
    };
  }
};  