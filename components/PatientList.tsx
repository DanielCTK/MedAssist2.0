import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, UserPlus, MoreHorizontal, LayoutGrid, List as ListIcon, Calendar, Activity, AlertCircle, CheckCircle, X, Save, Loader2, ShieldAlert } from 'lucide-react';
import { Patient } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeToPatients, addPatient } from '../services/patientService';

interface PatientListProps {
    isDarkMode: boolean;
}

// Mock Images for Physicians (Visual only)
const docImages = [
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=50&q=80',
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=50&q=80',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=50&q=80',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=50&q=80'
];

const PatientList: React.FC<PatientListProps> = ({ isDarkMode }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Track errors
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Add Patient Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: '',
    age: 0,
    gender: 'Male',
    history: '',
    phone: '',
    email: '',
    status: 'Active'
  });
  const [isSaving, setIsSaving] = useState(false);

  const { t } = useLanguage();

  // Subscribe to real-time data
  useEffect(() => {
    const unsubscribe = subscribeToPatients(
        (data) => {
            setPatients(data);
            setLoading(false);
            setError(null);
        },
        (err) => {
            console.error("Subscription Error:", err);
            setLoading(false);
            if (err.code === 'permission-denied') {
                setError("PERMISSION_DENIED");
            } else {
                setError(err.message || "Failed to load patients");
            }
        }
    );
    return () => unsubscribe();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        patient.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  // Handle Add Patient
  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.age) return;
    
    setIsSaving(true);
    try {
        await addPatient({
            name: newPatient.name,
            age: Number(newPatient.age),
            gender: newPatient.gender as 'Male' | 'Female' | 'Other',
            history: newPatient.history || 'None',
            phone: newPatient.phone || '',
            email: newPatient.email || '',
            status: newPatient.status as any || 'Active',
            lastExam: new Date().toISOString().split('T')[0]
        });
        setIsAddModalOpen(false);
        setNewPatient({ name: '', age: 0, gender: 'Male', history: '', phone: '', email: '', status: 'Active' });
    } catch (err: any) {
        if (err.code === 'permission-denied') {
            alert("Permission Denied: Check your Firestore Security Rules.");
        } else {
            alert("Failed to add patient: " + err.message);
        }
    } finally {
        setIsSaving(false);
    }
  };

  // Styling Helpers
  const cardClass = isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-sm";
  const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
  const badgeBase = "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border";
  const themeBtn = isDarkMode ? "bg-red-600 hover:bg-red-700 shadow-red-500/30" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30";
  const themeBorderFocus = isDarkMode ? "focus-within:border-red-600" : "focus-within:border-blue-600";
  const themeText = isDarkMode ? "text-red-400" : "text-blue-600";
  const themeBorderHover = isDarkMode ? "hover:border-red-600" : "hover:border-blue-600";
  const inputClass = isDarkMode ? "bg-slate-950 border-slate-700 text-white focus:border-red-600" : "bg-white border-slate-300 text-slate-900 focus:border-blue-600";

  // ERROR STATE VIEW
  if (error === "PERMISSION_DENIED") {
      return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-red-500/10 p-6 rounded-full mb-6 ring-4 ring-red-500/20">
                  <ShieldAlert size={64} className="text-red-500" />
              </div>
              <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Database Permission Denied
              </h2>
              <p className="text-slate-500 max-w-lg mb-8 leading-relaxed">
                  Your Firestore Database Security Rules are blocking access. 
                  The "Authorized Domains" setting is for Authentication only, not Database.
              </p>
              
              <div className={`text-left p-6 rounded-xl border max-w-2xl w-full font-mono text-sm overflow-x-auto ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                  <p className="mb-2 text-xs uppercase font-bold text-slate-500">// Go to Firebase Console &gt; Firestore Database &gt; Rules</p>
                  <p className="mb-2 text-xs uppercase font-bold text-slate-500">// Change your rules to:</p>
                  <pre className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                  </pre>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className={`mt-8 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-colors ${themeBtn}`}
              >
                  I updated the rules, Reload App
              </button>
          </div>
      )
  }

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col space-y-6 relative"
    >
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center space-x-3">
             <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.patients.title}</h1>
             {loading && <Loader2 size={16} className={`animate-spin ${isDarkMode ? 'text-red-500' : 'text-blue-500'}`} />}
         </div>
         
         <div className="flex items-center space-x-3 w-full md:w-auto">
             {/* Search */}
             <div className={`relative flex-1 md:w-64 flex items-center px-4 py-2 rounded-full border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} ${themeBorderFocus}`}>
                <Search size={16} className={textMuted} />
                <input 
                    type="text" 
                    placeholder={t.patients.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ml-2 bg-transparent outline-none text-sm w-full"
                />
             </div>

             {/* View Toggle */}
             <div className={`flex p-1 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900') : textMuted}`}
                >
                    <LayoutGrid size={16} />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900') : textMuted}`}
                >
                    <ListIcon size={16} />
                </button>
             </div>

             {/* Add Patient Button */}
             <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                onClick={() => setIsAddModalOpen(true)}
                className={`flex items-center px-4 py-2 text-white rounded-full text-sm font-bold transition-colors shadow-lg whitespace-nowrap ${themeBtn}`}
             >
                <UserPlus size={16} className="mr-2" /> {t.patients.new_patient}
             </motion.button>
         </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-6">
            <AnimatePresence>
            {filteredPatients.map((patient, idx) => (
                <motion.div 
                    key={patient.id} 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ 
                        y: -10, 
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 300, damping: 20 },
                        boxShadow: isDarkMode ? "0 20px 40px -10px rgba(220, 38, 38, 0.2)" : "0 20px 40px -10px rgba(59, 130, 246, 0.2)"
                    }}
                    className={`p-5 rounded-2xl border ${cardClass} relative group cursor-pointer transition-colors ${themeBorderHover}`}
                >
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                {patient.name.charAt(0)}
                            </div>
                            <div>
                                <p className={`text-[10px] font-bold ${themeText} uppercase`}>{t.patients.table.id}: {patient.id.substring(0,6)}</p>
                                <h3 className="font-bold text-sm">{patient.name}</h3>
                            </div>
                         </div>
                         <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className={`p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 ${textMuted}`}><MoreHorizontal size={14}/></button>
                         </div>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                            <span className={textMuted}>{t.patients.table.procedure}:</span>
                            <span className="font-medium">Retinal Scan</span>
                        </div>
                         <div className="flex justify-between text-xs items-center">
                            <span className={textMuted}>{t.patients.table.status}:</span>
                            <span className={`flex items-center font-bold uppercase text-[10px] ${patient.status === 'Critical' ? 'text-red-500' : 'text-green-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${patient.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                                {patient.status}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className={textMuted}>{t.patients.table.date}:</span>
                            <span className="font-medium">{patient.lastExam}</span>
                        </div>
                    </div>

                    <div className={`pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-xs ${textMuted}`}>Assigned physician:</span>
                            <div className="flex items-center space-x-2">
                                <img src={docImages[idx % 4]} className="w-5 h-5 rounded-full ring-1 ring-slate-500" />
                                <span className="text-xs font-medium truncate w-24 text-right">Dr. M. Adams</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                             {/* Simple generic tags for demo */}
                            <span className={`${badgeBase} ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>#General</span>
                            <span className={`${badgeBase} ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>#{patient.gender}</span>
                        </div>
                    </div>
                </motion.div>
            ))}
            </AnimatePresence>
            
            {!loading && filteredPatients.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-10 text-slate-500">
                    <AlertCircle size={32} className="mb-2" />
                    <p>No patients found. Add a new patient to get started.</p>
                </div>
            )}
          </motion.div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className={`rounded-2xl border overflow-hidden ${cardClass}`}
           >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                         <tr className={`text-xs uppercase tracking-wider ${textMuted} border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
                             <th className="px-6 py-4 font-bold">{t.patients.table.id}</th>
                             <th className="px-6 py-4 font-bold">{t.patients.table.name}</th>
                             <th className="px-6 py-4 font-bold">{t.patients.table.procedure}</th>
                             <th className="px-6 py-4 font-bold">{t.patients.table.status}</th>
                             <th className="px-6 py-4 font-bold">{t.patients.table.date}</th>
                             <th className="px-6 py-4 font-bold">{t.patients.table.physician}</th>
                             <th className="px-6 py-4 font-bold text-right">{t.patients.table.action}</th>
                         </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                         {filteredPatients.map((patient, idx) => (
                             <motion.tr 
                                key={patient.id} 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                whileHover={{ 
                                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                                    x: 5,
                                    scale: 1.005,
                                    transition: { duration: 0.2 }
                                }}
                                className={`group cursor-pointer`}
                             >
                                 <td className={`px-6 py-4 font-bold ${themeText}`}>{patient.id.substring(0,6)}...</td>
                                 <td className="px-6 py-4">
                                     <div className="flex items-center space-x-3">
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                            {patient.name.charAt(0)}
                                         </div>
                                         <span className="font-bold">{patient.name}</span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4">Retinal Scan</td>
                                 <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                         patient.status === 'Critical' ? 'text-red-500 bg-red-500/10' : 'text-green-500 bg-green-500/10'
                                     }`}>
                                         {patient.status}
                                     </span>
                                 </td>
                                 <td className={`px-6 py-4 ${textMuted}`}>{patient.lastExam}</td>
                                 <td className="px-6 py-4">
                                     <div className="flex items-center space-x-2">
                                         <img src={docImages[idx % 4]} className="w-6 h-6 rounded-full" />
                                         <span className="text-xs font-medium">Dr. Adams</span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <button className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} ${textMuted}`}>
                                         <MoreHorizontal size={16} />
                                     </button>
                                 </td>
                             </motion.tr>
                         ))}
                    </tbody>
                </table>
              </div>
           </motion.div>
      )}

      {/* --- ADD PATIENT MODAL --- */}
      <AnimatePresence>
        {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsAddModalOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative w-full max-w-lg p-6 rounded-2xl border shadow-2xl ${cardClass}`}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black uppercase flex items-center">
                            <UserPlus size={20} className={`mr-2 ${isDarkMode ? 'text-red-500' : 'text-blue-600'}`} />
                            {t.patients.new_patient}
                        </h2>
                        <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={18} /></button>
                    </div>

                    <form onSubmit={handleSavePatient} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Full Name</label>
                                <input 
                                    type="text" required value={newPatient.name}
                                    onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                                    className={`w-full p-3 rounded-lg border outline-none font-medium text-sm mt-1 ${inputClass}`} 
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Age</label>
                                <input 
                                    type="number" required value={newPatient.age || ''}
                                    onChange={e => setNewPatient({...newPatient, age: Number(e.target.value)})}
                                    className={`w-full p-3 rounded-lg border outline-none font-medium text-sm mt-1 ${inputClass}`} 
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Gender</label>
                                <select 
                                    value={newPatient.gender}
                                    onChange={e => setNewPatient({...newPatient, gender: e.target.value as any})}
                                    className={`w-full p-3 rounded-lg border outline-none font-medium text-sm mt-1 ${inputClass}`}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Medical History (Comma separated)</label>
                                <textarea 
                                    rows={2} value={newPatient.history}
                                    onChange={e => setNewPatient({...newPatient, history: e.target.value})}
                                    className={`w-full p-3 rounded-lg border outline-none font-medium text-sm mt-1 ${inputClass}`} 
                                    placeholder="e.g. Type 2 Diabetes, Hypertension"
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Phone</label>
                                <input 
                                    type="tel" value={newPatient.phone}
                                    onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                                    className={`w-full p-3 rounded-lg border outline-none font-medium text-sm mt-1 ${inputClass}`} 
                                    placeholder="(555) 000-0000"
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Status</label>
                                <select 
                                    value={newPatient.status}
                                    onChange={e => setNewPatient({...newPatient, status: e.target.value as any})}
                                    className={`w-full p-3 rounded-lg border outline-none font-medium text-sm mt-1 ${inputClass}`}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Follow-up">Follow-up</option>
                                    <option value="Critical">Critical</option>
                                    <option value="Discharged">Discharged</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className={`px-6 py-3 rounded-lg font-bold text-white uppercase text-xs tracking-widest flex items-center ${themeBtn}`}
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                                Save Patient
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default PatientList;