import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Mail, ArrowRight, Loader2, ShieldCheck, Fingerprint, AlertCircle, Stethoscope, UserCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { getUserProfile, updateUserProfile } from '../services/userService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  themeAccent: string;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
    </g>
  </svg>
);

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, themeAccent }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>('patient');
  const [error, setError] = useState<string | null>(null);

  const { t, language } = useLanguage();

  const resetForm = () => {
      setEmail('');
      setPassword('');
      setFullName('');
      setError(null);
  }

  const toggleMode = () => {
      setIsLogin(!isLogin);
      resetForm();
  }

  const getErrorMessage = (code: string) => {
    switch(code) {
        case 'auth/invalid-credential': 
        case 'auth/invalid-login-credentials':
            return language === 'vi' ? "Email hoặc mật khẩu không đúng." : t.auth.errors.invalid_credential;
        case 'auth/user-not-found': return t.auth.errors.user_not_found;
        case 'auth/wrong-password': return t.auth.errors.wrong_password;
        case 'auth/email-already-in-use': return language === 'vi' ? "Email này đã được sử dụng." : t.auth.errors.email_in_use;
        case 'auth/weak-password': return language === 'vi' ? "Mật khẩu quá yếu (tối thiểu 6 ký tự)." : t.auth.errors.weak_password;
        case 'auth/invalid-email': return t.auth.errors.invalid_email;
        default: return t.auth.errors.general; 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
        let user;
        if (isLogin) {
            const result = await signInWithEmailAndPassword(auth, email, password);
            user = result.user;
            if (user) await getUserProfile(user); 
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
            if (fullName && user) {
                await updateProfile(user, { displayName: fullName });
            }
            if (user) {
                await getUserProfile(user, selectedRole);
                await updateUserProfile(user.uid, { role: selectedRole });
            }
        }
        onLogin();
    } catch (err: any) {
        setError(getErrorMessage(err.code));
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setIsGoogleLoading(true);
      setError(null);
      try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const result = await signInWithPopup(auth, provider);
          await getUserProfile(result.user, 'patient'); // Default to patient for Google
          onLogin();
      } catch (err: any) {
          console.error("Google Auth Error:", err);
          if (err.code !== 'auth/popup-closed-by-user') {
              setError(t.auth.errors.google_failed);
          }
      } finally {
          setIsGoogleLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl min-h-[550px] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row"
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-20 p-2 rounded-full hover:bg-white/10"
        >
            <X size={20} />
        </button>

        {/* --- LEFT: BRANDING --- */}
        <div className="hidden md:flex md:w-5/12 relative flex-col justify-between p-10 bg-black overflow-hidden">
            <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${themeAccent.replace('bg-', 'from-').replace('text-', 'from-')} to-transparent`} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
            
            {/* Animated Blob */}
            <motion.div 
                animate={{ y: [0, -15, 0], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute top-1/4 -right-10 w-72 h-72 rounded-full ${themeAccent} blur-[90px] opacity-20`} 
            />

            <div className="relative z-10">
                <div className="flex items-center space-x-2.5 mb-6">
                    <div className={`w-8 h-8 rounded bg-gradient-to-br ${themeAccent.replace('bg-', 'from-')} to-white flex items-center justify-center text-slate-900 font-black italic`}>M</div>
                    <span className="text-xl font-black italic text-white tracking-tighter">MED<span className={`${themeAccent.replace('bg-', 'text-')}`}>ASSIST</span></span>
                </div>
                <h2 className="text-3xl font-bold text-white leading-tight mb-4">
                    {isLogin ? t.auth.welcome_back : t.auth.join_revolution}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                    {t.auth.hero_desc}
                </p>
            </div>

            <div className="relative z-10 pt-6 border-t border-white/10">
                <div className="flex items-center space-x-4 mb-2">
                    <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <ShieldCheck size={14} className="text-green-500" />
                        <span>HIPAA Compliant</span>
                    </div>
                </div>
                <p className="text-[10px] text-slate-600">© 2024 MedAssist AI Inc.</p>
            </div>
        </div>

        {/* --- RIGHT: FORM --- */}
        <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-center bg-slate-900 relative">
            <div className="max-w-md mx-auto w-full">
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                        {isLogin ? t.auth.login_title : t.auth.create_title}
                    </h3>
                    <p className="text-slate-400 text-sm">
                        {isLogin ? t.auth.login_desc : t.auth.create_desc}
                    </p>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="bg-red-500/10 border border-red-500/50 rounded-xl px-4 py-3 flex items-start gap-3 text-red-400 text-xs font-medium"
                        >
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ROLE SELECTION (Visual Cards) - Only on Register */}
                <AnimatePresence>
                    {!isLogin && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="grid grid-cols-2 gap-3"
                        >
                            <div 
                                onClick={() => setSelectedRole('patient')}
                                className={`cursor-pointer relative p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center text-center gap-2 ${
                                    selectedRole === 'patient' 
                                    ? 'bg-blue-600/10 border-blue-600' 
                                    : 'bg-slate-800 border-transparent hover:bg-slate-700'
                                }`}
                            >
                                {selectedRole === 'patient' && <div className="absolute top-2 right-2 text-blue-500"><CheckCircle2 size={16} fill="currentColor" className="text-white"/></div>}
                                <div className={`p-2 rounded-full ${selectedRole === 'patient' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                    <UserCircle size={20} />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase ${selectedRole === 'patient' ? 'text-blue-500' : 'text-slate-300'}`}>{language === 'vi' ? 'Bệnh Nhân' : 'Patient'}</p>
                                    <p className="text-[10px] text-slate-500 leading-tight mt-1">{language === 'vi' ? 'Xem hồ sơ & lịch hẹn' : 'View records & tasks'}</p>
                                </div>
                            </div>

                            <div 
                                onClick={() => setSelectedRole('doctor')}
                                className={`cursor-pointer relative p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center text-center gap-2 ${
                                    selectedRole === 'doctor' 
                                    ? 'bg-indigo-600/10 border-indigo-600' 
                                    : 'bg-slate-800 border-transparent hover:bg-slate-700'
                                }`}
                            >
                                {selectedRole === 'doctor' && <div className="absolute top-2 right-2 text-indigo-500"><CheckCircle2 size={16} fill="currentColor" className="text-white"/></div>}
                                <div className={`p-2 rounded-full ${selectedRole === 'doctor' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                    <Stethoscope size={20} />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase ${selectedRole === 'doctor' ? 'text-indigo-500' : 'text-slate-300'}`}>{language === 'vi' ? 'Bác Sĩ' : 'Doctor'}</p>
                                    <p className="text-[10px] text-slate-500 leading-tight mt-1">{language === 'vi' ? 'Quản lý & Chẩn đoán' : 'Manage & Diagnose'}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <User className="text-slate-500 group-focus-within:text-white transition-colors" size={18} />
                                    </div>
                                    <input 
                                        type="text" placeholder={t.auth.full_name} required={!isLogin}
                                        value={fullName} onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-white focus:ring-1 focus:ring-white outline-none transition-all"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="text-slate-500 group-focus-within:text-white transition-colors" size={18} />
                        </div>
                        <input 
                            type="email" placeholder={t.auth.email} required
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-white focus:ring-1 focus:ring-white outline-none transition-all"
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Lock className="text-slate-500 group-focus-within:text-white transition-colors" size={18} />
                        </div>
                        <input 
                            type="password" placeholder={t.auth.password} required
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-white focus:ring-1 focus:ring-white outline-none transition-all"
                        />
                    </div>

                    <button 
                        type="submit" disabled={isLoading || isGoogleLoading}
                        className={`w-full py-4 mt-2 ${themeAccent} text-white font-bold rounded-xl uppercase text-xs tracking-widest hover:brightness-110 hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : (
                            <>
                                {isLogin ? t.auth.sign_in_btn : t.auth.create_btn}
                                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative flex items-center justify-center my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
                    <span className="relative z-10 bg-slate-900 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.auth.or_email}</span>
                </div>

                <button 
                    onClick={handleGoogleLogin} disabled={isGoogleLoading || isLoading}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg disabled:opacity-70"
                >
                    {isGoogleLoading ? <Loader2 size={20} className="animate-spin text-slate-600" /> : (
                        <><GoogleIcon /><span>{t.auth.google_btn}</span></>
                    )}
                </button>

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-400">
                        {isLogin ? t.auth.no_account : t.auth.has_account}{" "}
                        <button onClick={toggleMode} className={`font-bold ${themeAccent.replace('bg-', 'text-')} hover:underline transition-colors`}>
                            {isLogin ? t.auth.register_now : t.auth.sign_in_btn}
                        </button>
                    </p>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;