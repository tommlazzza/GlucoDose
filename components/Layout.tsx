import React from 'react';
import { ViewState, UserSettings } from '../types';
import { Home, Utensils, Activity } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { Capacitor } from '@capacitor/core';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
  settings: UserSettings;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, settings }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';

  // Rilevamento piattaforma
  const isAndroid = Capacitor.getPlatform() === 'android';

  return (
    <div className={`fixed inset-0 flex flex-col font-sans overflow-hidden transition-colors duration-200 ${isDark ? 'bg-[#0f172a] text-white' : 'bg-appBg text-textMain'}`}>

      {/* Sfondo */}
      <div className={`absolute top-[-10%] right-[-20%] w-96 h-96 rounded-full blur-3xl mix-blend-multiply opacity-70 pointer-events-none ${isDark ? 'bg-primary/10' : 'bg-primary/20'}`} />

      {/* --- FORMULA UNIVERSALE PER IL PADDING --- 
          - iOS: Usa sempre 'env' (è preciso al 100% su Apple).
          - Android: Usa 'max(env, 34px)'.
             * Se il telefono ha un notch grande (es. 45px), userà 45px.
             * Se il telefono è vecchio o "buggato" (0px), userà 34px (altezza standard sicura).
      */}
      <main className={`relative z-10 flex-1 flex flex-col w-full h-full min-h-0 ${isAndroid ? 'pt-[max(env(safe-area-inset-top),34px)]' : 'pt-[env(safe-area-inset-top)]'}`}>

        {/* Wrapper Scrollabile */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full relative">
          {children}
        </div>

        {/* Navigazione */}
        <nav className={`no-print px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] rounded-t-[2rem] shadow-lg grid grid-cols-3 gap-2 z-50 shrink-0 h-auto min-h-[5.5rem] items-center transition-all ${isDark ? 'bg-gray-800 border-t border-white/5' : 'bg-white/95'}`}>
          <NavButton active={activeView === 'dashboard'} onClick={() => onNavigate('dashboard')} icon={<Home size={22} />} label={t.home} isDark={isDark} />
          <NavButton active={activeView === 'history'} onClick={() => onNavigate('history')} icon={<Activity size={22} />} label={t.monitoring} isDark={isDark} />
          <NavButton active={activeView === 'food'} onClick={() => onNavigate('food')} icon={<Utensils size={22} />} label={t.food} isDark={isDark} />
        </nav>
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; isDark: boolean; }> = ({ active, onClick, icon, label, isDark }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 h-full w-full ${active ? (isDark ? 'text-primary' : 'text-textMain') : 'text-textMuted'}`}>
    <div className={`p-1.5 rounded-xl transition-all ${active ? (isDark ? 'bg-primary/20 -translate-y-1' : 'bg-secondary -translate-y-1 shadow-sm') : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);