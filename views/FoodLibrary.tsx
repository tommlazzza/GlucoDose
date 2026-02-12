
import React, { useState } from 'react';
import { Search, Plus, X, ArrowDownUp, Clock, ChevronRight } from 'lucide-react';
import { FoodItem, UserSettings } from '../types';
import { CATEGORY_ICONS, TRANSLATIONS } from '../constants';

interface FoodLibraryProps {
  foods: FoodItem[];
  onAddFood: (food: Omit<FoodItem, 'id'>) => void;
  settings: UserSettings;
}

export const FoodLibrary: React.FC<FoodLibraryProps> = ({ foods, onAddFood, settings }) => {
  const t = TRANSLATIONS[settings.language];
  const isDark = settings.theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', carbs: '', unit: '', category: 'grain' });
  const [sortBy, setSortBy] = useState<'alphabetical' | 'recent'>('recent');

  const CATEGORIES_LIST = [
    { id: 'all', label: t.categories.all },
    { id: 'grain', label: t.categories.grain },
    { id: 'fruit', label: t.categories.fruit },
    { id: 'vegetable', label: t.categories.vegetable },
    { id: 'dairy', label: t.categories.dairy },
    { id: 'sweet', label: t.categories.sweet },
    { id: 'protein', label: t.categories.protein },
  ];

  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || food.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedFoods = [...filteredFoods].sort((a, b) => {
    if (sortBy === 'alphabetical') return a.name.localeCompare(b.name);
    return (b.lastUsed || 0) - (a.lastUsed || 0);
  });

  const handleSaveFood = () => {
    if (newFood.name && newFood.carbs) {
      onAddFood({
        name: newFood.name,
        carbsPerServing: parseFloat(newFood.carbs),
        servingUnit: newFood.unit || '100g',
        category: newFood.category as any,
        color: '#E5E7EB',
        lastUsed: Date.now()
      });
      setIsAdding(false);
      setNewFood({ name: '', carbs: '', unit: '', category: 'grain' });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed Part */}
      <div className="p-6 pb-2">
        <header className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-textMain'}`}>{t.foodLibrary}</h2>
        </header>

        <div className="flex flex-col gap-4 mb-4">
          <div className="flex gap-2">
              <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold shadow-sm outline-none transition-all ${isDark ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-textMain placeholder-gray-300'}`}
                  />
              </div>
              <button 
                  onClick={() => setSortBy(prev => prev === 'recent' ? 'alphabetical' : 'recent')}
                  className={`p-3.5 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center min-w-[3.5rem] ${isDark ? 'bg-gray-800 text-primary' : 'bg-white text-textMuted'}`}
              >
                  {sortBy === 'recent' ? <Clock size={20} /> : <ArrowDownUp size={20} />}
              </button>
          </div>

          <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-2 px-2">
              {CATEGORIES_LIST.map((cat) => (
                  <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-2
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
      </div>

      {/* Scrollable Part */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-24">
        <div className="flex flex-col gap-3">
          {sortedFoods.map((food) => (
            <div key={food.id} className={`p-4 rounded-[1.8rem] shadow-sm flex justify-between items-center border transition-all ${isDark ? 'bg-gray-800 border-white/5 hover:border-primary/40' : 'bg-white border-transparent hover:border-secondary/50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${isDark ? 'bg-gray-700' : 'bg-appBg'}`}>
                  {CATEGORY_ICONS[food.category] || '🍽️'}
                </div>
                <div>
                  <p className={`font-black leading-tight text-sm ${isDark ? 'text-gray-100' : 'text-textMain'}`}>{food.name}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-textMuted'}`}>{food.servingUnit} • {(t.categories as any)[food.category]}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <p className="text-lg font-black text-primary leading-none">{food.carbsPerServing}g</p>
                  <p className="text-[8px] font-bold text-textMuted uppercase">Carbo</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </div>
          ))}
          
          {sortedFoods.length === 0 && (
            <div className="text-center py-16 flex flex-col items-center animate-in fade-in duration-700">
               <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner ${isDark ? 'bg-gray-800' : 'bg-appBg'}`}>🍽️</div>
               <p className={`font-black text-lg ${isDark ? 'text-gray-600' : 'text-textMuted'}`}>{t.noFoodAdded}</p>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={() => setIsAdding(true)}
        className="fixed bottom-28 right-8 w-16 h-16 bg-primary text-gray-900 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white/20"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsAdding(false)}></div>
           <div className={`relative w-full max-w-sm rounded-[2.5rem] p-7 shadow-2xl transition-all animate-in zoom-in-95 duration-300 ${isDark ? 'bg-gray-900 text-white border border-white/10' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black">Nuovo Alimento</h3>
                    <button onClick={() => setIsAdding(false)} className={`p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}><X size={20} /></button>
                </div>
                
                <div className="space-y-5">
                    <div>
                      <label className="text-[10px] uppercase font-black text-textMuted ml-3 mb-2 block">Nome</label>
                      <input 
                          className={`w-full border-2 border-transparent rounded-2xl p-4 font-bold outline-none focus:border-primary transition-all ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-textMain'}`}
                          value={newFood.name}
                          onChange={e => setNewFood({...newFood, name: e.target.value})}
                          placeholder="es. Pasta Integrale"
                      />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-black text-textMuted ml-3 mb-2 block">Carbo (g)</label>
                            <input 
                                type="number"
                                className={`w-full border-2 border-transparent rounded-2xl p-4 font-bold outline-none focus:border-primary transition-all ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-textMain'}`}
                                value={newFood.carbs}
                                onChange={e => setNewFood({...newFood, carbs: e.target.value})}
                                placeholder="15"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-black text-textMuted ml-3 mb-2 block">Unità</label>
                            <input 
                                className={`w-full border-2 border-transparent rounded-2xl p-4 font-bold outline-none focus:border-primary transition-all ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-textMain'}`}
                                value={newFood.unit}
                                onChange={e => setNewFood({...newFood, unit: e.target.value})}
                                placeholder="100g"
                            />
                        </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-textMuted ml-3 mb-2 block">Categoria</label>
                      <select 
                          className={`w-full border-2 border-transparent rounded-2xl p-4 font-bold outline-none focus:border-primary transition-all appearance-none ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-textMain'}`}
                          value={newFood.category}
                          onChange={e => setNewFood({...newFood, category: e.target.value as any})}
                      >
                          {CATEGORIES_LIST.filter(c => c.id !== 'all').map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                      </select>
                    </div>
                    <button 
                        onClick={handleSaveFood}
                        className="w-full bg-secondary text-gray-900 font-black py-5 rounded-[1.8rem] mt-4 shadow-xl shadow-secondary/20 active:scale-95 transition-all"
                    >
                        Salva Alimento
                    </button>
                </div>
           </div>
        </div>
      )}
    </div>
  );
};
