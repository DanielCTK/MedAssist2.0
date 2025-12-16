
import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Microscope, FileText, Check, AlertTriangle, ArrowRight, Loader2, ZoomIn, ZoomOut, Scan, Save, User, FlaskConical, Server, Sparkles, Edit3 } from 'lucide-react';
import { analyzeImageWithLocalModel } from '../services/localAnalysisService';
import { generateClinicalReport } from '../services/geminiService';
import { AnalysisResult, DRGrade, Patient, ReportData, DiagnosisRecord } from '../types';
import { subscribeToPatients, addPatientDiagnosis } from '../services/patientService';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';

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
  
  // Text generation states
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState(""); // NEW

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();
  const currentUser = auth.currentUser;

  const hoverEffect = "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-blue-400 dark:hover:border-slate-600";

  // Load patients
  useEffect(() => {
      if (currentUser) {
          const unsubscribe = subscribeToPatients(
              currentUser.uid,
              (data) => setPatients(data),
              (err) => console.error(err)
          );
          return () => unsubscribe();
      }
  }, [currentUser]);

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

  const runAnalysis = async () => {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      setReportData(null);
      setDoctorNotes(""); // Reset doctor notes on new analysis

      try {
          const result = await analyzeImageWithLocalModel(imageFile);
          setAnalysisResult(result);

          setIsReportGenerating(true);
          const currentPatient = patients.find(p => p.id === selectedPatientId) || {
              id: 'temp', 
              name: 'Unknown Patient', 
              age: 50, 
              gender: 'Other', 
              history: 'No records', 
              lastExam: 'N/A'
          } as Patient;

          const report = await generateClinicalReport(currentPatient, result, language);
          setReportData(report);

      } catch (error) {
          console.error("Analysis failed:", error);
      } finally {
          setIsAnalyzing(false);
          setIsReportGenerating(false);
      }
  };

