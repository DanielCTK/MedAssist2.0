import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, Calendar as CalendarIcon, ArrowRight, MoreHorizontal, Clock, CheckCircle, XCircle, Phone, Activity, TrendingUp, AlertTriangle, AlertCircle, ChevronDown, Filter, Info, Stethoscope, BedDouble, Check, HeartPulse, ShieldCheck, Thermometer, FileText, Video, MessageSquare, Plus, Search, MapPin, ScanEye, Loader2, X, Save, Trash2, Edit2, ChevronLeft, ChevronRight, MessageCircle, UserCog, FileBarChart, Siren, Send, User as UserIcon, RefreshCw, Coffee, Minimize2 } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeToPatients } from '../services/patientService';
import { subscribeToAppointments, subscribeToAppointmentsRange, addAppointment, updateAppointmentStatus, updateAppointment, deleteAppointment, subscribeToPendingAppointments } from '../services/scheduleService';
import { subscribeToUsers, subscribeToMessages, sendMessage, getChatId, subscribeToActiveChats, markChatAsRead } from '../services/chatService';
import { Patient, Appointment, UserProfile, ChatUser, ChatMessage, ChatSession } from '../types';
import { User } from 'firebase/auth';

interface DashboardProps {
    isDarkMode: boolean;
    currentUser: User | null;
    userProfile?: UserProfile | null;
    setView: (view: string) => void;
}

// EXPANDED TIME SLOTS to ensure appointments from 7AM to 6PM are visible
const TIME_SLOTS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; 

// --- EXTRACTED COMPONENTS TO PREVENT RE-RENDER STATE LOSS ---

