import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { FoodLibrary } from './views/FoodLibrary';
import { HistoryView } from './views/History';
import { Settings } from './views/Settings';
import { UserSettings, ViewState, HistoryEntry, FoodItem, InsulinSegment } from './types';
import { DEFAULT_SETTINGS, MOCK_HISTORY, MOCK_FOODS } from './constants';
import { User, Check, Target, Zap, ArrowRight, ChevronLeft, Clock, Plus, Trash2 } from 'lucide-react';
import img_logo from './src/images/app_icon.png';

export default function App() {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('gluco_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [history, setHistory] = useState<HistoryEntry[]>(MOCK_HISTORY);
  const [foods, setFoods] = useState<FoodItem[]>(MOCK_FOODS);

  const [showOnboarding, setShowOnboarding] = useState(settings.userName === 'Nome');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [tempSettings, setTempSettings] = useState<UserSettings>(settings);

  useEffect(() => {
    const bgColor = settings.theme === 'dark' ? '#0f172a' : '#ECF4E8';
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;

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

  const handleLogDose = (units: number, glucose: number, carbs: number, type: 'bolus' | 'basal', recommendedUnits?: number) => {
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      glucose,
      carbs,
      units,
      recommendedUnits,
      type: type,
      mealType: type === 'basal' ? 'Basale' : 'Pasto'
    };
    setHistory(prev => [newEntry, ...prev]);
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
    setSettings(tempSettings);
    setShowOnboarding(false);
  };

  const handleSegmentChange = (index: number, key: keyof InsulinSegment | 'endTime', value: any) => {
    const newSegments = [...tempSettings.insulinSegments];
    newSegments[index] = { ...newSegments[index], [key]: value };
    setTempSettings({ ...tempSettings, insulinSegments: newSegments });
  };

  const handleAddSegment = () => {
    const newSegment: InsulinSegment & { endTime?: string } = {
      startTime: "12:00",
      endTime: "13:00",
      isf: tempSettings.isf || 30,
      icr: tempSettings.icr || 10,
      labelKey: 'custom'
    };
    const newSegments = [...tempSettings.insulinSegments, newSegment].sort((a, b) => {
      const [ha, ma] = a.startTime.split(':').map(Number);
      const [hb, mb] = b.startTime.split(':').map(Number);
      return (ha * 60 + ma) - (hb * 60 + mb);
    });
    setTempSettings({ ...tempSettings, insulinSegments: newSegments });
  };

  const handleRemoveSegment = (index: number) => {
    const newSegments = tempSettings.insulinSegments.filter((_, i) => i !== index);
    setTempSettings({ ...tempSettings, insulinSegments: newSegments });
  };

  const renderOnboardingStep = () => {
    switch (onboardingStep) {
      case 1:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full justify-center px-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6">
              <User size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-textMain mb-2">Benvenuto!</h2>
            <p className="text-textMuted font-medium mb-8 leading-relaxed">Configuriamo GlucoDose. Come ti chiami?</p>
            <input
              type="text"
              value={tempSettings.userName === 'Nome' ? '' : tempSettings.userName}
              onChange={(e) => setTempSettings({ ...tempSettings, userName: e.target.value })}
              placeholder="nome"
              className="w-full bg-appBg border-2 border-transparent focus:border-primary rounded-[1.8rem] p-5 text-lg font-bold text-textMain outline-none text-center transition-all mb-8 placeholder:opacity-30 placeholder:text-textMain"
            />
          </div>
        );
      case 2:
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
                onClick={() => {
                  const newSegments = [
                    { startTime: '06:00', endTime: '12:00', isf: tempSettings.isf || 30, icr: tempSettings.icr || 10, labelKey: 'morning' },
                    { startTime: '12:00', endTime: '18:00', isf: tempSettings.isf || 30, icr: tempSettings.icr || 10, labelKey: 'afternoon' },
                    { startTime: '18:00', endTime: '23:00', isf: tempSettings.isf || 30, icr: tempSettings.icr || 10, labelKey: 'evening' },
                    { startTime: '23:00', endTime: '06:00', isf: tempSettings.isf || 30, icr: tempSettings.icr || 10, labelKey: 'night' },
                  ];
                  setTempSettings({ ...tempSettings, variableInsulinEnabled: true, insulinSegments: newSegments });
                }}
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
      case 3:
        return (
          <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 px-6 pt-4">
            <div className="text-center shrink-0">
              <h2 className="text-2xl font-black text-textMain mb-1">Imposta Fattori</h2>
              <p className="text-textMuted text-[10px] font-bold uppercase tracking-widest mb-4">ISF = Sensibilità | ICR = Rapporto Carbo</p>
            </div>

            <div className="w-full flex-1 overflow-y-auto no-scrollbar flex flex-col mb-4 min-h-0">
              {!tempSettings.variableInsulinEnabled ? (
                <div className="space-y-4 my-auto">
                  <div className="p-5 rounded-[2rem] bg-appBg/50 border border-textMain/5 text-left">
                    <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Sensibilità (ISF)</label>
                    <input
                      type="number"
                      value={tempSettings.isf}
                      onChange={(e) => setTempSettings({ ...tempSettings, isf: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                    />
                  </div>
                  <div className="p-5 rounded-[2rem] bg-appBg/50 border border-textMain/5 text-left">
                    <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Rapporto (ICR)</label>
                    <input
                      type="number"
                      value={tempSettings.icr}
                      onChange={(e) => setTempSettings({ ...tempSettings, icr: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-20">
                  {tempSettings.insulinSegments.map((seg, idx) => (
                    <div key={idx} className="p-3 rounded-2xl flex items-center gap-1.5 bg-appBg/50 border border-textMain/5">
                      <div className="flex flex-col w-[4.5rem] shrink-0">
                        <label className="text-[7px] font-black text-textMuted uppercase mb-1 ml-1">DA</label>
                        <input type="time" value={seg.startTime} onChange={(e) => handleSegmentChange(idx, 'startTime', e.target.value)} className="w-full bg-transparent border-b-2 border-primary/30 focus:border-primary font-bold text-base text-center outline-none p-0 pb-1 text-textMain" />
                      </div>
                      <div className="flex flex-col w-[4.5rem] shrink-0 border-l border-dashed border-gray-300 pl-1.5">
                        <label className="text-[7px] font-black text-textMuted uppercase mb-1 ml-1">A</label>
                        <input type="time" value={(seg as any).endTime || ''} onChange={(e) => handleSegmentChange(idx, 'endTime', e.target.value)} className="w-full bg-transparent border-b-2 border-primary/30 focus:border-primary font-bold text-base text-center outline-none p-0 pb-1 text-textMain" />
                      </div>
                      <div className="flex gap-2 flex-1 justify-center ml-1">
                        <div className="flex flex-col w-12 sm:w-14">
                          <label className="text-[7px] font-black text-textMuted uppercase mb-1 text-center">ISF</label>
                          <input type="number" value={seg.isf} onChange={(e) => handleSegmentChange(idx, 'isf', parseFloat(e.target.value))} className="w-full bg-transparent border-b-2 border-primary/30 focus:border-primary font-bold text-center outline-none text-lg p-0 pb-1 text-textMain" />
                        </div>
                        <div className="flex flex-col w-12 sm:w-14">
                          <label className="text-[7px] font-black text-textMuted uppercase mb-1 text-center">ICR</label>
                          <input type="number" value={seg.icr} onChange={(e) => handleSegmentChange(idx, 'icr', parseFloat(e.target.value))} className="w-full bg-transparent border-b-2 border-primary/30 focus:border-primary font-bold text-center outline-none text-lg p-0 pb-1 text-textMain" />
                        </div>
                      </div>
                      <button onClick={() => handleRemoveSegment(idx)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-100 text-red-500 hover:bg-red-200 active:scale-90 transition-all shrink-0 ml-1">
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddSegment} className="w-full py-4 mt-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all">
                    <Plus size={16} strokeWidth={3} /> Aggiungi Fascia
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full justify-center px-6">
            <div className="w-20 h-20 bg-secondary/30 rounded-full flex items-center justify-center text-secondary mb-6">
              <Target size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-textMain mb-2">Quasi Fatto!</h2>
            <p className="text-textMuted text-sm font-medium mb-8">Ultimi dettagli per il calcolo.</p>
            <div className="w-full space-y-6 mb-10">
              <div className="p-5 rounded-[2rem] bg-appBg/50 border border-textMain/5 text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Target Glicemico (mg/dL)</label>
                <input
                  type="number"
                  value={tempSettings.targetBg}
                  onChange={(e) => setTempSettings({ ...tempSettings, targetBg: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                />
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Arrotondamento Unità</label>
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

  // --- SPLASH SCREEN: Usa percorso pubblico diretto ---
  if (isLoading) {
    return (
      <div className={`fixed inset-0 z-[999] flex flex-col items-center justify-center transition-all duration-700 ${settings.theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#ECF4E8]'}`}>

        <div className="relative mb-8 flex items-center justify-center">
          {/* Aura decorativa dietro */}
          <div className="absolute w-64 h-64 bg-primary/10 blur-[60px] rounded-full animate-pulse scale-150"></div>

          <div className="relative w-44 h-44 z-10 animate-bounce-slow">
            {/* Percorso assoluto che punta alla cartella dist finale */}
            {/*
            <img
              src="/app_icon.png"
              alt="Logo GlucoDose"
              className="w-full h-full object-contain rounded-[2.8rem] shadow-2xl"
              style={{ filter: 'none' }}
              onError={(e) => {
                console.error("ERRORE: Impossibile trovare /app_icon.png");
                // Rimosso bordo rosso, lasciato pulito
              }}
            />
            */}

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

  // ... (Layout e render uguali a prima) ...
  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-white overflow-hidden touch-none font-sans">
        <div className="absolute top-[-10%] right-[-20%] w-96 h-96 rounded-full blur-3xl mix-blend-multiply animate-blob opacity-40 bg-primary/20 pointer-events-none" />
        <div className="absolute top-[20%] left-[-10%] w-72 h-72 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000 opacity-30 bg-secondary/30 pointer-events-none" />
        <div className="pt-[calc(env(safe-area-inset-top)+2rem)] px-8 pb-4 flex justify-center gap-2 z-10 shrink-0">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${onboardingStep === s ? 'w-8 bg-primary' : 'w-2 bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex-1 w-full max-w-md mx-auto relative overflow-hidden flex flex-col">
          {renderOnboardingStep()}
        </div>
        <div className="w-full max-w-md mx-auto px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4 z-20 bg-white/80 backdrop-blur-sm">
          {onboardingStep === 1 && (
            <button
              disabled={!tempSettings.userName.trim() || tempSettings.userName === 'Nome'}
              onClick={nextStep}
              className="w-full py-5 bg-primary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
            >
              Avanti <ArrowRight size={22} />
            </button>
          )}
          {(onboardingStep === 2 || onboardingStep === 3 || onboardingStep === 4) && (
            <div className="flex gap-3 w-full">
              <button onClick={prevStep} className="p-5 bg-gray-100 text-gray-500 rounded-[1.8rem] hover:bg-gray-200 active:scale-95 transition-all"><ChevronLeft size={24} /></button>
              <button
                onClick={onboardingStep === 4 ? finishOnboarding : nextStep}
                className={`flex-1 py-5 font-black rounded-[1.8rem] text-lg shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all ${onboardingStep === 4 ? 'bg-secondary text-gray-900' : 'bg-primary text-gray-900'}`}
              >
                {onboardingStep === 4 ? 'Inizia' : 'Avanti'} {onboardingStep === 4 ? <Check size={22} strokeWidth={3} /> : <ArrowRight size={22} />}
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
        return <Dashboard settings={settings} foods={foods} history={history} onLogDose={handleLogDose} onNavigateSettings={() => setActiveView('settings')} />;
      case 'food':
        return <FoodLibrary foods={foods} onAddFood={handleAddFood} settings={settings} />;
      case 'history':
        return <HistoryView history={history} settings={settings} />;
      case 'settings':
        return <Settings settings={settings} onSave={handleSaveSettings} />;
      default:
        return <Dashboard settings={settings} foods={foods} history={history} onLogDose={handleLogDose} onNavigateSettings={() => setActiveView('settings')} />;
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={setActiveView} settings={settings}>
      {renderView()}
    </Layout>
  );
}