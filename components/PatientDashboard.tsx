import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Appointment, InventoryItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, Calendar, FileText, MessageCircle, LogOut, Settings, Sun, Moon, Bell, Search, Plus, MapPin, Pill, ArrowRight, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';
import SettingsView from './SettingsView';
import Inventory from './Inventory';
import { subscribeToAppointments } from '../services/scheduleService';

interface PatientDashboardProps {
    isDarkMode: boolean;
    currentUser: User | null;
    userProfile: UserProfile | null;
    onLogout: () => void;
    toggleTheme: () => void;
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ isDarkMode, currentUser, userProfile, onLogout, toggleTheme }) => {
    const { t, language, setLanguage } = useLanguage();
    const [currentView, setCurrentView] = useState<'home' | 'settings' | 'pharmacy'>('home');
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);

    useEffect(() => {
        // Fetch appointments where date matches today (Simplified for demo, ideally fetch by patient UID)
        const dateStr = new Date().toISOString().split('T')[0];
        const unsub = subscribeToAppointments(dateStr, (data) => {
            // Filter appointments that might match this patient (Name match for now as UID linking in Appointments needs migration)
            const myApps = data.filter(a => a.patientName === userProfile?.displayName || a.patientName === currentUser?.displayName);
            setMyAppointments(myApps);
        }, console.error);
        return () => unsub();
    }, [currentUser, userProfile]);

    const containerClass = isDarkMode ? "bg-black text-slate-100" : "bg-slate-50 text-slate-900";
    const cardClass = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm";

    const Header = () => (
        <div className={`px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md border-b ${isDarkMode ? 'bg-black/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black italic shadow-lg`}>M</div>
                <div>
                    <h1 className="text-sm font-bold opacity-50 uppercase tracking-wider">MedAssist</h1>
                    <p className="text-xs font-bold">Patient Portal</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-200 text-slate-600'}`}>
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="relative">
                    <img 
                        src={userProfile?.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} 
                        className="w-9 h-9 rounded-full object-cover border-2 border-white dark:border-slate-700" 
                        alt="Profile"
                        onClick={() => setCurrentView(currentView === 'settings' ? 'home' : 'settings')}
                    />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-black"></div>
                </div>
            </div>
        </div>
    );

    const BottomNav = () => (
        <div className={`fixed bottom-0 left-0 w-full p-4 z-50 ${isDarkMode ? 'bg-black/90' : 'bg-white/90'} backdrop-blur-lg border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex justify-around max-w-md mx-auto">
                <button onClick={() => setCurrentView('home')} className={`flex flex-col items-center gap-1 ${currentView === 'home' ? 'text-blue-500' : 'opacity-50'}`}>
                    <Activity size={24} />
                    <span className="text-[10px] font-bold uppercase">Home</span>
                </button>
                <button onClick={() => setCurrentView('pharmacy')} className={`flex flex-col items-center gap-1 ${currentView === 'pharmacy' ? 'text-blue-500' : 'opacity-50'}`}>
                    <Pill size={24} />
                    <span className="text-[10px] font-bold uppercase">Meds</span>
                </button>
                <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-blue-500' : 'opacity-50'}`}>
                    <Settings size={24} />
                    <span className="text-[10px] font-bold uppercase">Profile</span>
                </button>
            </div>
        </div>
    );

    const HomeView = () => (
        <div className="p-6 space-y-6 pb-24">
            <header>
                <h2 className="text-2xl font-black mb-1">{t.patientDashboard.welcome}</h2>
                <span className="text-3xl font-light text-blue-500">{userProfile?.displayName}</span>
            </header>

            {/* Health Score Card */}
            <div className={`p-6 rounded-3xl border ${cardClass} relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full"></div>
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">{t.patientDashboard.health_score}</p>
                        <div className="text-5xl font-black">98<span className="text-lg text-green-500">%</span></div>
                        <p className="text-xs font-bold text-green-500 mt-1 flex items-center"><Activity size={12} className="mr-1"/> Stable Condition</p>
                    </div>
                    <div className="w-20 h-20 rounded-full border-4 border-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <span className="text-2xl font-black">A+</span>
                    </div>
                </div>
            </div>

            {/* Upcoming Appointments */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">{t.patientDashboard.appointments}</h3>
                    <button className="text-blue-500 text-xs font-bold uppercase">{t.patientDashboard.book_new}</button>
                </div>
                <div className="space-y-3">
                    {myAppointments.length > 0 ? myAppointments.map(appt => (
                        <div key={appt.id} className={`p-4 rounded-2xl border ${cardClass} flex items-center gap-4`}>
                            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                <Calendar size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm">{appt.title}</h4>
                                <p className="text-xs opacity-60">Today at {appt.startTime}:00</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${appt.status === 'Done' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                {appt.status}
                            </div>
                        </div>
                    )) : (
                        <div className={`p-8 rounded-2xl border border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-300'} text-center opacity-50`}>
                            <Calendar size={32} className="mx-auto mb-2" />
                            <p className="text-xs font-bold uppercase">{t.patientDashboard.no_appointments}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
                <button className={`p-4 rounded-2xl border ${cardClass} flex flex-col items-center justify-center gap-2 hover:border-blue-500 transition-colors`}>
                    <FileText size={24} className="text-purple-500" />
                    <span className="text-xs font-bold">{t.patientDashboard.latest_diagnosis}</span>
                </button>
                <button className={`p-4 rounded-2xl border ${cardClass} flex flex-col items-center justify-center gap-2 hover:border-blue-500 transition-colors`}>
                    <MessageCircle size={24} className="text-green-500" />
                    <span className="text-xs font-bold">{t.patientDashboard.contact_doctor}</span>
                </button>
            </div>
            
            {/* Logout Button */}
            <button 
                onClick={onLogout}
                className="w-full py-4 rounded-xl bg-red-600/10 text-red-500 font-bold uppercase text-xs tracking-widest flex items-center justify-center"
            >
                <LogOut size={16} className="mr-2" /> {t.sidebar.logout}
            </button>
        </div>
    );

    return (
        <div className={`min-h-screen ${containerClass}`}>
            <Header />
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentView}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full"
                >
                    {currentView === 'home' && <HomeView />}
                    {currentView === 'pharmacy' && (
                        <div className="pb-20">
                            <Inventory isDarkMode={isDarkMode} isFullPageView={true} />
                        </div>
                    )}
                    {currentView === 'settings' && (
                        <div className="pb-20">
                            <SettingsView userProfile={userProfile} isDarkMode={isDarkMode} onProfileUpdate={() => {}} />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <BottomNav />
        </div>
    );
};

export default PatientDashboard;