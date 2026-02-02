
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun, Bell, Search, ChevronDown, Activity, Loader2, ArrowRight, User, Stethoscope, CheckCircle2, MessageCircle, X, LayoutDashboard, Users, Eye, Package, Settings, LogOut } from 'lucide-react';

// Relative imports
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import DiagnosisView from './DiagnosisView';
import PatientList from './PatientList';
import Inventory from './Inventory';
import LandingPage from './LandingPage';
import LearnMorePage from './LearnMorePage';
import SettingsView from './SettingsView';
import HumanChatWidget from './HumanChatWidget'; 
import InsightsView from './InsightsView'; 
import PatientDashboard from './PatientDashboard'; 
// Import Admin Dashboard
import AdminDashboard from './AdminDashboard'; 

import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { getUserProfile, subscribeToUserProfile, getUserProfile as createProfile, setUserOnline, setUserOffline } from '../services/userService';
import { UserProfile, Patient, InventoryItem, ChatSession } from '../types';
import { subscribeToPatients } from '../services/patientService';
import { subscribeToInventory } from '../services/inventoryService';
import { subscribeToActiveChats } from '../services/chatService';

const ASANOHA_PATTERN = `data:image/svg+xml,%3Csvg width='60' height='104' viewBox='0 0 60 104' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 52L60 0M30 52L60 104M30 52L0 104M30 52L0 0M30 0L0 52M30 0L0 52M30 104L0 52M30 0L60 52M30 104L60 52M0 52h60M30 0v104' stroke='%23888888' stroke-width='1' fill='none' opacity='0.07'/%3E%3C/svg%3E`;

const pageVariants = {
  initial: { opacity: 0, y: 5 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -5 }
};

