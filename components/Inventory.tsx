import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, Loader2, ShoppingCart, Trash2, Download, Minus, X, Store, Check, Zap, Save, AlertTriangle, Database, Filter } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { InventoryItem } from '../types';
import { subscribeToInventory, updateStock, seedInventory, addInventoryItem, SEED_DATA } from '../services/inventoryService';

interface InventoryProps {
    isDarkMode: boolean;
    isFullPageView: boolean; // Replaces isOpen/setIsOpen to control view mode
}

interface CartItem extends InventoryItem {
    quantity: number;
}

// Fallback data if SEED_DATA is missing or empty
const FALLBACK_DATA: Omit<InventoryItem, 'id'>[] = [
    { name: 'Panadol Extra', category: 'General', price: '150k', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80', stock: 120, badge: 'Pain Relief' },
    { name: 'Insulin Pen', category: 'Device', price: '450k', img: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=300&q=80', stock: 15, badge: 'Diabetes' },
    { name: 'V.Rohto', category: 'Drops', price: '50k', img: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80', stock: 85, badge: 'Eye Care' },
    { name: 'N95 Face Mask', category: 'Protection', price: '25k', img: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=300&q=80', stock: 500, badge: 'PPE' }
];

const Inventory: React.FC<InventoryProps> = ({ isDarkMode, isFullPageView }) => {
  const { t } = useLanguage();
  
  // Initialize with seed/fallback data immediately
  const initialData = (SEED_DATA && Array.isArray(SEED_DATA) && SEED_DATA.length > 0 ? SEED_DATA : FALLBACK_DATA).map((item, index) => ({ 
      ...item, 
      id: `demo-${index}` 
  })) as InventoryItem[];

  const [products, setProducts] = useState<InventoryItem[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false); // Controls the side drawer
  
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const cartControls = useAnimation();

  // Add Item Modal
  const [isAddMode, setIsAddMode] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
      name: '', category: 'General', price: '', stock: 10, img: '', badge: 'New'
  });
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Real-time Data
  useEffect(() => {
    const unsubscribe = subscribeToInventory(
        (data) => {
            if (data && data.length > 0) {
                setProducts(data);
                setIsDemoMode(false);
            }
            setLoading(false);
        },
        (err) => {
            // Silently fail on permission denied (common if rules are strict) and keep demo data
            if (err?.code !== 'permission-denied' && !err?.message?.includes('insufficient permissions')) {
                console.error("Inventory fetch error", err);
            }
            setLoading(false);
        }
    );
    return () => unsubscribe();
  }, []);

  // Filter Logic
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

  const parsePrice = (priceStr: string): number => {
      if (!priceStr) return 0;
      const clean = priceStr.toLowerCase().replace(/[^0-9k]/g, '');
      if (clean.includes('k')) return parseInt(clean.replace('k', '')) * 1000;
      return parseInt(clean) || 0;
  };

  const totalPrice = useMemo(() => {
      return cart.reduce((total, item) => total + (parsePrice(item.price) * item.quantity), 0);
  }, [cart]);

  // Actions
  const handleSeedData = async () => {
      if (isDemoMode) {
          alert("Cannot seed database in demo mode (permissions restricted).");
          return;
      }
      setIsSeeding(true);
      await seedInventory();
      setIsSeeding(false);
  };

  const addToCart = (item: InventoryItem) => {
      if (item.stock <= 0) return;
      setJustAddedId(item.id);
      setTimeout(() => setJustAddedId(null), 1000);
      cartControls.start({
          scale: [1, 1.2, 0.9, 1.1, 1],
          color: isDarkMode ? ["#ffffff", "#ef4444", "#ffffff"] : ["#0f172a", "#2563eb", "#0f172a"],
          transition: { duration: 0.5 }
      });
      setCart(prev => {
          const existing = prev.find(i => i.id === item.id);
          if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
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

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);

  const handleExportPrescription = () => {
      if (cart.length === 0) return;
      const date = new Date().toLocaleString();
      let content = `MEDASSIST CLINIC - PRESCRIPTION\nDate: ${date}\n----------------------------------\n`;
      cart.forEach(item => {
          content += `${item.name} x${item.quantity} - ${(parsePrice(item.price) * item.quantity).toLocaleString()} VND\n`;
      });
      content += `----------------------------------\nTOTAL: ${totalPrice.toLocaleString()} VND\n`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prescription_${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!isDemoMode) {
          cart.forEach(c => {
              const original = products.find(p => p.id === c.id);
              if (original) updateStock(c.id, Math.max(0, original.stock - c.quantity)).catch(err => console.warn("Stock update failed", err));
          });
      }
      clearCart();
      setIsCartOpen(false);
      alert("Checkout successful!");
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingItem(true);
      try {
          await addInventoryItem({
              ...newItem as any,
              stock: Number(newItem.stock),
              img: newItem.img || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80",
          });
          setIsAddMode(false);
          setNewItem({ name: '', category: 'General', price: '', stock: 10, img: '', badge: 'New' });
      } catch (err) { alert("Failed to add item (Permission Denied)"); } 
      finally { setIsSavingItem(false); }
  };

  // Styles
  const bgMain = isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const textMain = isDarkMode ? "text-white" : "text-slate-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const accentColor = isDarkMode ? "text-emerald-400" : "text-emerald-600";
  const bgAccent = isDarkMode ? "bg-emerald-600" : "bg-emerald-600";
  const inputClass = isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-emerald-500" : "bg-white border-slate-200 text-slate-900 focus:border-emerald-500";

  return (
    <>
        {/* =================================================================================
            1. FULL PAGE PHARMACY INTERFACE
            Renders strictly when route matches 'inventory'
           ================================================================================= */}
        {isFullPageView && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 top-12 md:left-52 z-30 overflow-hidden flex flex-col ${isDarkMode ? 'bg-black' : 'bg-slate-50'}`}
            >
                {/* Header & Filter Bar */}
                <div className={`px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 ${isDarkMode ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-sm border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Store size={20} />
                        </div>
                        <h1 className={`text-xl font-bold uppercase tracking-tight ${textMain}`}>{t.inventory.title}</h1>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto custom-scrollbar">
                        {['All', 'General', 'Meds', 'Device', 'Drops', 'Protection'].map(cat => (
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
                                placeholder={t.inventory.search}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`ml-2 bg-transparent outline-none text-sm font-medium w-full ${textMain}`}
                            />
                        </div>
                        <button onClick={() => setIsAddMode(true)} className={`p-2 rounded-full ${bgAccent} text-white shadow-lg hover:brightness-110`}>
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Product Grid */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Demo Warning */}
                    {isDemoMode && (
                        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="text-amber-500" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-500 uppercase">Preview Mode</h4>
                                    <p className={`text-xs ${textSub}`}>Using local demo data. Backend sync unavailable or restricted.</p>
                                </div>
                            </div>
                            <button onClick={handleSeedData} disabled={true} className="px-4 py-2 bg-amber-500/50 text-white/50 cursor-not-allowed rounded-lg text-xs font-bold uppercase">
                                Initialize DB
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className={`animate-spin ${accentColor}`} size={40}/></div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 opacity-50">
                            <Package size={60} className="mb-4 text-slate-300"/>
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No items found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
                            {filteredProducts.map(item => {
                                const isJustAdded = justAddedId === item.id;
                                return (
                                    <motion.div 
                                        layout
                                        key={item.id}
                                        className={`group relative flex flex-col rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]' : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xl'}`}
                                    >
                                        <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                                            <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            {item.stock < 5 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                                    <span className="px-3 py-1 border border-white text-white text-[10px] font-black uppercase tracking-widest">Low Stock</span>
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-md rounded-md">
                                                <span className="text-[9px] font-bold text-white uppercase tracking-wider">{item.category}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font-bold text-sm ${textMain} line-clamp-1`} title={item.name}>{item.name}</h3>
                                            </div>
                                            <div className="flex justify-between items-end mt-auto">
                                                <div>
                                                    <p className={`text-[10px] font-bold uppercase tracking-wide ${textSub} mb-0.5`}>Stock: {item.stock}</p>
                                                    <p className={`text-lg font-black ${accentColor}`}>{item.price}</p>
                                                </div>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => addToCart(item)}
                                                    disabled={item.stock <= 0}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                                                        item.stock <= 0 
                                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                                                        : isJustAdded 
                                                            ? 'bg-green-500 text-white'
                                                            : `${bgAccent} text-white hover:brightness-110`
                                                    }`}
                                                >
                                                    {isJustAdded ? <Check size={18} /> : <Plus size={18} />}
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

        {/* =================================================================================
            2. GLOBAL CART WIDGET
            Always visible, handles side drawer
           ================================================================================= */}
        
        {/* Floating Trigger Button */}
        <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCartOpen(true)}
            className={`fixed bottom-6 right-24 z-[60] p-4 rounded-full shadow-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center transition-all border border-white/20`}
        >
            <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
            <ShoppingCart size={24} />
            {cart.length > 0 && (
                <motion.span 
                    key={cart.length}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-slate-900 shadow-sm"
                >
                    {cart.reduce((a,b) => a + b.quantity, 0)}
                </motion.span>
            )}
        </motion.button>

        {/* Cart Drawer (Side Modal) */}
        <AnimatePresence>
            {isCartOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`fixed top-0 right-0 bottom-0 z-[80] w-full max-w-md ${isDarkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'} shadow-2xl flex flex-col`}
                    >
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                            <div className="flex items-center gap-3">
                                <ShoppingCart size={20} />
                                <h2 className="font-bold uppercase tracking-widest text-sm">Your Cart</h2>
                            </div>
                            <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-40">
                                    <ShoppingCart size={48} className="mb-4 text-slate-400"/>
                                    <p className="font-bold uppercase tracking-widest text-xs">Cart is empty</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <motion.div layout key={item.id} className={`flex items-center p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                        <img src={item.img} className="w-12 h-12 rounded-xl object-cover mr-3 bg-white" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-xs font-bold truncate ${textMain}`}>{item.name}</h4>
                                            <p className={`text-[10px] font-bold ${accentColor}`}>{item.price}</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-900 rounded-lg p-1">
                                            <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-500 hover:text-red-500 transition-colors"><Minus size={10}/></button>
                                            <span className={`text-[10px] font-black w-4 text-center ${textMain}`}>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= item.stock} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-slate-500 hover:text-emerald-500 transition-colors disabled:opacity-30"><Plus size={10}/></button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className={`p-6 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <span className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Total</span>
                                <span className={`text-xl font-black ${textMain}`}>{totalPrice.toLocaleString()} <span className="text-[10px] text-slate-500">VND</span></span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={clearCart} disabled={cart.length === 0} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={20}/></button>
                                <button onClick={handleExportPrescription} disabled={cart.length === 0} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold uppercase text-xs tracking-widest rounded-xl py-3 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                                    <Download size={16} /> Checkout
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        {/* Add Item Modal (Only visible in Full Page mode via Add button) */}
        <AnimatePresence>
            {isAddMode && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${bgMain} relative`}>
                        <button onClick={() => setIsAddMode(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={18}/></button>
                        <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Plus className="text-emerald-500"/> Add Product</h3>
                        <form onSubmit={handleAddNewItem} className="space-y-3">
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Name</label>
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
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Price</label>
                                    <input required type="text" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border ${inputClass}`} placeholder="50k"/>
                                </div>
                                <div>
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${textSub} block mb-1`}>Image</label>
                                    <input type="text" value={newItem.img} onChange={e => setNewItem({...newItem, img: e.target.value})} className={`w-full p-2.5 rounded-xl text-xs font-bold outline-none border ${inputClass}`} placeholder="URL..."/>
                                </div>
                            </div>
                            <button disabled={isSavingItem} type="submit" className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs rounded-xl shadow-lg flex items-center justify-center">
                                {isSavingItem ? <Loader2 className="animate-spin" size={16}/> : <Save className="mr-2" size={16}/>} Save Item
                            </button>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
  );
};

export default Inventory;