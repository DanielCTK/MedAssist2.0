
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Appointment, DiagnosisRecord, ChatMessage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
    Activity, Calendar, FileText, MessageCircle, LogOut, Sun, Moon, Home, 
    ChevronRight, Bell, User as UserIcon, Send, X, Loader2, Stethoscope, 
    AlertTriangle, Play, Plus, Search, Settings, Shield, ChevronLeft, MapPin,
    TestTube, Video, ShoppingBag, Building2, UserCog, Syringe, BriefcaseMedical,
    Filter, Clock, Star, Flame, Bookmark, CalendarDays, ShieldPlus, HeartHandshake,
    Stethoscope as StethoscopeIcon, Building, Pill, Eye, Image as ImageIcon, Download, Share2,
    Camera, Check, Link as LinkIcon, Edit2, Lock, Save, Phone, Mail, Globe, Map
} from 'lucide-react';
import { User } from 'firebase/auth';
import { subscribeToPatientAppointments, addAppointment } from '../services/scheduleService';
import { subscribeToMessages, sendMessage, getChatId } from '../services/chatService';
import { checkAndAutoLinkPatient, linkPatientToDoctor } from '../services/patientService'; 
import { updateUserProfile, uploadUserImage } from '../services/userService'; 
import { collection, query, where, limit, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GoogleGenAI } from "@google/genai";

interface PatientDashboardProps {
    isDarkMode: boolean;
    currentUser: User | null;
    userProfile: UserProfile | null;
    onLogout: () => void;
    toggleTheme: () => void;
}

type TabID = 'home' | 'records' | 'schedule' | 'chat' | 'profile';

const APPOINTMENT_TYPES = ["Khám tổng quát", "Đau mắt", "Nhìn mờ", "Đỏ mắt", "Lấy đơn thuốc", "Tái khám sau mổ"];
const AVAILABLE_HOURS = [8, 9, 10, 11, 13, 14, 15, 16];

// --- BANNER DATA ---
const BANNERS = [
    {
        id: 1,
        title: "Kiểm tra sức khỏe tổng quát",
        desc: "Giảm 20% khi đặt lịch qua app",
        tag: "ƯU ĐÃI",
        bg: "bg-gradient-to-r from-[#0095FF] to-[#40C9FF]",
        icon: Stethoscope,
        shadow: "shadow-blue-500/20"
    },
    {
        id: 2,
        title: "Tiêm chủng trọn gói",
        desc: "Bảo vệ gia đình bạn ngay hôm nay",
        tag: "MỚI",
        bg: "bg-gradient-to-r from-[#10B981] to-[#34D399]",
        icon: Syringe,
        shadow: "shadow-emerald-500/20"
    },
    {
        id: 3,
        title: "Chăm sóc mắt toàn diện",
        desc: "Miễn phí đo thị lực lần đầu",
        tag: "HOT",
        bg: "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]",
        icon: Eye,
        shadow: "shadow-amber-500/20"
    }
];

// --- PARTNER DATA ---
const PARTNERS = [
    { id: 1, name: "Bệnh viện ĐH Y Dược", icon: Building2, color: "text-blue-600" },
    { id: 2, name: "Hệ thống Vinmec", icon: HeartHandshake, color: "text-pink-600" },
    { id: 3, name: "Nhà thuốc Long Châu", icon: Pill, color: "text-blue-500" },
    { id: 4, name: "Pharmacity", icon: ShoppingBag, color: "text-green-600" },
    { id: 5, name: "Doctor Anywhere", icon: Video, color: "text-purple-600" },
    { id: 6, name: "MedPro", icon: Activity, color: "text-cyan-600" },
];

// --- UI COMPONENTS ---

