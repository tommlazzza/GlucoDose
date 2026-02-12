
import React, { useState } from 'react';
import { UserSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { Save, Check, User, Globe, Moon, Sun, Activity, Target, Zap, Ruler } from 'lucide-react';

interface SettingsProps {
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saved, setSaved] = useState(false);

  const handleChange = (key: keyof UserSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    onSave(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Card = ({ children, title, icon, colorClass }: { children: React.ReactNode, title: string, icon: React.ReactNode, colorClass: string }) => (
    <div className={`p-5 rounded-[2rem] shadow-sm transition-all duration-300 border ${isDark ? 'bg-gray-800/50 border-white/5' : 'bg-white border-white/60'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        <p className={`font-bold text-sm uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-textMuted'}`}>{title}</p>
      </div>
      {children}
    </div>
  );

  const InputField = ({ label, value, onChange, type = "number", placeholder = "" }: { label: string, value: any, onChange: (val: string) => void, type?: string, placeholder?: string }) => (
    <div className="flex flex-col gap-1.5 flex-1">
      <label className={`text-[10px] font-black uppercase ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-primary transition-all ${isDark ? 'bg-gray-700/50 text-white' : 'bg-appBg text-textMain'}`}
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
      <header className="flex items-center gap-4 mb-6 pt-2">
        <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-textMain'}`}>{t.profile}</h2>
      </header>

      <div className="flex flex-col gap-5 pb-24 overflow-y-auto no-scrollbar">
        
        {/* 1. Medical Parameters */}
        <Card title="Parametri Medici" icon={<Activity size={20} />} colorClass="bg-red-100 text-red-500">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <InputField 
                label="ISF (Sensibilità)" 
                value={localSettings.isf} 
                onChange={(val) => handleChange('isf', parseFloat(val) || 0)} 
              />
              <InputField 
                label="ICR (Rapporto)" 
                value={localSettings.icr} 
                onChange={(val) => handleChange('icr', parseFloat(val) || 0)} 
              />
            </div>
            <InputField 
              label="Target Glicemico (mg/dL)" 
              value={localSettings.targetBg} 
              onChange={(val) => handleChange('targetBg', parseFloat(val) || 0)} 
            />
          </div>
        </Card>

        {/* 2. Pen Precision */}
        <Card title={t.penPrecision} icon={<Ruler size={20} />} colorClass="bg-primary/20 text-primary">
          <div className={`flex rounded-2xl p-1 ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
             <button onClick={() => handleChange('doseStep', 0.5)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${localSettings.doseStep === 0.5 ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-textMain shadow-sm') : 'text-textMuted'}`}>0.5</button>
             <button onClick={() => handleChange('doseStep', 1.0)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${localSettings.doseStep === 1.0 ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-textMain shadow-sm') : 'text-textMuted'}`}>1.0</button>
          </div>
        </Card>

        {/* 3. Personal Profile */}
        <Card title="Utente" icon={<User size={20} />} colorClass="bg-blue-100 text-blue-500">
          <InputField 
            label={t.yourName} 
            value={localSettings.userName} 
            onChange={(val) => handleChange('userName', val)} 
            type="text"
            placeholder="Esempio: Marco"
          />
        </Card>

        {/* 4. Language & Theme */}
        <Card title="Preferenze App" icon={<Globe size={20} />} colorClass="bg-green-100 text-green-500">
           <div className="space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase ml-2 mb-1.5 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.language}</label>
                <div className={`flex rounded-2xl p-1 ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
                  <button onClick={() => handleChange('language', 'it')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${localSettings.language === 'it' ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-textMain shadow-sm') : 'text-textMuted'}`}>IT</button>
                  <button onClick={() => handleChange('language', 'en')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${localSettings.language === 'en' ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-textMain shadow-sm') : 'text-textMuted'}`}>EN</button>
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase ml-2 mb-1.5 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.theme}</label>
                <div className={`flex rounded-2xl p-1 ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
                  <button onClick={() => handleChange('theme', 'light')} className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${localSettings.theme === 'light' ? 'bg-white text-textMain shadow-sm' : 'text-textMuted'}`}><Sun size={16} /> {t.light}</button>
                  <button onClick={() => handleChange('theme', 'dark')} className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${localSettings.theme === 'dark' ? 'bg-gray-600 text-white shadow-sm' : 'text-textMuted'}`}><Moon size={16} /> {t.dark}</button>
                </div>
              </div>
           </div>
        </Card>
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-6 max-w-md mx-auto z-40">
        <button 
          onClick={handleSave} 
          className={`w-full py-5 rounded-[2rem] font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] ${saved ? 'bg-secondary text-gray-900' : 'bg-primary text-gray-900'}`}
        >
          {saved ? <Check size={20} strokeWidth={3} /> : <Save size={20} strokeWidth={2.5} />}
          {t.saveProfile}
        </button>
      </div>
    </div>
  );
};
