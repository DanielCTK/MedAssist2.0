import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Microscope, FileText, Check, AlertTriangle, ArrowRight, Loader2, ZoomIn, ZoomOut, Scan } from 'lucide-react';
import { analyzeImageWithLocalModel } from '../services/localAnalysisService';
import { generateClinicalReport } from '../services/geminiService';
import { AnalysisResult, DRGrade, Patient, ReportData, ChartData } from '../types';
import { subscribeToPatients } from '../services/patientService'; // New Import
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface DiagnosisViewProps {
    isDarkMode: boolean;
}

const GRADE_COLORS = {
  [DRGrade.NoDR]: '#22c55e', // Green
  [DRGrade.Mild]: '#eab308', // Yellow
  [DRGrade.Moderate]: '#f97316', // Orange
  [DRGrade.Severe]: '#ef4444', // Red
  [DRGrade.Proliferative]: '#b91c1c', // Dark Red
};

const DiagnosisView: React.FC<DiagnosisViewProps> = ({ isDarkMode }) => {
  // Use real patients from Firestore
  const [patients, setPatients] = useState<Patient[]>([]);
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLanguage();

  // Subscribe to patients on mount
  useEffect(() => {
    const unsubscribe = subscribeToPatients(
      (data) => {
        setPatients(data);
      },
      (error) => {
        console.error("Failed to fetch patients:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
      setReport(null);
      setZoomLevel(1);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !selectedPatient) return;
    
    setIsAnalyzing(true);
    try {
      const analysisData = await analyzeImageWithLocalModel(imageFile);
      setResult(analysisData);
      
      setIsGeneratingReport(true);
      const reportData = await generateClinicalReport(selectedPatient, analysisData);
      setReport(reportData);
    } catch (error) {
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingReport(false);
    }
  };

  const getConfidenceChartData = (confidence: number): ChartData[] => [
    { name: 'Confidence', value: confidence, fill: '#ef4444' }, // Red for confidence
    { name: 'Uncertainty', value: 1 - confidence, fill: isDarkMode ? '#1e293b' : '#e2e8f0' },
  ];

  // Theme Classes
  const containerClass = isDarkMode ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-900 shadow-lg";
  const inputClass = isDarkMode ? "bg-slate-950 border-slate-700 text-white focus:border-red-600" : "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600";
  const mutedText = isDarkMode ? "text-slate-500" : "text-slate-500";
  const panelBg = isDarkMode ? "bg-black/40" : "bg-slate-50";
  const accentText = isDarkMode ? "text-red-600" : "text-blue-600";
  const buttonBg = isDarkMode ? "bg-red-600 hover:bg-red-700 shadow-red-500/30" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30";
  const borderFocus = isDarkMode ? "border-red-600" : "border-blue-600";
  const hoverBorder = isDarkMode ? "hover:border-slate-500" : "hover:border-blue-400";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel: Inputs (Reduced width and padding) */}
      <div className={`w-[240px] lg:w-1/5 p-4 flex flex-col border-r overflow-y-auto custom-scrollbar ${panelBg} ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <h2 className={`text-lg font-black mb-5 flex items-center uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          <Scan className={`mr-2 ${accentText}`} size={20} /> {t.diagnosis.title}
        </h2>

        {/* Patient Selection */}
        <div className="mb-5">
          <label className={`block text-[9px] font-bold uppercase tracking-widest mb-1.5 ${mutedText}`}>{t.diagnosis.subject}</label>
          <motion.select 
            whileHover={{ scale: 1.01 }}
            className={`w-full p-2.5 border rounded outline-none transition-all uppercase text-[10px] font-bold ${inputClass}`}
            onChange={(e) => setSelectedPatient(patients.find(p => p.id === e.target.value) || null)}
            defaultValue=""
          >
            <option value="" disabled>{t.diagnosis.select_placeholder}</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </motion.select>
          {selectedPatient && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mt-2 p-2 border-l-2 ${isDarkMode ? 'border-red-600' : 'border-blue-600'} text-[10px] ${isDarkMode ? 'bg-slate-900/50' : 'bg-white shadow-sm'}`}>
              <p className="line-clamp-2">{selectedPatient.history}</p>
            </motion.div>
          )}
        </div>

        {/* Image Upload - Shorter */}
        <div className="mb-5">
          <label className={`block text-[9px] font-bold uppercase tracking-widest mb-1.5 ${mutedText}`}>{t.diagnosis.scan_source}</label>
          <motion.div 
            whileHover={{ scale: 1.01, backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(239, 246, 255, 1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed h-32 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group rounded-lg ${
              imagePreview ? borderFocus : isDarkMode ? `border-slate-700 ${hoverBorder}` : `border-slate-300 ${hoverBorder}`
            }`}
          >
             
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            {imagePreview ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                 <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain opacity-80" />
                 <button 
                  onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); setResult(null); }}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 z-10"
                 >
                   <X size={12} />
                 </button>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 mb-1 opacity-40 group-hover:opacity-100 transition-opacity" />
                <p className="text-[9px] font-bold uppercase opacity-60">{t.diagnosis.upload_text}</p>
              </>
            )}
          </motion.div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAnalyze}
          disabled={!selectedPatient || !imageFile || isAnalyzing}
          className={`w-full py-3 font-black text-white flex items-center justify-center space-x-2 transition-all uppercase text-xs tracking-widest rounded-lg ${
            !selectedPatient || !imageFile || isAnalyzing 
            ? 'bg-slate-500 cursor-not-allowed opacity-50' 
            : buttonBg
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              <span>{t.diagnosis.running}</span>
            </>
          ) : (
            <>
              <Microscope size={14} />
              <span>{t.diagnosis.analyze_btn}</span>
            </>
          )}
        </motion.button>

        {isGeneratingReport && (
            <div className={`mt-3 p-2 rounded text-[10px] flex items-center justify-center animate-pulse uppercase font-mono tracking-tight border ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Gemini 2.5...
            </div>
        )}
      </div>

      {/* Right Panel: Results - Compacted */}
      <div className="flex-1 p-4 overflow-y-auto relative custom-scrollbar">
         
        {!result ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50 z-10 relative">
            <Scan className="w-16 h-16 mb-2 opacity-20" />
            <p className="text-sm font-black uppercase tracking-widest">{t.diagnosis.awaiting_input}</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-4 relative z-10 h-full flex flex-col">
            
            {/* Header Result Card (More Compact) */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 border flex flex-col md:flex-row items-center justify-between relative overflow-hidden rounded-xl ${containerClass}`}
            >
               {/* Color Bar */}
               <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: GRADE_COLORS[result.grade] }}></div>

               <div className="flex items-center space-x-4 pl-1">
                 <div className="relative w-16 h-16">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie 
                        data={getConfidenceChartData(result.confidence)} 
                        innerRadius={22} 
                        outerRadius={28} 
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                       >
                         {getConfidenceChartData(result.confidence).map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                         ))}
                       </Pie>
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-[8px] font-bold uppercase opacity-50">Conf.</span>
                      <span className="text-sm font-black">{Math.round(result.confidence * 100)}%</span>
                   </div>
                 </div>

                 <div>
                   <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5 opacity-50">{t.diagnosis.diagnosis_result}</p>
                   <h1 className="text-xl font-black uppercase italic tracking-tighter" style={{ color: GRADE_COLORS[result.grade] }}>
                       {t.diagnosis.grade_labels[result.grade as 0|1|2|3|4]}
                   </h1>
                   <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-100 border-slate-300'}`}>
                        Grade {result.grade}
                      </span>
                   </div>
                 </div>
               </div>
            </motion.div>

            {/* Viewer & Reports Grid - Flexible Height */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                {/* Image Viewer - Fixed height to avoid overflow */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`border flex flex-col relative group rounded-xl overflow-hidden h-[300px] lg:h-auto ${isDarkMode ? 'bg-black border-slate-800' : 'bg-slate-900 border-slate-300'}`}
                >
                    <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                        <h3 className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">{t.diagnosis.scan_source}</h3>
                        <div className="flex space-x-1">
                            <button onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))} className="p-1 hover:text-white text-slate-500"><ZoomOut size={12} /></button>
                            <span className="p-1 text-[9px] font-mono text-red-500">{zoomLevel}x</span>
                            <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))} className="p-1 hover:text-white text-slate-500"><ZoomIn size={12} /></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                        {imagePreview && (
                            <img 
                                src={imagePreview} 
                                alt="Fundus" 
                                className="transition-transform duration-300 ease-out max-w-full max-h-full object-contain filter contrast-125"
                                style={{ transform: `scale(${zoomLevel})` }}
                            />
                        )}
                    </div>
                </motion.div>

                {/* Gemini Report */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`border flex flex-col rounded-xl overflow-hidden h-[300px] lg:h-auto ${containerClass}`}
                >
                    <div className={`p-3 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                        <h3 className="font-bold flex items-center uppercase text-[10px] tracking-wider">
                            <FileText size={12} className={`mr-1.5 ${accentText}`} /> 
                            {t.diagnosis.gemini_analysis}
                        </h3>
                    </div>
                    <div className={`flex-1 p-4 overflow-y-auto space-y-4 text-xs font-light custom-scrollbar ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {!report ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-50">
                                <Loader2 className={`animate-spin ${accentText} w-5 h-5`} />
                                <span className="uppercase font-bold text-[9px] tracking-widest">{t.diagnosis.generating}</span>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h4 className={`text-[9px] font-bold ${accentText} uppercase tracking-widest mb-1 border-b ${isDarkMode ? 'border-red-900' : 'border-blue-200'} pb-0.5 w-max`}>Clinical</h4>
                                    <p className="leading-relaxed">{report.clinicalNotes}</p>
                                </div>
                                <div className="pt-1">
                                    <h4 className={`text-[9px] font-bold ${accentText} uppercase tracking-widest mb-1 border-b ${isDarkMode ? 'border-red-900' : 'border-blue-200'} pb-0.5 w-max`}>Communication</h4>
                                    <div className={`p-3 border-l-2 border-slate-400 rounded-r-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                        <p className="italic font-serif">"{report.patientLetter}"</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisView;