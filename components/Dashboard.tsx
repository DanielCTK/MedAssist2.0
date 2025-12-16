
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Calendar as CalendarIcon, Clock, Check, HeartPulse, Plus, Search, MapPin, ScanEye, Loader2, X, Save, Trash2, Edit2, Activity, MessageSquare, Coffee, FileBarChart, Siren, RefreshCw, UserPlus, Pill, Cpu } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeToPatients } from '../services/patientService';
import { subscribeToAppointments, subscribeToAppointmentsRange, addAppointment, updateAppointmentStatus, updateAppointment, deleteAppointment, subscribeToPendingAppointments } from '../services/scheduleService';
import { Patient, Appointment, UserProfile } from '../types';
import { User } from 'firebase/auth';

interface DashboardProps {
    isDarkMode: boolean;
    currentUser: User | null;
    userProfile?: UserProfile | null;
    setView: (view: string) => void;
}

const TIME_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15]; 

const Dashboard: React.FC<DashboardProps> = ({ isDarkMode, currentUser, userProfile, setView }) => {
  const [viewMode, setViewMode] = useState<'personal' | 'department'>('personal');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]); 
  
  const [statsData, setStatsData] = useState<{name: string, patients: number}[]>([]);

  const [patientRefreshTrigger, setPatientRefreshTrigger] = useState(0);
  const [isRefreshingPatients, setIsRefreshingPatients] = useState(false);

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

  const { t, language } = useLanguage();
  
  const cardClass = isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-lg shadow-blue-50";
  const themeColor = isDarkMode ? "text-red-500" : "text-blue-600";
  const themeBg = isDarkMode ? "bg-red-600" : "bg-blue-600";
  const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
  const inputClass = isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400";
  const hoverEffect = "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-blue-400 dark:hover:border-slate-600";

  // Calculations moved to top level
  const completionRate = useMemo(() => {
      if (appointments.length === 0) return 0;
      const done = appointments.filter(a => a.status === 'Done').length;
      return Math.round((done / appointments.length) * 100);
  }, [appointments]);

  useEffect(() => {
    if (currentUser) {
        const unsubscribe = subscribeToPatients(
            currentUser.uid,
            (data) => {
                setPatients(data);
                setIsRefreshingPatients(false); 
            },
            (err) => {
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
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const unsubscribe = subscribeToAppointments(
          dateStr,
          currentUser?.uid, 
          (data) => setAppointments(data),
          (err) => console.error(err)
      );
      return () => unsubscribe();
  }, [selectedDate, currentUser]);

  useEffect(() => {
      const unsubscribe = subscribeToPendingAppointments(
          currentUser?.uid, 
          (data) => setPendingAppointments(data),
          (err) => console.error(err)
      );
      return () => unsubscribe();
  }, [currentUser]);

 useEffect(() => {
      const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      };

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6); 

      const startStr = formatDate(start);
      const endStr = formatDate(end);

      const unsubscribe = subscribeToAppointmentsRange(
          startStr,
          endStr,   
          currentUser?.uid,
          (data) => {
              const counts: Record<string, number> = {};
              for (let i = 0; i < 7; i++) {
                  const d = new Date(start);
                  d.setDate(start.getDate() + i);
                  const dStr = formatDate(d);
                  counts[dStr] = 0;
              }

              data.forEach(appt => {
                  if (counts[appt.date] !== undefined && appt.status !== 'Pending') {
                      counts[appt.date]++;
                  }
              });

              const chartData = Object.entries(counts)
                  .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                  .map(([dateStr, count]) => {
                      const date = new Date(dateStr);
                      const dayName = date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' });
                      return { name: dayName, patients: count };
                  });

              setStatsData(chartData);
          },
          (err) => console.error(err)
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
              doctorId: currentUser?.uid, 
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

  const handleStatusToggle = async (e: React.MouseEvent, id: string, currentStatus: string) => {
      e.stopPropagation();
      const newStatus = currentStatus === 'Done' ? 'Pending' : currentStatus === 'Pending' ? 'In Progress' : 'Done';
      await updateAppointmentStatus(id, newStatus as any);
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
  
  // Render functions instead of inline components to prevent remounting
  const renderWelcomeBanner = () => {
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

  const renderPersonalDashboard = () => (
        <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-3 lg:col-span-1">
                    <div className={`p-4 rounded-xl border ${cardClass} relative overflow-hidden ${hoverEffect}`}>
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
                    </div>

                    <div className={`p-4 rounded-xl border ${cardClass} flex flex-col h-[320px] ${hoverEffect}`}>
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
                                                        <button onClick={(e) => handleStatusToggle(e, item.id, 'Pending')} className="p-1 rounded-full bg-green-500 text-white hover:scale-110 transition-transform shadow-md"><Check size={12}/></button>
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
                                                    <button onClick={(e) => handleStatusToggle(e, item.id, item.status)} className={`w-4 h-4 rounded-full border flex items-center justify-center ${item.status === 'In Progress' ? `${isDarkMode ? 'bg-blue-500' : 'bg-blue-500'} border-transparent` : item.status === 'Done' ? 'bg-green-500 border-transparent' : 'border-slate-300'}`}>
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
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                    <div>
                        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Clinical Hub</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { 
                                    id: 'diagnosis', 
                                    icon: ScanEye, 
                                    label: language === 'vi' ? 'Chẩn đoán AI' : 'AI Scan', 
                                    desc: language === 'vi' ? 'Bắt đầu quét mới' : 'Start new scan',
                                    color: 'text-blue-500', 
                                    bg: 'bg-blue-500/10',
                                    action: () => setView('diagnosis') 
                                },
                                { 
                                    id: 'patient_add', 
                                    icon: UserPlus, 
                                    label: language === 'vi' ? 'Tiếp nhận' : 'Intake', 
                                    desc: language === 'vi' ? 'Thêm bệnh nhân' : 'Add patient',
                                    color: 'text-emerald-500', 
                                    bg: 'bg-emerald-500/10',
                                    action: () => setView('patients') 
                                },
                                { 
                                    id: 'pharmacy', 
                                    icon: Pill, 
                                    label: language === 'vi' ? 'Kho thuốc' : 'Pharmacy', 
                                    desc: language === 'vi' ? 'Kiểm tra kho' : 'Check stock',
                                    color: 'text-purple-500', 
                                    bg: 'bg-purple-500/10',
                                    action: () => setView('inventory') 
                                },
                                { 
                                    id: 'system_health', 
                                    icon: Cpu, 
                                    label: language === 'vi' ? 'Trạng thái' : 'System', 
                                    desc: 'AI Online • 45ms',
                                    color: 'text-orange-500', 
                                    bg: 'bg-orange-500/10',
                                    action: () => {} 
                                },
                            ].map((action, i) => (
                                <motion.button 
                                    key={i}
                                    whileHover={{ scale: 1.02, y: -3 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={action.action}
                                    className={`relative p-4 rounded-2xl border ${cardClass} flex flex-col items-start justify-between gap-3 transition-all h-[110px] overflow-hidden group hover:border-${action.color.split('-')[1]}-500/50`}
                                >
                                    <div className={`p-2.5 rounded-xl ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
                                        <action.icon size={20} />
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{action.label}</h4>
                                        <p className="text-[10px] opacity-60 font-medium">{action.desc}</p>
                                    </div>
                                    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-${action.color.split('-')[1]}-500/20 to-transparent blur-2xl rounded-full -mr-6 -mt-6 pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity`} />
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${cardClass} h-[200px] ${hoverEffect}`}>
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
                    </div>
                </div>
            </div>
        </div>
  );

  const renderDepartmentDashboard = () => {
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
                              const typeAppts = appointments.filter(a => a.type === type && a.status !== 'Pending');
                              return (
                                  <div key={type} className="grid grid-cols-[150px_1fr] group">
                                      <div className="flex items-center pr-4"><div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>{getIcon(type)}</div><div><h4 className="text-xs font-bold text-slate-900 dark:text-white">{type}</h4><p className="text-[9px] text-slate-500 uppercase tracking-wide">{typeAppts.length} Tasks</p></div></div>
                                      <div className="relative h-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                          <div className="absolute inset-0 flex pointer-events-none">{TIME_SLOTS.map(h => (<div key={h} className="flex-1 border-r border-slate-200/30 dark:border-slate-700/30 first:border-l"></div>))}</div>
                                          {typeAppts.map((appt, idx) => {
                                              const minTime = 8; const totalHours = 8; const left = ((appt.startTime - minTime) / totalHours) * 100; const width = (appt.duration / totalHours) * 100;
                                              if (appt.startTime < 8 || appt.startTime >= 16) return null;
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

  return (
    <div className="h-full flex flex-col">
        {renderWelcomeBanner()}
        <div className="flex mb-3 border-b border-slate-200 dark:border-slate-800"><button onClick={() => setViewMode('personal')} className={`pb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${viewMode === 'personal' ? (isDarkMode ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500') : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t.dashboard.tabs.personal}</button><button onClick={() => setViewMode('department')} className={`pb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${viewMode === 'department' ? (isDarkMode ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500') : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t.dashboard.tabs.department}</button></div>
        
        {/* Render functions directly instead of as components to maintain DOM stability */}
        <div className="flex-1 overflow-visible">
            {viewMode === 'personal' ? renderPersonalDashboard() : renderDepartmentDashboard()}
        </div>
        
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
