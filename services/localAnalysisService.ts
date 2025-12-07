import { AnalysisResult, DRGrade } from '../types';

// =================================================================================
// 0. ĐỊNH NGHĨA KIỂU DỮ LIỆU TỪ PYTHON BACKEND
// Giúp TypeScript hiểu rõ backend trả về cái gì
// =================================================================================
interface PythonAPIResponse {
    diagnosis_code: number;   // 0, 1, 2, 3, 4
    diagnosis_label: string;  // "No DR", "Mild", ...
    confidence: number;       // 0.95
    raw_predictions?: number[];
    heatmap?: string;         // Base64 string (nếu có)
}

// =================================================================================
// 1. CẤU HÌNH KẾT NỐI
// Lấy URL từ biến môi trường.
// =================================================================================
const API_URL = import.meta.env.VITE_LOCAL_CORE_API_URL;

/**
 * Hàm gọi API AI Model chạy cục bộ (Python/FastAPI)
 * @param file File ảnh người dùng upload
 * @param gradeOverride (Chỉ dùng cho dev) Bắt buộc trả về kết quả giả lập
 */
export const analyzeImageWithLocalModel = async (file: File | null, gradeOverride?: DRGrade): Promise<AnalysisResult> => {
    console.log("🚀 Bắt đầu quy trình phân tích ảnh...", file?.name);

    // --- 1. CHẾ ĐỘ TEST (DEV ONLY) ---
    if (gradeOverride !== undefined) {
        console.warn("⚠️ Đang chạy chế độ Override (Mock Data)");
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    grade: gradeOverride,
                    confidence: 0.99,
                    processingTime: 0.5,
                    timestamp: new Date().toISOString()
                });
            }, 800);
        });
    }

    // --- 2. CHẾ ĐỘ THỰC (GỌI API) ---
    if (!file) {
        throw new Error("Không tìm thấy file ảnh để phân tích.");
    }

    // Kiểm tra biến môi trường
    if (!API_URL) {
        const msg = "LỖI CẤU HÌNH: Biến môi trường 'VITE_LOCAL_CORE_API_URL' chưa được cài đặt trong file .env";
        alert(msg);
        throw new Error(msg);
    }

    try {
        // Chuẩn bị dữ liệu gửi đi
        const formData = new FormData();
        formData.append("file", file); // Tên key "file" phải khớp với @app.post bên Python

        const startTime = performance.now();

        console.log(`📡 Đang gửi request tới: ${API_URL}`);

        // Gửi Request
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
            // Lưu ý: Không set Content-Type header thủ công khi dùng FormData,
            // trình duyệt sẽ tự động thêm boundary.
        });

        // Xử lý lỗi HTTP (404, 500, v.v.)
        if (!response.ok) {
            let errorDetail = response.statusText;
            try {
                const errorJson = await response.json();
                errorDetail = errorJson.detail || errorJson.message || errorDetail;
            } catch (e) { /* Bỏ qua nếu không parse được JSON lỗi */ }
            
            throw new Error(`Server Error (${response.status}): ${errorDetail}`);
        }

        // --- 3. XỬ LÝ KẾT QUẢ TỪ PYTHON ---
        // Ép kiểu dữ liệu về Interface đã định nghĩa ở trên
        const data = (await response.json()) as PythonAPIResponse;
        const endTime = performance.now();

        console.log("✅ Kết quả nhận được từ AI Core:", data);

        // Map dữ liệu từ Python về chuẩn của Frontend (AnalysisResult)
        const result: AnalysisResult = {
            // Python trả về 'diagnosis_code' (int), ép kiểu sang DRGrade
            grade: data.diagnosis_code as DRGrade,
            
            // Lấy độ tin cậy
            confidence: data.confidence,
            
            // Nếu Python có trả về heatmap (để sau này nâng cấp)
            heatmapUrl: data.heatmap, 
            
            // Tính thời gian xử lý (giây)
            processingTime: (endTime - startTime) / 1000,
            
            // Thời gian hiện tại
            timestamp: new Date().toISOString()
        };

        return result;

    } catch (error: any) {
        console.error("❌ Lỗi phân tích ảnh:", error);
        
        // Tạo thông báo lỗi thân thiện cho người dùng
        let userMessage = "Không thể kết nối với hệ thống AI.";
        
        if (error.message.includes("Failed to fetch")) {
            userMessage = "Lỗi kết nối: Không thể gọi tới Server Python.\n\n" +
                          "Vui lòng kiểm tra:\n" +
                          "1. Server Python (backend) đã bật chưa?\n" +
                          "2. Địa chỉ trong .env có đúng là http://localhost:8000/predict/dr không?";
        } else {
            userMessage = `Lỗi hệ thống: ${error.message}`;
        }

        alert(userMessage);
        throw error;
    }
};