
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, FileText, ArrowRight, Star, ShieldCheck } from 'lucide-react';
import AuthModal from './AuthModal';

interface PatientWelcomeScreenProps {
    onEnter: () => void;
}

const PatientWelcomeScreen: React.FC<PatientWelcomeScreenProps> = ({ onEnter }) => {
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    return (
        <div className="relative w-full h-screen bg-[#FF8E6E] overflow-hidden flex flex-col font-sans text-white">
            <AuthModal 
                isOpen={isAuthOpen} 
                onClose={() => setIsAuthOpen(false)} 
                onLogin={onEnter}
                themeAccent="bg-[#FF8E6E] text-white"
            />

            {/* --- BACKGROUND DECORATIONS --- */}
            {/* Top Right Circle */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none" />
            {/* Bottom Left Circle */}
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-red-500 opacity-10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Curved Lines (SVG) */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 C 30 40 70 40 100 0 V 100 H 0 Z" fill="none" stroke="white" strokeWidth="0.2" />
                <path d="M0 20 C 40 60 60 60 100 20" fill="none" stroke="white" strokeWidth="0.2" />
            </svg>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-8 pb-10 pt-4">
                
                {/* 1. ILLUSTRATION AREA */}
                <div className="relative w-full max-w-sm aspect-square mb-8 flex items-center justify-center">
                    {/* Main Character Illustration (Placeholder Style) */}
                    <motion.img 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8 }}
                        src="https://cdni.iconscout.com/illustration/premium/thumb/online-doctor-consultation-illustration-download-in-svg-png-gif-file-formats--medical-health-care-call-technology-pack-network-communication-illustrations-2928670.png?f=webp" 
                        alt="Patient Illustration"
                        className="w-full h-full object-contain drop-shadow-2xl z-10"
                    />

                    {/* Floating Card 1: Video/Consult */}
                    <motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="absolute top-10 right-0 bg-white p-3 rounded-2xl shadow-xl z-20 flex items-center gap-3 animate-bounce-slow"
                    >
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <Play size={16} className="text-[#FF8E6E] fill-[#FF8E6E]" />
                        </div>
                        <div className="pr-2">
                            <div className="w-12 h-2 bg-slate-200 rounded-full mb-1"></div>
                            <div className="w-8 h-2 bg-slate-100 rounded-full"></div>
                        </div>
                    </motion.div>

                    {/* Floating Card 2: Document */}
                    <motion.div 
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7, type: 'spring' }}
                        className="absolute bottom-10 left-0 bg-[#FFD464] p-4 rounded-xl shadow-xl z-20"
                    >
                        <FileText size={24} className="text-slate-800" />
                        <div className="w-8 h-1 bg-slate-800/20 rounded-full mt-2"></div>
                    </motion.div>
                </div>

                {/* 2. TEXT CONTENT */}
                <div className="w-full max-w-md text-left self-start">
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-5xl font-black leading-tight mb-4"
                    >
                        Chăm Sóc Mắt <br/>
                        <span className="opacity-90">Toàn Diện</span>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-white/80 text-sm leading-relaxed mb-8 pr-10 font-medium"
                    >
                        Theo dõi sức khỏe võng mạc, đặt lịch khám và nhận tư vấn từ chuyên gia AI & Bác sĩ ngay trên điện thoại của bạn.
                    </motion.p>
                </div>

                {/* 3. ACTION BUTTON */}
                <motion.button 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    onClick={() => setIsAuthOpen(true)}
                    className="w-full max-w-md bg-white text-[#FF8E6E] py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center group"
                >
                    Bắt đầu ngay
                    <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                {/* Footer Badges */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-8 flex items-center gap-4 text-xs font-bold uppercase tracking-wider opacity-60"
                >
                    <span className="flex items-center"><ShieldCheck size={14} className="mr-1"/> Bảo Mật</span>
                    <span className="flex items-center"><Star size={14} className="mr-1"/> Uy Tín</span>
                </motion.div>

            </div>
        </div>
    );
};

export default PatientWelcomeScreen;
