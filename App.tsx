
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { FoodLibrary } from './views/FoodLibrary';
import { HistoryView } from './views/History';
import { Settings } from './views/Settings';
import { UserSettings, ViewState, HistoryEntry, FoodItem, InsulinSegment } from './types';
import { DEFAULT_SETTINGS, MOCK_HISTORY, MOCK_FOODS, TRANSLATIONS } from './constants';
import { User, Check, Target, Zap, ArrowRight, ChevronLeft, Clock } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('gluco_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [history, setHistory] = useState<HistoryEntry[]>(MOCK_HISTORY);
  const [foods, setFoods] = useState<FoodItem[]>(MOCK_FOODS);
  
  const [showOnboarding, setShowOnboarding] = useState(settings.userName === 'Nome');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [tempSettings, setTempSettings] = useState<UserSettings>(settings);

  // Lock body scroll when onboarding is active
  useEffect(() => {
    if (showOnboarding) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [showOnboarding]);

  useEffect(() => {
    localStorage.setItem('gluco_settings', JSON.stringify(settings));
  }, [settings]);

  const handleLogDose = (units: number, glucose: number, carbs: number, type: 'bolus' | 'basal') => {
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      glucose,
      carbs,
      units,
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

  const handleSegmentChange = (index: number, key: keyof InsulinSegment, value: any) => {
    const newSegments = [...tempSettings.insulinSegments];
    newSegments[index] = { ...newSegments[index], [key]: value };
    setTempSettings({ ...tempSettings, insulinSegments: newSegments });
  };

  const renderOnboardingStep = () => {
    const t = TRANSLATIONS.it;
    switch(onboardingStep) {
      case 1:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full justify-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6">
              <User size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-textMain mb-2">Benvenuto!</h2>
            <p className="text-textMuted font-medium mb-8 leading-relaxed">Configuriamo GlucoDose. Come ti chiami?</p>
            <input 
              type="text" 
              value={tempSettings.userName === 'Nome' ? '' : tempSettings.userName}
              onChange={(e) => setTempSettings({...tempSettings, userName: e.target.value})}
              placeholder="nome" 
              className="w-full bg-appBg border-2 border-transparent focus:border-primary rounded-[1.8rem] p-5 text-lg font-bold text-textMain outline-none text-center transition-all mb-8 placeholder:opacity-30 placeholder:text-textMain"
            />
            <button 
              disabled={!tempSettings.userName.trim() || tempSettings.userName === 'Nome'}
              onClick={nextStep}
              className="w-full py-5 bg-primary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
            >
              Avanti <ArrowRight size={22} />
            </button>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full justify-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 mb-6">
              <Zap size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-textMain mb-2">Modalità Parametri</h2>
            <p className="text-textMuted text-sm font-medium mb-8">I tuoi fattori cambiano durante il giorno?</p>
            
            <div className="flex flex-col gap-3 w-full mb-10">
              <button 
                onClick={() => setTempSettings({...tempSettings, variableInsulinEnabled: false})}
                className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${!tempSettings.variableInsulinEnabled ? 'bg-primary/20 border-primary' : 'bg-appBg border-transparent'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!tempSettings.variableInsulinEnabled ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}><Zap size={18} /></div>
                <div className="text-left">
                   <p className="font-black text-sm uppercase text-textMain">Parametri Fissi</p>
                   <p className="text-[10px] text-textMain font-bold opacity-70">Usa gli stessi valori tutto il giorno</p>
                </div>
              </button>
              <button 
                onClick={() => setTempSettings({...tempSettings, variableInsulinEnabled: true})}
                className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${tempSettings.variableInsulinEnabled ? 'bg-primary/20 border-primary' : 'bg-appBg border-transparent'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tempSettings.variableInsulinEnabled ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}><Clock size={18} /></div>
                <div className="text-left">
                   <p className="font-black text-sm uppercase text-textMain">Parametri Variabili</p>
                   <p className="text-[10px] text-textMain font-bold opacity-70">Valori diversi per ogni orario</p>
                </div>
              </button>
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={prevStep} className="p-5 bg-gray-100 text-gray-500 rounded-[1.8rem]"><ChevronLeft size={24} /></button>
              <button onClick={nextStep} className="flex-1 py-5 bg-primary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl flex items-center justify-center gap-2">Avanti <ArrowRight size={22} /></button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full overflow-hidden">
            <h2 className="text-2xl font-black text-textMain mb-1">Imposta Fattori</h2>
            <p className="text-textMuted text-[10px] font-bold uppercase tracking-widest mb-4">ISF = Sensibilità | ICR = Rapporto Carbo</p>
            
            <div className="w-full flex-1 overflow-hidden flex flex-col mb-4">
              {!tempSettings.variableInsulinEnabled ? (
                <div className="space-y-4 my-auto">
                  <div className="p-5 rounded-[2rem] bg-appBg/50 border border-textMain/5 text-left">
                    <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Sensibilità (ISF)</label>
                    <input 
                      type="number" 
                      value={tempSettings.isf}
                      onChange={(e) => setTempSettings({...tempSettings, isf: parseFloat(e.target.value) || 0})}
                      className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                    />
                  </div>
                  <div className="p-5 rounded-[2rem] bg-appBg/50 border border-textMain/5 text-left">
                    <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Rapporto (ICR)</label>
                    <input 
                      type="number" 
                      value={tempSettings.icr}
                      onChange={(e) => setTempSettings({...tempSettings, icr: parseFloat(e.target.value) || 0})}
                      className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-[2rem] bg-appBg/30 border border-textMain/5 flex-1 flex flex-col overflow-hidden">
                  <div className="w-full h-full overflow-y-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#f8fafc] z-10">
                        <tr className="border-b border-textMain/5">
                          <th className="py-3 px-2 text-[9px] font-black uppercase text-textMuted">Orario</th>
                          <th className="py-3 text-[9px] font-black uppercase text-textMuted text-center">ISF</th>
                          <th className="py-3 text-[9px] font-black uppercase text-textMuted text-center">ICR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-textMain/5">
                        {tempSettings.insulinSegments.map((seg, idx) => (
                          <tr key={idx} className="hover:bg-white/40 transition-colors">
                            <td className="py-3 px-2">
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-black text-primary leading-none">{seg.startTime}</span>
                                <span className="text-[8px] font-bold text-textMuted uppercase truncate max-w-[60px]">{(t as any)[seg.labelKey]}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex justify-center">
                                <input 
                                  type="number" 
                                  step="0.1"
                                  value={seg.isf} 
                                  onChange={(e) => handleSegmentChange(idx, 'isf', parseFloat(e.target.value) || 0)}
                                  className="w-14 p-2 rounded-xl text-center font-bold text-sm bg-white border border-transparent focus:border-primary outline-none shadow-sm transition-all"
                                />
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex justify-center">
                                <input 
                                  type="number" 
                                  step="0.1"
                                  value={seg.icr} 
                                  onChange={(e) => handleSegmentChange(idx, 'icr', parseFloat(e.target.value) || 0)}
                                  className="w-14 p-2 rounded-xl text-center font-bold text-sm bg-white border border-transparent focus:border-primary outline-none shadow-sm transition-all"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full shrink-0">
              <button onClick={prevStep} className="p-5 bg-gray-100 text-gray-500 rounded-[1.8rem] transition-colors hover:bg-gray-200 active:scale-95"><ChevronLeft size={24} /></button>
              <button onClick={nextStep} className="flex-1 py-5 bg-primary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all">Avanti <ArrowRight size={22} /></button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full h-full justify-center">
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
                  onChange={(e) => setTempSettings({...tempSettings, targetBg: parseFloat(e.target.value) || 0})}
                  className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl p-4 text-2xl font-black text-textMain outline-none text-center shadow-sm"
                />
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Arrotondamento Unità</label>
                <div className="flex bg-appBg p-1.5 rounded-2xl">
                  <button onClick={() => setTempSettings({...tempSettings, doseStep: 0.5})} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tempSettings.doseStep === 0.5 ? 'bg-white shadow-sm text-textMain' : 'text-textMuted'}`}>0.5</button>
                  <button onClick={() => setTempSettings({...tempSettings, doseStep: 1.0})} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tempSettings.doseStep === 1.0 ? 'bg-white shadow-sm text-textMain' : 'text-textMuted'}`}>1.0</button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={prevStep} className="p-5 bg-gray-100 text-gray-500 rounded-[1.8rem]"><ChevronLeft size={24} /></button>
              <button onClick={finishOnboarding} className="flex-1 py-5 bg-secondary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl flex items-center justify-center gap-2">Inizia <Check size={22} strokeWidth={3} /></button>
            </div>
          </div>
        );
    }
  };

  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-appBg p-4 sm:p-6 overflow-hidden touch-none">
        <div className="absolute top-[-10%] right-[-20%] w-96 h-96 rounded-full blur-3xl mix-blend-multiply animate-blob opacity-40 bg-primary/20 pointer-events-none" />
        <div className="absolute top-[20%] left-[-10%] w-72 h-72 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000 opacity-30 bg-secondary/30 pointer-events-none" />
        
        <div className="relative bg-white w-full max-w-sm rounded-[3rem] px-8 pb-8 pt-20 shadow-2xl overflow-hidden h-[90vh] max-h-[680px] flex flex-col justify-between border border-white">
          <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${onboardingStep === s ? 'w-8 bg-primary' : 'w-2 bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderOnboardingStep()}
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard 
          settings={settings} 
          foods={foods} 
          history={history}
          onLogDose={handleLogDose} 
          onNavigateSettings={() => setActiveView('settings')}
        />;
      case 'food':
        return <FoodLibrary foods={foods} onAddFood={handleAddFood} settings={settings} />;
      case 'history':
        return <HistoryView history={history} settings={settings} />;
      case 'settings':
        return <Settings settings={settings} onSave={handleSaveSettings} />;
      default:
        return <Dashboard 
          settings={settings} 
          foods={foods} 
          history={history}
          onLogDose={handleLogDose} 
          onNavigateSettings={() => setActiveView('settings')}
        />;
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={setActiveView} settings={settings}>
      {renderView()}
    </Layout>
  );
}
