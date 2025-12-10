
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Trash2, Maximize2, Image as ImageIcon, Search, BookOpen, AlertCircle } from 'lucide-react';
import { ReferenceItem } from '../types';

interface ReferenceLibraryProps {
    isDarkMode: boolean;
}

const ReferenceLibrary: React.FC<ReferenceLibraryProps> = ({ isDarkMode }) => {
    const [items, setItems] = useState<ReferenceItem[]>([]);
    const [selectedImage, setSelectedImage] = useState<ReferenceItem | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load from LocalStorage on mount
    useEffect(() => {
        const savedItems = localStorage.getItem('medassist_references');
        if (savedItems) {
            try {
                setItems(JSON.parse(savedItems));
            } catch (e) {
                console.error("Failed to load references", e);
            }
        }
    }, []);

    // Save to LocalStorage whenever items change
    useEffect(() => {
        localStorage.setItem('medassist_references', JSON.stringify(items));
    }, [items]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                
                const newItem: ReferenceItem = {
                    id: Date.now().toString(),
                    title: file.name.split('.')[0],
                    category: 'Interface', // Default
                    imageData: base64,
                    dateAdded: new Date().toISOString()
                };

                setItems(prev => [newItem, ...prev]);
                setIsUploading(false);
            };

            reader.readAsDataURL(file);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Remove this image from library?")) {
            setItems(prev => prev.filter(item => item.id !== id));
            if (selectedImage?.id === id) setSelectedImage(null);
        }
    };

    const filteredItems = categoryFilter === 'All' 
        ? items 
        : items.filter(item => item.category === categoryFilter);

    const categories = ['All', 'Interface', 'Research', 'Article'];

    const bgColor = isDarkMode ? "bg-slate-900" : "bg-white";
    const borderColor = isDarkMode ? "border-slate-800" : "border-slate-200";
    const textColor = isDarkMode ? "text-white" : "text-slate-900";

    return (
        <div className="h-full flex flex-col p-4 md:p-6 gap-6 relative">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-black uppercase tracking-tight flex items-center ${textColor}`}>
                        <BookOpen className="mr-3 text-blue-500" /> Reference Library
                    </h1>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                        Store and view design references, articles, and screenshots locally.
                    </p>
                </div>

                <div className="flex gap-2 items-center">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95"
                    >
                        {isUploading ? "Processing..." : <><Upload size={16} className="mr-2" /> Upload Image</>}
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            categoryFilter === cat 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 border-2 border-dashed border-slate-700 rounded-3xl">
                        <ImageIcon size={64} className="mb-4 text-slate-500"/>
                        <p className="font-bold text-sm uppercase tracking-widest">Library Empty</p>
                        <p className="text-xs text-slate-500 mt-2">Upload images to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredItems.map((item) => (
                            <motion.div 
                                layout
                                key={item.id}
                                onClick={() => setSelectedImage(item)}
                                className={`group relative rounded-2xl overflow-hidden cursor-pointer border ${borderColor} ${bgColor} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 aspect-[3/4]`}
                            >
                                <img 
                                    src={item.imageData} 
                                    alt={item.title} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <h4 className="text-white font-bold text-xs line-clamp-1">{item.title}</h4>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[9px] text-slate-300 uppercase tracking-wider">{item.category}</span>
                                        <button 
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Storage Warning */}
            <div className={`p-3 rounded-xl border flex items-center gap-3 ${isDarkMode ? 'bg-amber-900/10 border-amber-500/30 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                <AlertCircle size={16} />
                <span className="text-[10px] font-medium">Images are stored locally in your browser. Clearing cache will remove them.</span>
            </div>

            {/* Lightbox / Full Screen Viewer */}
            <AnimatePresence>
                {selectedImage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedImage(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-7xl w-full max-h-[90vh] flex flex-col items-center justify-center"
                        >
                            <img 
                                src={selectedImage.imageData} 
                                alt="Full View" 
                                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" 
                            />
                            <div className="mt-4 flex gap-4">
                                <button 
                                    onClick={() => setSelectedImage(null)}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-xs uppercase tracking-widest border border-white/20 transition-colors backdrop-blur-md"
                                >
                                    Close Viewer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReferenceLibrary;
