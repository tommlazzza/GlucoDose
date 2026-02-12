
import React, { useState, useMemo } from 'react';
import { UserSettings, FoodItem, HistoryEntry } from '../types';
import { TRANSLATIONS, CATEGORY_ICONS } from '../constants';
import { Droplets, Calculator, Plus, Minus, X, Search, Utensils, Check, User, ChevronRight, AlertCircle, Syringe, Info } from 'lucide-react';

interface DashboardProps {
  settings: UserSettings;
  foods: FoodItem[];
  history: HistoryEntry[];
  onLogDose: (units: number, glucose: number, carbs: number, type: 'bolus' | 'basal') => void;
  onNavigateSettings: () => void;
}

const INSULIN_DURATION_MINUTES = 240;

export const Dashboard: React.FC<DashboardProps> = ({ settings, foods, history, onLogDose, onNavigateSettings }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';
  
  const [glucose, setGlucose] = useState<string>('');
  const [selectedFoods, setSelectedFoods] = useState<(FoodItem & { uniqueId: string, weight: number })[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodSearch, setFoodSearch] = useState('');
  const [pendingFood, setPendingFood] = useState<FoodItem | null>(null);
  const [gramsCount, setGramsCount] = useState<number>(100);
  const [extraUnloggedInsulin, setExtraUnloggedInsulin] = useState<number>(0);
  
  // State for final manually adjusted dose
  const [finalDose, setFinalDose] = useState<number>(0);

  const totalCarbs = Math.round(selectedFoods.reduce((acc, f) => acc + (f.carbsPerServing * f.weight / 100), 0));

  const currentInsulinParams = useMemo(() => {
    if (!settings.variableInsulinEnabled) {
      return { isf: settings.isf, icr: settings.icr };
    }
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const sorted = [...settings.insulinSegments].sort((a, b) => {
      const [ha, ma] = a.startTime.split(':').map(Number);
      const [hb, mb] = b.startTime.split(':').map(Number);
      return (ha * 60 + ma) - (hb * 60 + mb);
    });

    let match = sorted[0];
    for (const seg of sorted) {
      const [h, m] = seg.startTime.split(':').map(Number);
      if (currentMinutes >= (h * 60 + m)) {
        match = seg;
      }
    }
    return { isf: match.isf, icr: match.icr };
  }, [settings]);

  const currentIOB = useMemo(() => {
    const now = new Date();
    let total = 0;
    history.forEach(entry => {
      if (entry.type === 'bolus') {
        const diffMinutes = (now.getTime() - new Date(entry.timestamp).getTime()) / 60000;
        if (diffMinutes >= 0 && diffMinutes < INSULIN_DURATION_MINUTES) {
          const progress = diffMinutes / INSULIN_DURATION_MINUTES;
          const remainingFactor = Math.pow(1 - progress, 2);
          total += entry.units * remainingFactor;
        }
      }
    });
    return parseFloat(total.toFixed(1));
  }, [history]);

  const calculationDetails = useMemo(() => {
    const bg = parseFloat(glucose) || settings.targetBg;
    const cho = totalCarbs;
    const { isf, icr } = currentInsulinParams;
    
    let correction = bg > settings.targetBg ? (bg - settings.targetBg) / isf : 0;
    let mealBolus = cho > 0 ? cho / icr : 0;
    
    let rawTotal = correction + mealBolus;
    const totalActiveToSubtract = currentIOB + extraUnloggedInsulin;
    
    let recommendation = Math.max(0, rawTotal - totalActiveToSubtract);
    let roundedTotal = Math.round(recommendation / settings.doseStep) * settings.doseStep;

    return {
      recommendedTotal: parseFloat(roundedTotal.toFixed(1)),
      mealUnits: parseFloat(mealBolus.toFixed(1)),
      correctionUnits: parseFloat(correction.toFixed(1)),
      activeInsulinSubtracted: parseFloat(totalActiveToSubtract.toFixed(1))
    };
  }, [glucose, totalCarbs, settings, currentIOB, extraUnloggedInsulin, currentInsulinParams]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.morning;
    if (hour < 18) return t.afternoon;
    return t.evening;
  };

  const handleCalculateClick = () => {
    setExtraUnloggedInsulin(0);
    setFinalDose(calculationDetails.recommendedTotal); // Initialize manual dose with calculated recommendation
    setShowResultModal(true);
  };

  const confirmLog = () => {
    onLogDose(finalDose, parseFloat(glucose) || 0, totalCarbs, 'bolus');
    setShowResultModal(false);
    setGlucose('');
    setSelectedFoods([]);
    setExtraUnloggedInsulin(0);
  };

  const adjustFinalDose = (increment: boolean) => {
    const step = settings.doseStep;
    setFinalDose(prev => {
      const newVal = increment ? prev + step : prev - step;
      return Math.max(0, parseFloat(newVal.toFixed(1)));
    });
  };

  // Condition to check if calculation is allowed (glucose must be entered)
  const isCalculationDisabled = !glucose || glucose.trim() === '';

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-6 pb-48 relative">
      <header className="flex justify-between items-center pt-2 mb-6">
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{getGreeting()},</h1>
          <p className="text-primary text-xl font-black">{settings.userName}</p>
        </div>
        <button onClick={onNavigateSettings} className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-gray-800 text-white border border-white/5' : 'bg-white text-textMain border border-gray-100'}`}>
           <User size={24} strokeWidth={2.5} />
        </button>
      </header>

      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`rounded-[2rem] p-6 shadow-sm border-2 transition-all ${isDark ? 'bg-gray-800/40 border-transparent focus-within:border-primary' : 'bg-cardBg border-transparent focus-within:border-primary'}`}>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-textMuted mb-3">
              <Droplets size={16} className="text-primary" />
              {t.glucose} (mg/dL)
            </label>
            <input type="number" inputMode="decimal" value={glucose} onChange={(e) => setGlucose(e.target.value)} className={`w-full text-4xl font-black bg-transparent outline-none ${isDark ? 'text-white' : 'text-textMain'}`} placeholder="---" />
          </div>

          <div className={`rounded-[2rem] p-6 shadow-sm border-2 transition-all ${isDark ? 'bg-gray-800/40 border-transparent' : 'bg-cardBg border-transparent'}`}>
             <div className="flex justify-between items-center mb-5">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-textMuted"><Utensils size={16} className="text-primary" />{t.mealContent}</label>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${isDark ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-textMain'}`}>{totalCarbs}G CARBO</span>
             </div>
             <div className="flex flex-col gap-2 mb-5">
                {selectedFoods.length === 0 && <p className="text-xs text-textMuted/60 text-center py-6 font-bold italic">{t.noFoodAdded}</p>}
                {selectedFoods.map((item) => (
                  <div key={item.uniqueId} className={`flex justify-between items-center p-3.5 rounded-2xl transition-all ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-lg">{CATEGORY_ICONS[item.category] || '🍽️'}</div>
                        <div>
                          <p className={`text-xs font-black leading-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{item.name}</p>
                          <p className="text-[10px] font-bold text-textMuted">{item.weight}g • {Math.round(item.carbsPerServing * item.weight / 100)}g carbo</p>
                        </div>
                     </div>
                     <button onClick={() => setSelectedFoods(prev => prev.filter(f => f.uniqueId !== item.uniqueId))} className="text-gray-400 hover:text-red-400 p-2"><X size={18} strokeWidth={3} /></button>
                  </div>
                ))}
             </div>
             <button onClick={() => setIsFoodModalOpen(true)} className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-black uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
               <Plus size={16} strokeWidth={3} /> {t.addFood}
             </button>
          </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-6 max-w-md mx-auto z-40">
        <button 
          onClick={handleCalculateClick} 
          disabled={isCalculationDisabled} 
          className={`w-full py-5 rounded-[2.2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.97] ${isCalculationDisabled ? (isDark ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : 'bg-primary text-gray-900 shadow-primary/30'}`}
        >
          <Calculator size={22} strokeWidth={3} /> {t.calculate.toUpperCase()}
        </button>
      </div>

      {showResultModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowResultModal(false)}></div>
           <div className={`relative w-full max-w-sm rounded-[3rem] p-7 shadow-2xl transition-all animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] no-scrollbar ${isDark ? 'bg-gray-900 text-white border border-white/10' : 'bg-white text-textMain'}`}>
              <button onClick={() => setShowResultModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-900 transition-transform active:scale-90"><X size={20} strokeWidth={3} /></button>
              
              <div className="text-center pb-6 pt-4">
                <p className="text-[10px] font-black text-textMuted uppercase tracking-[0.2em] mb-4">{t.recommendedBolus}</p>
                <div className="flex flex-col items-center gap-4">
                  {/* Dose Adjustment Area */}
                  <div className={`flex items-center justify-between w-full max-w-[240px] p-2 rounded-[2.5rem] ${isDark ? 'bg-gray-800' : 'bg-appBg/40'}`}>
                    <button onClick={() => adjustFinalDose(false)} className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-primary active:scale-90 transition-all">
                      <Minus size={28} strokeWidth={3} />
                    </button>
                    <div className="flex items-baseline gap-1">
                      <span className="text-6xl font-black tracking-tighter text-primary animate-in zoom-in duration-300">{finalDose}</span>
                      <span className="text-xs font-black text-textMuted uppercase">{t.units}</span>
                    </div>
                    <button onClick={() => adjustFinalDose(true)} className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-primary active:scale-90 transition-all">
                      <Plus size={28} strokeWidth={3} />
                    </button>
                  </div>
                </div>
                <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-4">Calculated: {calculationDetails.recommendedTotal} U | ISF: {currentInsulinParams.isf} | ICR: {currentInsulinParams.icr}</p>
              </div>

              {/* Physical Activity Warning */}
              <div className={`rounded-2xl p-4 mb-6 border-2 flex gap-3 items-start animate-in slide-in-from-top-2 duration-500 ${isDark ? 'bg-amber-900/20 border-amber-900/40' : 'bg-amber-50 border-amber-100'}`}>
                <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold leading-relaxed text-amber-700">
                  {t.activityWarning}
                </p>
              </div>

              <div className={`rounded-[2rem] p-5 mb-6 border-2 transition-all ${extraUnloggedInsulin > 0 ? 'bg-amber-50/50 border-amber-200' : (isDark ? 'bg-gray-800/40 border-transparent' : 'bg-appBg/50 border-transparent')}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-gray-700 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                      <AlertCircle size={16} strokeWidth={2.5} />
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-textMain'}`}>Verifica Iniezioni Ultime 4h</p>
                  </div>
                  <div className={`flex items-center gap-4 p-1.5 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
                     <div className="flex-1 flex items-center gap-3 px-3">
                        <Syringe size={16} className="text-primary" />
                        <span className="text-[10px] font-black text-textMuted uppercase">Extra</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setExtraUnloggedInsulin(Math.max(0, extraUnloggedInsulin - 0.5))} className={`w-9 h-9 rounded-xl flex items-center justify-center text-primary transition-all active:scale-90 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}><Minus size={16} strokeWidth={3} /></button>
                        <span className="w-8 text-center font-black text-sm">{extraUnloggedInsulin}</span>
                        <button onClick={() => setExtraUnloggedInsulin(extraUnloggedInsulin + 0.5)} className={`w-9 h-9 rounded-xl flex items-center justify-center text-primary transition-all active:scale-90 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}><Plus size={16} strokeWidth={3} /></button>
                     </div>
                  </div>
              </div>

              <div className={`rounded-3xl p-5 mb-8 space-y-3 border ${isDark ? 'bg-gray-800/50 border-white/5' : 'bg-appBg/20 border-transparent'}`}>
                 <div className="flex justify-between items-center"><span className="text-[9px] font-black text-textMuted uppercase tracking-wider">{t.meal} ({totalCarbs}g)</span><span className="text-sm font-black">{calculationDetails.mealUnits} U</span></div>
                 <div className="flex justify-between items-center"><span className="text-[9px] font-black text-textMuted uppercase tracking-wider">{t.correction}</span><span className="text-sm font-black">{calculationDetails.correctionUnits} U</span></div>
                 {(currentIOB > 0 || extraUnloggedInsulin > 0) && (
                   <div className="flex justify-between items-center text-amber-600"><span className="text-[9px] font-black uppercase tracking-wider">Sconto Ins. Attiva ({calculationDetails.activeInsulinSubtracted}U)</span><span className="text-sm font-black">-{calculationDetails.activeInsulinSubtracted} U</span></div>
                 )}
              </div>

              <button onClick={confirmLog} className="w-full py-5 bg-secondary text-gray-900 font-black rounded-[1.8rem] flex items-center justify-center gap-3 shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all text-lg"><Check size={24} strokeWidth={4} /> {t.confirmLog.toUpperCase()}</button>
           </div>
        </div>
      )}

      {isFoodModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsFoodModalOpen(false)}></div>
          <div className={`relative w-full max-w-md h-[85vh] sm:h-[650px] rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden transition-colors ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
             <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-6">
                   <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{t.addFood}</h3>
                   <button onClick={() => setIsFoodModalOpen(false)} className="p-2.5 bg-gray-100 rounded-full text-gray-900 transition-transform active:scale-90"><X size={20} strokeWidth={3} /></button>
                </div>
                <div className="relative mb-4">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                    <input type="text" placeholder={t.search} value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} className={`w-full rounded-2xl py-4 pl-12 pr-4 font-bold outline-none border-2 border-transparent focus:border-primary transition-all ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-textMain'}`} />
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 pt-2 gap-3 flex flex-col no-scrollbar">
                {foods.filter(f => f.name.toLowerCase().includes(foodSearch.toLowerCase())).map(food => (
                    <button key={food.id} onClick={() => { setPendingFood(food); setGramsCount(100); }} className={`flex justify-between items-center p-4 rounded-[1.5rem] border-2 transition-all hover:scale-[1.02] active:scale-98 ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-gray-50 shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${isDark ? 'bg-gray-700' : 'bg-appBg'}`}>{CATEGORY_ICONS[food.category] || '🍽️'}</div>
                            <div className="text-left">
                                <p className={`font-black text-sm leading-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{food.name}</p>
                                <p className="text-[10px] text-textMuted uppercase font-black tracking-widest">{(t.categories as any)[food.category]}</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </button>
                ))}
             </div>
             {pendingFood && (
                 <div className={`absolute inset-0 z-[70] p-8 flex flex-col transition-all animate-in slide-in-from-right duration-300 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="flex justify-between items-center mb-10"><button onClick={() => setPendingFood(null)} className="p-2.5 bg-gray-100 rounded-full text-gray-900"><X size={20} strokeWidth={3} /></button><h3 className={`text-xl font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-textMain'}`}>{t.quantity}</h3><div className="w-10"></div></div>
                    <div className="flex flex-col items-center justify-center flex-1">
                        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-inner ${isDark ? 'bg-gray-800' : 'bg-appBg'}`}>{CATEGORY_ICONS[pendingFood.category] || '🍽️'}</div>
                        <h4 className={`text-3xl font-black text-center mb-2 px-4 ${isDark ? 'text-white' : 'text-textMain'}`}>{pendingFood.name}</h4>
                        <p className="text-primary font-black uppercase tracking-widest text-[10px]">{pendingFood.carbsPerServing}g carbo / 100g</p>
                        
                        <div className="flex items-center gap-8 my-16">
                            <button onClick={() => setGramsCount(Math.max(0, gramsCount - 10))} className={`w-16 h-16 rounded-2xl flex items-center justify-center text-primary border-2 border-primary/20 shadow-sm transition-transform active:scale-90 ${isDark ? 'bg-gray-800' : 'bg-white'}`}><Minus size={28} strokeWidth={3} /></button>
                            <div className="flex flex-col items-center">
                                <input type="number" value={gramsCount} onChange={(e) => setGramsCount(parseFloat(e.target.value) || 0)} className={`text-6xl font-black bg-transparent w-40 text-center outline-none ${isDark ? 'text-white' : 'text-textMain'}`} />
                                <span className="text-[10px] font-black text-textMuted uppercase tracking-[0.3em] mt-2">{t.grams}</span>
                            </div>
                            <button onClick={() => setGramsCount(gramsCount + 10)} className={`w-16 h-16 rounded-2xl flex items-center justify-center text-primary border-2 border-primary/20 shadow-sm transition-transform active:scale-90 ${isDark ? 'bg-gray-800' : 'bg-white'}`}><Plus size={28} strokeWidth={3} /></button>
                        </div>
                    </div>
                    <button onClick={() => { setSelectedFoods(prev => [...prev, { ...pendingFood, uniqueId: Date.now().toString(), weight: gramsCount }]); setPendingFood(null); setIsFoodModalOpen(false); }} className="w-full py-5 bg-secondary text-gray-900 font-black rounded-[2rem] text-xl shadow-xl shadow-secondary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"><Check size={24} strokeWidth={4} /> {t.addFood.toUpperCase()}</button>
                 </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
