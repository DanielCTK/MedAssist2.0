import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, UserPlus, MoreHorizontal, LayoutGrid, List as ListIcon, Calendar, Activity, AlertCircle, CheckCircle, X, Save, Loader2, ShieldAlert, ChevronLeft, Droplet, ArrowUpRight, TrendingUp, Clock, Trash2, Edit2, Camera, Phone, Mail, ExternalLink, MessageCircle, MapPin, AlertTriangle, Syringe, Eye } from 'lucide-react';
import { Patient, DRGrade, DiagnosisRecord } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeToPatients, addPatient, updatePatient, deletePatient } from '../services/patientService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { auth } from '../services/firebase';

interface PatientListProps {
    isDarkMode: boolean;
}

const PatientList: React.FC<PatientListProps> = ({ isDarkMode }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View State (Grid vs List)
  const [viewType, setViewType] = useState<'grid' | 'table'>('table');
  
  // Navigation State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  // Edit State (New)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Patient Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: '', age: 0, gender: 'Male', history: '', phone: '', email: '', address: '', status: 'Active'
  });
  const [isSaving, setIsSaving] = useState(false);

  const { t } = useLanguage();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
        const unsubscribe = subscribeToPatients(
            currentUser.uid,
            (data) => {
                setPatients(data);
                setLoading(false);
            },
            (err) => console.error(err)
        );
        return () => unsubscribe();
    }
  }, [currentUser]);

  // Sync editForm with active patient when selected or data changes
  const activePatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);
  
  useEffect(() => {
      if (activePatient && !isEditing) {
          setEditForm(activePatient);
      }
  }, [activePatient, isEditing]);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        patient.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  // --- LOGIC: Calculate Next Treatment Date based on Severity ---
  const treatmentInfo = useMemo(() => {
      if (!activePatient) return { date: new Date(), days: [] };

      let nextDate = new Date();
      // Logic: If there is history, base it on the last grade
      if (activePatient.diagnosisHistory && activePatient.diagnosisHistory.length > 0) {
          const lastRecord = activePatient.diagnosisHistory[activePatient.diagnosisHistory.length - 1];
          const lastExamDate = new Date(lastRecord.date);
          
          // Add time based on severity
          // Grade 0 (Healthy) -> 1 Year
          // Grade 1-2 (Mild/Mod) -> 6 Months
          // Grade 3 (Severe) -> 3 Months
          // Grade 4 (Proliferative) -> 1 Month
          const daysToAdd = lastRecord.grade === 0 ? 365 : lastRecord.grade <= 2 ? 180 : lastRecord.grade === 3 ? 90 : 30;
          
          nextDate = new Date(lastExamDate);
          nextDate.setDate(lastExamDate.getDate() + daysToAdd);
      } else {
          // If no history, suggest next week
          nextDate.setDate(nextDate.getDate() + 7);
      }

      // Generate 7-day strip centered on nextDate
      const days = [];
      for (let i = -3; i <= 3; i++) {
          const d = new Date(nextDate);
          d.setDate(nextDate.getDate() + i);
          days.push(d);
      }

      return { date: nextDate, days };
  }, [activePatient]);

  // --- LOGIC: Chart Data from Real History ---
  const chartData = useMemo(() => {
      if (!activePatient || !activePatient.diagnosisHistory || activePatient.diagnosisHistory.length === 0) return [];
      
      // Sort by date ascending
      const history = [...activePatient.diagnosisHistory].sort((a,b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return history.map(rec => ({
          date: new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: new Date(rec.date).toLocaleDateString(),
          grade: rec.grade, // 0-4
          confidence: (rec.confidence * 100).toFixed(0),
          note: rec.grade === 0 ? "Healthy" : rec.grade === 1 ? "Mild" : rec.grade === 2 ? "Moderate" : rec.grade === 3 ? "Severe" : "PDR"
      }));
  }, [activePatient]);

  const latestAdvice = useMemo(() => {
      if (!activePatient?.diagnosisHistory?.length) return "No diagnosis history available. Please perform a scan.";
      const last = activePatient.diagnosisHistory[activePatient.diagnosisHistory.length - 1];
      return last.note || "No specific advice notes recorded for this visit.";
  }, [activePatient]);

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.age || !currentUser) return;
    setIsSaving(true);
    try {
        await addPatient(currentUser.uid, {
            name: newPatient.name,
            age: Number(newPatient.age),
            gender: newPatient.gender as any,
            history: newPatient.history || 'None',
            phone: newPatient.phone || '',
            email: newPatient.email || '',
            address: newPatient.address || '',
            status: newPatient.status as any || 'Active',
            lastExam: new Date().toISOString().split('T')[0]
        });
        setIsAddModalOpen(false);
        setNewPatient({ name: '', age: 0, gender: 'Male', history: '', phone: '', email: '', address: '', status: 'Active' });
    } catch (err: any) {
        alert("Error: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleUpdatePatient = async () => {
      if (!selectedPatientId || !editForm.name) return;
      setIsSaving(true);
      try {
          await updatePatient(selectedPatientId, editForm);
          setIsEditing(false);
      } catch (err: any) {
          alert("Update failed: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeletePatient = async () => {
      if (!selectedPatientId) return;
      if (confirm("Are you sure you want to delete this patient permanently? This action cannot be undone.")) {
          try {
              await deletePatient(selectedPatientId);
              setSelectedPatientId(null);
          } catch (err: any) {
              alert("Delete failed: " + err.message);
          }
      }
  };

  const handleCancelEdit = () => {
      setIsEditing(false);
      if (activePatient) setEditForm(activePatient);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          
          reader.onloadend = () => {
              const base64String = reader.result as string;
              setEditForm({ ...editForm, avatarUrl: base64String });
          };
          
          reader.readAsDataURL(file);
      }
  };

  const cardBorder = isDarkMode ? "border-slate-800" : "border-slate-100";
  const subText = isDarkMode ? "text-slate-400" : "text-slate-500";
  const accentText = isDarkMode ? "text-red-400" : "text-blue-600";
  const cardBg = isDarkMode ? "bg-slate-950/50" : "bg-slate-50";
  const inputClass = isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900";
  const tableHeaderClass = isDarkMode ? "bg-slate-900/50 text-slate-400" : "bg-slate-50 text-slate-500";
  const tableRowHover = isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50";

  if (selectedPatientId && activePatient) {
      return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="h-full flex flex-col md:flex-row gap-6 p-2"
          >
              <div className="w-full md:w-1/3 flex flex-col gap-6">
                  <button 
                    onClick={() => { setSelectedPatientId(null); setIsEditing(false); }}
                    className={`flex items-center text-xs font-bold uppercase tracking-widest ${subText} hover:${accentText} transition-colors mb-2`}
                  >
                      <ChevronLeft size={14} className="mr-1" /> Back to List
                  </button>

                  <div className={`p-6 rounded-3xl shadow-xl border ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'} relative overflow-hidden`}>
                      <div className="flex flex-col items-center text-center">
                          <div className="relative mb-4">
                              <div 
                                className={`w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-lg group relative ${isEditing ? 'cursor-pointer' : ''}`}
                                onClick={() => isEditing && fileInputRef.current?.click()}
                              >
                                  <img 
                                    src={(isEditing && editForm.avatarUrl) ? editForm.avatarUrl : (activePatient.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop")} 
                                    alt="Profile" 
                                    className={`w-full h-full object-cover transition-all ${isEditing ? 'group-hover:opacity-50' : ''}`}
                                  />
                                  {isEditing && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Camera className="text-white" size={24}/>
                                    </div>
                                  )}
                              </div>
                              <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleAvatarChange}
                              />

                              <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 ${activePatient.status === 'Critical' ? 'bg-red-500' : 'bg-green-500'}`}>
                                  <Activity size={12} className="text-white" />
                              </div>
                          </div>
                          
                          {isEditing ? (
                              <div className="w-full space-y-2 mb-4">
                                  <input 
                                    type="text" 
                                    value={editForm.name || ''} 
                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                    className={`w-full text-center font-black text-xl p-2 rounded border ${inputClass}`}
                                    placeholder="Patient Name"
                                  />
                                  <div className="flex justify-center gap-2">
                                      <input 
                                        type="number" 
                                        value={editForm.age || ''}
                                        onChange={(e) => setEditForm({...editForm, age: Number(e.target.value)})}
                                        className={`w-20 text-center text-sm p-2 rounded border ${inputClass}`}
                                        placeholder="Age"
                                      />
                                      <select
                                        value={editForm.gender || 'Male'}
                                        onChange={(e) => setEditForm({...editForm, gender: e.target.value as any})}
                                        className={`w-24 text-center text-sm p-2 rounded border ${inputClass}`}
                                      >
                                          <option value="Male">Male</option>
                                          <option value="Female">Female</option>
                                          <option value="Other">Other</option>
                                      </select>
                                  </div>
                                  
                                  {/* Edit Phone, Email & Address */}
                                  <div className="pt-2 space-y-2">
                                      <div className="relative">
                                          <Phone size={14} className="absolute left-3 top-3 text-slate-400"/>
                                          <input 
                                            type="text"
                                            value={editForm.phone || ''}
                                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                            className={`w-full pl-9 p-2 rounded text-xs border ${inputClass}`}
                                            placeholder="Phone Number"
                                          />
                                      </div>
                                      <div className="relative">
                                          <Mail size={14} className="absolute left-3 top-3 text-slate-400"/>
                                          <input 
                                            type="email"
                                            value={editForm.email || ''}
                                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                            className={`w-full pl-9 p-2 rounded text-xs border ${inputClass}`}
                                            placeholder="Email Address"
                                          />
                                      </div>
                                      <div className="relative">
                                          <MapPin size={14} className="absolute left-3 top-3 text-slate-400"/>
                                          <input 
                                            type="text"
                                            value={editForm.address || ''}
                                            onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                            className={`w-full pl-9 p-2 rounded text-xs border ${inputClass}`}
                                            placeholder="Home Address"
                                          />
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <>
                                <h2 className="text-2xl font-black">{activePatient.name}</h2>
                                <p className={`text-sm ${subText} font-medium mb-1`}>{activePatient.age} years, {activePatient.gender}</p>
                                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                                    {activePatient.phone ? (
                                        <a 
                                            href={`https://zalo.me/${activePatient.phone.replace(/[^\d]/g, '')}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center px-4 py-1.5 rounded-full bg-[#0068FF] text-white hover:bg-[#0054cc] transition-all shadow-md shadow-blue-500/20 group"
                                            title="Click to open Zalo Chat"
                                        >
                                            <MessageCircle size={14} className="mr-2" fill="currentColor" /> 
                                            <span className="text-xs font-bold mr-1">Zalo</span>
                                            <span className="text-[10px] opacity-80 border-l border-white/30 pl-2 ml-2 font-mono tracking-wider">{activePatient.phone}</span>
                                            <ExternalLink size={10} className="ml-2 opacity-60 group-hover:opacity-100" />
                                        </a>
                                    ) : (
                                        <div className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 ${subText}`}>
                                            <Phone size={12} className="mr-1.5"/> N/A
                                        </div>
                                    )}
                                    <div className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 ${subText}`}>
                                        <Mail size={12} className="mr-1.5"/> {activePatient.email || "N/A"}
                                    </div>
                                </div>
                                <div className={`flex items-center justify-center text-xs font-bold text-slate-500 mb-6 mt-2 max-w-[80%] mx-auto text-center leading-tight`}>
                                    <MapPin size={12} className="mr-1 shrink-0" />
                                    <span>{activePatient.address || "No address provided"}</span>
                                </div>
                              </>
                          )}

                          <div className="grid grid-cols-3 gap-4 w-full mb-8">
                              <div className="flex flex-col items-center">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${subText} mb-1`}>Blood</span>
                                  {isEditing ? (
                                      <input 
                                        type="text" 
                                        value={editForm.bloodType || ''}
                                        onChange={(e) => setEditForm({...editForm, bloodType: e.target.value})}
                                        className={`w-full text-center font-black p-1 rounded border ${inputClass}`}
                                      />
                                  ) : (
                                      <span className="text-lg font-black">{activePatient.bloodType || 'O+'}</span>
                                  )}
                              </div>
                              <div className="flex flex-col items-center border-x border-slate-100 dark:border-slate-800">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${subText} mb-1`}>Height</span>
                                  {isEditing ? (
                                      <input 
                                        type="number" 
                                        value={editForm.height || ''}
                                        onChange={(e) => setEditForm({...editForm, height: Number(e.target.value)})}
                                        className={`w-full text-center font-black p-1 rounded border ${inputClass}`}
                                      />
                                  ) : (
                                      <span className="text-lg font-black">{activePatient.height || '170'} <span className="text-xs font-normal text-slate-400">cm</span></span>
                                  )}
                              </div>
                              <div className="flex flex-col items-center">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${subText} mb-1`}>Weight</span>
                                  {isEditing ? (
                                      <input 
                                        type="number" 
                                        value={editForm.weight || ''}
                                        onChange={(e) => setEditForm({...editForm, weight: Number(e.target.value)})}
                                        className={`w-full text-center font-black p-1 rounded border ${inputClass}`}
                                      />
                                  ) : (
                                      <span className="text-lg font-black">{activePatient.weight || '65'} <span className="text-xs font-normal text-slate-400">kg</span></span>
                                  )}
                              </div>
                          </div>

                          {isEditing ? (
                              <div className="w-full flex gap-2">
                                  <button 
                                    onClick={handleUpdatePatient}
                                    disabled={isSaving}
                                    className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs tracking-widest text-white flex items-center justify-center gap-2 transition-colors ${isDarkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-600 hover:bg-green-500'}`}
                                  >
                                      {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save
                                  </button>
                                  <button 
                                    onClick={handleCancelEdit}
                                    className={`py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-widest bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors`}
                                  >
                                      <X size={16} />
                                  </button>
                                  <button 
                                    onClick={handleDeletePatient}
                                    className={`py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-widest text-white bg-red-600 hover:bg-red-500 transition-colors`}
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          ) : (
                              <button 
                                onClick={() => setIsEditing(true)}
                                className={`w-full py-3 rounded-xl font-bold uppercase text-xs tracking-widest ${isDarkMode ? 'bg-white text-black hover:bg-slate-200' : 'bg-black text-white hover:bg-slate-800'} transition-colors flex items-center justify-center gap-2`}
                              >
                                  <Edit2 size={14} /> Edit Profile
                              </button>
                          )}
                      </div>
                  </div>

                  <div className={`p-6 rounded-3xl shadow-lg border ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-sm">Next Notification</h3>
                          <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div className={`p-4 rounded-xl border-l-4 border-green-500 ${cardBg}`}>
                           <div className="flex justify-between items-start mb-1">
                               <span className="font-bold text-sm">Follow-up Check</span>
                               {/* Placeholder for dynamic med info if we added a med field later */}
                               <span className="text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">Rx</span>
                           </div>
                           <p className="text-xs text-slate-500 mb-2">Based on last diagnosis</p>
                           <div className="flex gap-2 text-[10px] font-bold uppercase text-slate-400 items-center">
                               <span>Expected:</span> <span className="text-green-500 text-xs">{treatmentInfo.date.toLocaleDateString()}</span>
                           </div>
                      </div>
                  </div>
              </div>

              <div className="w-full md:w-2/3 flex flex-col gap-6">
                  
                  <div>
                      <div className="flex justify-between items-center mb-4">
                          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>Diagnosis History</h3>
                          <button className={`flex items-center text-xs font-bold uppercase ${isDarkMode ? 'bg-teal-400/10 text-teal-400' : 'bg-teal-50 text-teal-600'} px-3 py-1.5 rounded-full`}>
                              See All
                          </button>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                          {activePatient.diagnosisHistory && activePatient.diagnosisHistory.length > 0 ? (
                              [...activePatient.diagnosisHistory].reverse().map((exam, idx) => (
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
                          
                          <div 
                            className={`min-w-[60px] flex items-center justify-center rounded-xl border-2 border-dashed cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
                            onClick={() => alert("Please go to Diagnosis tab to add new scan")}
                          >
                              <UserPlus size={20} className="text-slate-400" />
                          </div>
                      </div>
                  </div>

                  <div className={`p-6 rounded-3xl shadow-lg border ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                      <div className="flex justify-between items-center mb-6">
                          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>Health Curve (DR Grade)</h3>
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
                                    <YAxis tickCount={5} domain={[0, 4]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        itemStyle={{ color: isDarkMode ? '#fff' : '#000', fontSize: '12px', fontWeight: 'bold' }}
                                        formatter={(value: any, name: any, props: any) => [`Grade ${value} - ${props.payload.note}`, 'Diagnosis']}
                                        labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`p-6 rounded-3xl shadow-lg border ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'} mb-4`}>Nearest Treatment</h3>
                          <div className="flex justify-between items-center mb-4">
                              <span className="font-bold text-sm uppercase">{treatmentInfo.date.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                              <ArrowUpRight size={16} />
                          </div>
                          <div className="flex justify-between text-center">
                              {treatmentInfo.days.map((day, i) => {
                                  const isTarget = day.getDate() === treatmentInfo.date.getDate();
                                  return (
                                      <div key={i} className={`flex flex-col items-center gap-1 ${isTarget ? 'font-black scale-110 transition-transform' : 'opacity-50'}`}>
                                          <span className="text-[10px] font-bold text-slate-400">
                                              {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                                          </span>
                                          <span className={`text-sm ${isTarget ? (isDarkMode ? 'text-white' : 'text-black') : ''}`}>
                                              {day.getDate()}
                                          </span>
                                          {isTarget && <div className="w-1.5 h-1.5 bg-teal-500 rounded-full mt-1"></div>}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      <div className={`p-6 rounded-3xl shadow-lg border relative overflow-hidden ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                          <div className="relative z-10 flex flex-col h-full">
                              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'} mb-2`}>Doctor's Advice</h3>
                              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                  <p className={`text-xs ${subText} leading-relaxed whitespace-pre-wrap`}>
                                      {latestAdvice}
                                  </p>
                              </div>
                              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                  <a href="#" className="text-[10px] font-bold text-teal-500 underline uppercase tracking-widest">Full Clinical Report</a>
                              </div>
                          </div>
                      </div>
                  </div>

              </div>
          </motion.div>
      );
  }

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col space-y-6 relative p-2"
    >
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

             <div className={`flex items-center p-1 rounded-full border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                 <button 
                    onClick={() => setViewType('table')}
                    className={`p-2 rounded-full transition-all ${viewType === 'table' ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-black') : subText}`}
                 >
                     <ListIcon size={16} />
                 </button>
                 <button 
                    onClick={() => setViewType('grid')}
                    className={`p-2 rounded-full transition-all ${viewType === 'grid' ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-black') : subText}`}
                 >
                     <LayoutGrid size={16} />
                 </button>
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

      <div className="flex-1 overflow-y-auto pb-10">
          <AnimatePresence mode="wait">
            {viewType === 'grid' ? (
                <motion.div 
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
                >
                    {filteredPatients.map((patient) => (
                        <motion.div 
                            key={patient.id} 
                            layout
                            whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                            onClick={() => setSelectedPatientId(patient.id)}
                            className={`p-6 rounded-3xl border cursor-pointer relative group transition-all duration-300 ${cardBorder} ${isDarkMode ? 'bg-slate-900 text-white hover:border-red-500' : 'bg-white text-slate-900 hover:border-blue-500'}`}
                        >
                             <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {patient.avatarUrl ? (
                                        <img src={patient.avatarUrl} alt={patient.name} className="w-full h-full object-cover"/>
                                    ) : (
                                        patient.name.charAt(0)
                                    )}
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
                </motion.div>
            ) : (
                <motion.div 
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-3xl border overflow-hidden ${cardBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest ${tableHeaderClass}`}>
                                    <th className="p-4 pl-6">Name</th>
                                    <th className="p-4">Gender</th>
                                    <th className="p-4">Age</th>
                                    <th className="p-4">Diagnosis</th>
                                    <th className="p-4">Phone Number</th>
                                    <th className="p-4">Address</th>
                                    <th className="p-4">Blood</th>
                                    <th className="p-4 pr-6">Triage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.map((patient, idx) => {
                                    const latestDiagnosis = patient.diagnosisHistory && patient.diagnosisHistory.length > 0 
                                        ? (patient.diagnosisHistory[patient.diagnosisHistory.length - 1].grade === 0 ? "Healthy" : `Grade ${patient.diagnosisHistory[patient.diagnosisHistory.length - 1].grade}`)
                                        : "Not Scanned";
                                    
                                    // REAL-WORLD TRIAGE LOGIC
                                    const getTriageDisplay = () => {
                                        if (patient.status === 'Critical') {
                                            return (
                                                <div className="flex flex-col">
                                                    <span className="flex items-center text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">
                                                        <AlertTriangle size={10} className="mr-1 animate-pulse" /> Urgent Care
                                                    </span>
                                                    <span className="text-[9px] text-red-400 opacity-80">Laser/Surgery Req.</span>
                                                </div>
                                            );
                                        } else if (patient.status === 'Follow-up') {
                                            return (
                                                <div className="flex flex-col">
                                                    <span className="flex items-center text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">
                                                        <Eye size={10} className="mr-1" /> Monitoring
                                                    </span>
                                                    <span className="text-[9px] text-orange-400 opacity-80">Re-scan in 3mo</span>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="flex flex-col">
                                                    <span className="flex items-center text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">
                                                        <CheckCircle size={10} className="mr-1" /> Routine
                                                    </span>
                                                    <span className="text-[9px] text-green-400 opacity-80">Annual Checkup</span>
                                                </div>
                                            );
                                        }
                                    };

                                    return (
                                        <tr 
                                            key={patient.id} 
                                            onClick={() => setSelectedPatientId(patient.id)}
                                            className={`cursor-pointer transition-colors border-b ${isDarkMode ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-700'} ${tableRowHover} last:border-0`}
                                        >
                                            <td className="p-4 pl-6 flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                                    {patient.avatarUrl ? (
                                                        <img src={patient.avatarUrl} alt={patient.name} className="w-full h-full object-cover"/>
                                                    ) : (
                                                        patient.name.charAt(0)
                                                    )}
                                                </div>
                                                <div className="font-bold text-sm">{patient.name}</div>
                                            </td>
                                            <td className="p-4 text-xs font-medium">{patient.gender}</td>
                                            <td className="p-4 text-xs font-medium">{patient.age} yo</td>
                                            <td className="p-4 text-xs font-bold">{latestDiagnosis}</td>
                                            <td className="p-4 text-xs font-medium opacity-70">{patient.phone || "N/A"}</td>
                                            <td className="p-4 text-xs font-medium opacity-70 truncate max-w-[150px]">{patient.address || "N/A"}</td>
                                            <td className="p-4 text-xs font-bold">{patient.bloodType || "O+"}</td>
                                            <td className="p-4 pr-6">
                                                {getTriageDisplay()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
      </div>

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
                                    className={`w-full p-3 rounded-xl border outline-none font-bold text-sm mt-2 ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'}`} 
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${subText}`}>Age</label>
                                <input 
                                    type="number" required value={newPatient.age || ''}
                                    onChange={e => setNewPatient({...newPatient, age: Number(e.target.value)})}
                                    className={`w-full p-3 rounded-xl border outline-none font-bold text-sm mt-2 ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'}`} 
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${subText}`}>Gender</label>
                                <select 
                                    value={newPatient.gender}
                                    onChange={e => setNewPatient({...newPatient, gender: e.target.value as any})}
                                    className={`w-full p-3 rounded-xl border outline-none font-bold text-sm mt-2 ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'}`}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${subText}`}>Contact (Optional)</label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <input 
                                        type="text" placeholder="Phone" value={newPatient.phone}
                                        onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                                        className={`w-full p-3 rounded-xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'}`} 
                                    />
                                    <input 
                                        type="email" placeholder="Email" value={newPatient.email}
                                        onChange={e => setNewPatient({...newPatient, email: e.target.value})}
                                        className={`w-full p-3 rounded-xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'}`} 
                                    />
                                </div>
                                <div className="mt-4">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${subText}`}>Address</label>
                                    <input
                                        type="text"
                                        placeholder="Full Address"
                                        value={newPatient.address || ''}
                                        onChange={e => setNewPatient({...newPatient, address: e.target.value})}
                                        className={`w-full p-3 rounded-xl border outline-none font-bold text-sm mt-2 ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-red-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'}`}
                                    />
                                </div>
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