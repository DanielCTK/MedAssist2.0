import React, { useState, useEffect } from 'react';
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
        }, console.error);

        // Fetch last 7 days appointments for chart
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const unsubApps = subscribeToAppointmentsRange(startStr, endStr, (apps) => {
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
        }, console.error);

        return () => {
            unsubscribe();
            unsubApps();
        };
    }, [currentUser]);

    // Calculate Diagnosis Stats
    const diagnosisData = React.useMemo(() => {
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

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" size={32}/></div>;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
            <h1 className={`text-2xl font-black uppercase tracking-tight mb-6 ${textMain}`}>System Insights</h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col justify-between h-32`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Total Patients</p>
                            <h3 className={`text-3xl font-black ${textMain}`}>{patients.length}</h3>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Users size={20}/></div>
                    </div>
                    <div className="text-[10px] text-green-500 font-bold flex items-center">
                        <TrendingUp size={12} className="mr-1"/> +12% this month
                    </div>
                </div>
                
                <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col justify-between h-32`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Critical Cases</p>
                            <h3 className={`text-3xl font-black text-red-500`}>{patients.filter(p => p.status === 'Critical').length}</h3>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><AlertTriangle size={20}/></div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">Needs immediate attention</div>
                </div>

                <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col justify-between h-32`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Avg. Confidence</p>
                            <h3 className={`text-3xl font-black text-purple-500`}>92.4%</h3>
                        </div>
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Activity size={20}/></div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">AI Model Performance</div>
                </div>
                
                <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col justify-between h-32`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Weekly Visits</p>
                            <h3 className={`text-3xl font-black text-orange-500`}>
                                {weeklyStats.reduce((acc, curr) => acc + curr.visits, 0)}
                            </h3>
                        </div>
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><Activity size={20}/></div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">Last 7 Days</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Diagnosis Distribution */}
                <div className={`p-6 rounded-3xl border ${cardClass} h-[350px] flex flex-col`}>
                    <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${textSub}`}>Diagnosis Distribution</h3>
                    <div className="flex-1 w-full min-h-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={diagnosisData}
                                    cx="50%"
                                    cy="50%"
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
                                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1e293b' : '#fff', fontSize: '12px' }}
                                    itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {diagnosisData.map((entry, index) => (
                            <div key={index} className="flex items-center text-[10px] font-bold">
                                <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className={textSub}>{entry.name} ({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weekly Appointments */}
                <div className={`p-6 rounded-3xl border ${cardClass} h-[350px] flex flex-col`}>
                    <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${textSub}`}>Patient Volume (7 Days)</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip 
                                    cursor={{ fill: isDarkMode ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1e293b' : '#fff', fontSize: '12px' }}
                                    itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                                />
                                <Bar dataKey="visits" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Mock System Logs */}
            <div className={`p-6 rounded-3xl border ${cardClass}`}>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${textSub}`}>Recent System Logs</h3>
                <div className="space-y-3">
                    {[
                        { time: "10:42 AM", user: "Dr. Robert", action: "Updated Patient Record #4829" },
                        { time: "09:15 AM", user: "System", action: "Daily Database Backup Completed" },
                        { time: "08:30 AM", user: "Dr. Sarah", action: "Performed Diagnosis Analysis" },
                        { time: "Yesterday", user: "Nurse Joy", action: "Added 12 new items to Inventory" },
                    ].map((log, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b last:border-0 pb-2 border-slate-100 dark:border-slate-800">
                            <span className={`font-mono text-xs ${textSub}`}>{log.time}</span>
                            <span className={`font-bold ${textMain}`}>{log.user}</span>
                            <span className={textSub}>{log.action}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InsightsView;