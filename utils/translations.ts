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
    dashboard: {
      greeting: "Good Morning",
      appointments_left: "You have {{count}} appointments remaining.",
      tabs: {
        personal: "Personal Workspace",
        department: "Activity Schedule"
      },
      profile: {
        patients: "Patients",
        surgery: "Surgery"
      },
      agenda: {
        title: "Today's Agenda"
      },
      quick_actions: {
        title: "Quick Actions",
        diagnosis: "Diagnosis",
        report: "Report",
        telehealth: "Tele-Health",
        consult: "Consult"
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
      grade_labels: {
        0: "NO DR",
        1: "MILD NPDR",
        2: "MODERATE NPDR",
        3: "SEVERE NPDR",
        4: "PROLIFERATIVE DR"
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
      login_title: "Sign In to Account",
      create_title: "Create New Account",
      login_desc: "Enter your credentials to access your workspace.",
      create_desc: "Register your medical license ID to get started.",
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
      welcome_back: "Welcome back to the future.",
      join_revolution: "Join the diagnostic revolution.",
      hero_desc: "Access MedAssist's advanced Gemini 2.5 AI models for instant retinal screening and comprehensive reporting.",
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
    dashboard: {
      greeting: "Chào buổi sáng",
      appointments_left: "Bạn còn {{count}} cuộc hẹn.",
      tabs: {
        personal: "Không gian làm việc",
        department: "Lịch hoạt động"
      },
      profile: {
        patients: "Bệnh nhân",
        surgery: "Phẫu thuật"
      },
      agenda: {
        title: "Lịch trình hôm nay"
      },
      quick_actions: {
        title: "Tác vụ nhanh",
        diagnosis: "Chẩn đoán",
        report: "Báo cáo",
        telehealth: "Khám từ xa",
        consult: "Tư vấn"
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
      grade_labels: {
        0: "KHÔNG BỊ DR",
        1: "NPDR NHẸ",
        2: "NPDR TRUNG BÌNH",
        3: "NPDR NẶNG",
        4: "DR TĂNG SINH"
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
      create_title: "Tạo tài khoản mới",
      login_desc: "Nhập thông tin xác thực để truy cập không gian làm việc.",
      create_desc: "Đăng ký mã giấy phép y tế của bạn để bắt đầu.",
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
      welcome_back: "Chào mừng trở lại tương lai.",
      join_revolution: "Tham gia cuộc cách mạng chẩn đoán.",
      hero_desc: "Truy cập các mô hình AI Gemini 2.5 tiên tiến của MedAssist để sàng lọc võng mạc tức thì và báo cáo toàn diện.",
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