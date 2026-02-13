import React, { useState } from 'react';
import { UserSettings, InsulinSegment } from '../types';
import { TRANSLATIONS } from '../constants';
import { Save, Check, User, Moon, Sun, Target, Zap, Ruler, Plus, Trash2 } from 'lucide-react';

interface SettingsProps {
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  onBack?: () => void;
}

// 1. Componente Card
const Card = ({ children, title, icon, colorClass, extra, isDark }: { children: React.ReactNode, title: string, icon: React.ReactNode, colorClass: string, extra?: React.ReactNode, isDark: boolean }) => (
  <div className={`p-5 rounded-[2rem] shadow-sm transition-all duration-300 border mb-4 ${isDark ? 'bg-gray-800/40 border-white/5' : 'bg-white border-transparent'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass} bg-opacity-20`}>
          {React.cloneElement(icon as React.ReactElement, { className: colorClass.split(' ')[1] })}
        </div>
        <p className={`font-black text-xs uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-textMuted'}`}>{title}</p>
      </div>
      {extra}
    </div>
    {children}
  </div>
);

// 2. Componente InputField
const InputField = ({ label, value, onChange, isDark, type = "number", placeholder = "" }: { label: string, value: any, onChange: (val: string) => void, isDark: boolean, type?: string, placeholder?: string }) => (
  <div className="flex flex-col gap-2 flex-1">
    <label className={`text-[10px] font-black uppercase ml-1 tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-primary transition-all ${isDark ? 'bg-gray-700/50 text-white' : 'bg-appBg text-textMain'}`}
    />
  </div>
);

