import { AnalysisResult, DRGrade } from '../types';

// =================================================================================
// 🧠 AI ENGINE CONNECTION
// Kết nối với backend Python (medassist-ai-core) chứa model Keras của bạn
// =================================================================================

// Lấy URL từ biến môi trường hoặc dùng mặc định
const API_URL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/predict` 
    : "http://localhost:8000/predict";

export const analyzeImageWithLocalModel = async (file: File | null, gradeOverride?: DRGrade): Promise<AnalysisResult> => {
  console.log("Đang gửi ảnh tới AI Core...", file?.name);

  // 1. Chế độ Test nhanh (Nếu dev muốn override kết quả)
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

  // 2. GỌI REAL MODEL (Model Keras của bạn qua API)
  if (file) {
      try {
          const formData = new FormData();
          formData.append("file", file); // Key 'file' phải khớp với bên Python

          const startTime = performance.now();
          
          // Gọi API Python
          const response = await fetch(API_URL, {
              method: "POST",
              body: formData,
          });

          if (!response.ok) {
              throw new Error(`Lỗi kết nối AI Core: ${response.statusText}`);
          }

          // Giả sử Python trả về JSON: { "prediction": 2, "confidence": 0.85, "heatmap": "base64..." }
          const data = await response.json();
          const endTime = performance.now();

          console.log("Kết quả từ Keras Model:", data);

          // Map response từ Python về Typescript
          // Bạn cần đảm bảo Python trả về đúng key 'prediction' hoặc 'grade'
          return {
              grade: (data.prediction !== undefined ? data.prediction : data.grade) as DRGrade, 
              confidence: data.confidence || 0.95,  
              heatmapUrl: data.heatmap || undefined, // Nếu model trả về heatmap
              processingTime: (endTime - startTime) / 1000,
              timestamp: new Date().toISOString()
          };

      } catch (error) {
          console.error("⚠️ Không kết nối được với AI Core (Python).", error);
          alert("Không thể kết nối với Server AI (medassist-ai-core). Vui lòng kiểm tra server Python đã bật chưa ở port 8000.");
          throw error; 
      }
  }

  throw new Error("Không có file ảnh được chọn.");
};