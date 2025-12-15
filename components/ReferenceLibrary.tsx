
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Trash2, Maximize2, Image as ImageIcon, Search, BookOpen, AlertCircle, ZoomIn, ZoomOut, Edit3, Save, RotateCcw, Move, Tag, Loader2, Plus, Filter } from 'lucide-react';
import { ReferenceItem } from '../types';

interface ReferenceLibraryProps {
    isDarkMode: boolean;
}

const ReferenceLibrary: React.FC<ReferenceLibraryProps> = ({ isDarkMode }) => {
    const [items, setItems] = useState<ReferenceItem[]>([]);
    const [selectedImage, setSelectedImage] = useState<ReferenceItem | null>(null);
    
    // Filters
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [selectedTag, setSelectedTag] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isUploading, setIsUploading] = useState(false);
    
    // Viewer States
    const [scale, setScale] = useState(1);
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editCategory, setEditCategory] = useState("");
    
    // Tagging State (In Viewer)
    const [newTagInput, setNewTagInput] = useState("");

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

    // Reset viewer state when opening new image
    useEffect(() => {
        if (selectedImage) {
            setScale(1);
            setIsEditingInfo(false);
            setEditTitle(selectedImage.title);
            setEditCategory(selectedImage.category);
            setNewTagInput("");
        }
    }, [selectedImage]);

    // Derived: Get all unique tags from all items for the filter list
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        items.forEach(item => item.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
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
                    dateAdded: new Date().toISOString(),
                    tags: []
                };

                setItems(prev => [newItem, ...prev]);
                setIsUploading(false);
            };

            reader.readAsDataURL(file);
        }
    };

    // FIXED: Added e.stopPropagation to prevent opening the modal when deleting
    const handleDelete = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        
        if (window.confirm("Are you sure you want to delete this image?")) {
            setItems(prev => prev.filter(item => item.id !== id));
            if (selectedImage?.id === id) setSelectedImage(null);
        }
    };

    const handleUpdateInfo = () => {
        if (!selectedImage) return;
        
        const updatedItem = { 
            ...selectedImage, 
            title: editTitle, 
            category: editCategory as any
        };

        setItems(prev => prev.map(item => item.id === selectedImage.id ? updatedItem : item));
        setSelectedImage(updatedItem);
        setIsEditingInfo(false);
    };

    // --- TAGGING LOGIC ---
    const handleAddTag = () => {
        if (!selectedImage || !newTagInput.trim()) return;
        
        const tag = newTagInput.trim();
        const currentTags = selectedImage.tags || [];
        
        if (!currentTags.includes(tag)) {
            const updatedTags = [...currentTags, tag];
            const updatedItem = { ...selectedImage, tags: updatedTags };
            
            // Update local items state
            setItems(prev => prev.map(item => item.id === selectedImage.id ? updatedItem : item));
            // Update currently viewable image
            setSelectedImage(updatedItem);
        }
        setNewTagInput("");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        if (!selectedImage) return;
        
        const currentTags = selectedImage.tags || [];
        const updatedTags = currentTags.filter(t => t !== tagToRemove);
        const updatedItem = { ...selectedImage, tags: updatedTags };

        setItems(prev => prev.map(item => item.id === selectedImage.id ? updatedItem : item));
        setSelectedImage(updatedItem);
    };

    const filteredItems = items.filter(item => {
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        const matchesTag = selectedTag === 'All' || (item.tags && item.tags.includes(selectedTag));
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
        return matchesCategory && matchesTag && matchesSearch;
    });

    const categories = ['All', 'Interface', 'Research', 'Article', 'Patient Ed'];

    const bgColor = isDarkMode ? "bg-slate-900" : "bg-white";
    const borderColor = isDarkMode ? "border-slate-800" : "border-slate-200";
    const textColor = isDarkMode ? "text-white" : "text-slate-900";
    const subTextColor = isDarkMode ? "text-slate-400" : "text-slate-500";

    return (
        <div className="h-full flex flex-col p-4 md:p-6 gap-6 relative">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-black uppercase tracking-tight flex items-center ${textColor}`}>
                        <BookOpen className="mr-3 text-blue-500" /> Reference Library
                    </h1>
                    <p className={`text-xs ${subTextColor} mt-1`}>
                        Digital repository for medical references, research snippets, and patient education materials.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className={`flex items-center px-3 py-2 rounded-xl border ${borderColor} ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <Search size={14} className={subTextColor} />
                        <input 
                            type="text" 
                            placeholder="Search library..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`ml-2 bg-transparent outline-none text-xs font-bold w-full md:w-40 ${textColor} placeholder-slate-500`}
                        />
                    </div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95"
                    >
                        {isUploading ? <Loader2 className="animate-spin mr-2" size={16}/> : <Upload size={16} className="mr-2" />}
                        Upload
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

            {/* Filter Bar (Categories & Tags) */}
            <div className="flex flex-col gap-2">
                {/* Category Filters */}
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                categoryFilter === cat 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                
                {/* Tag Filters (Only show if tags exist) */}
                {allTags.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        <Filter size={12} className={subTextColor} />
                        <button
                            onClick={() => setSelectedTag('All')}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-all whitespace-nowrap border ${
                                selectedTag === 'All' 
                                ? `${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-200 border-slate-300 text-black'}`
                                : `${isDarkMode ? 'border-slate-800 text-slate-500 hover:text-slate-300' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`
                            }`}
                        >
                            All Tags
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-all whitespace-nowrap border ${
                                    selectedTag === tag
                                    ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                                    : `${isDarkMode ? 'border-slate-800 text-slate-500 hover:text-slate-300' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`
                                }`}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 border-2 border-dashed border-slate-700 rounded-3xl m-2">
                        <ImageIcon size={64} className="mb-4 text-slate-500"/>
                        <p className="font-bold text-sm uppercase tracking-widest">Library Empty</p>
                        <p className="text-xs text-slate-500 mt-2">Upload images to build your knowledge base</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <Search size={48} className="mb-4 text-slate-500"/>
                        <p className="font-bold text-xs uppercase tracking-widest">No items match filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredItems.map((item) => (
                            <motion.div 
                                layout
                                key={item.id}
                                onClick={() => setSelectedImage(item)}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`group relative rounded-2xl overflow-hidden cursor-pointer border ${borderColor} ${bgColor} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 aspect-[4/3]`}
                            >
                                <img 
                                    src={item.imageData} 
                                    alt={item.title} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                />
                                {/* Overlay Content */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <h4 className="text-white font-bold text-xs line-clamp-1 mb-1">{item.title}</h4>
                                    
                                    {/* Tags Preview */}
                                    {item.tags && item.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {item.tags.slice(0, 3).map((t, i) => (
                                                <span key={i} className="text-[8px] bg-blue-600/80 text-white px-1.5 py-0.5 rounded backdrop-blur-md">#{t}</span>
                                            ))}
                                            {item.tags.length > 3 && <span className="text-[8px] text-white opacity-70">+{item.tags.length - 3}</span>}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-auto">
                                        <span className="text-[9px] text-slate-300 uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded backdrop-blur-md">{item.category}</span>
                                        <button 
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors shadow-lg z-20"
                                            title="Delete"
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
            <div className={`p-3 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-amber-900/10 border-amber-500/30 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                <div className="flex items-center gap-3">
                    <AlertCircle size={16} />
                    <span className="text-[10px] font-medium">Local Storage: Images are saved on this device only.</span>
                </div>
                <span className="text-[10px] font-bold">{items.length} Items</span>
            </div>

            {/* PROFESSIONAL IMAGE VIEWER (LIGHTBOX) */}
            <AnimatePresence>
                {selectedImage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
                        
                        {/* Toolbar Top */}
                        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                            <div className="pointer-events-auto flex items-center gap-4">
                                {isEditingInfo ? (
                                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-lg">
                                        <input 
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="bg-transparent text-white text-sm font-bold outline-none px-2 w-40"
                                            placeholder="Title"
                                            autoFocus
                                        />
                                        <select 
                                            value={editCategory}
                                            onChange={(e) => setEditCategory(e.target.value)}
                                            className="bg-slate-800 text-white text-xs p-1 rounded outline-none"
                                        >
                                            {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <button onClick={handleUpdateInfo} className="p-1 bg-green-600 hover:bg-green-500 rounded text-white"><Save size={14}/></button>
                                        <button onClick={() => setIsEditingInfo(false)} className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-white"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <div className="text-white">
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            {selectedImage.title} 
                                            <button onClick={() => setIsEditingInfo(true)} className="opacity-50 hover:opacity-100 transition-opacity"><Edit3 size={14}/></button>
                                        </h2>
                                        <span className="text-xs opacity-60 uppercase tracking-widest">{selectedImage.category} • {new Date(selectedImage.dateAdded).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="pointer-events-auto p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Image Container with Zoom/Pan */}
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move">
                            <motion.div
                                drag
                                dragConstraints={{ left: -500 * scale, right: 500 * scale, top: -500 * scale, bottom: 500 * scale }}
                                dragElastic={0.1}
                                style={{ scale }}
                                className="relative"
                            >
                                <img 
                                    src={selectedImage.imageData} 
                                    alt="Full View" 
                                    className="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl rounded-sm"
                                    draggable={false}
                                />
                            </motion.div>
                        </div>

                        {/* Tags Management Bar (Floating) */}
                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-2 flex flex-col gap-2 min-w-[300px] max-w-[90vw]">
                                <div className="flex flex-wrap gap-1.5 justify-center max-h-[60px] overflow-y-auto custom-scrollbar">
                                    {selectedImage.tags && selectedImage.tags.length > 0 ? (
                                        selectedImage.tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded bg-slate-700 text-white text-[10px] font-bold">
                                                #{tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 hover:text-red-400"><X size={10} /></button>
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-slate-500 italic p-1">No tags added</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 border-t border-slate-700 pt-2">
                                    <Tag size={12} className="text-slate-400 ml-1" />
                                    <input 
                                        type="text" 
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                        placeholder="Add tag..."
                                        className="bg-transparent text-xs text-white outline-none flex-1 placeholder-slate-600"
                                    />
                                    <button onClick={handleAddTag} disabled={!newTagInput.trim()} className="p-1 hover:bg-blue-600 rounded-md text-white transition-colors disabled:opacity-30"><Plus size={14}/></button>
                                </div>
                            </div>
                        </div>

                        {/* Toolbar Bottom */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl z-50">
                            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                                <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 text-white hover:text-blue-400 transition-colors"><ZoomOut size={20} /></button>
                                <span className="text-xs font-bold text-white w-8 text-center">{Math.round(scale * 100)}%</span>
                                <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-2 text-white hover:text-blue-400 transition-colors"><ZoomIn size={20} /></button>
                            </div>
                            <button onClick={() => setScale(1)} className="p-2 text-white hover:text-blue-400 transition-colors" title="Reset View">
                                <RotateCcw size={20} />
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-2"></div>
                            <button onClick={(e) => handleDelete(selectedImage.id, e)} className="p-2 text-red-500 hover:text-red-400 transition-colors" title="Delete">
                                <Trash2 size={20} />
                            </button>
                        </div>

                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReferenceLibrary;
