
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, Loader2, FileText, Trash2, Download, Minus, X, Check, ClipboardList, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { InventoryItem } from '../types';
import { subscribeToInventory, updateStock, addInventoryItem, SEED_DATA } from '../services/inventoryService';

interface InventoryProps {
    isDarkMode: boolean;
    isFullPageView: boolean; 
}

interface PrescriptionItem extends InventoryItem {
    quantity: number;
    dosage: string; // NEW
}

// Fallback data
const FALLBACK_DATA: Omit<InventoryItem, 'id'>[] = [
    { name: 'Panadol Extra', category: 'General', price: '150k', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80', stock: 120, badge: 'Pain Relief' },
    { name: 'Insulin Pen', category: 'Device', price: '450k', img: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=300&q=80', stock: 15, badge: 'Diabetes' },
    { name: 'V.Rohto', category: 'Drops', price: '50k', img: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80', stock: 85, badge: 'Eye Care' },
    { name: 'N95 Face Mask', category: 'Protection', price: '25k', img: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=300&q=80', stock: 500, badge: 'PPE' }
];

const Inventory: React.FC<InventoryProps> = ({ isDarkMode, isFullPageView }) => {
  const { t } = useLanguage();
  
  const initialData = (SEED_DATA && Array.isArray(SEED_DATA) && SEED_DATA.length > 0 ? SEED_DATA : FALLBACK_DATA).map((item, index) => ({ 
      ...item, 
      id: `demo-${index}` 
  })) as InventoryItem[];

  const [products, setProducts] = useState<InventoryItem[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [cart, setCart] = useState<PrescriptionItem[]>([]); // Renamed logic to prescription
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false); 
  
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const cartControls = useAnimation();

  // Real-time Data
  useEffect(() => {
    const unsubscribe = subscribeToInventory(
        (data) => {
            if (data && data.length > 0) setProducts(data);
            setLoading(false);
        },
        (err) => {
            setLoading(false);
        }
    );
    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
      let filtered = products;
      if (activeCategory !== 'All') {
          filtered = filtered.filter(p => p.category === activeCategory);
      }
      if (searchTerm) {
          filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return filtered;
  }, [products, searchTerm, activeCategory]);

  const addToPrescription = (item: InventoryItem) => {
      if (item.stock <= 0) return;
      setJustAddedId(item.id);
      setTimeout(() => setJustAddedId(null), 1000);
      cartControls.start({ scale: [1, 1.2, 1] });
      setCart(prev => {
          const existing = prev.find(i => i.id === item.id);
          if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
          return [...prev, { ...item, quantity: 1, dosage: '1 tablet twice daily' }];
      });
  };

  const updateQuantity = (id: string, delta: number) => {
      setCart(prev => prev.map(item => {
          if (item.id === id) {
              return { ...item, quantity: Math.max(1, item.quantity + delta) };
          }
          return item;
      }));
  };

  const updateDosage = (id: string, text: string) => {
      setCart(prev => prev.map(item => item.id === id ? { ...item, dosage: text } : item));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);

  const handleIssuePrescription = () => {
      if (cart.length === 0) return;
      const date = new Date().toLocaleString();
      let content = `MEDASSIST CLINIC - PRESCRIPTION\nDate: ${date}\nDoctor: Dr. [Name]\n----------------------------------\n`;
      cart.forEach(item => {
          content += `- ${item.name} (Qty: ${item.quantity})\n  Dosage: ${item.dosage}\n`;
      });
      content += `----------------------------------\nSigned electronically by MedAssist System.\n`;
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prescription_${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Update stock
      cart.forEach(c => {
          const original = products.find(p => p.id === c.id);
          if (original) updateStock(c.id, Math.max(0, original.stock - c.quantity)).catch(err => console.warn("Stock update failed", err));
      });
      
      clearCart();
      setIsPrescriptionOpen(false);
      alert("Prescription issued and saved!");
  };

  // Styles
  const bgMain = isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const textMain = isDarkMode ? "text-white" : "text-slate-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const accentColor = isDarkMode ? "text-emerald-400" : "text-emerald-600";
  const bgAccent = isDarkMode ? "bg-emerald-600" : "bg-emerald-600";

  return (
    <>
        {isFullPageView && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 top-12 left-0 bottom-16 md:bottom-0 md:left-52 z-30 overflow-hidden flex flex-col ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}
            >
                <div className={`px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 ${isDarkMode ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-sm border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                            <ClipboardList size={20} />
                        </div>
                        <h1 className={`text-lg md:text-xl font-bold uppercase tracking-tight ${textMain}`}>Prescription Pad</h1>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto custom-scrollbar">
                        {['All', 'General', 'Meds', 'Device', 'Drops'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                    activeCategory === cat 
                                    ? `${bgAccent} text-white shadow-lg` 
                                    : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100'} border border-transparent`
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className={`flex items-center px-4 py-2 rounded-full border flex-1 md:w-64 ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <Search size={14} className={textSub} />
                            <input 
                                type="text" 
                                placeholder="Search medication..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`ml-2 bg-transparent outline-none text-sm font-medium w-full ${textMain}`}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24">
                    {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className={`animate-spin ${accentColor}`} size={40}/></div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 opacity-50">
                            <Package size={60} className="mb-4 text-slate-300"/>
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No items found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {filteredProducts.map(item => {
                                const isJustAdded = justAddedId === item.id;
                                return (
                                    <motion.div 
                                        layout
                                        key={item.id}
                                        className={`group relative flex flex-col rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xl'}`}
                                    >
                                        <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                                            <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-md rounded-md">
                                                <span className="text-[9px] font-bold text-white uppercase tracking-wider">{item.category}</span>
                                            </div>
                                        </div>

                                        <div className="p-3 md:p-4 flex flex-col flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font-bold text-xs md:text-sm ${textMain} line-clamp-1`} title={item.name}>{item.name}</h3>
                                            </div>
                                            <div className="flex justify-between items-end mt-auto">
                                                <div>
                                                    <p className={`text-[9px] font-bold uppercase tracking-wide ${textSub} mb-0.5`}>Stock: {item.stock}</p>
                                                </div>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => addToPrescription(item)}
                                                    disabled={item.stock <= 0}
                                                    className={`px-4 py-1.5 rounded-full flex items-center justify-center text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                                        item.stock <= 0 
                                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                                                        : isJustAdded 
                                                            ? 'bg-green-500 text-white'
                                                            : `${bgAccent} text-white hover:brightness-110`
                                                    }`}
                                                >
                                                    {isJustAdded ? <Check size={12} className="mr-1"/> : <Plus size={12} className="mr-1"/>}
                                                    {isJustAdded ? 'Added' : 'Prescribe'}
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        )}

        {/* Floating Prescription Button */}
        <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsPrescriptionOpen(true)}
            className={`fixed bottom-36 right-4 md:bottom-6 md:right-24 z-[60] p-3 md:p-4 rounded-full shadow-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center transition-all border border-white/20`}
        >
            <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
            <FileText size={20} className="md:w-6 md:h-6" />
            {cart.length > 0 && (
                <motion.span 
                    key={cart.length}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-red-600 rounded-full text-[9px] md:text-[10px] font-bold flex items-center justify-center border-2 border-slate-900 shadow-sm"
                >
                    {cart.length}
                </motion.span>
            )}
        </motion.button>

        {/* Prescription Drawer */}
        <AnimatePresence>
            {isPrescriptionOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsPrescriptionOpen(false)}
                        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`fixed top-0 right-0 bottom-0 z-[80] w-full max-w-md ${isDarkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'} shadow-2xl flex flex-col`}
                    >
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                            <div className="flex items-center gap-3">
                                <FileText size={20} />
                                <h2 className="font-bold uppercase tracking-widest text-sm">Prescription Pad</h2>
                            </div>
                            <button onClick={() => setIsPrescriptionOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-40">
                                    <ClipboardList size={48} className="mb-4 text-slate-400"/>
                                    <p className="font-bold uppercase tracking-widest text-xs">No items prescribed</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <motion.div layout key={item.id} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex items-center mb-2">
                                            <div className="flex-1">
                                                <h4 className={`text-xs font-bold ${textMain}`}>{item.name}</h4>
                                                <p className={`text-[9px] uppercase font-bold text-slate-500`}>Stock: {item.stock}</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-900 rounded-lg p-1">
                                                <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-500 hover:text-red-500 transition-colors"><Minus size={10}/></button>
                                                <span className={`text-[10px] font-black w-4 text-center ${textMain}`}>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= item.stock} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-500 hover:text-emerald-500 transition-colors disabled:opacity-30"><Plus size={10}/></button>
                                            </div>
                                        </div>
                                        <input 
                                            value={item.dosage}
                                            onChange={(e) => updateDosage(item.id, e.target.value)}
                                            placeholder="Dosage instructions (e.g. 1 tab after meals)"
                                            className={`w-full p-2 text-xs rounded border outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                        />
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className={`p-6 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                            <div className="flex gap-3">
                                <button onClick={clearCart} disabled={cart.length === 0} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={20}/></button>
                                <button onClick={handleIssuePrescription} disabled={cart.length === 0} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold uppercase text-xs tracking-widest rounded-xl py-3 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                                    <Check size={16} /> Issue & Sign
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    </>
  );
};

export default Inventory;
