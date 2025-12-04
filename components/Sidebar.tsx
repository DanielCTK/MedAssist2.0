import React from 'react';
import { LayoutDashboard, Eye, Users, Settings, Activity, LogOut, Package, Pill } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isDarkMode: boolean;
  onLogout: () => void;
}

// 🇯🇵 SEIGAIHA PATTERN (Waves)
const SEIGAIHA_PATTERN = `data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.735-5.197-1.503-8.008-2.62C65.507 13.07 59.434 11 50 11c-9.356 0-14.508 1.944-24.364 6.075-3.018 1.265-5.877 2.12-8.495 2.925h4.043zm-4.043 0h-4.043c-2.618-.805-5.477-1.66-8.495-2.925C14.508 12.944 9.356 11 0 11c-1.396 0-2.68.04-3.894.113v.901C-2.738 11.396-1.428 11 0 11c9.434 0 15.507 2.07 25.596 6.38 2.811 1.117 5.498 1.885 8.008 2.62v0zm22.808 0c.816-.312 1.662-.643 2.536-.993C51.522 15.39 57.062 13 65 13c7.856 0 12.553 2.306 21.05 5.823.596.246 1.196.492 1.795.738h6.526c-2.766-.996-5.71-2.028-8.73-3.279C75.32 12.003 68.79 10 60 10c-8.709 0-14.39 1.857-23.957 5.86-3.297 1.38-6.386 2.44-9.288 3.518h1.87v.622h3.226zm-3.226 0h-3.226c-2.902-1.078-5.99-2.138-9.288-3.518C14.39 11.857 8.709 10 0 10c-1.31 0-2.527.042-3.669.12v.925C-2.569 10.42-1.336 10 0 10c8.79 0 15.32 2.003 25.64 6.282 3.02 1.251 5.964 2.283 8.73 3.279v.439zM10 20c.513-.173 1.034-.352 1.562-.536C20.65 16.29 26.696 14 35 14c8.22 0 13.313 2.158 21.902 5.372.696.26 1.4.522 2.112.786h6.81c-3.033-1.258-6.236-2.553-9.5-3.904C46.615 12.257 39.81 10 30 10c-9.728 0-15.545 2.112-25.337 6.136-3.568 1.467-6.903 2.603-10.027 3.738h3.904zm-3.904 0H2.192c-3.124-1.135-6.46-2.271-10.027-3.738C-15.545 12.112-9.728 10 0 10c.032 0 .064 0 .096.001v.946L0 11c9.81 0 16.615 2.257 26.324 6.254 3.264 1.35 6.467 2.646 9.5 3.904v-1.158H6.096zM100 20c-3.298-1.302-6.666-2.618-10.158-4.053C79.79 11.808 72.88 9 60 9c-12.756 0-18.706 2.656-29.214 6.78-3.834 1.505-7.394 2.686-10.702 3.86h4.154c3.435-1.22 7.025-2.42 10.87-3.93C45.39 11.66 51.104 9 60 9c9.408 0 15.204 2.062 25.076 6.117 3.784 1.554 7.426 3.016 10.924 4.35V20zM0 9c.148 0 .294.002.441.005v.952c-.146-.003-.293-.005-.441-.005-12.88 0-19.79 2.808-29.842 6.947-3.492 1.435-6.86 2.75-10.158 4.053v.526h14.924c3.498-1.334 7.14-2.796 10.924-4.35C-4.204 11.062 1.592 9 11 9c8.896 0 14.61 2.66 24.91 6.71 3.845 1.51 7.435 2.71 10.87 3.93h-4.154c-3.308-1.174-6.868-2.355-10.702-3.86C21.416 11.656 15.466 9 2.716 9z' fill='%239C92AC' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E`;

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isDarkMode, onLogout }) => {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { id: 'patients', label: t.sidebar.patients, icon: Users },
    { id: 'diagnosis', label: t.sidebar.diagnosis, icon: Eye },
    { id: 'inventory', label: t.sidebar.pharmacy, icon: Package }, // Added back
    { id: 'history', label: t.sidebar.insights, icon: Activity },
  ];

  // Compact width w-52 instead of w-64
  const baseClasses = isDarkMode 
    ? "bg-black text-white border-slate-800" 
    : "bg-white text-slate-800 border-slate-200 shadow-xl";

  return (
    <div className={`w-52 flex flex-col h-screen fixed left-0 top-0 border-r z-30 transition-colors duration-500 ${baseClasses}`}>
      {/* Brand Header - Compact Padding */}
      <div className={`p-5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center space-x-2.5 mb-1">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-black italic transition-colors text-sm ${isDarkMode ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-blue-600 shadow-lg shadow-blue-200'}`}>
            +
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            MedAssist
          </h1>
        </div>
      </div>

      {/* Menu - Smaller text and padding */}
      <nav className="flex-1 px-3 py-4 space-y-1 relative z-10">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          
          let buttonClasses = `w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 font-medium text-xs group `;
          
          if (active) {
            buttonClasses += isDarkMode 
                ? "bg-red-600 text-white shadow-[0_4px_20px_rgba(220,38,38,0.4)]" 
                : "bg-blue-600 text-white shadow-lg shadow-blue-200";
          } else {
            buttonClasses += isDarkMode
                ? "text-slate-400 hover:bg-slate-900 hover:text-red-500"
                : "text-slate-500 hover:bg-blue-50 hover:text-blue-600";
          }

          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={buttonClasses}
            >
              <Icon size={16} className={`${active ? 'text-white' : ''} transition-transform group-hover:scale-110`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      {/* 🇯🇵 Empty Space Decoration: Seigaiha Pattern */}
      <div 
        className="flex-1 w-full opacity-30" 
        style={{
            backgroundImage: `url("${SEIGAIHA_PATTERN}")`,
            backgroundPosition: 'bottom center',
            backgroundRepeat: 'repeat',
            backgroundSize: '200%'
        }}
      />

      {/* Footer - Compact */}
      <div className={`p-4 border-t relative z-10 ${isDarkMode ? 'border-slate-800 bg-black' : 'border-slate-100 bg-white'}`}>
        <button 
          onClick={() => setView('settings')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group ${currentView === 'settings' ? (isDarkMode ? 'text-white bg-slate-900' : 'text-slate-900 bg-slate-100') : (isDarkMode ? 'text-slate-500 hover:text-white hover:bg-slate-900' : 'text-slate-500 hover:text-slate-900')}`}
        >
          <Settings size={16} className={`group-hover:rotate-90 transition-transform ${currentView === 'settings' ? (isDarkMode ? 'text-red-500' : 'text-blue-500') : ''}`} />
          <span className="font-bold text-[10px] uppercase tracking-wider">{t.sidebar.settings}</span>
        </button>
        
        <button 
            onClick={onLogout}
            className={`w-full flex items-center space-x-3 px-3 py-2 mt-1 rounded-lg transition-colors group ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-900/30' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
        >
          <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
          <span className="font-bold text-[10px] uppercase tracking-wider">{t.sidebar.logout}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;