const ChatInterface = ({
  isOpen,
  onClose,
  isDoctorChat, // true = Colleagues, false = Patients
  currentUser,
  activeChats,
  isDarkMode,
  myPatients // Passed from parent to ensure we use the correct linked patients
}: {
  isOpen: boolean;
  onClose: () => void;
  isDoctorChat: boolean;
  currentUser: User | null;
  activeChats: ChatSession[];
  isDarkMode: boolean;
  myPatients: Patient[];
}) => {
    const title = isDoctorChat ? "Colleague Chat" : "Patient Messages";
    const cardClass = isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-lg shadow-blue-50";
    
    const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
    const [selectedChatUser, setSelectedChatUser] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); 
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && currentUser) {
            setIsLoadingUsers(true);
            if (isDoctorChat) {
                const unsub = subscribeToUsers(currentUser.uid, (users) => {
                    setChatUsers(users.filter(u => u.role === 'doctor'));
                    setIsLoadingUsers(false);
                    setIsRefreshing(false);
                });
                return () => unsub();
            } else {
                const validPatients = myPatients
                    .filter(p => p.uid) 
                    .map(p => ({
                        uid: p.uid!, 
                        displayName: p.name,
                        email: p.email || '',
                        photoURL: p.avatarUrl,
                        role: 'patient'
                    } as ChatUser));
                setChatUsers(validPatients);
                setIsLoadingUsers(false);
                setIsRefreshing(false);
                return () => {};
            }
        }
    }, [isOpen, isDoctorChat, currentUser, activeChats, myPatients, refreshTrigger]);

    useEffect(() => {
        if (currentUser && selectedChatUser) {
            const chatId = getChatId(currentUser.uid, selectedChatUser.uid);
            const unsub = subscribeToMessages(chatId, (msgs) => setMessages(msgs));
            markChatAsRead(chatId);
            return () => unsub();
        }
    }, [currentUser, selectedChatUser, refreshTrigger]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedChatUser]);

    const handleSendMessage = async () => {
        if (!inputMsg.trim() || !currentUser || !selectedChatUser) return;
        const msgToSend = inputMsg;
        setInputMsg(""); 
        const chatId = getChatId(currentUser.uid, selectedChatUser.uid);
        try {
            await sendMessage(chatId, currentUser.uid, msgToSend);
        } catch (err) {
            console.error(err);
            setInputMsg(msgToSend);
            alert("Failed to send message");
        }
    };

    const handleBackToUserList = () => {
        setSelectedChatUser(null);
        setMessages([]);
    };

    const handleSelectUser = async (user: ChatUser) => {
        setSelectedChatUser(user);
        if (currentUser) {
            const chatId = getChatId(currentUser.uid, user.uid);
            await markChatAsRead(chatId);
        }
    }

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setRefreshTrigger(prev => prev + 1), 500); 
    };

    const resetState = () => {
        setSelectedChatUser(null);
        setMessages([]);
        onClose();
    }

    return (
      <AnimatePresence>
          {isOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetState} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={`relative w-full h-full md:max-w-md md:h-[600px] flex flex-col md:rounded-2xl border shadow-2xl overflow-hidden ${cardClass}`}>
                      <div className={`p-4 ${isDoctorChat ? 'bg-indigo-600' : 'bg-teal-600'} text-white flex justify-between items-center shrink-0 safe-top`}>
                          <div className="flex items-center gap-2">
                              {selectedChatUser ? (<button onClick={handleBackToUserList}><ChevronLeft size={24}/></button>) : (isDoctorChat ? <UserCog size={24}/> : <MessageCircle size={24}/>)}
                              <div className="flex flex-col"><span className="font-bold text-base md:text-sm">{selectedChatUser ? selectedChatUser.displayName : title}</span>{selectedChatUser && <span className="text-xs md:text-[10px] opacity-70">{selectedChatUser.role === 'patient' ? 'Patient' : 'Doctor'}</span>}</div>
                          </div>
                          <div className="flex items-center gap-4 md:gap-2">
                              <button onClick={handleManualRefresh} className={`p-1.5 hover:bg-white/20 rounded-full transition-all ${isRefreshing ? 'animate-spin' : ''}`} title="Reload messages"><RefreshCw size={20} /></button>
                              <button onClick={resetState}><X size={24} /></button>
                          </div>
                      </div>
                      {!selectedChatUser ? (
                          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 p-2">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 p-2">{isDoctorChat ? 'Colleagues' : 'Your Patients'}</h4>
                              {isLoadingUsers ? (<div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>) : chatUsers.length === 0 ? (<div className="p-4 text-center text-slate-500 text-xs">{isDoctorChat ? "No colleagues found." : "No linked patients found. Ask patients to link via their profile."}</div>) : (
                                  <div className="space-y-1">
                                      {chatUsers.map(user => {
                                          const chatId = getChatId(currentUser!.uid, user.uid);
                                          const chatSession = activeChats.find(c => c.id === chatId);
                                          const hasUnread = chatSession?.lastMessage && !chatSession.lastMessage.seen && chatSession.lastMessage.senderId !== currentUser?.uid;
                                          return (
                                              <div key={user.uid} onClick={() => handleSelectUser(user)} className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700`}>
                                                  <div className="relative mr-3"><img src={user.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop"} className="w-12 h-12 md:w-10 md:h-10 rounded-full object-cover" alt="Avatar"/><div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div></div>
                                                  <div className="flex-1 min-w-0">
                                                      <div className="flex justify-between items-center mb-1"><h5 className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.displayName}</h5>{chatSession?.lastMessage && (<span className="text-[10px] text-slate-400 ml-2 whitespace-nowrap">{chatSession.lastMessage.timestamp ? new Date(chatSession.lastMessage.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>)}</div>
                                                      <div className="flex justify-between items-center"><p className={`text-xs md:text-[10px] truncate max-w-[200px] md:max-w-[180px] ${hasUnread ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>{chatSession?.lastMessage ? chatSession.lastMessage.text : user.email}</p>{hasUnread && <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 ml-2"></div>}</div>
                                                  </div>
                                                  <ChevronRight size={16} className="ml-2 text-slate-400 shrink-0"/>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="flex-1 flex flex-col min-h-0">
                              <div className="flex-1 overflow-y-auto p-4 space-y-4 md:space-y-3 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar">
                                  {messages.map((m: any) => {
                                      const isMe = m.senderId === currentUser?.uid;
                                      return (
                                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                              <div className={`max-w-[85%] md:max-w-[80%] p-3.5 md:p-3 text-sm md:text-xs shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm'}`}>{m.text}</div>
                                          </motion.div>
                                      );
                                  })}
                                  <div ref={messagesEndRef} />
                              </div>
                              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 shrink-0 safe-bottom">
                                  <input className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm md:text-xs p-3.5 md:p-3 rounded-xl outline-none placeholder-slate-500" placeholder="Type a message..." value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()}/>
                                  <button onClick={handleSendMessage} className="p-3.5 md:p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Send size={18}/></button>
                              </div>
                          </div>
                      )}
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ isDarkMode, currentUser, userProfile, setView }) => {
  const [viewMode, setViewMode] = useState<'personal' | 'department'>('personal');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]); 
  
  const [statsData, setStatsData] = useState<{name: string, patients: number}[]>([]);
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);

  const [patientRefreshTrigger, setPatientRefreshTrigger] = useState(0);
  const [isRefreshingPatients, setIsRefreshingPatients] = useState(false);

  const [scheduleViewType, setScheduleViewType] = useState<'timeline' | 'calendar'>('timeline');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [newAppt, setNewAppt] = useState<Partial<Appointment>>({
      patientId: '',
      patientName: '',
      title: '',
      type: 'Diagnosis',
      startTime: 9,
      duration: 1,
      status: 'Pending',
      date: ''
  });

  const [activeModal, setActiveModal] = useState<'none' | 'chat_patient' | 'chat_doctor' | 'mini_report' | 'emergency'>('none');

  const { t, language } = useLanguage();
  
  const cardClass = isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-lg shadow-blue-50";
  const themeColor = isDarkMode ? "text-red-500" : "text-blue-600";
  const themeBg = isDarkMode ? "bg-red-600" : "bg-blue-600";
  const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
  const inputClass = isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400";

  useEffect(() => {
    if (currentUser) {
        const unsubscribe = subscribeToPatients(
            currentUser.uid,
            (data) => {
                setPatients(data);
                setIsRefreshingPatients(false); 
            },
            (err) => {
                if (err?.code !== 'permission-denied') console.error("Patient fetch error", err);
                setIsRefreshingPatients(false);
            }
        );
        return () => unsubscribe();
    }
  }, [currentUser, patientRefreshTrigger]); 

  const handlePatientRefresh = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsRefreshingPatients(true);
      setTimeout(() => setPatientRefreshTrigger(prev => prev + 1), 200);
  };

  useEffect(() => {
      if (currentUser) {
          const unsub = subscribeToActiveChats(currentUser.uid, (chats) => setActiveChats(chats));
          return () => unsub();
      }
  }, [currentUser]);

  const hasUnreadMessages = useMemo(() => {
      if (!currentUser) return false;
      return activeChats.some(chat => 
          chat.lastMessage && 
          !chat.lastMessage.seen && 
          chat.lastMessage.senderId !== currentUser.uid
      );
  }, [activeChats, currentUser]);

  // --- SUBSCRIBE TO APPOINTMENTS FOR CALENDAR/GANTT ---
  useEffect(() => {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // UPDATED: Pass currentUser.uid to filter appointments
      const unsubscribe = subscribeToAppointments(
          dateStr,
          currentUser?.uid, // Filter by current Doctor
          (data) => setAppointments(data),
          (err) => {
              if (err?.code !== 'permission-denied') console.error("Schedule fetch error", err);
          }
      );
      return () => unsubscribe();
  }, [selectedDate, currentUser]);

  useEffect(() => {
      const unsubscribe = subscribeToPendingAppointments(
          (data) => {
              setPendingAppointments(data);
          },
          (err) => {
              if (err?.code !== 'permission-denied') console.error("Pending fetch error", err);
          }
      );
      return () => unsubscribe();
  }, []);

  useEffect(() => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);

      const formatDate = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      };

      const startStr = formatDate(start);
      const endStr = formatDate(end);

      // UPDATED: Pass currentUser.uid to filter stats
      const unsubscribe = subscribeToAppointmentsRange(
          startStr,
          endStr,
          currentUser?.uid, // Filter by current Doctor
          (data) => {
              const counts: Record<string, number> = {};
              for (let i = 0; i < 7; i++) {
                  const d = new Date(start);
                  d.setDate(start.getDate() + i);
                  const dStr = formatDate(d);
                  counts[dStr] = 0;
              }
              data.forEach(appt => {
                  if (counts[appt.date] !== undefined) {
                      counts[appt.date]++;
                  }
              });
              const chartData = Object.keys(counts).sort().map(dateStr => {
                  const date = new Date(dateStr);
                  const dayName = date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' });
                  return { name: dayName, patients: counts[dateStr] };
              });
              setStatsData(chartData);
          },
          (err) => {
              if (err?.code !== 'permission-denied') console.error("Stats fetch error", err);
          }
      );
      return () => unsubscribe();
  }, [language, currentUser]);
  
  const openAddModal = (typeOverride?: string) => {
      setEditingApptId(null);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      setNewAppt({ 
          patientId: '',
          patientName: '', 
          title: '', 
          type: (typeOverride as any) || 'Diagnosis', 
          startTime: 9, 
          duration: 1, 
          status: 'Pending',
          date: dateStr
      });
      setIsApptModalOpen(true);
  };

  const openEditModal = (appt: Appointment) => {
      setEditingApptId(appt.id);
      setNewAppt({ ...appt });
      setIsApptModalOpen(true);
  };

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      const patient = patients.find(p => p.id === selectedId);
      setNewAppt({
          ...newAppt,
          patientId: selectedId,
          patientName: patient ? patient.name : newAppt.patientName || ''
      });
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const apptData = {
              doctorId: currentUser?.uid, // UPDATED: Automatically assign to current doctor
              patientId: newAppt.patientId || undefined,
              patientName: newAppt.patientName || 'Unknown',
              title: newAppt.title || 'Checkup',
              type: newAppt.type as any,
              startTime: Number(newAppt.startTime),
              duration: Number(newAppt.duration),
              status: newAppt.status || 'Pending',
              date: newAppt.date || new Date().toISOString().split('T')[0],
              notes: newAppt.notes || ''
          };
          if (editingApptId) {
              await updateAppointment(editingApptId, apptData);
          } else {
              await addAppointment(apptData);
          }
          setIsApptModalOpen(false);
      } catch (err) {
          alert(t.dashboard.schedule.modal.failed_save);
      }
  };

  const handleDelete = async (id?: string) => {
      const targetId = id || editingApptId;
      if (targetId && confirm(t.dashboard.schedule.modal.delete_confirm)) {
          try {
              await deleteAppointment(targetId);
              if (targetId === editingApptId) setIsApptModalOpen(false);
          } catch(err) {
              alert(t.dashboard.schedule.modal.failed_delete);
          }
      }
  };

  // UPDATED: Claim appointment ownership when accepting a pending request
  const handleStatusToggle = async (e: React.MouseEvent, appt: Appointment) => {
      e.stopPropagation();
      const currentStatus = appt.status;
      const newStatus = currentStatus === 'Done' ? 'Pending' : currentStatus === 'Pending' ? 'In Progress' : 'Done';
      
      const updates: any = { status: newStatus };
      
      // If moving from Pending to In Progress, and no doctor is assigned, assign to current user
      if (currentStatus === 'Pending' && newStatus === 'In Progress' && !appt.doctorId && currentUser) {
          updates.doctorId = currentUser.uid;
      }

      await updateAppointment(appt.id, updates);
  };

  const formatTime = (time: number) => {
      const hours = Math.floor(time);
      const minutes = Math.round((time - hours) * 60);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getTranslatedType = (type: string) => {
      // @ts-ignore
      return t.dashboard.schedule.types[type] || type;
  };
  
  const WelcomeBanner = () => {
    const bannerImage = userProfile?.bannerURL || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop";
    return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`relative w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6 flex items-end shadow-2xl group ${isDarkMode ? 'shadow-black/50' : 'shadow-slate-300'} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
            <img src={bannerImage} alt="Banner" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"/>
            <div className={`absolute inset-0 bg-gradient-to-t ${isDarkMode ? 'from-black/95 via-black/40 to-transparent' : 'from-slate-900/90 via-slate-900/30 to-transparent'}`}></div>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] mix-blend-overlay"></div>
            <div className="relative z-10 px-6 pb-6 flex justify-between items-end w-full">
                <div className="text-white">
                     <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-widest border border-white/20 shadow-lg">{new Date().toDateString()}</span>
                        <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-red-200"><MapPin size={10} className="mr-1" /> {userProfile?.hospital || 'General Hospital'}</span>
                     </div>
                    <h1 className="text-3xl md:text-4xl font-black mb-1 tracking-tight text-white drop-shadow-lg">{t.dashboard.greeting}, <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{userProfile?.displayName?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || 'Doctor'}</span></h1>
                    <div className="flex items-center space-x-3 mt-2">
                        <div className="flex -space-x-2">{[1,2,3].map(i => (<div key={i} className="w-6 h-6 rounded-full border border-white bg-slate-200" />))}</div>
                        <p className="text-[11px] font-medium text-slate-300">{t.dashboard.appointments_left.replace('{{count}}', appointments.filter(a => a.status !== 'Done').length.toString())}</p>
                    </div>
                </div>
                 <div className="hidden md:block relative transform translate-y-4 mr-4">
                     <div className="w-32 h-32 rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-slate-800">
                        <img 
                            src={userProfile?.photoURL || currentUser?.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop"} 
                            className="w-full h-full object-cover" 
                            alt="Profile"
                        />
                     </div>
                </div>
            </div>
        </motion.div>
      );
  };

  const PersonalDashboard = () => {
      const handleQuickAction = (action: string) => {
          if (action === 'chat_patient') setActiveModal('chat_patient');
          else if (action === 'chat_doctor') setActiveModal('chat_doctor');
          else if (action === 'mini_report') setActiveModal('mini_report');
          else if (action === 'emergency') setActiveModal('emergency');
      };

      const completionRate = useMemo(() => {
          if (appointments.length === 0) return 0;
          const done = appointments.filter(a => a.status === 'Done').length;
          return Math.round((done / appointments.length) * 100);
      }, [appointments]);

      const cardStyle = isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-lg shadow-blue-50";
      const hoverEffect = "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-blue-400 dark:hover:border-slate-600";

      return (
        <motion.div initial="hidden" animate="show" variants={{ hidden: {opacity:0}, show: {opacity:1, transition: {staggerChildren: 0.1}} }} className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-3 lg:col-span-1">
                    <motion.div variants={{ hidden: {opacity:0, y:10}, show: {opacity:1, y:0} }} className={`p-4 rounded-xl border ${cardStyle} relative overflow-hidden ${hoverEffect}`}>
                        <div className="flex items-center space-x-3 mb-3 relative z-10">
                            <div className="relative">
                                <img src={userProfile?.photoURL || currentUser?.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop"} className={`w-12 h-12 rounded-xl object-cover border-2 ${isDarkMode ? 'border-red-500' : 'border-blue-500'} shadow-lg`} alt="Profile" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center"><Check size={8} className="text-white" /></div>
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="text-sm font-bold leading-tight truncate">{userProfile?.displayName || currentUser?.displayName || 'Medical Staff'}</h3>
                                <p className={`text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider font-bold`}>{userProfile?.specialty || 'Medical Specialist'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 relative z-10">
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'} relative group`}>
                                <div className="flex justify-between items-center">
                                    <p className={`text-[8px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.dashboard.profile.patients}</p>
                                    <button onClick={handlePatientRefresh} className={`p-1 rounded-full hover:bg-slate-700/20 transition-colors ${isRefreshingPatients ? 'animate-spin' : ''}`}>
                                        <RefreshCw size={10} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>
                                <p className={`text-sm font-black ${isDarkMode ? 'text-red-500' : 'text-blue-500'}`}>{patients.length > 0 ? patients.length : <Loader2 size={12} className="animate-spin inline"/>}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                <p className={`text-[8px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.dashboard.profile.completion}</p>
                                <p className="text-sm font-black text-green-500">{completionRate}%</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={{ hidden: {opacity:0, y:10}, show: {opacity:1, y:0} }} className={`p-4 rounded-xl border ${cardStyle} flex flex-col h-[320px] ${hoverEffect}`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-xs">
                                {pendingAppointments.length > 0 ? "Inbox & Agenda" : t.dashboard.agenda.title}
                            </h3>
                            <button onClick={() => openAddModal()} className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors ${isDarkMode ? 'text-red-500' : 'text-blue-500'}`}><Plus size={14} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                            {pendingAppointments.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-2 pl-1">New Requests ({pendingAppointments.length})</p>
                                    <div className="space-y-2">
                                        {pendingAppointments.map(item => (
                                            <div key={item.id} className={`p-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[9px] font-bold uppercase text-yellow-500">{new Date(item.date).toLocaleDateString()}</span>
                                                    <div className="flex gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1 rounded-full hover:bg-red-500 hover:text-white text-slate-400 transition-colors"><X size={12}/></button>
                                                        <button onClick={(e) => handleStatusToggle(e, item)} className="p-1 rounded-full bg-green-500 text-white hover:scale-110 transition-transform shadow-md"><Check size={12}/></button>
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-xs">{item.title}</h4>
                                                <p className="text-[10px] opacity-70 mt-0.5">{item.patientName}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-3" />
                                </div>
                            )}

                            {appointments.filter(a => a.status !== 'Pending').length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50"><CalendarIcon size={24} className="mb-2" /><p className="text-[10px] font-bold uppercase">{t.dashboard.schedule.no_appointments}</p><button onClick={() => openAddModal()} className="mt-2 text-[9px] underline">{t.dashboard.schedule.add_one}</button></div>
                            ) : (
                                appointments.filter(a => a.status !== 'Pending').map((item) => (
                                    <div key={item.id} className="flex gap-2 group cursor-pointer relative" onClick={() => openEditModal(item)}>
                                        <div className="flex flex-col items-center"><span className={`text-[9px] font-bold ${item.status === 'Done' ? 'text-slate-400 line-through' : (isDarkMode ? 'text-red-500' : 'text-blue-500')}`}>{formatTime(item.startTime)}</span><div className={`w-0.5 h-full mt-0.5 ${item.status === 'Done' ? 'bg-slate-200 dark:bg-slate-800' : isDarkMode ? 'bg-red-900' : 'bg-blue-200'}`} /></div>
                                        <div className={`flex-1 p-2 rounded-lg border mb-0.5 transition-all relative group hover:shadow-md ${item.status === 'In Progress' ? (isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-blue-50 border-blue-200') : item.status === 'Done' ? 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 opacity-60' : `bg-white dark:bg-slate-900 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}`}>
                                            <div className="flex justify-between items-start">
                                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded mb-0.5 inline-block ${item.type === 'Surgery' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{getTranslatedType(item.type)}</span>
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                    <button onClick={(e) => handleStatusToggle(e, item)} className={`w-4 h-4 rounded-full border flex items-center justify-center ${item.status === 'In Progress' ? `${isDarkMode ? 'bg-blue-500' : 'bg-blue-500'} border-transparent` : item.status === 'Done' ? 'bg-green-500 border-transparent' : 'border-slate-300'}`}>
                                                        {item.status === 'In Progress' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                                                        {item.status === 'Done' && <Check size={10} className="text-white" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <h4 className={`text-[10px] font-bold ${item.status === 'Done' ? 'line-through text-slate-400' : ''} ${item.status === 'Pending' ? 'text-yellow-600 dark:text-yellow-500' : ''}`}>{item.title} - <span className="opacity-70">{item.patientName}</span></h4>
                                            {item.notes && <p className="text-[9px] text-slate-400 mt-1 line-clamp-1 italic">{item.notes}</p>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                    <motion.div variants={{ hidden: {opacity:0, y:10}, show: {opacity:1, y:0} }}>
                        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t.dashboard.quick_actions.title}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                { id: 'chat_patient', icon: MessageCircle, label: t.dashboard.quick_actions.chat_patient, color: isDarkMode ? 'text-teal-500' : 'text-teal-600', bg: 'bg-teal-500/10', showDot: hasUnreadMessages },
                                { id: 'chat_doctor', icon: UserCog, label: t.dashboard.quick_actions.chat_doctor, color: 'text-indigo-500', bg: 'bg-indigo-500/10', showDot: false },
                                { id: 'mini_report', icon: FileBarChart, label: t.dashboard.quick_actions.mini_report, color: 'text-amber-500', bg: 'bg-amber-500/10', showDot: false },
                                { id: 'emergency', icon: Siren, label: t.dashboard.quick_actions.emergency, color: 'text-red-600', bg: 'bg-red-600/10', showDot: false },
                            ].map((action, i) => (
                                <motion.button 
                                    key={i}
                                    whileHover={{ scale: 1.05, y: -3, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleQuickAction(action.id)}
                                    className={`relative p-2.5 rounded-xl border ${cardStyle} flex flex-col items-center justify-center gap-1.5 transition-all hover:${isDarkMode ? 'border-red-700' : 'border-blue-300'}`}
                                >
                                    {action.showDot && (
                                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                                    )}
                                    <div className={`p-1.5 rounded-full ${action.bg} ${action.color}`}>
                                        <action.icon size={16} />
                                    </div>
                                    <span className="text-[9px] font-bold">{action.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div variants={{ hidden: {opacity:0, y:10}, show: {opacity:1, y:0} }} className={`p-4 rounded-xl border ${cardStyle} h-[200px] ${hoverEffect}`}>
                        <div className="flex justify-between items-center mb-2">
                            <div><h3 className="font-bold text-xs">{t.dashboard.stats.title} (Last 7 Days)</h3></div>
                            <div className="flex space-x-2"><span className="flex items-center text-[9px] font-bold"><div className={`w-1 h-1 ${isDarkMode ? 'bg-red-500' : 'bg-blue-500'} rounded-full mr-1`}/> Appointments</span></div>
                        </div>
                        <div className="w-full h-[140px]">
                            {statsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={statsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs><linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isDarkMode ? '#ef4444' : '#3b82f6'} stopOpacity={0.3}/><stop offset="95%" stopColor={isDarkMode ? '#ef4444' : '#3b82f6'} stopOpacity={0}/></linearGradient></defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9 }} dy={5} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9 }} />
                                        <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '10px' }} itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}/>
                                        <Area type="monotone" dataKey="patients" stroke={isDarkMode ? '#ef4444' : '#3b82f6'} strokeWidth={2} fillOpacity={1} fill="url(#colorPatients)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-50 text-[10px] uppercase font-bold">No activity data for this week</div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
      );
  }

  const DepartmentDashboard = () => {
      const activityTypes = ['Surgery', 'Consult', 'Diagnosis', 'Meeting'];
      const getBarColor = (type: string) => {
          switch(type) {
              case 'Surgery': return 'bg-blue-500 text-white';
              case 'Consult': return 'bg-purple-500 text-white';
              case 'Diagnosis': return 'bg-indigo-800 text-white';
              case 'Meeting': return 'bg-slate-200 text-slate-700';
              default: return 'bg-gray-100 text-gray-700';
          }
      };
      const getIcon = (type: string) => {
          switch(type) {
              case 'Surgery': return <Activity size={12} />;
              case 'Consult': return <MessageSquare size={12} />;
              case 'Diagnosis': return <ScanEye size={12} />;
              case 'Meeting': return <Coffee size={12} />;
              default: return <Clock size={12} />;
          }
      };

      return (
          <div className={`p-6 rounded-2xl border shadow-lg ${cardClass} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black">Daily Schedule</h3>
                  <div className="flex items-center gap-4">
                      <div className="hidden md:flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"/> Surgery</div>
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-indigo-800 mr-1"/> Diagnosis</div>
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-1"/> Consult</div>
                      </div>
                      <input type="date" value={selectedDate.toISOString().split('T')[0]} onChange={(e) => setSelectedDate(new Date(e.target.value))} className={`p-2 rounded-lg text-xs font-bold border outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}/>
                  </div>
              </div>
              <div className="relative w-full overflow-x-auto custom-scrollbar pb-4">
                  <div className="min-w-[800px]">
                      <div className="grid grid-cols-[150px_1fr] border-b border-slate-200 dark:border-slate-800 pb-3 mb-2">
                          <div className="flex items-center justify-between pr-4"><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity</span><button onClick={() => openAddModal()} className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"><Plus size={14}/></button></div>
                          <div className="flex">{TIME_SLOTS.map(hour => (<div key={hour} className="flex-1 text-center border-l border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">{hour}:00</div>))}</div>
                      </div>
                      <div className="space-y-4">
                          {activityTypes.map(type => {
                              // Ensure accepted appointments show up. 'status' !== Pending means it's confirmed or in progress.
                              const typeAppts = appointments.filter(a => a.type === type && a.status !== 'Pending');
                              return (
                                  <div key={type} className="grid grid-cols-[150px_1fr] group">
                                      <div className="flex items-center pr-4"><div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>{getIcon(type)}</div><div><h4 className="text-xs font-bold text-slate-900 dark:text-white">{type}</h4><p className="text-[9px] text-slate-500 uppercase tracking-wide">{typeAppts.length} Tasks</p></div></div>
                                      <div className="relative h-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <div className="absolute inset-0 flex pointer-events-none">{TIME_SLOTS.map(h => (<div key={h} className="flex-1 border-r border-slate-200/30 dark:border-slate-700/30 first:border-l"></div>))}</div>
                                          {typeAppts.map((appt, idx) => {
                                              // Adjusted logic for new time range (7am to 6pm)
                                              const startHour = TIME_SLOTS[0]; // 7
                                              const totalHours = TIME_SLOTS.length; // 12
                                              
                                              // Skip if out of visual range
                                              if (appt.startTime < startHour || appt.startTime >= (startHour + totalHours)) return null;
                                              
                                              const left = ((appt.startTime - startHour) / totalHours) * 100; 
                                              const width = (appt.duration / totalHours) * 100;
                                              
                                              return (
                                                  <div key={appt.id} className={`absolute top-1.5 bottom-1.5 rounded-lg px-3 flex items-center shadow-sm cursor-pointer hover:brightness-110 transition-all ${getBarColor(appt.type)} border border-white/10`} style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` }} onClick={() => openEditModal(appt)} title={`${appt.title} - ${appt.patientName}`}><span className="text-[10px] font-bold truncate w-full">{appt.patientName}</span></div>
                                              )
                                          })}
                                          {typeAppts.length === 0 && (<div className="absolute inset-0 flex items-center justify-center opacity-20 text-[9px] font-bold uppercase tracking-widest text-slate-500">No Scheduled {type}</div>)}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      )
  };

  const MiniReportModal = () => {
        const todayAppointments = appointments.filter(a => a.date === new Date().toISOString().split('T')[0]);
        const criticalPatients = patients.filter(p => p.status === 'Critical');
        return (
          <AnimatePresence>
              {activeModal === 'mini_report' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`relative w-full max-w-sm p-6 rounded-2xl border shadow-2xl ${cardClass}`}><button onClick={() => setActiveModal('none')} className="absolute top-4 right-4"><X size={18} /></button><h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><FileBarChart className="text-amber-500"/> Daily Summary</h2><div className="space-y-4"><div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex justify-between items-center"><span className="text-xs font-bold">Total Patients</span><span className="text-xl font-black">{patients.length}</span></div><div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex justify-between items-center text-red-600 dark:text-red-400"><span className="text-xs font-bold">Critical Cases</span><span className="text-xl font-black">{criticalPatients.length}</span></div><div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex justify-between items-center"><span className="text-xs font-bold">Today's Appts</span><span className="text-xl font-black">{todayAppointments.length}</span></div></div></motion.div>
                  </div>
              )}
          </AnimatePresence>
        );
  }

  const EmergencyModal = () => {
      return (
        <AnimatePresence>
            {activeModal === 'emergency' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-red-900/90 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="relative w-full max-w-sm p-8 rounded-3xl border-4 border-red-500 bg-black text-white text-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">
                        <Siren size={64} className="mx-auto text-red-500 mb-4 animate-pulse" />
                        <h2 className="text-2xl font-black uppercase text-red-500 mb-2">Emergency Protocol</h2>
                        <div className="flex gap-4"><button onClick={() => setActiveModal('none')} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold uppercase text-xs">Cancel</button><button onClick={() => { alert("Emergency Team Dispatched"); setActiveModal('none'); }} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold uppercase text-xs animate-pulse">Activate</button></div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      )
  }

  return (
    <div className="h-full flex flex-col">
        <WelcomeBanner />
        <div className="flex mb-3 border-b border-slate-200 dark:border-slate-800"><button onClick={() => setViewMode('personal')} className={`pb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${viewMode === 'personal' ? (isDarkMode ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500') : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t.dashboard.tabs.personal}</button><button onClick={() => setViewMode('department')} className={`pb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${viewMode === 'department' ? (isDarkMode ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500') : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t.dashboard.tabs.department}</button></div>
        <AnimatePresence mode="wait">
            <motion.div key={viewMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex-1 overflow-visible">
                {viewMode === 'personal' ? <PersonalDashboard /> : <DepartmentDashboard />}
            </motion.div>
        </AnimatePresence>
        <MiniReportModal />
        
        <ChatInterface 
            isOpen={activeModal === 'chat_patient' || activeModal === 'chat_doctor'}
            onClose={() => setActiveModal('none')}
            isDoctorChat={activeModal === 'chat_doctor'}
            currentUser={currentUser}
            activeChats={activeChats}
            isDarkMode={isDarkMode}
            myPatients={patients} 
        />
        
        <EmergencyModal />
        
        <AnimatePresence>
            {isApptModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsApptModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-sm p-6 rounded-2xl border shadow-2xl ${cardClass} max-h-[90vh] overflow-y-auto`}>
                        <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-black uppercase flex items-center">{editingApptId ? (<><Edit2 size={18} className={`mr-2 ${themeColor}`} /> {t.dashboard.schedule.modal.edit}</>) : (<><Plus size={18} className={`mr-2 ${themeColor}`} /> {t.dashboard.schedule.modal.add}</>)}</h2><button onClick={() => setIsApptModalOpen(false)}><X size={18} /></button></div>
                        <form onSubmit={handleSaveAppointment} className="space-y-3">
                            <div className="mb-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Date</label>
                                <input type="date" required value={newAppt.date} onChange={e => setNewAppt({...newAppt, date: e.target.value})} className={`w-full p-2.5 rounded border outline-none text-sm mt-1 ${inputClass}`} />
                            </div>
                            <div><label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{t.dashboard.schedule.modal.patient_name}</label><select value={newAppt.patientId || ''} onChange={handlePatientSelect} className={`w-full p-2.5 rounded border outline-none text-sm mt-1 ${inputClass}`}><option value="">-- Manual Entry / Walk-in --</option>{patients.map(p => (<option key={p.id} value={p.id}>{p.name} (ID: {p.id.substring(0,4)}...)</option>))}</select><input type="text" required value={newAppt.patientName} onChange={e => setNewAppt({...newAppt, patientName: e.target.value})} className={`w-full p-2.5 rounded border outline-none text-sm mt-2 ${inputClass} ${newAppt.patientId ? 'opacity-70 cursor-not-allowed' : ''}`} placeholder="Or type name..." readOnly={!!newAppt.patientId} /></div>
                            <div><label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{t.dashboard.schedule.modal.activity}</label><input type="text" required value={newAppt.title} onChange={e => setNewAppt({...newAppt, title: e.target.value})} className={`w-full p-2.5 rounded border outline-none text-sm mt-1 ${inputClass}`} placeholder="e.g. Scan" /></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{t.dashboard.schedule.modal.start_time}</label><select value={newAppt.startTime} onChange={e => setNewAppt({...newAppt, startTime: Number(e.target.value)})} className={`w-full p-2.5 rounded border outline-none text-sm mt-1 ${inputClass}`}>{TIME_SLOTS.map(t => <option key={t} value={t}>{t}:00</option>)}</select></div><div><label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{t.dashboard.schedule.modal.duration}</label><input type="number" step="0.5" value={newAppt.duration} onChange={e => setNewAppt({...newAppt, duration: Number(e.target.value)})} className={`w-full p-2.5 rounded border outline-none text-sm mt-1 ${inputClass}`} /></div></div>
                            <div className="grid grid-cols-2 gap-3"><div><label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{t.dashboard.schedule.modal.type}</label><select value={newAppt.type} onChange={e => setNewAppt({...newAppt, type: e.target.value as any})} className={`w-full p-2.5 rounded border outline-none text-sm mt-1 ${inputClass}`}><option value="Diagnosis">{t.dashboard.schedule.types.Diagnosis}</option><option value="Consult">{t.dashboard.schedule.types.Consult}</option><option value="Surgery">{t.dashboard.schedule.types.Surgery}</option><option value="Meeting">{t.dashboard.schedule.types.Meeting}</option></select></div><div><label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{t.dashboard.schedule.modal.status}</label><select value={newAppt.status} onChange={e => setNewAppt({...newAppt, status: e.target.value as any})} className={`w-full p-2.5 rounded border outline-none text-sm mt-1 ${inputClass}`}><option value="Pending">{t.dashboard.schedule.statuses.Pending}</option><option value="In Progress">{t.dashboard.schedule.statuses["In Progress"]}</option><option value="Done">{t.dashboard.schedule.statuses.Done}</option></select></div></div>
                            <div className="flex gap-2 mt-6">{editingApptId && (<button type="button" onClick={() => handleDelete()} className={`px-4 py-3 rounded-lg font-bold text-white uppercase text-xs tracking-widest bg-slate-700 hover:bg-red-600 transition-colors`}><Trash2 size={16} /></button>)}<button type="submit" className={`flex-1 py-3 rounded-lg font-bold text-white uppercase text-xs tracking-widest ${themeBg} hover:brightness-110 flex items-center justify-center`}><Save size={16} className="mr-2" />{editingApptId ? t.dashboard.schedule.modal.update : t.dashboard.schedule.modal.save}</button></div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Dashboard;