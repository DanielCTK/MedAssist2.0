import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Appointment, DiagnosisRecord, ChatMessage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, Calendar, FileText, MessageCircle, LogOut, Settings, Sun, Moon, Home, Clock, ChevronRight, Bell, User as UserIcon, Send, CheckCircle, AlertCircle, TrendingUp, Plus, X } from 'lucide-react';
import { User } from 'firebase/auth';
import SettingsView from './SettingsView';
import { subscribeToAppointments, addAppointment } from '../services/scheduleService';
import { subscribeToMessages, sendMessage, getChatId } from '../services/chatService';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

interface PatientDashboardProps {
    isDarkMode: boolean;
    currentUser: User | null;
    userProfile: UserProfile | null;
    onLogout: () => void;
    toggleTheme: () => void;
}

type TabID = 'home' | 'records' | 'schedule' | 'chat' | 'profile';

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
    <div className={`p-4 rounded-2xl mb-4 border flex items-center justify-between transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
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
    const { t, language } = useLanguage();
    const [currentTab, setCurrentTab] = useState<TabID>('home');
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Add Appointment Modal
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [newBookDate, setNewBookDate] = useState("");
    const [newBookReason, setNewBookReason] = useState("");

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!currentUser) return;

        setLoading(true);

        // 1. Fetch Appointments (Simplified matching by name/email since standard appt struct might not have patientUid yet)
        const dateStr = new Date().toISOString().split('T')[0];
        // In a real app, you'd query "appointments" where "patientId" == currentUser.uid
        // Here we simulate by filtering the general feed for demo purposes or fetch basic range
        const unsubAppt = subscribeToAppointments(dateStr, (data) => {
             // Mock filter for demo: Show all appointments as if they are the patient's, 
             // OR strictly filter if patientName matches (recommended if data exists)
             const myApps = data.filter(a => 
                 a.patientName.toLowerCase() === userProfile?.displayName.toLowerCase() || 
                 a.patientName === currentUser.email
             );
             setMyAppointments(myApps);
        }, console.error);

        // 2. Fetch Diagnosis History (From "patients" collection -> find doc with user's email/uid -> get subcollection or array)
        // Since the current architecture links Patients to Doctors, we need to find the Patient Document that represents THIS user.
        // We'll search the 'patients' collection for a match on email.
        const fetchHistory = async () => {
            try {
                const q = query(collection(db, "patients"), where("email", "==", currentUser.email), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const patientDoc = querySnapshot.docs[0].data();
                    if (patientDoc.diagnosisHistory) {
                        setDiagnosisHistory(patientDoc.diagnosisHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    }
                }
            } catch (e) {
                console.error("Error fetching history", e);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();

        return () => unsubAppt();
    }, [currentUser, userProfile]);

    // --- CHAT SUBSCRIPTION ---
    useEffect(() => {
        if (currentUser && currentTab === 'chat') {
            // Assume chatting with a default "Doctor" or support ID for now, 
            // or find the doctorId from the patient record. 
            // For demo: Chat ID = patientUid_adminUid (placeholder) or just patientUid_support
            // We'll use a fixed ID for the "Doctor" side for simplicity in this demo: "DOCTOR_MAIN"
            const doctorId = "DOCTOR_MAIN"; 
            const chatId = getChatId(currentUser.uid, doctorId);
            
            const unsubChat = subscribeToMessages(chatId, (msgs) => {
                setMessages(msgs);
            });
            return () => unsubChat();
        }
    }, [currentUser, currentTab]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentTab]);

    const handleSendMessage = async () => {
        if (!inputMsg.trim() || !currentUser) return;
        const doctorId = "DOCTOR_MAIN";
        const chatId = getChatId(currentUser.uid, doctorId);
        await sendMessage(chatId, currentUser.uid, inputMsg);
        setInputMsg("");
    };

    const handleBookAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBookDate || !currentUser) return;
        
        try {
            await addAppointment({
                patientId: currentUser.uid,
                patientName: userProfile?.displayName || "Patient",
                title: newBookReason || "General Checkup",
                type: 'Consult',
                date: newBookDate,
                startTime: 9, // Default
                duration: 1,
                status: 'Pending'
            });
            alert("Appointment request sent!");
            setIsBookModalOpen(false);
            setNewBookReason("");
            setNewBookDate("");
        } catch (e) {
            alert("Failed to book.");
        }
    };

    // --- CALCULATED STATES ---
    const latestScan = diagnosisHistory.length > 0 ? diagnosisHistory[0] : null;
    const healthScore = latestScan 
        ? (latestScan.grade === 0 ? 100 : latestScan.grade === 1 ? 85 : latestScan.grade === 2 ? 70 : latestScan.grade === 3 ? 50 : 30) 
        : 100;
    
    const getStatusColor = (score: number) => {
        if (score >= 90) return "text-emerald-500";
        if (score >= 70) return "text-blue-500";
        if (score >= 50) return "text-orange-500";
        return "text-red-500";
    };

    const getStatusText = (score: number) => {
        if (score >= 90) return t.patientDashboard.status.excellent;
        if (score >= 70) return t.patientDashboard.status.good;
        if (score >= 50) return t.patientDashboard.status.warning;
        return t.patientDashboard.status.critical;
    };

    return (
        <div className={`h-screen w-full flex flex-col ${isDarkMode ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
            
            {/* --- HEADER --- */}
            <header className={`px-6 py-5 flex justify-between items-center z-10 ${isDarkMode ? 'bg-black' : 'bg-white'} border-b ${isDarkMode ? 'border-slate-900' : 'border-slate-100'}`}>
                <div>
                    <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t.patientDashboard.welcome}</p>
                    <h1 className="text-xl font-black tracking-tight">{userProfile?.displayName?.split(' ')[0] || 'Patient'}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleTheme} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-900 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
                        {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
                    </button>
                    <button className={`relative p-2 rounded-full ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        <Bell size={18} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                    <div onClick={() => setCurrentTab('profile')} className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer">
                        <img src={userProfile?.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} className="w-full h-full object-cover" alt="Profile"/>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                <AnimatePresence mode="wait">
                    
                    {/* VIEW: HOME */}
                    {currentTab === 'home' && (
                        <motion.div 
                            key="home"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Health Card */}
                            <div className={`relative w-full rounded-3xl p-6 overflow-hidden shadow-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                <div className={`absolute top-0 right-0 w-64 h-64 rounded-full filter blur-[80px] opacity-20 ${healthScore > 80 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                
                                <div className="relative z-10 flex flex-col items-center text-center py-4">
                                    <div className="relative w-40 h-40 mb-4 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className={`${isDarkMode ? 'text-slate-800' : 'text-slate-100'}`} />
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                                strokeDasharray={440}
                                                strokeDashoffset={440 - (440 * healthScore) / 100}
                                                className={`${getStatusColor(healthScore)} transition-all duration-1000 ease-out`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className={`text-4xl font-black ${getStatusColor(healthScore)}`}>{healthScore}</span>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                                        </div>
                                    </div>
                                    <h3 className={`text-xl font-bold ${getStatusColor(healthScore)} mb-1`}>{getStatusText(healthScore)}</h3>
                                    <p className="text-xs text-slate-500 max-w-[200px]">{t.patientDashboard.health_score}</p>
                                </div>
                            </div>

                            {/* Actions Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setCurrentTab('schedule')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white shadow-sm hover:shadow-md'}`}>
                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full"><Calendar size={24} /></div>
                                    <span className="text-xs font-bold">{t.patientDashboard.appointments}</span>
                                </button>
                                <button onClick={() => setCurrentTab('chat')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white shadow-sm hover:shadow-md'}`}>
                                    <div className="p-3 bg-purple-500/10 text-purple-500 rounded-full"><MessageCircle size={24} /></div>
                                    <span className="text-xs font-bold">{t.patientDashboard.contact_doctor}</span>
                                </button>
                            </div>

                            {/* Upcoming */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-sm uppercase tracking-wide opacity-70">Upcoming</h3>
                                    <button className="text-blue-500 text-xs font-bold" onClick={() => setIsBookModalOpen(true)}>+ New</button>
                                </div>
                                {myAppointments.length > 0 ? (
                                    myAppointments.map(app => (
                                        <div key={app.id} className={`p-4 rounded-2xl border-l-4 border-blue-500 mb-2 flex items-center justify-between ${isDarkMode ? 'bg-slate-900' : 'bg-white shadow-sm'}`}>
                                            <div>
                                                <h4 className="font-bold text-sm">{app.title}</h4>
                                                <p className="text-xs opacity-60 flex items-center mt-1"><Clock size={10} className="mr-1"/> {app.date} @ {app.startTime}:00</p>
                                            </div>
                                            <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded uppercase">{app.status}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs opacity-50">
                                        {t.patientDashboard.no_appointments}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* VIEW: HEALTH RECORDS */}
                    {currentTab === 'records' && (
                        <motion.div 
                            key="records"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-black mb-6">{t.patientDashboard.history}</h2>
                            {diagnosisHistory.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <FileText size={48} className="mx-auto mb-4"/>
                                    <p>No diagnosis history yet.</p>
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
                        <motion.div 
                            key="chat"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-full flex flex-col"
                        >
                            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                                {messages.length === 0 && (
                                    <div className="text-center py-10 opacity-50">
                                        <MessageCircle size={40} className="mx-auto mb-2" />
                                        <p className="text-xs">Start chatting with your doctor.</p>
                                    </div>
                                )}
                                {messages.map(msg => {
                                    const isMe = msg.senderId === currentUser?.uid;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-2xl text-xs shadow-sm ${
                                                isMe 
                                                ? 'bg-blue-600 text-white rounded-br-none' 
                                                : `${isDarkMode ? 'bg-slate-800' : 'bg-white'} border rounded-bl-none`
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className={`p-2 rounded-2xl flex items-center gap-2 ${isDarkMode ? 'bg-slate-900' : 'bg-white border'}`}>
                                <input 
                                    className="flex-1 bg-transparent p-3 text-sm outline-none"
                                    placeholder="Type a message..."
                                    value={inputMsg}
                                    onChange={e => setInputMsg(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button onClick={handleSendMessage} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                                    <Send size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* VIEW: SCHEDULE */}
                    {currentTab === 'schedule' && (
                        <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                             <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black">{t.patientDashboard.appointments}</h2>
                                <button onClick={() => setIsBookModalOpen(true)} className="p-2 bg-blue-600 text-white rounded-full shadow-lg"><Plus size={20}/></button>
                             </div>
                             <div className="space-y-3">
                                {myAppointments.map(app => (
                                    <div key={app.id} className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'} flex gap-4`}>
                                        <div className="flex flex-col items-center justify-center px-4 border-r border-slate-200 dark:border-slate-800">
                                            <span className="text-xs font-bold uppercase text-slate-400">{new Date(app.date).toLocaleDateString('en-US', {month: 'short'})}</span>
                                            <span className="text-xl font-black">{new Date(app.date).getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">{app.title}</h4>
                                            <p className="text-xs text-slate-500 mb-2">Dr. Assigned • {app.startTime}:00</p>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${app.status === 'Done' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{app.status}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </motion.div>
                    )}

                    {/* VIEW: PROFILE (Using SettingsView simplified) */}
                    {currentTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-20">
                            <h2 className="text-2xl font-black mb-4">{t.patientDashboard.tabs.profile}</h2>
                            <SettingsView userProfile={userProfile} isDarkMode={isDarkMode} onProfileUpdate={() => {}} />
                            <div className="mt-6 px-4">
                                <button onClick={onLogout} className="w-full py-4 bg-red-500/10 text-red-500 font-bold uppercase text-xs rounded-xl flex items-center justify-center">
                                    <LogOut size={16} className="mr-2"/> {t.sidebar.logout}
                                </button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* --- BOTTOM NAVIGATION (MOBILE STYLE) --- */}
            <nav className={`px-6 py-3 flex justify-between items-center z-20 ${isDarkMode ? 'bg-black/90 border-slate-900' : 'bg-white/90 border-slate-100'} backdrop-blur-lg border-t`}>
                <TabButton id="home" icon={Home} label={t.patientDashboard.tabs.home} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                <TabButton id="records" icon={Activity} label={t.patientDashboard.tabs.records} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                <TabButton id="schedule" icon={Calendar} label={t.patientDashboard.tabs.schedule} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                <TabButton id="chat" icon={MessageCircle} label={t.patientDashboard.tabs.chat} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
                <TabButton id="profile" icon={UserIcon} label={t.patientDashboard.tabs.profile} currentTab={currentTab} setCurrentTab={setCurrentTab} isDarkMode={isDarkMode} />
            </nav>

            {/* BOOKING MODAL */}
            <AnimatePresence>
                {isBookModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setIsBookModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}} className={`relative w-full max-w-sm p-6 rounded-3xl ${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-2xl`}>
                            <h3 className="text-lg font-black mb-4">{t.patientDashboard.book_new}</h3>
                            <form onSubmit={handleBookAppointment} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Reason</label>
                                    <input required value={newBookReason} onChange={e => setNewBookReason(e.target.value)} className="w-full p-3 rounded-xl border outline-none bg-transparent text-sm" placeholder="Checkup..."/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Date</label>
                                    <input required type="date" value={newBookDate} onChange={e => setNewBookDate(e.target.value)} className="w-full p-3 rounded-xl border outline-none bg-transparent text-sm"/>
                                </div>
                                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl uppercase text-xs tracking-widest mt-2 hover:bg-blue-700">Submit Request</button>
                            </form>
                            <button onClick={() => setIsBookModalOpen(false)} className="absolute top-4 right-4 text-slate-500"><X size={20}/></button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default PatientDashboard;