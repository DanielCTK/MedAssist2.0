import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, Loader2, ShoppingCart, Trash2, Download, Minus, X, Store, Check, Zap, Save, AlertTriangle, Database } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { InventoryItem } from '../types';
import { subscribeToInventory, updateStock, seedInventory, addInventoryItem, SEED_DATA } from '../services/inventoryService';

interface InventoryProps {
    isDarkMode: boolean;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

interface CartItem extends InventoryItem {
    quantity: number;
}

// Fallback data in case import fails to prevent white screen crash
const FALLBACK_DATA: Omit<InventoryItem, 'id'>[] = [
    { name: 'Panadol Extra', category: 'General', price: '150k', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80', stock: 120, badge: 'Pain Relief' },
    { name: 'Insulin Pen', category: 'Device', price: '450k', img: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=300&q=80', stock: 15, badge: 'Diabetes' },
    { name: 'V.Rohto', category: 'Drops', price: '50k', img: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80', stock: 85, badge: 'Eye Care' },
    { name: 'N95 Face Mask', category: 'Protection', price: '25k', img: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=300&q=80', stock: 500, badge: 'PPE' }
];

const Inventory: React.FC<InventoryProps> = ({ isDarkMode, isOpen, setIsOpen }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'shop' | 'cart'>('shop');
  
  // Safe initialization
  const initialData = (SEED_DATA && Array.isArray(SEED_DATA) ? SEED_DATA : FALLBACK_DATA).map((item, index) => ({ 
      ...item, 
      id: `demo-${index}` 
  })) as InventoryItem[];

  const [products, setProducts] = useState<InventoryItem[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Demo Mode State
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Animation States
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const cartControls = useAnimation();

  // Add Item State
  const [isAddMode, setIsAddMode] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
      name: '',
      category: 'General',
      price: '',
      stock: 10,
      img: '',
      badge: 'New'
  });
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Real-time subscription & Fallback Logic
  useEffect(() => {
    // We already have data in 'products' from initial state, so UI is safe.
    // Now we try to fetch real data.
    const unsubscribe = subscribeToInventory(
        (data) => {
            if (data && data.length > 0) {
                setProducts(data);
                setIsDemoMode(false);
            }
            setLoading(false);
        },
        (err) => {
            console.error("Inventory fetch error, using demo data", err);
            setLoading(false);
            // Keep using initialData on error
        }
    );
    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredProducts = useMemo(() => {
      if (!products) return [];
      return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const parsePrice = (priceStr: string): number => {
      if (!priceStr) return 0;
      const clean = priceStr.toLowerCase().replace(/[^0-9k]/g, '');
      if (clean.includes('k')) {
          return parseInt(clean.replace('k', '')) * 1000;
      }
      return parseInt(clean) || 0;
  };

  const totalPrice = useMemo(() => {
      return cart.reduce((total, item) => total + (parsePrice(item.price) * item.quantity), 0);
  }, [cart]);

  // --- ACTIONS ---
  const handleSeedData = async () => {
      setIsSeeding(true);
      await seedInventory();
      setIsSeeding(false);
  };

  const addToCart = async (item: InventoryItem) => {
      if (item.stock <= 0) return;

      // Visual Feedback
      setJustAddedId(item.id);
      setTimeout(() => setJustAddedId(null), 1000);

      cartControls.start({
          scale: [1, 1.2, 0.9, 1.1, 1],
          color: isDarkMode ? ["#ffffff", "#34d399", "#ffffff"] : ["#0f172a", "#059669", "#0f172a"],
          transition: { duration: 0.5 }
      });

      setCart(prev => {
          const existing = prev.find(i => i.id === item.id);
          if (existing) {
              return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
          }
          return [...prev, { ...item, quantity: 1 }];
      });
  };

  const updateQuantity = (id: string, delta: number) => {
      setCart(prev => prev.map(item => {
          if (item.id === id) {
              const newQty = Math.max(1, item.quantity + delta);
              return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  const removeFromCart = (id: string) => {
      setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const handleExportPrescription = () => {
      if (cart.length === 0) return;
      
      const date = new Date().toLocaleString();
      let content = `MEDASSIST CLINIC - PRESCRIPTION\n`;
      content += `Date: ${date}\n`;
      content += `--------------------------------------------------\n`;
      
      cart.forEach(item => {
          const itemTotal = (parsePrice(item.price) * item.quantity).toLocaleString();
          content += `${item.name} x${item.quantity} - ${itemTotal} VND\n`;
      });
      
      content += `--------------------------------------------------\n`;
      content += `TOTAL: ${totalPrice.toLocaleString()} VND\n`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prescription_${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Only update stock if NOT in demo mode
      if (!isDemoMode) {
          cart.forEach(c => {
              const originalItem = products.find(p => p.id === c.id);
              if (originalItem) {
                  updateStock(c.id, Math.max(0, originalItem.stock - c.quantity));
              }
          });
      }
      
      clearCart();
      alert(isDemoMode ? "Prescription exported! (Stock not updated in Demo Mode)" : "Prescription exported and stock updated!");
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newItem.name || !newItem.price) return;
      
      setIsSavingItem(true);
      try {
          await addInventoryItem({
              name: newItem.name,
              category: newItem.category as any || 'General',
              price: newItem.price,
              stock: Number(newItem.stock) || 0,
              img: newItem.img || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80",
              badge: newItem.badge || 'New'
          });
          setIsAddMode(false);
          setNewItem({ name: '', category: 'General', price: '', stock: 10, img: '', badge: 'New' });
      } catch (err) {
          alert("Failed to add item");
      } finally {
          setIsSavingItem(false);
      }
  };

  // Styles
  const bgMain = isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const bgSec = isDarkMode ? "bg-slate-950" : "bg-slate-50";
  const textMain = isDarkMode ? "text-white" : "text-slate-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const inputClass = isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-emerald-500" : "bg-white border-slate-200 text-slate-900 focus:border-emerald-500";

  return (
    <>
        {/* Floating Button - Main Cart Trigger */}
        <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: isOpen ? 0 : 1 }} 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-24 z-50 p-4 rounded-full shadow-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center transition-all border border-white/20`}
        >
            {/* Pulse Ring */}
            <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
            <ShoppingCart size={24} />
            {cart.length > 0 && (
                <motion.span 
                    key={cart.length} // Re-animate on change
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-slate-900 shadow-sm"
                >
                    {cart.reduce((a,b) => a + b.quantity, 0)}
                </motion.span>
            )}
        </motion.button>

        {/* Widget Window */}
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`fixed bottom-20 right-4 md:right-24 z-50 w-[90vw] md:w-[400px] h-[600px] rounded-3xl shadow-2xl border flex flex-col overflow-hidden ${bgMain}`}
                >
                    {/* Header */}
                    <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 flex justify-between items-center text-white shrink-0 shadow-md relative z-10">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                <Store size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider">{t.inventory.title}</h3>
                                <p className="text-[10px] opacity-80 font-medium">Medical Supplies</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                    </div>

                    {/* Animated Tabs */}
                    <div className={`flex border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} shrink-0 relative z-10 ${bgMain}`}>
                        <button 
                            onClick={() => setActiveTab('shop')} 
                            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${activeTab === 'shop' ? 'text-emerald-500' : textSub}`}
                        >
                            <Package size={16} /> Products
                            {activeTab === 'shop' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />}
                        </button>
                        
                        <motion.button 
                            onClick={() => setActiveTab('cart')} 
                            animate={cartControls}
                            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${activeTab === 'cart' ? 'text-emerald-500' : textSub}`}
                        >
                            <ShoppingCart size={16} /> My Cart
                            {cart.length > 0 && (
                                <span className="ml-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] min-w-[18px] text-center shadow-sm">
                                    {cart.reduce((a,b) => a + b.quantity, 0)}
                                </span>
                            )}
                            {activeTab === 'cart' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />}
                        </motion.button>
                    </div>

                    {/* Content Area */}
                    <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 ${bgSec} relative`}>
                        {/* DEMO MODE BANNER */}
                        {isDemoMode && activeTab === 'shop' && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-2`}
                            >
                                <div className="flex items-center gap-2 text-amber-500">
                                    <AlertTriangle size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wide">Preview Mode</span>
                                </div>
                                <p className={`text-[10px] ${textSub}`}>Currently showing demo items. Initialize the database to save changes.</p>
                                <button 
                                    onClick={handleSeedData}
                                    disabled={isSeeding}
                                    className={`w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors`}
                                >
                                    {isSeeding ? <Loader2 className="animate-spin" size={14}/> : <Database size={14}/>} Initialize Database
                                </button>
                            </motion.div>
                        )}

                        <AnimatePresence mode="wait">
                            {activeTab === 'shop' ? (
                                <motion.div 
                                    key="shop"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-4 h-full"
                                >
                                    <div className="flex gap-2 sticky top-0 z-20">
                                        <div className={`flex-1 flex items-center px-4 py-3 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                            <Search size={16} className="text-slate-400 mr-3" />
                                            <input 
                                                type="text" 
                                                placeholder="Search items..." 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className={`bg-transparent outline-none w-full text-xs font-bold ${textMain}`}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => setIsAddMode(true)}
                                            className="px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-colors"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                    
                                    {products.length === 0 ? (
                                        <div className="flex flex-col justify-center items-center p-10 opacity-50">
                                            {loading ? <Loader2 className="animate-spin mb-2"/> : <Package size={40} className="mb-2"/>}
                                            <p className="text-xs font-bold">{loading ? "Loading..." : "No items found"}</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 pb-20">
                                            {filteredProducts.map(item => {
                                                const isJustAdded = justAddedId === item.id;
                                                return (
                                                    <div key={item.id} className={`p-3 rounded-2xl border flex flex-col relative group transition-all duration-300 hover:-translate-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:shadow-[0_5px_20px_-10px_rgba(16,185,129,0.3)]' : 'bg-white border-slate-100 hover:border-emerald-300 hover:shadow-lg'}`}>
                                                        {/* Badge */}
                                                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[8px] font-bold uppercase rounded-md">
                                                            {item.category}
                                                        </span>

                                                        <div className="h-24 rounded-xl mb-3 overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                                                            <img src={item.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                                                            {item.stock < 5 && (
                                                                <div className="absolute inset-0 bg-red-900/40 backdrop-blur-[1px] flex items-center justify-center">
                                                                    <span className="text-white text-[10px] font-black uppercase border border-white px-2 py-1 rounded">Low Stock</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className={`text-xs font-black truncate ${textMain} w-24`} title={item.name}>{item.name}</h4>
                                                            <span className="text-[10px] font-bold text-emerald-500">{item.price}</span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-500 mb-3 font-medium flex items-center">
                                                            <Zap size={8} className="mr-1 text-yellow-500" fill="currentColor"/> {item.stock} left
                                                        </p>
                                                        
                                                        <motion.button 
                                                            onClick={() => addToCart(item)}
                                                            disabled={item.stock <= 0}
                                                            whileTap={{ scale: 0.95 }}
                                                            className={`mt-auto py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all overflow-hidden relative ${
                                                                item.stock <= 0 
                                                                ? 'bg-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed text-slate-500' 
                                                                : isJustAdded
                                                                    ? 'bg-emerald-500 text-white shadow-emerald-500/50 shadow-lg'
                                                                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-black text-slate-600 dark:text-slate-300'
                                                            }`}
                                                        >
                                                            <AnimatePresence mode="wait">
                                                                {isJustAdded ? (
                                                                    <motion.div 
                                                                        key="added"
                                                                        initial={{ y: 20, opacity: 0 }}
                                                                        animate={{ y: 0, opacity: 1 }}
                                                                        exit={{ y: -20, opacity: 0 }}
                                                                        className="flex items-center"
                                                                    >
                                                                        <Check size={12} className="mr-1"/> Added
                                                                    </motion.div>
                                                                ) : (
                                                                    <motion.div 
                                                                        key="add"
                                                                        initial={{ y: 20, opacity: 0 }}
                                                                        animate={{ y: 0, opacity: 1 }}
                                                                        exit={{ y: -20, opacity: 0 }}
                                                                        className="flex items-center"
                                                                    >
                                                                        {item.stock > 0 ? <><Plus size={12}/> Add Stock</> : 'Sold Out'}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.button>

                                                        {/* Flying +1 Particle Effect */}
                                                        <AnimatePresence>
                                                            {isJustAdded && (
                                                                <motion.div
                                                                    initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                                                                    animate={{ opacity: 0, y: -100, x: 20, scale: 1.5 }}
                                                                    exit={{ opacity: 0 }}
                                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                                    className="absolute bottom-10 right-4 z-50 text-emerald-500 font-black text-lg pointer-events-none"
                                                                >
                                                                    +1
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="cart"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col"
                                >
                                    <div className="flex-1 space-y-2 mb-4 overflow-y-auto custom-scrollbar pb-20">
                                        {cart.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                    <ShoppingCart size={32} className="text-slate-400"/>
                                                </div>
                                                <p className="text-xs font-bold uppercase tracking-widest">Your Cart is Empty</p>
                                                <button onClick={() => setActiveTab('shop')} className="mt-4 text-[10px] bg-emerald-600 text-white px-4 py-2 rounded-full font-bold">Go to Shop</button>
                                            </div>
                                        ) : (
                                            cart.map(item => (
                                                <motion.div 
                                                    layout
                                                    key={item.id} 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex items-center p-3 rounded-2xl border group ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                                                >
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mr-3 shrink-0">
                                                        <img src={item.img} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`text-xs font-black ${textMain} truncate`}>{item.name}</h4>
                                                        <p className="text-[10px] text-emerald-500 font-bold">{item.price}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 rounded-lg p-1">
                                                        <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-500 hover:text-red-500 transition-colors shadow-sm"><Minus size={10}/></button>
                                                        <span className={`text-[10px] font-black w-4 text-center ${textMain}`}>{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= item.stock} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-500 hover:text-emerald-500 transition-colors shadow-sm disabled:opacity-30"><Plus size={10}/></button>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                    <div className={`absolute bottom-0 left-0 right-0 p-5 rounded-t-3xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} z-20`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Total Estimated</span>
                                            <span className={`text-xl font-black ${textMain}`}>{totalPrice.toLocaleString()} <span className="text-[10px] align-top text-slate-500">VND</span></span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={clearCart} disabled={cart.length === 0} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 disabled:opacity-50 transition-colors text-slate-500"><Trash2 size={18}/></button>
                                            <button onClick={handleExportPrescription} disabled={cart.length === 0} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-widest rounded-2xl py-4 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 transform active:scale-95">
                                                <Download size={16} className="mr-2"/> Export Prescription
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* --- ADD ITEM MODAL OVERLAY --- */}
                        <AnimatePresence>
                            {isAddMode && (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }}
                                    className={`absolute inset-0 z-30 ${isDarkMode ? 'bg-slate-950/90' : 'bg-white/90'} backdrop-blur-sm flex items-center justify-center p-4`}
                                >
                                    <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${bgMain} relative`}>
                                        <button onClick={() => setIsAddMode(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={18}/></button>
                                        <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Plus className="text-emerald-500"/> Add Product</h3>
                                        
                                        <form onSubmit={handleAddNewItem} className="space-y-3">
                                            <div>
                                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Product Name</label>
                                                <input required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border ${inputClass}`} placeholder="e.g. Paracetamol"/>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Category</label>
                                                    <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})} className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border ${inputClass}`}>
                                                        <option value="General">General</option>
                                                        <option value="Meds">Meds</option>
                                                        <option value="Device">Device</option>
                                                        <option value="Drops">Drops</option>
                                                        <option value="Protection">Protection</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Stock</label>
                                                    <input required type="number" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value)})} className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border ${inputClass}`}/>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Price (e.g. 150k)</label>
                                                    <input required type="text" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border ${inputClass}`} placeholder="50k"/>
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Badge</label>
                                                    <input type="text" value={newItem.badge} onChange={e => setNewItem({...newItem, badge: e.target.value})} className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border ${inputClass}`} placeholder="New"/>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Image URL</label>
                                                <div className="flex gap-2">
                                                    <input type="text" value={newItem.img} onChange={e => setNewItem({...newItem, img: e.target.value})} className={`flex-1 p-2.5 rounded-xl text-xs font-bold outline-none border ${inputClass}`} placeholder="https://..."/>
                                                    {newItem.img && <img src={newItem.img} className="w-9 h-9 rounded-lg object-cover border" alt="Preview" />}
                                                </div>
                                            </div>
                                            
                                            <button disabled={isSavingItem} type="submit" className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                                                {isSavingItem ? <Loader2 className="animate-spin" size={16}/> : <Save className="mr-2" size={16}/>} Save Item
                                            </button>
                                        </form>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
  );
};

export default Inventory;