const handleSaveToRecord = async () => {
      if (!selectedPatientId || !analysisResult || !reportData) {
          alert("Please select a patient and ensure analysis is complete.");
          return;
      }

      setIsSaving(true);
      try {
          const rawRecord = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              grade: Number(analysisResult.grade ?? 0), // Explicit Number cast
              confidence: Number(analysisResult.confidence ?? 0), // Explicit Number cast
              note: reportData.clinicalNotes || "No notes available",
              doctorNotes: doctorNotes || "No manual remarks", 
              imageUrl: imagePreview || null, 
              heatmapUrl: analysisResult.heatmapUrl || null
          };

          const cleanRecord = JSON.parse(JSON.stringify(rawRecord));
          await addPatientDiagnosis(selectedPatientId, cleanRecord as DiagnosisRecord);
          alert("Saved to patient record successfully!");
          
          setImageFile(null);
          setImagePreview(null);
          setAnalysisResult(null);
          setReportData(null);
          setDoctorNotes("");
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

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 pb-6">
        {/* LEFT COLUMN: Input & Preview */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`w-full md:w-1/2 flex flex-col gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
        >
            <div className={`p-4 md:p-6 rounded-2xl border flex flex-col flex-1 shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${hoverEffect}`}>
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center">
                    <Scan size={20} className="mr-2 text-blue-500" />
                    AI Diagnosis
                </h2>
                <div className="relative">
                    <select 
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className={`appearance-none pl-8 pr-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border outline-none cursor-pointer transition-colors ${
                            isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-100 border-slate-200 focus:border-blue-500 text-slate-900'
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
                className={`flex-1 min-h-[350px] md:min-h-0 rounded-xl border-2 border-dashed relative overflow-hidden transition-all group ${
                    imagePreview 
                    ? 'border-transparent' 
                    : isDarkMode ? 'border-slate-700 hover:border-slate-500 bg-slate-950/50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'
                }`}
            >
                {imagePreview ? (
                <div className="relative w-full h-full group">
                    <img src={imagePreview} className="w-full h-full object-contain" alt="Fundus" />
                    <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setImagePreview(null); setImageFile(null); setAnalysisResult(null); }} className="p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-blue-500/10 z-10 flex flex-col items-center justify-center">
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,1)] animate-[scan_2s_linear_infinite]" />
                            <div className="bg-black/70 px-4 py-2 rounded-full backdrop-blur-md text-white text-xs font-bold flex items-center">
                                <Server size={14} className="mr-2 animate-pulse text-green-400"/> Connecting to Local Core...
                            </div>
                        </div>
                    )}
                </div>
                ) : (
                <div 
                    onClick={triggerFileInput}
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                >
                    <div className={`p-6 rounded-full mb-4 transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-slate-800' : 'bg-blue-50'}`}>
                        <Upload size={40} className={isDarkMode ? 'text-slate-400' : 'text-blue-500'} />
                    </div>
                    <p className="text-base font-medium opacity-70">{t.diagnosis.scan_source}</p>
                    <p className="text-xs opacity-40 mt-2 uppercase font-bold tracking-widest">{t.diagnosis.upload_text}</p>
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

            <div className="mt-6 space-y-4">
                <button 
                    onClick={runAnalysis}
                    disabled={!imageFile || isAnalyzing}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center transition-all shadow-lg ${
                        !imageFile 
                        ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                        : isAnalyzing 
                            ? 'bg-blue-700 cursor-wait' 
                            : 'bg-blue-600 hover:bg-blue-50 hover:scale-[1.02]'
                    } text-white`}
                >
                    {isAnalyzing ? (
                        <><Loader2 size={16} className="animate-spin mr-2" /> Processing Local AI...</>
                    ) : (
                        <><Microscope size={16} className="mr-2" /> Run Local Model Analysis</>
                    )}
                </button>
            </div>
            </div>
        </motion.div>

      {/* RIGHT COLUMN: Results & Manual Entry */}
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
                  <div className={`p-6 rounded-2xl border shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${hoverEffect}`}>
                      <div className={`absolute top-0 left-0 w-2 h-full`} style={{ backgroundColor: GRADE_COLORS[analysisResult.grade] }} />
                      
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">AI Diagnosis</p>
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
                            animate={{ width: `${(analysisResult.grade === 0 ? 10 : (analysisResult.grade / 4) * 100)}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: GRADE_COLORS[analysisResult.grade] }}
                          />
                      </div>
                  </div>

                  {/* Gemini Generated Text Report */}
                  <div className={`flex-1 p-6 rounded-2xl border shadow-lg overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${hoverEffect}`}>
                       <div className="flex items-center mb-4">
                           <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black italic text-xs mr-3">
                               AI
                           </div>
                           <h3 className="font-bold text-sm uppercase tracking-wide">Automated Findings</h3>
                       </div>
                       
                       {isReportGenerating ? (
                           <div className="flex flex-col items-center justify-center py-10 opacity-60">
                               <Loader2 className="animate-spin mb-3" size={24} />
                               <p className="text-xs font-bold uppercase">Generating Report...</p>
                           </div>
                       ) : reportData ? (
                           <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">{reportData.clinicalNotes}</p>
                       ) : null}
                  </div>

                  {/* Manual Doctor Notes */}
                  <div className={`p-6 rounded-2xl border shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${hoverEffect}`}>
                        <div className="flex items-center mb-2">
                            <Edit3 size={16} className="mr-2 text-blue-500" />
                            <h3 className="font-bold text-sm uppercase tracking-wide">Doctor's Manual Diagnosis</h3>
                        </div>
                        <textarea 
                            value={doctorNotes}
                            onChange={(e) => setDoctorNotes(e.target.value)}
                            placeholder="Enter your clinical observations, additional findings, or corrections to the AI diagnosis here..."
                            className={`w-full h-24 p-3 rounded-xl text-sm resize-none outline-none border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                        />
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
