import { AnalysisResult, DRGrade } from '../types';

// =================================================================================
// 🧠 AI ENGINE PLACEHOLDER
// This service acts as the interface for your future Keras model.
// Currently, it simulates the classification process (0-4 grading) and
// provides specific doctor's advice based on the severity.
// =================================================================================

const DOCTOR_ADVICE = {
    0: "Bệnh nhân không có dấu hiệu bệnh võng mạc tiểu đường. Khuyên bệnh nhân duy trì lối sống lành mạnh và kiểm tra định kỳ hàng năm.",
    1: "Phát hiện NPDR nhẹ (Microaneurysms). Bệnh nhân cần kiểm soát chặt chẽ đường huyết và huyết áp. Tái khám sau 6-9 tháng.",
    2: "Phát hiện NPDR trung bình. Có xuất huyết võng mạc. Cần theo dõi sát sao, kiểm soát các yếu tố nguy cơ. Tái khám sau 3-6 tháng.",
    3: "Phát hiện NPDR nặng. Nguy cơ cao tiến triển sang tăng sinh. Cần hội chẩn chuyên sâu, xem xét chụp mạch huỳnh quang. Tái khám sau 2-3 tháng.",
    4: "Phát hiện PDR (Tăng sinh). Tình trạng nguy cấp. Có tân mạch và nguy cơ xuất huyết dịch kính. Cần can thiệp laser hoặc phẫu thuật ngay lập tức."
};

export interface EnhancedAnalysisResult extends AnalysisResult {
    advice: string;
}

export const analyzeImageWithLocalModel = async (file: File): Promise<EnhancedAnalysisResult> => {
  console.log("Processing image...", file.name);

  // ----------------------------------------------------------------------
  // TODO: FUTURE KERAS INTEGRATION
  // 1. Convert 'file' to Tensor/ArrayBuffer
  // 2. Send to Keras Model (tfjs or python backend)
  // 3. Receive prediction [p0, p1, p2, p3, p4]
  // 4. Return argmax(prediction)
  // ----------------------------------------------------------------------

  // --- SIMULATION LOGIC ---
  return new Promise((resolve) => {
    setTimeout(() => {
      // Logic giả lập: Tạo kết quả ngẫu nhiên nhưng có trọng số (để demo đẹp hơn)
      // Trong thực tế, đây sẽ là kết quả từ model.predict()
      const rand = Math.random();
      let simulatedGrade: DRGrade;

      if (rand > 0.9) simulatedGrade = DRGrade.Proliferative; // 10%
      else if (rand > 0.75) simulatedGrade = DRGrade.Severe; // 15%
      else if (rand > 0.55) simulatedGrade = DRGrade.Moderate; // 20%
      else if (rand > 0.3) simulatedGrade = DRGrade.Mild; // 25%
      else simulatedGrade = DRGrade.NoDR; // 30%

      // Tính toán độ tin cậy giả lập (thường model trả về softmax probability)
      const simulatedConfidence = 0.85 + (Math.random() * 0.14); // 85% - 99%

      resolve({
        grade: simulatedGrade,
        confidence: simulatedConfidence,
        processingTime: 1.5, // seconds
        timestamp: new Date().toISOString(),
        advice: DOCTOR_ADVICE[simulatedGrade]
      });
    }, 2500); // Giả lập thời gian xử lý của model AI (2.5s)
  });
};