const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.3
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false); 
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [landingView, setLandingView] = useState<'home' | 'learn-more'>('home'); 
  const [isDarkMode, setIsDarkMode] = useState(false); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{type: string, id: string, title: string, subtitle?: string, action: () => void}[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
      if (currentUser) {
          setUserOnline(currentUser.uid);
          const handleBeforeUnload = () => {
              setUserOffline(currentUser.uid);
          };
          window.addEventListener('beforeunload', handleBeforeUnload);
          return () => {
              setUserOffline(currentUser.uid);
              window.removeEventListener('beforeunload', handleBeforeUnload);
          };
      }
  }, [currentUser]);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
         setIsProfileLoading(true);
         // Listen to user profile changes in real-time to catch role updates immediately
         profileUnsubscribe = subscribeToUserProfile(user.uid, async (profile) => {
             if (profile) {
                 setUserProfile(profile);
                 setIsProfileLoading(false);
             } else {
                 // Fallback if real-time failed but doc exists
                 const p = await getUserProfile(user);
                 setUserProfile(p);
                 setIsProfileLoading(false);
             }
         });
      } else {
         if (profileUnsubscribe) profileUnsubscribe();
         setUserProfile(null);
         setCurrentView('dashboard');
         setAllPatients([]);
         setAllInventory([]);
         setActiveChats([]);
         setSearchResults([]);
         setIsProfileLoading(false);
      }
      setIsLoadingAuth(false);
    });
    return () => {
        authUnsubscribe();
        if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  // Fetch Data for Global Search & Notifications
  // FIX: Only subscribe to patients if role is DOCTOR or ADMIN
  useEffect(() => {
    if (currentUser && userProfile) {
        let unsubPatients = () => {};
        
        // Only run patient subscription for authorized roles
        if (userProfile.role === 'doctor' || userProfile.role === 'admin') {
            unsubPatients = subscribeToPatients(currentUser.uid, setAllPatients, (err) => {
                console.warn("Patient subscription suppressed:", err.message);
            });
        }

        const unsubInventory = subscribeToInventory(setAllInventory, () => {});
        const unsubChats = subscribeToActiveChats(currentUser.uid, setActiveChats);
        
        return () => { 
            unsubPatients(); 
            unsubInventory(); 
            unsubChats();
        };
    }
  }, [currentUser, userProfile]); // Added userProfile to dependency array

  useEffect(() => {
      if (!searchQuery.trim()) { setSearchResults([]); return; }
      const q = searchQuery.toLowerCase();
      const results: typeof searchResults = [];
      ['dashboard', 'patients', 'diagnosis', 'history', 'settings', 'inventory'].forEach(page => {
          if (page.includes(q)) {
              results.push({
                  type: 'Page', id: page, title: `Go to ${page.charAt(0).toUpperCase() + page.slice(1)}`,
                  action: () => setCurrentView(page)
              });
          }
      });
      allPatients.forEach(p => {
          if (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) {
              results.push({ type: 'Patient', id: p.id, title: p.name, subtitle: `ID: ${p.id.substring(0,6)}...`, action: () => setCurrentView('patients') });
          }
      });
      setSearchResults(results.slice(0, 8));
  }, [searchQuery, allPatients, allInventory]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchRef.current && !searchRef.current.contains(event.target as Node)) { setIsSearchOpen(false); }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleLogout = async () => {
    try {
        setIsLoadingAuth(true);
        if (currentUser) await setUserOffline(currentUser.uid); 
        await signOut(auth);
        setUserProfile(null);
        setCurrentUser(null);
        setCurrentView('dashboard');
        setLandingView('home');
    } catch (error) {
        console.error("Logout failed", error);
        setIsLoadingAuth(false);
    }
  };

  const handleRoleSelection = async (role: 'doctor' | 'patient') => {
      if (!currentUser) return;
      setIsProfileLoading(true);
      try {
          await createProfile(currentUser, role);
      } catch (error) {
          console.error("Failed to set role", error);
          setIsProfileLoading(false);
      }
  };

  const MobileBottomNav = () => (
      <nav className={`md:hidden fixed bottom-0 left-0 w-full z-40 border-t pb-safe ${isDarkMode ? 'bg-black/90 border-slate-900 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-500'} backdrop-blur-lg`}>
          <div className="flex justify-around items-center h-16">
              {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
                  { id: 'patients', icon: Users, label: 'Patients' },
                  { id: 'diagnosis', icon: Eye, label: 'Scan' },
                  { id: 'inventory', icon: Package, label: 'Meds' },
                  { id: 'history', icon: Activity, label: 'Stats' },
              ].map(item => {
                  const isActive = currentView === item.id;
                  return (
                      <button 
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : ''}`}
                      >
                          <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                          <span className="text-[10px] font-bold mt-1">{item.label}</span>
                      </button>
                  )
              })}
          </div>
      </nav>
  );

  if (isLoadingAuth || (currentUser && isProfileLoading)) {
    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
            <Loader2 size={48} className="animate-spin text-amber-500 mb-6" />
            <p className="text-xs uppercase tracking-[0.2em] font-black text-amber-500/50 animate-pulse">Initializing Terminal</p>
        </div>
    );
  }

  if (!currentUser) {
      return (
        <AnimatePresence mode="wait">
            {landingView === 'home' ? (
                <motion.div key="landing" exit={{ opacity: 0, y: -50 }} className="absolute inset-0 z-50">
                    <LandingPage onEnter={() => {}} onNavigate={(view) => setLandingView(view)} />
                </motion.div>
            ) : (
                <motion.div key="learn-more" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="absolute inset-0 z-50">
                    <LearnMorePage onBack={() => setLandingView('home')} onEnter={() => {}} />
                </motion.div>
            )}
        </AnimatePresence>
      );
  }

  if (currentUser && !userProfile) {
      return (
          <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
              <div className="relative z-10 w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                  <h1 className="text-3xl font-bold mb-2 text-center italic tracking-tighter">MED<span className="text-blue-500">ASSIST</span></h1>
                  <p className="text-slate-400 text-center mb-10">System detected unprovisioned account. Select clearance level.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button onClick={() => handleRoleSelection('doctor')} className="p-8 rounded-2xl bg-slate-900/50 border border-slate-700 hover:border-blue-500 transition-all group flex flex-col items-center gap-4">
                          <Stethoscope size={32} className="text-slate-500 group-hover:text-blue-400" />
                          <span className="font-bold text-xs uppercase tracking-widest">Medical Specialist</span>
                      </button>
                      <button onClick={() => handleRoleSelection('patient')} className="p-8 rounded-2xl bg-slate-900/50 border border-slate-700 hover:border-rose-500 transition-all group flex flex-col items-center gap-4">
                          <User size={32} className="text-slate-500 group-hover:text-rose-400" />
                          <span className="font-bold text-xs uppercase tracking-widest">Patient Access</span>
                      </button>
                  </div>
                  <button onClick={handleLogout} className="mt-10 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white block mx-auto underline">Abort Login</button>
              </div>
          </div>
      );
  }

  // --- ROLE BASED ROUTING ---
  // If user is Admin, render the special AdminDashboard component completely bypassing standard layout
  if (currentUser && userProfile?.role === 'admin') {
      return <AdminDashboard isDarkMode={isDarkMode} currentUser={currentUser} userProfile={userProfile} onLogout={handleLogout} toggleTheme={() => setIsDarkMode(!isDarkMode)} />;
  }

  if (currentUser && userProfile?.role === 'patient') {
      return <PatientDashboard isDarkMode={isDarkMode} currentUser={currentUser} userProfile={userProfile} onLogout={handleLogout} toggleTheme={() => setIsDarkMode(!isDarkMode)} />;
  }

  // Standard Doctor Layout
  return (
    <div className={`h-screen w-full font-sans overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <AnimatePresence mode="wait">
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full w-full relative">
            <div className="hidden md:flex h-full fixed left-0 top-0 bottom-0 z-30">
                <Sidebar currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} onLogout={handleLogout} />
            </div>
            <MobileBottomNav />
            <main className={`flex-1 h-full relative flex flex-col w-full md:ml-52 md:w-[calc(100%-13rem)] pb-16 md:pb-0 transition-all duration-300`}>
               <header className={`h-12 px-4 md:px-5 flex items-center justify-between border-b transition-colors z-20 ${isDarkMode ? 'bg-black/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center">
                    <h2 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${isDarkMode ? 'bg-red-500' : 'bg-blue-600'}`}></span>
                        {currentView.toUpperCase()}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="relative" ref={searchRef}>
                          <div className={`flex items-center px-2.5 py-1 rounded-full border transition-all ${isSearchOpen ? 'w-40 md:w-64' : 'w-8 md:w-64 border-transparent md:border-slate-200'} ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                              <Search size={12} className={`opacity-50 ${isSearchOpen ? 'mr-2' : ''} cursor-pointer md:cursor-default`} onClick={() => setIsSearchOpen(true)} />
                              <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }} className={`bg-transparent border-none outline-none text-[10px] font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'} ${isSearchOpen ? 'w-full block' : 'w-full hidden md:block'}`} />
                          </div>
                          <AnimatePresence>{isSearchOpen && searchQuery && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`absolute top-full right-0 mt-2 w-64 rounded-xl shadow-2xl border z-50 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>{searchResults.map((res, i) => (<div key={i} onClick={() => { res.action(); setIsSearchOpen(false); }} className="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">{res.title}</div>))}</motion.div>)}</AnimatePresence>
                      </div>
                      <button onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')} className="p-1.5 rounded-full text-[10px] font-black uppercase w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-slate-700">{language}</button>
                      <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700">{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
                      
                      <div onClick={() => setCurrentView('settings')} className={`flex items-center space-x-2 border-l pl-3 cursor-pointer group ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                          <img src={userProfile?.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&auto=format&fit=crop"} className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-slate-700" alt="Dr" />
                          <div className="hidden lg:block text-right"><p className="text-[10px] font-bold leading-none mb-0.5">{userProfile?.displayName}</p></div>
                      </div>
                  </div>
               </header>

               <div className={`flex-1 overflow-y-auto custom-scrollbar relative p-3 md:p-4 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
                   <div className="absolute inset-0 pointer-events-none z-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: `url("${ASANOHA_PATTERN}")`, backgroundSize: '40px' }} />
                   <AnimatePresence mode="wait">
                      <motion.div key={currentView} initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="relative z-10 h-full max-w-full mx-auto">
                        {currentView === 'dashboard' && <Dashboard isDarkMode={isDarkMode} currentUser={currentUser} userProfile={userProfile} setView={setCurrentView} />}
                        {currentView === 'diagnosis' && <DiagnosisView isDarkMode={isDarkMode} />}
                        {currentView === 'patients' && <PatientList isDarkMode={isDarkMode} />}
                        {currentView === 'settings' && <SettingsView userProfile={userProfile} isDarkMode={isDarkMode} onProfileUpdate={setUserProfile} onClose={() => setCurrentView('dashboard')} />}
                        {currentView === 'history' && <InsightsView isDarkMode={isDarkMode} currentUser={currentUser} />}
                        {currentView === 'inventory' && <Inventory isDarkMode={isDarkMode} isFullPageView={true} />}
                      </motion.div>
                   </AnimatePresence>
                   <HumanChatWidget currentUser={currentUser} isDarkMode={isDarkMode} activeChats={activeChats} />
               </div>
            </main>
          </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default App;
