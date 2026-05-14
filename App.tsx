import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { FoodLibrary } from './views/FoodLibrary';
import { HistoryView } from './views/History';
import { Settings } from './views/Settings';
import { UserSettings, ViewState, HistoryEntry, FoodItem, InsulinSegment, SelectedFoodItem } from './types';
import { DEFAULT_SETTINGS, MOCK_HISTORY, MOCK_FOODS, TRANSLATIONS } from './constants';
import { User, Check, Target, Zap, ArrowRight, ChevronLeft, Clock, Plus, Trash2, Globe } from 'lucide-react'
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import img_logo from './assets/icon.png';

export default function App() {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('gluco_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('gluco_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Converti le stringhe timestamp in oggetti Date
      return parsed.map((entry: HistoryEntry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
    }
    return MOCK_HISTORY;
  });

  const [foods, setFoods] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem('gluco_foods');
    return saved ? JSON.parse(saved) : MOCK_FOODS;
  });

  // --- STATO CONDIVISO ---
  const [dashboardGlucose, setDashboardGlucose] = useState<string>(() => {
    const saved = localStorage.getItem('gluco_dashboard_glucose');
    return saved || '';
  });

  const [dashboardFoods, setDashboardFoods] = useState<SelectedFoodItem[]>(() => {
    const saved = localStorage.getItem('gluco_dashboard_foods');
    return saved ? JSON.parse(saved) : [];
  });

  const isNewUser = settings.userName === 'Nome' || settings.userName === 'Name';
  const [showOnboarding, setShowOnboarding] = useState(isNewUser);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [tempSettings, setTempSettings] = useState<UserSettings>(isNewUser ? DEFAULT_SETTINGS : settings);
  const t = TRANSLATIONS[tempSettings.language || settings.language || 'it'];

  useEffect(() => {
    const bgColor = settings.theme === 'dark' ? '#0f172a' : '#ECF4E8';
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;

    const updateStatusBar = async () => {
      try {
        const isAndroid = Capacitor.getPlatform() === 'android';

        if (isAndroid) {
          // TRUCCO: Attiviamo l'overlay (così vediamo l'app sotto)
          // Ma usiamo un colore TRASPARENTE
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setBackgroundColor({ color: '#00000000' }); // 00000000 = Trasparente totale
        } else {
          // iOS rimane com'è
        }

        // Gestione testo scuro/chiaro
        await StatusBar.setStyle({
          style: settings.theme === 'dark' ? Style.Dark : Style.Light
        });
      } catch (e) {
        // Ignora errori
      }
    };
    updateStatusBar();

    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, [settings.theme]);
  useEffect(() => {
    if (showOnboarding || isLoading) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
  }, [showOnboarding, isLoading]);

  useEffect(() => {
    localStorage.setItem('gluco_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('gluco_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('gluco_foods', JSON.stringify(foods));
  }, [foods]);

  useEffect(() => {
    localStorage.setItem('gluco_dashboard_glucose', dashboardGlucose);
  }, [dashboardGlucose]);

  useEffect(() => {
    localStorage.setItem('gluco_dashboard_foods', JSON.stringify(dashboardFoods));
  }, [dashboardFoods]);

  const handleLogDose = (units: number, glucose: number, carbs: number, mealType: string, recommendedUnits?: number, customTimestamp?: Date) => {
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: customTimestamp || new Date(),
      glucose,
      carbs,
      units,
      recommendedUnits,
      type: 'bolus',
      mealType: mealType
    };
    // Aggiungi la nuova entry e riordina per timestamp decrescente (più recente prima)
    setHistory(prev => [...prev, newEntry].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const handleAddFood = (food: Omit<FoodItem, 'id'>) => {
    const newFoodItem: FoodItem = { ...food, id: Date.now().toString(), lastUsed: Date.now() };
    setFoods(prev => [newFoodItem, ...prev]);
  };

  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    setTempSettings(newSettings);
  };

  const nextStep = () => setOnboardingStep(prev => prev + 1);
  const prevStep = () => setOnboardingStep(prev => prev - 1);

  const finishOnboarding = () => {
    // Imposta valori di default per TIR se non inseriti
    const finalSettings = {
      ...tempSettings,
      minGlucoseTarget: tempSettings.minGlucoseTarget ?? 70,
      maxGlucoseTarget: tempSettings.maxGlucoseTarget ?? 180,
    };
    setSettings(finalSettings);
    setShowOnboarding(false);
  };

  // --- LOGICA GESTIONE FASCE ORARIE (LINKED) PER ONBOARDING ---

  const handleSegmentChange = (index: number, key: keyof InsulinSegment, value: any) => {
    const newSegments = [...tempSettings.insulinSegments];

    // Aggiorno il valore richiesto
    newSegments[index] = { ...newSegments[index], [key]: value };

    // LOGICA DI CONCATENAZIONE (Chain)
    // 1. Se modifico FINE di N, aggiorno INIZIO di N+1
    if (key === 'endTime' && index < newSegments.length - 1) {
      newSegments[index + 1].startTime = value;
    }

    // 2. Se modifico INIZIO di N, aggiorno FINE di N-1
    if (key === 'startTime' && index > 0) {
      newSegments[index - 1].endTime = value;
    }

    setTempSettings({ ...tempSettings, insulinSegments: newSegments });
  };

  const handleAddSegment = () => {
    const segments = [...tempSettings.insulinSegments];
    const lastIndex = segments.length - 1;
    const lastSegment = segments[lastIndex];

    // LOGICA SPLIT: Prendi l'ultimo segmento e dividilo a metà
    const [startH, startM] = lastSegment.startTime.split(':').map(Number);
    // Assumiamo che l'ultimo finisca sempre virtualmente a fine giornata per il calcolo
    const endH = 24;
    const endM = 0;

    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;
    const durationMinutes = endTotalMinutes - startTotalMinutes;

    // Punto di metà
    const splitMinutes = startTotalMinutes + Math.floor(durationMinutes / 2);
    const splitH = Math.floor(splitMinutes / 60);
    const splitM = splitMinutes % 60;

    // Formattazione HH:MM con sicurezza (non oltre le 23)
    let safeH = splitH >= 23 ? 23 : splitH;
    if (safeH === startH) safeH = startH + 1; // Evita segmenti di 0 minuti
    const newSplitTime = `${safeH.toString().padStart(2, '0')}:${splitM.toString().padStart(2, '0')}`;

    // 1. Aggiorna la fine dell'attuale ultimo
    segments[lastIndex].endTime = newSplitTime;

    // 2. Crea il nuovo segmento che va dallo split fino a 23:59
    const newSegment: InsulinSegment = {
      startTime: newSplitTime,
      endTime: "23:59",
      isf: lastSegment.isf,
      icr: lastSegment.icr,
      target: lastSegment.target, // Copia il target
      labelKey: 'custom'
    };

    segments.push(newSegment);
    setTempSettings({ ...tempSettings, insulinSegments: segments });
  };

  const handleRemoveSegment = (index: number) => {
    if (tempSettings.insulinSegments.length <= 1) return; // Non cancellare l'ultimo

    const newSegments = tempSettings.insulinSegments.filter((_, i) => i !== index);

    // Ricollegare i buchi
    if (index === 0) {
      // Se ho tolto il primo, il nuovo primo parte da 00:00
      newSegments[0].startTime = "00:00";
    } else if (index === tempSettings.insulinSegments.length - 1) {
      // Se ho tolto l'ultimo, il penultimo diventa ultimo e finisce a 23:59
      newSegments[newSegments.length - 1].endTime = "23:59";
    } else {
      // Se tolgo uno in mezzo, quello PRIMA si allunga fino all'inizio di quello DOPO
      newSegments[index - 1].endTime = newSegments[index].startTime;
    }

    setTempSettings({ ...tempSettings, insulinSegments: newSegments });
  };

  // Init con Target nei segmenti se non c'è
  const initVariableMode = () => {
    const baseTarget = tempSettings.targetBg || 100;
    const newSegments = [
      { startTime: '00:00', endTime: '07:00', isf: tempSettings.isf, icr: tempSettings.icr, target: baseTarget, labelKey: 'night' },
      { startTime: '07:00', endTime: '13:00', isf: tempSettings.isf, icr: tempSettings.icr, target: baseTarget, labelKey: 'morning' },
      { startTime: '13:00', endTime: '19:00', isf: tempSettings.isf, icr: tempSettings.icr, target: baseTarget, labelKey: 'afternoon' },
      { startTime: '19:00', endTime: '23:59', isf: tempSettings.isf, icr: tempSettings.icr, target: baseTarget, labelKey: 'evening' },
    ];
    setTempSettings({ ...tempSettings, variableInsulinEnabled: true, insulinSegments: newSegments });
  };

  const renderOnboardingStep = () => {
    switch (onboardingStep) {
      case 1:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full justify-center px-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6">
              <User size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-textMain mb-2">{t.welcome}</h2>
            <p className="text-textMuted font-medium mb-8 leading-relaxed">{t.onboardingName}</p>
            <input
              type="text"
              value={tempSettings.userName === 'Nome' || tempSettings.userName === 'Name' ? '' : tempSettings.userName}
              onChange={(e) => setTempSettings({ ...tempSettings, userName: e.target.value })}
              onFocus={(e) => e.target.select()}
              placeholder={t.name.toLowerCase()}
              className="w-full bg-appBg border-2 border-transparent focus:border-primary rounded-[1.8rem] p-5 text-lg font-bold text-textMain outline-none text-center transition-all mb-8 placeholder:opacity-30 placeholder:text-textMain"
            />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full justify-center px-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-6">
              <Globe size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-textMain mb-2">{t.language}</h2>
            <p className="text-textMuted font-medium mb-8 leading-relaxed">Choose your language / Scegli la tua lingua</p>

            <div className="flex flex-col gap-3 w-full mb-10">
              <button
                onClick={() => setTempSettings({ ...tempSettings, language: 'it' })}
                className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${tempSettings.language === 'it' ? 'bg-primary/20 border-primary' : 'bg-appBg border-transparent'}`}
              >
                <span className="text-2xl">🇮🇹</span>
                <div className="text-left">
                  <p className="font-black text-sm uppercase text-textMain">Italiano</p>
                </div>
                {tempSettings.language === 'it' && <Check className="ml-auto text-primary" />}
              </button>
              <button
                onClick={() => setTempSettings({ ...tempSettings, language: 'en' })}
                className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${tempSettings.language === 'en' ? 'bg-primary/20 border-primary' : 'bg-appBg border-transparent'}`}
              >
                <span className="text-2xl">🇬🇧</span>
                <div className="text-left">
                  <p className="font-black text-sm uppercase text-textMain">English</p>
                </div>
                {tempSettings.language === 'en' && <Check className="ml-auto text-primary" />}
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full justify-center px-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 mb-6">
              <Zap size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-textMain mb-2">Modalità Parametri</h2>
            <p className="text-textMuted text-sm font-medium mb-8">I tuoi fattori cambiano durante il giorno?</p>

            <div className="flex flex-col gap-3 w-full mb-10">
              <button
                onClick={() => setTempSettings({ ...tempSettings, variableInsulinEnabled: false })}
                className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${!tempSettings.variableInsulinEnabled ? 'bg-primary/20 border-primary' : 'bg-appBg border-transparent'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!tempSettings.variableInsulinEnabled ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}><Zap size={18} /></div>
                <div className="text-left">
                  <p className="font-black text-sm uppercase text-textMain">Parametri Fissi</p>
                  <p className="text-[10px] text-textMain font-bold opacity-70">Usa gli stessi valori tutto il giorno</p>
                </div>
              </button>
              <button
                onClick={initVariableMode}
                className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${tempSettings.variableInsulinEnabled ? 'bg-primary/20 border-primary' : 'bg-appBg border-transparent'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tempSettings.variableInsulinEnabled ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}><Clock size={18} /></div>
                <div className="text-left">
                  <p className="font-black text-sm uppercase text-textMain">Parametri Variabili</p>
                  <p className="text-[10px] text-textMain font-bold opacity-70">Valori diversi per ogni orario</p>
                </div>
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 px-4 pt-4">
            <div className="text-center shrink-0">
              <h2 className="text-2xl font-black text-textMain mb-1">Imposta Fattori</h2>
              <p className="text-textMuted text-[10px] font-bold uppercase tracking-widest mb-4">ISF = Sensibilità | ICR = Rapporto | TGT = Target</p>
            </div>

            <div className="w-full flex-1 overflow-y-auto no-scrollbar flex flex-col mb-4 min-h-0">
              {!tempSettings.variableInsulinEnabled ? (
                // --- MODALITÀ FISSA ---
                <div className="space-y-4 my-auto px-2">
                  <div className="p-5 rounded-[2rem] bg-appBg/50 border border-textMain/5 text-left">
                    <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">{t.targetGlucoseLabel}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={tempSettings.targetBg}
                      onChange={(e) => setTempSettings({ ...tempSettings, targetBg: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                    />
                  </div>
                  <div className="p-5 rounded-[2rem] bg-appBg/50 border border-textMain/5 text-left">
                    <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">{t.sensitivityLabel}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={tempSettings.isf}
                      onChange={(e) => setTempSettings({ ...tempSettings, isf: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                    />
                  </div>
                  <div className="p-5 rounded-[2rem] bg-appBg/50 border border-textMain/5 text-left">
                    <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">{t.ratioLabel}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={tempSettings.icr}
                      onChange={(e) => setTempSettings({ ...tempSettings, icr: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                // --- MODALITÀ VARIABILE (FASCE) ---
                <div className="space-y-3 pb-20 px-1">
                  {tempSettings.insulinSegments.map((seg, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === tempSettings.insulinSegments.length - 1;

                    return (
                      <div key={idx} className="p-4 rounded-3xl flex flex-col gap-3 bg-white/80 border border-gray-200/50 shadow-sm">

                        {/* RIGA ORARI (LINKED) */}
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-gray-500" />
                            {/* INIZIO */}
                            <input
                              type="time"
                              value={seg.startTime}
                              // Bloccato SOLO il primo
                              disabled={isFirst}
                              onChange={(e) => handleSegmentChange(idx, 'startTime', e.target.value)}
                              className={`appearance-none bg-transparent font-black text-sm outline-none w-[4.5rem] text-center rounded-lg focus:bg-primary/10 transition-colors text-textMain ${isFirst ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              style={{ colorScheme: 'light' }}
                            />
                            <span className="text-gray-400 text-xs font-bold">➔</span>
                            {/* FINE */}
                            <input
                              type="time"
                              value={seg.endTime}
                              // Bloccato SOLO l'ultimo
                              disabled={isLast}
                              onChange={(e) => handleSegmentChange(idx, 'endTime', e.target.value)}
                              className={`appearance-none bg-transparent font-black text-sm outline-none w-[4.5rem] text-center rounded-lg focus:bg-primary/10 transition-colors text-textMain ${isLast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              style={{ colorScheme: 'light' }}
                            />
                          </div>

                          {!isLast && tempSettings.insulinSegments.length > 1 && (
                            <button onClick={() => handleRemoveSegment(idx)} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 active:scale-90 transition-all">
                              <Trash2 size={14} />
                            </button>
                          )}
                          {isLast && tempSettings.insulinSegments.length > 1 && (
                            <button onClick={() => handleRemoveSegment(idx)} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 active:scale-90 transition-all">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* RIGA VALORI */}
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase block text-center mb-1">TARGET</label>
                            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={seg.target}
                                onChange={(e) => handleSegmentChange(idx, 'target', parseFloat(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                className="w-full bg-transparent font-black text-center text-lg outline-none text-textMain"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase block text-center mb-1">ISF</label>
                            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={seg.isf}
                                onChange={(e) => handleSegmentChange(idx, 'isf', parseFloat(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                className="w-full bg-transparent font-black text-center text-lg outline-none text-textMain"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase block text-center mb-1">ICR</label>
                            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={seg.icr}
                                onChange={(e) => handleSegmentChange(idx, 'icr', parseFloat(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                className="w-full bg-transparent font-black text-center text-lg outline-none text-textMain"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                  <button onClick={handleAddSegment} className="w-full py-4 mt-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 active:scale-98 transition-all">
                    <Plus size={16} strokeWidth={3} /> Nuova Fascia
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full justify-center px-6">
            <div className="w-20 h-20 bg-secondary/30 rounded-full flex items-center justify-center text-secondary mb-6">
              <Target size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-textMain mb-2">Quasi Fatto!</h2>
            <p className="text-textMuted text-sm font-medium mb-8">Personalizzazione finale.</p>
            <div className="w-full space-y-6 mb-10">
              <div className="text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-3 block">{t.glucoseRangeLabel}</label>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-600 uppercase ml-2 mb-2 block">{t.minLabel}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={tempSettings.minGlucoseTarget ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTempSettings({
                          ...tempSettings,
                          minGlucoseTarget: val === '' ? undefined : parseFloat(val)
                        });
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="70"
                      className="w-full bg-white border-2 border-gray-300 focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-md focus:shadow-lg transition-all placeholder:text-gray-400 placeholder:opacity-50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-600 uppercase ml-2 mb-2 block">{t.maxLabel}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={tempSettings.maxGlucoseTarget ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTempSettings({
                          ...tempSettings,
                          maxGlucoseTarget: val === '' ? undefined : parseFloat(val)
                        });
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="180"
                      className="w-full bg-white border-2 border-gray-300 focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-md focus:shadow-lg transition-all placeholder:text-gray-400 placeholder:opacity-50"
                    />
                  </div>
                </div>
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">{t.insulinUnitLabel}</label>
                <div className="flex bg-appBg p-1.5 rounded-2xl">
                  <button onClick={() => setTempSettings({ ...tempSettings, doseStep: 0.5 })} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tempSettings.doseStep === 0.5 ? 'bg-white shadow-sm text-textMain' : 'text-textMuted'}`}>0.5</button>
                  <button onClick={() => setTempSettings({ ...tempSettings, doseStep: 1.0 })} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tempSettings.doseStep === 1.0 ? 'bg-white shadow-sm text-textMain' : 'text-textMuted'}`}>1.0</button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className={`fixed inset-0 z-[999] flex flex-col items-center justify-center transition-all duration-700 ${settings.theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#ECF4E8]'}`}>
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute w-64 h-64 bg-primary/10 blur-[60px] rounded-full animate-pulse scale-150"></div>
          <div className="relative w-44 h-44 z-10 animate-bounce-slow">
            <img src={img_logo} alt="" />
          </div>
        </div>
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          <h1 className={`text-4xl font-black tracking-tighter mb-3 ${settings.theme === 'dark' ? 'text-white' : 'text-[#1e293b]'}`}>
            GlucoDose
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-white overflow-hidden touch-none font-sans">
        <div className="absolute top-[-10%] right-[-20%] w-96 h-96 rounded-full blur-3xl mix-blend-multiply animate-blob opacity-40 bg-primary/20 pointer-events-none" />
        <div className="absolute top-[20%] left-[-10%] w-72 h-72 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000 opacity-30 bg-secondary/30 pointer-events-none" />
        <div className="pt-[calc(env(safe-area-inset-top)+3rem)] px-8 pb-4 flex justify-center gap-2 z-10 shrink-0">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${onboardingStep === s ? 'w-8 bg-primary' : 'w-2 bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex-1 w-full max-w-md mx-auto relative overflow-hidden flex flex-col">
          {renderOnboardingStep()}
        </div>
        <div className="w-full max-w-md mx-auto px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4 z-20 bg-white/80 backdrop-blur-sm">
          {onboardingStep === 1 && (
            <button
              disabled={!tempSettings.userName.trim() || tempSettings.userName === 'Nome' || tempSettings.userName === 'Name'}
              onClick={nextStep}
              className="w-full py-5 bg-primary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
            >
              Avanti <ArrowRight size={22} />
            </button>
          )}
          {(onboardingStep >= 2 && onboardingStep <= 5) && (
            <div className="flex gap-3 w-full">
              <button onClick={prevStep} className="p-5 bg-gray-100 text-gray-500 rounded-[1.8rem] hover:bg-gray-200 active:scale-95 transition-all"><ChevronLeft size={24} /></button>
              <button
                onClick={onboardingStep === 5 ? finishOnboarding : nextStep}
                className={`flex-1 py-5 font-black rounded-[1.8rem] text-lg shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all ${onboardingStep === 5 ? 'bg-secondary text-gray-900' : 'bg-primary text-gray-900'}`}
              >
                {onboardingStep === 5 ? t.start : t.next} {onboardingStep === 5 ? <Check size={22} strokeWidth={3} /> : <ArrowRight size={22} />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            settings={settings}
            foods={foods}
            history={history}
            onLogDose={handleLogDose}
            onNavigateSettings={() => setActiveView('settings')}
            onNavigateHistory={() => setActiveView('history')}
            glucose={dashboardGlucose}
            setGlucose={setDashboardGlucose}
            selectedFoods={dashboardFoods}
            setSelectedFoods={setDashboardFoods}
          />
        );
      case 'food':
        return <FoodLibrary foods={foods} onAddFood={handleAddFood} settings={settings} />;
      case 'history':
        return <HistoryView history={history} settings={settings} />;
      case 'settings':
        return <Settings settings={settings} onSave={handleSaveSettings} onBack={() => setActiveView('dashboard')} />;
      default:
        return (
          <Dashboard
            settings={settings}
            foods={foods}
            history={history}
            onLogDose={handleLogDose}
            onNavigateSettings={() => setActiveView('settings')}
            onNavigateHistory={() => setActiveView('history')}
            glucose={dashboardGlucose}
            setGlucose={setDashboardGlucose}
            selectedFoods={dashboardFoods}
            setSelectedFoods={setDashboardFoods}
          />
        );
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={setActiveView} settings={settings}>
      {renderView()}
    </Layout>
  );
}