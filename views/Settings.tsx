
import React, { useState } from 'react';
import { UserSettings, InsulinSegment } from '../types';
import { TRANSLATIONS } from '../constants';
import { Save, Check, User, Moon, Sun, Target, Zap, Ruler } from 'lucide-react';

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

  const handleSegmentChange = (index: number, key: keyof InsulinSegment, value: any) => {
    const newSegments = [...localSettings.insulinSegments];
    newSegments[index] = { ...newSegments[index], [key]: value };
    handleChange('insulinSegments', newSegments);
  };

  const handleSave = () => {
    onSave(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Card = ({ children, title, icon, colorClass, extra }: { children: React.ReactNode, title: string, icon: React.ReactNode, colorClass: string, extra?: React.ReactNode }) => (
    <div className={`p-5 rounded-[2rem] shadow-sm transition-all duration-300 border ${isDark ? 'bg-gray-800/50 border-white/5' : 'bg-white border-white/60'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
            {icon}
          </div>
          <p className={`font-bold text-sm uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-textMuted'}`}>{title}</p>
        </div>
        {extra}
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
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-6 pb-48 animate-in slide-in-from-right duration-300">
      <header className="flex items-center gap-4 mb-6 pt-2">
        <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-textMain'}`}>{t.profile}</h2>
      </header>

      <div className="flex flex-col gap-5">
        
        {/* 1. Variable Insulin Settings Table */}
        <Card 
          title={t.variableInsulin} 
          icon={<Zap size={20} />} 
          colorClass="bg-amber-100 text-amber-500"
          extra={
            <button 
              onClick={() => handleChange('variableInsulinEnabled', !localSettings.variableInsulinEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${localSettings.variableInsulinEnabled ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.variableInsulinEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          }
        >
          <p className="text-[10px] font-medium text-textMuted mb-4">{t.variableInsulinDesc}</p>
          
          {!localSettings.variableInsulinEnabled ? (
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
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="py-2 text-[8px] font-black uppercase text-textMuted">{t.time}</th>
                    <th className="py-2 text-[8px] font-black uppercase text-textMuted">{t.isfLabel}</th>
                    <th className="py-2 text-[8px] font-black uppercase text-textMuted">{t.icrLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {localSettings.insulinSegments.map((seg, idx) => (
                    <tr key={idx}>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-primary">{seg.startTime}</span>
                          <span className="text-[8px] font-bold text-textMuted">{(t as any)[seg.labelKey]}</span>
                        </div>
                      </td>
                      <td className="py-2">
                        <input 
                          type="number" 
                          step="0.1"
                          value={seg.isf} 
                          onChange={(e) => handleSegmentChange(idx, 'isf', parseFloat(e.target.value) || 0)}
                          className={`w-14 p-1 rounded-lg text-center font-bold text-xs bg-transparent border-b-2 border-transparent focus:border-primary outline-none ${isDark ? 'text-white' : 'text-textMain'}`}
                        />
                      </td>
                      <td className="py-2">
                        <input 
                          type="number" 
                          step="0.1"
                          value={seg.icr} 
                          onChange={(e) => handleSegmentChange(idx, 'icr', parseFloat(e.target.value) || 0)}
                          className={`w-14 p-1 rounded-lg text-center font-bold text-xs bg-transparent border-b-2 border-transparent focus:border-primary outline-none ${isDark ? 'text-white' : 'text-textMain'}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 2. Target */}
        <Card title="Target Glicemico" icon={<Target size={20} />} colorClass="bg-red-100 text-red-500">
          <InputField 
            label="Target Glicemico (mg/dL)" 
            value={localSettings.targetBg} 
            onChange={(val) => handleChange('targetBg', parseFloat(val) || 0)} 
          />
        </Card>

        {/* 3. Pen Precision */}
        <Card title={t.penPrecision} icon={<Ruler size={20} />} colorClass="bg-primary/20 text-primary">
          <div className={`flex rounded-2xl p-1 ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
             <button onClick={() => handleChange('doseStep', 0.5)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${localSettings.doseStep === 0.5 ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-textMain shadow-sm') : 'text-textMuted'}`}>0.5</button>
             <button onClick={() => handleChange('doseStep', 1.0)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${localSettings.doseStep === 1.0 ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-textMain shadow-sm') : 'text-textMuted'}`}>1.0</button>
          </div>
        </Card>

        {/* 4. Personal Profile */}
        <Card title="Utente" icon={<User size={20} />} colorClass="bg-blue-100 text-blue-500">
          <InputField 
            label={t.yourName} 
            value={localSettings.userName} 
            onChange={(val) => handleChange('userName', val)} 
            type="text"
            placeholder="Esempio: Marco"
          />
        </Card>

        {/* 5. Theme Selection */}
        <Card title="Preferenze App" icon={<Sun size={20} />} colorClass="bg-green-100 text-green-500">
           <div className="space-y-4">
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
