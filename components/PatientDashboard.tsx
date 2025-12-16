
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Appointment, DiagnosisRecord, ChatMessage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, Calendar, FileText, MessageCircle, LogOut, Settings, Sun, Moon, Home, Clock, ChevronRight, Bell, User as UserIcon, Send, CheckCircle, AlertCircle, TrendingUp, Plus, X, Globe, MapPin, Camera, Loader2, Stethoscope, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { User } from 'firebase/auth';
import SettingsView from './SettingsView';
import { subscribeToPatientAppointments, addAppointment } from '../services/scheduleService';
import { subscribeToMessages, sendMessage, getChatId } from '../services/chatService';
import { checkAndAutoLinkPatient } from '../services/patientService'; 
import { collection, query, where, getDocs, limit, onSnapshot, or } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PatientDashboardProps {
    isDarkMode: boolean;
    currentUser: User | null;
    userProfile: UserProfile | null;
    onLogout: () => void;
    toggleTheme: () => void;
}

type TabID = 'home' | 'records' | 'schedule' | 'chat' | 'profile';

const APPOINTMENT_TYPES = [
    "General Checkup", "Eye Pain", "Blurred Vision", "Redness", "Prescription", "Surgery Follow-up"
];

const AVAILABLE_HOURS = [8, 9, 10, 11, 13, 14, 15, 16];

const TabButton = ({ id, icon: Icon, label, currentTab, setCurrentTab, isDarkMode }: { id: TabID, icon: any, label: string, currentTab: TabID, setCurrentTab: (id: TabID) => void, isDarkMode: boolean }) => (
    <button 
        onClick={() => setCurrentTab(id)}
        className={`flex flex-col items-center justify-center w-full py-3 transition-all duration-300 ${currentTab === id ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : 'text-slate-400 hover:text-slate-500'}`}
    >
        <div className={`p-1.5 rounded-xl mb-1 transition-all ${currentTab === id ? (isDarkMode ? 'bg-blue-500/20 scale-110' : 'bg-blue-100 scale-110') : ''}`}>
            <Icon size={20} strokeWidth={currentTab === id ? 2.5 : 2} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
);

