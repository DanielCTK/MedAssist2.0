import { AnalysisResult, DRGrade } from '../types';

// =================================================================================
// INSTRUCTION FOR USER:
// This service simulates the connection to your local Python backend.
// To use your real model:
// 1. Ensure your Python API (Flask/FastAPI) is running (e.g., port 5000).
// 2. Set USE_MOCK_MODE = false.
// 3. Update API_ENDPOINT to your actual URL.
// =================================================================================

const USE_MOCK_MODE = true; 
const API_ENDPOINT = 'http://localhost:5000/api/predict';

export const analyzeImageWithLocalModel = async (file: File): Promise<AnalysisResult> => {
  
  if (USE_MOCK_MODE) {
    return mockLocalInference(file);
  }

  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Local model API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Assuming your Python API returns JSON like: { grade: 2, confidence: 0.89 }
    return {
      grade: data.grade as DRGrade,
      confidence: data.confidence,
      heatmapUrl: data.heatmap_url, // If your API returns a base64 or URL for a heatmap
      processingTime: data.processing_time || 0.5,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error("Failed to connect to local model:", error);
    throw error;
  }
};

// ------------------------------------------------------------------
// Mock Simulation (Delete or ignore this when connecting real model)
// ------------------------------------------------------------------
const mockLocalInference = async (file: File): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate random realistic results
      const randomGrade = Math.floor(Math.random() * 5);
      const randomConf = 0.75 + (Math.random() * 0.24); // 0.75 - 0.99
      
      resolve({
        grade: randomGrade as DRGrade,
        confidence: randomConf,
        processingTime: 1.2,
        timestamp: new Date().toISOString()
      });
    }, 2000); // 2 second simulated delay
  });
};