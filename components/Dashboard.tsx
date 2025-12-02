import React, { useState } from 'react';
import { Users, Calendar, ArrowRight, MoreHorizontal, Clock, CheckCircle, XCircle, Phone, Activity, TrendingUp, AlertTriangle, AlertCircle, ChevronDown, Filter, Info, Stethoscope, BedDouble, Check, HeartPulse, ShieldCheck, Thermometer, FileText, Video, MessageSquare, Plus, Search, MapPin, ScanEye } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
    isDarkMode: boolean;
}

const TIME_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; // 8:00 to 17:00

// --- MOCK DATA: DAILY SCHEDULE TIMELINE ---
const DAILY_SCHEDULE = [
    {
        id: 1,
        patientName: 'Nguyen Van A',
        avatar: 'https://i.pravatar.cc/150?u=1',
        activities: [
            { type: 'Scan AI', label: 'Retina Scan', start: 9, duration: 2.5, color: 'bg-blue-500' }
        ]
    },
    {
        id: 2,
        patientName: 'Tran Thi B',
        avatar: 'https://i.pravatar.cc/150?u=2',
        activities: [
             { type: 'Consult', label: 'Consultation', start: 13, duration: 1.5, color: 'bg-purple-500' }
        ]
    },
    {
        id: 3,
        patientName: 'Le Van C',
        avatar: 'https://i.pravatar.cc/150?u=3',
        activities: [
            { type: 'Surgery', label: 'Surgery', start: 10.5, duration: 3, color: 'bg-indigo-600' }
        ]
    },
    {
        id: 4,
        patientName: 'Pham Dung',
        avatar: 'https://i.pravatar.cc/150?u=4',
        activities: [
            { type: 'Test', label: 'Blood Test', start: 8, duration: 2, color: 'bg-slate-400' }
        ]
    },
    {
        id: 5,
        patientName: 'Hoang Tuan',
        avatar: 'https://i.pravatar.cc/150?u=5',
        activities: [
            { type: 'Scan AI', label: 'OCT Scan', start: 14.5, duration: 2, color: 'bg-blue-500' }
        ]
    }
];

// --- MOCK DATA: DOCTOR AGENDA ---
const DOCTOR_AGENDA = [
    { time: '08:30', title: 'Morning Briefing', type: 'Meeting', status: 'Done' },
    { time: '09:00', title: 'Scan (Nguyen Van A)', type: 'Diagnosis', status: 'In Progress' },
    { time: '11:00', title: 'Surgery: Le Van C', type: 'Surgery', status: 'Pending' },
    { time: '14:00', title: 'Consult: Tran Thi B', type: 'Consult', status: 'Pending' },
];

