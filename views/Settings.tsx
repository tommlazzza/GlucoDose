import React, { useState, useEffect } from 'react';
import { UserSettings, InsulinSegment } from '../types';
import { TRANSLATIONS } from '../constants';
import { Save, Check, User, Moon, Sun, Zap, Ruler, Plus, Trash2, Clock, Download, Upload, RotateCcw, HardDrive, ChevronLeft, Target, FileText } from 'lucide-react';
import { exportAllDataAsPDF, exportAllData, importAllData, clearAllData, getStorageSize } from '../storageUtils';

interface SettingsProps {
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  onBack?: () => void;
}

// Helper Components
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

const InputField = ({ label, value, onChange, isDark, type = "number", placeholder = "" }: { label: string, value: any, onChange: (val: string) => void, isDark: boolean, type?: string, placeholder?: string }) => (
  <div className="flex flex-col gap-2 flex-1">
    <label className={`text-[10px] font-black uppercase ml-1 tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</label>
    <input
      type={type}
      inputMode={type === "number" ? "decimal" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
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
  const [storageSize, setStorageSize] = useState<string>('');
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);

  // Calcola dimensione storage all'avvio
  useEffect(() => {
    setStorageSize(getStorageSize());
  }, []);

  const handleChange = (key: keyof UserSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  // --- LOGICA GESTIONE FASCE ORARIE ---

  const toggleVariableInsulin = () => {
    const isEnabling = !localSettings.variableInsulinEnabled;
    let newSegments = localSettings.insulinSegments;

    if (isEnabling && (!newSegments || newSegments.length === 0)) {
      const baseTarget = localSettings.targetBg || 100;
      newSegments = [
        { startTime: '00:00', endTime: '07:00', isf: localSettings.isf || 30, icr: localSettings.icr || 10, target: baseTarget, labelKey: 'night' },
        { startTime: '07:00', endTime: '13:00', isf: localSettings.isf || 30, icr: localSettings.icr || 10, target: baseTarget, labelKey: 'morning' },
        { startTime: '13:00', endTime: '19:00', isf: localSettings.isf || 30, icr: localSettings.icr || 10, target: baseTarget, labelKey: 'afternoon' },
        { startTime: '19:00', endTime: '23:59', isf: localSettings.isf || 30, icr: localSettings.icr || 10, target: baseTarget, labelKey: 'evening' },
      ];
      handleChange('insulinSegments', newSegments);
    }
    handleChange('variableInsulinEnabled', isEnabling);
  };

  const handleSegmentChange = (index: number, key: keyof InsulinSegment, value: any) => {
    const newSegments = [...localSettings.insulinSegments];
    newSegments[index] = { ...newSegments[index], [key]: value };

    if (key === 'endTime' && index < newSegments.length - 1) {
      newSegments[index + 1].startTime = value;
    }

    if (key === 'startTime' && index > 0) {
      newSegments[index - 1].endTime = value;
    }

    handleChange('insulinSegments', newSegments);
  };

  const handleAddSegment = () => {
    const segments = [...localSettings.insulinSegments];
    const lastIndex = segments.length - 1;
    const lastSegment = segments[lastIndex];

    const [startH, startM] = lastSegment.startTime.split(':').map(Number);
    const endH = 24;
    const endM = 0;

    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;
    const durationMinutes = endTotalMinutes - startTotalMinutes;

    const splitMinutes = startTotalMinutes + Math.floor(durationMinutes / 2);
    const splitH = Math.floor(splitMinutes / 60);
    const splitM = splitMinutes % 60;

    let safeH = splitH >= 23 ? 23 : splitH;
    if (safeH === startH) safeH = safeH + 1;

    const newSplitTime = `${safeH.toString().padStart(2, '0')}:${splitM.toString().padStart(2, '0')}`;

    segments[lastIndex].endTime = newSplitTime;

    const newSegment: InsulinSegment = {
      startTime: newSplitTime,
      endTime: "23:59",
      isf: lastSegment.isf,
      icr: lastSegment.icr,
      target: lastSegment.target,
      labelKey: 'custom'
    };

    segments.push(newSegment);
    handleChange('insulinSegments', segments);
  };

  const handleRemoveSegment = (index: number) => {
    if (localSettings.insulinSegments.length <= 1) return;
    const newSegments = localSettings.insulinSegments.filter((_, i) => i !== index);

    if (index === 0) {
      newSegments[0].startTime = "00:00";
    } else if (index === localSettings.insulinSegments.length - 1) {
      newSegments[newSegments.length - 1].endTime = "23:59";
    } else {
      newSegments[index - 1].endTime = newSegments[index].startTime;
    }

    handleChange('insulinSegments', newSegments);
  };

  const handleSave = () => {
    // Imposta valori di default per TIR se non inseriti
    const finalSettings = {
      ...localSettings,
      minGlucoseTarget: localSettings.minGlucoseTarget ?? 70,
      maxGlucoseTarget: localSettings.maxGlucoseTarget ?? 180,
    };
    onSave(finalSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // --- FUNZIONI BACKUP/RESTORE ---

  const handleExportPDF = async (periodDays: number) => {
    try {
      setShowPeriodDialog(false);
      const result = await exportAllDataAsPDF(periodDays);
      if (result.success) {
        alert('PDF salvato con successo nei tuoi file!');
      }
    } catch (error: any) {
      alert('Errore durante l\'esportazione del PDF: ' + (error.message || error));
      console.error(error);
    }
  };

  const handleExportJSON = async () => {
    try {
      const result = await exportAllData();
      if (result.success) {
        alert('Backup JSON salvato con successo nei tuoi file!');
      }
    } catch (error: any) {
      alert('Errore durante l\'esportazione: ' + (error.message || error));
      console.error(error);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    importAllData(file)
      .then(() => {
        alert('Dati importati con successo! L\'app si ricaricherà.');
        window.location.reload();
      })
      .catch((error) => {
        alert('Errore durante l\'importazione: ' + error.message);
        console.error(error);
      });

    // Reset input per permettere di selezionare lo stesso file di nuovo
    event.target.value = '';
  };

  const handleReset = () => {
    if (window.confirm('ATTENZIONE: Questa azione cancellerà TUTTI i dati salvati (impostazioni, storico, alimenti). Questa azione è IRREVERSIBILE!\n\nSei assolutamente sicuro di voler continuare?')) {
      if (window.confirm('Confermi di voler cancellare TUTTO? Non potrai recuperare i dati!')) {
        clearAllData();
        alert('Dati cancellati. L\'app si ricaricherà.');
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center gap-4 p-6 pt-2 shrink-0 z-20 relative">
        {onBack && (
          <button
            onClick={onBack}
            className={`p-2 rounded-full transition-all active:scale-90 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            <ChevronLeft size={24} className={isDark ? 'text-white' : 'text-textMain'} />
          </button>
        )}
        <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{t.profile}</h2>
      </header>

      {/* CONTENT SCROLLABILE */}
      <div className="flex-1 overflow-y-auto scrolling-touch no-scrollbar px-6 pb-44 min-h-0 w-full">
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-right duration-300">

          <Card title={t.yourName} icon={<User size={20} />} colorClass="bg-blue-100 text-blue-500" isDark={isDark}>
            <InputField label="Nome Utente" value={localSettings.userName} onChange={(val) => handleChange('userName', val)} type="text" placeholder="Il tuo nome" isDark={isDark} />
          </Card>

          {/* CARD RANGE GLICEMICO */}
          <Card title="Range Glicemico" icon={<Target size={20} />} colorClass="bg-green-100 text-green-500" isDark={isDark}>
            <p className="text-[10px] font-bold text-textMuted mb-4 leading-relaxed">
              Imposta i valori min e max per la fascia verde nel grafico glicemico. Tipicamente 70-180 mg/dL.
            </p>
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <label className={`text-[10px] font-black uppercase ml-1 tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>MIN (mg/dL)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={localSettings.minGlucoseTarget ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange('minGlucoseTarget', val === '' ? undefined : parseFloat(val));
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="70"
                  className={`w-full rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-primary transition-all ${isDark ? 'bg-gray-700/50 text-white placeholder:text-gray-500' : 'bg-appBg text-textMain placeholder:text-textMuted'} placeholder:opacity-40`}
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className={`text-[10px] font-black uppercase ml-1 tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>MAX (mg/dL)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={localSettings.maxGlucoseTarget ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange('maxGlucoseTarget', val === '' ? undefined : parseFloat(val));
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="180"
                  className={`w-full rounded-2xl p-4 font-bold outline-none border-2 border-transparent focus:border-primary transition-all ${isDark ? 'bg-gray-700/50 text-white placeholder:text-gray-500' : 'bg-appBg text-textMain placeholder:text-textMuted'} placeholder:opacity-40`}
                />
              </div>
            </div>
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
            <p className="text-[10px] font-bold text-textMuted mb-6 leading-relaxed">{t.variableInsulinDesc}</p>

            {!localSettings.variableInsulinEnabled ? (
              <div className="space-y-4">
                <InputField label="Target Glicemico (mg/dL)" value={localSettings.targetBg} onChange={(val) => handleChange('targetBg', parseFloat(val) || 0)} isDark={isDark} />
                <div className="flex gap-3">
                  <InputField label="ISF (Sensibilità)" value={localSettings.isf} onChange={(val) => handleChange('isf', parseFloat(val) || 0)} isDark={isDark} />
                  <InputField label="ICR (Rapporto)" value={localSettings.icr} onChange={(val) => handleChange('icr', parseFloat(val) || 0)} isDark={isDark} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {localSettings.insulinSegments.map((seg, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === localSettings.insulinSegments.length - 1;

                  return (
                    <div key={idx} className={`p-4 rounded-3xl flex flex-col gap-3 transition-all border ${isDark ? 'bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70 hover:border-gray-500/50' : 'bg-appBg border-gray-200 hover:border-primary/30 hover:shadow-md'}`}>

                      <div className={`flex justify-between items-center pb-2 border-b ${isDark ? 'border-gray-600/30' : 'border-gray-500/10'}`}>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={isDark ? 'text-gray-400' : 'text-textMuted'} />
                          <input
                            type="time"
                            value={seg.startTime}
                            disabled={isFirst}
                            onChange={(e) => handleSegmentChange(idx, 'startTime', e.target.value)}
                            className={`appearance-none bg-transparent font-black text-sm outline-none w-[4.5rem] text-center rounded-lg focus:bg-primary/10 transition-colors ${isFirst ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isDark ? 'text-white' : 'text-textMain'}`}
                            style={{ colorScheme: isDark ? 'dark' : 'light' }}
                          />
                          <span className={`text-xs font-bold ${isDark ? 'text-gray-500' : 'text-textMuted'}`}>➔</span>
                          <input
                            type="time"
                            value={seg.endTime}
                            disabled={isLast}
                            onChange={(e) => handleSegmentChange(idx, 'endTime', e.target.value)}
                            className={`appearance-none bg-transparent font-black text-sm outline-none w-[4.5rem] text-center rounded-lg focus:bg-primary/10 transition-colors ${isLast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isDark ? 'text-white' : 'text-textMain'}`}
                            style={{ colorScheme: isDark ? 'dark' : 'light' }}
                          />
                        </div>

                        {!isLast && localSettings.insulinSegments.length > 1 && (
                          <button onClick={() => handleRemoveSegment(idx)} className={`w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90 ${isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                            <Trash2 size={14} />
                          </button>
                        )}
                        {isLast && localSettings.insulinSegments.length > 1 && (
                          <button onClick={() => handleRemoveSegment(idx)} className={`w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90 ${isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className={`text-[9px] font-black uppercase block text-center mb-1 ${isDark ? 'text-gray-500' : 'text-textMuted'}`}>TARGET</label>
                          <div className={`rounded-xl p-2 ${isDark ? 'bg-gray-800/70' : 'bg-white shadow-sm'}`}>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={seg.target}
                              onChange={(e) => handleSegmentChange(idx, 'target', parseFloat(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className={`w-full bg-transparent font-black text-center text-lg outline-none ${isDark ? 'text-white' : 'text-textMain'}`}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className={`text-[9px] font-black uppercase block text-center mb-1 ${isDark ? 'text-gray-500' : 'text-textMuted'}`}>ISF</label>
                          <div className={`rounded-xl p-2 ${isDark ? 'bg-gray-800/70' : 'bg-white shadow-sm'}`}>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={seg.isf}
                              onChange={(e) => handleSegmentChange(idx, 'isf', parseFloat(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className={`w-full bg-transparent font-black text-center text-lg outline-none ${isDark ? 'text-white' : 'text-textMain'}`}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className={`text-[9px] font-black uppercase block text-center mb-1 ${isDark ? 'text-gray-500' : 'text-textMuted'}`}>ICR</label>
                          <div className={`rounded-xl p-2 ${isDark ? 'bg-gray-800/70' : 'bg-white shadow-sm'}`}>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={seg.icr}
                              onChange={(e) => handleSegmentChange(idx, 'icr', parseFloat(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className={`w-full bg-transparent font-black text-center text-lg outline-none ${isDark ? 'text-white' : 'text-textMain'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={handleAddSegment} className={`w-full py-4 mt-2 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all active:scale-98 ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-800' : 'border-primary/30 text-primary hover:bg-primary/5'}`}>
                  <Plus size={16} strokeWidth={3} /> Nuova Fascia
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

          {/* CARD BACKUP E DATI */}
          <Card title="Backup e Dati" icon={<HardDrive size={20} />} colorClass="bg-green-100 text-green-600" isDark={isDark}>
            <div className="space-y-3">
              {/* Info spazio occupato */}
              <div className={`p-3 rounded-xl flex items-center justify-between ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
                <span className="text-xs font-bold text-textMuted">Spazio occupato</span>
                <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{storageSize}</span>
              </div>

              {/* Esporta PDF */}
              <button
                onClick={() => setShowPeriodDialog(true)}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${isDark ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
              >
                <FileText size={18} strokeWidth={3} />
                Esporta Report PDF
              </button>

              {/* Esporta Backup JSON */}
              <button
                onClick={handleExportJSON}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                <Download size={18} strokeWidth={3} />
                Esporta Backup JSON
              </button>

              {/* Importa Backup */}
              <label className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                <Upload size={18} strokeWidth={3} />
                Importa Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              {/* Reset Completo */}
              <button
                onClick={handleReset}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                <RotateCcw size={18} strokeWidth={3} />
                Reset Completo
              </button>

              <p className="text-[9px] text-textMuted text-center font-bold leading-relaxed pt-2">
                Il PDF è un report visivo, il JSON è il backup completo per il ripristino.
              </p>
            </div>
          </Card>

        </div>
      </div>

      {/* DIALOG SELEZIONE PERIODO PDF */}
      {showPeriodDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setShowPeriodDialog(false)}>
          <div className={`rounded-3xl p-6 max-w-sm w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-black mb-4 ${isDark ? 'text-white' : 'text-textMain'}`}>Periodo Report</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-textMuted'}`}>
              Seleziona il periodo da includere nel report PDF:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleExportPDF(7)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-appBg text-textMain hover:bg-gray-200'}`}
              >
                Ultima Settimana (7 giorni)
              </button>
              <button
                onClick={() => handleExportPDF(30)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-appBg text-textMain hover:bg-gray-200'}`}
              >
                Ultimo Mese (30 giorni)
              </button>
              <button
                onClick={() => handleExportPDF(90)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-appBg text-textMain hover:bg-gray-200'}`}
              >
                Ultimi 3 Mesi
              </button>
              <button
                onClick={() => handleExportPDF(180)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-appBg text-textMain hover:bg-gray-200'}`}
              >
                Ultimi 6 Mesi
              </button>
              <button
                onClick={() => handleExportPDF(365)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-appBg text-textMain hover:bg-gray-200'}`}
              >
                Ultimo Anno
              </button>
              <button
                onClick={() => handleExportPDF(0)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-appBg text-textMain hover:bg-gray-200'}`}
              >
                Tutti i Dati
              </button>
            </div>

            <button
              onClick={() => setShowPeriodDialog(false)}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] right-6 z-40 pointer-events-none">
        <button onClick={handleSave} className={`w-16 h-16 rounded-full font-black shadow-2xl flex items-center justify-center transition-all duration-300 transform active:scale-90 pointer-events-auto ${saved ? 'bg-secondary text-gray-900 shadow-secondary/20' : 'bg-primary text-gray-900 shadow-primary/30'}`}>
          {saved ? <Check size={28} strokeWidth={3} /> : <Save size={28} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
};