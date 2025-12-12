
import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, Menu, Moon, Sun, Lock, Brain, Dna, FileScan, ArrowRight, CheckCircle, Zap, X, ChevronRight, FileText, ChevronLeft, LayoutTemplate, Quote, Play, Globe, MapPin, Phone, Mail, Facebook, Twitter, Linkedin, Instagram, ScanEye, Home, Loader2, Send } from 'lucide-react';
import AuthModal from './AuthModal';
import { useLanguage } from '../contexts/LanguageContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

// ==================================================================================
// 🖼️ ASSETS & MEDIA CONFIGURATION
// ==================================================================================
const landingBg = "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop";
const heroMainGif = "https://cdn.coverr.co/videos/coverr-medical-research-laboratory-5432/1080p.mp4"; 
const SAYAGATA_PATTERN = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;
const galleryImage1 = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop";
const galleryImage2 = "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2080&auto=format&fit=crop";
const galleryImage3 = "https://images.unsplash.com/photo-1530497610245-94d3c16cda48?q=80&w=1770&auto=format&fit=crop";
const articleImage1 = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop";
const articleImage2 = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop";
const articleImage3 = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop";

interface LandingPageProps {
  onEnter: () => void;
}

// --- DICTIONARY FOR TRANSLATIONS ---
const CONTENT = {
    en: {
        nav: {
            home: "Home",
            about: "About Us",
            contact: "Contact",
            login: "Login",
            system: "System v2.5 Active"
        },
        intro: {
            title: "MedAssist",
            tagline: "AI Diagnosis",
            btn_action: "Login / Register"
        },
        hero: {
            title_1: "Diagnosis",
            title_2: "Redefined.",
            desc: "MedAssist utilizes advanced Gemini 2.5 models to provide instant, medical-grade analysis for retinal screenings.",
            btn_start: "Get Started",
            btn_learn: "Learn More",
            initiate: "Enter System",
            ready: "Diagnostic Ready",
            sensitivity: "Sensitivity"
        },
        tape: {
            text_1: "AI DIAGNOSTICS",
            text_2: "GEMINI 2.5 INTEGRATION"
        },
        about: {
            number: "01",
            title_1: "Who We",
            title_2: "Are",
            quote: "MedAssist is a pioneer in AI-driven ophthalmology. Founded by a team of retina specialists and deep learning engineers, our mission is to eliminate preventable blindness through accessible technology.",
            author: "Nguyen Thanh Danh, SIU Student",
            desc: "We bridge the gap between biological vision and artificial intelligence, ensuring that every scan is analyzed with pixel-perfect precision."
        },
        articles: {
            number: "02",
            title_1: "Clinical",
            title_2: "Intelligence",
            subtitle: "Backed by peer-reviewed research and global studies.",
            desc: "Explore the scientific foundation behind our technology. From Deep Learning efficacy to Generative AI integration in modern healthcare.",
            btn_read: "Read Papers",
            btn_view_collection: "View Research",
            btn_close: "Close List"
        },
        tech: {
            number: "03",
            title_1: "Powered by",
            title_2: "Gemini 2.5",
            card_1: "Deep Learning",
            card_1_desc: "Convolutional Neural Networks (CNN) trained on over 50,000 labeled fundus images.",
            card_2: "Instant Analysis",
            card_2_desc: "Local inference engine provides immediate DR grading (0-4) with heatmaps.",
            card_3: "Generative Reports",
            card_3_desc: "Gemini 2.5 generates human-readable clinical notes customized to severity."
        },
        contact: {
            title: "Get in Touch",
            subtitle: "Ready to transform your clinic?",
            address_label: "Headquarters",
            address_val: "Silicon Valley, CA, USA",
            phone_label: "Emergency Line",
            email_label: "Partner Support",
            form_name: "YOUR NAME",
            form_email: "EMAIL ADDRESS",
            form_msg: "MESSAGE",
            btn_send: "Send Message",
            footer_rights: "© 2024 MedAssist AI. All rights reserved.",
            success_msg: "Message Sent Successfully!",
            sending_msg: "Sending..."
        }
    },
    vi: {
        nav: {
            home: "Trang Chủ",
            about: "Về Chúng Tôi",
            contact: "Liên Hệ",
            login: "Đăng Nhập",
            system: "Hệ Thống v2.5 Sẵn Sàng"
        },
        intro: {
            title: "MedAssist",
            tagline: "Chẩn đoán AI",
            btn_action: "Đăng nhập / Đăng ký"
        },
        hero: {
            title_1: "Tái Định Nghĩa",
            title_2: "Chẩn Đoán.",
            desc: "MedAssist sử dụng mô hình Gemini 2.5 tiên tiến để cung cấp phân tích cấp y tế tức thì cho sàng lọc võng mạc.",
            btn_start: "Bắt Đầu",
            btn_learn: "Tìm Hiểu Thêm",
            initiate: "Truy Cập Hệ Thống",
            ready: "Sẵn Sàng Chẩn Đoán",
            sensitivity: "Độ Nhạy"
        },
        tape: {
            text_1: "CHẨN ĐOÁN AI",
            text_2: "TÍCH HỢP GEMINI 2.5"
        },
        about: {
            number: "01",
            title_1: "Về",
            title_2: "Chúng Tôi",
            quote: "MedAssist là người tiên phong trong lĩnh vực nhãn khoa AI. Được thành lập bởi đội ngũ chuyên gia võng mạc và kỹ sư học sâu, sứ mệnh của chúng tôi là loại bỏ mù lòa có thể phòng ngừa.",
            author: "Nguyen Thanh Danh, Sinh vien SIU",
            desc: "Chúng tôi thu hẹp khoảng cách giữa thị giác sinh học và trí tuệ nhân tạo, đảm bảo mọi bản quét đều được phân tích với độ chính xác tuyệt đối."
        },
        articles: {
            number: "02",
            title_1: "Trí Tuệ",
            title_2: "Lâm Sàng",
            subtitle: "Được hỗ trợ bởi các nghiên cứu khoa học và dữ liệu toàn cầu.",
            desc: "Khám phá nền tảng khoa học đằng sau công nghệ của chúng tôi. Từ hiệu quả của Học sâu đến tích hợp AI Tạo sinh trong y tế hiện đại.",
            btn_read: "Đọc Nghiên Cứu",
            btn_view_collection: "Xem Tài Liệu",
            btn_close: "Đóng Danh Sách"
        },
        tech: {
            number: "03",
            title_1: "Sức Mạnh",
            title_2: "Gemini 2.5",
            card_1: "Học Sâu (Deep Learning)",
            card_1_desc: "Mạng nơ-ron tích chập (CNN) được huấn luyện trên hơn 50.000 hình ảnh đáy mắt.",
            card_2: "Phân Tích Tức Thì",
            card_2_desc: "Công cụ suy luận cục bộ cung cấp phân loại DR (0-4) ngay lập tức với bản đồ nhiệt.",
            card_3: "Báo Cáo Tự Sinh",
            card_3_desc: "Gemini 2.5 tạo ra các ghi chú lâm sàng dễ đọc được tùy chỉnh theo mức độ nghiêm trọng."
        },
        contact: {
            title: "Liên Hệ",
            subtitle: "Sẵn sàng chuyển đổi phòng khám của bạn?",
            address_label: "Trụ Sở Chính",
            address_val: "Thung lũng Silicon, CA, USA",
            phone_label: "Đường Dây Nóng",
            email_label: "Hỗ Trợ Đối Tác",
            form_name: "HỌ TÊN",
            form_email: "ĐỊA CHỈ EMAIL",
            form_msg: "NỘI DUNG TIN NHẮN",
            btn_send: "Gửi Tin Nhắn",
            footer_rights: "© 2024 MedAssist AI. Mọi quyền được bảo lưu.",
            success_msg: "Đã gửi tin nhắn thành công!",
            sending_msg: "Đang gửi..."
        }
    }
};

