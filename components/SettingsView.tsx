import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { updateUserProfile, uploadUserImage } from '../services/userService';
import { Save, Loader2, Camera, MapPin, Edit2, Upload, Trash2, LogOut, Check, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsViewProps {
    userProfile: UserProfile | null;
    isDarkMode: boolean;
    onProfileUpdate: (newProfile: UserProfile) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ userProfile, isDarkMode, onProfileUpdate }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<UserProfile | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Upload states
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    
    const [editingField, setEditingField] = useState<string | null>(null);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userProfile) {
            setFormData({ ...userProfile });
        }
    }, [userProfile]);

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
            // Optionally show toast error here
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangeLocal = (key: keyof UserProfile, value: string) => {
        if (!formData) return;
        setFormData({ ...formData, [key]: value });
    };

    // --- ROBUST IMAGE UPLOAD HANDLER ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        if (!formData || !e.target.files || !e.target.files[0]) return;
        
        const file = e.target.files[0];
        const isAvatar = type === 'avatar';
        
        // 1. Instant Optimistic Preview (Browser Blob)
        const previewUrl = URL.createObjectURL(file);
        
        // Update local state immediately so user sees the change
        const optimisticProfile = { 
            ...formData, 
            [isAvatar ? 'photoURL' : 'bannerURL']: previewUrl 
        };
        setFormData(optimisticProfile);
        
        if (isAvatar) setIsUploadingAvatar(true);
        else setIsUploadingBanner(true);

        try {
            // 2. Upload (Cloudinary -> Fallback to Base64)
            // This function handles resizing and timeouts internally
            const finalUrl = await uploadUserImage(formData.uid, file, type);
            
            // 3. Persist to Firestore
            const field = isAvatar ? 'photoURL' : 'bannerURL';
            await updateUserProfile(formData.uid, { [field]: finalUrl });
            
            // 4. Update Global State with permanent URL
            const finalProfile = { ...formData, [field]: finalUrl };
            setFormData(finalProfile);
            onProfileUpdate(finalProfile);
            
        } catch (error) {
            console.error("Critical upload error:", error);
            // We keep the optimistic URL or revert if strictly necessary. 
            // In this case, we keep it so the UI doesn't flash broken.
        } finally {
            // Always turn off loading spinner
            if (isAvatar) setIsUploadingAvatar(false);
            else setIsUploadingBanner(false);
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
            <div className={`flex flex-col md:flex-row md:items-center justify-between py-6 border-b ${borderClass} last:border-0 group`}>
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
                            
                            {!readOnly && (
                                <button 
                                    onClick={() => setEditingField(fieldKey)}
                                    className={`text-xs font-bold uppercase ${linkColor} opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0`}
                                >
                                    Edit
                                </button>
                            )}
                            
                            {fieldKey === 'device' && (
                                <button className={`text-xs font-bold uppercase ${linkColor} ml-4 shrink-0`}>
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
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-xl border ${borderClass} ${containerClass}`}
            >
                {/* --- BANNER SECTION --- */}
                <div className="relative h-48 w-full bg-slate-200 group/banner">
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
                                <div className="w-full h-full rounded-xl overflow-hidden relative">
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
                                <button className="text-red-500 hover:text-red-600">Remove</button>
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
                                    {formData.specialty || "Medical Staff"} @ {formData.hospital || "General Hospital"}
                                </span>
                                <span className={`hidden md:inline ${labelColor}`}>•</span>
                                <span className={`flex items-center ${labelColor}`}>
                                    <MapPin size={14} className="mr-1" />
                                    {formData.location || "Location not set"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* --- FIELDS LIST SECTION --- */}
                    <div className="mt-8">
                        <InfoRow 
                            label="Personal Meeting ID" 
                            fieldKey="phone" 
                            value={formData.phone || "Not set"} 
                            isLink
                        />
                         <InfoRow 
                            label="Email" 
                            fieldKey="email" 
                            value={formData.email} 
                            readOnly 
                        />
                         <InfoRow 
                            label="Role / Specialty" 
                            fieldKey="specialty" 
                            value={formData.specialty || ""} 
                        />
                        <InfoRow 
                            label="Hospital" 
                            fieldKey="hospital" 
                            value={formData.hospital || ""} 
                        />
                        <InfoRow 
                            label="Location" 
                            fieldKey="location" 
                            value={formData.location || ""} 
                        />
                         <InfoRow 
                            label="Bio" 
                            fieldKey="bio" 
                            value={formData.bio || ""} 
                        />
                        <InfoRow 
                            label="Language" 
                            fieldKey="language" 
                            value={formData.language || "English"} 
                        />

                        {/* Note: Subscription section has been completely removed as requested */}

                        <div className={`flex flex-col md:flex-row md:items-center justify-between py-6 border-b ${borderClass} last:border-0 group`}>
                            <div className="md:w-1/3 mb-2 md:mb-0">
                                <span className={`text-sm font-bold ${labelColor}`}>Password</span>
                            </div>
                            <div className="md:w-2/3 flex items-center justify-between">
                                <span className={`text-sm font-medium ${valueColor}`}>••••••••••</span>
                                <button className={`text-xs font-bold uppercase ${linkColor} opacity-0 group-hover:opacity-100 transition-opacity ml-4`}>Change</button>
                            </div>
                        </div>

                        <div className={`flex flex-col md:flex-row md:items-center justify-between py-6 border-b ${borderClass} last:border-0 group`}>
                            <div className="md:w-1/3 mb-2 md:mb-0">
                                <span className={`text-sm font-bold ${labelColor}`}>Device</span>
                            </div>
                            <div className="md:w-2/3 flex items-center justify-between">
                                <span className={`text-xs font-bold uppercase ${linkColor} cursor-pointer hover:text-red-500 transition-colors`}>Sign Out From All Devices</span>
                            </div>
                        </div>

                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Simple Icon component missing in import fix
const X = ({ size }: { size: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export default SettingsView;