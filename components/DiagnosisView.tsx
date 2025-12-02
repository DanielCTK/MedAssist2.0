import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Microscope, FileText, Check, AlertTriangle, ArrowRight, Loader2, ZoomIn, ZoomOut, Scan, Save, User } from 'lucide-react';
import { analyzeImageWithLocalModel } from '../services/localAnalysisService';
import { generateClinicalReport } from '../services/geminiService';
import { AnalysisResult, DRGrade, Patient, ReportData, DiagnosisRecord } from '../types';
import { subscribeToPatients, addPatientDiagnosis } from '../services/patientService';
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Load patients for the dropdown
  useEffect(() => {
      const unsubscribe = subscribeToPatients(
          (data) => setPatients(data),
          (err) => console.error(err)
      );
      return () => unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnalysisResult(null);
        setReportData(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    try {
      // 1. Local AI Analysis
      const result = await analyzeImageWithLocalModel(imageFile);
      setAnalysisResult(result);
      
      // 2. Generate Report via Gemini (Only if patient is selected, or generic)
      const mockPatient = patients.find(p => p.id === selectedPatientId) || {
          id: 'temp', name: 'Unknown Patient', age: 0, gender: 'Other', history: 'None', lastExam: ''
      } as Patient;

      setIsReportGenerating(true);
      const report = await generateClinicalReport(mockPatient, result);
      setReportData(report);
      setIsReportGenerating(false);

    } catch (error) {
      console.error("Analysis failed", error);
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToRecord = async () => {
      if (!selectedPatientId || !analysisResult || !reportData) {
          alert("Please select a patient and ensure analysis is complete.");
          return;
      }

      setIsSaving(true);
      try {
          const newRecord: DiagnosisRecord = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              grade: analysisResult.grade,
              confidence: analysisResult.confidence,
              note: reportData.clinicalNotes,
              imageUrl: imagePreview || undefined // In real app, upload to storage first
          };

          await addPatientDiagnosis(selectedPatientId, newRecord);
          alert("Saved to patient record successfully!");
          
          // Reset
          setImageFile(null);
          setImagePreview(null);
          setAnalysisResult(null);
          setReportData(null);
          setSelectedPatientId("");

      } catch (err) {
          console.error(err);
          alert("Failed to save record.");
      } finally {
          setIsSaving(false);
      }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 pb-6">
      {/* LEFT COLUMN: Input & Preview */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-full md:w-1/2 flex flex-col gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
      >
        <div className={`p-6 rounded-2xl border flex flex-col flex-1 shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center">
                  <Scan size={20} className="mr-2 text-blue-500" />
                  {t.diagnosis.title}
              </h2>
              {/* Patient Selector */}
              <div className="relative">
                  <select 
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className={`appearance-none pl-8 pr-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border outline-none cursor-pointer transition-colors ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-blue-500' : 'bg-slate-100 border-slate-200 focus:border-blue-500'
                    }`}
                  >
                      <option value="">-- {t.diagnosis.select_placeholder} --</option>
                      {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (ID: {p.id.substring(0,4)})</option>
                      ))}
                  </select>
                  <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
              </div>
          </div>
          
          <div 
            className={`flex-1 rounded-xl border-2 border-dashed relative overflow-hidden transition-all group ${
                imagePreview 
                ? 'border-transparent' 
                : isDarkMode ? 'border-slate-700 hover:border-slate-500 bg-slate-950/50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'
            }`}
          >
            {imagePreview ? (
              <div className="relative w-full h-full group">
                 <img src={imagePreview} className="w-full h-full object-contain" alt="Fundus" />
                 <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setImagePreview(null)} className="p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors">
                        <X size={16} />
                    </button>
                 </div>
                 {/* Scanning Effect Overlay */}
                 {isAnalyzing && (
                     <div className="absolute inset-0 bg-blue-500/10 z-10">
                         <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,1)] animate-[scan_2s_linear_infinite]" />
                     </div>
                 )}
              </div>
            ) : (
              <div 
                onClick={triggerFileInput}
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              >
                <div className={`p-4 rounded-full mb-3 transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-slate-800' : 'bg-blue-50'}`}>
                    <Upload size={32} className={isDarkMode ? 'text-slate-400' : 'text-blue-500'} />
                </div>
                <p className="text-sm font-medium opacity-70">{t.diagnosis.scan_source}</p>
                <p className="text-xs opacity-40 mt-1 uppercase font-bold tracking-widest">{t.diagnosis.upload_text}</p>
              </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
            />
          </div>

          <div className="mt-6">
              <button 
                onClick={handleAnalyze}
                disabled={!imageFile || isAnalyzing}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center transition-all shadow-lg ${
                    !imageFile 
                    ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                    : isAnalyzing 
                        ? 'bg-blue-700 cursor-wait' 
                        : 'bg-blue-600 hover:bg-blue-500 hover:scale-[1.02]'
                } text-white`}
              >
                  {isAnalyzing ? (
                      <><Loader2 size={16} className="animate-spin mr-2" /> {t.diagnosis.running}</>
                  ) : (
                      <><Microscope size={16} className="mr-2" /> {t.diagnosis.analyze_btn}</>
                  )}
              </button>
          </div>
        </div>
      </motion.div>

      {/* RIGHT COLUMN: Results */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-full md:w-1/2 flex flex-col gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
      >
          {!analysisResult ? (
              <div className={`flex-1 rounded-2xl border border-dashed flex items-center justify-center p-10 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="text-center opacity-40">
                      <FileText size={48} className="mx-auto mb-4" />
                      <p className="font-bold uppercase tracking-widest text-xs">{t.diagnosis.awaiting_input}</p>
                  </div>
              </div>
          ) : (
              <div className="flex flex-col h-full gap-4">
                  {/* Grade Card */}
                  <div className={`p-6 rounded-2xl border shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className={`absolute top-0 left-0 w-2 h-full`} style={{ backgroundColor: GRADE_COLORS[analysisResult.grade] }} />
                      
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">{t.diagnosis.diagnosis_result}</p>
                              <h2 className="text-2xl font-black uppercase" style={{ color: GRADE_COLORS[analysisResult.grade] }}>
                                  {t.diagnosis.grade_labels[analysisResult.grade]}
                              </h2>
                          </div>
                          <div className="text-right">
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Confidence</p>
                              <p className="text-xl font-bold">{(analysisResult.confidence * 100).toFixed(1)}%</p>
                          </div>
                      </div>

                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(analysisResult.grade / 4) * 100}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: GRADE_COLORS[analysisResult.grade] }}
                          />
                      </div>
                  </div>

                  {/* Gemini Report */}
                  <div className={`flex-1 p-6 rounded-2xl border shadow-lg overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                       <div className="flex items-center mb-4">
                           <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black italic text-xs mr-3">
                               AI
                           </div>
                           <h3 className="font-bold text-sm uppercase tracking-wide">{t.diagnosis.gemini_analysis}</h3>
                       </div>
                       
                       {isReportGenerating ? (
                           <div className="flex flex-col items-center justify-center py-10 opacity-60">
                               <Loader2 className="animate-spin mb-3" size={24} />
                               <p className="text-xs font-bold uppercase">{t.diagnosis.generating}</p>
                           </div>
                       ) : reportData ? (
                           <div className="space-y-6">
                               <div>
                                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Clinical Findings</p>
                                   <p className="text-sm leading-relaxed opacity-90">{reportData.clinicalNotes}</p>
                               </div>
                               <div>
                                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Patient Communication</p>
                                   <div className={`p-4 rounded-xl text-sm italic ${isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
                                       "{reportData.patientLetter}"
                                   </div>
                               </div>
                           </div>
                       ) : null}
                  </div>

                  {/* Action Bar */}
                  {selectedPatientId && reportData && (
                      <motion.button 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleSaveToRecord}
                        disabled={isSaving}
                        className="py-4 bg-green-600 hover:bg-green-500 text-white font-bold uppercase text-xs rounded-xl shadow-lg flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                         {isSaving ? <Loader2 className="animate-spin mr-2" size={16}/> : <Save className="mr-2" size={16} />}
                         Save to Patient Record
                      </motion.button>
                  )}
              </div>
          )}
      </motion.div>
    </div>
  );
};

export default DiagnosisView;