
import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Brain, Dna, FileScan, ArrowRight, X, ChevronRight, ChevronLeft, FileText, Quote, Play, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import AuthModal from './AuthModal';

// --- ASSETS (Copied for standalone rendering) ---
const galleryImage1 = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop";
const galleryImage2 = "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2080&auto=format&fit=crop";
const galleryImage3 = "https://images.unsplash.com/photo-1530497610245-94d3c16cda48?q=80&w=1770&auto=format&fit=crop";
const articleImage1 = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop";
const articleImage2 = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop";
const articleImage3 = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop";

// --- CONTENT DICTIONARY (Subset relevant to Learn More) ---
const CONTENT = {
    en: {
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
        back: "Back to Home",
        login_cta: "Access System"
    },
    vi: {
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
        back: "Quay lại",
        login_cta: "Truy cập hệ thống"
    }
};

interface LearnMorePageProps {
    onBack: () => void;
    onEnter: () => void;
}

// --- HELPER COMPONENTS ---
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
                viewport={{ once: false, margin: "-50px" }}
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

const LearnMorePage: React.FC<LearnMorePageProps> = ({ onBack, onEnter }) => {
    const { language } = useLanguage();
    const t = CONTENT[language];
    
    // States copied from LandingPage
    const [isStackExpanded, setIsStackExpanded] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Hardcoded Dark Theme for this specialized page to maintain cinematic feel
    const theme = {
        bg: 'bg-slate-950',
        text: 'text-white',
        subText: 'text-slate-400',
        border: 'border-slate-800',
        accent: 'text-blue-500',
        accentBg: 'bg-blue-600',
        accentGradient: 'from-blue-600 to-indigo-600',
        cardBg: 'bg-slate-900/40'
    };

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);

    const cardVariants = {
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
                transition: { type: "spring", stiffness: 150, damping: 20 }
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
          transition: { delay: index * 0.1, type: "spring", stiffness: 120, damping: 20 }
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
        <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className={`fixed inset-0 z-50 overflow-y-auto ${theme.bg} ${theme.text}`}
        >
            <AuthModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
                onLogin={onEnter} 
                themeAccent={theme.accentBg}
            />

            {/* --- NAVIGATION BAR --- */}
            <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-blue-500 transition-colors"
                >
                    <ArrowLeft size={16} /> {t.back}
                </button>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowAuthModal(true)}
                        className={`px-6 py-2 bg-white text-black font-bold text-xs uppercase tracking-widest rounded hover:bg-gray-200 transition-colors`}
                    >
                        {t.login_cta}
                    </button>
                </div>
            </div>

            <div className="pt-24 pb-24">
                {/* --- SECTION 01: ABOUT US --- */}
                <section className="min-h-[80vh] relative py-12 px-6 md:px-24 flex items-center">
                    <div className="max-w-7xl mx-auto w-full relative z-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                            <motion.div 
                                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ duration: 0.7 }}
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
                                        <img src={sliderImages[currentSlide].url} alt="Slide" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-8 left-8">
                                            <h3 className="text-white text-2xl font-bold uppercase tracking-wide">{sliderImages[currentSlide].caption}</h3>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                                <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 z-20"><ChevronLeft size={20} /></button>
                                <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 z-20"><ChevronRight size={20} /></button>
                            </motion.div>

                            <div className="flex flex-col justify-center space-y-6">
                                <Reveal x={50} delay={0.1}><span className="text-6xl font-black text-slate-800 block">{t.about.number}</span></Reveal>
                                <Reveal x={50} delay={0.2}>
                                    <h2 className={`text-4xl font-black uppercase ${theme.text} leading-tight`}>
                                        {t.about.title_1} <br/> <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.accentGradient}`}>{t.about.title_2}</span>
                                    </h2>
                                </Reveal>
                                <Reveal x={50} delay={0.3}>
                                    <div className="relative pl-6 border-l-4 border-slate-700">
                                        <Quote className={`absolute -top-3 -left-3 ${theme.subText} bg-slate-950 p-1`} size={24} />
                                        <p className={`text-lg italic font-serif ${theme.subText} mb-4`}>"{t.about.quote}"</p>
                                        <p className={`text-xs font-bold uppercase tracking-widest ${theme.text}`}>— {t.about.author}</p>
                                    </div>
                                </Reveal>
                                <Reveal x={50} delay={0.4}><p className={`text-sm ${theme.subText} leading-relaxed`}>{t.about.desc}</p></Reveal>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- SECTION 02: ARTICLES --- */}
                <section className="min-h-[80vh] relative py-12 px-6 md:px-24 border-y border-slate-800 bg-black/20 flex items-center">
                    <div className="max-w-7xl mx-auto w-full relative z-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                            <div className="flex flex-col justify-center space-y-6 order-2 lg:order-1">
                                <Reveal x={-50} delay={0.1}><span className="text-6xl font-black text-slate-800 block">{t.articles.number}</span></Reveal>
                                <Reveal x={-50} delay={0.2}>
                                    <h2 className={`text-4xl font-black uppercase ${theme.text} leading-tight`}>
                                        {t.articles.title_1} <br/> <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.accentGradient}`}>{t.articles.title_2}</span>
                                    </h2>
                                </Reveal>
                                <Reveal x={-50} delay={0.3}>
                                    <div className="relative pl-6 border-l-4 border-slate-700">
                                        <p className={`text-lg font-medium ${theme.text} mb-4`}>{t.articles.subtitle}</p>
                                    </div>
                                </Reveal>
                                <Reveal x={-50} delay={0.4}><p className={`text-sm ${theme.subText} leading-relaxed`}>{t.articles.desc}</p></Reveal>
                            </div>

                            <motion.div 
                                layout
                                className="flex justify-center lg:justify-end order-1 lg:order-2"
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.7 }}
                            >
                                <div className={`relative transition-all duration-700 ${isStackExpanded ? 'w-full grid grid-cols-1 gap-6' : 'w-[400px] h-[500px] flex items-center justify-center'}`}>
                                    {!isStackExpanded && (
                                        <div className="absolute inset-0 z-50 cursor-pointer flex flex-col items-center justify-center group" onClick={() => setIsStackExpanded(true)}>
                                            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xl group-hover:scale-110 transition-transform">
                                                <Play size={24} fill="currentColor" className="ml-1" />
                                            </div>
                                            <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                                                <span className="text-xs font-bold uppercase tracking-[0.3em] text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">{t.articles.btn_view_collection}</span>
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
                                                className={`${isStackExpanded ? 'h-[200px] w-full relative flex' : 'absolute w-[280px] h-[400px] flex flex-col'} bg-slate-900 border ${theme.border} rounded-xl overflow-hidden shadow-2xl group cursor-pointer select-none`}
                                                onClick={() => !isStackExpanded && setIsStackExpanded(true)}
                                            >
                                                <div className={`${isStackExpanded ? 'w-1/3' : 'w-full h-full'} overflow-hidden relative`}>
                                                    <img src={article.image} alt={article.title} className={`w-full h-full object-cover transition-transform duration-700 ${isStackExpanded ? 'group-hover:scale-110' : ''}`} />
                                                    {!isStackExpanded && (
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6">
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-red-500 mb-1">{article.category}</span>
                                                            <h3 className="text-xl font-black uppercase text-white leading-tight">{article.title}</h3>
                                                        </div>
                                                    )}
                                                </div>
                                                {isStackExpanded && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex flex-col justify-between flex-1 bg-slate-900">
                                                        <div>
                                                            <div className="flex items-center space-x-2 mb-2 text-[10px] font-bold uppercase text-slate-500"><FileText size={10} /><span>{article.date}</span></div>
                                                            <h3 className="font-black uppercase leading-tight mb-2 text-white group-hover:text-red-600 transition-colors text-lg">{article.title}</h3>
                                                            <p className="text-slate-400 text-xs leading-relaxed line-clamp-4 font-medium">{article.summary}</p>
                                                        </div>
                                                        <div className="pt-2 border-t border-slate-800 flex justify-between items-center mt-auto">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Read Source</span>
                                                            <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`w-6 h-6 rounded-full ${theme.accentBg} flex items-center justify-center text-white transform group-hover:translate-x-2 transition-transform`}><ChevronRight size={12} /></a>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                    {isStackExpanded && (
                                        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={(e) => { e.stopPropagation(); setIsStackExpanded(false); }} className={`mt-4 w-full flex items-center justify-center px-6 py-3 border ${theme.border} rounded-full hover:bg-white/10 transition-colors uppercase text-xs font-bold tracking-widest ${theme.subText}`}>
                                            <X size={14} className="mr-2" /> {t.articles.btn_close}
                                        </motion.button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* --- SECTION 03: TECHNOLOGY --- */}
                <section className="min-h-[80vh] bg-slate-950 relative py-12 px-6 md:px-24">
                    <div className="max-w-7xl mx-auto h-full relative z-10 flex flex-col justify-center">
                        <div className="flex justify-end mb-16 md:pr-24">
                            <div className="text-right">
                                <Reveal delay={0.1} width="fit-content" x={0} y={30}><span className="text-6xl font-black text-slate-800 block mb-2">{t.tech.number}</span></Reveal>
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
                                    transition={{ delay: idx * 0.15, duration: 0.7 }}
                                    className={`relative p-8 rounded-2xl border ${theme.border} backdrop-blur-xl ${theme.cardBg} group overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl`}
                                >
                                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 rounded-2xl transition-colors" />
                                    <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${theme.accentGradient} opacity-10 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-500`} />
                                    <div className={`w-14 h-14 bg-slate-800 rounded-xl shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                                        <item.icon className={theme.subText} size={28} />
                                    </div>
                                    <h3 className={`text-xl font-bold uppercase mb-4 ${theme.text} relative z-10`}>{item.title}</h3>
                                    <p className={`${theme.subText} text-sm leading-relaxed relative z-10 font-medium`}>{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </motion.div>
    );
};

export default LearnMorePage;
