
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { FoodLibrary } from './views/FoodLibrary';
import { HistoryView } from './views/History';
import { Settings } from './views/Settings';
import { UserSettings, ViewState, HistoryEntry, FoodItem } from './types';
import { DEFAULT_SETTINGS, MOCK_HISTORY, MOCK_FOODS } from './constants';
import { User, Check, Activity, Target, Zap, ArrowRight, ChevronLeft } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('gluco_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [history, setHistory] = useState<HistoryEntry[]>(MOCK_HISTORY);
  const [foods, setFoods] = useState<FoodItem[]>(MOCK_FOODS);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(settings.userName === 'Amico');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [tempSettings, setTempSettings] = useState<UserSettings>(settings);

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
      mealType: type === 'basal' ? 'Basal' : 'Meal' 
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

  const renderOnboardingStep = () => {
    switch(onboardingStep) {
      case 1:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6">
              <User size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-textMain mb-2">Benvenuto!</h2>
            <p className="text-textMuted font-medium mb-8 leading-relaxed">Iniziamo con le presentazioni. Come ti chiami?</p>
            <input 
              type="text" 
              value={tempSettings.userName}
              onChange={(e) => setTempSettings({...tempSettings, userName: e.target.value})}
              placeholder="Il tuo nome" 
              className="w-full bg-appBg border-2 border-transparent focus:border-primary rounded-[1.8rem] p-5 text-lg font-bold text-textMain outline-none text-center transition-all mb-8"
            />
            <button 
              disabled={!tempSettings.userName.trim() || tempSettings.userName === 'Amico'}
              onClick={nextStep}
              className="w-full py-5 bg-primary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
            >
              Avanti <ArrowRight size={22} />
            </button>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6">
              <Zap size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-textMain mb-2">Rapporti Insulina</h2>
            <p className="text-textMuted text-sm font-medium mb-8">Inserisci i parametri per il calcolo del bolo.</p>
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="flex flex-col gap-2 text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3">ISF (Fattore Sens.)</label>
                <input 
                  type="number" 
                  value={tempSettings.isf}
                  onChange={(e) => setTempSettings({...tempSettings, isf: parseFloat(e.target.value) || 0})}
                  className="w-full bg-appBg border-2 border-transparent focus:border-primary rounded-2xl p-4 text-xl font-bold text-textMain outline-none text-center"
                />
              </div>
              <div className="flex flex-col gap-2 text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3">ICR (Rapp. Carbo)</label>
                <input 
                  type="number" 
                  value={tempSettings.icr}
                  onChange={(e) => setTempSettings({...tempSettings, icr: parseFloat(e.target.value) || 0})}
                  className="w-full bg-appBg border-2 border-transparent focus:border-primary rounded-2xl p-4 text-xl font-bold text-textMain outline-none text-center"
                />
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={prevStep} className="p-5 bg-gray-100 text-gray-500 rounded-[1.8rem]"><ChevronLeft size={24} /></button>
              <button onClick={nextStep} className="flex-1 py-5 bg-primary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl flex items-center justify-center gap-2">Avanti <ArrowRight size={22} /></button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-20 h-20 bg-secondary/30 rounded-full flex items-center justify-center text-secondary mb-6">
              <Target size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-textMain mb-2">Target & Precisione</h2>
            <p className="text-textMuted text-sm font-medium mb-8">Ultimi dettagli per una configurazione perfetta.</p>
            <div className="w-full space-y-6 mb-10">
              <div className="text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Target Glicemico (mg/dL)</label>
                <input 
                  type="number" 
                  value={tempSettings.targetBg}
                  onChange={(e) => setTempSettings({...tempSettings, targetBg: parseFloat(e.target.value) || 0})}
                  className="w-full bg-appBg border-2 border-transparent focus:border-primary rounded-2xl p-4 text-xl font-bold text-textMain outline-none text-center"
                />
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-textMuted uppercase ml-3 mb-2 block">Passo della Penna</label>
                <div className="flex bg-appBg p-1.5 rounded-2xl">
                  <button onClick={() => setTempSettings({...tempSettings, doseStep: 0.5})} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tempSettings.doseStep === 0.5 ? 'bg-white shadow-sm text-textMain' : 'text-textMuted'}`}>0.5 Unità</button>
                  <button onClick={() => setTempSettings({...tempSettings, doseStep: 1.0})} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tempSettings.doseStep === 1.0 ? 'bg-white shadow-sm text-textMain' : 'text-textMuted'}`}>1.0 Unità</button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={prevStep} className="p-5 bg-gray-100 text-gray-500 rounded-[1.8rem]"><ChevronLeft size={24} /></button>
              <button onClick={finishOnboarding} className="flex-1 py-5 bg-secondary text-gray-900 font-black rounded-[1.8rem] text-lg shadow-xl flex items-center justify-center gap-2">Fine <Check size={22} strokeWidth={3} /></button>
            </div>
          </div>
        );
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard 
          settings={settings} 
          foods={foods} 
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
          onLogDose={handleLogDose} 
          onNavigateSettings={() => setActiveView('settings')}
        />;
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={setActiveView} settings={settings}>
      {renderView()}

      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-xl"></div>
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl overflow-hidden min-h-[520px] flex flex-col justify-center">
            {/* Step Indicators */}
            <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${onboardingStep === s ? 'w-8 bg-primary' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
            {renderOnboardingStep()}
          </div>
        </div>
      )}
    </Layout>
  );
}
