
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { subscribeToPatients } from '../services/patientService';
import { Patient, DRGrade } from '../types';
import { Loader2, TrendingUp, Users, Activity, AlertTriangle, Stethoscope } from 'lucide-react';
import { User } from 'firebase/auth';

interface InsightsViewProps {
    isDarkMode: boolean;
    currentUser: User | null;
}

const GRADE_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#b91c1c'];
const AGE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'];

const InsightsView: React.FC<InsightsViewProps> = ({ isDarkMode, currentUser }) => {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<Patient[]>([]);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToPatients(currentUser.uid, (data) => {
            setPatients(data);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // 1. Disease Prevalence (Severity Breakdown)
    const diseaseData = useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        patients.forEach(p => {
            if (p.diagnosisHistory && p.diagnosisHistory.length > 0) {
                const lastGrade = p.diagnosisHistory[p.diagnosisHistory.length - 1].grade;
                counts[lastGrade]++;
            } else {
                // Unscanned patients count as NoDR for now or ignore? Let's assume Healthy/Unscanned as 0
                counts[0]++;
            }
        });
        return [
            { name: 'Healthy', value: counts[0] },
            { name: 'Mild NPDR', value: counts[1] },
            { name: 'Moderate', value: counts[2] },
            { name: 'Severe', value: counts[3] },
            { name: 'PDR (Critical)', value: counts[4] },
        ].filter(i => i.value > 0);
    }, [patients]);

    // 2. Patient Demographics (Age Groups)
    const ageData = useMemo(() => {
        const groups = { "0-20": 0, "21-40": 0, "41-60": 0, "60+": 0 };
        patients.forEach(p => {
            if (p.age <= 20) groups["0-20"]++;
            else if (p.age <= 40) groups["21-40"]++;
            else if (p.age <= 60) groups["41-60"]++;
            else groups["60+"]++;
        });
        return Object.keys(groups).map(key => ({ name: key, value: groups[key as keyof typeof groups] }));
    }, [patients]);

    const cardClass = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
    const hoverEffect = "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-blue-400 dark:hover:border-slate-600";

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" size={32}/></div>;

    const criticalCount = patients.filter(p => p.status === 'Critical').length;
    const scannedCount = patients.filter(p => p.diagnosisHistory && p.diagnosisHistory.length > 0).length;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 pb-24">
            <h1 className={`text-2xl font-black uppercase tracking-tight mb-6 ${textMain}`}>Clinical Insights</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-6 rounded-2xl border ${cardClass} ${hoverEffect}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Patient Base</p>
                            <h3 className={`text-3xl font-black ${textMain}`}>{patients.length}</h3>
                        </div>
                        <Users className="text-blue-500" />
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border ${cardClass} ${hoverEffect}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Screenings Done</p>
                            <h3 className={`text-3xl font-black text-emerald-500`}>{scannedCount}</h3>
                        </div>
                        <Activity className="text-emerald-500" />
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border ${cardClass} ${hoverEffect}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Critical (PDR)</p>
                            <h3 className={`text-3xl font-black text-red-500`}>{criticalCount}</h3>
                        </div>
                        <AlertTriangle className="text-red-500" />
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border ${cardClass} ${hoverEffect}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Avg. Age</p>
                            <h3 className={`text-3xl font-black text-purple-500`}>
                                {patients.length > 0 ? Math.round(patients.reduce((acc, p) => acc + p.age, 0) / patients.length) : 0}
                            </h3>
                        </div>
                        <Stethoscope className="text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 
                 {/* DR Severity Distribution */}
                 <div className={`p-6 rounded-2xl border ${cardClass} h-[400px] ${hoverEffect}`}>
                    <h3 className={`text-lg font-bold mb-6 ${textMain} uppercase tracking-wide`}>Diabetic Retinopathy Prevalence</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <PieChart>
                            <Pie
                                data={diseaseData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {diseaseData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }}
                                itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                 </div>

                 {/* Age Demographics */}
                 <div className={`p-6 rounded-2xl border ${cardClass} h-[400px] ${hoverEffect}`}>
                    <h3 className={`text-lg font-bold mb-6 ${textMain} uppercase tracking-wide`}>Patient Age Demographics</h3>
                     <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={ageData}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                             <Tooltip 
                                cursor={{ fill: isDarkMode ? '#334155' : '#f1f5f9' }}
                                contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }}
                             />
                             <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}>
                                {ageData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                                ))}
                             </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                 </div>
            </div>

            {/* Critical Patient List */}
            <div className={`p-6 rounded-2xl border ${cardClass} ${hoverEffect}`}>
                <h3 className="text-lg font-bold mb-4 text-red-500 flex items-center">
                    <AlertTriangle className="mr-2" size={20}/> High Risk Patients (Requires Action)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-xs uppercase tracking-widest border-b ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                                <th className="pb-3 pl-2">Name</th>
                                <th className="pb-3">Diagnosis</th>
                                <th className="pb-3">Last Exam</th>
                                <th className="pb-3">Contact</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {patients.filter(p => p.status === 'Critical').length === 0 ? (
                                <tr><td colSpan={4} className="py-4 text-center text-slate-500 italic">No critical cases.</td></tr>
                            ) : (
                                patients.filter(p => p.status === 'Critical').map(p => (
                                    <tr key={p.id} className={`border-b last:border-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                        <td className={`py-3 pl-2 font-bold ${textMain}`}>{p.name}</td>
                                        <td className="py-3 text-red-500 font-bold">Proliferative / Severe</td>
                                        <td className={`py-3 ${textSub}`}>{p.lastExam}</td>
                                        <td className={`py-3 ${textSub}`}>{p.phone || p.email}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InsightsView;
