import React, { useState, useMemo } from 'react';
import { UserSettings, FoodItem, HistoryEntry } from '../types';
import { TRANSLATIONS, CATEGORY_ICONS } from '../constants';
import { Droplets, Calculator, Plus, Minus, X, Search, Utensils, Check, User, ChevronRight, AlertCircle, Syringe, Info, ArrowRight } from 'lucide-react';

interface DashboardProps {
  settings: UserSettings;
  foods: FoodItem[];
  history: HistoryEntry[];
  onLogDose: (units: number, glucose: number, carbs: number, type: 'bolus' | 'basal', recommendedUnits?: number) => void;
  onNavigateSettings: () => void;
}

const INSULIN_DURATION_MINUTES = 240;

export const Dashboard: React.FC<DashboardProps> = ({ settings, foods, history, onLogDose, onNavigateSettings }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';

  const [glucose, setGlucose] = useState<string>('');
  const [selectedFoods, setSelectedFoods] = useState<(FoodItem & { uniqueId: string, weight: number })[]>([]);

  // MODALI
  const [showResultModal, setShowResultModal] = useState(false);
  const [showExtraCheckModal, setShowExtraCheckModal] = useState(false); // NUOVA MODALE
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);

  const [foodSearch, setFoodSearch] = useState('');
  const [pendingFood, setPendingFood] = useState<FoodItem | null>(null);
  const [gramsCount, setGramsCount] = useState<number>(100);

  const [extraUnloggedInsulin, setExtraUnloggedInsulin] = useState<number>(0);
  const [finalDose, setFinalDose] = useState<number>(0);

  const totalCarbs = Math.round(selectedFoods.reduce((acc, f) => acc + (f.carbsPerServing * f.weight / 100), 0));

  /* --- CALCOLI --- */
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
      if (currentMinutes >= (h * 60 + m)) match = seg;
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
    const { isf, icr } = currentInsulinParams;
    let correction = bg > settings.targetBg ? (bg - settings.targetBg) / isf : 0;
    let mealBolus = totalCarbs > 0 ? totalCarbs / icr : 0;
    const totalActiveToSubtract = currentIOB + extraUnloggedInsulin;
    let recommendation = Math.max(0, (correction + mealBolus) - totalActiveToSubtract);
    let roundedTotal = Math.round(recommendation / settings.doseStep) * settings.doseStep;
    return { recommendedTotal: parseFloat(roundedTotal.toFixed(1)), mealUnits: parseFloat(mealBolus.toFixed(1)), correctionUnits: parseFloat(correction.toFixed(1)), activeInsulinSubtracted: parseFloat(totalActiveToSubtract.toFixed(1)) };
  }, [glucose, totalCarbs, settings, currentIOB, extraUnloggedInsulin, currentInsulinParams]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.morning || 'Buongiorno';
    if (hour < 18) return t.afternoon || 'Buon pomeriggio';
    return t.evening || 'Buonasera';
  };

  // STEP 1: Apre la modale di verifica extra
  const handleCalculateClick = () => {
    setExtraUnloggedInsulin(0); // Reset iniziale
    setShowExtraCheckModal(true);
  };

  // STEP 2: Conferma extra e vai al risultato
  const handleConfirmExtraCheck = () => {
    setShowExtraCheckModal(false);
    // Imposta la dose finale basata sul calcolo aggiornato (che include già l'extra sottratto)
    setFinalDose(calculationDetails.recommendedTotal);
    setShowResultModal(true);
  };

  const confirmLog = () => {
    onLogDose(finalDose, parseFloat(glucose) || 0, totalCarbs, 'bolus', calculationDetails.recommendedTotal);
    setShowResultModal(false);
    setGlucose('');
    setSelectedFoods([]);
  };

  const adjustFinalDose = (increment: boolean) => {
    const step = settings.doseStep;
    setFinalDose(prev => Math.max(0, parseFloat((increment ? prev + step : prev - step).toFixed(1))));
  };

  const isCalculationDisabled = !glucose || glucose.trim() === '';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* HEADER FISSO */}
      <header className="flex justify-between items-center p-6 pt-2 shrink-0 z-20 relative">
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{getGreeting()},</h1>
          <p className="text-primary text-xl font-black">{settings.userName}</p>
        </div>
        <button onClick={onNavigateSettings} className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-textMain shadow-sm'}`}>
          <User size={24} strokeWidth={2.5} />
        </button>
      </header>

      {/* CONTENUTO CHE SCORRE */}
      <div className="flex-1 overflow-y-auto scrolling-touch no-scrollbar px-6 pb-44 min-h-0 w-full">
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`rounded-[2rem] p-6 border-2 transition-all ${isDark ? 'bg-gray-800/40 border-transparent focus-within:border-primary' : 'bg-cardBg border-transparent focus-within:border-primary shadow-sm'}`}>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-textMuted mb-3">
              <Droplets size={16} className="text-primary" /> {t.glucose} (mg/dL)
            </label>
            <input type="number" inputMode="decimal" value={glucose} onChange={(e) => setGlucose(e.target.value)} className={`w-full text-4xl font-black bg-transparent outline-none ${isDark ? 'text-white' : 'text-textMain'}`} placeholder="---" />
          </div>

          <div className={`rounded-[2rem] p-6 border-2 transition-all ${isDark ? 'bg-gray-800/40 border-transparent' : 'bg-cardBg border-transparent shadow-sm'}`}>
            <div className="flex justify-between items-center mb-5">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-textMuted"><Utensils size={16} className="text-primary" />{t.mealContent}</label>
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${isDark ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-textMain'}`}>{totalCarbs}G CARBO</span>
            </div>
            <div className="flex flex-col gap-2 mb-5">
              {selectedFoods.length === 0 && <p className="text-xs text-textMuted/60 text-center py-6 font-bold italic">{t.noFoodAdded}</p>}
              {selectedFoods.map((item) => (
                <div key={item.uniqueId} className={`flex justify-between items-center p-3.5 rounded-2xl ${isDark ? 'bg-gray-700/50' : 'bg-appBg'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-lg">{CATEGORY_ICONS[item.category] || '🍽️'}</div>
                    <div><p className={`text-xs font-black leading-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{item.name}</p>
                      <p className="text-[10px] font-bold text-textMuted">{item.weight}g • {Math.round(item.carbsPerServing * item.weight / 100)}g</p></div>
                  </div>
                  <button onClick={() => setSelectedFoods(prev => prev.filter(f => f.uniqueId !== item.uniqueId))} className="text-gray-400 p-2"><X size={18} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setIsFoodModalOpen(true)} className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-black uppercase text-[10px] flex items-center justify-center gap-2">
              <Plus size={16} strokeWidth={3} /> {t.addFood}
            </button>
          </div>
        </div>
      </div>

      {/* BOTTONE FISSO */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] left-0 right-0 px-6 max-w-md mx-auto z-40 pointer-events-none">
        <button onClick={handleCalculateClick} disabled={isCalculationDisabled} className={`w-full py-5 rounded-[2.2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 transition-all pointer-events-auto ${isCalculationDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70' : 'bg-primary text-gray-900 shadow-primary/30 active:scale-95'}`}>
          <Calculator size={22} strokeWidth={3} /> {t.calculate.toUpperCase()}
        </button>
      </div>

      {/* --- NUOVA MODALE: VERIFICA EXTRA INSULINA --- */}
      {showExtraCheckModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowExtraCheckModal(false)}></div>

          <div className={`relative w-full max-w-sm rounded-[3rem] shadow-2xl transition-all animate-in zoom-in-95 duration-300 p-8 flex flex-col items-center text-center ${isDark ? 'bg-gray-900 text-white border border-white/10' : 'bg-white text-textMain'}`}>

            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isDark ? 'bg-gray-800 text-primary' : 'bg-amber-100 text-amber-500'}`}>
              <Syringe size={32} strokeWidth={2.5} />
            </div>

            <h3 className="text-xl font-black mb-3 leading-tight">Controllo Sicurezza</h3>
            <p className="text-sm font-bold text-textMuted mb-8 leading-relaxed">
              Hai effettuato iniezioni di insulina <span className="text-primary">non registrate</span> nelle ultime 4 ore?
            </p>

            {/* Input Extra */}
            <div className={`flex items-center justify-between w-full p-2.5 rounded-[2rem] mb-8 ${isDark ? 'bg-gray-800' : 'bg-gray-50 border-2 border-gray-100'}`}>
              <button onClick={() => setExtraUnloggedInsulin(Math.max(0, extraUnloggedInsulin - 0.5))} className={`w-14 h-14 rounded-full flex items-center justify-center text-primary transition-all active:scale-90 ${isDark ? 'bg-gray-700' : 'bg-white shadow-sm'}`}><Minus size={24} strokeWidth={3} /></button>
              <div className="flex flex-col items-center">
                <span className="text-4xl font-black tracking-tighter">{extraUnloggedInsulin}</span>
                <span className="text-[10px] font-black text-textMuted uppercase">UNITA' EXTRA</span>
              </div>
              <button onClick={() => setExtraUnloggedInsulin(extraUnloggedInsulin + 0.5)} className={`w-14 h-14 rounded-full flex items-center justify-center text-primary transition-all active:scale-90 ${isDark ? 'bg-gray-700' : 'bg-white shadow-sm'}`}><Plus size={24} strokeWidth={3} /></button>
            </div>

            <button onClick={handleConfirmExtraCheck} className="w-full py-5 bg-primary text-gray-900 font-black rounded-[2rem] text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
              {extraUnloggedInsulin > 0 ? 'Conferma Extra' : 'No, prosegui'} <ArrowRight size={22} strokeWidth={3} />
            </button>

          </div>
        </div>
      )}

      {/* --- MODALE RISULTATI --- */}
      {showResultModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowResultModal(false)}></div>
          <div className={`relative w-full max-w-sm rounded-[3rem] shadow-2xl transition-all animate-in zoom-in-95 duration-300 flex flex-col max-h-full overflow-hidden ${isDark ? 'bg-gray-900 text-white border border-white/10' : 'bg-white text-textMain'}`}>
            <div className="flex justify-end p-6 pb-0 shrink-0">
              <button onClick={() => setShowResultModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-900 transition-transform active:scale-90"><X size={20} strokeWidth={3} /></button>
            </div>

            <div className="overflow-y-auto scrolling-touch no-scrollbar p-7 pt-2 flex-1">
              <div className="text-center pb-6">
                <p className="text-[10px] font-black text-textMuted uppercase tracking-[0.2em] mb-4">{t.recommendedBolus}</p>
                <div className="flex flex-col items-center gap-4">

                  {/* BOX CALCOLO FISSO E PIÙ LARGO (w-[280px]) */}
                  <div className={`flex items-center justify-between w-[280px] p-2 rounded-[2.5rem] ${isDark ? 'bg-gray-800' : 'bg-appBg/40'}`}>
                    <button
                      onClick={() => adjustFinalDose(false)}
                      className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-primary active:scale-90 transition-all shrink-0"
                    >
                      <Minus size={28} strokeWidth={3} />
                    </button>

                    <div className="flex-1 flex items-baseline justify-center gap-1 min-w-0">
                      <span className="text-5xl font-black tracking-tighter text-primary animate-in zoom-in duration-300">{finalDose}</span>
                      <span className="text-xs font-black text-textMuted uppercase shrink-0">{t.units}</span>
                    </div>

                    <button
                      onClick={() => adjustFinalDose(true)}
                      className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-primary active:scale-90 transition-all shrink-0"
                    >
                      <Plus size={28} strokeWidth={3} />
                    </button>
                  </div>

                </div>
                <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-4">Calculated: {calculationDetails.recommendedTotal} U</p>
              </div>

              {/* Avvisi */}
              <div className={`rounded-2xl p-4 mb-6 border-2 flex gap-3 items-start ${isDark ? 'bg-amber-900/20 border-amber-900/40' : 'bg-amber-50 border-amber-100'}`}>
                <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold leading-relaxed text-amber-700">{t.activityWarning}</p>
              </div>

              {/* Dettagli Calcolo */}
              <div className={`rounded-3xl p-5 mb-2 space-y-3 border ${isDark ? 'bg-gray-800/50 border-white/5' : 'bg-appBg/20 border-transparent'}`}>
                <div className="flex justify-between items-center"><span className="text-[9px] font-black text-textMuted uppercase tracking-wider">{t.meal} ({totalCarbs}g)</span><span className="text-sm font-black">{calculationDetails.mealUnits} U</span></div>
                <div className="flex justify-between items-center"><span className="text-[9px] font-black text-textMuted uppercase tracking-wider">{t.correction}</span><span className="text-sm font-black">{calculationDetails.correctionUnits} U</span></div>
                {(currentIOB > 0 || extraUnloggedInsulin > 0) && (
                  <div className="flex justify-between items-center text-amber-600">
                    <span className="text-[9px] font-black uppercase tracking-wider">Insulina Attiva ({calculationDetails.activeInsulinSubtracted}U)</span>
                    <span className="text-sm font-black">-{calculationDetails.activeInsulinSubtracted} U</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-7 pt-4 shrink-0 mt-auto">
              <button onClick={confirmLog} className="w-full py-5 bg-secondary text-gray-900 font-black rounded-[1.8rem] flex items-center justify-center gap-3 shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all text-lg"><Check size={24} strokeWidth={4} /> {t.confirmLog.toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ALIMENTI */}
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