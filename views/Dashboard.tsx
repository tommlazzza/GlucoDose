
import React, { useState } from 'react';
import { UserSettings, FoodItem } from '../types';
import { TRANSLATIONS } from '../constants';
import { Droplets, Calculator, Moon, Sun, Plus, Minus, X, Search, Utensils, Check, User, Activity, Clock, ArrowDownUp, ChevronRight } from 'lucide-react';

interface DashboardProps {
  settings: UserSettings;
  foods: FoodItem[];
  onLogDose: (units: number, glucose: number, carbs: number, type: 'bolus' | 'basal') => void;
  onNavigateSettings: () => void;
}

const CATEGORIES = [
    { id: 'all', label: 'All', icon: '🥗' },
    { id: 'grain', label: 'Grains', icon: '🍞' },
    { id: 'fruit', label: 'Fruit', icon: '🍎' },
    { id: 'vegetable', label: 'Veggies', icon: '🥦' },
    { id: 'dairy', label: 'Dairy', icon: '🥛' },
    { id: 'sweet', label: 'Sweets', icon: '🍩' },
    { id: 'protein', label: 'Protein', icon: '🍗' },
];

export const Dashboard: React.FC<DashboardProps> = ({ settings, foods, onLogDose, onNavigateSettings }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';
  
  const [mode, setMode] = useState<'bolus' | 'basal'>('bolus');
  const [glucose, setGlucose] = useState<string>('');
  const [selectedFoods, setSelectedFoods] = useState<(FoodItem & { uniqueId: string, weight: number })[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodSearch, setFoodSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [foodSortBy, setFoodSortBy] = useState<'alphabetical' | 'recent'>('recent');
  const [pendingFood, setPendingFood] = useState<FoodItem | null>(null);
  const [gramsCount, setGramsCount] = useState<number>(100);
  const [basalUnits, setBasalUnits] = useState<string>('');

  const totalCarbs = Math.round(selectedFoods.reduce((acc, f) => acc + (f.carbsPerServing * f.weight / 100), 0));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.morning;
    if (hour < 18) return t.afternoon;
    return t.evening;
  };

  const performCalculation = () => {
    if (mode === 'basal') {
      const units = parseFloat(basalUnits);
      if (units > 0) {
        onLogDose(units, 0, 0, 'basal');
        setBasalUnits('');
      }
      return;
    }
    const bg = parseFloat(glucose);
    const cho = totalCarbs;
    let correction = bg > settings.targetBg ? (bg - settings.targetBg) / settings.isf : 0;
    let mealBolus = cho > 0 ? cho / settings.icr : 0;
    let rawTotal = correction + mealBolus;
    let activityReduction = isActive ? rawTotal * 0.20 : 0;
    rawTotal -= activityReduction;
    let roundedTotal = Math.round(rawTotal / settings.doseStep) * settings.doseStep;

    setCalculationResult({
      total: parseFloat(roundedTotal.toFixed(1)),
      mealUnits: parseFloat(mealBolus.toFixed(1)),
      correctionUnits: parseFloat(correction.toFixed(1)),
      activityReduction: parseFloat(activityReduction.toFixed(1))
    });
    setShowResultModal(true);
  };

  const confirmLog = () => {
    if (calculationResult) {
      onLogDose(calculationResult.total, parseFloat(glucose) || 0, totalCarbs, 'bolus');
      setShowResultModal(false);
      setGlucose('');
      setSelectedFoods([]);
    }
  };

  return (
    <div className="flex flex-col gap-6 relative pb-24">
      <header className="flex justify-between items-center pt-2">
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{getGreeting()},</h1>
          <p className="text-primary text-xl font-bold">{settings.userName}</p>
        </div>
        <button onClick={onNavigateSettings} className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center transition-colors ${isDark ? 'bg-gray-800 text-white hover:text-primary' : 'bg-white text-textMain hover:text-primary'}`}>
           <User size={24} />
        </button>
      </header>

      <div className={`rounded-[1.5rem] p-1.5 flex shadow-inner-soft transition-colors ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <button onClick={() => setMode('bolus')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${mode === 'bolus' ? 'bg-primary text-gray-900 shadow-md' : 'text-textMuted'}`}>
          <Sun size={18} /> Bolus
        </button>
        <button onClick={() => setMode('basal')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${mode === 'basal' ? 'bg-secondary text-gray-900 shadow-md' : 'text-textMuted'}`}>
          <Moon size={18} /> Basal
        </button>
      </div>

      {mode === 'bolus' ? (
        <div className="flex flex-col gap-4">
            <div className={`rounded-[1.5rem] p-5 shadow-sm border border-transparent focus-within:border-primary transition-all ${isDark ? 'bg-gray-800' : 'bg-cardBg'}`}>
              <label className="flex items-center gap-2 text-sm font-bold text-textMuted mb-2">
                <Droplets size={16} className="text-primary" />
                {t.glucose} (mg/dL)
              </label>
              <input type="number" inputMode="decimal" value={glucose} onChange={(e) => setGlucose(e.target.value)} className={`w-full text-2xl font-bold bg-transparent outline-none ${isDark ? 'text-white' : 'text-textMain'}`} placeholder="120" />
            </div>

            <div className={`rounded-[2rem] p-5 shadow-sm border border-transparent transition-all ${isDark ? 'bg-gray-800' : 'bg-cardBg'}`}>
               <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-textMuted"><Utensils size={16} className="text-primary" />{t.mealContent}</label>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${isDark ? 'bg-gray-700 text-white' : 'bg-appBg text-textMain'}`}>{totalCarbs}g {t.totalCarbs}</span>
               </div>
               <div className="flex flex-col gap-2 mb-4">
                  {selectedFoods.length === 0 && <p className="text-sm text-textMuted/60 text-center py-4 italic">{t.noFoodAdded}</p>}
                  {selectedFoods.map((item) => (
                    <div key={item.uniqueId} className={`flex justify-between items-center p-3 rounded-2xl ${isDark ? 'bg-gray-700' : 'bg-appBg'}`}>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">{item.category === 'fruit' ? '🍎' : '🍞'}</div>
                          <div>
                            <p className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{item.name} <span className="text-primary ml-1">{item.weight}g</span></p>
                            <p className="text-[10px] text-textMuted">{Math.round(item.carbsPerServing * item.weight / 100)}g carbs</p>
                          </div>
                       </div>
                       <button onClick={() => setSelectedFoods(prev => prev.filter(f => f.uniqueId !== item.uniqueId))} className="text-gray-400 hover:text-red-400 p-2"><X size={16} /></button>
                    </div>
                  ))}
               </div>
               <button onClick={() => setIsFoodModalOpen(true)} className="w-full py-3 rounded-2xl border-2 border-dashed border-secondary/50 text-secondary font-bold hover:bg-secondary/10 transition-all flex items-center justify-center gap-2">
                 <Plus size={18} /> {t.addFood}
               </button>
            </div>

            <div onClick={() => setIsActive(!isActive)} className={`rounded-[1.5rem] p-4 flex items-center justify-between cursor-pointer transition-all border-2 ${isActive ? 'bg-secondary/20 border-secondary' : (isDark ? 'bg-gray-800 border-transparent' : 'bg-cardBg border-transparent shadow-sm')}`}>
               <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-secondary text-gray-900' : (isDark ? 'bg-gray-700 text-textMuted' : 'bg-appBg text-textMuted')}`}><Activity size={20} /></div>
                  <div>
                     <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-textMain'}`}>{t.activeDay}</p>
                     <p className="text-[10px] text-textMuted">{t.exercisePlan}</p>
                  </div>
               </div>
               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isActive ? 'bg-secondary border-secondary' : 'border-gray-300'}`}>{isActive && <Check size={14} className="text-gray-900" strokeWidth={4} />}</div>
            </div>
        </div>
      ) : (
           <div className={`relative rounded-[2.5rem] p-8 text-center shadow-soft border min-h-[16rem] flex flex-col justify-center transition-colors ${isDark ? 'bg-gray-800 border-white/10' : 'bg-cardBg border-white/60'}`}>
            <p className="text-xs font-bold text-textMuted uppercase tracking-widest mb-6">{t.logBasal}</p>
            <div className={`flex items-center justify-center gap-4 rounded-3xl p-4 border ${isDark ? 'bg-gray-700 border-secondary/20' : 'bg-appBg border-secondary/20'}`}>
               <input type="number" inputMode="decimal" placeholder="0" value={basalUnits} onChange={(e) => setBasalUnits(e.target.value)} className={`text-5xl font-extrabold bg-transparent text-center w-32 outline-none ${isDark ? 'text-white' : 'text-textMain'}`} />
               <span className="text-xl font-medium text-textMuted">{t.units}</span>
            </div>
          </div>
      )}

      <div className="fixed bottom-24 left-0 right-0 px-6 max-w-md mx-auto z-40">
        <button onClick={performCalculation} disabled={mode === 'bolus' ? (totalCarbs === 0 && !glucose) : (!basalUnits)} className={`w-full py-5 rounded-[2rem] font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${mode === 'bolus' ? (totalCarbs === 0 && !glucose ? 'bg-gray-300' : 'bg-primary') : (!basalUnits ? 'bg-gray-300' : 'bg-secondary')} text-gray-900`}>
          <Calculator size={20} strokeWidth={2.5} /> {mode === 'bolus' ? t.calculate : t.logBasal}
        </button>
      </div>

      {showResultModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResultModal(false)}></div>
           <div className={`relative w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl transition-colors ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-textMain'}`}>
              <button onClick={() => setShowResultModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-900"><X size={20} /></button>
              <div className="text-center pb-6">
                <p className="text-xs font-bold text-textMuted uppercase tracking-widest mb-4">{t.recommendedBolus}</p>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-7xl font-extrabold tracking-tighter">{calculationResult.total}</span>
                  <span className="text-xl font-medium text-textMuted">{t.units}</span>
                </div>
              </div>
              <div className={`rounded-2xl p-4 mb-6 space-y-3 ${isDark ? 'bg-gray-700' : 'bg-appBg'}`}>
                 <div className="flex justify-between items-center"><span className="text-sm font-bold text-textMuted">{t.meal} ({totalCarbs}g)</span><span className="text-sm font-bold">{calculationResult.mealUnits} u</span></div>
                 <div className="flex justify-between items-center"><span className="text-sm font-bold text-textMuted">{t.correction}</span><span className="text-sm font-bold">{calculationResult.correctionUnits} u</span></div>
                 {isActive && <div className="flex justify-between items-center text-secondary"><span className="text-sm font-bold">Active (-20%)</span><span className="text-sm font-bold">-{calculationResult.activityReduction} u</span></div>}
              </div>
              <button onClick={confirmLog} className="w-full py-4 bg-secondary text-gray-900 font-bold rounded-[1.5rem] flex items-center justify-center gap-2"><Check size={20} /> {t.confirmLog}</button>
           </div>
        </div>
      )}

      {isFoodModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFoodModalOpen(false)}></div>
          <div className={`relative w-full max-w-md h-[85vh] sm:h-[650px] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden transition-colors ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
             <div className="p-6 pb-2">
                <div className="flex justify-between items-center mb-4">
                   <h3 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-textMain'}`}>{t.addFood}</h3>
                   <button onClick={() => setIsFoodModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-900"><X size={20} /></button>
                </div>
                <div className="relative mb-4">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder={t.search} value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} className={`w-full rounded-2xl py-3 pl-11 pr-4 font-bold outline-none ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-textMain'}`} />
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 pt-2 gap-2 flex flex-col no-scrollbar">
                {foods.filter(f => f.name.toLowerCase().includes(foodSearch.toLowerCase())).map(food => (
                    <button key={food.id} onClick={() => { setPendingFood(food); setGramsCount(100); }} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${isDark ? 'bg-gray-700 border-white/5' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-appBg rounded-full flex items-center justify-center text-lg">{food.category === 'fruit' ? '🍎' : '🍞'}</div>
                            <div>
                                <p className={`font-bold leading-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{food.name}</p>
                                <p className="text-[10px] text-textMuted uppercase font-bold">{food.category}</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </button>
                ))}
             </div>
             {pendingFood && (
                 <div className={`absolute inset-0 z-[70] p-6 flex flex-col transition-colors ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="flex justify-between items-center mb-8"><button onClick={() => setPendingFood(null)} className="p-2 bg-gray-100 rounded-full text-gray-900"><X size={20} /></button><h3 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-textMain'}`}>{t.quantity}</h3><div className="w-10"></div></div>
                    <div className="flex flex-col items-center justify-center flex-1">
                        <div className="w-20 h-20 bg-appBg rounded-full flex items-center justify-center text-4xl mb-4">{pendingFood.category === 'fruit' ? '🍎' : '🍞'}</div>
                        <h4 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-textMain'}`}>{pendingFood.name}</h4>
                        <div className="flex items-center gap-6 my-12">
                            <button onClick={() => setGramsCount(Math.max(0, gramsCount - 10))} className="w-14 h-14 bg-white border-2 border-primary/20 rounded-2xl flex items-center justify-center text-primary"><Minus size={24} /></button>
                            <div className="flex flex-col items-center">
                                <input type="number" value={gramsCount} onChange={(e) => setGramsCount(parseFloat(e.target.value) || 0)} className={`text-5xl font-extrabold bg-transparent w-32 text-center outline-none ${isDark ? 'text-white' : 'text-textMain'}`} />
                                <span className="text-xs font-bold text-textMuted uppercase tracking-widest">{t.grams}</span>
                            </div>
                            <button onClick={() => setGramsCount(gramsCount + 10)} className="w-14 h-14 bg-white border-2 border-primary/20 rounded-2xl flex items-center justify-center text-primary"><Plus size={24} /></button>
                        </div>
                    </div>
                    <button onClick={() => { setSelectedFoods(prev => [...prev, { ...pendingFood, uniqueId: Date.now().toString(), weight: gramsCount }]); setPendingFood(null); setIsFoodModalOpen(false); }} className="w-full py-5 bg-secondary text-gray-900 font-bold rounded-[2rem] text-lg"><Check size={20} /> {t.addFood}</button>
                 </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
