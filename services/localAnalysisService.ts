import { AnalysisResult, DRGrade } from '../types';

// =================================================================================
// 🧠 AI ENGINE PLACEHOLDER
// This service acts as the interface for your future Keras model.
// =================================================================================

export interface EnhancedAnalysisResult extends AnalysisResult {
    // Advice is now handled via translations based on grade
}

export const analyzeImageWithLocalModel = async (file: File | null, gradeOverride?: DRGrade): Promise<EnhancedAnalysisResult> => {
  console.log("Processing image...", file?.name || "Simulation Mode");

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
      let simulatedGrade: DRGrade;

      if (gradeOverride !== undefined) {
          simulatedGrade = gradeOverride;
      } else {
          // Default random logic if no override
          const rand = Math.random();
          if (rand > 0.9) simulatedGrade = DRGrade.Proliferative; // 10%
          else if (rand > 0.75) simulatedGrade = DRGrade.Severe; // 15%
          else if (rand > 0.55) simulatedGrade = DRGrade.Moderate; // 20%
          else if (rand > 0.3) simulatedGrade = DRGrade.Mild; // 25%
          else simulatedGrade = DRGrade.NoDR; // 30%
      }

      // Calculate simulated confidence
      // If manually selected (simulation), confidence is very high
      const simulatedConfidence = gradeOverride !== undefined 
        ? 0.98 
        : 0.85 + (Math.random() * 0.14); 

      resolve({
        grade: simulatedGrade,
        confidence: simulatedConfidence,
        processingTime: 1.5, // seconds
        timestamp: new Date().toISOString()
      });
    }, 1500); // Simulate processing time
  });
};