const ServiceGridItem = ({ icon: Icon, label, badge, badgeColor, iconColor = "text-[#0095FF]", onClick, bgColor = "bg-[#F2F9FF]" }: any) => (
    <motion.div 
        whileTap={{ scale: 0.9 }}
        onClick={onClick} 
        className="flex flex-col items-center gap-3 cursor-pointer group p-1"
    >
        <div className="relative">
            <div className={`w-14 h-14 rounded-[1.2rem] ${bgColor} flex items-center justify-center transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1`}>
                <Icon size={26} className={iconColor} strokeWidth={1.5} />
            </div>
            {badge && (
                <div className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white shadow-sm border border-white ${badgeColor || 'bg-red-500'}`}>
                    {badge}
                </div>
            )}
        </div>
        <span className="text-[11px] font-bold text-slate-600 text-center leading-tight max-w-[80px] group-hover:text-[#0095FF] transition-colors">{label}</span>
    </motion.div>
);

const TabButton = ({ id, icon: Icon, label, currentTab, setCurrentTab, badge }: { id: TabID, icon: any, label: string, currentTab: TabID, setCurrentTab: (id: TabID) => void, badge?: number }) => (
    <button 
        onClick={() => setCurrentTab(id)}
        className={`relative flex items-center justify-center w-full h-full group`}
    >
        <div className={`transition-all duration-300 flex flex-col items-center gap-1 ${currentTab === id ? 'text-[#0095FF] -translate-y-1' : 'text-slate-400 group-hover:text-[#0095FF]'}`}>
            <Icon size={24} strokeWidth={currentTab === id ? 2.5 : 2} />
            {currentTab === id && (
                <div className="w-1 h-1 bg-[#0095FF] rounded-full"></div>
            )}
            
            {badge && badge > 0 && (
                <span className="absolute top-0 right-4 bg-red-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </div>
    </button>
);

// --- HELPER FOR GRADES ---
const getGradeInfo = (grade: number) => {
    switch (grade) {
        case 0: return { label: "Bình thường (No DR)", color: "bg-green-100 text-green-700 border-green-200", icon: ShieldPlus };
        case 1: return { label: "Nhẹ (Mild NPDR)", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertTriangle };
        case 2: return { label: "Trung bình (Moderate)", color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle };
        case 3: return { label: "Nặng (Severe NPDR)", color: "bg-red-100 text-red-700 border-red-200", icon: Flame };
        case 4: return { label: "Nguy hiểm (PDR)", color: "bg-red-600 text-white border-red-600", icon: AlertTriangle }; // Fallback icon
        default: return { label: "Chưa xác định", color: "bg-slate-100 text-slate-700 border-slate-200", icon: Activity };
    }
};

const PatientDashboard: React.FC<PatientDashboardProps> = ({ isDarkMode, currentUser, userProfile, onLogout, toggleTheme }) => {
    const { t, language } = useLanguage();
    const [currentTab, setCurrentTab] = useState<TabID>('home');
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisRecord[]>([]);
    const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    
    // UI State
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [viewingRecord, setViewingRecord] = useState<DiagnosisRecord | null>(null); // For Detail Modal

    // Booking State
    const [newBookDate, setNewBookDate] = useState("");
    const [newBookReason, setNewBookReason] = useState(""); 
    const [selectedReasonType, setSelectedReasonType] = useState(APPOINTMENT_TYPES[0]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(9); 
    const [scheduleFilter, setScheduleFilter] = useState<'ongoing' | 'completed'>('ongoing');

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [chatMode, setChatMode] = useState<'doctor' | 'ai'>('doctor');
    const [aiMessages, setAiMessages] = useState<{id: string, text: string, sender: 'user'|'ai', timestamp: Date}[]>([
        { id: 'welcome', text: "Xin chào! Tôi là Trợ lý AI MedAssist. Tôi có thể giúp giải thích các thuật ngữ y khoa hoặc hướng dẫn sử dụng ứng dụng.", sender: 'ai', timestamp: new Date() }
    ]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Profile & Settings State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isLinkingDoctor, setIsLinkingDoctor] = useState(false);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);

    // EXPANDED PROFILE STATE
    const [editForm, setEditForm] = useState({
        displayName: '',
        dob: '',
        gender: 'Nam',
        identityCard: '',
        insuranceId: '',
        job: '',
        phone: '',
        email: '',
        country: 'Việt Nam',
        ethnicity: '',
        province: '',
        district: '',
        ward: '',
        streetAddress: '', 
        doctorEmail: '' 
    });

    // --- DATA LOADING ---
    useEffect(() => {
        const attemptAutoLink = async () => {
            if (currentUser && userProfile && !userProfile.doctorUid) {
                const foundDoctorId = await checkAndAutoLinkPatient(currentUser, userProfile);
                if (foundDoctorId) setAssignedDoctorId(foundDoctorId);
            } else if (userProfile?.doctorUid) {
                setAssignedDoctorId(userProfile.doctorUid);
            }
        };
        attemptAutoLink();
    }, [currentUser, userProfile]);

    useEffect(() => {
        if (userProfile) {
            setEditForm(prev => ({
                ...prev,
                displayName: userProfile.displayName || '',
                phone: userProfile.phone || '',
                email: userProfile.email || '',
                streetAddress: userProfile.location || '' 
            }));
        }

        if (currentUser) {
            const fetchDetailedInfo = async () => {
                const q = query(collection(db, "patients"), where("uid", "==", currentUser.uid), limit(1));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    setEditForm(prev => ({
                        ...prev,
                        dob: data.dob || '',
                        gender: data.gender || 'Nam',
                        identityCard: data.identityCard || '',
                        insuranceId: data.insuranceId || '',
                        job: data.job || '',
                        ethnicity: data.ethnicity || '',
                        province: data.province || '',
                        district: data.district || '',
                        ward: data.ward || '',
                        streetAddress: data.streetAddress || data.address || '',
                        displayName: data.name || prev.displayName,
                        phone: data.phone || prev.phone,
                        email: data.email || prev.email
                    }));
                    
                    if (data.diagnosisHistory) {
                        setDiagnosisHistory(data.diagnosisHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    }
                }
            };
            fetchDetailedInfo();
        }
    }, [currentUser, userProfile]);

    useEffect(() => {
        if (!currentUser) return;
        const unsubAppt = subscribeToPatientAppointments(currentUser.uid, (data) => setMyAppointments(data), (err) => console.error(err));
        return () => unsubAppt();
    }, [currentUser]);

    // Banner Auto Slide
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBannerIndex((prev) => (prev + 1) % BANNERS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    // --- CHAT LOGIC ---
    useEffect(() => {
        if (currentUser && currentTab === 'chat' && assignedDoctorId && chatMode === 'doctor') {
            const chatId = getChatId(currentUser.uid, assignedDoctorId);
            const unsubChat = subscribeToMessages(chatId, (msgs) => setMessages(msgs));
            return () => { unsubChat(); };
        }
    }, [currentUser, currentTab, assignedDoctorId, chatMode]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiMessages, currentTab, chatMode]);

    const handleSendMessage = async () => {
        if (!inputMsg.trim() || !currentUser || !assignedDoctorId) return;
        const text = inputMsg;
        setInputMsg(""); 
        const chatId = getChatId(currentUser.uid, assignedDoctorId);
        await sendMessage(chatId, currentUser.uid, text);
    };

    const handleSendAI = async () => {
        if (!inputMsg.trim()) return;
        const text = inputMsg;
        setInputMsg("");
        setAiMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'user', timestamp: new Date() }]);
        setIsAiThinking(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview',
                contents: text,
                config: { 
                    systemInstruction: `You are MedAssist AI, a supportive health tracking assistant.`
                }
            });
            setAiMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: response.text || "...", sender: 'ai', timestamp: new Date() }]);
        } finally { setIsAiThinking(false); }
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBookDate || !currentUser || !assignedDoctorId) return;
        try {
            await addAppointment({
                doctorId: assignedDoctorId, 
                patientId: currentUser.uid,
                patientName: userProfile?.displayName || "Bệnh nhân",
                title: `${selectedReasonType}: ${newBookReason}`,
                type: 'Consult',
                date: newBookDate,
                startTime: selectedTimeSlot, 
                duration: 1,
                status: 'Pending'
            });
            setIsBookModalOpen(false);
            setNewBookReason("");
            alert("Đã gửi yêu cầu đặt lịch thành công!");
        } catch (e) { alert("Lỗi đặt lịch"); }
    };

    // --- SETTINGS LOGIC ---
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && currentUser) {
            setIsAvatarUploading(true);
            try {
                const url = await uploadUserImage(currentUser.uid, e.target.files[0], 'avatar');
                await updateUserProfile(currentUser.uid, { photoURL: url });
                
                const q = query(collection(db, "patients"), where("uid", "==", currentUser.uid), limit(1));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const docId = snapshot.docs[0].id;
                    await updateDoc(doc(db, "patients", docId), { avatarUrl: url });
                }
            } catch (e) { console.error(e); }
            finally { setIsAvatarUploading(false); }
        }
    };

    const handleUpdateProfile = async () => {
        if (!currentUser) return;
        setIsSavingProfile(true);
        try {
            const fullAddress = `${editForm.streetAddress}, ${editForm.ward}, ${editForm.district}, ${editForm.province}`;
            await updateUserProfile(currentUser.uid, {
                displayName: editForm.displayName,
                phone: editForm.phone,
                location: fullAddress
            });

            const q = query(collection(db, "patients"), where("uid", "==", currentUser.uid), limit(1));
            const snapshot = await getDocs(q);
            
            const medicalData = {
                name: editForm.displayName,
                dob: editForm.dob,
                gender: editForm.gender,
                identityCard: editForm.identityCard,
                insuranceId: editForm.insuranceId,
                job: editForm.job,
                phone: editForm.phone,
                email: editForm.email,
                ethnicity: editForm.ethnicity,
                province: editForm.province,
                district: editForm.district,
                ward: editForm.ward,
                streetAddress: editForm.streetAddress,
                address: fullAddress, 
            };

            if (!snapshot.empty) {
                const docId = snapshot.docs[0].id;
                await updateDoc(doc(db, "patients", docId), medicalData);
            }

            alert("Đã cập nhật hồ sơ thành công!");
        } catch(e) {
            alert("Lỗi khi cập nhật hồ sơ.");
            console.error(e);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleConnectDoctor = async () => {
        if (!editForm.doctorEmail || !userProfile) return;
        setIsLinkingDoctor(true);
        try {
            await linkPatientToDoctor(userProfile, editForm.doctorEmail);
            alert("Kết nối bác sĩ thành công!");
            setEditForm(prev => ({ ...prev, doctorEmail: '' }));
        } catch (e: any) {
            alert("Lỗi kết nối: " + e.message);
        } finally {
            setIsLinkingDoctor(false);
        }
    };

    const bgClass = isDarkMode ? "bg-slate-900 text-white" : "bg-[#F0F4F8] text-[#334155]"; 

    return (
        <div className={`min-h-screen ${bgClass} font-sans relative overflow-hidden flex flex-col`}>
            
            {/* --- HEADER --- */}
            <div className={`px-6 pt-12 pb-2 flex justify-between items-start relative z-10 shrink-0 ${currentTab === 'profile' ? 'bg-[#0095FF] text-white shadow-lg' : ''}`}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {currentTab === 'profile' ? (
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => setCurrentTab('home')} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                            <h1 className="text-xl font-bold tracking-wide uppercase">Cài đặt hồ sơ</h1>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <MapPin size={10} /> {userProfile?.hospital || 'Ho Chi Minh City'}
                            </p>
                            <h1 className="text-2xl font-black tracking-tight leading-none text-slate-800 dark:text-white">
                                {userProfile?.displayName || 'Guest User'}
                            </h1>
                        </>
                    )}
                </motion.div>
                <div 
                    onClick={() => setCurrentTab('profile')}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg cursor-pointer hover:scale-105 transition-transform"
                >
                    <img src={userProfile?.photoURL || "https://ui-avatars.com/api/?name=User&background=random"} className="w-full h-full object-cover" alt="Profile" />
                </div>
            </div>

            {/* --- SEARCH BAR (Hide on Profile) --- */}
            {currentTab !== 'profile' && (
                <div className="px-6 py-4 shrink-0 relative z-20">
                    <div className="flex items-center bg-white shadow-lg shadow-blue-900/5 rounded-2xl px-4 py-3.5 border border-white">
                        <Search size={18} className="text-slate-400 mr-3" />
                        <input 
                            type="text" 
                            placeholder="Tìm bác sĩ, chuyên khoa, dịch vụ..." 
                            className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-700 placeholder-slate-300"
                        />
                    </div>
                </div>
            )}

            {/* --- MAIN SCROLLABLE CONTENT --- */}
            <main className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 ${currentTab === 'profile' ? 'bg-[#F2F4F7]' : 'pb-28'}`}>
                <AnimatePresence mode="wait">
                    
                    {/* 1. HOME TAB */}
                    {currentTab === 'home' && (
                        <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            
                            {/* --- MAIN SERVICES GRID --- */}
                            <div className="px-6">
                                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 border border-white">
                                    <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                                        <ServiceGridItem 
                                            icon={CalendarDays} label="Đặt khám tại cơ sở" 
                                            badge={<Star size={6} fill="white"/>} badgeColor="bg-[#F59E0B]"
                                            onClick={() => setIsBookModalOpen(true)}
                                        />
                                        <ServiceGridItem 
                                            icon={StethoscopeIcon} label="Đặt khám chuyên khoa" 
                                            badge={<Star size={6} fill="white"/>} badgeColor="bg-[#F59E0B]"
                                            onClick={() => {}}
                                        />
                                        <ServiceGridItem 
                                            icon={TestTube} label="Đặt lịch xét nghiệm" 
                                            bgColor="bg-[#EBF7FF]" iconColor="text-[#0EA5E9]"
                                            onClick={() => {}}
                                        />
                                        <ServiceGridItem 
                                            icon={ShieldPlus} label="Gói sức khỏe toàn diện" 
                                            bgColor="bg-[#EBF7FF]" iconColor="text-[#0EA5E9]"
                                            onClick={() => setCurrentTab('records')}
                                        />
                                        
                                        <ServiceGridItem 
                                            icon={HeartHandshake} label="Chăm sóc tại nhà" 
                                            badge="Mới" badgeColor="bg-red-500"
                                            onClick={() => {}}
                                        />
                                        <ServiceGridItem 
                                            icon={Video} label="Tư vấn trực tuyến" 
                                            badge={<Star size={6} fill="white"/>} badgeColor="bg-[#F59E0B]"
                                            onClick={() => setCurrentTab('chat')}
                                        />
                                        <ServiceGridItem 
                                            icon={Pill} label="Mua thuốc Online" 
                                            bgColor="bg-[#F0FDF4]" iconColor="text-[#22C55E]"
                                            onClick={() => {}}
                                        />
                                        <ServiceGridItem 
                                            icon={Building} label="Khám doanh nghiệp" 
                                            badge="Mới" badgeColor="bg-red-500"
                                            onClick={() => {}}
                                        />
                                    </div>
                                    {/* Pagination Indicator */}
                                    <div className="flex justify-center mt-6 gap-1.5">
                                        <div className="w-4 h-1 bg-[#0095FF] rounded-full"></div>
                                        <div className="w-1.5 h-1 bg-slate-200 rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            {/* --- BANNER SLIDER --- */}
                            <div className="px-6">
                                <div className="relative w-full h-36 rounded-3xl overflow-hidden shadow-lg group">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentBannerIndex}
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -50 }}
                                            transition={{ duration: 0.5 }}
                                            className={`absolute inset-0 ${BANNERS[currentBannerIndex].bg} flex items-center px-6`}
                                        >
                                            {/* Content */}
                                            <div className="relative z-10 text-white w-3/4">
                                                <span className="bg-white/20 text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md mb-2 inline-block border border-white/20">
                                                    {BANNERS[currentBannerIndex].tag}
                                                </span>
                                                <h3 className="font-black text-xl leading-tight mb-1">
                                                    {BANNERS[currentBannerIndex].title}
                                                </h3>
                                                <p className="text-xs font-medium opacity-90">
                                                    {BANNERS[currentBannerIndex].desc}
                                                </p>
                                            </div>
                                            {/* Decor */}
                                            <div className="absolute right-0 bottom-0 top-0 w-1/3 overflow-hidden">
                                                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                                {/* Dynamic Icon */}
                                                {React.createElement(BANNERS[currentBannerIndex].icon, {
                                                    size: 90,
                                                    className: "text-white opacity-20 absolute -right-2 -bottom-4 rotate-[-20deg]"
                                                })}
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                    
                                    {/* Indicators */}
                                    <div className="absolute bottom-3 left-6 flex space-x-1.5 z-20">
                                        {BANNERS.map((_, idx) => (
                                            <div 
                                                key={idx} 
                                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentBannerIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* --- TRUSTED PARTNERS (Marquee) --- */}
                            <div className="px-6 pb-24">
                                <div className="flex justify-between items-end mb-4">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Đối tác tin cậy</h3>
                                    <span className="text-[10px] font-bold text-[#0095FF]">Xem tất cả</span>
                                </div>
                                
                                <div className="relative w-full overflow-hidden">
                                    {/* Left/Right Fade Gradients */}
                                    <div className={`absolute top-0 bottom-0 left-0 w-12 z-10 bg-gradient-to-r ${isDarkMode ? 'from-slate-900' : 'from-[#F0F4F8]'} to-transparent`} />
                                    <div className={`absolute top-0 bottom-0 right-0 w-12 z-10 bg-gradient-to-l ${isDarkMode ? 'from-slate-900' : 'from-[#F0F4F8]'} to-transparent`} />

                                    <div className="flex w-max animate-infinite-scroll hover:pause">
                                        {/* Original Set */}
                                        <div className="flex gap-4 pr-4">
                                            {PARTNERS.map((p) => (
                                                <div key={p.id} className={`flex flex-col items-center justify-center w-28 h-24 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                                    <div className={`p-2.5 rounded-full mb-2 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'} ${p.color}`}>
                                                        <p.icon size={20} />
                                                    </div>
                                                    <span className={`text-[9px] font-bold text-center leading-tight px-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Duplicate Set for Loop */}
                                        <div className="flex gap-4 pr-4">
                                            {PARTNERS.map((p) => (
                                                <div key={`dup-${p.id}`} className={`flex flex-col items-center justify-center w-28 h-24 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                                    <div className={`p-2.5 rounded-full mb-2 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'} ${p.color}`}>
                                                        <p.icon size={20} />
                                                    </div>
                                                    <span className={`text-[9px] font-bold text-center leading-tight px-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    )}

                    {/* 2. RECORDS TAB (Restored) */}
                    {currentTab === 'records' && (
                        <motion.div key="records" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h2 className="text-2xl font-black text-slate-800">Hồ Sơ Y Tế</h2>
                                <button className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-blue-500"><Settings size={20}/></button>
                            </div>

                            {/* Summary Cards */}
                            {diagnosisHistory.length > 0 && (
                                <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                        <div className="p-2 bg-blue-50 rounded-xl w-fit text-blue-500 mb-2"><Activity size={18}/></div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Tổng số lần khám</p>
                                        <p className="text-2xl font-black text-slate-800">{diagnosisHistory.length}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                        <div className="p-2 bg-green-50 rounded-xl w-fit text-green-500 mb-2"><Calendar size={18}/></div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Lần khám cuối</p>
                                        <p className="text-xl font-bold text-slate-800 truncate">{new Date(diagnosisHistory[0].date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}

                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 shrink-0">Lịch sử khám bệnh</h3>
                            
                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pb-24">
                                {diagnosisHistory.length === 0 ? (
                                    <div className="text-center py-20 opacity-50 flex flex-col items-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                            <FileText size={40} strokeWidth={1.5}/>
                                        </div>
                                        <p className="font-bold text-sm text-slate-400">Chưa có hồ sơ nào</p>
                                    </div>
                                ) : (
                                    diagnosisHistory.map((rec) => {
                                        const gradeInfo = getGradeInfo(rec.grade);
                                        return (
                                            <div 
                                                key={rec.id} 
                                                onClick={() => setViewingRecord(rec)}
                                                className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow group"
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${gradeInfo.color.split(' ')[0]} ${gradeInfo.color.split(' ')[1]}`}>
                                                    <span className="text-xs font-bold uppercase">{new Date(rec.date).toLocaleDateString('vi-VN', {month: 'short'})}</span>
                                                    <span className="text-lg font-black">{new Date(rec.date).getDate()}</span>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase border ${gradeInfo.color}`}>
                                                            {gradeInfo.label}
                                                        </span>
                                                        {rec.imageUrl && <ImageIcon size={12} className="text-slate-400"/>}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 truncate">
                                                        {rec.doctorNotes ? "Có chỉ định của bác sĩ" : "Đã có kết quả AI"}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium truncate">
                                                        Bác sĩ chuyên khoa mắt • {rec.confidence ? `${(rec.confidence * 100).toFixed(0)}% AI Confidence` : 'Manual'}
                                                    </p>
                                                </div>
                                                
                                                <div className="p-2 rounded-full text-slate-300 group-hover:text-[#0095FF] group-hover:bg-blue-50 transition-colors">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* 3. SCHEDULE TAB (Restored) */}
                    {currentTab === 'schedule' && (
                        <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-slate-800">Lịch Trình</h2>
                                <button onClick={() => setIsBookModalOpen(true)} className="w-12 h-12 bg-[#0095FF] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-400/30 hover:scale-110 transition-transform"><Plus size={24}/></button>
                            </div>
                            
                            <div className="bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-100 flex mb-6">
                                <button onClick={() => setScheduleFilter('ongoing')} className={`flex-1 py-3 text-xs font-bold uppercase rounded-[1.2rem] transition-all ${scheduleFilter === 'ongoing' ? 'bg-[#0095FF] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Sắp tới</button>
                                <button onClick={() => setScheduleFilter('completed')} className={`flex-1 py-3 text-xs font-bold uppercase rounded-[1.2rem] transition-all ${scheduleFilter === 'completed' ? 'bg-[#0095FF] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Đã xong</button>
                            </div>

                            <div className="space-y-4">
                                {myAppointments.filter(a => scheduleFilter === 'ongoing' ? a.status !== 'Done' : a.status === 'Done').map(appt => (
                                    <div key={appt.id} className="bg-white p-5 rounded-[2rem] shadow-lg shadow-slate-200/50 border border-slate-50 flex items-center gap-5">
                                        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-[#0095FF]`}>
                                            <span className="text-[10px] font-black uppercase tracking-wider">{new Date(appt.date).toLocaleDateString('vi-VN', {weekday: 'short'})}</span>
                                            <span className="text-xl font-black leading-none">{new Date(appt.date).getDate()}</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 text-sm mb-1">{appt.title}</h4>
                                            <div className="flex items-center text-xs text-slate-400 font-bold gap-2">
                                                <span className="flex items-center bg-slate-100 px-2 py-0.5 rounded"><Clock size={10} className="mr-1"/> {appt.startTime}:00</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>{appt.patientName}</span>
                                            </div>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full ${
                                            appt.status === 'Done' ? 'bg-green-500' : 
                                            appt.status === 'In Progress' ? 'bg-blue-500' : 'bg-orange-400'
                                        }`}></div>
                                    </div>
                                ))}
                                {myAppointments.length === 0 && <p className="text-center text-slate-400 text-xs mt-10 font-bold uppercase tracking-widest">Chưa có lịch hẹn nào.</p>}
                            </div>
                        </motion.div>
                    )}

                    {/* 4. CHAT TAB (Restored) */}
                    {currentTab === 'chat' && (
                        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[75vh] flex flex-col bg-white rounded-[2.5rem] shadow-2xl mx-4 overflow-hidden border border-slate-100">
                            {/* Chat Header */}
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex gap-2 w-full p-1 bg-white rounded-xl shadow-sm">
                                    <button onClick={() => setChatMode('doctor')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${chatMode === 'doctor' ? 'bg-[#0095FF] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Bác Sĩ</button>
                                    <button onClick={() => setChatMode('ai')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${chatMode === 'ai' ? 'bg-[#8E44AD] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Trợ lý AI</button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
                                {(chatMode === 'doctor' ? messages : aiMessages).map((msg, i) => {
                                    const isMe = chatMode === 'doctor' ? msg.senderId === currentUser?.uid : msg.sender === 'user';
                                    return (
                                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm font-medium ${
                                                isMe 
                                                ? (chatMode === 'doctor' ? 'bg-[#0095FF]' : 'bg-[#8E44AD]') + ' text-white rounded-br-none' 
                                                : 'bg-white text-slate-600 rounded-bl-none border border-slate-100'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    );
                                })}
                                {isAiThinking && <div className="flex justify-start"><div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm"><Loader2 size={16} className="animate-spin text-[#8E44AD]"/></div></div>}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-slate-100">
                                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-full border border-slate-100">
                                    <input 
                                        className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder-slate-400 text-slate-800 font-medium"
                                        placeholder="Nhập tin nhắn..."
                                        value={inputMsg}
                                        onChange={e => setInputMsg(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (chatMode === 'doctor' ? handleSendMessage() : handleSendAI())}
                                    />
                                    <button 
                                        onClick={chatMode === 'doctor' ? handleSendMessage : handleSendAI}
                                        disabled={!inputMsg.trim()}
                                        className={`p-3 rounded-full text-white transition-all shadow-md hover:scale-105 active:scale-95 ${!inputMsg.trim() ? 'bg-slate-300' : (chatMode === 'doctor' ? 'bg-[#0095FF]' : 'bg-[#8E44AD]')}`}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 5. PROFILE TAB (REDESIGNED) */}
                    {currentTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-[#F2F4F7]">
                            <div className="px-6 py-6 space-y-6 pb-32">
                                
                                {/* Info Banner */}
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                    <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 shrink-0 mt-0.5">
                                        <Activity size={14} />
                                    </div>
                                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                        Vui lòng cung cấp thông tin chính xác để được phục vụ tốt nhất. Hồ sơ này sẽ được chia sẻ với bác sĩ của bạn.
                                    </p>
                                </div>

                                {/* Header with Avatar */}
                                <div className="flex flex-col items-center mb-4">
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-28 h-28 rounded-full border-4 border-white shadow-xl cursor-pointer group"
                                    >
                                        <img 
                                            src={userProfile?.photoURL || "https://ui-avatars.com/api/?name=User&background=random"} 
                                            className={`w-full h-full rounded-full object-cover transition-opacity ${isAvatarUploading ? 'opacity-50' : ''}`} 
                                            alt="Profile" 
                                        />
                                        <div className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white border-2 border-white">
                                            <Camera size={16} />
                                        </div>
                                        {isAvatarUploading && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 size={24} className="animate-spin text-blue-600"/>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-3 tracking-widest">
                                        {userProfile?.displayName || 'Cập nhật ảnh đại diện'}
                                    </p>
                                </div>

                                {/* SECTION 1: GENERAL INFO */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 border-l-4 border-blue-500 pl-3">Thông tin chung</h3>
                                    
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Họ và tên (có dấu) <span className="text-red-500">*</span></label>
                                            <input 
                                                value={editForm.displayName}
                                                onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                                                placeholder="Nhập họ và tên (ví dụ: Nguyễn Văn A)"
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-bold text-slate-700 mb-2 block">Ngày sinh <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="date"
                                                    value={editForm.dob}
                                                    onChange={e => setEditForm({...editForm, dob: e.target.value})}
                                                    className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-bold text-slate-700 mb-2 block">Giới tính <span className="text-red-500">*</span></label>
                                                <select 
                                                    value={editForm.gender}
                                                    onChange={e => setEditForm({...editForm, gender: e.target.value})}
                                                    className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                                                >
                                                    <option>Nam</option>
                                                    <option>Nữ</option>
                                                    <option>Khác</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Mã định danh/CCCD <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <div className="absolute left-0 top-0 bottom-0 px-4 bg-slate-100 rounded-l-xl flex items-center border-r border-slate-200">
                                                    <span className="text-xs font-bold text-slate-600">CCCD</span>
                                                </div>
                                                <input 
                                                    value={editForm.identityCard}
                                                    onChange={e => setEditForm({...editForm, identityCard: e.target.value})}
                                                    placeholder="Nhập Mã định danh/CCCD"
                                                    className="w-full p-4 pl-20 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                            <p className="text-[10px] text-red-400 mt-1 italic">Vui lòng nhập đúng thông tin để không bị bệnh viện từ chối</p>
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Mã bảo hiểm y tế</label>
                                            <input 
                                                value={editForm.insuranceId}
                                                onChange={e => setEditForm({...editForm, insuranceId: e.target.value})}
                                                placeholder="Mã bảo hiểm y tế"
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Nghề nghiệp <span className="text-red-500">*</span></label>
                                            <input 
                                                value={editForm.job}
                                                onChange={e => setEditForm({...editForm, job: e.target.value})}
                                                placeholder="Chọn nghề nghiệp"
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Số điện thoại <span className="text-red-500">*</span></label>
                                            <div className="flex">
                                                <div className="p-4 bg-slate-50 border border-r-0 border-gray-200 rounded-l-xl flex items-center gap-2">
                                                    <span className="text-lg">🇻🇳</span> <span className="text-sm font-bold">+84</span>
                                                </div>
                                                <input 
                                                    value={editForm.phone}
                                                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                                    placeholder="09xxxxxxxx"
                                                    className="flex-1 p-4 rounded-r-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Email (dùng để nhận phiếu khám)</label>
                                            <input 
                                                value={editForm.email}
                                                onChange={e => setEditForm({...editForm, email: e.target.value})}
                                                placeholder="Email"
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Quốc gia <span className="text-red-500">*</span></label>
                                            <select 
                                                value={editForm.country}
                                                onChange={e => setEditForm({...editForm, country: e.target.value})}
                                                className="w-full p-4 rounded-xl border border-blue-500 bg-white text-slate-800 font-medium outline-none transition-colors appearance-none"
                                            >
                                                <option>Việt Nam</option>
                                                <option>Khác</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Dân tộc <span className="text-red-500">*</span></label>
                                            <input 
                                                value={editForm.ethnicity}
                                                onChange={e => setEditForm({...editForm, ethnicity: e.target.value})}
                                                placeholder="Chọn Dân tộc"
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 2: ADDRESS */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 border-l-4 border-blue-500 pl-3">Địa chỉ trên CCCD (3 cấp)</h3>
                                    
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Tỉnh/Thành phố <span className="text-red-500">*</span></label>
                                            <input 
                                                value={editForm.province}
                                                onChange={e => setEditForm({...editForm, province: e.target.value})}
                                                placeholder="Chọn Tỉnh/Thành phố"
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Quận/Huyện <span className="text-red-500">*</span></label>
                                            <input 
                                                value={editForm.district}
                                                onChange={e => setEditForm({...editForm, district: e.target.value})}
                                                placeholder="Chọn Quận/Huyện"
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Phường/Xã <span className="text-red-500">*</span></label>
                                            <input 
                                                value={editForm.ward}
                                                onChange={e => setEditForm({...editForm, ward: e.target.value})}
                                                placeholder="Chọn Phường/Xã"
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Số nhà/Tên đường/Ấp thôn xóm(tổ) <span className="text-red-500">*</span></label>
                                            <p className="text-[10px] text-red-400 mb-2 italic">(không nhập tỉnh/thành, quận/huyện, phường/xã)</p>
                                            <textarea 
                                                value={editForm.streetAddress}
                                                onChange={e => setEditForm({...editForm, streetAddress: e.target.value})}
                                                placeholder="Chỉ nhập số nhà, tên đường, ấp thôn xóm,..."
                                                rows={2}
                                                className="w-full p-4 rounded-xl border border-gray-200 bg-white text-slate-800 font-medium outline-none focus:border-blue-500 transition-colors resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* DOCTOR LINK SECTION (Simplified for this view) */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-purple-500 pl-3">Kết nối Bác sĩ</h3>
                                    <div className="flex gap-2">
                                        <input 
                                            value={editForm.doctorEmail}
                                            onChange={e => setEditForm({...editForm, doctorEmail: e.target.value})}
                                            placeholder="Email bác sĩ (nếu có)"
                                            className="flex-1 p-3 rounded-xl border border-gray-200 text-sm outline-none"
                                        />
                                        <button 
                                            onClick={handleConnectDoctor}
                                            disabled={isLinkingDoctor}
                                            className="bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase disabled:opacity-50"
                                        >
                                            {isLinkingDoctor ? <Loader2 className="animate-spin" size={16}/> : 'Link'}
                                        </button>
                                    </div>
                                    {assignedDoctorId && <p className="text-xs text-green-600 mt-2 font-bold flex items-center"><Check size={12} className="mr-1"/> Đã liên kết</p>}
                                </div>

                                <button onClick={onLogout} className="w-full py-4 rounded-[1.5rem] bg-slate-200 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-red-100 hover:text-red-500 transition-colors flex items-center justify-center gap-2">
                                    <LogOut size={16}/> Đăng xuất tài khoản
                                </button>

                            </div>

                            {/* FLOATING ACTION BUTTON (SAVE) */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleUpdateProfile}
                                disabled={isSavingProfile}
                                className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-[#FF8E3D] rounded-full shadow-2xl shadow-orange-500/40 flex items-center justify-center text-white z-50 hover:scale-110 transition-transform"
                            >
                                {isSavingProfile ? <Loader2 className="animate-spin" size={24}/> : <Save size={24} />}
                            </motion.button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* --- BOTTOM NAV (Floating Style) --- */}
            <div className="fixed bottom-6 left-6 right-6 z-40">
                <nav className="flex justify-around items-center h-20 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 px-4 border border-white">
                    <TabButton id="home" icon={Home} label="Trang chủ" currentTab={currentTab} setCurrentTab={setCurrentTab} />
                    <TabButton id="records" icon={FileText} label="Hồ sơ" currentTab={currentTab} setCurrentTab={setCurrentTab} />
                    <TabButton id="schedule" icon={Calendar} label="Phiếu khám" currentTab={currentTab} setCurrentTab={setCurrentTab} badge={myAppointments.filter(a => a.status === 'Pending').length} />
                    <TabButton id="chat" icon={MessageCircle} label="Tư vấn" currentTab={currentTab} setCurrentTab={setCurrentTab} badge={0} />
                    <TabButton id="profile" icon={UserIcon} label="Cá nhân" currentTab={currentTab} setCurrentTab={setCurrentTab} />
                </nav>
            </div>

            {/* ... (Keep existing Modals: Booking, Record Detail) ... */}
            {/* --- BOOKING MODAL --- */}
            <AnimatePresence>
                {isBookModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsBookModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{y:100, opacity: 0}} animate={{y:0, opacity: 1}} exit={{y:100, opacity: 0}} className="relative w-full max-w-sm bg-[#F8FAFC] p-8 rounded-[2.5rem] shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-slate-800">Đặt Lịch Mới</h3>
                                <button onClick={() => setIsBookModalOpen(false)} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"><X size={20} className="text-slate-500"/></button>
                            </div>
                            <form onSubmit={handleBooking} className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block tracking-widest">Lý do khám</label>
                                    <select value={selectedReasonType} onChange={e => setSelectedReasonType(e.target.value)} className="w-full p-4 rounded-2xl bg-white border border-slate-100 outline-none text-sm font-bold text-slate-700 shadow-sm">{APPOINTMENT_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block tracking-widest">Ngày khám</label>
                                    <input required type="date" value={newBookDate} onChange={e => setNewBookDate(e.target.value)} className="w-full p-4 rounded-2xl bg-white border border-slate-100 outline-none text-sm font-bold text-slate-700 shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block tracking-widest">Giờ khám</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {AVAILABLE_HOURS.map(h => (
                                            <button key={h} type="button" onClick={() => setSelectedTimeSlot(h)} className={`py-3 rounded-xl font-bold text-xs transition-all ${selectedTimeSlot === h ? 'bg-[#0095FF] text-white shadow-lg transform scale-105' : 'bg-white text-slate-500 border border-slate-100'}`}>{h}:00</button>
                                        ))}
                                    </div>
                                </div>
                                <textarea placeholder="Mô tả triệu chứng..." value={newBookReason} onChange={e => setNewBookReason(e.target.value)} className="w-full p-4 rounded-2xl bg-white border border-slate-100 h-24 outline-none text-sm resize-none font-medium shadow-sm placeholder-slate-300" />
                                <button type="submit" className="w-full py-5 bg-[#0095FF] text-white font-bold rounded-[1.5rem] uppercase text-xs tracking-widest shadow-xl shadow-blue-400/30 hover:brightness-110 active:scale-95 transition-all">Xác nhận đặt lịch</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- RECORD DETAIL MODAL (Enhanced functionality) --- */}
            <AnimatePresence>
                {viewingRecord && (
                    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center sm:p-4">
                        <motion.div 
                            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} 
                            onClick={() => setViewingRecord(null)} 
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{y: '100%'}} animate={{y: 0}} exit={{y: '100%'}} 
                            className="relative w-full max-w-lg bg-[#F8FAFC] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Chi tiết hồ sơ</p>
                                    <h3 className="text-xl font-black text-slate-800">{new Date(viewingRecord.date).toLocaleDateString('vi-VN')}</h3>
                                </div>
                                <button onClick={() => setViewingRecord(null)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100"><X size={20}/></button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                {/* Image Section */}
                                {viewingRecord.imageUrl ? (
                                    <div className="w-full h-56 rounded-3xl overflow-hidden bg-slate-900 relative group shadow-lg">
                                        <img src={viewingRecord.imageUrl} className="w-full h-full object-contain" alt="Scan result"/>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                            <button className="text-white text-xs font-bold flex items-center bg-white/20 backdrop-blur px-3 py-1.5 rounded-full"><Download size={12} className="mr-1"/> Tải ảnh</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-32 rounded-3xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                                        <ImageIcon size={32} className="mb-2 opacity-50"/>
                                        <span className="text-xs font-bold uppercase">Không có hình ảnh</span>
                                    </div>
                                )}

                                {/* Status Card */}
                                <div className={`p-5 rounded-3xl border-2 ${getGradeInfo(viewingRecord.grade).color} bg-opacity-10 bg-white`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        {React.createElement(getGradeInfo(viewingRecord.grade).icon, { size: 24 })}
                                        <span className="font-black text-lg uppercase tracking-tight">Kết quả: {getGradeInfo(viewingRecord.grade).label}</span>
                                    </div>
                                    <p className="text-xs opacity-80 font-medium ml-9">Độ tin cậy của AI: {(viewingRecord.confidence * 100).toFixed(1)}%</p>
                                </div>

                                {/* DOCTOR NOTES - Crucial for "Linked" feel */}
                                {viewingRecord.doctorNotes && (
                                    <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 relative overflow-hidden">
                                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-100 rounded-full opacity-50 blur-2xl"></div>
                                        <div className="flex items-center gap-2 mb-3 text-blue-600">
                                            <div className="p-1.5 bg-blue-100 rounded-lg"><UserIcon size={14}/></div>
                                            <h4 className="font-bold text-sm uppercase tracking-wide">Chỉ định của bác sĩ</h4>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium bg-white/50 p-3 rounded-xl border border-blue-100/50">
                                            "{viewingRecord.doctorNotes}"
                                        </p>
                                        <div className="mt-3 flex gap-2">
                                            <button 
                                                onClick={() => { setViewingRecord(null); setCurrentTab('chat'); }}
                                                className="text-[10px] font-bold text-white bg-blue-500 px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                                            >
                                                Chat với Bác sĩ
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* AI Analysis */}
                                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3 text-purple-600">
                                        <div className="p-1.5 bg-purple-50 rounded-lg"><Activity size={14}/></div>
                                        <h4 className="font-bold text-sm uppercase tracking-wide">Chi tiết phân tích AI</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {viewingRecord.note || "Không có chi tiết bổ sung."}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default PatientDashboard;