interface RevealProps {
  children?: ReactNode;
  delay?: number;
  width?: "fit-content" | "100%";
  x?: number;
  y?: number;
}

const Reveal: React.FC<RevealProps> = ({ children, delay = 0, width = "100%", x = 0, y = 40 }) => {
    return (
        <div style={{ width, position: 'relative' }}>
            <motion.div
                variants={{
                    hidden: { opacity: 0, y: y, x: x, scale: 0.9 },
                    visible: { opacity: 1, y: 0, x: 0, scale: 1 }
                }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, margin: "-100px" }}
                transition={{ 
                    duration: 0.7, 
                    delay: delay, 
                    ease: [0.215, 0.61, 0.355, 1] 
                }}
            >
                {children}
            </motion.div>
        </div>
    );
};

const sliderImages = [
  { id: 1, url: galleryImage1, caption: "Nature & Vision" },
  { id: 2, url: galleryImage2, caption: "AI Diagnostics" },
  { id: 3, url: galleryImage3, caption: "Next-Gen Care" }
];

// UPDATED: Real scientific articles
const articles = [
  {
    id: 1,
    category: "DEEP LEARNING",
    title: "Deep Learning for DR Screening",
    date: "PUBMED 37729502",
    image: articleImage1,
    summary: "Systematic review and meta-analysis of deep learning models in screening for diabetic retinopathy, highlighting their high sensitivity and specificity.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37729502/"
  },
  {
    id: 2,
    category: "AI REVIEW",
    title: "AI in Modern Ophthalmology",
    date: "PUBMED 38885761",
    image: articleImage2,
    summary: "A comprehensive overview of artificial intelligence applications in diagnosing ocular diseases, from anterior segment to the retina.",
    url: "https://pubmed.ncbi.nlm.nih.gov/38885761/"
  },
  {
    id: 3,
    category: "GENERATIVE AI",
    title: "Generative AI in Healthcare",
    date: "PMC 11488799",
    image: articleImage3,
    summary: "Exploring the transformative potential of Large Language Models (LLMs) and Generative AI in medical reporting and patient interaction.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11488799/?utm_source=chatgpt.com"
  }
];

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Use global language context
  const { language, setLanguage } = useLanguage();
  
  const [isStackExpanded, setIsStackExpanded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint
    handleResize(); 
    window.addEventListener('resize', handleResize);
    
    const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 4000);
    
    return () => {
        clearInterval(timer);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!contactForm.name || !contactForm.email || !contactForm.message) return;

      setSendStatus('sending');

      try {
          // 1. ATTEMPT TO SAVE TO FIREBASE DATABASE
          await addDoc(collection(db, "contact_messages"), {
              name: contactForm.name,
              email: contactForm.email,
              message: contactForm.message,
              createdAt: serverTimestamp(),
              status: 'unread' // Mark as unread for admin
          });

          // 2. SUCCESS FEEDBACK
          setSendStatus('success');
          setContactForm({ name: '', email: '', message: '' });
          
          // Reset status after 3 seconds
          setTimeout(() => setSendStatus('idle'), 3000);

      } catch (error) {
          console.error("Firestore save failed, falling back to mailto", error);
          
          // 3. FALLBACK: IF DATABASE FAILS, USE MAILTO
          const subject = `MedAssist Contact: ${contactForm.name}`;
          const body = `Name: ${contactForm.name}%0D%0AEmail: ${contactForm.email}%0D%0A%0D%0AMessage:%0D%0A${contactForm.message}`;
          const mailtoLink = `mailto:nguyenthanhdanhctk42@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;
          
          window.location.href = mailtoLink;
          
          setSendStatus('success'); // Still show success as the user action was triggered
          setContactForm({ name: '', email: '', message: '' });
          setTimeout(() => setSendStatus('idle'), 3000);
      }
  };

  const t = CONTENT[language]; 

  const theme = isDarkMode ? {
    bg: 'bg-slate-950',
    text: 'text-white',
    subText: 'text-slate-300',
    navBg: 'bg-slate-950/80',
    border: 'border-slate-800',
    accent: 'text-red-500',
    accentBg: 'bg-red-600',
    accentGradient: 'from-red-600 to-rose-600',
    accentBorder: 'border-red-600',
    gridColor: 'rgba(255,255,255,0.05)',
    cardBg: 'bg-slate-900/40',
    logoText: 'MED',
    logoAccent: 'ASSIST'
  } : {
    bg: 'bg-slate-50',
    text: 'text-slate-900',
    subText: 'text-slate-600',
    navBg: 'bg-white/70',
    border: 'border-slate-200',
    accent: 'text-blue-600',
    accentBg: 'bg-blue-600',
    accentGradient: 'from-blue-600 to-indigo-600',
    accentBorder: 'border-blue-600',
    gridColor: 'rgba(0,0,0,0.03)',
    cardBg: 'bg-white/60',
    logoText: 'MED',
    logoAccent: 'ASSIST'
  };

  const cardVariants = {
    // ... (variants same as before)
    collapsed: (index: number) => {
        const offset = index - 1; 
        return {
            rotate: offset * 12,
            x: offset * 40,
            y: Math.abs(offset) * 15,
            scale: index === 1 ? 1.05 : 0.95,
            zIndex: index === 1 ? 20 : 10,
            opacity: 1,
            filter: index === 1 ? 'brightness(1.1) contrast(1.1)' : 'brightness(0.7) blur(1px)',
            transformOrigin: "bottom center",
            transition: { type: "spring" as const, stiffness: 150, damping: 20 }
        };
    },
    expanded: (index: number) => ({
      rotate: 0,
      x: 0,
      y: 0,
      scale: 1,
      zIndex: 1,
      opacity: 1,
      filter: 'brightness(1) blur(0px)',
      transition: {
        delay: index * 0.1,
        type: "spring" as const,
        stiffness: 120,
        damping: 20
      }
    }),
    hover: (index: number) => {
         const offset = index - 1; 
         return {
            rotate: offset * 18,
            x: offset * 90,
            y: -20,
            scale: 1.1,
            zIndex: 30,
            filter: 'brightness(1.1)',
            transition: { duration: 0.3 }
        }
    }
  };

  return (
    <div className={`relative w-full ${theme.bg} font-sans ${theme.text} transition-colors duration-700 overflow-x-hidden selection:${theme.accentBg} selection:text-white`}>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onLogin={onEnter} 
        themeAccent={theme.accentBg}
      />

      {/* --- BACKGROUND LAYERS (Same as before) --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
            style={{ 
                backgroundImage: `url(${landingBg})`,
                filter: isDarkMode ? 'brightness(0.3) saturate(0) contrast(1.2)' : 'brightness(1.1) saturate(1.0) contrast(0.9)',
                opacity: 1 
            }} 
         />
         
         <div 
            className="absolute inset-0 z-0 opacity-10"
            style={{ backgroundImage: `url("${SAYAGATA_PATTERN}")` }}
         />

         <div 
            className={`absolute inset-0 bg-gradient-to-r transition-colors duration-1000 ${
                isDarkMode 
                ? 'from-slate-950 via-slate-950/90 to-slate-900/60' 
                : 'from-slate-50 via-slate-50/95 to-white/60'
            }`} 
         />
         <div 
            className="absolute inset-0 transition-colors duration-500"
            style={{ 
                backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                opacity: 0.5
            }} 
         />
      </div>

      {/* --- NAVBAR --- */}
      <nav className={`fixed top-0 left-0 w-full px-8 py-5 flex justify-between items-center z-50 transition-all duration-500 ${isHeroExpanded ? theme.navBg : 'bg-transparent'} ${isHeroExpanded ? 'backdrop-blur-xl' : ''}`}>
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className={`w-9 h-9 bg-gradient-to-br ${theme.accentGradient} flex items-center justify-center text-white font-black italic rounded shadow-lg group-hover:scale-110 transition-transform`}>
                M
            </div>
            <h1 className={`text-xl font-black tracking-tighter uppercase italic ${theme.text} ${!isHeroExpanded && !isDarkMode ? 'text-white' : ''} drop-shadow-md`}>
                {theme.logoText}<span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.accentGradient}`}>{theme.logoAccent}</span>
            </h1>
        </div>

        <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={`text-xs font-bold uppercase tracking-[0.2em] ${!isHeroExpanded && !isDarkMode ? 'text-white/80 hover:text-white' : `${theme.subText} hover:${theme.accent}`} transition-colors relative group flex items-center`}>
                <Home size={14} className="mr-2" />
                {t.nav.home}
                <span className={`absolute -bottom-2 left-0 w-0 h-[2px] ${theme.accentBg} transition-all duration-300 group-hover:w-full`} />
            </button>
            <button onClick={() => scrollToSection('about-section')} className={`text-xs font-bold uppercase tracking-[0.2em] ${!isHeroExpanded && !isDarkMode ? 'text-white/80 hover:text-white' : `${theme.subText} hover:${theme.accent}`} transition-colors relative group`}>
                {t.nav.about}
                <span className={`absolute -bottom-2 left-0 w-0 h-[2px] ${theme.accentBg} transition-all duration-300 group-hover:w-full`} />
            </button>
            <button onClick={() => scrollToSection('contact-section')} className={`text-xs font-bold uppercase tracking-[0.2em] ${!isHeroExpanded && !isDarkMode ? 'text-white/80 hover:text-white' : `${theme.subText} hover:${theme.accent}`} transition-colors relative group`}>
                {t.nav.contact}
                <span className={`absolute -bottom-2 left-0 w-0 h-[2px] ${theme.accentBg} transition-all duration-300 group-hover:w-full`} />
            </button>
        </div>

        <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <button 
                onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                className={`p-2.5 rounded-full border ${!isHeroExpanded && !isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : `${theme.border} ${theme.subText} hover:${theme.text}`} hover:scale-105 transition-all duration-300 backdrop-blur-sm flex items-center justify-center`}
                title="Switch Language"
            >
               <span className="text-[10px] font-black uppercase w-4">{language.toUpperCase()}</span>
            </button>

            {/* Theme Toggle */}
            <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2.5 rounded-full border ${!isHeroExpanded && !isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : `${theme.border} ${theme.subText} hover:${theme.text}`} hover:scale-105 transition-all duration-300 backdrop-blur-sm`}
            >
                <AnimatePresence mode="wait">
                    {isDarkMode ? (
                        <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                            <Moon size={16} />
                        </motion.div>
                    ) : (
                        <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                            <Sun size={16} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>

            <button 
                onClick={() => setShowAuthModal(true)}
                className={`hidden md:flex items-center px-6 py-2.5 bg-gradient-to-r ${theme.accentGradient} text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 hover:shadow-lg transition-all rounded-sm group`}
            >
                <span className="mr-2">{t.nav.login}</span>
                <Lock size={12} className="group-hover:translate-x-1 transition-transform"/>
            </button>
            <button className={`md:hidden p-2 ${theme.text}`}>
                <Menu size={24} />
            </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full flex items-center overflow-hidden z-10">
         <div className={`absolute inset-0 flex items-center ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
            <div className="w-full lg:w-[45%] pl-8 md:pl-24 pr-8 relative z-10 pt-20">
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ 
                        opacity: isHeroExpanded ? 1 : 0, 
                        x: isHeroExpanded ? 0 : -50,
                        pointerEvents: isHeroExpanded ? 'auto' : 'none'
                    }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <Reveal delay={0.1}>
                        <div className="mb-6 flex items-center space-x-3">
                            <span className={`px-3 py-1 border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'} rounded text-[10px] uppercase font-bold tracking-widest ${theme.subText} flex items-center`}>
                                <Zap size={10} className={`mr-1 ${theme.accent}`} /> {t.nav.system}
                            </span>
                        </div>
                    </Reveal>
                    
                    <Reveal delay={0.2}>
                        <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter mb-6 drop-shadow-sm">
                        {t.hero.title_1} <br/>
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.accentGradient}`}>
                            {t.hero.title_2}
                        </span>
                        </h1>
                    </Reveal>

                    <Reveal delay={0.3}>
                        <p className={`text-lg md:text-xl ${theme.subText} mb-10 leading-relaxed font-medium`}>
                        {t.hero.desc}
                        </p>
                    </Reveal>

                    <Reveal delay={0.4}>
                        <div className="flex space-x-4">
                            <button onClick={() => setShowAuthModal(true)} className={`px-8 py-4 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'} font-bold uppercase tracking-wider text-xs hover:scale-105 transition-transform shadow-xl flex items-center group`}>
                                {t.hero.btn_start} <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button onClick={() => scrollToSection('about-section')} className={`px-8 py-4 border ${theme.border} ${theme.text} font-bold uppercase tracking-wider text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center`}>
                                {t.hero.btn_learn}
                            </button>
                        </div>
                    </Reveal>
                </motion.div>
            </div>
         </div>

         {/* RIGHT VIDEO OVERLAY */}
         <motion.div 
            className="absolute right-0 top-0 bottom-0 z-30 overflow-hidden cursor-pointer"
            initial={false}
            animate={{ 
                // Responsive width logic: 
                // - Mobile: Expanded = 0% (Show full text), Collapsed = 100% (Show video)
                // - Desktop: Expanded = 55% (Split screen), Collapsed = 100% (Show video)
                width: isHeroExpanded ? (isMobile ? '0%' : '55%') : '100%',
                opacity: isHeroExpanded && isMobile ? 0 : 1 // Hide overlay opacity on mobile expand to prevent interaction
            }}
            transition={{ type: "spring", stiffness: 40, damping: 15 }}
            onClick={() => setIsHeroExpanded(!isHeroExpanded)}
         >
             <div className="relative w-full h-full bg-black">
                <div className="absolute top-0 bottom-0 left-[-1px] w-[100px] h-full z-40 pointer-events-none text-white dark:text-slate-950 transition-colors duration-700">
                    <svg 
                        className={`h-full w-full ${isDarkMode ? 'text-slate-950' : 'text-white'}`}
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                    >
                         <path d="M0 0 V 100 Q 60 50 0 0 Z" fill="currentColor" />
                    </svg>
                </div>
                {heroMainGif.endsWith('.mp4') ? (
                    <video 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-cover opacity-90"
                        src={heroMainGif} 
                    />
                ) : (
                    <img 
                        src={heroMainGif}
                        className="absolute inset-0 w-full h-full object-cover opacity-90"
                        alt="Hero Animation"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                <motion.div 
                    className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
                    animate={{ 
                        opacity: isHeroExpanded ? 0 : 1,
                        x: isHeroExpanded ? 50 : 0
                    }}
                    transition={{ duration: 0.4 }}
                >
                     <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500">
                        <ScanEye className="text-white w-10 h-10 md:w-12 md:h-12" />
                     </div>
                     <h3 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter drop-shadow-lg mb-4">
                        MedAssist <span className="text-red-500">AI</span>
                     </h3>
                     <div className="flex items-center space-x-2 bg-black/50 backdrop-blur px-6 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-colors">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-xs text-white font-bold uppercase tracking-widest">
                            {t.hero.initiate}
                        </p>
                     </div>
                </motion.div>
                <motion.div 
                    className="absolute left-10 top-1/2 -translate-y-1/2 z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHeroExpanded ? 1 : 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 text-white hover:bg-white/20 transition-colors">
                        <ChevronLeft size={24} />
                    </div>
                </motion.div>
             </div>
         </motion.div>
      </section>

      {/* --- SCROLLING TAPE --- */}
      <div className={`w-full ${theme.accentBg} text-white overflow-hidden py-3 border-y border-white/20 relative z-30 shadow-2xl`}>
        <div className="animate-infinite-scroll flex whitespace-nowrap">
            {[...Array(20)].map((_, i) => (
                <div key={i} className="flex items-center mx-8 font-black text-sm uppercase tracking-[0.3em]">
                    <span className="mr-4 opacity-80">{t.tape.text_1}</span>
                    <div className="w-1.5 h-1.5 bg-white rounded-full mr-4 animate-pulse" />
                    <span className="mr-4 opacity-80">{t.tape.text_2}</span>
                    <div className="w-1.5 h-1.5 bg-white rounded-full mr-4 animate-pulse" />
                </div>
            ))}
        </div>
      </div>

      {/* --- SECTION 02: ABOUT US --- */}
      <section id="about-section" className={`min-h-[80vh] relative py-24 px-6 md:px-24 border-b ${theme.border} z-10 overflow-hidden flex items-center`}>
         <div className="max-w-7xl mx-auto w-full relative z-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                <motion.div 
                    initial={{ opacity: 0, x: -50, scale: 0.9 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
                    viewport={{ once: false, margin: "-100px" }}
                    className="relative h-[450px] w-full rounded-2xl overflow-hidden shadow-2xl group border border-slate-700/50"
                >
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentSlide}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0"
                        >
                            <img 
                                src={sliderImages[currentSlide].url} 
                                alt="Slide" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-8 left-8">
                                <h3 className="text-white text-2xl font-bold uppercase tracking-wide">{sliderImages[currentSlide].caption}</h3>
                                <div className="flex space-x-1 mt-2">
                                    {sliderImages.map((_, i) => (
                                        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentSlide ? `w-8 ${theme.accentBg}` : 'w-2 bg-white/30'}`} />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                    <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50 z-20">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50 z-20">
                        <ChevronRight size={20} />
                    </button>
                </motion.div>

                <div className="flex flex-col justify-center space-y-6">
                     <Reveal x={50} delay={0.1}>
                        <span className={`text-6xl font-black ${isDarkMode ? 'text-slate-800' : 'text-slate-200'} block`}>{t.about.number}</span>
                     </Reveal>
                     <Reveal x={50} delay={0.2}>
                        <h2 className={`text-4xl font-black uppercase ${theme.text} leading-tight`}>
                            {t.about.title_1} <br/> <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.accentGradient}`}>{t.about.title_2}</span>
                        </h2>
                     </Reveal>
                     <Reveal x={50} delay={0.3}>
                        <div className="relative pl-6 border-l-4 border-slate-700">
                            <Quote className={`absolute -top-3 -left-3 ${theme.subText} bg-inherit p-1`} size={24} />
                            <p className={`text-lg italic font-serif ${theme.subText} mb-4`}>
                                "{t.about.quote}"
                            </p>
                            <p className={`text-xs font-bold uppercase tracking-widest ${theme.text}`}>— {t.about.author}</p>
                        </div>
                     </Reveal>
                     <Reveal x={50} delay={0.4}>
                        <p className={`text-sm ${theme.subText} leading-relaxed`}>
                            {t.about.desc}
                        </p>
                     </Reveal>
                </div>
            </div>
         </div>
      </section>

      {/* --- SECTION 03: ARTICLES --- */}
      <section className={`min-h-[80vh] relative py-24 px-6 md:px-24 border-b ${theme.border} z-10 overflow-hidden flex items-center ${isDarkMode ? 'bg-black/20' : 'bg-slate-100/50'}`}>
         <div className="max-w-7xl mx-auto w-full relative z-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                 <div className="flex flex-col justify-center space-y-6 order-2 lg:order-1">
                     <Reveal x={-50} delay={0.1}>
                        <span className={`text-6xl font-black ${isDarkMode ? 'text-slate-800' : 'text-slate-200'} block`}>{t.articles.number}</span>
                     </Reveal>
                     <Reveal x={-50} delay={0.2}>
                        <h2 className={`text-4xl font-black uppercase ${theme.text} leading-tight`}>
                            {t.articles.title_1} <br/> <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.accentGradient}`}>{t.articles.title_2}</span>
                        </h2>
                     </Reveal>
                     <Reveal x={-50} delay={0.3}>
                        <div className="relative pl-6 border-l-4 border-slate-700">
                            <p className={`text-lg font-medium ${theme.text} mb-4`}>
                                {t.articles.subtitle}
                            </p>
                        </div>
                     </Reveal>
                     <Reveal x={-50} delay={0.4}>
                        <p className={`text-sm ${theme.subText} leading-relaxed`}>
                            {t.articles.desc}
                        </p>
                     </Reveal>
                     <Reveal x={-50} delay={0.5}>
                        <div className="flex items-center space-x-2 mt-4 cursor-pointer group w-max">
                            <span className={`text-xs font-bold uppercase tracking-widest ${theme.accent}`}>{t.articles.btn_read}</span>
                            <ArrowRight size={14} className={`${theme.accent} group-hover:translate-x-1 transition-transform`} />
                        </div>
                     </Reveal>
                </div>

                <motion.div 
                     layout
                     className="flex justify-center lg:justify-end order-1 lg:order-2"
                     initial={{ opacity: 0, x: 50, scale: 0.9 }}
                     whileInView={{ opacity: 1, x: 0, scale: 1 }}
                     transition={{ duration: 0.7, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
                     viewport={{ once: false }}
                >
                    <div className={`relative transition-all duration-700 ${isStackExpanded ? 'w-full grid grid-cols-1 gap-6' : 'w-[400px] h-[500px] flex items-center justify-center'}`}>
                        {!isStackExpanded && (
                            <div 
                                className="absolute inset-0 z-50 cursor-pointer flex flex-col items-center justify-center group"
                                onClick={() => setIsStackExpanded(true)}
                            >
                                <div className={`w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xl group-hover:scale-110 transition-transform`}>
                                    <Play size={24} fill="currentColor" className="ml-1" />
                                </div>
                                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                                    <span className={`text-xs font-bold uppercase tracking-[0.3em] text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-md`}>{t.articles.btn_view_collection}</span>
                                </div>
                            </div>
                        )}
                        <div className={`${isStackExpanded ? 'contents' : 'relative w-full h-full flex items-center justify-center'}`}>
                            {articles.map((article, index) => (
                                <motion.div
                                    key={article.id}
                                    layout
                                    custom={index}
                                    variants={cardVariants}
                                    initial="collapsed"
                                    animate={isStackExpanded ? "expanded" : "collapsed"}
                                    whileHover={!isStackExpanded ? "hover" : {}}
                                    className={`
                                        ${isStackExpanded ? 'h-[200px] w-full relative flex' : 'absolute w-[280px] h-[400px] flex flex-col'}
                                        bg-slate-900 border ${theme.border} rounded-xl overflow-hidden shadow-2xl
                                        group cursor-pointer select-none
                                    `}
                                    onClick={() => !isStackExpanded && setIsStackExpanded(true)}
                                >
                                    <div className={`${isStackExpanded ? 'w-1/3' : 'w-full h-full'} overflow-hidden relative`}>
                                        <img 
                                            src={article.image} 
                                            alt={article.title} 
                                            className={`w-full h-full object-cover transition-transform duration-700 ${isStackExpanded ? 'group-hover:scale-110' : ''}`} 
                                        />
                                        {!isStackExpanded && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6">
                                                 <span className={`text-[8px] font-black uppercase tracking-widest text-red-500 mb-1`}>
                                                    {article.category}
                                                </span>
                                                <h3 className="text-xl font-black uppercase text-white leading-tight">
                                                    {article.title}
                                                </h3>
                                            </div>
                                        )}
                                        {isStackExpanded && (
                                            <div className="absolute top-4 left-4">
                                                <span className={`px-2 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest shadow-lg`}>
                                                    {article.category}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {isStackExpanded && (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={`p-6 flex flex-col justify-between flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}
                                        >
                                            <div>
                                                <div className="flex items-center space-x-2 mb-2 text-[10px] font-bold uppercase text-slate-500">
                                                    <FileText size={10} />
                                                    <span>{article.date}</span>
                                                </div>
                                                <h3 className={`font-black uppercase leading-tight mb-2 ${theme.text} group-hover:text-red-600 transition-colors text-lg`}>
                                                    {article.title}
                                                </h3>
                                                <div className={`w-12 h-1 ${theme.accentBg} mb-4`} />
                                                <p className={`${theme.subText} text-xs leading-relaxed line-clamp-4 font-medium`}>
                                                    {article.summary}
                                                </p>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center mt-auto">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}>Read Source</span>
                                                <a 
                                                    href={article.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`w-6 h-6 rounded-full ${theme.accentBg} flex items-center justify-center text-white transform group-hover:translate-x-2 transition-transform`}
                                                >
                                                    <ChevronRight size={12} />
                                                </a>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                        {isStackExpanded && (
                            <motion.button 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={(e) => { e.stopPropagation(); setIsStackExpanded(false); }}
                                className={`mt-4 w-full flex items-center justify-center px-6 py-3 border ${theme.border} rounded-full hover:bg-white/10 transition-colors uppercase text-xs font-bold tracking-widest ${theme.subText}`}
                            >
                                <X size={14} className="mr-2" /> {t.articles.btn_close}
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            </div>
         </div>
      </section>

      {/* --- SECTION 04: TECHNOLOGY --- */}
      <section className={`min-h-[90vh] ${isDarkMode ? 'bg-slate-950/90' : 'bg-slate-50/90'} backdrop-blur-md relative py-24 px-6 md:px-24 z-10 transition-colors duration-500`}>
         <div className="max-w-7xl mx-auto h-full relative z-10 flex flex-col justify-center">
             <div className="flex justify-end mb-16 md:pr-24">
                <div className="text-right">
                    <Reveal delay={0.1} width="fit-content" x={0} y={30}>
                        <span className={`text-6xl font-black ${isDarkMode ? 'text-slate-800' : 'text-slate-200'} block mb-2`}>{t.tech.number}</span>
                    </Reveal>
                    <Reveal delay={0.2} width="fit-content" x={0} y={30}>
                        <h2 className={`text-4xl md:text-5xl font-black uppercase ${theme.text} leading-tight`}>
                            {t.tech.title_1} <br/> <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.accentGradient}`}>{t.tech.title_2}</span>
                        </h2>
                    </Reveal>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {[
                    { icon: Brain, title: t.tech.card_1, desc: t.tech.card_1_desc },
                    { icon: FileScan, title: t.tech.card_2, desc: t.tech.card_2_desc },
                    { icon: Dna, title: t.tech.card_3, desc: t.tech.card_3_desc }
                 ].map((item, idx) => (
                     <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.15, duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
                        viewport={{ once: false }}
                        className={`relative p-8 rounded-2xl border ${theme.border} backdrop-blur-xl ${theme.cardBg} group overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl`}
                     >
                         <div className={`absolute inset-0 border-2 border-transparent group-hover:border-${isDarkMode ? 'white/10' : 'black/5'} rounded-2xl transition-colors`} />
                         <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${theme.accentGradient} opacity-10 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-500`} />
                         <div className={`w-14 h-14 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                             <item.icon className={theme.subText} size={28} />
                         </div>
                         <h3 className={`text-xl font-bold uppercase mb-4 ${theme.text} relative z-10`}>{item.title}</h3>
                         <p className={`${theme.subText} text-sm leading-relaxed relative z-10 font-medium`}>{item.desc}</p>
                     </motion.div>
                 ))}
             </div>
         </div>
      </section>

      {/* --- FOOTER: CONTACT --- */}
      <footer id="contact-section" className={`relative py-24 px-6 md:px-24 border-t ${theme.border} ${isDarkMode ? 'bg-black' : 'bg-slate-900'} text-white z-10 overflow-hidden`}>
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none" />
         <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div>
                     <Reveal delay={0.1}>
                        <h2 className="text-5xl font-black uppercase leading-tight mb-2">{t.contact.title}</h2>
                        <p className={`text-xl ${theme.accent} font-serif italic mb-8`}>{t.contact.subtitle}</p>
                     </Reveal>
                     <div className="space-y-6">
                         {[
                             { icon: MapPin, label: t.contact.address_label, val: "8C Thảo Điền Quận 2, Ho Chi Minh City." },
                             { icon: Phone, label: t.contact.phone_label, val: "+84 3667426988" },
                             { icon: Mail, label: t.contact.email_label, val: "nguyenthanhdanhctk42@gmail.com" }
                         ].map((item, idx) => (
                             <Reveal key={idx} delay={0.2 + idx * 0.1}>
                                 <div className="flex items-start space-x-4 p-4 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group">
                                     <div className={`p-3 rounded-full bg-slate-900 text-white group-hover:${theme.accent} transition-colors border border-white/10`}>
                                         <item.icon size={20} />
                                     </div>
                                     <div>
                                         <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{item.label}</p>
                                         <p className="text-lg font-bold">{item.val}</p>
                                     </div>
                                 </div>
                             </Reveal>
                         ))}
                     </div>
                </div>
                <div className="flex flex-col justify-between">
                    <Reveal delay={0.3}>
                        <form onSubmit={handleContactSubmit} className="space-y-4 mb-12">
                            <input 
                                name="name"
                                value={contactForm.name}
                                onChange={handleContactChange}
                                type="text" 
                                placeholder={t.contact.form_name} 
                                required
                                className="w-full bg-slate-900 border border-slate-700 p-4 text-sm font-bold uppercase text-white focus:border-red-600 outline-none transition-colors" 
                            />
                            <input 
                                name="email"
                                value={contactForm.email}
                                onChange={handleContactChange}
                                type="email" 
                                placeholder={t.contact.form_email} 
                                required
                                className="w-full bg-slate-900 border border-slate-700 p-4 text-sm font-bold uppercase text-white focus:border-red-600 outline-none transition-colors" 
                            />
                            <textarea 
                                name="message"
                                value={contactForm.message}
                                onChange={handleContactChange}
                                rows={4} 
                                placeholder={t.contact.form_msg} 
                                required
                                className="w-full bg-slate-900 border border-slate-700 p-4 text-sm font-bold uppercase text-white focus:border-red-600 outline-none transition-colors" 
                            />
                            <button 
                                type="submit"
                                disabled={sendStatus === 'sending' || sendStatus === 'success'}
                                className={`w-full py-4 ${sendStatus === 'success' ? 'bg-green-600' : theme.accentBg} text-white font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center`}
                            >
                                {sendStatus === 'sending' ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin mr-2" /> {t.contact.sending_msg}
                                    </>
                                ) : sendStatus === 'success' ? (
                                    <>
                                        <CheckCircle size={18} className="mr-2" /> {t.contact.success_msg}
                                    </>
                                ) : (
                                    t.contact.btn_send
                                )}
                            </button>
                        </form>
                    </Reveal>
                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 md:mb-0">{t.contact.footer_rights}</p>
                        <div className="flex space-x-4">
                            {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                                <a key={i} href="#" className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all">
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
