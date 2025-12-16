
import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Moon, Sun, Lock, ArrowRight, CheckCircle, Zap, ChevronLeft, MapPin, Phone, Mail, Facebook, Twitter, Linkedin, Instagram, ScanEye, Home, Loader2, Info } from 'lucide-react';
import AuthModal from './AuthModal';
import { useLanguage } from '../contexts/LanguageContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../services/firebase';

// ==================================================================================
// 🖼️ ASSETS & MEDIA CONFIGURATION
// ==================================================================================
const landingBg = "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop";
const heroMainGif = "https://cdn.coverr.co/videos/coverr-medical-research-laboratory-5432/1080p.mp4"; 
const SAYAGATA_PATTERN = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

interface LandingPageProps {
  onEnter: () => void;
  onNavigate: (view: 'learn-more') => void;
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

const LandingPage: React.FC<LandingPageProps> = ({ onEnter, onNavigate }) => {
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Use global language context
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          if (!auth.currentUser) {
              await signInAnonymously(auth);
          }

          await addDoc(collection(db, "contact_messages"), {
              name: contactForm.name,
              email: contactForm.email,
              message: contactForm.message,
              createdAt: serverTimestamp(),
              status: 'unread'
          });

          setSendStatus('success');
          setContactForm({ name: '', email: '', message: '' });
          setTimeout(() => setSendStatus('idle'), 3000);

      } catch (error) {
          console.error("Firestore save failed, falling back to mailto", error);
          const subject = `MedAssist Contact: ${contactForm.name}`;
          const body = `Name: ${contactForm.name}%0D%0AEmail: ${contactForm.email}%0D%0A%0D%0AMessage:%0D%0A${contactForm.message}`;
          const mailtoLink = `mailto:nguyenthanhdanhctk42@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;
          window.location.href = mailtoLink;
          setSendStatus('success'); 
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

  return (
    <div className={`relative w-full ${theme.bg} font-sans ${theme.text} transition-colors duration-700 overflow-x-hidden selection:${theme.accentBg} selection:text-white`}>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onLogin={onEnter} 
        themeAccent={theme.accentBg}
      />

      {/* --- BACKGROUND LAYERS --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
            style={{ 
                backgroundImage: `url(${landingBg})`,
                filter: isDarkMode ? 'brightness(0.3) saturate(0) contrast(1.2)' : 'brightness(1.1) saturate(1.0) contrast(0.9)',
                opacity: 1 
            }} 
         />
         <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: `url("${SAYAGATA_PATTERN}")` }} />
         <div className={`absolute inset-0 bg-gradient-to-r transition-colors duration-1000 ${isDarkMode ? 'from-slate-950 via-slate-950/90 to-slate-900/60' : 'from-slate-50 via-slate-50/95 to-white/60'}`} />
         <div className="absolute inset-0 transition-colors duration-500" style={{ backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.5 }} />
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
            <button onClick={() => onNavigate('learn-more')} className={`text-xs font-bold uppercase tracking-[0.2em] ${!isHeroExpanded && !isDarkMode ? 'text-white/80 hover:text-white' : `${theme.subText} hover:${theme.accent}`} transition-colors relative group`}>
                {t.nav.about}
            </button>
            <button onClick={() => scrollToSection('contact-section')} className={`text-xs font-bold uppercase tracking-[0.2em] ${!isHeroExpanded && !isDarkMode ? 'text-white/80 hover:text-white' : `${theme.subText} hover:${theme.accent}`} transition-colors relative group`}>
                {t.nav.contact}
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
                    {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                </AnimatePresence>
            </button>

            <button 
                onClick={() => setShowAuthModal(true)}
                className={`hidden md:flex items-center px-6 py-2.5 bg-gradient-to-r ${theme.accentGradient} text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 hover:shadow-lg transition-all rounded-sm group`}
            >
                <span className="mr-2">{t.nav.login}</span>
                <Lock size={12} className="group-hover:translate-x-1 transition-transform"/>
            </button>
            <button className={`md:hidden p-2 ${theme.text}`} onClick={() => onNavigate('learn-more')}>
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
                            <button onClick={() => onNavigate('learn-more')} className={`px-8 py-4 border ${theme.border} ${theme.text} font-bold uppercase tracking-wider text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center`}>
                                {t.hero.btn_learn} <Info size={14} className="ml-2" />
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
                width: isHeroExpanded ? (isMobile ? '0%' : '55%') : '100%',
                opacity: isHeroExpanded && isMobile ? 0 : 1
            }}
            transition={{ type: "spring", stiffness: 40, damping: 15 }}
            onClick={() => setIsHeroExpanded(!isHeroExpanded)}
         >
             <div className="relative w-full h-full bg-black">
                <div className="absolute top-0 bottom-0 left-[-1px] w-[100px] h-full z-40 pointer-events-none text-white dark:text-slate-950 transition-colors duration-700">
                    <svg className={`h-full w-full ${isDarkMode ? 'text-slate-950' : 'text-white'}`} viewBox="0 0 100 100" preserveAspectRatio="none">
                         <path d="M0 0 V 100 Q 60 50 0 0 Z" fill="currentColor" />
                    </svg>
                </div>
                {heroMainGif.endsWith('.mp4') ? (
                    <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-90" src={heroMainGif} />
                ) : (
                    <img src={heroMainGif} className="absolute inset-0 w-full h-full object-cover opacity-90" alt="Hero Animation" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                <motion.div 
                    className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10"
                    animate={{ opacity: isHeroExpanded ? 0 : 1, x: isHeroExpanded ? 50 : 0 }}
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
                        <p className="text-xs text-white font-bold uppercase tracking-widest">{t.hero.initiate}</p>
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
                            <input name="name" value={contactForm.name} onChange={handleContactChange} type="text" placeholder={t.contact.form_name} required className="w-full bg-slate-900 border border-slate-700 p-4 text-sm font-bold uppercase text-white focus:border-red-600 outline-none transition-colors" />
                            <input name="email" value={contactForm.email} onChange={handleContactChange} type="email" placeholder={t.contact.form_email} required className="w-full bg-slate-900 border border-slate-700 p-4 text-sm font-bold uppercase text-white focus:border-red-600 outline-none transition-colors" />
                            <textarea name="message" value={contactForm.message} onChange={handleContactChange} rows={4} placeholder={t.contact.form_msg} required className="w-full bg-slate-900 border border-slate-700 p-4 text-sm font-bold uppercase text-white focus:border-red-600 outline-none transition-colors" />
                            <button type="submit" disabled={sendStatus === 'sending' || sendStatus === 'success'} className={`w-full py-4 ${sendStatus === 'success' ? 'bg-green-600' : theme.accentBg} text-white font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center`}>
                                {sendStatus === 'sending' ? (<><Loader2 size={18} className="animate-spin mr-2" /> {t.contact.sending_msg}</>) : sendStatus === 'success' ? (<><CheckCircle size={18} className="mr-2" /> {t.contact.success_msg}</>) : (t.contact.btn_send)}
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
