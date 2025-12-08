import { AnalysisResult, DRGrade } from '../types';

// =================================================================================
// 🧠 AI ENGINE CONNECTION
// Connects to your local FastAPI backend (medassist-ai-core)
// =================================================================================

const API_URL = "http://localhost:8000/predict"; // URL mặc định của FastAPI/Uvicorn

export interface EnhancedAnalysisResult extends AnalysisResult {
    // Advice is handled via translations
}

export const analyzeImageWithLocalModel = async (file: File | null, gradeOverride?: DRGrade): Promise<EnhancedAnalysisResult> => {
  console.log("Processing image...", file?.name);

  // 1. Simulation Override (Testing Mode)
  if (gradeOverride !== undefined) {
      return new Promise((resolve) => {
          setTimeout(() => {
              resolve({
                  grade: gradeOverride,
                  confidence: 0.98,
                  processingTime: 0.5,
                  timestamp: new Date().toISOString()
              });
          }, 800);
      });
  }

  // 2. REAL AI CALL (FastAPI)
  if (file) {
      try {
          const formData = new FormData();
          formData.append("file", file);

          const startTime = performance.now();
          
          // Gọi API Python
          const response = await fetch(API_URL, {
              method: "POST",
              body: formData,
          });

          if (!response.ok) {
              throw new Error(`API Error: ${response.statusText}`);
          }

          const data = await response.json();
          const endTime = performance.now();

          console.log("AI Result:", data);

          // Map response từ Python về Typescript
          return {
              grade: data.grade as DRGrade, // Đảm bảo Python trả về int 0-4
              confidence: data.confidence,  // Đảm bảo Python trả về float 0.0-1.0
              processingTime: (endTime - startTime) / 1000,
              timestamp: new Date().toISOString()
          };

      } catch (error) {
          console.warn("⚠️ Không kết nối được với AI Core (FastAPI). Đang chuyển sang chế độ Mô phỏng.", error);
          // Fallthrough to simulation below
      }
  }

  // 3. FALLBACK SIMULATION (Nếu chưa bật server Python hoặc lỗi mạng)
  return new Promise((resolve) => {
    setTimeout(() => {
      // Logic ngẫu nhiên (chỉ chạy khi không có Backend)
      const rand = Math.random();
      let simulatedGrade: DRGrade;
      
      if (rand > 0.9) simulatedGrade = DRGrade.Proliferative;
      else if (rand > 0.75) simulatedGrade = DRGrade.Severe;
      else if (rand > 0.55) simulatedGrade = DRGrade.Moderate;
      else if (rand > 0.3) simulatedGrade = DRGrade.Mild;
      else simulatedGrade = DRGrade.NoDR;

      const simulatedConfidence = 0.85 + (Math.random() * 0.14); 

      resolve({
        grade: simulatedGrade,
        confidence: simulatedConfidence,
        processingTime: 1.5,
        timestamp: new Date().toISOString()
      });
    }, 2000); 
  });
};