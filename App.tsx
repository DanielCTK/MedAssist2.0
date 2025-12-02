import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun, Bell, Search, ChevronDown, Activity, Loader2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DiagnosisView from './components/DiagnosisView';
import PatientList from './components/PatientList';
import Inventory from './components/Inventory';
import LandingPage from './components/LandingPage';
import SettingsView from './components/SettingsView';
import { useLanguage } from './contexts/LanguageContext';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getUserProfile } from './services/userService';
import { UserProfile } from './types';

// ==================================================================================
// 🖼️ ASSETS CONFIGURATION
// ==================================================================================
const ASANOHA_PATTERN = `data:image/svg+xml,%3Csvg width='60' height='104' viewBox='0 0 60 104' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 52L60 0M30 52L60 104M30 52L0 104M30 52L0 0M30 0L0 52M30 104L0 52M30 0L60 52M30 104L60 52M0 52h60M30 0v104' stroke='%23888888' stroke-width='1' fill='none' opacity='0.07'/%3E%3C/svg%3E`;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isDarkMode, setIsDarkMode] = useState(true); 
  
  const { language, setLanguage, t } = useLanguage();

  // Handle Real-time Auth State & Fetch Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
         try {
             // Fetch extra profile data from Firestore
             const profile = await getUserProfile(user);
             setUserProfile(profile);
         } catch (e) {
             console.error("Failed to load user profile", e);
         }
      } else {
         setUserProfile(null);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Toggle Body class for global styles
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle Logout Logic
  const handleLogout = async () => {
    try {
        await signOut(auth);
        setCurrentView('dashboard');
        setUserProfile(null);
    } catch (error) {
        console.error("Logout failed", error);
    }
  };

  // Page Transition Animation
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -10 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4
  } as const;

  if (isLoadingAuth) {
    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white">
            <Loader2 size={48} className="animate-spin text-red-600 mb-4" />
            <p className="text-xs uppercase tracking-widest font-bold opacity-50">Initializing System...</p>
        </div>
    );
  }

  return (
    <div className={`h-screen w-full font-sans overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-black text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div 
            key="landing"
            exit={{ opacity: 0, y: -50, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 z-50"
          >
            <LandingPage onEnter={() => {}} />
          </motion.div>
        ) : (
          <motion.div 
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex h-full w-full"
          >
            <Sidebar 
                currentView={currentView} 
                setView={setCurrentView} 
                isDarkMode={isDarkMode} 
                onLogout={handleLogout}
            />
            
            <main className="flex-1 ml-52 h-full relative flex flex-col">
               {/* TOP HEADER BAR */}
               <header className={`h-12 px-5 flex items-center justify-between border-b transition-colors z-20 ${isDarkMode ? 'bg-black/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center">
                    <h2 className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${isDarkMode ? 'bg-red-500' : 'bg-blue-600'}`}></span>
                        {currentView === 'dashboard' && t.sidebar.dashboard}
                        {currentView === 'patients' && t.sidebar.patients}
                        {currentView === 'diagnosis' && t.sidebar.diagnosis}
                        {currentView === 'inventory' && t.sidebar.pharmacy}
                        {currentView === 'history' && t.sidebar.insights}
                        {currentView === 'settings' && t.sidebar.settings}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-3">
                      {/* Search Bar */}
                      <div className={`hidden md:flex items-center px-2.5 py-1 rounded-full border ${isDarkMode ? 'bg-slate-900 border-slate-800 focus-within:border-red-500' : 'bg-slate-100 border-slate-200 focus-within:border-blue-500'}`}>
                          <Search size={12} className="opacity-50 mr-2" />
                          <input type="text" placeholder={t.patients.search} className="bg-transparent border-none outline-none text-[10px] w-40 font-medium" />
                      </div>
                      
                      {/* Language Toggle */}
                      <button 
                        onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                        className={`p-1.5 rounded-full transition-colors flex items-center justify-center space-x-1 w-10 ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                      >
                         <span className="text-[10px] font-black uppercase">{language}</span>
                      </button>

                      {/* Theme Toggle */}
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-yellow-400' : 'hover:bg-slate-100 text-slate-600'}`}
                      >
                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                      </button>

                      <button className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                        <Bell size={16} className={isDarkMode ? 'text-slate-300' : 'text-slate-600'} />
                      </button>
                      
                      {/* DOCTOR PROFILE SECTION */}
                      <div 
                        onClick={() => setCurrentView('settings')}
                        className={`flex items-center space-x-2 border-l pl-3 cursor-pointer group ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}
                      >
                          <div className="relative">
                            <img 
                                src={userProfile?.photoURL || currentUser.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop"}
                                className={`w-7 h-7 rounded-full object-cover border-2 transition-colors ${isDarkMode ? 'border-slate-700 group-hover:border-red-500' : 'border-white shadow-sm group-hover:border-blue-500'}`} 
                                alt="Dr" 
                            />
                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-500 border border-black rounded-full"></div>
                          </div>
                          
                          <div className="hidden lg:block text-right">
                              <p className={`text-[10px] font-bold leading-none mb-0.5 max-w-[100px] truncate group-hover:text-red-500 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {userProfile?.displayName || currentUser.displayName || currentUser.email}
                              </p>
                              <p className="text-[9px] font-medium opacity-50 uppercase tracking-wide">
                                {userProfile?.specialty || 'Medical Staff'}
                              </p>
                          </div>
                          <ChevronDown size={12} className={`opacity-50 transition-colors ${isDarkMode ? 'group-hover:text-red-500' : 'group-hover:text-blue-500'}`} />
                      </div>
                  </div>
               </header>

               {/* MAIN CONTENT AREA */}
               <div className={`flex-1 overflow-y-auto custom-scrollbar relative p-3 ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}>
                   
                   <div 
                        className="absolute inset-0 pointer-events-none z-0 opacity-40 mix-blend-overlay" 
                        style={{ 
                            backgroundImage: `url("${ASANOHA_PATTERN}")`,
                            backgroundSize: '40px' 
                        }}
                   />

                   {isDarkMode ? (
                       <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                           <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-900/10 blur-[100px]" />
                           <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-red-900/5 blur-[100px]" />
                       </div>
                   ) : (
                       <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                           <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[80px]" />
                           <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-sky-100/40 blur-[80px]" />
                       </div>
                   )}
                   
                   <AnimatePresence mode="wait">
                      <motion.div
                        key={currentView}
                        initial="initial"
                        animate="in"
                        exit="out"
                        variants={pageVariants}
                        transition={pageTransition}
                        className="relative z-10 h-full max-w-full mx-auto"
                      >
                        {currentView === 'dashboard' && <Dashboard isDarkMode={isDarkMode} currentUser={currentUser} userProfile={userProfile} />}
                        {currentView === 'diagnosis' && <DiagnosisView isDarkMode={isDarkMode} />}
                        {currentView === 'patients' && <PatientList isDarkMode={isDarkMode} />}
                        {currentView === 'inventory' && <Inventory isDarkMode={isDarkMode} />}
                        {currentView === 'settings' && <SettingsView userProfile={userProfile} isDarkMode={isDarkMode} onProfileUpdate={setUserProfile} />}
                        {currentView === 'history' && (
                            <div className={`flex items-center justify-center h-full opacity-50 font-mono uppercase tracking-widest ${isDarkMode ? 'text-red-500' : 'text-blue-500'}`}>
                                <Activity size={48} className="mb-4 animate-pulse" />
                                <p>System Logs // Access Restricted</p>
                            </div>
                        )}
                      </motion.div>
                   </AnimatePresence>
               </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;