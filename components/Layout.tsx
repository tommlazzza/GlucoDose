
import React from 'react';
import { ViewState, UserSettings } from '../types';
import { Home, Utensils, History } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
  settings: UserSettings;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, settings }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';

  return (
    <div className={`relative min-h-screen font-sans overflow-hidden selection:bg-primary transition-colors duration-500 ${isDark ? 'bg-[#0f172a] text-white' : 'bg-appBg text-textMain'}`}>
      
      {/* Organic Background Blobs */}
      <div className={`absolute top-[-10%] right-[-20%] w-96 h-96 rounded-full blur-3xl mix-blend-multiply animate-blob opacity-70 pointer-events-none ${isDark ? 'bg-primary/10' : 'bg-primary/20'}`} />
      <div className={`absolute top-[20%] left-[-10%] w-72 h-72 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000 opacity-60 pointer-events-none ${isDark ? 'bg-secondary/10' : 'bg-secondary/30'}`} />

      {/* Main Content Area */}
      <main className={`relative z-10 h-screen flex flex-col pb-20 max-w-md mx-auto backdrop-blur-sm shadow-2xl sm:rounded-[3rem] sm:my-8 sm:h-[calc(100vh-4rem)] sm:border transition-all duration-500 ${isDark ? 'bg-gray-900/40 border-white/10' : 'bg-white/30 border-white/50'}`}>
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {children}
        </div>

        {/* Bottom Navigation */}
        <nav className={`no-print absolute bottom-0 left-0 right-0 px-6 py-2 rounded-t-[2rem] shadow-lg grid grid-cols-3 gap-2 z-50 h-20 items-center transition-colors duration-500 ${isDark ? 'bg-gray-800/95 border-t border-white/5' : 'bg-white/95'}`}>
          <NavButton 
            active={activeView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')} 
            icon={<Home size={22} />} 
            label={t.home} 
            isDark={isDark}
          />
          <NavButton 
            active={activeView === 'food'} 
            onClick={() => onNavigate('food')} 
            icon={<Utensils size={22} />} 
            label={t.food} 
            isDark={isDark}
          />
          <NavButton 
            active={activeView === 'history'} 
            onClick={() => onNavigate('history')} 
            icon={<History size={22} />} 
            label={t.history} 
            isDark={isDark}
          />
        </nav>
      </main>
    </div>
  );
};

const NavButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  isDark: boolean;
}> = ({ active, onClick, icon, label, isDark }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-300 w-full rounded-2xl ${active ? (isDark ? 'text-white' : 'text-textMain') : 'text-textMuted'}`}
    >
      <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-secondary -translate-y-1 shadow-sm' : 'bg-transparent'}`}>
        <div className={active ? 'text-gray-900' : ''}>
          {icon}
        </div>
      </div>
      <span className={`text-[10px] font-bold transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );
};
