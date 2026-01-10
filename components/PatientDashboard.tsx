
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Appointment, DiagnosisRecord, ChatMessage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
    Activity, Calendar, FileText, MessageCircle, LogOut, Sun, Moon, Home, 
    ChevronRight, Bell, User as UserIcon, Send, X, Loader2, Stethoscope, 
    AlertTriangle, RefreshCw, Check, ArrowLeft, Eye, Sparkles, Bot, 
    Image as ImageIcon, Plus, Search, Settings, Shield, HelpCircle, Globe, ChevronDown
} from 'lucide-react';
import { User } from 'firebase/auth';
import { subscribeToPatientAppointments, addAppointment } from '../services/scheduleService';
import { subscribeToMessages, sendMessage, getChatId, setTypingStatus, subscribeToChatMetadata } from '../services/chatService';
import { checkAndAutoLinkPatient } from '../services/patientService'; 
import { updateUserProfile, uploadUserImage } from '../services/userService'; 
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
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

// --- UI COMPONENTS ---

const TabButton = ({ id, icon: Icon, label, currentTab, setCurrentTab, isDarkMode }: { id: TabID, icon: any, label: string, currentTab: TabID, setCurrentTab: (id: TabID) => void, isDarkMode: boolean }) => (
    <button 
        onClick={() => setCurrentTab(id)}
        className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 relative group`}
    >
        <div className={`p-2 rounded-2xl mb-1 transition-all duration-300 ${currentTab === id ? 'bg-blue-600 text-white -translate-y-2 shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <Icon size={20} strokeWidth={currentTab === id ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] font-bold transition-opacity duration-300 ${currentTab === id ? 'opacity-100 text-blue-600 dark:text-blue-400' : 'opacity-0 h-0'}`}>{label}</span>
    </button>
);

const FeatureCard = ({ icon: Icon, title, subtitle, color, onClick }: any) => (
    <motion.div 
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`p-5 rounded-[2rem] ${color} text-white shadow-lg cursor-pointer relative overflow-hidden h-40 flex flex-col justify-between`}
    >
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
        <div className="p-3 bg-white/20 backdrop-blur-md w-fit rounded-full">
            <Icon size={24} />
        </div>
        <div>
            <h3 className="font-bold text-lg leading-tight">{title}</h3>
            <p className="text-xs opacity-80 mt-1">{subtitle}</p>
        </div>
    </motion.div>
);

const AppointmentCard: React.FC<{ appt: Appointment, isDarkMode: boolean }> = ({ appt, isDarkMode }) => (
    <div className={`p-5 rounded-[1.5rem] mb-4 flex items-center gap-4 border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}>
        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-orange-50 text-orange-500'}`}>
            <span className="text-xs font-bold uppercase">{new Date(appt.date).toLocaleDateString('vi-VN', {weekday: 'short'})}</span>
            <span className="text-xl font-black">{new Date(appt.date).getDate()}</span>
        </div>
        <div className="flex-1">
            <h4 className="font-bold text-sm mb-1 line-clamp-1">{appt.title}</h4>
            <div className="flex items-center text-xs opacity-60 gap-2">
                <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(appt.date).toLocaleDateString('vi-VN')}</span>
                <span>•</span>
                <span className="flex items-center"><Activity size={12} className="mr-1"/> {appt.startTime}:00</span>
            </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
            appt.status === 'Done' ? 'bg-green-100 text-green-600' : 
            appt.status === 'In Progress' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
        }`}>
            {appt.status === 'Pending' ? 'Chờ' : appt.status === 'Done' ? 'Xong' : 'Khám'}
        </div>
    </div>
);

const SettingItem = ({ icon: Icon, label, value, isDarkMode, onClick }: any) => (
    <div onClick={onClick} className={`flex items-center justify-between p-4 rounded-2xl mb-2 cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
        <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <Icon size={18} />
            </div>
            <span className="font-bold text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs opacity-50 font-medium">{value}</span>}
            <ChevronRight size={16} className="opacity-30" />
        </div>
    </div>
);

