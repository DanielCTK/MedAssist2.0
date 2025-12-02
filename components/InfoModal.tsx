import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MapPin, Phone, Globe, Shield, Users, Award } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'about' | 'contact' | null;
  themeAccent: string;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, type, themeAccent }) => {
  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden rounded-xl"
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"
        >
            <X size={24} />
        </button>

        <div className="flex flex-col md:flex-row h-full min-h-[400px]">
            {/* Left Decorative Side */}
            <div className={`w-full md:w-1/3 p-8 ${themeAccent.replace('text-', 'bg-')} bg-opacity-10 relative overflow-hidden flex flex-col justify-between`}>
                <div className={`absolute inset-0 ${themeAccent.replace('text-', 'bg-')} opacity-10`} />
                <div>
                    <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter mb-2">
                        {type === 'about' ? 'Who We Are' : 'Get in Touch'}
                    </h2>
                    <div className={`h-1 w-12 ${themeAccent.replace('text-', 'bg-')}`} />
                </div>
                <div className="relative z-10">
                    {type === 'about' ? <Users size={48} className="text-white opacity-50" /> : <Mail size={48} className="text-white opacity-50" />}
                </div>
            </div>

            {/* Right Content Side */}
            <div className="w-full md:w-2/3 p-8 bg-slate-900">
                {type === 'about' ? (
                    <div className="space-y-6">
                        <p className="text-slate-300 leading-relaxed text-sm">
                            <strong className="text-white">MedAssist</strong> is a pioneer in AI-driven ophthalmology. 
                            Founded by a team of retina specialists and deep learning engineers, our mission is to eliminate preventable blindness through accessible technology.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-black/40 border border-slate-800 rounded">
                                <Award className="mb-2 text-yellow-500" size={20} />
                                <h4 className="text-white font-bold text-xs uppercase">Certified</h4>
                                <p className="text-[10px] text-slate-500">FDA Cleared Algorithm</p>
                            </div>
                            <div className="p-4 bg-black/40 border border-slate-800 rounded">
                                <Shield className="mb-2 text-blue-500" size={20} />
                                <h4 className="text-white font-bold text-xs uppercase">Secure</h4>
                                <p className="text-[10px] text-slate-500">HIPAA Compliant</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-slate-400 text-sm mb-6">
                            Our support team is available 24/7 for medical partners.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4 p-3 bg-black/40 border border-slate-800 hover:border-white/30 transition-colors cursor-pointer group">
                                <Mail size={18} className="text-slate-500 group-hover:text-white" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Email Support</p>
                                    <p className="text-white text-sm font-bold">partners@medassist.ai</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 p-3 bg-black/40 border border-slate-800 hover:border-white/30 transition-colors cursor-pointer group">
                                <Phone size={18} className="text-slate-500 group-hover:text-white" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Emergency Line</p>
                                    <p className="text-white text-sm font-bold">+1 (800) 555-0199</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 p-3 bg-black/40 border border-slate-800 hover:border-white/30 transition-colors cursor-pointer group">
                                <MapPin size={18} className="text-slate-500 group-hover:text-white" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Headquarters</p>
                                    <p className="text-white text-sm font-bold">Silicon Valley, CA</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InfoModal;