const Dashboard: React.FC<DashboardProps> = ({ isDarkMode }) => {
  const [viewMode, setViewMode] = useState<'personal' | 'department'>('personal');
  const { t, language } = useLanguage();
  
  // Theme Helpers
  const cardClass = isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-lg shadow-blue-50";
  const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
  const themeColor = isDarkMode ? "text-red-500" : "text-blue-500";
  const themeBg = isDarkMode ? "bg-red-500" : "bg-blue-500";
  const themeBorder = isDarkMode ? "border-red-500" : "border-blue-500";
  
  // Variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  // 1. WELCOME BANNER (Updated with Image Background)
  const WelcomeBanner = () => {
    // Image: Foggy Mountains (Zen/Serene)
    const bannerImage = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop";
    
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative w-full h-28 rounded-xl overflow-hidden mb-4 flex items-center shadow-xl ${isDarkMode ? 'shadow-black/50' : 'shadow-slate-300'}`}
        >
            {/* Background Image */}
            <img 
                src={bannerImage} 
                alt="Banner" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
            />
            
            {/* Gradient Overlays for Readability */}
            <div className={`absolute inset-0 bg-gradient-to-r ${isDarkMode ? 'from-black/90 via-black/50 to-transparent' : 'from-slate-900/80 via-slate-900/40 to-transparent'}`}></div>
            
            {/* Japanese Pattern Overlay (Subtle) */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] mix-blend-overlay"></div>
            
            <div className="relative z-10 px-6 flex justify-between items-center w-full">
                <div className="text-white">
                     <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-widest border border-white/20">
                            {new Date().toDateString()}
                        </span>
                        <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-red-200">
                            <MapPin size={10} className="mr-1" /> General Hospital
                        </span>
                     </div>
                    <h1 className="text-2xl font-black mb-1 tracking-tight text-white drop-shadow-md">{t.dashboard.greeting}, Dr. Fox!</h1>
                    <div className="flex items-center space-x-3 mt-1">
                        <p className="text-[11px] font-medium text-slate-200">
                             {t.dashboard.appointments_left.replace('{{count}}', '4')}
                        </p>
                    </div>
                </div>
                 
                 {/* 3D Illustration floating on the right */}
                 <div className="hidden md:block h-24 w-24 relative transform translate-y-2 translate-x-2">
                     <img 
                        src="https://cdni.iconscout.com/illustration/premium/thumb/medical-team-illustration-download-in-svg-png-gif-file-formats--doctor-nurse-healthcare-hospital-staff-pack-people-illustrations-4328578.png" 
                        className="w-full h-full object-contain drop-shadow-2xl filter brightness-110"
                        alt="Doctor"
                    />
                </div>
            </div>
        </motion.div>
      );
  };

  // --- VIEW 1: PERSONAL WORKSPACE ---
  const PersonalDashboard = () => {
      const statsData = [
          { name: 'Mon', patients: 12 }, { name: 'Tue', patients: 19 },
          { name: 'Wed', patients: 15 }, { name: 'Thu', patients: 22 },
          { name: 'Fri', patients: 18 }, { name: 'Sat', patients: 10 },
      ];

      return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* LEFT COLUMN: Profile & Agenda */}
                <div className="space-y-3 lg:col-span-1">
                    
                    {/* Doctor Profile Card (Compacted) */}
                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border ${cardClass} relative overflow-hidden`}>
                        <div className="flex items-center space-x-3 mb-3 relative z-10">
                            <div className="relative">
                                <img 
                                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop" 
                                    className={`w-10 h-10 rounded-lg object-cover border-2 ${themeBorder} shadow-md`}
                                    alt="Profile"
                                />
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                                    <Check size={6} className="text-white" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold leading-tight">Dr. Robert Fox</h3>
                                <p className={`text-[9px] ${textMuted} uppercase tracking-wider font-bold`}>Chief Surgeon</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 relative z-10">
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                <p className={`text-[8px] font-bold uppercase ${textMuted}`}>{t.dashboard.profile.patients}</p>
                                <p className={`text-sm font-black ${themeColor}`}>1,204</p>
                            </div>
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                <p className={`text-[8px] font-bold uppercase ${textMuted}`}>{t.dashboard.profile.surgery}</p>
                                <p className="text-sm font-black text-green-500">98%</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Today's Agenda (Shortened) */}
                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border ${cardClass} flex flex-col h-[280px]`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-xs">{t.dashboard.agenda.title}</h3>
                            <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><Plus size={12} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                            {DOCTOR_AGENDA.map((item, idx) => (
                                <div key={idx} className="flex gap-2 group cursor-pointer">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-[9px] font-bold ${item.status === 'Done' ? 'text-slate-400 line-through' : themeColor}`}>{item.time}</span>
                                        <div className={`w-0.5 h-full mt-0.5 ${item.status === 'Done' ? 'bg-slate-200 dark:bg-slate-800' : isDarkMode ? 'bg-red-900' : 'bg-blue-200'}`} />
                                    </div>
                                    <div className={`flex-1 p-2 rounded-lg border mb-0.5 transition-all ${
                                        item.status === 'In Progress' 
                                            ? (isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-blue-50 border-blue-200')
                                            : item.status === 'Done' ? 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 opacity-60' 
                                            : `bg-white dark:bg-slate-900 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`
                                    }`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded mb-0.5 inline-block ${
                                                item.type === 'Surgery' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                                            }`}>{item.type}</span>
                                            {item.status === 'In Progress' && <div className={`w-1.5 h-1.5 rounded-full ${themeBg} animate-pulse`} />}
                                        </div>
                                        <h4 className={`text-[10px] font-bold ${item.status === 'Done' ? 'line-through' : ''}`}>{item.title}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT COLUMN: Quick Actions & Stats */}
                <div className="lg:col-span-2 space-y-3">
                    
                    {/* Quick Actions Grid (Minimal) */}
                    <motion.div variants={itemVariants}>
                        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${textMuted}`}>{t.dashboard.quick_actions.title}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                { icon: Stethoscope, label: t.dashboard.quick_actions.diagnosis, color: isDarkMode ? 'text-red-500' : 'text-blue-500', bg: isDarkMode ? 'bg-red-500/10' : 'bg-blue-500/10' },
                                { icon: FileText, label: t.dashboard.quick_actions.report, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                                { icon: Video, label: t.dashboard.quick_actions.telehealth, color: 'text-green-500', bg: 'bg-green-500/10' },
                                { icon: MessageSquare, label: t.dashboard.quick_actions.consult, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                            ].map((action, i) => (
                                <motion.button 
                                    key={i}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`p-2.5 rounded-xl border ${cardClass} flex flex-col items-center justify-center gap-1.5 transition-colors hover:${isDarkMode ? 'border-red-700' : 'border-blue-300'}`}
                                >
                                    <div className={`p-1.5 rounded-full ${action.bg} ${action.color}`}>
                                        <action.icon size={16} />
                                    </div>
                                    <span className="text-[9px] font-bold">{action.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Patient Statistics Chart (Reduced Height 200px) */}
                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border ${cardClass} h-[200px]`}>
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h3 className="font-bold text-xs">{t.dashboard.stats.title}</h3>
                            </div>
                            <div className="flex space-x-2">
                                <span className="flex items-center text-[9px] font-bold"><div className={`w-1 h-1 ${themeBg} rounded-full mr-1`}/> {t.dashboard.quick_actions.consult}</span>
                                <span className="flex items-center text-[9px] font-bold text-slate-400"><div className="w-1 h-1 bg-slate-300 rounded-full mr-1"/> Surg</span>
                            </div>
                        </div>
                        <div className="w-full h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={isDarkMode ? '#ef4444' : '#3b82f6'} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={isDarkMode ? '#ef4444' : '#3b82f6'} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9 }} dy={5} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9 }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '10px' }}
                                        itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                                    />
                                    <Area type="monotone" dataKey="patients" stroke={isDarkMode ? '#ef4444' : '#3b82f6'} strokeWidth={2} fillOpacity={1} fill="url(#colorPatients)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>
            </div>

        </motion.div>
      );
  }

  // --- VIEW 2: DEPARTMENT SCHEDULE (Tighter Layout) ---
  const DepartmentDashboard = () => {
      // Calculate CSS percentages for the timeline
      const getPos = (start: number, duration: number) => {
          const totalHours = 17 - 8; // 9 hours total (8am to 5pm)
          const startOffset = start - 8;
          const left = (startOffset / totalHours) * 100;
          const width = (duration / totalHours) * 100;
          return { left: `${left}%`, width: `${width}%` };
      };

      return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            
            {/* Legend & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                     <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.dashboard.schedule.title}</h2>
                     <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                     <div className="flex space-x-2 text-[9px] font-bold uppercase tracking-wider">
                         <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span> Scan AI</span>
                         <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span> Consult</span>
                         <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span> Break</span>
                     </div>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded shadow-sm text-[10px] font-bold">Day</button>
                    <button className="px-2 py-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white text-[10px] font-bold">Week</button>
                </div>
            </div>

            {/* TIMELINE CONTAINER (More Compact) */}
            <motion.div 
                variants={itemVariants}
                className={`p-3 rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#1e293b] border-slate-700 text-white'}`}
            >
                <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
                     <h3 className="font-bold text-sm text-white">Schedule</h3>
                     <div className="text-[10px] font-mono text-slate-400 opacity-70">
                         {new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                     </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar pb-2">
                    <div className="min-w-[700px]">
                        
                        {/* Time Ruler */}
                        <div className="flex mb-2 pl-36 relative h-5">
                             {TIME_SLOTS.map((hour, i) => (
                                 <div 
                                    key={hour} 
                                    className="absolute text-[9px] font-bold text-slate-500 transform -translate-x-1/2 flex flex-col items-center h-full"
                                    style={{ left: `${(i / (TIME_SLOTS.length - 1)) * 100}%` }}
                                 >
                                     <span>{hour}:00</span>
                                     <div className="h-1 w-px bg-slate-700 mt-0.5"></div>
                                 </div>
                             ))}
                             {/* Background Grid Lines */}
                             <div className="absolute top-5 left-0 right-0 h-[250px] pointer-events-none z-0">
                                {TIME_SLOTS.map((_, i) => (
                                     <div 
                                        key={`line-${i}`} 
                                        className="absolute top-0 bottom-0 w-px bg-slate-800/50"
                                        style={{ left: `${(i / (TIME_SLOTS.length - 1)) * 100}%` }}
                                     />
                                ))}
                             </div>
                        </div>

                        {/* Rows (Tighter Spacing) */}
                        <div className="space-y-3 relative z-10">
                            {DAILY_SCHEDULE.map((row) => (
                                <motion.div 
                                    key={row.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center group"
                                >
                                    {/* Patient Info Column */}
                                    <div className="w-36 flex-shrink-0 flex items-center gap-2 pr-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                            row.id % 2 === 0 ? 'bg-purple-600' : 'bg-pink-600'
                                        }`}>
                                            {row.patientName.split(' ').map(n => n[0]).join('').substring(0,2)}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-200 truncate">{row.patientName}</p>
                                    </div>

                                    {/* Timeline Track */}
                                    <div className="flex-1 relative h-8 bg-slate-800/50 rounded-lg flex items-center overflow-hidden">
                                        {row.activities.map((act, i) => {
                                            const { left, width } = getPos(act.start, act.duration);
                                            return (
                                                <motion.div
                                                    key={i}
                                                    whileHover={{ scale: 1.02, zIndex: 10 }}
                                                    className={`absolute h-5 rounded-md ${act.color} flex items-center px-2 shadow-lg cursor-pointer border border-white/10`}
                                                    style={{ left, width }}
                                                >
                                                    <span className="text-[8px] font-bold text-white truncate">{act.label}</span>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                    </div>
                </div>
            </motion.div>
            
            {/* Bottom Stats (Simplified & Smaller) */}
            <div className="grid grid-cols-3 gap-3">
                 <div className={`p-3 rounded-xl border ${cardClass} flex items-center justify-between`}>
                     <div>
                         <p className={`text-[9px] uppercase font-bold ${textMuted}`}>{t.dashboard.stats.total_scans}</p>
                         <h3 className="text-lg font-black">24</h3>
                     </div>
                     <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-red-900 text-red-500' : 'bg-blue-100 text-blue-600'}`}><ScanEye size={14}/></div>
                 </div>
                 <div className={`p-3 rounded-xl border ${cardClass} flex items-center justify-between`}>
                     <div>
                         <p className={`text-[9px] uppercase font-bold ${textMuted}`}>{t.dashboard.stats.consultations}</p>
                         <h3 className="text-lg font-black">12</h3>
                     </div>
                     <div className="p-1.5 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-600"><MessageSquare size={14}/></div>
                 </div>
                 <div className={`p-3 rounded-xl border ${cardClass} flex items-center justify-between`}>
                     <div>
                         <p className={`text-[9px] uppercase font-bold ${textMuted}`}>{t.dashboard.stats.efficiency}</p>
                         <h3 className="text-lg font-black text-green-500">94%</h3>
                     </div>
                     <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-full text-green-600"><TrendingUp size={14}/></div>
                 </div>
            </div>

        </motion.div>
      );
  }


  return (
    <div className="h-full flex flex-col">
        {/* Banner */}
        <WelcomeBanner />

        {/* View Switcher Tabs (Compact) */}
        <div className="flex mb-3 border-b border-slate-200 dark:border-slate-800">
             <button 
                onClick={() => setViewMode('personal')}
                className={`pb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${viewMode === 'personal' ? (isDarkMode ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500') : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                {t.dashboard.tabs.personal}
            </button>
            <button 
                onClick={() => setViewMode('department')}
                className={`pb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${viewMode === 'department' ? (isDarkMode ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500') : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                {t.dashboard.tabs.department}
            </button>
        </div>

        {/* View Switcher Content */}
        <AnimatePresence mode="wait">
            <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex-1 overflow-visible"
            >
                {viewMode === 'personal' ? <PersonalDashboard /> : <DepartmentDashboard />}
            </motion.div>
        </AnimatePresence>
    </div>
  );
};

export default Dashboard;