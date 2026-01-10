
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, ShieldCheck, Search, LogOut, Sun, Moon, UserPlus, 
    Activity, Briefcase, ChevronRight, Settings, Camera, Save, 
    Loader2, Check, LayoutGrid, UserCog, Eye, EyeOff, Trash2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { updateUserProfile, uploadUserImage, deleteUserProfile } from '../services/userService';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface AdminDashboardProps {
    isDarkMode: boolean;
    currentUser: User | null;
    userProfile: UserProfile | null;
    onLogout: () => void;
    toggleTheme: () => void;
}

// Dummy data for the chart
const ACTIVITY_DATA = [
  { name: 'Mon', users: 10 },
  { name: 'Tue', users: 15 },
  { name: 'Wed', users: 20 },
  { name: 'Thu', users: 18 },
  { name: 'Fri', users: 25 },
  { name: 'Sat', users: 30 },
  { name: 'Sun', users: 35 },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isDarkMode, currentUser, userProfile, onLogout, toggleTheme }) => {
    // Changed 'tasks' to 'settings'
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Settings State
    const [adminName, setAdminName] = useState(userProfile?.displayName || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password Visibility State
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
            setAllUsers(users);
        });
        return () => unsubUsers();
    }, []);

    useEffect(() => {
        if (userProfile) setAdminName(userProfile.displayName);
    }, [userProfile]);

    const handleUpdateUserRole = async (uid: string, newRole: 'doctor' | 'patient' | 'admin') => {
        if (uid === currentUser?.uid) {
            alert("You cannot change your own role here.");
            return;
        }
        if (!confirm(`Change role to ${newRole.toUpperCase()}?`)) return;
        try { await updateDoc(doc(db, "users", uid), { role: newRole }); } catch (e) { alert("Error updating role"); }
    };

    const handleDeleteUser = async (uid: string) => {
        if (uid === currentUser?.uid) return;
        if (!confirm("WARNING: This will delete the user's profile data from the database. Note: Authentication access must be revoked manually in Firebase Console. Continue?")) return;
        try {
            await deleteUserProfile(uid);
        } catch(e) { alert("Delete failed"); }
    };

    const togglePasswordVisibility = (uid: string) => {
        setVisiblePasswords(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && currentUser) {
            setIsUploading(true);
            try {
                const url = await uploadUserImage(currentUser.uid, e.target.files[0], 'avatar');
                await updateUserProfile(currentUser.uid, { photoURL: url });
            } catch (error) {
                console.error("Upload failed", error);
                alert("Failed to upload image");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSaveProfile = async () => {
        if (!currentUser || !adminName.trim()) return;
        setIsSavingProfile(true);
        try {
            await updateUserProfile(currentUser.uid, { displayName: adminName });
        } catch (error) {
            console.error("Update failed", error);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const filteredUsers = allUsers.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const stats = {
        totalUsers: allUsers.length,
        doctors: allUsers.filter(u => u.role === 'doctor').length,
        patients: allUsers.filter(u => u.role === 'patient').length,
        admins: allUsers.filter(u => u.role === 'admin').length,
    };

    // --- COLOR PALETTE FIXES ---
    // Backgrounds
    const bgMain = isDarkMode ? "bg-[#0f0c29]" : "bg-[#f8fafc]"; // Lighter gray for light mode
    const cardBg = isDarkMode ? "bg-[#1e1b4b]/60 border-[#312e81]" : "bg-white border-slate-200 shadow-xl shadow-slate-200/50";
    
    // Text
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
    
    // Inputs (Critical fix for "white text on white bg")
    const inputBg = isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-900";

    return (
        <div className={`flex h-screen w-full overflow-hidden font-sans ${bgMain} ${textMain} transition-colors duration-500`}>
            
            {/* 1. SIDEBAR */}
            <div className="hidden md:flex flex-col justify-between w-24 m-4 rounded-[30px] shadow-2xl z-50 text-white overflow-hidden shrink-0" style={{ background: 'linear-gradient(180deg, #6d28d9 0%, #4c1d95 100%)' }}>
                <div className="flex flex-col items-center pt-8 space-y-8">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-inner cursor-pointer hover:rotate-12 transition-transform">
                        <ShieldCheck size={28} className="text-white" />
                    </div>
                    
                    <nav className="flex flex-col gap-6 w-full items-center">
                        {[
                            { id: 'overview', icon: LayoutGrid },
                            { id: 'users', icon: Users },
                            { id: 'settings', icon: Settings }
                        ].map(item => (
                            <button 
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`relative group p-3 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-white text-[#4c1d95] shadow-lg translate-x-1' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                            >
                                <item.icon size={24} strokeWidth={2.5} />
                                {activeTab === item.id && <motion.div layoutId="active-indicator" className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex flex-col items-center pb-8 gap-4">
                    <button onClick={toggleTheme} className="p-3 rounded-2xl bg-black/20 text-white/70 hover:text-white hover:bg-black/40 transition-colors">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={onLogout} className="p-3 rounded-2xl bg-red-500/20 text-red-200 hover:bg-red-500 hover:text-white transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Header */}
                <header className="flex justify-between items-center px-8 py-6 z-10">
                    <div>
                        <h1 className={`text-2xl font-black tracking-tight ${textMain}`}>Admin Dashboard</h1>
                        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${textSub}`}>System Control v3.0</p>
                    </div>
                    
                    <div className={`flex items-center gap-4 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-[#1e1b4b] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                        <Search size={18} className={textSub} />
                        <input 
                            type="text" 
                            placeholder="Search user..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`bg-transparent outline-none text-sm font-bold w-48 ${textMain} placeholder-slate-400`}
                        />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-violet-500 p-0.5">
                            <img src={userProfile?.photoURL || "https://i.pravatar.cc/150?img=12"} className="w-full h-full rounded-full object-cover border-2 border-white" alt="Admin"/>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 flex gap-8">
                    
                    {/* LEFT COLUMN (Main) */}
                    <div className="flex-1 flex flex-col gap-8 min-w-0">
                        
                        <AnimatePresence mode="wait">
                            {activeTab === 'overview' && (
                                <motion.div 
                                    key="overview"
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                    className="space-y-8"
                                >
                                    {/* 1. OVERVIEW WIDGETS */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Chart Widget - Purple/Pink Gradient */}
                                        <div className="col-span-1 md:col-span-2 p-6 rounded-[35px] relative overflow-hidden text-white shadow-2xl shadow-purple-500/20" style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #db2777 100%)' }}>
                                            <div className="relative z-10 flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-xl font-bold">Activity</h3>
                                                    <p className="text-xs opacity-70">New users this week</p>
                                                </div>
                                                <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold">Weekly</div>
                                            </div>
                                            <div className="h-40 w-full -ml-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={ACTIVITY_DATA}>
                                                        <defs>
                                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#fff" stopOpacity={0.4}/>
                                                                <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <Area type="monotone" dataKey="users" stroke="#fff" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex justify-between items-end mt-2 relative z-10">
                                                <div>
                                                    <span className="text-4xl font-black">{stats.totalUsers}</span>
                                                    <span className="text-sm opacity-80 ml-2">Total Users</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats Vertical Stack */}
                                        <div className="flex flex-col gap-6">
                                            <div className="flex-1 p-6 rounded-[35px] relative overflow-hidden text-white shadow-xl shadow-blue-500/20 flex flex-col justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Briefcase size={20}/></div>
                                                    <span className="text-xs font-bold opacity-80">Doctors</span>
                                                </div>
                                                <h3 className="text-4xl font-black">{stats.doctors}</h3>
                                            </div>

                                            <div className="flex-1 p-6 rounded-[35px] relative overflow-hidden text-white shadow-xl shadow-emerald-500/20 flex flex-col justify-center" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Users size={20}/></div>
                                                    <span className="text-xs font-bold opacity-80">Patients</span>
                                                </div>
                                                <h3 className="text-4xl font-black">{stats.patients}</h3>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. RECENT REGISTRATIONS (Database Focus) */}
                                    <div className={`p-6 rounded-[40px] border shadow-sm ${cardBg}`}>
                                        <h3 className={`text-lg font-bold mb-4 flex items-center ${textMain}`}><Activity className="mr-2 text-violet-500"/> Recent Activity</h3>
                                        <div className="space-y-4">
                                            {allUsers.slice(0, 5).map((u, i) => (
                                                <div key={i} className={`flex items-center justify-between p-3 rounded-2xl ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'} transition-colors`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${u.role === 'admin' ? 'bg-amber-500' : u.role === 'doctor' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                                                            {u.displayName?.[0] || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className={`font-bold text-sm ${textMain}`}>{u.displayName}</p>
                                                            <p className={`text-[10px] ${textSub}`}>Joined recently</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isDarkMode ? 'bg-white/10' : 'bg-white border border-slate-200'}`}>{u.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'users' && (
                                <motion.div 
                                    key="users"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className={`flex-1 rounded-[40px] border overflow-hidden shadow-sm ${cardBg} flex flex-col`}
                                >
                                    <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                        <h3 className={`text-lg font-bold ${textMain}`}>User Database</h3>
                                        <div className="flex gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                                Total: {allUsers.length}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left">
                                            <thead className={`text-[10px] uppercase font-bold tracking-widest ${isDarkMode ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                                <tr>
                                                    <th className="px-6 py-4">User</th>
                                                    <th className="px-6 py-4">Role</th>
                                                    <th className="px-6 py-4">Password</th>
                                                    <th className="px-6 py-4">Contact</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                                {filteredUsers.map(user => (
                                                    <tr key={user.uid} className={`transition-colors group ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} className="w-10 h-10 rounded-xl object-cover shadow-sm bg-slate-200" alt=""/>
                                                                <div>
                                                                    <p className={`font-bold text-sm ${textMain}`}>{user.displayName}</p>
                                                                    <p className="text-[10px] opacity-50 font-mono">ID: {user.uid.substring(0, 6)}...</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <select 
                                                                value={user.role} 
                                                                onChange={(e) => handleUpdateUserRole(user.uid, e.target.value as any)}
                                                                className={`border rounded-lg px-2 py-1 text-xs font-bold uppercase outline-none cursor-pointer ${inputBg}`}
                                                            >
                                                                <option value="patient">Patient</option>
                                                                <option value="doctor">Doctor</option>
                                                                <option value="admin">Admin</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs">
                                                            {user.password ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className={textMain}>{visiblePasswords.has(user.uid) ? user.password : '••••••••'}</span>
                                                                    <button onClick={() => togglePasswordVisibility(user.uid)} className="opacity-50 hover:opacity-100 transition-opacity">
                                                                        {visiblePasswords.has(user.uid) ? <EyeOff size={14} className={textMain}/> : <Eye size={14} className={textMain}/>}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="opacity-30 italic">Encrypted</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className={`text-xs ${textSub}`}>{user.email}</p>
                                                            {user.location && <p className={`text-[10px] opacity-50 ${textMain}`}>{user.location}</p>}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${user.isOnline ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                    {user.isOnline ? 'Online' : 'Offline'}
                                                                </span>
                                                                <button onClick={() => handleDeleteUser(user.uid)} className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors" title="Delete User">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'settings' && (
                                <motion.div 
                                    key="settings"
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                    className={`max-w-2xl mx-auto p-8 rounded-[40px] border shadow-xl ${cardBg}`}
                                >
                                    <h2 className={`text-2xl font-black mb-8 flex items-center ${textMain}`}>
                                        <UserCog className="mr-3 text-violet-500"/> Admin Profile
                                    </h2>

                                    <div className="flex flex-col items-center mb-8">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-violet-500 shadow-2xl">
                                                <img 
                                                    src={userProfile?.photoURL || "https://i.pravatar.cc/150?img=12"} 
                                                    className={`w-full h-full object-cover transition-all ${isUploading ? 'opacity-50 blur-sm' : 'group-hover:opacity-75'}`} 
                                                    alt="Admin Avatar"
                                                />
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-white drop-shadow-lg" size={32} />
                                            </div>
                                            {isUploading && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Loader2 className="text-violet-500 animate-spin" size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                                        <p className={`text-xs mt-3 ${textSub} font-bold uppercase tracking-wider`}>Click to upload new avatar</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${textSub}`}>Display Name</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    value={adminName}
                                                    onChange={(e) => setAdminName(e.target.value)}
                                                    className={`flex-1 p-3 rounded-xl outline-none font-bold ${inputBg}`}
                                                />
                                                <button 
                                                    onClick={handleSaveProfile}
                                                    disabled={isSavingProfile || !adminName.trim()}
                                                    className="px-6 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center"
                                                >
                                                    {isSavingProfile ? <Loader2 className="animate-spin"/> : <Check/>}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${textSub}`}>Email Account</label>
                                            <div className={`p-3 rounded-xl border font-mono text-sm opacity-60 ${isDarkMode ? 'bg-black/20 border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                {currentUser?.email}
                                            </div>
                                        </div>

                                        <div className={`p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs font-bold flex items-start gap-3`}>
                                            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                                            <p>Administrator privileges enabled. You have full access to database records and user management.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT COLUMN (Just Active Doctors - Removed Map) */}
                    <div className={`hidden xl:flex flex-col w-80 rounded-[40px] p-6 shadow-xl border shrink-0 ${cardBg}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`font-bold text-sm ${textMain}`}>Active Doctors</h3>
                            <span className="text-violet-500 text-xs font-bold bg-violet-500/10 px-2 py-1 rounded">Live</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {allUsers.filter(u => u.role === 'doctor').map(doctor => (
                                <div key={doctor.uid} className={`flex items-center gap-3 p-3 rounded-2xl transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                    <div className="relative">
                                        <img src={doctor.photoURL || `https://ui-avatars.com/api/?name=${doctor.displayName}&background=random`} className="w-10 h-10 rounded-xl object-cover bg-slate-200" />
                                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white dark:border-black rounded-full ${doctor.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-xs font-bold truncate ${textMain}`}>{doctor.displayName}</h4>
                                        <p className={`text-[10px] truncate ${textSub}`}>{doctor.specialty || "General Doctor"}</p>
                                    </div>
                                    <ChevronRight size={14} className={`${textSub} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                </div>
                            ))}
                            {allUsers.filter(u => u.role === 'doctor').length === 0 && (
                                <p className={`text-xs text-center mt-10 ${textSub}`}>No doctors found.</p>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