export const Settings: React.FC<SettingsProps> = ({ settings, onSave, onBack }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saved, setSaved] = useState(false);

  const handleChange = (key: keyof UserSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  // Attiva/Disattiva Insulina Variabile con Default Fasce CORRETTE
  const toggleVariableInsulin = () => {
    const isEnabling = !localSettings.variableInsulinEnabled;
    let newSegments = localSettings.insulinSegments;

    // FORZA il caricamento delle 4 fasce richieste quando si abilita
    if (isEnabling) {
      newSegments = [
        { startTime: '06:00', endTime: '12:00', isf: localSettings.isf || 30, icr: localSettings.icr || 10, labelKey: 'morning' },
        { startTime: '12:00', endTime: '18:00', isf: localSettings.isf || 30, icr: localSettings.icr || 10, labelKey: 'afternoon' },
        { startTime: '18:00', endTime: '23:00', isf: localSettings.isf || 30, icr: localSettings.icr || 10, labelKey: 'evening' },
        { startTime: '23:00', endTime: '06:00', isf: localSettings.isf || 30, icr: localSettings.icr || 10, labelKey: 'night' },
      ];
      handleChange('insulinSegments', newSegments);
    }

    handleChange('variableInsulinEnabled', isEnabling);
  };

  const handleSegmentChange = (index: number, key: keyof InsulinSegment | 'endTime', value: any) => {
    const newSegments = [...localSettings.insulinSegments];
    newSegments[index] = { ...newSegments[index], [key]: value };
    handleChange('insulinSegments', newSegments);
  };

  const handleAddSegment = () => {
    const newSegment: InsulinSegment & { endTime?: string } = {
      startTime: "12:00",
      endTime: "13:00",
      isf: localSettings.isf || 30,
      icr: localSettings.icr || 10,
      labelKey: 'custom'
    };
    const newSegments = [...localSettings.insulinSegments, newSegment].sort((a, b) => {
      const [ha, ma] = a.startTime.split(':').map(Number);
      const [hb, mb] = b.startTime.split(':').map(Number);
      return (ha * 60 + ma) - (hb * 60 + mb);
    });
    handleChange('insulinSegments', newSegments);
  };

  const handleRemoveSegment = (index: number) => {
    const newSegments = localSettings.insulinSegments.filter((_, i) => i !== index);
    handleChange('insulinSegments', newSegments);
  };

  const handleSave = () => {
    onSave(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <header className="flex items-center gap-4 p-6 pt-2 shrink-0 z-20 relative">
        <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{t.profile}</h2>
      </header>

      <div className="flex-1 overflow-y-auto scrolling-touch no-scrollbar px-6 pb-44 min-h-0 w-full">
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-right duration-300">

          <Card title={t.yourName} icon={<User size={20} />} colorClass="bg-blue-100 text-blue-500" isDark={isDark}>
            <InputField label="Nome Utente" value={localSettings.userName} onChange={(val) => handleChange('userName', val)} type="text" placeholder="Il tuo nome" isDark={isDark} />
          </Card>

          <Card title="Target Glicemico" icon={<Target size={20} />} colorClass="bg-red-100 text-red-500" isDark={isDark}>
            <InputField label="Target (mg/dL)" value={localSettings.targetBg} onChange={(val) => handleChange('targetBg', parseFloat(val) || 0)} isDark={isDark} />
          </Card>

          <Card
            title={t.variableInsulin}
            icon={<Zap size={20} />}
            colorClass="bg-amber-100 text-amber-500"
            isDark={isDark}
            extra={
              <button
                onClick={toggleVariableInsulin}
                className={`w-12 h-7 rounded-full transition-all relative ${localSettings.variableInsulinEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${localSettings.variableInsulinEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            }
          >
            <p className="text-[10px] font-bold text-textMuted mb-4 leading-relaxed">{t.variableInsulinDesc}</p>

            {!localSettings.variableInsulinEnabled ? (
              <div className="flex gap-3">
                <InputField label="ISF (Sensibilità)" value={localSettings.isf} onChange={(val) => handleChange('isf', parseFloat(val) || 0)} isDark={isDark} />
                <InputField label="ICR (Rapporto)" value={localSettings.icr} onChange={(val) => handleChange('icr', parseFloat(val) || 0)} isDark={isDark} />
              </div>
            ) : (
              <div className="space-y-3">
                {localSettings.insulinSegments.map((seg, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl flex items-center gap-1.5 ${isDark ? 'bg-gray-700/30' : 'bg-appBg'}`}>
                    {/* INIZIO */}
                    <div className="flex flex-col w-[4.5rem] shrink-0">
                      <label className="text-[7px] font-black text-textMuted uppercase mb-1 ml-1">DA</label>
                      <input type="time" value={seg.startTime} onChange={(e) => handleSegmentChange(idx, 'startTime', e.target.value)} className={`w-full bg-transparent border-b-2 border-primary/30 focus:border-primary font-bold text-base text-center outline-none p-0 pb-1 ${isDark ? 'text-white' : 'text-textMain'}`} />
                    </div>
                    {/* FINE */}
                    <div className="flex flex-col w-[4.5rem] shrink-0 border-l border-dashed border-gray-300 pl-1.5">
                      <label className="text-[7px] font-black text-textMuted uppercase mb-1 ml-1">A</label>
                      <input type="time" value={(seg as any).endTime || ''} onChange={(e) => handleSegmentChange(idx, 'endTime', e.target.value)} className={`w-full bg-transparent border-b-2 border-primary/30 focus:border-primary font-bold text-base text-center outline-none p-0 pb-1 ${isDark ? 'text-white' : 'text-textMain'}`} />
                    </div>
                    {/* ISF & ICR */}
                    <div className="flex gap-2 flex-1 justify-center ml-1">
                      <div className="flex flex-col w-12 sm:w-14">
                        <label className="text-[7px] font-black text-textMuted uppercase mb-1 text-center">ISF</label>
                        <input type="number" value={seg.isf} onChange={(e) => handleSegmentChange(idx, 'isf', parseFloat(e.target.value))} className={`w-full bg-transparent border-b-2 border-primary/30 focus:border-primary font-bold text-center outline-none text-lg p-0 pb-1 ${isDark ? 'text-white' : 'text-textMain'}`} />
                      </div>
                      <div className="flex flex-col w-12 sm:w-14">
                        <label className="text-[7px] font-black text-textMuted uppercase mb-1 text-center">ICR</label>
                        <input type="number" value={seg.icr} onChange={(e) => handleSegmentChange(idx, 'icr', parseFloat(e.target.value))} className={`w-full bg-transparent border-b-2 border-primary/30 focus:border-primary font-bold text-center outline-none text-lg p-0 pb-1 ${isDark ? 'text-white' : 'text-textMain'}`} />
                      </div>
                    </div>
                    {/* ELIMINA */}
                    <button onClick={() => handleRemoveSegment(idx)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-100 text-red-500 hover:bg-red-200 active:scale-90 transition-all shrink-0 ml-1">
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
                <button onClick={handleAddSegment} className={`w-full py-4 mt-2 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-800' : 'border-gray-300 text-gray-400 hover:bg-gray-50'}`}>
                  <Plus size={16} strokeWidth={3} /> Aggiungi Fascia Oraria
                </button>
              </div>
            )}
          </Card>

          <Card title={t.penPrecision} icon={<Ruler size={20} />} colorClass="bg-primary/20 text-primary" isDark={isDark}>
            <div className={`flex rounded-2xl p-1.5 ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
              <button onClick={() => handleChange('doseStep', 0.5)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${localSettings.doseStep === 0.5 ? (isDark ? 'bg-gray-600 text-white shadow-sm' : 'bg-white text-textMain shadow-sm') : 'text-textMuted'}`}>0.5 Unit</button>
              <button onClick={() => handleChange('doseStep', 1.0)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${localSettings.doseStep === 1.0 ? (isDark ? 'bg-gray-600 text-white shadow-sm' : 'bg-white text-textMain shadow-sm') : 'text-textMuted'}`}>1.0 Unit</button>
            </div>
          </Card>

          <Card title="Aspetto" icon={<Sun size={20} />} colorClass="bg-purple-100 text-purple-500" isDark={isDark}>
            <div className={`flex rounded-2xl p-1.5 ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
              <button onClick={() => handleChange('theme', 'light')} className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${localSettings.theme === 'light' ? 'bg-white text-textMain shadow-sm' : 'text-textMuted'}`}><Sun size={14} /> {t.light}</button>
              <button onClick={() => handleChange('theme', 'dark')} className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${localSettings.theme === 'dark' ? 'bg-gray-600 text-white shadow-sm' : 'text-textMuted'}`}><Moon size={14} /> {t.dark}</button>
            </div>
          </Card>

        </div>
      </div>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] left-0 right-0 px-6 max-w-md mx-auto z-40">
        <button onClick={handleSave} className={`w-full py-5 rounded-[2.2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 transform active:scale-[0.98] ${saved ? 'bg-secondary text-gray-900 shadow-secondary/20' : 'bg-primary text-gray-900 shadow-primary/30'}`}>
          {saved ? <Check size={22} strokeWidth={3} /> : <Save size={22} strokeWidth={2.5} />}
          {saved ? t.saved?.toUpperCase() || 'SALVATO' : t.saveProfile.toUpperCase()}
        </button>
      </div>
    </div>
  );
};