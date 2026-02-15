import React, { useState, useMemo } from 'react';
import { UserSettings, FoodItem, HistoryEntry, SelectedFoodItem } from '../types';
import { TRANSLATIONS, CATEGORY_ICONS } from '../constants';
import { Droplets, Calculator, Plus, Minus, X, Search, Utensils, Check, User, ChevronRight, ChevronLeft, AlertCircle, Syringe, Info, ArrowRight } from 'lucide-react';

interface DashboardProps {
  settings: UserSettings;
  foods: FoodItem[];
  history: HistoryEntry[];
  onLogDose: (units: number, glucose: number, carbs: number, mealType: string, recommendedUnits?: number) => void;
  onNavigateSettings: () => void;
  onNavigateHistory: () => void; // ← NUOVA PROP
  // --- PROPS PER LO STATO PERSISTENTE ---
  glucose: string;
  setGlucose: (value: string) => void;
  selectedFoods: SelectedFoodItem[];
  setSelectedFoods: React.Dispatch<React.SetStateAction<SelectedFoodItem[]>>;
}

const INSULIN_DURATION_MINUTES = 240;

export const Dashboard: React.FC<DashboardProps> = ({
  settings,
  foods,
  history,
  onLogDose,
  onNavigateSettings,
  onNavigateHistory, // ← AGGIUNGI QUI
  glucose,
  setGlucose,
  selectedFoods,
  setSelectedFoods
}) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';

  // --- STATI MODALI ---
  const [showResultModal, setShowResultModal] = useState(false);
  const [showExtraCheckModal, setShowExtraCheckModal] = useState(false);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);

  // --- STATI AGGIUNTA CIBO (CON FILTRI) ---
  const [foodSearch, setFoodSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // Filtro categoria
  const [pendingFood, setPendingFood] = useState<FoodItem | null>(null);
  const [gramsCount, setGramsCount] = useState<number>(100);

  // --- STATI CALCOLO ---
  const [extraUnloggedInsulin, setExtraUnloggedInsulin] = useState<number>(0);
  const [extraInsulinTime, setExtraInsulinTime] = useState<string>(() => {
    // Imposta di default 15 minuti fa
    const now = new Date();
    now.setMinutes(now.getMinutes() - 15);
    return now.toTimeString().slice(0, 5); // Formato HH:MM
  });
  const [finalDose, setFinalDose] = useState<number>(0);

  const totalCarbs = Math.round(selectedFoods.reduce((acc, f) => acc + (f.carbsPerServing * f.weight / 100), 0));

  // ULTIMA GLICEMIA VALIDA (ultimi 15 minuti - non più valida dopo 15 minuti)
  const lastValidGlucose = useMemo(() => {
    const now = new Date();
    const fifteenMinutesAgo = now.getTime() - 15 * 60 * 1000;

    const recentEntries = history
      .filter(e => {
        const entryTime = new Date(e.timestamp).getTime();
        const diffMinutes = (now.getTime() - entryTime) / 60000;
        // Valida solo se: ha glicemia > 0, è negli ultimi 15 minuti, ed è esattamente <= 15 minuti
        return e.glucose > 0 && entryTime >= fifteenMinutesAgo && diffMinutes < 15;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return recentEntries.length > 0 ? recentEntries[0] : null;
  }, [history]);

  // CATEGORIE PER FILTRO MODALE
  const CATEGORIES_LIST = [
    { id: 'all', label: t.categories.all },
    { id: 'grain', label: t.categories.grain },
    { id: 'fruit', label: t.categories.fruit },
    { id: 'vegetable', label: t.categories.vegetable },
    { id: 'dairy', label: t.categories.dairy },
    { id: 'protein', label: t.categories.protein },
    { id: 'sweet', label: t.categories.sweet },
    { id: 'drink', label: t.categories.drink },
  ];

  // FILTRO CIBI LOGICA
  const filteredFoods = useMemo(() => {
    return foods.filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(foodSearch.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || food.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [foods, foodSearch, categoryFilter]);

  /* --- CALCOLI (FASCE ORARIE + TARGET DINAMICO) --- */
  const currentInsulinParams = useMemo(() => {
    if (!settings.variableInsulinEnabled) {
      return { isf: settings.isf, icr: settings.icr, target: settings.targetBg };
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
    return { isf: match.isf, icr: match.icr, target: match.target ?? settings.targetBg };
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
    const { isf, icr, target } = currentInsulinParams;
    // Usa la glicemia inserita, se non c'è usa l'ultima valida, altrimenti usa il target
    const bg = parseFloat(glucose) || lastValidGlucose?.glucose || target;
    let correction = bg > target ? (bg - target) / isf : 0;
    let mealBolus = totalCarbs > 0 ? totalCarbs / icr : 0;
    const totalActiveToSubtract = currentIOB + extraUnloggedInsulin;
    let recommendation = Math.max(0, (correction + mealBolus) - totalActiveToSubtract);
    let roundedTotal = Math.round(recommendation / settings.doseStep) * settings.doseStep;

    return {
      recommendedTotal: parseFloat(roundedTotal.toFixed(1)),
      mealUnits: parseFloat(mealBolus.toFixed(1)),
      correctionUnits: parseFloat(correction.toFixed(1)),
      activeInsulinSubtracted: parseFloat(totalActiveToSubtract.toFixed(1)),
      usedTarget: target,
      usedGlucose: bg
    };
  }, [glucose, totalCarbs, settings, currentIOB, extraUnloggedInsulin, currentInsulinParams, lastValidGlucose]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.morning || 'Buongiorno';
    if (hour < 18) return t.afternoon || 'Buon pomeriggio';
    return t.evening || 'Buonasera';
  };

  const handleCalculateClick = () => {
    // Controlla se la glicemia inserita è fuori range
    const glucoseValue = parseFloat(glucose);
    if (glucose && (glucoseValue < 20 || glucoseValue > 600)) {
      alert('Attenzione: la glicemia deve essere tra 20 e 600 mg/dL');
      return;
    }

    // Reset orario a 15 minuti fa quando si riapre la modale
    const now = new Date();
    now.setMinutes(now.getMinutes() - 15);
    setExtraInsulinTime(now.toTimeString().slice(0, 5));
    setExtraUnloggedInsulin(0);
    setShowExtraCheckModal(true);
  };

  const handleQuickLogGlucose = () => {
    // Registra solo la glicemia senza passare per il calcolo
    const glucoseValue = parseFloat(glucose);
    if (!glucose || glucoseValue < 20 || glucoseValue > 600) {
      alert('Inserisci una glicemia valida (20-600 mg/dL)');
      return;
    }

    // Registra come "Controllo" con 0 carboidrati e 0 unità
    onLogDose(0, glucoseValue, 0, 'Controllo', 0);
    setGlucose('');
    onNavigateHistory();
  };

  const handleConfirmExtraCheck = () => {
    setShowExtraCheckModal(false);
    setFinalDose(calculationDetails.recommendedTotal);
    setShowResultModal(true);
  };

  const confirmLog = () => {
    // Usa la glicemia inserita, altrimenti quella calcolata
    const glucoseToLog = parseFloat(glucose) || calculationDetails.usedGlucose;
    onLogDose(finalDose, glucoseToLog, totalCarbs, 'Pasto', calculationDetails.recommendedTotal);
    setShowResultModal(false);
    setGlucose('');
    setSelectedFoods([]);
    onNavigateHistory(); // ← NAVIGA ALLA HISTORY
  };

  const adjustFinalDose = (increment: boolean) => {
    const step = settings.doseStep;
    setFinalDose(prev => Math.max(0, parseFloat((increment ? prev + step : prev - step).toFixed(1))));
  };

  // Il calcolo è sempre possibile se c'è una glicemia (inserita o recente)
  const isCalculationDisabled = !glucose && !lastValidGlucose;

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

      {/* CONTENUTO DASHBOARD */}
      <div className="flex-1 overflow-y-auto scrolling-touch no-scrollbar px-6 pb-44 min-h-0 w-full">
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* INPUT GLICEMIA */}
          <div className={`rounded-[2rem] p-6 border-2 transition-all ${isDark ? 'bg-gray-800/40 border-transparent focus-within:border-primary' : 'bg-cardBg border-transparent focus-within:border-primary shadow-sm'}`}>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-textMuted mb-3">
              <Droplets size={16} className="text-primary" /> {t.glucose} (mg/dL)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="40"
              max="400"
              value={glucose}
              onChange={(e) => {
                const value = e.target.value;
                // Permetti sempre di digitare, il controllo sarà fatto al momento del calcolo
                setGlucose(value);
              }}
              className={`w-full text-4xl font-black bg-transparent outline-none ${isDark ? 'text-white' : 'text-textMain'}`}
              placeholder="---"
            />

            {/* Mostra ultima glicemia valida se disponibile e non c'è input */}
            {!glucose && lastValidGlucose && (
              <div className={`mt-3 pt-3 border-t flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-textMuted">Ultima rilevazione</p>
                  <p className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(lastValidGlucose.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl ${lastValidGlucose.glucose < (settings.minGlucoseTarget || 70)
                    ? 'bg-red-100 text-red-600'
                    : lastValidGlucose.glucose > (settings.maxGlucoseTarget || 180)
                      ? lastValidGlucose.glucose > 250
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-yellow-100 text-yellow-600'
                      : 'bg-green-100 text-green-600'
                  }`}>
                  <span className="text-2xl font-black">{lastValidGlucose.glucose}</span>
                </div>
              </div>
            )}
          </div>

          {/* LISTA CIBI SELEZIONATI */}
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

      {/* BOTTONI FISSI */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] left-0 right-0 px-6 max-w-md mx-auto z-40 pointer-events-none">
        {/* Mostra solo pulsante "Salva Glicemia" se c'è glicemia ma nessun cibo */}
        {glucose && selectedFoods.length === 0 ? (
          <button
            onClick={handleQuickLogGlucose}
            className="w-full py-5 rounded-[2.2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 transition-all pointer-events-auto bg-secondary text-gray-900 shadow-secondary/30 active:scale-95"
          >
            <Check size={22} strokeWidth={3} /> SALVA GLICEMIA
          </button>
        ) : (
          /* Mostra pulsante "Calcola" se ci sono cibi o glicemia valida */
          <button
            onClick={handleCalculateClick}
            disabled={isCalculationDisabled}
            className={`w-full py-5 rounded-[2.2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 transition-all pointer-events-auto ${isCalculationDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70' : 'bg-primary text-gray-900 shadow-primary/30 active:scale-95'}`}
          >
            <Calculator size={22} strokeWidth={3} /> {t.calculate.toUpperCase()}
          </button>
        )}
      </div>

      {/* --- MODALE 1: CHECK SICUREZZA (SIRINGA) --- */}
      {showExtraCheckModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowExtraCheckModal(false)}></div>
          <div className={`relative w-full max-w-sm rounded-[3rem] shadow-2xl p-8 flex flex-col items-center text-center ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-textMain'}`}>
            {/* BOTTONE CHIUDI */}
            <button
              onClick={() => setShowExtraCheckModal(false)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <X size={20} />
            </button>

            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isDark ? 'bg-gray-800 text-primary' : 'bg-amber-100 text-amber-500'}`}>
              <Syringe size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black mb-3">Controllo Sicurezza</h3>
            <p className="text-sm font-bold text-textMuted mb-6">Insulina non registrata nelle ultime 4 ore?</p>

            {/* CAMPO ORARIO */}
            <div className="w-full mb-6">
              <label className="text-[9px] font-black uppercase tracking-widest text-textMuted mb-3 block text-left">Orario iniezione</label>
              <div className={`w-full p-2.5 rounded-[2rem] ${isDark ? 'bg-gray-800' : 'bg-gray-50 border-2 border-gray-100'}`}>
                <input
                  type="time"
                  value={extraInsulinTime}
                  onChange={(e) => setExtraInsulinTime(e.target.value)}
                  className={`w-full bg-transparent py-2 px-2 font-bold text-center text-lg outline-none ${isDark ? 'text-white' : 'text-textMain'}`}
                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                />
              </div>
            </div>

            {/* QUANTITÀ INSULINA */}
            <div className="w-full mb-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-textMuted mb-3 block text-left">Unità somministrate</label>
            </div>
            <div className={`flex items-center justify-between w-full p-2.5 rounded-[2rem] mb-8 ${isDark ? 'bg-gray-800' : 'bg-gray-50 border-2 border-gray-100'}`}>
              <button onClick={() => setExtraUnloggedInsulin(Math.max(0, extraUnloggedInsulin - 0.5))} className={`w-14 h-14 rounded-full flex items-center justify-center text-primary shadow-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}><Minus size={24} /></button>
              <span className="text-4xl font-black">{extraUnloggedInsulin}</span>
              <button onClick={() => setExtraUnloggedInsulin(extraUnloggedInsulin + 0.5)} className={`w-14 h-14 rounded-full flex items-center justify-center text-primary shadow-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}><Plus size={24} /></button>
            </div>
            <button onClick={handleConfirmExtraCheck} className="w-full py-5 bg-primary text-gray-900 font-black rounded-[2rem] text-lg">Conferma</button>
          </div>
        </div>
      )}

      {/* --- MODALE 2: RISULTATI (CALCOLATRICE) --- */}
      {showResultModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowResultModal(false)}></div>
          <div className={`relative w-full max-w-sm rounded-[3rem] shadow-2xl flex flex-col max-h-full overflow-hidden ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-textMain'}`}>
            <div className="flex justify-between items-center p-6 pb-0 shrink-0">
              <button
                onClick={() => { setShowResultModal(false); setShowExtraCheckModal(true); }}
                className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <ChevronLeft size={20} className={isDark ? 'text-white' : 'text-gray-900'} />
              </button>
              <button
                onClick={() => setShowResultModal(false)}
                className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <X size={20} className={isDark ? 'text-white' : 'text-gray-900'} />
              </button>
            </div>
            <div className="overflow-y-auto scrolling-touch no-scrollbar p-7 pt-2 flex-1">
              <div className="text-center pb-6">
                <p className="text-[10px] font-black text-textMuted uppercase tracking-[0.2em] mb-4">{t.recommendedBolus}</p>
                <div className={`flex items-center justify-between w-[280px] p-2 rounded-[2.5rem] mx-auto ${isDark ? 'bg-gray-800' : 'bg-appBg/40'}`}>
                  <button onClick={() => adjustFinalDose(false)} className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-primary ${isDark ? 'bg-gray-700' : 'bg-white'}`}><Minus size={28} /></button>
                  <span className="text-5xl font-black text-primary">{finalDose}</span>
                  <button onClick={() => adjustFinalDose(true)} className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-primary ${isDark ? 'bg-gray-700' : 'bg-white'}`}><Plus size={28} /></button>
                </div>
                <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-4">Calcolato: {calculationDetails.recommendedTotal} U</p>

                {/* Mostra se è stata usata una glicemia precedente */}
                {!glucose && lastValidGlucose && (
                  <div className={`mt-4 px-4 py-2 rounded-xl inline-block ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-textMuted mb-1">Glicemia usata</p>
                    <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-textMain'}`}>
                      {lastValidGlucose.glucose} mg/dL • {new Date(lastValidGlucose.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                  </div>
                )}
              </div>
              <div className={`rounded-3xl p-5 mb-2 space-y-3 border ${isDark ? 'bg-gray-800/50 border-white/5' : 'bg-appBg/20 border-transparent'}`}>
                <div className="flex justify-between items-center"><span className="text-[9px] font-black text-textMuted uppercase tracking-wider">{t.meal} ({totalCarbs}g)</span><span className="text-sm font-black">{calculationDetails.mealUnits} U</span></div>
                <div className="flex justify-between items-center"><span className="text-[9px] font-black text-textMuted uppercase tracking-wider">{t.correction}</span><span className="text-sm font-black">{calculationDetails.correctionUnits} U</span></div>
                {(currentIOB > 0 || extraUnloggedInsulin > 0) && (
                  <div className="flex justify-between items-center text-amber-600">
                    <span className="text-[9px] font-black uppercase tracking-wider">Insulina Attiva</span>
                    <span className="text-sm font-black">-{calculationDetails.activeInsulinSubtracted} U</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-7 pt-4 shrink-0 mt-auto">
              <button onClick={confirmLog} className="w-full py-5 bg-secondary text-gray-900 font-black rounded-[1.8rem] flex items-center justify-center gap-3 shadow-xl"><Check size={24} strokeWidth={4} /> {t.confirmLog.toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE 3: SELEZIONE CIBO (CON FILTRI) --- */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsFoodModalOpen(false)}></div>
          <div className={`relative w-full max-w-md h-[85vh] sm:h-[650px] rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden transition-colors ${isDark ? 'bg-gray-900' : 'bg-white'}`}>

            {/* Header Modale */}
            <div className="p-6 pb-2 shrink-0">
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-textMain'}`}>{t.addFood}</h3>
                <button onClick={() => setIsFoodModalOpen(false)} className="p-2.5 bg-gray-100 rounded-full text-gray-900 transition-transform active:scale-90"><X size={20} strokeWidth={3} /></button>
              </div>

              {/* Ricerca */}
              <div className="relative mb-4">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input type="text" placeholder={t.search} value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} className={`w-full rounded-2xl py-4 pl-12 pr-4 font-bold outline-none border-2 border-transparent focus:border-primary transition-all ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-textMain'}`} />
              </div>

              {/* Filtri Categorie (Scroll orizzontale) */}
              <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-6 px-6 pb-2">
                {CATEGORIES_LIST.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2 shrink-0
                      ${categoryFilter === cat.id
                        ? (isDark ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary/20 border-secondary text-textMain')
                        : (isDark ? 'bg-gray-800 border-transparent text-gray-500' : 'bg-white border-transparent text-textMuted shadow-sm')}`}
                  >
                    <span className="text-sm">{CATEGORY_ICONS[cat.id]}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lista Alimenti Filtrata */}
            <div className="flex-1 overflow-y-auto p-6 pt-2 gap-3 flex flex-col no-scrollbar">
              {filteredFoods.map(food => (
                <button key={food.id} onClick={() => { setPendingFood(food); setGramsCount(100); }} className={`flex justify-between items-center p-4 rounded-[1.5rem] border-2 transition-all hover:scale-[1.02] active:scale-98 ${isDark ? 'bg-gray-800 border-white/5' : 'bg-white border-gray-50 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${isDark ? 'bg-gray-700' : 'bg-appBg'}`}>{CATEGORY_ICONS[food.category] || '🍽️'}</div>
                    <div className="text-left">
                      <p className={`font-black text-sm leading-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{food.name}</p>
                      <p className="text-[10px] text-textMuted uppercase font-black tracking-widest">{food.carbsPerServing}g / 100g • {(t.categories as any)[food.category]}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </button>
              ))}
              {filteredFoods.length === 0 && (
                <div className="text-center py-10 opacity-50">
                  <p className="text-sm font-bold">Nessun alimento trovato.</p>
                </div>
              )}
            </div>

            {/* Sotto-Modale Dettaglio Quantità (Pending Food) */}
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