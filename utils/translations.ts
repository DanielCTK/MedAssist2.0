export const translations = {
  en: {
    sidebar: {
      dashboard: "Dashboard",
      patients: "Patients",
      diagnosis: "Diagnostics",
      pharmacy: "Pharmacy",
      insights: "Insights",
      settings: "Settings",
      logout: "Logout"
    },
    patientDashboard: {
        welcome: "Hello,",
        health_score: "Retina Health Score",
        latest_diagnosis: "Latest Result",
        appointments: "My Appointments",
        prescriptions: "Prescriptions",
        contact_doctor: "Chat with Doctor",
        no_appointments: "No upcoming appointments",
        history: "Health Journey",
        book_new: "Request Appointment",
        tabs: {
            home: "Home",
            records: "My Health",
            schedule: "Schedule",
            chat: "Doctor Chat",
            profile: "Profile"
        },
        status: {
            excellent: "Excellent",
            good: "Good",
            warning: "Attention Needed",
            critical: "Critical Action"
        }
    },
    dashboard: {
      greeting: "Good Morning",
      appointments_left: "You have {{count}} appointments remaining.",
      tabs: {
        personal: "Personal Workspace",
        department: "Activity Schedule"
      },
      profile: {
        patients: "Patients",
        completion: "Completion"
      },
      agenda: {
        title: "Today's Agenda"
      },
      quick_actions: {
        title: "Quick Actions",
        chat_patient: "Chat Patient",
        chat_doctor: "Chat Doctor",
        mini_report: "Mini Report",
        emergency: "Emergency"
      },
      stats: {
        title: "Patient Activity",
        total_scans: "Total Scans",
        consultations: "Consultations",
        efficiency: "Efficiency"
      },
      schedule: {
        title: "Daily Schedule",
        timeline: "Timeline",
        calendar: "Calendar",
        no_appointments: "No appointments today",
        add_one: "Add one",
        no_tasks: "No tasks for this day",
        modal: {
          add: "Add Schedule",
          edit: "Edit Schedule",
          patient_name: "Patient Name",
          activity: "Title/Activity",
          start_time: "Start Time (24h)",
          duration: "Duration (Hrs)",
          type: "Type",
          status: "Status",
          save: "Save",
          update: "Update",
          delete_confirm: "Are you sure you want to delete this appointment?",
          failed_save: "Failed to save appointment",
          failed_delete: "Failed to delete"
        },
        types: {
          Diagnosis: "Diagnosis",
          Consult: "Consult",
          Surgery: "Surgery",
          Meeting: "Meeting"
        },
        statuses: {
          Pending: "Pending",
          "In Progress": "In Progress",
          Done: "Done"
        }
      }
    },
    diagnosis: {
      title: "Diagnosis",
      subject: "Subject",
      select_placeholder: "-- SELECT --",
      scan_source: "Scan Source",
      upload_text: "Upload",
      analyze_btn: "Analyze",
      running: "Running...",
      awaiting_input: "Awaiting Input Data",
      diagnosis_result: "Diagnosis",
      gemini_analysis: "Gemini Analysis",
      generating: "Generating...",
      simulation_mode: "Simulation Scenarios",
      grade_labels: {
        0: "NO DR",
        1: "MILD NPDR",
        2: "MODERATE NPDR",
        3: "SEVERE NPDR",
        4: "PROLIFERATIVE DR"
      },
      advice: {
        0: "Patient shows no signs of Diabetic Retinopathy. Advise maintaining a healthy lifestyle and annual check-ups.",
        1: "Mild NPDR (Microaneurysms) detected. Strict control of blood sugar and blood pressure is required. Re-examine in 6-9 months.",
        2: "Moderate NPDR detected with retinal hemorrhages. Close monitoring of risk factors needed. Re-examine in 3-6 months.",
        3: "Severe NPDR detected. High risk of progression to proliferative stage. Urgent specialist consultation and potential fluorescein angiography needed. Re-examine in 2-3 months.",
        4: "Proliferative DR (PDR) detected. Critical condition with neovascularization. Immediate laser photocoagulation or surgery required to prevent vision loss."
      }
    },
    patients: {
      title: "All patients view",
      search: "Search...",
      new_patient: "New patient",
      table: {
        id: "Patient ID",
        name: "Patient Name",
        procedure: "Procedure",
        status: "Status",
        date: "Date",
        physician: "Physician",
        action: "Action"
      }
    },
    inventory: {
      title: "Inventory",
      search: "Search...",
      add: "Add",
      filters: {
        all: "All",
        meds: "Meds",
        device: "Device",
        ppe: "PPE"
      }
    },
    auth: {
      login_title: "Sign In",
      create_title: "Create Account",
      login_desc: "Access your dashboard.",
      create_desc: "Join MedAssist today.",
      role_doctor: "I am a Doctor",
      role_patient: "I am a Patient",
      google_btn: "Continue with Google",
      or_email: "Or continue with email",
      full_name: "Full Name",
      email: "Email Address",
      password: "Password",
      sign_in_btn: "Sign In",
      create_btn: "Create Account",
      processing: "Processing...",
      no_account: "Don't have an account?",
      has_account: "Already have an account?",
      register_now: "Register Now",
      forgot_pass: "Forgot your password?",
      welcome_back: "Welcome back.",
      join_revolution: "Join the diagnostic revolution.",
      hero_desc: "Access MedAssist's advanced AI models for instant screening and reporting.",
      errors: {
        invalid_credential: "Invalid email or password.",
        user_not_found: "No user found with this email.",
        wrong_password: "The password is incorrect.",
        email_in_use: "This email is already registered.",
        weak_password: "Password must be at least 6 characters.",
        invalid_email: "Please enter a valid email address.",
        general: "Authentication failed. Please try again.",
        google_failed: "Google Sign-In was unsuccessful."
      }
    }
  },
  vi: {
    sidebar: {
      dashboard: "Bảng điều khiển",
      patients: "Bệnh nhân",
      diagnosis: "Chẩn đoán",
      pharmacy: "Kho thuốc",
      insights: "Thông tin chi tiết",
      settings: "Cài đặt",
      logout: "Đăng xuất"
    },
    patientDashboard: {
        welcome: "Xin chào,",
        health_score: "Điểm Sức Khỏe Võng Mạc",
        latest_diagnosis: "Kết Quả Mới Nhất",
        appointments: "Lịch Hẹn Của Tôi",
        prescriptions: "Đơn Thuốc",
        contact_doctor: "Chat với Bác Sĩ",
        no_appointments: "Không có lịch hẹn sắp tới",
        history: "Hành Trình Sức Khỏe",
        book_new: "Đặt Lịch Khám",
        tabs: {
            home: "Tổng Quan",
            records: "Hồ Sơ Y Tế",
            schedule: "Lịch Trình",
            chat: "Tư Vấn",
            profile: "Cá Nhân"
        },
        status: {
            excellent: "Tuyệt Vời",
            good: "Tốt",
            warning: "Cần Chú Ý",
            critical: "Khẩn Cấp"
        }
    },
    dashboard: {
      greeting: "Chào buổi sáng",
      appointments_left: "Bạn còn {{count}} cuộc hẹn.",
      tabs: {
        personal: "Không gian làm việc",
        department: "Lịch hoạt động"
      },
      profile: {
        patients: "Bệnh nhân",
        completion: "Hoàn thành"
      },
      agenda: {
        title: "Lịch trình hôm nay"
      },
      quick_actions: {
        title: "Tác vụ nhanh",
        chat_patient: "Chat Khách Hàng",
        chat_doctor: "Chat Bác Sĩ",
        mini_report: "Báo Cáo Nhanh",
        emergency: "Khẩn Cấp"
      },
      stats: {
        title: "Hoạt động bệnh nhân",
        total_scans: "Tổng ca quét",
        consultations: "Ca tư vấn",
        efficiency: "Hiệu quả"
      },
      schedule: {
        title: "Lịch trình hằng ngày",
        timeline: "Dòng thời gian",
        calendar: "Lịch",
        no_appointments: "Không có cuộc hẹn nào",
        add_one: "Thêm mới",
        no_tasks: "Không có nhiệm vụ cho ngày này",
        modal: {
          add: "Thêm lịch trình",
          edit: "Sửa lịch trình",
          patient_name: "Tên bệnh nhân",
          activity: "Tiêu đề/Hoạt động",
          start_time: "Bắt đầu (24h)",
          duration: "Thời lượng (Giờ)",
          type: "Loại",
          status: "Trạng thái",
          save: "Lưu",
          update: "Cập nhật",
          delete_confirm: "Bạn có chắc chắn muốn xóa cuộc hẹn này không?",
          failed_save: "Lưu thất bại",
          failed_delete: "Xóa thất bại"
        },
        types: {
          Diagnosis: "Chẩn đoán",
          Consult: "Tư vấn",
          Surgery: "Phẫu thuật",
          Meeting: "Họp"
        },
        statuses: {
          Pending: "Chờ xử lý",
          "In Progress": "Đang thực hiện",
          Done: "Hoàn thành"
        }
      }
    },
    diagnosis: {
      title: "Chẩn đoán",
      subject: "Đối tượng",
      select_placeholder: "-- CHỌN --",
      scan_source: "Nguồn ảnh quét",
      upload_text: "Tải lên",
      analyze_btn: "Phân tích",
      running: "Đang chạy...",
      awaiting_input: "Đang chờ dữ liệu",
      diagnosis_result: "Kết quả chẩn đoán",
      gemini_analysis: "Phân tích Gemini",
      generating: "Đang tạo...",
      simulation_mode: "Kịch Bản Mô Phỏng",
      grade_labels: {
        0: "KHÔNG BỊ DR",
        1: "NPDR NHẸ",
        2: "NPDR TRUNG BÌNH",
        3: "NPDR NẶNG",
        4: "DR TĂNG SINH"
      },
      advice: {
        0: "Bệnh nhân không có dấu hiệu bệnh võng mạc tiểu đường. Khuyên bệnh nhân duy trì lối sống lành mạnh và kiểm tra định kỳ hàng năm.",
        1: "Phát hiện NPDR nhẹ (Microaneurysms). Bệnh nhân cần kiểm soát chặt chẽ đường huyết và huyết áp. Tái khám sau 6-9 tháng.",
        2: "Phát hiện NPDR trung bình. Có xuất huyết võng mạc. Cần theo dõi sát sao, kiểm soát các yếu tố nguy cơ. Tái khám sau 3-6 tháng.",
        3: "Phát hiện NPDR nặng. Nguy cơ cao tiến triển sang tăng sinh. Cần hội chẩn chuyên sâu, xem xét chụp mạch huỳnh quang. Tái khám sau 2-3 tháng.",
        4: "Phát hiện PDR (Tăng sinh). Tình trạng nguy cấp. Có tân mạch và nguy cơ xuất huyết dịch kính. Cần can thiệp laser hoặc phẫu thuật ngay lập tức."
      }
    },
    patients: {
      title: "Danh sách bệnh nhân",
      search: "Tìm kiếm...",
      new_patient: "Thêm bệnh nhân",
      table: {
        id: "Mã BN",
        name: "Tên bệnh nhân",
        procedure: "Thủ tục",
        status: "Trạng thái",
        date: "Ngày",
        physician: "Bác sĩ",
        action: "Hành động"
      }
    },
    inventory: {
      title: "Kho thuốc",
      search: "Tìm kiếm...",
      add: "Thêm",
      filters: {
        all: "Tất cả",
        meds: "Thuốc",
        device: "Thiết bị",
        ppe: "Bảo hộ"
      }
    },
    auth: {
      login_title: "Đăng nhập",
      create_title: "Tạo tài khoản",
      login_desc: "Truy cập vào bảng điều khiển.",
      create_desc: "Tham gia MedAssist ngay hôm nay.",
      role_doctor: "Tôi là Bác Sĩ",
      role_patient: "Tôi là Bệnh Nhân",
      google_btn: "Tiếp tục với Google",
      or_email: "Hoặc tiếp tục với email",
      full_name: "Họ và tên",
      email: "Địa chỉ Email",
      password: "Mật khẩu",
      sign_in_btn: "Đăng nhập",
      create_btn: "Tạo tài khoản",
      processing: "Đang xử lý...",
      no_account: "Chưa có tài khoản?",
      has_account: "Đã có tài khoản?",
      register_now: "Đăng ký ngay",
      forgot_pass: "Quên mật khẩu?",
      welcome_back: "Chào mừng trở lại.",
      join_revolution: "Tham gia cuộc cách mạng chẩn đoán.",
      hero_desc: "Truy cập các mô hình AI tiên tiến của MedAssist để sàng lọc và báo cáo tức thì.",
      errors: {
        invalid_credential: "Email hoặc mật khẩu không đúng.",
        user_not_found: "Không tìm thấy người dùng với email này.",
        wrong_password: "Mật khẩu không chính xác.",
        email_in_use: "Email này đã được đăng ký.",
        weak_password: "Mật khẩu phải có ít nhất 6 ký tự.",
        invalid_email: "Vui lòng nhập địa chỉ email hợp lệ.",
        general: "Xác thực thất bại. Vui lòng thử lại.",
        google_failed: "Đăng nhập Google không thành công."
      }
    }
  }
};