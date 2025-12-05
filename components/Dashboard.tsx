import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, Calendar as CalendarIcon, ArrowRight, MoreHorizontal, Clock, CheckCircle, XCircle, Phone, Activity, TrendingUp, AlertTriangle, AlertCircle, ChevronDown, Filter, Info, Stethoscope, BedDouble, Check, HeartPulse, ShieldCheck, Thermometer, FileText, Video, MessageSquare, Plus, Search, MapPin, ScanEye, Loader2, X, Save, Trash2, Edit2, ChevronLeft, ChevronRight, MessageCircle, UserCog, FileBarChart, Siren, Send, User as UserIcon } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeToPatients } from '../services/patientService';
import { subscribeToAppointments, subscribeToAppointmentsRange, addAppointment, updateAppointmentStatus, updateAppointment, deleteAppointment } from '../services/scheduleService';
import { subscribeToUsers, subscribeToMessages, sendMessage, getChatId, subscribeToActiveChats, markChatAsRead } from '../services/chatService';
import { Patient, Appointment, UserProfile, ChatUser, ChatMessage, ChatSession } from '../types';
import { User } from 'firebase/auth';

interface DashboardProps {
    isDarkMode: boolean;
    currentUser: User | null;
    userProfile?: UserProfile | null;
    setView: (view: string) => void;
}

const TIME_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; // 8:00 to 17:00

// --- EXTRACTED COMPONENTS TO PREVENT RE-RENDER STATE LOSS ---

