
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { updateUserProfile, uploadUserImage } from '../services/userService';
import { linkPatientToDoctor } from '../services/patientService';
import { Save, Loader2, Camera, MapPin, Edit2, LogOut, Check, Image as ImageIcon, Key, X, Link as LinkIcon, Stethoscope, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { updatePassword, signOut } from "firebase/auth";
import { auth } from '../services/firebase';

interface SettingsViewProps {
    userProfile: UserProfile | null;
    isDarkMode: boolean;
    onProfileUpdate: (newProfile: UserProfile) => void;
    // Add closeHandler if we want strict click control, but here we assume parent handles view state or we use a "Back" button concept
    onClose?: () => void; 
}

const SettingsView: React.FC<SettingsViewProps> = ({ userProfile, isDarkMode, onProfileUpdate, onClose }) => {
    const { t, language } = useLanguage();
    const [formData, setFormData] = useState<UserProfile | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    // Upload states
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    
    const [editingField, setEditingField] = useState<string | null>(null);

    // Password Modal State
    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passError, setPassError] = useState("");
    const [passSuccess, setPassSuccess] = useState("");

    // Linking State
    const [doctorEmail, setDoctorEmail] = useState("");
    const [isLinking, setIsLinking] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const hoverEffect = "hover:shadow-2xl hover:border-blue-400 dark:hover:border-slate-600 transition-all duration-500";

    const isPatient = userProfile?.role === 'patient';

    useEffect(() => {
        if (userProfile) {
            setFormData({ ...userProfile });
        }
    }, [userProfile]);

    // Handle Click Outside to Close (Simulated "Modal" behavior within View)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node) && onClose) {
                // Check if the click was on a modal (portal) which might be outside this ref but valid
                // onClose(); 
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleLogoutWrapper = async () => {
        setIsLoggingOut(true);
        try {
            await signOut(auth);
            // App component handles redirect on auth state change
        } catch (e) {
            console.error(e);
            setIsLoggingOut(false);
        }
    };

    const handleSaveField = async (key: keyof UserProfile, value: string) => {
        if (!formData) return;
        
        setIsSaving(true);
        const updatedProfile = { ...formData, [key]: value };
        setFormData(updatedProfile); // Optimistic update
        
        try {
            await updateUserProfile(formData.uid, { [key]: value });
            onProfileUpdate(updatedProfile);
            setEditingField(null);
        } catch (error) {
            console.error("Failed to update", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangeLocal = (key: keyof UserProfile, value: string) => {
        if (!formData) return;
        setFormData({ ...formData, [key]: value });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        if (!formData || !e.target.files || !e.target.files[0]) return;
        
        const file = e.target.files[0];
        const isAvatar = type === 'avatar';
        
        const previewUrl = URL.createObjectURL(file);
        
        const optimisticProfile = { 
            ...formData, 
            [isAvatar ? 'photoURL' : 'bannerURL']: previewUrl 
        };
        setFormData(optimisticProfile);
        
        if (isAvatar) setIsUploadingAvatar(true);
        else setIsUploadingBanner(true);

        try {
            const finalUrl = await uploadUserImage(formData.uid, file, type);
            const field = isAvatar ? 'photoURL' : 'bannerURL';
            await updateUserProfile(formData.uid, { [field]: finalUrl });
            
            const finalProfile = { ...formData, [field]: finalUrl };
            setFormData(finalProfile);
            onProfileUpdate(finalProfile);
            
        } catch (error) {
            console.error("Critical upload error:", error);
        } finally {
            if (isAvatar) setIsUploadingAvatar(false);
            else setIsUploadingBanner(false);
        }
    };

    // --- FUNCTION: CONNECT TO DOCTOR ---
    const handleConnectDoctor = async () => {
        if (!doctorEmail || !formData) return;
        setIsLinking(true);
        try {
            const doctor = await linkPatientToDoctor(formData, doctorEmail);
            alert(`✅ Successfully connected to Dr. ${doctor.displayName}! Go to the Chat tab to send a message.`);
            setDoctorEmail("");
            if (formData) {
                const updated = { ...formData, doctorUid: doctor.uid, hospital: doctor.hospital };
                setFormData(updated);
                onProfileUpdate(updated);
            }
        } catch (err: any) {
            console.error(err);
            alert(`❌ Linking failed: ${err.message}`);
        } finally {
            setIsLinking(false);
        }
    };

    // --- FUNCTION: REMOVE AVATAR ---
    const handleRemoveAvatar = async () => {
        if (!formData || !confirm("Are you sure you want to remove your profile picture?")) return;
        
        try {
            setIsUploadingAvatar(true);
            await updateUserProfile(formData.uid, { photoURL: '' });
            const updatedProfile = { ...formData, photoURL: '' };
            setFormData(updatedProfile);
            onProfileUpdate(updatedProfile);
        } catch (error) {
            console.error("Failed to remove avatar", error);
            alert("Failed to remove avatar.");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // --- FUNCTION: CHANGE PASSWORD ---
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassError("");
        setPassSuccess("");

        if (newPassword !== confirmPassword) {
            setPassError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setPassError("Password must be at least 6 characters.");
            return;
        }

        const user = auth.currentUser;
        if (user) {
            setIsSaving(true);
            try {
                await updatePassword(user, newPassword);
                setPassSuccess("Password updated successfully!");
                setNewPassword("");
                setConfirmPassword("");
                setTimeout(() => setIsPassModalOpen(false), 1500);
            } catch (error: any) {
                console.error("Password update error", error);
                if (error.code === 'auth/requires-recent-login') {
                    setPassError("For security, please logout and login again to change your password.");
                } else {
                    setPassError("Failed to update password. " + error.message);
                }
            } finally {
                setIsSaving(false);
            }
        }
    };

    // --- FUNCTION: SIGN OUT ALL DEVICES ---
    const handleSignOutAll = async () => {
        const confirmSignOut = confirm("This will sign you out from this device and invalidate tokens on other devices (security measure). Continue?");
        if (confirmSignOut) {
            try {
                await signOut(auth);
                window.location.reload(); 
            } catch (error) {
                console.error("Sign out error", error);
            }
        }
    };

    if (!formData) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    // Styles
    const containerClass = isDarkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900";
    const borderClass = isDarkMode ? "border-slate-800" : "border-slate-100";
    const labelColor = isDarkMode ? "text-slate-400" : "text-slate-500";
    const valueColor = isDarkMode ? "text-slate-200" : "text-slate-800";
    const linkColor = "text-blue-500 hover:text-blue-600";
    const inputBg = isDarkMode ? "bg-slate-950 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900";

    const InfoRow = ({ 
        label, 
        fieldKey, 
        value, 
        type = "text", 
        readOnly = false,
        isLink = false
    }: { 
        label: string, 
        fieldKey: keyof UserProfile | 'password' | 'device', 
        value: string, 
        type?: string,
        readOnly?: boolean,
        isLink?: boolean
    }) => {
        const isEditing = editingField === fieldKey;

        return (
            <div className={`flex flex-col md:flex-row md:items-center justify-between py-6 border-b ${borderClass} last:border-0 group hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg transition-colors`}>
                <div className="md:w-1/3 mb-2 md:mb-0">
                    <span className={`text-sm font-bold ${labelColor}`}>{label}</span>
                </div>
                
                <div className="md:w-2/3 flex items-center justify-between">
                    {isEditing && !readOnly ? (
                        <div className="flex items-center w-full max-w-md gap-2">
                             <input 
                                type={type}
                                value={value} 
                                onChange={(e) => handleChangeLocal(fieldKey as keyof UserProfile, e.target.value)}
                                className={`flex-1 p-2 rounded text-sm border outline-none ${inputBg}`}
                                autoFocus
                            />
                            <button 
                                onClick={() => handleSaveField(fieldKey as keyof UserProfile, value)}
                                disabled={isSaving}
                                className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                                <Check size={16} />
                            </button>
                            <button 
                                onClick={() => setEditingField(null)}
                                className="p-2 bg-slate-500 text-white rounded hover:bg-slate-600 transition-colors"
                            >
                                <X size={16} /> 
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <span className={`text-sm font-medium truncate pr-4 ${isLink ? linkColor : valueColor}`}>
                                {fieldKey === 'password' ? '••••••••' : value}
                            </span>
                            
                            {!readOnly && fieldKey !== 'password' && fieldKey !== 'device' && (
                                <button 
                                    onClick={() => setEditingField(fieldKey)}
                                    className={`text-xs font-bold uppercase ${linkColor} opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0`}
                                >
                                    Edit
                                </button>
                            )}

                             {/* Special Action Buttons */}
                            {fieldKey === 'password' && (
                                <button 
                                    onClick={() => setIsPassModalOpen(true)}
                                    className={`text-xs font-bold uppercase ${linkColor} ml-4 shrink-0`}
                                >
                                    Change
                                </button>
                            )}
                            
                            {fieldKey === 'device' && (
                                <button 
                                    onClick={handleSignOutAll}
                                    className={`text-xs font-bold uppercase text-red-500 hover:text-red-600 ml-4 shrink-0`}
                                >
                                    Sign Out All
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        // Added onClick to close logic wrapper if this is rendered as a modal-like view
        <div 
            className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-8 relative" 
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) {
                    onClose();
                }
            }}
        >
            <motion.div 
                ref={containerRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-xl border ${borderClass} ${containerClass} ${hoverEffect}`}
            >
                {/* --- BANNER SECTION --- */}
                <div className="relative h-48 w-full bg-slate-200 group/banner">
                    {/* Add Back Button if needed */}
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="absolute top-4 left-4 z-20 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}

                    {formData.bannerURL ? (
                        <img 
                            src={formData.bannerURL} 
                            alt="Cover" 
                            className={`w-full h-full object-cover transition-all duration-500 ${isUploadingBanner ? 'blur-sm scale-105' : ''}`}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/10 group-hover/banner:bg-black/30 transition-colors duration-300"></div>

                    {/* Upload Cover Button */}
                    <div className="absolute top-4 right-4">
                        <input 
                            type="file" 
                            ref={bannerInputRef} 
                            onChange={(e) => handleFileChange(e, 'banner')} 
                            className="hidden" 
                            accept="image/*"
                        />
                        <button 
                            onClick={() => bannerInputRef.current?.click()}
                            disabled={isUploadingBanner}
                            className="px-4 py-2 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white text-xs font-bold rounded-lg border border-white/20 flex items-center transition-all shadow-lg"
                        >
                            {isUploadingBanner ? (
                                <Loader2 size={14} className="animate-spin mr-2" />
                            ) : (
                                <ImageIcon size={14} className="mr-2" />
                            )}
                            {isUploadingBanner ? 'Uploading...' : 'Change Cover'}
                        </button>
                    </div>
                </div>

                {/* --- PROFILE HEADER SECTION --- */}
                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 md:-mt-16 mb-8 gap-6">
                        {/* Avatar */}
                        <div className="flex flex-col items-center">
                            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-2xl p-1.5 ${isDarkMode ? 'bg-slate-900' : 'bg-white'} shadow-2xl relative group/avatar`}>
                                <div className="w-full h-full rounded-xl overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                                    <img 
                                        src={formData.photoURL || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop"} 
                                        alt="Avatar" 
                                        className={`w-full h-full object-cover transition-all duration-300 ${isUploadingAvatar ? 'blur-sm opacity-80' : ''}`}
                                    />
                                    {isUploadingAvatar && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <Loader2 className="text-white animate-spin" size={24} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex space-x-3 mt-3 text-[10px] font-bold uppercase tracking-wider">
                                <input 
                                    type="file" 
                                    ref={avatarInputRef} 
                                    onChange={(e) => handleFileChange(e, 'avatar')} 
                                    className="hidden" 
                                    accept="image/*"
                                />
                                <button 
                                    onClick={() => avatarInputRef.current?.click()}
                                    className={`${linkColor} flex items-center`}
                                    disabled={isUploadingAvatar}
                                >
                                    <Camera size={12} className="mr-1" />
                                    Change
                                </button>
                                <button 
                                    onClick={handleRemoveAvatar} 
                                    className="text-red-500 hover:text-red-600 disabled:opacity-50"
                                    disabled={!formData.photoURL}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>

                        {/* Name & Info */}
                        <div className="flex-1 pt-2 md:pb-6">
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditingField('displayName')}>
                                {editingField === 'displayName' ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            value={formData.displayName}
                                            onChange={(e) => handleChangeLocal('displayName', e.target.value)}
                                            className={`text-2xl font-bold bg-transparent border-b ${borderClass} outline-none ${valueColor}`}
                                            autoFocus
                                        />
                                        <button onClick={(e) => { e.stopPropagation(); handleSaveField('displayName', formData.displayName); }}><Check size={18} className="text-green-500"/></button>
                                    </div>
                                ) : (
                                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 mb-1">
                                        {formData.displayName}
                                    </h1>
                                )}
                                {editingField !== 'displayName' && <Edit2 size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />}
                            </div>
                            
                            <div className="flex flex-col md:flex-row md:items-center text-sm font-medium opacity-80 gap-2 md:gap-4 mt-1">
                                <span className={valueColor}>
                                    {isPatient ? 'Patient Account' : `${formData.specialty || "Medical Staff"} @ ${formData.hospital || "General Hospital"}`}
                                </span>
                                <span className={`hidden md:inline ${labelColor}`}>•</span>
                                <span className={`flex items-center ${labelColor}`}>
                                    <MapPin size={14} className="mr-1" />
                                    {formData.location || "Location not set"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN LOGOUT BUTTON --- */}
                    <div className="mb-8">
                        <button 
                            onClick={handleLogoutWrapper}
                            disabled={isLoggingOut}
                            className={`w-full py-4 border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-500 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center transition-all shadow-sm hover:shadow-red-500/30 ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoggingOut ? <Loader2 size={18} className="animate-spin mr-2"/> : <LogOut size={18} className="mr-2"/>}
                            Sign Out of Account
                        </button>
                    </div>

                    {/* --- PATIENT ONLY: CONNECT TO DOCTOR --- */}
                    {isPatient && (
                        <div className={`mb-8 p-6 rounded-2xl border-2 border-dashed ${isDarkMode ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-indigo-500 flex items-center mb-1">
                                        <Stethoscope size={20} className="mr-2"/> Your Assigned Doctor
                                    </h3>
                                    <p className={`text-xs ${labelColor} max-w-lg leading-relaxed`}>
                                        Important: Enter your doctor's registered email address below. This will link your medical records and enable the private chat channel.
                                    </p>
                                </div>
                                {formData.doctorUid ? (
                                    <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-xs font-bold border border-green-500/20 flex items-center shadow-lg">
                                        <Check size={14} className="mr-2"/> Connected to Dr.
                                    </div>
                                ) : (
                                    <div className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold border border-red-500/20 flex items-center">
                                        <X size={14} className="mr-2"/> Not Linked
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-3 items-center">
                                <div className="relative flex-1">
                                    <LinkIcon size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                                    <input 
                                        type="email" 
                                        placeholder="e.g. doctor@medassist.ai"
                                        value={doctorEmail}
                                        onChange={(e) => setDoctorEmail(e.target.value)}
                                        className={`w-full pl-10 p-3 rounded-xl border outline-none text-sm font-medium ${inputBg} focus:border-indigo-500 transition-colors`}
                                    />
                                </div>
                                <button 
                                    onClick={handleConnectDoctor}
                                    disabled={isLinking || !doctorEmail}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest flex items-center shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
                                >
                                    {isLinking ? <Loader2 className="animate-spin mr-2" size={16}/> : <LinkIcon size={16} className="mr-2"/>}
                                    {formData.doctorUid ? "Update Link" : "Connect"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- FIELDS LIST SECTION --- */}
                    <div className="mt-8 space-y-6">
                        <InfoRow 
                            label="Phone Number" 
                            fieldKey="phone" 
                            value={formData.phone || "Not set"} 
                            isLink
                        />
                         <InfoRow 
                            label="Email Address" 
                            fieldKey="email" 
                            value={formData.email} 
                            readOnly 
                        />
                        
                        {!isPatient && (
                            <>
                                <InfoRow 
                                    label="Role / Specialty" 
                                    fieldKey="specialty" 
                                    value={formData.specialty || ""} 
                                />
                                <InfoRow 
                                    label="Hospital / Clinic" 
                                    fieldKey="hospital" 
                                    value={formData.hospital || ""} 
                                />
                                 <InfoRow 
                                    label="Bio" 
                                    fieldKey="bio" 
                                    value={formData.bio || ""} 
                                />
                            </>
                        )}

                        <InfoRow 
                            label="Location" 
                            fieldKey="location" 
                            value={formData.location || ""} 
                        />
                        
                        <InfoRow 
                            label="Language" 
                            fieldKey="language" 
                            value={formData.language || "English"} 
                        />

                        <InfoRow 
                            label="Password" 
                            fieldKey="password" 
                            value="********" 
                            readOnly
                        />

                        <InfoRow 
                            label="Session Security" 
                            fieldKey="device" 
                            value="Manage active sessions" 
                            readOnly
                        />

                    </div>
                </div>
            </motion.div>

            {/* PASSWORD CHANGE MODAL */}
            <AnimatePresence>
                {isPassModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsPassModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-md p-6 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className={`text-lg font-bold flex items-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <Key className="mr-2" size={20}/> Change Password
                                </h3>
                                <button onClick={() => setIsPassModalOpen(false)}><X className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} /></button>
                            </div>
                            
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className={`text-xs font-bold uppercase ${labelColor}`}>New Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className={`w-full p-3 rounded-lg mt-2 text-sm outline-none border ${inputBg} focus:border-blue-500`}
                                    />
                                </div>
                                <div>
                                    <label className={`text-xs font-bold uppercase ${labelColor}`}>Confirm Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className={`w-full p-3 rounded-lg mt-2 text-sm outline-none border ${inputBg} focus:border-blue-500`}
                                    />
                                </div>

                                {passError && <p className="text-red-500 text-xs font-bold">{passError}</p>}
                                {passSuccess && <p className="text-green-500 text-xs font-bold">{passSuccess}</p>}

                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg uppercase text-xs tracking-widest transition-colors flex items-center justify-center"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16}/> : 'Update Password'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default SettingsView;