const PatientDashboard: React.FC<PatientDashboardProps> = ({ isDarkMode, currentUser, userProfile, onLogout, toggleTheme }) => {
    const { t, language } = useLanguage();
    const [currentTab, setCurrentTab] = useState<TabID>('home');
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisRecord[]>([]);
    const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);
    const [scheduleFilter, setScheduleFilter] = useState<'ongoing' | 'completed'>('ongoing');
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    
    // Booking State
    const [newBookDate, setNewBookDate] = useState("");
    const [newBookReason, setNewBookReason] = useState(""); 
    const [selectedReasonType, setSelectedReasonType] = useState(APPOINTMENT_TYPES[0]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(9); 

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [chatMode, setChatMode] = useState<'doctor' | 'ai'>('doctor');
    const [aiMessages, setAiMessages] = useState<{id: string, text: string, sender: 'user'|'ai', timestamp: Date}[]>([
        { id: 'welcome', text: "Xin chào! Tôi là Trợ lý AI. Bạn cần tư vấn gì về mắt hôm nay?", sender: 'ai', timestamp: new Date() }
    ]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Profile State
    const [isSyncing, setIsSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!currentUser) return;
        const unsubAppt = subscribeToPatientAppointments(currentUser.uid, (data) => setMyAppointments(data), (err) => console.error(err));
        const q = query(collection(db, "patients"), where("uid", "==", currentUser.uid), limit(1));
        const unsubPatientData = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const patientDoc = snapshot.docs[0].data();
                if (patientDoc.diagnosisHistory) setDiagnosisHistory(patientDoc.diagnosisHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
        });
        return () => { unsubAppt(); unsubPatientData(); };
    }, [currentUser]);

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
                config: { systemInstruction: "Bạn là trợ lý y tế ảo thân thiện. Trả lời ngắn gọn bằng tiếng Việt về sức khỏe mắt." }
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

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && currentUser) {
            try {
                const url = await uploadUserImage(currentUser.uid, e.target.files[0], 'avatar');
                await updateUserProfile(currentUser.uid, { photoURL: url });
            } catch (e) { console.error(e); }
        }
    };

    // --- STYLES ---
    const bgMain = isDarkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900";
    const cardBg = isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-100 shadow-sm";

    return (
        <div className={`h-screen w-full flex flex-col ${bgMain} font-sans overflow-hidden`}>
            
            {/* --- TOP HEADER (Dynamic) --- */}
            <header className={`px-6 py-4 flex justify-between items-center z-10 shrink-0 ${currentTab === 'home' ? 'bg-transparent' : (isDarkMode ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-100')}`}>
                {currentTab === 'home' ? (
                    <div className="flex flex-col">
                        <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-1">Xin chào,</p>
                        <h1 className="text-xl font-black">{userProfile?.displayName?.split(' ').pop()}! 👋</h1>
                    </div>
                ) : (
                    <h1 className="text-lg font-black uppercase tracking-wide">
                        {currentTab === 'schedule' && 'Lịch Của Tôi'}
                        {currentTab === 'records' && 'Hồ Sơ Y Tế'}
                        {currentTab === 'chat' && 'Tư Vấn Trực Tuyến'}
                        {currentTab === 'profile' && 'Cài Đặt'}
                    </h1>
                )}
                
                <div 
                    onClick={() => setCurrentTab('profile')}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg cursor-pointer"
                >
                    <img src={userProfile?.photoURL || "https://ui-avatars.com/api/?name=User&background=random"} className="w-full h-full object-cover"/>
                </div>
            </header>

            {/* --- MAIN CONTENT SCROLLABLE --- */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-24">
                <AnimatePresence mode="wait">
                    
                    {/* 1. HOME TAB */}
                    {currentTab === 'home' && (
                        <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            
                            {/* Fake Search Bar */}
                            <div className={`flex items-center px-4 py-3 rounded-2xl ${cardBg}`}>
                                <Search size={18} className="opacity-40 mr-3"/>
                                <span className="text-sm opacity-40 font-medium">Tìm kiếm dịch vụ...</span>
                            </div>

                            {/* Hero Card */}
                            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 overflow-hidden shadow-2xl shadow-indigo-500/30">
                                <div className="relative z-10 w-2/3">
                                    <h2 className="text-2xl font-black mb-2 leading-tight">Chăm sóc mắt <br/>toàn diện</h2>
                                    <p className="text-xs opacity-80 mb-6 font-medium">Đặt lịch khám và theo dõi sức khỏe ngay trên ứng dụng.</p>
                                    <button onClick={() => setIsBookModalOpen(true)} className="bg-white text-indigo-600 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
                                        Đặt lịch ngay
                                    </button>
                                </div>
                                <img 
                                    src="https://cdn3d.iconscout.com/3d/premium/thumb/medical-checkup-4852332-4043939.png" 
                                    className="absolute -right-4 -bottom-4 w-40 h-40 object-contain drop-shadow-2xl opacity-90"
                                    alt="Doctor 3D"
                                />
                            </div>

                            {/* Categories / Actions */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Dịch vụ</h3>
                                    <span className="text-xs font-bold text-blue-500">Xem tất cả</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FeatureCard 
                                        icon={Calendar} 
                                        title="Lịch hẹn" 
                                        subtitle={`${myAppointments.filter(a=>a.status!=='Done').length} sắp tới`} 
                                        color="bg-gradient-to-br from-blue-400 to-blue-600"
                                        onClick={() => setCurrentTab('schedule')}
                                    />
                                    <FeatureCard 
                                        icon={MessageCircle} 
                                        title="Tư vấn" 
                                        subtitle="Chat Bác sĩ/AI" 
                                        color="bg-gradient-to-br from-orange-400 to-pink-500"
                                        onClick={() => setCurrentTab('chat')}
                                    />
                                    <FeatureCard 
                                        icon={FileText} 
                                        title="Hồ sơ" 
                                        subtitle="Kết quả khám" 
                                        color="bg-gradient-to-br from-emerald-400 to-teal-500"
                                        onClick={() => setCurrentTab('records')}
                                    />
                                    <FeatureCard 
                                        icon={Settings} 
                                        title="Cá nhân" 
                                        subtitle="Cài đặt app" 
                                        color="bg-gradient-to-br from-slate-400 to-slate-600"
                                        onClick={() => setCurrentTab('profile')}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 2. RECORDS TAB (Professional) */}
                    {currentTab === 'records' && (
                        <motion.div key="records" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                <div className={`min-w-[140px] p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'} flex flex-col justify-center items-center`}>
                                    <span className="text-3xl font-black text-blue-600">{diagnosisHistory.length}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Lần khám</span>
                                </div>
                                <div className={`min-w-[140px] p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-100'} flex flex-col justify-center items-center`}>
                                    <span className="text-3xl font-black text-green-600">
                                        {diagnosisHistory.length > 0 && diagnosisHistory[0].grade === 0 ? 'Tốt' : 'Theo dõi'}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Tình trạng</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-4 mt-2">Lịch sử chẩn đoán</h3>
                            <div className="space-y-4">
                                {diagnosisHistory.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <FileText size={48} className="mx-auto mb-2"/>
                                        <p>Chưa có hồ sơ bệnh án</p>
                                    </div>
                                ) : (
                                    diagnosisHistory.map((rec) => (
                                        <div key={rec.id} className={`p-5 rounded-[1.5rem] border ${cardBg}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${rec.grade === 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {rec.grade === 0 ? 'Bình thường' : `Giai đoạn ${rec.grade}`}
                                                </div>
                                                <span className="text-xs font-bold opacity-50">{new Date(rec.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex gap-4">
                                                {rec.imageUrl ? (
                                                    <div className="w-20 h-20 rounded-xl bg-black overflow-hidden shrink-0">
                                                        <img src={rec.imageUrl} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                                        <ImageIcon size={24} className="opacity-20"/>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-xs opacity-70 line-clamp-3 leading-relaxed">
                                                        {rec.doctorNotes || rec.note || "Không có ghi chú thêm."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* 3. SCHEDULE TAB */}
                    {currentTab === 'schedule' && (
                        <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                                <button onClick={() => setScheduleFilter('ongoing')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${scheduleFilter === 'ongoing' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400'}`}>Sắp tới</button>
                                <button onClick={() => setScheduleFilter('completed')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${scheduleFilter === 'completed' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400'}`}>Đã xong</button>
                            </div>

                            <div className="space-y-2">
                                {myAppointments.filter(a => scheduleFilter === 'ongoing' ? a.status !== 'Done' : a.status === 'Done').map(appt => (
                                    <AppointmentCard key={appt.id} appt={appt} isDarkMode={isDarkMode} />
                                ))}
                                {myAppointments.filter(a => scheduleFilter === 'ongoing' ? a.status !== 'Done' : a.status === 'Done').length === 0 && (
                                    <div className="text-center py-10 opacity-50">
                                        <Calendar size={48} className="mx-auto mb-2"/>
                                        <p>Không có lịch hẹn nào</p>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setIsBookModalOpen(true)}
                                className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-20"
                            >
                                <Plus size={24} />
                            </button>
                        </motion.div>
                    )}

                    {/* 4. CHAT TAB */}
                    {currentTab === 'chat' && (
                        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col -m-6">
                            <div className={`p-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <button onClick={() => setChatMode('doctor')} className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase transition-all ${chatMode === 'doctor' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400'}`}>
                                        <Stethoscope size={14}/> Bác Sĩ
                                    </button>
                                    <button onClick={() => setChatMode('ai')} className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase transition-all ${chatMode === 'ai' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-400'}`}>
                                        <Sparkles size={14}/> Trợ lý AI
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black/20">
                                {(chatMode === 'doctor' ? messages : aiMessages).map((msg, i) => {
                                    const isMe = chatMode === 'doctor' ? msg.senderId === currentUser?.uid : msg.sender === 'user';
                                    return (
                                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                isMe 
                                                ? 'bg-blue-600 text-white rounded-br-none' 
                                                : (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800') + ' rounded-bl-none'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    );
                                })}
                                {isAiThinking && <div className="flex justify-start"><div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none"><Loader2 size={16} className="animate-spin text-purple-500"/></div></div>}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className={`p-3 ${isDarkMode ? 'bg-slate-900' : 'bg-white'} border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                <div className={`flex items-center gap-2 p-1 rounded-full border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <input 
                                        className="flex-1 bg-transparent px-4 py-2 text-sm outline-none"
                                        placeholder={chatMode === 'doctor' ? "Nhắn tin cho bác sĩ..." : "Hỏi AI về sức khỏe..."}
                                        value={inputMsg}
                                        onChange={e => setInputMsg(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (chatMode === 'doctor' ? handleSendMessage() : handleSendAI())}
                                    />
                                    <button 
                                        onClick={chatMode === 'doctor' ? handleSendMessage : handleSendAI}
                                        disabled={!inputMsg.trim()}
                                        className={`p-2.5 rounded-full text-white transition-all ${!inputMsg.trim() ? 'bg-slate-300' : (chatMode === 'doctor' ? 'bg-blue-600' : 'bg-purple-600')}`}
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 5. PROFILE / SETTINGS TAB */}
                    {currentTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <img src={userProfile?.photoURL || "https://ui-avatars.com/api/?name=User&background=random"} className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-xl" />
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Settings size={20} className="text-white"/>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black">{userProfile?.displayName}</h2>
                                    <p className="text-xs opacity-50">{userProfile?.email}</p>
                                    <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase">Bệnh nhân</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold uppercase opacity-50 mb-3 tracking-widest pl-2">Cài đặt chung</h3>
                                <div className={`rounded-[1.5rem] overflow-hidden ${cardBg}`}>
                                    <SettingItem icon={UserIcon} label="Thông tin tài khoản" value="Chỉnh sửa" isDarkMode={isDarkMode} />
                                    <SettingItem icon={Bell} label="Thông báo" isDarkMode={isDarkMode} />
                                    <SettingItem icon={Shield} label="Bảo mật & Quyền riêng tư" isDarkMode={isDarkMode} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold uppercase opacity-50 mb-3 tracking-widest pl-2">Ứng dụng</h3>
                                <div className={`rounded-[1.5rem] overflow-hidden ${cardBg}`}>
                                    <div onClick={toggleTheme} className={`flex items-center justify-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800`}>
                                        {isDarkMode ? <Sun className="mr-2"/> : <Moon className="mr-2"/>}
                                        <span className="font-bold text-sm">Giao diện: {isDarkMode ? 'Tối' : 'Sáng'}</span>
                                    </div>
                                    <SettingItem icon={Globe} label="Ngôn ngữ" value="Tiếng Việt" isDarkMode={isDarkMode} />
                                    <SettingItem icon={HelpCircle} label="Trợ giúp & Hỗ trợ" isDarkMode={isDarkMode} />
                                </div>
                            </div>

                            <button onClick={onLogout} className="w-full py-4 rounded-[1.5rem] bg-red-50 text-red-500 font-bold uppercase text-xs tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                <LogOut size={16}/> Đăng xuất
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* --- BOTTOM NAV (Floating Style) --- */}
            <div className="fixed bottom-6 left-6 right-6 md:left-1/2 md:w-96 md:-translate-x-1/2 z-40">
                <nav className={`flex justify-around items-center p-2 rounded-[2rem] shadow-2xl backdrop-blur-md border ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-white'}`}>
                    <TabButton id="home" icon={Home} label="Home" currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                    <TabButton id="records" icon={Activity} label="Hồ sơ" currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                    <TabButton id="schedule" icon={Calendar} label="Lịch" currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                    <TabButton id="chat" icon={MessageCircle} label="Chat" currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                    <TabButton id="profile" icon={UserIcon} label="Tôi" currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                </nav>
            </div>

            {/* --- BOOKING MODAL --- */}
            <AnimatePresence>
                {isBookModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsBookModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{y:100, opacity: 0}} animate={{y:0, opacity: 1}} exit={{y:100, opacity: 0}} className={`relative w-full max-w-sm p-6 rounded-[2rem] ${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-2xl`}>
                            <h3 className="text-xl font-black mb-6 text-center">Đặt Lịch Khám Mới</h3>
                            <form onSubmit={handleBooking} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 block">Lý do khám</label>
                                    <select value={selectedReasonType} onChange={e => setSelectedReasonType(e.target.value)} className={`w-full p-3 rounded-xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>{APPOINTMENT_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 block">Ngày khám</label>
                                    <input required type="date" value={newBookDate} onChange={e => setNewBookDate(e.target.value)} className={`w-full p-3 rounded-xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 block">Giờ khám</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {AVAILABLE_HOURS.map(h => (
                                            <button key={h} type="button" onClick={() => setSelectedTimeSlot(h)} className={`py-2 rounded-lg font-bold text-xs transition-all ${selectedTimeSlot === h ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800'}`}>{h}:00</button>
                                        ))}
                                    </div>
                                </div>
                                <textarea placeholder="Mô tả thêm triệu chứng..." value={newBookReason} onChange={e => setNewBookReason(e.target.value)} className={`w-full p-3 rounded-xl border h-20 outline-none text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl uppercase text-xs tracking-widest hover:bg-blue-700 shadow-xl transition-transform active:scale-95">Xác nhận đặt lịch</button>
                            </form>
                            <button onClick={() => setIsBookModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"><X size={16}/></button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default PatientDashboard;
