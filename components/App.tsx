import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun, Bell, Search, ChevronDown, Activity, Loader2, ArrowRight, User, Stethoscope } from 'lucide-react';

// Relative imports for components in the same directory
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import DiagnosisView from './DiagnosisView';
import PatientList from './PatientList';
import Inventory from './Inventory';
import LandingPage from './LandingPage';
import SettingsView from './SettingsView';
import AIChatbot from './AIChatbot';
import InsightsView from './InsightsView'; 
import PatientDashboard from './PatientDashboard'; 

// Relative imports for parent directories
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { getUserProfile, subscribeToUserProfile, updateUserProfile, getUserProfile as createProfile } from '../services/userService';
import { UserProfile, Patient, InventoryItem, ChatSession } from '../types';
import { subscribeToPatients } from '../services/patientService';
import { subscribeToInventory } from '../services/inventoryService';
import { subscribeToActiveChats } from '../services/chatService';

// ==================================================================================
// 🖼️ ASSETS CONFIGURATION
// ==================================================================================
const ASANOHA_PATTERN = `data:image/svg+xml,%3Csvg width='60' height='104' viewBox='0 0 60 104' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 52L60 0M30 52L60 104M30 52L0 104M30 52L0 0M30 0L0 52M30 104L0 52M30 0L60 52M30 104L60 52M0 52h60M30 0v104' stroke='%23888888' stroke-width='1' fill='none' opacity='0.07'/%3E%3C/svg%3E`;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false); 
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isDarkMode, setIsDarkMode] = useState(false); 
  
  // GLOBAL SEARCH STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{type: string, id: string, title: string, subtitle?: string, action: () => void}[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Data for search (Cached)
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  
  // Global Chat State for Notifications
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  
  const { language, setLanguage, t } = useLanguage();

  // Handle Real-time Auth State & Fetch Profile
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
         setIsProfileLoading(true);
         
         // 1. Subscribe to profile changes
         profileUnsubscribe = subscribeToUserProfile(user.uid, async (profile) => {
             if (profile) {
                 setUserProfile(profile);
                 setIsProfileLoading(false);
             } else {
                 // 2. STOP AUTO-CREATION.
                 // If profile is null, we set it to null and let the UI render the "Role Selection" screen.
                 // This prevents accidentally defaulting to 'doctor'.
                 setUserProfile(null);
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
  useEffect(() => {
    if (currentUser) {
        const unsubPatients = subscribeToPatients(currentUser.uid, setAllPatients, () => {});
        const unsubInventory = subscribeToInventory(setAllInventory, () => {});
        const unsubChats = subscribeToActiveChats(currentUser.uid, setActiveChats);
        
        return () => { 
            unsubPatients(); 
            unsubInventory(); 
            unsubChats();
        };
    }
  }, [currentUser]);

  // Calculate Global Unread Messages
  const unreadMessageCount = useMemo(() => {
      if (!currentUser) return 0;
      return activeChats.reduce((acc, chat) => {
          if (chat.lastMessage && !chat.lastMessage.seen && chat.lastMessage.senderId !== currentUser.uid) {
              return acc + 1;
          }
          return acc;
      }, 0);
  }, [activeChats, currentUser]);

  // Global Search Logic
  useEffect(() => {
      if (!searchQuery.trim()) {
          setSearchResults([]);
          return;
      }
      
      const q = searchQuery.toLowerCase();
      const results: typeof searchResults = [];

      // 1. Navigation Pages
      ['dashboard', 'patients', 'diagnosis', 'history', 'settings', 'inventory'].forEach(page => {
          if (page.includes(q)) {
              results.push({
                  type: 'Page', id: page, title: `Go to ${page.charAt(0).toUpperCase() + page.slice(1)}`,
                  action: () => setCurrentView(page)
              });
          }
      });

      // 2. Patients
      allPatients.forEach(p => {
          if (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) {
              results.push({
                  type: 'Patient', id: p.id, title: p.name, subtitle: `ID: ${p.id.substring(0,6)}...`,
                  action: () => setCurrentView('patients') // Ideally, pass selected ID to view
              });
          }
      });

      // 3. Inventory
      allInventory.forEach(i => {
          if (i.name.toLowerCase().includes(q)) {
              results.push({
                  type: 'Item', id: i.id, title: i.name, subtitle: `${i.stock} in stock`,
                  action: () => setCurrentView('inventory')
              });
          }
      });

      setSearchResults(results.slice(0, 8)); // Limit to 8 results
  }, [searchQuery, allPatients, allInventory]);

  // Click outside to close search
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
              setIsSearchOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle Body class for global styles
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- UPDATED LOGOUT LOGIC ---
  const handleLogout = async () => {
    try {
        setIsLoadingAuth(true); // Force loading screen immediately
        await signOut(auth);
        // Clean up states locally to prevent flashes
        setUserProfile(null);
        setCurrentUser(null);
        setCurrentView('dashboard');
    } catch (error) {
        console.error("Logout failed", error);
        setIsLoadingAuth(false); // Only unset loading if failed
    }
  };

  const handleRoleSelection = async (role: 'doctor' | 'patient') => {
      if (!currentUser) return;
      setIsProfileLoading(true);
      try {
          // Explicitly create the profile with the selected role
          await createProfile(currentUser, role);
          // The real-time listener will pick this up and update `userProfile`
      } catch (error) {
          console.error("Failed to set role", error);
          setIsProfileLoading(false);
      }
  };

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

  // 1. GLOBAL LOADING STATE
  if (isLoadingAuth || (currentUser && isProfileLoading)) {
    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white">
            <Loader2 size={48} className="animate-spin text-red-600 mb-4" />
            <p className="text-xs uppercase tracking-widest font-bold opacity-50">
                {isLoadingAuth ? 'Initializing...' : 'Setting up profile...'}
            </p>
        </div>
    );
  }

  // 2. MISSING PROFILE STATE (Role Selection)
  // If we have a user but no profile, ask them who they are.
  if (currentUser && !userProfile) {
      return (
          <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-6">
              <div className="max-w-md w-full text-center">
                  <h1 className="text-3xl font-black mb-2">Welcome to MedAssist</h1>
                  <p className="text-slate-400 mb-8">Please select your role to continue setting up your account.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleRoleSelection('doctor')}
                        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-all group flex flex-col items-center"
                      >
                          <div className="p-4 bg-blue-500/10 rounded-full mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                              <Stethoscope size={32} />
                          </div>
                          <h3 className="font-bold text-lg">I am a Doctor</h3>
                          <p className="text-xs text-slate-500 mt-2">Access diagnostics, patient records, and tools.</p>
                      </button>

                      <button 
                        onClick={() => handleRoleSelection('patient')}
                        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-green-500 hover:bg-slate-800 transition-all group flex flex-col items-center"
                      >
                          <div className="p-4 bg-green-500/10 rounded-full mb-4 text-green-500 group-hover:scale-110 transition-transform">
                              <User size={32} />
                          </div>
                          <h3 className="font-bold text-lg">I am a Patient</h3>
                          <p className="text-xs text-slate-500 mt-2">View health records, appointments, and results.</p>
                      </button>
                  </div>

                  <button onClick={handleLogout} className="mt-8 text-slate-500 text-xs hover:text-white transition-colors underline">
                      Log Out
                  </button>
              </div>
          </div>
      );
  }

  // 3. PATIENT INTERFACE (Instant Switch based on Role)
  if (currentUser && userProfile?.role === 'patient') {
      return (
          <PatientDashboard 
              isDarkMode={isDarkMode} 
              currentUser={currentUser} 
              userProfile={userProfile} 
              onLogout={handleLogout}
              toggleTheme={() => setIsDarkMode(!isDarkMode)}
          />
      );
  }

  // 4. DOCTOR INTERFACE
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
                        {currentView === 'history' && t.sidebar.insights}
                        {currentView === 'settings' && t.sidebar.settings}
                        {currentView === 'inventory' && t.sidebar.pharmacy}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-3">
                      {/* GLOBAL SEARCH BAR */}
                      <div className="relative" ref={searchRef}>
                          <div className={`hidden md:flex items-center px-2.5 py-1 rounded-full border ${isDarkMode ? 'bg-slate-900 border-slate-800 focus-within:border-red-500' : 'bg-slate-100 border-slate-200 focus-within:border-blue-500'}`}>
                              <Search size={12} className="opacity-50 mr-2" />
                              <input 
                                  type="text" 
                                  placeholder={t.patients.search} 
                                  value={searchQuery}
                                  onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                                  onFocus={() => setIsSearchOpen(true)}
                                  className={`bg-transparent border-none outline-none text-[10px] w-40 font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                              />
                          </div>

                          {/* Search Dropdown Results */}
                          <AnimatePresence>
                              {isSearchOpen && searchQuery && (
                                  <motion.div 
                                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                      className={`absolute top-full right-0 mt-2 w-64 rounded-xl shadow-2xl border overflow-hidden z-50 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                                  >
                                      {searchResults.length > 0 ? (
                                          <ul className="py-2">
                                              {searchResults.map((res, i) => (
                                                  <li 
                                                      key={i} 
                                                      onClick={() => { res.action(); setIsSearchOpen(false); setSearchQuery(''); }}
                                                      className={`px-4 py-2 cursor-pointer flex justify-between items-center group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                                                  >
                                                      <div className="flex flex-col">
                                                          <span className={`text-[10px] font-bold uppercase tracking-wider opacity-50`}>{res.type}</span>
                                                          <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{res.title}</span>
                                                          {res.subtitle && <span className="text-[10px] opacity-70">{res.subtitle}</span>}
                                                      </div>
                                                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                  </li>
                                              ))}
                                          </ul>
                                      ) : (
                                          <div className="p-4 text-center text-xs opacity-50">No results found.</div>
                                      )}
                                  </motion.div>
                              )}
                          </AnimatePresence>
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

                      {/* Bell Notification */}
                      <button className={`p-1.5 rounded-full transition-colors relative ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                        <Bell size={16} className={isDarkMode ? 'text-slate-300' : 'text-slate-600'} />
                        {unreadMessageCount > 0 && (
                            <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-black"></span>
                            </span>
                        )}
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
                        {currentView === 'dashboard' && <Dashboard isDarkMode={isDarkMode} currentUser={currentUser} userProfile={userProfile} setView={setCurrentView} />}
                        {currentView === 'diagnosis' && <DiagnosisView isDarkMode={isDarkMode} />}
                        {currentView === 'patients' && <PatientList isDarkMode={isDarkMode} />}
                        {currentView === 'settings' && <SettingsView userProfile={userProfile} isDarkMode={isDarkMode} onProfileUpdate={setUserProfile} />}
                        {currentView === 'history' && <InsightsView isDarkMode={isDarkMode} currentUser={currentUser} />}
                      </motion.div>
                   </AnimatePresence>
                   
                   {/* Persistent Global Widgets */}
                   {/* Inventory now handles both the Full Page View (when route matches) and the global Cart Button */}
                   <Inventory isDarkMode={isDarkMode} isFullPageView={currentView === 'inventory'} />
                   <AIChatbot />
               </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;