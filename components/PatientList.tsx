import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, UserPlus, MoreHorizontal, LayoutGrid, List as ListIcon, Calendar, Activity, AlertCircle, CheckCircle, X, Save, Loader2, ShieldAlert, ChevronLeft, Droplet, ArrowUpRight, TrendingUp, Clock } from 'lucide-react';
import { Patient, DRGrade } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeToPatients, addPatient } from '../services/patientService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PatientListProps {
    isDarkMode: boolean;
}

const PatientList: React.FC<PatientListProps> = ({ isDarkMode }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Navigation State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Add Patient Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: '', age: 0, gender: 'Male', history: '', phone: '', email: '', status: 'Active'
  });
  const [isSaving, setIsSaving] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribe = subscribeToPatients(
        (data) => {
            setPatients(data);
            setLoading(false);
        },
        (err) => console.error(err)
    );
    return () => unsubscribe();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        patient.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.age) return;
    setIsSaving(true);
    try {
        await addPatient({
            name: newPatient.name,
            age: Number(newPatient.age),
            gender: newPatient.gender as any,
            history: newPatient.history || 'None',
            phone: newPatient.phone || '',
            email: newPatient.email || '',
            status: newPatient.status as any || 'Active',
            lastExam: new Date().toISOString().split('T')[0]
        });
        setIsAddModalOpen(false);
        setNewPatient({ name: '', age: 0, gender: 'Male', history: '', phone: '', email: '', status: 'Active' });
    } catch (err: any) {
        alert("Error: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const activePatient = patients.find(p => p.id === selectedPatientId);

  // Helper to format chart data from diagnosis history
  const chartData = useMemo(() => {
      if (!activePatient || !activePatient.diagnosisHistory) return [];
      
      // Sort history by date
      const history = [...activePatient.diagnosisHistory].sort((a,b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return history.map(rec => ({
          date: new Date(rec.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          grade: rec.grade,
          confidence: (rec.confidence * 100).toFixed(0)
      }));
  }, [activePatient]);

  // Styles
  const bgClass = isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900";
  const cardBorder = isDarkMode ? "border-slate-800" : "border-slate-100";
  const subText = isDarkMode ? "text-slate-400" : "text-slate-500";
  const accentText = isDarkMode ? "text-red-400" : "text-blue-600";
  const cardBg = isDarkMode ? "bg-slate-950/50" : "bg-slate-50";

  // --- DETAIL VIEW ---
  if (selectedPatientId && activePatient) {
      return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="h-full flex flex-col md:flex-row gap-6 p-2"
          >
              {/* LEFT COLUMN: PROFILE CARD */}
              <div className="w-full md:w-1/3 flex flex-col gap-6">
                  {/* Back Button */}
                  <button 
                    onClick={() => setSelectedPatientId(null)}
                    className={`flex items-center text-xs font-bold uppercase tracking-widest ${subText} hover:${accentText} transition-colors mb-2`}
                  >
                      <ChevronLeft size={14} className="mr-1" /> Back to List
                  </button>

                  <div className={`p-6 rounded-3xl shadow-xl border ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'} relative overflow-hidden`}>
                      <div className="flex flex-col items-center text-center">
                          <div className="relative mb-4">
                              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-lg">
                                  <img 
                                    src={activePatient.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                  />
                              </div>
                              <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 ${activePatient.status === 'Critical' ? 'bg-red-500' : 'bg-green-500'}`}>
                                  <Activity size={12} className="text-white" />
                              </div>
                          </div>
                          
                          <h2 className="text-2xl font-black">{activePatient.name}</h2>
                          <p className={`text-sm ${subText} font-medium mb-6`}>{activePatient.age} years, {activePatient.gender}</p>

                          <div className="grid grid-cols-3 gap-4 w-full mb-8">
                              <div className="flex flex-col items-center">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${subText} mb-1`}>Blood</span>
                                  <span className="text-lg font-black">{activePatient.bloodType || 'O+'}</span>
                              </div>
                              <div className="flex flex-col items-center border-x border-slate-100 dark:border-slate-800">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${subText} mb-1`}>Height</span>
                                  <span className="text-lg font-black">{activePatient.height || '170'} <span className="text-xs font-normal text-slate-400">cm</span></span>
                              </div>
                              <div className="flex flex-col items-center">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${subText} mb-1`}>Weight</span>
                                  <span className="text-lg font-black">{activePatient.weight || '65'} <span className="text-xs font-normal text-slate-400">kg</span></span>
                              </div>
                          </div>

                          <button className={`w-full py-3 rounded-xl font-bold uppercase text-xs tracking-widest ${isDarkMode ? 'bg-white text-black hover:bg-slate-200' : 'bg-black text-white hover:bg-slate-800'} transition-colors`}>
                              Edit Profile
                          </button>
                      </div>
                  </div>

                  {/* Notifications Card */}
                  <div className={`p-6 rounded-3xl shadow-lg border ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-sm">Notifications</h3>
                          <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div className={`p-4 rounded-xl border-l-4 border-green-500 ${cardBg}`}>
                           <div className="flex justify-between items-start mb-1">
                               <span className="font-bold text-sm">Follow-up Check</span>
                               <span className="text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">10mg</span>
                           </div>
                           <p className="text-xs text-slate-500 mb-2">Scheduled for next week</p>
                           <div className="flex gap-2 text-[9px] font-bold uppercase text-slate-400">
                               <span>Mon</span> <span className="text-green-500">Wed</span> <span>Fri</span>
                           </div>
                      </div>
                  </div>
              </div>

              {/* RIGHT COLUMN: MAIN CONTENT */}
              <div className="w-full md:w-2/3 flex flex-col gap-6">
                  
                  {/* EXAMINATIONS LIST (Horizontal Scroll) */}
                  <div>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>Examinations</h3>
                          <button className={`flex items-center text-xs font-bold uppercase ${isDarkMode ? 'bg-teal-400/10 text-teal-400' : 'bg-teal-50 text-teal-600'} px-3 py-1.5 rounded-full`}>
                              See All
                          </button>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                          {activePatient.diagnosisHistory && activePatient.diagnosisHistory.length > 0 ? (
                              activePatient.diagnosisHistory.map((exam, idx) => (
                                  <div key={idx} className={`min-w-[200px] p-4 rounded-xl border-l-4 shadow-sm flex-shrink-0 ${isDarkMode ? 'bg-slate-900 border-teal-500' : 'bg-white border-teal-500'}`}>
                                      <span className="text-[10px] font-bold text-slate-400 mb-1 block">{new Date(exam.date).toLocaleDateString()}</span>
                                      <h4 className="font-bold text-sm mb-1 truncate">{
                                          exam.grade === 0 ? "Healthy Retina" : 
                                          exam.grade === 1 ? "Mild NPDR" :
                                          exam.grade === 2 ? "Moderate NPDR" :
                                          exam.grade === 3 ? "Severe NPDR" : "Proliferative DR"
                                      }</h4>
                                      <span className="text-[10px] text-slate-500">{(exam.confidence * 100).toFixed(0)}% Confidence</span>
                                  </div>
                              ))
                          ) : (
                              <div className="text-sm text-slate-500 italic p-4">No examination history found.</div>
                          )}
                          
                          {/* Add New Placeholder */}
                          <div 
                            className={`min-w-[60px] flex items-center justify-center rounded-xl border-2 border-dashed cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
                            onClick={() => alert("Please go to Diagnosis tab to add new scan")}
                          >
                              <UserPlus size={20} className="text-slate-400" />
                          </div>
                      </div>
                  </div>

                  {/* HEALTH CURVE CHART */}
                  <div className={`p-6 rounded-3xl shadow-lg border ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                      <div className="flex justify-between items-center mb-6">
                          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>Health Curve</h3>
                          <div className="flex gap-2">
                              {['D', 'W', 'M', 'Y'].map(t => (
                                  <button key={t} className={`w-8 h-8 rounded-lg text-xs font-bold ${t === 'Y' ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                      {t}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div className="h-[250px] w-full">
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        itemStyle={{ color: isDarkMode ? '#fff' : '#000', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="grade" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorGrade)" />
                                </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                                  Not enough data to display curve
                              </div>
                          )}
                      </div>
                  </div>

                  {/* BOTTOM ROW: NEAREST TREATMENT & ADVICE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Nearest Treatment */}
                      <div className={`p-6 rounded-3xl shadow-lg border ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'} mb-4`}>Nearest Treatment</h3>
                          <div className="flex justify-between items-center mb-4">
                              <span className="font-bold text-sm">August 2024</span>
                              <ArrowUpRight size={16} />
                          </div>
                          {/* Mini Calendar Strip Mockup */}
                          <div className="flex justify-between text-center">
                              {[26, 27, 28, 29, 30, 31, 1].map((d, i) => (
                                  <div key={i} className={`flex flex-col items-center gap-1 ${d === 29 ? 'font-black' : 'opacity-50'}`}>
                                      <span className="text-[10px] font-bold text-slate-400">
                                          {['S','M','T','W','T','F','S'][i]}
                                      </span>
                                      <span className={`text-sm ${d === 29 ? (isDarkMode ? 'text-white' : 'text-black') : ''}`}>{d}</span>
                                      {d === 29 && <div className="w-1 h-1 bg-teal-500 rounded-full mt-1"></div>}
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Advice */}
                      <div className={`p-6 rounded-3xl shadow-lg border relative overflow-hidden ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                          {/* Decorative plant graphic can be added via CSS background or SVG */}
                          <div className="relative z-10">
                              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'} mb-2`}>Advice</h3>
                              <p className={`text-xs ${subText} mb-4 leading-relaxed line-clamp-3`}>
                                  {activePatient.diagnosisHistory && activePatient.diagnosisHistory.length > 0 
                                    ? activePatient.diagnosisHistory[activePatient.diagnosisHistory.length - 1].note 
                                    : "No recent diagnosis notes available."}
                              </p>
                              <a href="#" className="text-[10px] font-bold text-teal-500 underline uppercase tracking-widest">Clinical-Advice</a>
                          </div>
                      </div>
                  </div>

              </div>
          </motion.div>
      );
  }

  // --- LIST VIEW (DEFAULT) ---
  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col space-y-6 relative p-2"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center space-x-3">
             <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.patients.title}</h1>
         </div>
         <div className="flex items-center space-x-3 w-full md:w-auto">
             <div className={`relative flex-1 md:w-64 flex items-center px-4 py-2 rounded-full border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <Search size={16} className={subText} />
                <input 
                    type="text" 
                    placeholder={t.patients.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ml-2 bg-transparent outline-none text-sm w-full"
                />
             </div>
             <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                onClick={() => setIsAddModalOpen(true)}
                className={`flex items-center px-4 py-2 text-white rounded-full text-sm font-bold shadow-lg ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
             >
                <UserPlus size={16} className="mr-2" /> {t.patients.new_patient}
             </motion.button>
         </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 overflow-y-auto pb-10">
          <AnimatePresence>
            {filteredPatients.map((patient) => (
                <motion.div 
                    key={patient.id} 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`p-6 rounded-3xl border cursor-pointer relative group transition-all duration-300 ${cardBorder} ${isDarkMode ? 'bg-slate-900 text-white hover:border-red-500' : 'bg-white text-slate-900 hover:border-blue-500'}`}
                >
                    <div className="flex justify-between items-start mb-4">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {patient.name.charAt(0)}
                         </div>
                         <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${patient.status === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                             {patient.status}
                         </div>
                    </div>
                    
                    <h3 className="font-bold text-lg mb-1">{patient.name}</h3>
                    <p className={`text-xs ${subText} mb-4 font-medium`}>ID: {patient.id.substring(0,8)}</p>

                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs items-center">
                            <span className={subText}>Last Visit</span>
                            <span className="font-bold">{patient.lastExam}</span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                            <span className={subText}>Gender</span>
                            <span className="font-bold">{patient.gender}</span>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                         <div className="flex -space-x-2">
                             <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white dark:border-slate-900"></div>
                             <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white dark:border-slate-900"></div>
                         </div>
                         <span className={`text-[10px] font-bold uppercase tracking-widest ${accentText} opacity-0 group-hover:opacity-100 transition-opacity`}>View Profile</span>
                    </div>
                </motion.div>
            ))}
          </AnimatePresence>
      </div>

      {/* ADD PATIENT MODAL */}
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
                    className={`relative w-full max-w-lg p-8 rounded-3xl border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}
                >
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black uppercase flex items-center">
                            <UserPlus size={24} className={`mr-3 ${isDarkMode ? 'text-red-500' : 'text-blue-600'}`} />
                            {t.patients.new_patient}
                        </h2>
                        <button onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSavePatient} className="space-y-5">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${subText}`}>Full Name</label>
                                <input 
                                    type="text" required value={newPatient.name}
                                    onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                                    className={`w-full p-3 rounded-xl border outline-none font-bold text-sm mt-2 ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} 
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${subText}`}>Age</label>
                                <input 
                                    type="number" required value={newPatient.age || ''}
                                    onChange={e => setNewPatient({...newPatient, age: Number(e.target.value)})}
                                    className={`w-full p-3 rounded-xl border outline-none font-bold text-sm mt-2 ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} 
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${subText}`}>Gender</label>
                                <select 
                                    value={newPatient.gender}
                                    onChange={e => setNewPatient({...newPatient, gender: e.target.value as any})}
                                    className={`w-full p-3 rounded-xl border outline-none font-bold text-sm mt-2 ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`w-full py-4 rounded-xl font-black text-white uppercase text-xs tracking-widest flex items-center justify-center shadow-lg hover:brightness-110 transition-all ${isDarkMode ? 'bg-red-600' : 'bg-blue-600'}`}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                            Save Patient Record
                        </button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PatientList;