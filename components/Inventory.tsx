import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Tag, Package, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { InventoryItem } from '../types';
import { subscribeToInventory, updateStock, seedInventory } from '../services/inventoryService';

interface InventoryProps {
    isDarkMode: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ isDarkMode }) => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToInventory(
        (data) => {
            setProducts(data);
            setLoading(false);
        },
        (err) => {
            console.error(err);
            if (err.code === 'permission-denied') {
                setError("Permission Denied: Update Firestore Rules.");
            }
            setLoading(false);
        }
    );
    return () => unsubscribe();
  }, []);

  // Simple handler to simulate adding stock (real database update)
  const handleAddStock = async (id: string, currentStock: number) => {
      try {
          await updateStock(id, currentStock + 10);
      } catch (err) {
          alert("Failed to update stock");
      }
  };

  const handleSeed = async () => {
      setLoading(true);
      await seedInventory();
      setLoading(false);
  }
  
  // Styles
  const cardBg = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm";
  const textMain = isDarkMode ? "text-white" : "text-slate-900";
  const searchBg = isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const themeBtn = isDarkMode ? "bg-red-600 text-white shadow-lg shadow-red-500/30" : "bg-blue-600 text-white shadow-lg shadow-blue-500/30";
  const themeHover = isDarkMode ? "hover:bg-red-600" : "hover:bg-blue-600";
  const themeBadge = isDarkMode ? "bg-red-600" : "bg-blue-600";

  const filterLabels = [t.inventory.filters.all, t.inventory.filters.meds, t.inventory.filters.device, t.inventory.filters.ppe];

  if (error) {
      return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-2">
            <div>
                <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-lg font-bold flex items-center ${textMain}`}
                >
                    {t.inventory.title} 
                    {loading && <Loader2 className="ml-2 animate-spin" size={16}/>}
                </motion.h1>
            </div>
            
            <div className={`relative w-full md:w-64 flex items-center px-2.5 py-1.5 rounded-full border ${searchBg}`}>
                <Search size={14} className="text-slate-500 mr-2" />
                <input 
                    type="text" 
                    placeholder={t.inventory.search} 
                    className="bg-transparent outline-none w-full text-[10px] text-slate-500"
                />
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
            {filterLabels.map((filter, idx) => (
                <motion.button 
                    key={filter} 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                        idx === 0 
                        ? themeBtn 
                        : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {filter}
                </motion.button>
            ))}
        </div>

        {/* Empty State / Seed Button */}
        {!loading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-70">
                <Package size={48} className="mb-4 text-slate-500" />
                <p className="mb-4 text-xs font-bold uppercase text-slate-500">Inventory Empty</p>
                <button 
                    onClick={handleSeed}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center ${cardBg} hover:brightness-110`}
                >
                    <RefreshCw size={14} className="mr-2"/> Load Demo Data
                </button>
            </div>
        )}

        {/* Grid - 5 columns on large screens to save space */}
        <motion.div 
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-8"
        >
            {products.map((item, idx) => (
                <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ 
                        y: -3, 
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 300, damping: 15 },
                        boxShadow: "0 5px 10px -3px rgba(0, 0, 0, 0.2)"
                    }}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer ${cardBg}`}
                >
                    {/* Image Area - Reduced Height h-24 */}
                    <div className="h-24 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <motion.img 
                            whileHover={{ scale: 1.15 }}
                            transition={{ duration: 0.5 }}
                            src={item.img} 
                            alt={item.name} 
                            className="w-full h-full object-cover" 
                        />
                        <div className="absolute top-1.5 right-1.5 px-1 py-0.5 bg-white/20 backdrop-blur-md rounded text-[8px] font-bold text-white border border-white/30 uppercase tracking-wider">
                            {item.category}
                        </div>
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        
                        <div className="absolute bottom-1.5 left-2 text-white">
                            <h3 className="text-xs font-bold shadow-black drop-shadow-md truncate">{item.name}</h3>
                            <div className="flex items-center space-x-2 mt-0">
                                <span className="text-[9px] font-medium text-green-400">● {item.price}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-2">
                        <div className="flex justify-between items-center mb-2">
                            <div className={`flex items-center space-x-1 text-[9px] font-bold ${item.stock < 20 ? 'text-red-500' : 'text-slate-500'}`}>
                                <Package size={10} />
                                <span>{item.stock}</span>
                            </div>
                            <span className="text-[8px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                {item.badge}
                            </span>
                        </div>

                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => { e.stopPropagation(); handleAddStock(item.id, item.stock); }}
                            className={`w-full py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] ${themeHover} hover:text-white transition-colors flex items-center justify-center`}
                        >
                            <Plus size={12} className="mr-1" /> {t.inventory.add} Stock
                        </motion.button>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    </div>
  );
};

export default Inventory;