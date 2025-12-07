import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { subscribeToPatients } from '../services/patientService';
import { subscribeToAppointmentsRange } from '../services/scheduleService';
import { Patient } from '../types';
import { Loader2, TrendingUp, Users, Activity, AlertTriangle } from 'lucide-react';
import { User } from 'firebase/auth';

interface InsightsViewProps {
    isDarkMode: boolean;
    currentUser: User | null;
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444'];

const InsightsView: React.FC<InsightsViewProps> = ({ isDarkMode, currentUser }) => {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [weeklyStats, setWeeklyStats] = useState<any[]>([]);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToPatients(currentUser.uid, (data) => {
            setPatients(data);
            setLoading(false);
        }, (err) => {
            if (err?.code !== 'permission-denied') console.error(err);
            setLoading(false);
        });

        // Fetch last 7 days appointments for chart
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const unsubApps = subscribeToAppointmentsRange(startStr, endStr, currentUser.uid, (apps) => {
            // Aggregate
            const counts: Record<string, number> = {};
            for(let i=0; i<7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const dKey = d.toISOString().split('T')[0];
                counts[dKey] = 0;
            }
            apps.forEach(a => { if(counts[a.date] !== undefined) counts[a.date]++ });
            
            const stats = Object.keys(counts).map(date => ({
                day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                visits: counts[date]
            }));
            setWeeklyStats(stats);
        }, (err) => {
            if (err?.code !== 'permission-denied') console.error(err);
        });

        return () => {
            unsubscribe();
            unsubApps();
        };
    }, [currentUser]);

    // Calculate Diagnosis Stats
    const diagnosisData = useMemo(() => {
        const counts = { "Healthy": 0, "Mild": 0, "Moderate": 0, "Severe": 0, "Proliferative": 0 };
        patients.forEach(p => {
            if (!p.diagnosisHistory || p.diagnosisHistory.length === 0) return;
            const last = p.diagnosisHistory[p.diagnosisHistory.length - 1];
            if (last.grade === 0) counts["Healthy"]++;
            else if (last.grade === 1) counts["Mild"]++;
            else if (last.grade === 2) counts["Moderate"]++;
            else if (last.grade === 3) counts["Severe"]++;
            else counts["Proliferative"]++;
        });
        return Object.keys(counts).map(key => ({ name: key, value: counts[key as keyof typeof counts] })).filter(i => i.value > 0);
    }, [patients]);

    const cardClass = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
    const hoverEffect = "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-blue-400 dark:hover:border-slate-600";

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" size={32}/></div>;

    const criticalCount = patients.filter(p => p.status === 'Critical').length;
    const activeCount = patients.filter(p => p.status === 'Active').length;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 pb-24">
            <h1 className={`text-2xl font-black uppercase tracking-tight mb-6 ${textMain}`}>System Insights</h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col justify-between h-32 ${hoverEffect}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Total Patients</p>
                            <h3 className={`text-3xl font-black ${textMain}`}>{patients.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-green-500 font-bold">
                        <TrendingUp size={12} className="mr-1" /> +2.5% vs last month
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col justify-between h-32 ${hoverEffect}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Critical Cases</p>
                            <h3 className={`text-3xl font-black text-red-500`}>{criticalCount}</h3>
                        </div>
                        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-red-500 font-bold">
                        Requires immediate attention
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col justify-between h-32 ${hoverEffect}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Active Monitoring</p>
                            <h3 className={`text-3xl font-black text-orange-500`}>{activeCount}</h3>
                        </div>
                        <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
                            <Activity size={20} />
                        </div>
                    </div>
                     <div className="flex items-center text-xs text-orange-500 font-bold">
                        Scheduled for follow-up
                    </div>
                </div>

                 <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col justify-between h-32 ${hoverEffect}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Avg. Confidence</p>
                            <h3 className={`text-3xl font-black text-emerald-500`}>96.5%</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-slate-400 font-bold">
                        AI Model Performance
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Diagnosis Distribution */}
                 <div className={`p-6 rounded-2xl border ${cardClass} h-[400px] ${hoverEffect}`}>
                    <h3 className={`text-lg font-bold mb-6 ${textMain}`}>Diagnosis Distribution</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <PieChart>
                            <Pie
                                data={diagnosisData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {diagnosisData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }}
                                itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 flex-wrap mt-2">
                        {diagnosisData.map((entry, index) => (
                            <div key={index} className="flex items-center text-xs font-bold text-slate-500">
                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {entry.name}
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Weekly Activity */}
                 <div className={`p-6 rounded-2xl border ${cardClass} h-[400px] ${hoverEffect}`}>
                    <h3 className={`text-lg font-bold mb-6 ${textMain}`}>Weekly Appointments</h3>
                     <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={weeklyStats}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                             <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                             <Tooltip 
                                cursor={{ fill: isDarkMode ? '#334155' : '#f1f5f9' }}
                                contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }}
                             />
                             <Bar dataKey="visits" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                     </ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
};

export default InsightsView;