const RecordCard: React.FC<{ record: DiagnosisRecord; isDarkMode: boolean }> = ({ record, isDarkMode }) => (
    <div className={`p-4 rounded-2xl mb-4 border flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'}`}>
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                record.grade === 0 ? 'bg-emerald-100 text-emerald-600' : 
                record.grade <= 2 ? 'bg-blue-100 text-blue-600' : 
                'bg-red-100 text-red-600'
            }`}>
                {record.grade === 0 ? 'A' : record.grade <= 2 ? 'B' : 'C'}
            </div>
            <div>
                <p className="text-xs font-bold opacity-50 uppercase tracking-wider">{new Date(record.date).toLocaleDateString()}</p>
                <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {record.grade === 0 ? "Healthy Retina" : `Diabetic Retinopathy (Stage ${record.grade})`}
                </h4>
            </div>
        </div>
        <ChevronRight size={16} className="opacity-30" />
    </div>
);

const PatientDashboard: React.FC<PatientDashboardProps> = ({ isDarkMode, currentUser, userProfile, onLogout, toggleTheme }) => {
    const { t, language, setLanguage } = useLanguage();
    const [currentTab, setCurrentTab] = useState<TabID>('home');
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisRecord[]>([]);
    const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Add Appointment Modal
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [newBookDate, setNewBookDate] = useState("");
    const [newBookReason, setNewBookReason] = useState(""); 
    const [selectedReasonType, setSelectedReasonType] = useState(APPOINTMENT_TYPES[0]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(9); 
    
    // New Date Input Helper
    const dateInputRef = useRef<HTMLInputElement>(null);
    const openDatePicker = () => {
        try {
            dateInputRef.current?.showPicker(); // Modern API
        } catch {
            dateInputRef.current?.focus(); // Fallback
        }
    };

    // --- CHART DATA PROCESSING ---
    const chartData = useMemo(() => {
        if (!diagnosisHistory || diagnosisHistory.length === 0) return [];
        
        // Sort ascending by date
        const sorted = [...diagnosisHistory].sort((a,b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return sorted.map(rec => ({
            date: new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: new Date(rec.date).toLocaleDateString(),
            grade: rec.grade, // 0-4
            confidence: (rec.confidence * 100).toFixed(0),
            note: rec.grade === 0 ? "Healthy" : `Stage ${rec.grade}`
        }));
    }, [diagnosisHistory]);

    // --- AUTO-LINK EFFECT ---
    useEffect(() => {
        const attemptAutoLink = async () => {
            if (currentUser && userProfile && !userProfile.doctorUid) {
                const foundDoctorId = await checkAndAutoLinkPatient(currentUser, userProfile);
                if (foundDoctorId) {
                    setAssignedDoctorId(foundDoctorId);
                }
            } else if (userProfile?.doctorUid) {
                setAssignedDoctorId(userProfile.doctorUid);
            }
        };
        attemptAutoLink();
    }, [currentUser, userProfile]);

    // --- MANUAL SYNC FUNCTION ---
    const handleManualSync = async () => {
        if (!currentUser || !userProfile) return;
        setIsSyncing(true);
        try {
            const doctorId = await checkAndAutoLinkPatient(currentUser, userProfile);
            if (doctorId) {
                setAssignedDoctorId(doctorId);
            } else if (userProfile.doctorUid) {
                setAssignedDoctorId(userProfile.doctorUid);
            }
            await new Promise(resolve => setTimeout(resolve, 800));
            alert(t.patientDashboard.sync_success || "Data synchronized with Doctor.");
        } catch (error) {
            console.error("Sync failed", error);
            alert("Sync failed. Please try again.");
        } finally {
            setIsSyncing(false);
        }
    };

    // --- DATA FETCHING & SYNCHRONIZATION ---
    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const unsubAppt = subscribeToPatientAppointments(
                currentUser.uid, 
                    (data) => {
                        setMyAppointments(data);
                    }, 
                    (err) => {
                        if (err?.code !== 'permission-denied') console.error("Appointment fetch error", err);
                    }
                );

        let unsubPatientData: () => void = () => {};
        
        const fetchPatientData = async () => {
            let q;
            if (currentUser.uid) {
                 q = query(collection(db, "patients"), where("uid", "==", currentUser.uid), limit(1));
            } else if (currentUser.email) {
                 q = query(collection(db, "patients"), where("email", "==", currentUser.email), limit(1));
            } else {
                return;
            }
            
            unsubPatientData = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const patientDoc = snapshot.docs[0].data();
                    if (patientDoc.diagnosisHistory) {
                        setDiagnosisHistory(patientDoc.diagnosisHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    }
                    if (!userProfile?.doctorUid && patientDoc.doctorUid) {
                        setAssignedDoctorId(patientDoc.doctorUid);
                    }
                }
            }, (err) => {
                if (err?.code !== 'permission-denied') console.error(err);
            });
        };
        fetchPatientData();

        return () => {
            unsubAppt();
            unsubPatientData();
        };
    }, [currentUser, userProfile]);

    // --- CHAT SUBSCRIPTION ---
    useEffect(() => {
        if (currentUser && currentTab === 'chat' && assignedDoctorId) {
            const chatId = getChatId(currentUser.uid, assignedDoctorId);
            const unsubChat = subscribeToMessages(chatId, (msgs) => {
                setMessages(msgs);
            });
            return () => unsubChat();
        }
    }, [currentUser, currentTab, assignedDoctorId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentTab]);

    const handleSendMessage = async () => {
        if (!inputMsg.trim() || !currentUser || !assignedDoctorId) return;
        const chatId = getChatId(currentUser.uid, assignedDoctorId);
        await sendMessage(chatId, currentUser.uid, inputMsg);
        setInputMsg("");
    };

    const handleBookAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBookDate || !currentUser) return;
        
        if (!assignedDoctorId) {
            alert(language === 'vi' ? "Vui lòng liên kết với bác sĩ trước khi đặt lịch." : "Please link with a doctor before booking.");
            setCurrentTab('profile'); 
            return;
        }
        
        const finalTitle = newBookReason ? `${selectedReasonType}: ${newBookReason}` : selectedReasonType;

        try {
            await addAppointment({
                doctorId: assignedDoctorId, 
                patientId: currentUser.uid,
                patientName: userProfile?.displayName || currentUser.displayName || "Patient",
                title: finalTitle,
                type: 'Consult',
                date: newBookDate,
                startTime: selectedTimeSlot, 
                duration: 1,
                status: 'Pending',
                notes: newBookReason
            });
            alert(language === 'vi' ? "Yêu cầu đã gửi thành công! Bác sĩ sẽ xác nhận sớm." : "Appointment request sent! Doctor will confirm.");
            setIsBookModalOpen(false);
            setNewBookReason("");
            setNewBookDate("");
            setSelectedReasonType(APPOINTMENT_TYPES[0]);
        } catch (e) {
            alert("Failed to book.");
        }
    };

    const handleLogoutWrapper = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        try {
            await onLogout();
            setIsLoggingOut(false);
        } catch (e) {
            console.error(e);
            setIsLoggingOut(false);
        }
    };

    const latestScan = diagnosisHistory.length > 0 ? diagnosisHistory[0] : null;
    const heroBackground = userProfile?.bannerURL || "https://images.unsplash.com/photo-1519681393798-38e43269d877?q=80&w=2070&auto=format&fit=crop";
    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <div className={`h-screen w-full flex flex-col ${isDarkMode ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
            
            {/* --- HEADER --- */}
            <header className={`px-6 py-5 flex justify-between items-center z-10 ${isDarkMode ? 'bg-black' : 'bg-white'} border-b ${isDarkMode ? 'border-slate-900' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer" onClick={() => setCurrentTab('profile')}>
                        <img src={userProfile?.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} className="w-full h-full object-cover" alt="Profile"/>
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t.patientDashboard.welcome}</p>
                        <h1 className="text-sm font-black tracking-tight">{userProfile?.displayName || 'Patient'}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleManualSync} disabled={isSyncing} className={`p-2 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-900 text-blue-400 hover:bg-slate-800' : 'bg-slate-100 text-blue-600 hover:bg-slate-200'}`}>
                        <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')} className={`p-2 rounded-full flex items-center justify-center font-black text-[10px] w-9 h-9 border transition-all ${isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        {language.toUpperCase()}
                    </button>
                    <button onClick={toggleTheme} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-900 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
                        {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
                    </button>
                    <button className={`relative p-2 rounded-full ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        <Bell size={18} />
                        {myAppointments.some(a => a.status === 'Done') && <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>}
                    </button>
                </div>
            </header>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-0 relative">
                <AnimatePresence mode="wait">
                    
                    {/* VIEW: HOME */}
                    {currentTab === 'home' && (
                        <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative min-h-full flex flex-col">
                            <div className="relative w-full h-[500px] overflow-hidden rounded-b-[40px] shadow-2xl group">
                                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000" style={{ backgroundImage: `url('${heroBackground}')`, filter: isDarkMode ? 'brightness(0.6) saturate(1.2)' : 'brightness(1.05) saturate(1.1)' }} />
                                <div className={`absolute inset-0 bg-gradient-to-b transition-colors duration-1000 ${isDarkMode ? 'from-transparent via-indigo-950/50 to-slate-950/95' : 'from-transparent via-sky-200/20 to-sky-600/90'}`} />
                                <div className={`absolute inset-0 bg-gradient-to-r transition-colors duration-1000 ${isDarkMode ? 'from-slate-900/90 via-indigo-950/60 to-transparent' : 'from-sky-500/90 via-sky-400/50 to-transparent'}`} />
                                <div className={`absolute top-10 right-20 w-32 h-32 rounded-full blur-[60px] opacity-40 animate-pulse transition-colors duration-1000 ${isDarkMode ? 'bg-indigo-500' : 'bg-white'}`} />
                                <button onClick={() => setCurrentTab('profile')} className="absolute top-6 right-6 p-2.5 bg-black/20 backdrop-blur-md rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-all opacity-80 hover:opacity-100 z-30 border border-white/10 hover:scale-110">
                                    <Camera size={18} />
                                </button>
                                <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-12 max-w-2xl text-white">
                                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                        <div className="flex items-center space-x-2 mb-4">
                                            <div className="h-0.5 w-8 bg-white/60"></div>
                                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">{language === 'vi' ? 'HỆ THỐNG Y TẾ SỐ' : 'DIGITAL HEALTH SYSTEM'}</span>
                                        </div>
                                        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 drop-shadow-lg text-white">
                                            {language === 'vi' ? 'Sức Khỏe' : 'Health'} <br/>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200">{language === 'vi' ? 'Tầm Nhìn Mới' : 'Reimagined.'}</span>
                                        </h1>
                                        <p className="text-lg text-white/90 mb-8 max-w-md leading-relaxed font-medium drop-shadow-md">
                                            {language === 'vi' ? 'Theo dõi sức khỏe võng mạc, quản lý lịch hẹn và kết nối với bác sĩ chuyên khoa mọi lúc, mọi nơi.' : 'Track retina health, manage appointments, and connect with specialists anytime, anywhere.'}
                                        </p>
                                        <button onClick={() => setIsBookModalOpen(true)} className="px-8 py-4 bg-white text-blue-600 rounded-full font-bold uppercase text-xs tracking-widest hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all flex items-center w-max">
                                            {language === 'vi' ? 'Bắt Đầu Ngay' : 'Get Started'} <ChevronRight size={16} className="ml-2"/>
                                        </button>
                                    </motion.div>
                                </div>
                            </div>
                            <div className="px-6 -mt-16 relative z-20 pb-20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className={`p-6 rounded-3xl backdrop-blur-xl border shadow-xl flex items-center justify-between hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-700 hover:border-slate-600' : 'bg-white/80 border-white hover:border-blue-200'}`}>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">{language === 'vi' ? 'Kết quả gần nhất' : 'Latest Result'}</p>
                                            <h3 className={`text-xl font-bold ${latestScan?.grade === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                                {latestScan ? (latestScan.grade === 0 ? (language === 'vi' ? 'Võng Mạc Khỏe' : 'Healthy Retina') : `Grade ${latestScan.grade} DR`) : (language === 'vi' ? 'Chưa có dữ liệu' : 'No Data')}
                                            </h3>
                                            <p className="text-xs opacity-60 mt-1">{latestScan ? new Date(latestScan.date).toLocaleDateString() : (language === 'vi' ? 'Liên hệ bác sĩ để khám' : 'Contact doctor for scan')}</p>
                                        </div>
                                        <div className={`p-4 rounded-full ${latestScan?.grade === 0 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}><Activity size={24} /></div>
                                    </motion.div>
                                    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className={`p-6 rounded-3xl backdrop-blur-xl border shadow-xl flex items-center justify-between cursor-pointer hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-700 hover:border-slate-600' : 'bg-white/80 border-white hover:border-blue-200'}`} onClick={() => setCurrentTab('schedule')}>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">{language === 'vi' ? 'Lịch hẹn sắp tới' : 'Next Appointment'}</p>
                                            <h3 className="text-xl font-bold">{myAppointments.length > 0 ? new Date(myAppointments[0].date).toLocaleDateString() : (language === 'vi' ? 'Trống' : 'None')}</h3>
                                            <p className="text-xs opacity-60 mt-1">{myAppointments.length > 0 ? myAppointments[0].title : (language === 'vi' ? 'Đặt lịch ngay' : 'Book now')}</p>
                                        </div>
                                        <div className="p-4 rounded-full bg-blue-500/10 text-blue-500"><Calendar size={24} /></div>
                                    </motion.div>
                                </div>
                                <div className="mt-8">
                                    <h4 className="text-sm font-bold uppercase tracking-wider opacity-60 mb-4 ml-2">{language === 'vi' ? 'Dịch Vụ' : 'Services'}</h4>
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                        {[{ icon: MessageCircle, label: language === 'vi' ? 'Tư Vấn' : 'Chat Dr.', color: 'text-purple-500', action: () => setCurrentTab('chat') }, { icon: FileText, label: language === 'vi' ? 'Hồ Sơ' : 'Records', color: 'text-emerald-500', action: () => setCurrentTab('records') }, { icon: MapPin, label: language === 'vi' ? 'Phòng Khám' : 'Clinics', color: 'text-red-500', action: () => {} }, { icon: Globe, label: language === 'vi' ? 'Tin Tức' : 'News', color: 'text-blue-500', action: () => {} }].map((item, idx) => (
                                            <motion.button key={idx} whileHover={{ y: -5, scale: 1.05 }} onClick={item.action} className={`min-w-[100px] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border shadow-sm transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                                                <item.icon size={24} className={item.color} />
                                                <span className="text-xs font-bold">{item.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* VIEW: HEALTH RECORDS */}
                    {currentTab === 'records' && (
                        <motion.div key="records" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
                            <h2 className="text-2xl font-black mb-6">{t.patientDashboard.history}</h2>
                            
                            {/* --- CHART SECTION --- */}
                            {chartData.length > 0 && (
                                <div className={`mb-8 p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>{language === 'vi' ? 'Biểu Đồ Sức Khỏe' : 'Health Curve'}</h3>
                                        <TrendingUp size={18} className={isDarkMode ? 'text-teal-400' : 'text-teal-600'} />
                                    </div>
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorGradePatient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                                                <YAxis tickCount={5} domain={[0, 4]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                    itemStyle={{ color: isDarkMode ? '#fff' : '#000', fontSize: '12px', fontWeight: 'bold' }}
                                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                                />
                                                <Area type="monotone" dataKey="grade" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorGradePatient)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* --- RECORDS LIST --- */}
                            {diagnosisHistory.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <FileText size={48} className="mx-auto mb-4"/>
                                    <p>{language === 'vi' ? 'Chưa có hồ sơ bệnh án.' : 'No diagnosis history yet.'}</p>
                                    <p className="text-xs mt-2 text-slate-400">{language === 'vi' ? 'Hồ sơ sẽ xuất hiện khi Bác sĩ cập nhật.' : 'Records appear here when the Doctor updates them.'}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {diagnosisHistory.map((rec) => <RecordCard key={rec.id} record={rec} isDarkMode={isDarkMode} />)}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* VIEW: CHAT */}
                    {currentTab === 'chat' && (
                        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                            <div className={`p-4 shadow-sm border-b z-10 flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Stethoscope size={20} /></div>
                                    <div>
                                        <h3 className="text-sm font-bold">{userProfile?.hospital || (language === 'vi' ? 'Bác sĩ phụ trách' : 'Your Doctor')}</h3>
                                        <div className="flex items-center"><span className={`w-2 h-2 rounded-full mr-2 ${assignedDoctorId ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span><span className="text-[10px] opacity-60 uppercase font-bold tracking-wider">{assignedDoctorId ? (language === 'vi' ? 'Trực tuyến' : 'Online') : (language === 'vi' ? 'Chưa liên kết' : 'Not Linked')}</span></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 p-4 custom-scrollbar bg-slate-50/50 dark:bg-black/50">
                                {!assignedDoctorId ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-60 text-center">
                                        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                                        <p className="font-bold">{language === 'vi' ? 'Chưa liên kết với Bác sĩ' : 'No Doctor Assigned'}</p>
                                        <p className="text-xs mt-2 max-w-xs">{language === 'vi' ? 'Vui lòng vào phần "Cá Nhân" và nhập email bác sĩ để kết nối.' : 'Go to "Profile" and link your doctor via email to start chatting.'}</p>
                                        <button onClick={() => setCurrentTab('profile')} className="mt-4 text-xs font-bold text-blue-500 underline">{language === 'vi' ? 'Đi tới Cài đặt' : 'Go to Settings'}</button>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center py-10 opacity-50"><MessageCircle size={40} className="mx-auto mb-2" /><p className="text-xs">{language === 'vi' ? 'Bắt đầu trò chuyện với bác sĩ.' : 'Start chatting with your doctor.'}</p></div>
                                ) : (
                                    messages.map(msg => {
                                        const isMe = msg.senderId === currentUser?.uid;
                                        return (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] p-3.5 text-xs shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' : `${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl rounded-bl-sm`}`}>{msg.text}</div>
                                            </motion.div>
                                        )
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            {assignedDoctorId && (
                                <div className={`p-3 m-3 rounded-2xl flex items-center gap-2 border shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`}>
                                    <input className={`flex-1 bg-transparent p-2 text-sm outline-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`} placeholder={language === 'vi' ? "Nhập tin nhắn..." : "Type a message..."} value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                                    <button onClick={handleSendMessage} disabled={!inputMsg.trim()} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"><Send size={16} /></button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* VIEW: SCHEDULE */}
                    {currentTab === 'schedule' && (
                        <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                             <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black">{t.patientDashboard.appointments}</h2>
                                <button onClick={() => setIsBookModalOpen(true)} className="p-2 bg-blue-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"><Plus size={20}/></button>
                             </div>
                             <div className="space-y-3">
                                {myAppointments.length > 0 ? myAppointments.map(app => (
                                    <div key={app.id} className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'} flex gap-4`}>
                                        <div className="flex flex-col items-center justify-center px-4 border-r border-slate-200 dark:border-slate-800">
                                            <span className="text-xs font-bold uppercase text-slate-400">{new Date(app.date).toLocaleDateString('en-US', {month: 'short'})}</span>
                                            <span className="text-xl font-black">{new Date(app.date).getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">{app.title}</h4>
                                            <p className="text-xs text-slate-500 mb-2">Dr. Assigned • {app.startTime}:00</p>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${app.status === 'Done' ? 'bg-green-100 text-green-600' : app.status === 'In Progress' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600 animate-pulse'}`}>
                                                {app.status === 'Pending' ? (language === 'vi' ? 'Chờ xác nhận' : 'Waiting Confirmation') : app.status}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 opacity-50 text-sm">{language === 'vi' ? 'Không tìm thấy lịch hẹn.' : 'No appointments found.'}</div>
                                )}
                             </div>
                        </motion.div>
                    )}

                    {/* VIEW: PROFILE */}
                    {currentTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-20 p-6">
                            <h2 className="text-2xl font-black mb-4">{t.patientDashboard.tabs.profile}</h2>
                            <SettingsView userProfile={userProfile} isDarkMode={isDarkMode} onProfileUpdate={() => {}} />
                            <div className="mt-6 px-4">
                                <button onClick={handleLogoutWrapper} disabled={isLoggingOut} className="w-full py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center transition-all disabled:opacity-50">
                                    {isLoggingOut ? <Loader2 size={16} className="animate-spin mr-2"/> : <LogOut size={16} className="mr-2"/>} {t.sidebar.logout}
                                </button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            <nav className={`px-6 py-3 flex justify-between items-center z-20 ${isDarkMode ? 'bg-black/90 border-slate-900' : 'bg-white/90 border-slate-100'} backdrop-blur-lg border-t`}>
                <TabButton id="home" icon={Home} label={t.patientDashboard.tabs.home} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                <TabButton id="records" icon={Activity} label={t.patientDashboard.tabs.records} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                <TabButton id="schedule" icon={Calendar} label={t.patientDashboard.tabs.schedule} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                <TabButton id="chat" icon={MessageCircle} label={t.patientDashboard.tabs.chat} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                <TabButton id="profile" icon={UserIcon} label={t.patientDashboard.tabs.profile} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
            </nav>

            <AnimatePresence>
                {isBookModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsBookModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}} className={`relative w-full max-w-sm max-h-[85vh] overflow-y-auto p-6 rounded-3xl ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'} shadow-2xl custom-scrollbar`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black">{t.patientDashboard.book_new}</h3>
                                <button onClick={() => setIsBookModalOpen(false)} className={`p-1.5 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><X size={20}/></button>
                            </div>
                            <form onSubmit={handleBookAppointment} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Reason for Visit</label>
                                    <div className="flex flex-wrap gap-2">
                                        {APPOINTMENT_TYPES.map((type) => (
                                            <button key={type} type="button" onClick={() => setSelectedReasonType(type)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedReasonType === type ? 'bg-blue-600 text-white border-blue-600' : `${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}`}>{type}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Preferred Date</label>
                                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                                        {[{ label: language === 'vi' ? 'Ngày mai' : 'Tomorrow', days: 1 }, { label: language === 'vi' ? '3 ngày tới' : 'In 3 Days', days: 3 }, { label: language === 'vi' ? 'Tuần tới' : 'Next Week', days: 7 }].map((opt) => (
                                             <button key={opt.label} type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + opt.days); setNewBookDate(d.toISOString().split('T')[0]); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all whitespace-nowrap ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'}`}>{opt.label}</button>
                                        ))}
                                    </div>
                                    <div className={`relative flex items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'} focus-within:border-blue-500 transition-colors`}>
                                        <Calendar size={16} onClick={openDatePicker} className={`mr-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} cursor-pointer hover:text-blue-500`}/>
                                        <input ref={dateInputRef} required type="date" min={todayStr} value={newBookDate} onChange={e => setNewBookDate(e.target.value)} className={`w-full bg-transparent outline-none text-sm font-bold ${isDarkMode ? 'text-white [&::-webkit-calendar-picker-indicator]:invert' : 'text-slate-900'}`} />
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-2 ml-1">{language === 'vi' ? 'Nhập ngày (ngày/tháng/năm) hoặc chọn biểu tượng lịch.' : 'Type date (DD/MM/YYYY) or tap icon to pick.'}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Available Slot</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {AVAILABLE_HOURS.map((hour) => (
                                            <button key={hour} type="button" onClick={() => setSelectedTimeSlot(hour)} className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${selectedTimeSlot === hour ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}`}>{hour}:00</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Additional Notes</label>
                                    <textarea value={newBookReason} onChange={e => setNewBookReason(e.target.value)} className={`w-full p-3 rounded-xl border outline-none text-sm min-h-[80px] ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} placeholder="Describe symptoms..." />
                                </div>
                                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-blue-600/30 hover:brightness-110 hover:scale-[1.02] transition-all flex items-center justify-center">Confirm Request <Check size={16} className="ml-2"/></button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default PatientDashboard;