const ChatInterface = ({
  isOpen,
  onClose,
  isDoctorChat,
  currentUser,
  activeChats,
  isDarkMode
}: {
  isOpen: boolean;
  onClose: () => void;
  isDoctorChat: boolean;
  currentUser: User | null;
  activeChats: ChatSession[];
  isDarkMode: boolean;
}) => {
    const title = isDoctorChat ? "Colleague Chat" : "Patient Support";
    const cardClass = isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-lg shadow-blue-50";
    
    const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
    const [selectedChatUser, setSelectedChatUser] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    
    const [patientMessages, setPatientMessages] = useState([{ id: '1', text: "Hello, I have a question about my prescription.", senderId: 'them', createdAt: new Date() }]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch users when opening doctor chat
    useEffect(() => {
        if (isOpen && isDoctorChat && currentUser) {
            setIsLoadingUsers(true);
            const unsub = subscribeToUsers(currentUser.uid, (users) => {
                setChatUsers(users);
                setIsLoadingUsers(false);
            });
            return () => unsub();
        }
    }, [isOpen, isDoctorChat, currentUser]);

    // Fetch messages when a user is selected
    useEffect(() => {
        if (isDoctorChat && currentUser && selectedChatUser) {
            const chatId = getChatId(currentUser.uid, selectedChatUser.uid);
            const unsub = subscribeToMessages(chatId, (msgs) => setMessages(msgs));
            markChatAsRead(chatId);
            return () => unsub();
        }
    }, [isDoctorChat, currentUser, selectedChatUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, patientMessages, selectedChatUser]);

    const handleSendMessage = async () => {
        if (!inputMsg.trim()) return;
        const msgToSend = inputMsg;
        setInputMsg(""); // Optimistic clear
        
        if (isDoctorChat && currentUser && selectedChatUser) {
            const chatId = getChatId(currentUser.uid, selectedChatUser.uid);
            try {
                await sendMessage(chatId, currentUser.uid, msgToSend);
            } catch (err) {
                console.error(err);
                setInputMsg(msgToSend); // Revert
                alert("Failed to send message");
            }
        } else if (!isDoctorChat) {
            const newMsg = { id: Date.now().toString(), text: msgToSend, senderId: 'me', createdAt: new Date() };
            setPatientMessages(prev => [...prev, newMsg]);
            
            setTimeout(() => {
                setPatientMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: "I see. Let me check your records.", senderId: 'them', createdAt: new Date() }]);
            }, 1000);
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

    const resetState = () => {
        setSelectedChatUser(null);
        setMessages([]);
        onClose();
    }

    return (
      <AnimatePresence>
          {isOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetState} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={`relative w-full max-w-md h-[600px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${cardClass}`}>
                      
                      <div className={`p-4 ${isDoctorChat ? 'bg-indigo-600' : 'bg-teal-600'} text-white flex justify-between items-center`}>
                          <div className="flex items-center gap-2">
                              {selectedChatUser ? (
                                  <button onClick={handleBackToUserList}><ChevronLeft size={20}/></button>
                              ) : (
                                  isDoctorChat ? <UserCog size={20}/> : <MessageCircle size={20}/>
                              )}
                              <div className="flex flex-col">
                                  <span className="font-bold text-sm">
                                      {selectedChatUser ? selectedChatUser.displayName : title}
                                  </span>
                                  {selectedChatUser && <span className="text-[10px] opacity-70">Online</span>}
                              </div>
                          </div>
                          <button onClick={resetState}><X size={18} /></button>
                      </div>

                      {isDoctorChat && !selectedChatUser ? (
                          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 p-2">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 p-2">Available Doctors</h4>
                              {isLoadingUsers ? (
                                  <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                              ) : chatUsers.length === 0 ? (
                                  <div className="p-4 text-center text-slate-500 text-xs">No other doctors found.</div>
                              ) : (
                                  <div className="space-y-1">
                                      {chatUsers.map(user => {
                                          const chatId = getChatId(currentUser!.uid, user.uid);
                                          const chatSession = activeChats.find(c => c.id === chatId);
                                          const hasUnread = chatSession?.lastMessage && !chatSession.lastMessage.seen && chatSession.lastMessage.senderId !== currentUser?.uid;

                                          return (
                                              <div 
                                                  key={user.uid} 
                                                  onClick={() => handleSelectUser(user)}
                                                  className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700`}
                                              >
                                                  <div className="relative mr-3">
                                                      <img src={user.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop"} className="w-10 h-10 rounded-full object-cover" alt="Avatar"/>
                                                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                                  </div>
                                                  <div className="flex-1">
                                                      <div className="flex justify-between items-center">
                                                          <h5 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.displayName}</h5>
                                                          {hasUnread && <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>}
                                                      </div>
                                                      <p className="text-[10px] text-slate-500">{user.specialty || 'General'}</p>
                                                  </div>
                                                  <ChevronRight size={14} className="ml-auto text-slate-400"/>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="flex-1 flex flex-col min-h-0">
                              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar">
                                  {(isDoctorChat ? messages : patientMessages).map((m: any) => {
                                      const isMe = isDoctorChat ? m.senderId === currentUser?.uid : m.senderId === 'me';
                                      return (
                                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                              <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'}`}>
                                                  {m.text}
                                              </div>
                                          </div>
                                      );
                                  })}
                                  <div ref={messagesEndRef} />
                              </div>
                              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
                                  <input 
                                      className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-3 rounded-xl outline-none placeholder-slate-500" 
                                      placeholder="Type a message..."
                                      value={inputMsg}
                                      onChange={e => setInputMsg(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                  />
                                  <button onClick={handleSendMessage} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Send size={16}/></button>
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
  
  const [statsData, setStatsData] = useState<{name: string, patients: number}[]>([]);
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);

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
  
  // ... (useEffects remain same) ...
  useEffect(() => {
    if (currentUser) {
        const unsubscribe = subscribeToPatients(
            currentUser.uid,
            (data) => setPatients(data),
            (err) => console.error("Patient fetch error", err)
        );
        return () => unsubscribe();
    }
  }, [currentUser]);

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

  useEffect(() => {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const unsubscribe = subscribeToAppointments(
          dateStr,
          (data) => setAppointments(data),
          (err) => console.error("Schedule fetch error", err)
      );
      return () => unsubscribe();
  }, [selectedDate]);

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

      const unsubscribe = subscribeToAppointmentsRange(
          startStr,
          endStr,
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
          (err) => console.error("Stats fetch error", err)
      );
      return () => unsubscribe();
  }, [language]);
  
  const openAddModal = (typeOverride?: string) => {
      setEditingApptId(null);
      // Default to selected date from calendar view
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
          date: dateStr // Initialize with currently selected date
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
              patientId: newAppt.patientId || undefined,
              patientName: newAppt.patientName || 'Unknown',
              title: newAppt.title || 'Checkup',
              type: newAppt.type as any,
              startTime: Number(newAppt.startTime),
              duration: Number(newAppt.duration),
              status: newAppt.status || 'Pending',
              date: newAppt.date || new Date().toISOString().split('T')[0], // Use the date from the form
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

  const handleStatusToggle = async (e: React.MouseEvent, id: string, currentStatus: string) => {
      e.stopPropagation();
      const newStatus = currentStatus === 'Done' ? 'Pending' : currentStatus === 'Pending' ? 'In Progress' : 'Done';
      await updateAppointmentStatus(id, newStatus as any);
  };

  const formatTime = (time: number) => {
      const hours = Math.floor(time);
      const minutes = Math.round((time - hours) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const cardClass = isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-lg shadow-blue-50";
  const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
  const themeColor = isDarkMode ? "text-red-500" : "text-blue-500";
  const themeBg = isDarkMode ? "bg-red-500" : "bg-blue-500";
  const themeBorder = isDarkMode ? "border-red-500" : "border-blue-500";
  const inputClass = isDarkMode ? "bg-slate-950 border-slate-700 text-white focus:border-red-600" : "bg-white border-slate-300 text-slate-900 focus:border-blue-600";
  const hoverEffect = "hover:shadow-xl hover:-translate-y-1 transition-all duration-300"; // Common hover class

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const getTranslatedType = (type: string) => {
      // @ts-ignore
      return t.dashboard.schedule.types[type] || type;
  };
  
  const WelcomeBanner = () => {
    const bannerImage = userProfile?.bannerURL || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop";
    return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`relative w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6 flex items-end shadow-2xl group ${isDarkMode ? 'shadow-black/50' : 'shadow-slate-300'} ${hoverEffect}`}>
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

      // Calculate Daily Completion Rate
      const completionRate = useMemo(() => {
          if (appointments.length === 0) return 0;
          const done = appointments.filter(a => a.status === 'Done').length;
          return Math.round((done / appointments.length) * 100);
      }, [appointments]);

      return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-3 lg:col-span-1">
                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border ${cardClass} relative overflow-hidden ${hoverEffect} hover:border-blue-400 dark:hover:border-slate-600`}>
                        <div className="flex items-center space-x-3 mb-3 relative z-10">
                            <div className="relative">
                                <img src={userProfile?.photoURL || currentUser?.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop"} className={`w-12 h-12 rounded-xl object-cover border-2 ${themeBorder} shadow-lg`} alt="Profile" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center"><Check size={8} className="text-white" /></div>
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="text-sm font-bold leading-tight truncate">{userProfile?.displayName || currentUser?.displayName || 'Medical Staff'}</h3>
                                <p className={`text-[9px] ${textMuted} uppercase tracking-wider font-bold`}>{userProfile?.specialty || 'Medical Specialist'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 relative z-10">
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                <p className={`text-[8px] font-bold uppercase ${textMuted}`}>{t.dashboard.profile.patients}</p>
                                <p className={`text-sm font-black ${themeColor}`}>{patients.length > 0 ? patients.length : <Loader2 size={12} className="animate-spin inline"/>}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                <p className={`text-[8px] font-bold uppercase ${textMuted}`}>{t.dashboard.profile.completion}</p>
                                <p className="text-sm font-black text-green-500">{completionRate}%</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border ${cardClass} flex flex-col h-[320px] ${hoverEffect} hover:border-blue-400 dark:hover:border-slate-600`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-xs">{t.dashboard.agenda.title}</h3>
                            <button onClick={() => openAddModal()} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><Plus size={14} className={themeColor}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                            {appointments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50"><CalendarIcon size={24} className="mb-2" /><p className="text-[10px] font-bold uppercase">{t.dashboard.schedule.no_appointments}</p><button onClick={() => openAddModal()} className="mt-2 text-[9px] underline">{t.dashboard.schedule.add_one}</button></div>
                            ) : (
                                appointments.map((item) => (
                                    <div key={item.id} className="flex gap-2 group cursor-pointer relative" onClick={() => openEditModal(item)}>
                                        <div className="flex flex-col items-center"><span className={`text-[9px] font-bold ${item.status === 'Done' ? 'text-slate-400 line-through' : themeColor}`}>{formatTime(item.startTime)}</span><div className={`w-0.5 h-full mt-0.5 ${item.status === 'Done' ? 'bg-slate-200 dark:bg-slate-800' : isDarkMode ? 'bg-red-900' : 'bg-blue-200'}`} /></div>
                                        <div className={`flex-1 p-2 rounded-lg border mb-0.5 transition-all relative group hover:shadow-md ${item.status === 'In Progress' ? (isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-blue-50 border-blue-200') : item.status === 'Done' ? 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 opacity-60' : `bg-white dark:bg-slate-900 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}`}>
                                            <div className="flex justify-between items-start"><span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded mb-0.5 inline-block ${item.type === 'Surgery' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{getTranslatedType(item.type)}</span><div className="flex items-center space-x-2"><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button><button onClick={(e) => handleStatusToggle(e, item.id, item.status)} className={`w-4 h-4 rounded-full border flex items-center justify-center ${item.status === 'In Progress' ? `${themeBg} border-transparent` : 'border-slate-300'}`}>{item.status === 'In Progress' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}</button></div></div>
                                            <h4 className={`text-[10px] font-bold ${item.status === 'Done' ? 'line-through text-slate-400' : ''}`}>{item.title} - <span className="opacity-70">{item.patientName}</span></h4>
                                            <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={10} className="text-slate-400"/></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                    <motion.div variants={itemVariants}>
                        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${textMuted}`}>{t.dashboard.quick_actions.title}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                { id: 'chat_patient', icon: MessageCircle, label: t.dashboard.quick_actions.chat_patient, color: isDarkMode ? 'text-teal-500' : 'text-teal-600', bg: 'bg-teal-500/10', showDot: false },
                                { id: 'chat_doctor', icon: UserCog, label: t.dashboard.quick_actions.chat_doctor, color: 'text-indigo-500', bg: 'bg-indigo-500/10', showDot: hasUnreadMessages },
                                { id: 'mini_report', icon: FileBarChart, label: t.dashboard.quick_actions.mini_report, color: 'text-amber-500', bg: 'bg-amber-500/10', showDot: false },
                                { id: 'emergency', icon: Siren, label: t.dashboard.quick_actions.emergency, color: 'text-red-600', bg: 'bg-red-600/10', showDot: false },
                            ].map((action, i) => (
                                <motion.button 
                                    key={i}
                                    whileHover={{ scale: 1.05, y: -3, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleQuickAction(action.id)}
                                    className={`relative p-2.5 rounded-xl border ${cardClass} flex flex-col items-center justify-center gap-1.5 transition-all hover:${isDarkMode ? 'border-red-700' : 'border-blue-300'}`}
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

                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border ${cardClass} h-[200px] ${hoverEffect} hover:border-blue-400 dark:hover:border-slate-600`}>
                        <div className="flex justify-between items-center mb-2">
                            <div><h3 className="font-bold text-xs">{t.dashboard.stats.title} (Last 7 Days)</h3></div>
                            <div className="flex space-x-2"><span className="flex items-center text-[9px] font-bold"><div className={`w-1 h-1 ${themeBg} rounded-full mr-1`}/> Appointments</span></div>
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
                                <div className="w-full h-full flex items-center justify-center opacity-50"><Loader2 className="animate-spin mr-2" size={16}/> Loading Stats...</div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
      );
  }

  const DepartmentDashboard = () => {
      const getPos = (start: number, duration: number) => {
          const totalHours = 17 - 8;
          const startOffset = start - 8;
          const left = (startOffset / totalHours) * 100;
          const width = (duration / totalHours) * 100;
          return { left: `${Math.max(0, left)}%`, width: `${Math.min(100, width)}%` };
      };
      const getTypeColor = (type: string) => {
          switch(type) { case 'Diagnosis': return 'bg-blue-500'; case 'Surgery': return 'bg-red-500'; case 'Consult': return 'bg-purple-500'; default: return 'bg-slate-400'; }
      }
      const generateCalendar = () => {
          const days = []; const year = selectedDate.getFullYear(); const month = selectedDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDayOfMonth = new Date(year, month, 1).getDay();
          for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
          for (let i = 1; i <= daysInMonth; i++) days.push(i);
          return days;
      };
      const calendarDays = generateCalendar();
      const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

      return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3"><h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.dashboard.schedule.title}</h2><button onClick={() => openAddModal()} className={`p-1.5 rounded-full ${themeBg} text-white shadow hover:scale-105 transition-transform`}><Plus size={14} /></button><div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div><div className="flex p-0.5 rounded-lg border bg-slate-100 dark:bg-slate-800 dark:border-slate-700"><button onClick={() => setScheduleViewType('timeline')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${scheduleViewType === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>{t.dashboard.schedule.timeline}</button><button onClick={() => setScheduleViewType('calendar')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${scheduleViewType === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>{t.dashboard.schedule.calendar}</button></div></div>
            </div>
            {scheduleViewType === 'timeline' ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-3 rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#1e293b] border-slate-700 text-white'} ${hoverEffect} hover:border-blue-400 dark:hover:border-slate-600`}>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2"><h3 className="font-bold text-sm text-white">{t.dashboard.schedule.timeline}</h3><div className="text-[10px] font-mono text-slate-400 opacity-70">{selectedDate.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <div className="min-w-[700px] sm:min-w-full">
                            <div className="flex mb-2 pl-36 relative h-5">{TIME_SLOTS.map((hour, i) => (<div key={hour} className="absolute text-[9px] font-bold text-slate-500 transform -translate-x-1/2 flex flex-col items-center h-full" style={{ left: `${(i / (TIME_SLOTS.length - 1)) * 100}%` }}><span>{hour}:00</span><div className="h-1 w-px bg-slate-700 mt-0.5"></div></div>))} <div className="absolute top-5 left-0 right-0 h-[250px] pointer-events-none z-0">{TIME_SLOTS.map((_, i) => (<div key={`line-${i}`} className="absolute top-0 bottom-0 w-px bg-slate-800/50" style={{ left: `${(i / (TIME_SLOTS.length - 1)) * 100}%` }} />))}</div></div>
                            <div className="space-y-3 relative z-10">
                                {appointments.map((appt) => {
                                    const isDone = appt.status === 'Done';
                                    return (
                                        <motion.div key={appt.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center group">
                                            <div className={`w-36 flex-shrink-0 flex items-center gap-2 pr-2 overflow-hidden transition-opacity ${isDone ? 'opacity-50' : ''}`}><div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[10px] ${isDone ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 text-white'}`}>{appt.patientName.charAt(0)}</div><div className="flex-1 min-w-0 flex items-center justify-between group/name"><p className={`text-[10px] font-bold truncate ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>{appt.patientName}</p><button onClick={() => handleDelete(appt.id)} className="opacity-0 group-hover/name:opacity-100 p-1 text-slate-500 hover:text-red-500 transition-opacity" title="Delete Appointment"><Trash2 size={10} /></button></div></div>
                                            <div className="flex-1 relative h-8 bg-slate-800/50 rounded-lg flex items-center overflow-hidden">{(() => { const { left, width } = getPos(appt.startTime, appt.duration); return (<motion.div whileHover={{ scale: 1.02, zIndex: 10 }} className={`absolute h-5 rounded-md flex items-center px-2 shadow-lg cursor-pointer border border-white/10 ${isDone ? 'bg-slate-700/50 line-through text-slate-400 grayscale' : getTypeColor(appt.type)}`} style={{ left, width }} onClick={() => openEditModal(appt)}><span className={`text-[8px] font-bold truncate ${isDone ? 'text-slate-400' : 'text-white'}`}>{appt.title}</span></motion.div>); })()}</div>
                                        </motion.div>
                                    );
                                })}
                                {appointments.length === 0 && (<div className="text-center py-10 text-slate-500 text-xs font-bold">{t.dashboard.schedule.no_tasks}</div>)}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-4 rounded-xl border ${cardClass} ${hoverEffect} hover:border-blue-400 dark:hover:border-slate-600`}>
                    <div className="flex items-center justify-between mb-4"><div className="flex items-center space-x-2"><button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"><ChevronLeft size={16}/></button><h3 className="font-bold text-sm uppercase tracking-wider">{selectedDate.toLocaleString(language === 'vi' ? 'vi-VN' : 'default', { month: 'long', year: 'numeric' })}</h3><button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"><ChevronRight size={16}/></button></div></div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">{weekDays.map(day => (<div key={day} className={`text-[10px] font-bold ${textMuted} uppercase`}>{day}</div>))}</div>
                    <div className="grid grid-cols-7 gap-1">{calendarDays.map((day, idx) => (<div key={idx} onClick={() => day && setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))} className={`h-16 rounded-lg border flex flex-col items-start p-1 transition-colors relative cursor-pointer ${!day ? 'border-transparent cursor-default' : ''} ${day === selectedDate.getDate() ? (isDarkMode ? 'border-red-500 bg-red-900/20' : 'border-blue-500 bg-blue-50') : (isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50')}`}>{day && (<><span className={`text-[10px] font-bold ${day === selectedDate.getDate() ? themeColor : ''}`}>{day}</span>{day % 3 === 0 && <div className="mt-auto flex gap-0.5"><div className="w-1 h-1 rounded-full bg-blue-500"></div><div className="w-1 h-1 rounded-full bg-red-500"></div></div>}</>)}</div>))}</div>
                </motion.div>
            )}
        </motion.div>
      );
  }

  // ... (Rest of component including modals and returns) ...
  // Ensuring all closing brackets match the original logic
  const MiniReportModal = () => {
      const todayAppointments = appointments.filter(a => a.date === new Date().toISOString().split('T')[0]);
      const criticalPatients = patients.filter(p => p.status === 'Critical');
      return (
        <AnimatePresence>
            {activeModal === 'mini_report' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`relative w-full max-w-sm p-6 rounded-2xl border shadow-2xl ${cardClass}`}><button onClick={() => setActiveModal('none')} className="absolute top-4 right-4"><X size={18} /></button><h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><FileBarChart className="text-amber-500"/> Daily Summary</h2><div className="space-y-4"><div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex justify-between items-center"><span className="text-xs font-bold">Total Patients</span><span className="text-xl font-black">{patients.length}</span></div><div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex justify-between items-center text-red-600 dark:text-red-400"><span className="text-xs font-bold">Critical Cases</span><span className="text-xl font-black">{criticalPatients.length}</span></div><div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex justify-between items-center"><span className="text-xs font-bold">Today's Appts</span><span className="text-xl font-black">{todayAppointments.length}</span></div><div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"><p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Efficiency Score</p><div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-[85%]"></div></div><div className="text-right text-xs font-bold mt-1 text-green-500">85% Excellent</div></div></div></motion.div>
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
                        <p className="text-sm text-slate-300 mb-6">Confirm activation of emergency response team for critical patient triage?</p>
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
        
        {/* Using Extracted Chat Interface */}
        <ChatInterface 
            isOpen={activeModal === 'chat_patient' || activeModal === 'chat_doctor'}
            onClose={() => setActiveModal('none')}
            isDoctorChat={activeModal === 'chat_doctor'}
            currentUser={currentUser}
            activeChats={activeChats}
            isDarkMode={isDarkMode}
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
                                <input 
                                    type="date" 
                                    required 
                                    value={newAppt.date} 
                                    onChange={e => setNewAppt({...newAppt, date: e.target.value})} 
                                    className={`w-full p-2.5 rounded border outline-none text-sm mt-1 ${inputClass}`} 
                                />
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