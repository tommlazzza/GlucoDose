
import { FoodItem, UserSettings, InsulinSegment } from './types';

export const DEFAULT_INSULIN_SEGMENTS: InsulinSegment[] = [
  { startTime: '00:00', labelKey: 'night', isf: 50, icr: 10.1 },
  { startTime: '05:00', labelKey: 'morning', isf: 50, icr: 10.1 },
  { startTime: '09:00', labelKey: 'beforeLunch', isf: 50, icr: 10.1 },
  { startTime: '11:00', labelKey: 'lunch', isf: 50, icr: 10.1 },
  { startTime: '13:00', labelKey: 'afterLunch', isf: 50, icr: 10.1 },
  { startTime: '18:00', labelKey: 'evening', isf: 50, icr: 10.1 },
  { startTime: '22:00', labelKey: 'bedtime', isf: 50, icr: 10.1 },
];

export const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Nome',
  isf: 50,
  icr: 10,
  targetBg: 100,
  doseStep: 0.5,
  language: 'it',
  theme: 'light',
  variableInsulinEnabled: false,
  insulinSegments: DEFAULT_INSULIN_SEGMENTS,
};

export const CATEGORY_ICONS: Record<string, string> = {
  grain: '🍞',
  fruit: '🍎',
  vegetable: '🥦',
  dairy: '🥛',
  protein: '🍗',
  sweet: '🍩',
  all: '🥗'
};

export const TRANSLATIONS = {
  it: {
    home: 'Home',
    food: 'Alimenti',
    history: 'Cronologia',
    settings: 'Impostazioni',
    morning: 'Mattina',
    afternoon: 'Pomeriggio',
    evening: 'Sera',
    night: 'Notte',
    beforeLunch: 'Pre-Pranzo',
    lunch: 'Pranzo',
    afterLunch: 'Post-Pranzo',
    bedtime: 'Prima di dormire',
    glucose: 'Glicemia',
    mealContent: 'Contenuto Pasto',
    totalCarbs: 'Carbo Totali',
    noFoodAdded: 'Nessun alimento aggiunto.',
    addFood: 'Cibo',
    units: 'Unità',
    calculate: 'Calcola Dose',
    recommendedBolus: 'Bolo Consigliato',
    confirmLog: 'Conferma e Log',
    search: 'Cerca...',
    quantity: 'Quantità',
    grams: 'Grammi / ml',
    foodLibrary: 'Libreria Alimenti',
    profile: 'Profilo e Impostazioni',
    yourName: 'Il tuo nome',
    penPrecision: 'Precisione Penna',
    saveProfile: 'Salva Profilo',
    activeInsulin: 'Insulina Attiva',
    glucoseTrend: 'Andamento Glucosio',
    myDay: 'Il mio Giorno',
    export: 'Esporta',
    monitoring: 'Monitoraggio',
    language: 'Lingua',
    theme: 'Tema',
    light: 'Chiaro',
    dark: 'Scuro',
    target: 'Target',
    correction: 'Correzione',
    meal: 'Pasto',
    variableInsulin: 'Impostazioni Insulina Variabile',
    variableInsulinDesc: 'Imposta sensibilità e rapporti diversi per momenti della giornata.',
    time: 'Orario',
    isfLabel: 'Sensibilità (ISF)',
    icrLabel: 'Rapporto (ICR)',
    activityWarning: 'Se hai pianificato attività fisica, è consigliato diminuire manualmente la dose.',
    categories: {
      grain: 'Cereali',
      fruit: 'Frutta',
      vegetable: 'Verdura',
      dairy: 'Latticini',
      protein: 'Proteine',
      sweet: 'Dolci',
      all: 'Tutti'
    }
  }
};

export const MOCK_FOODS: FoodItem[] = [
  { id: '1', name: 'Pasta Integrale', carbsPerServing: 70, servingUnit: '100g', category: 'grain', color: '#FDE68A' },
  { id: '2', name: 'Pane di Segale', carbsPerServing: 48, servingUnit: '100g', category: 'grain', color: '#FDE68A' },
  { id: '3', name: 'Riso Basmati', carbsPerServing: 77, servingUnit: '100g', category: 'grain', color: '#FDE68A' },
  { id: '4', name: 'Mela con buccia', carbsPerServing: 14, servingUnit: '100g', category: 'fruit', color: '#FCA5A5' },
  { id: '5', name: 'Banana', carbsPerServing: 23, servingUnit: '100g', category: 'fruit', color: '#FCA5A5' },
  { id: '6', name: 'Broccoli', carbsPerServing: 7, servingUnit: '100g', category: 'vegetable', color: '#ABE7B2' },
  { id: '7', name: 'Latte Intero', carbsPerServing: 5, servingUnit: '100ml', category: 'dairy', color: '#BFDBFE' },
  { id: '8', name: 'Yogurt Greco', carbsPerServing: 4, servingUnit: '100g', category: 'dairy', color: '#BFDBFE' },
  { id: '9', name: 'Cioccolato Fondente', carbsPerServing: 45, servingUnit: '100g', category: 'sweet', color: '#F472B6' },
];

export const MOCK_HISTORY: [] = [];
