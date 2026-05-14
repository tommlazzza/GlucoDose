export type ViewState = 'dashboard' | 'food' | 'history' | 'settings';

export interface InsulinSegment {
  startTime: string;
  endTime: string;
  isf: number;
  icr: number;
  // Il target nei segmenti è opzionale. Se non c'è, si usa quello globale.
  target: number;
  labelKey: string;
}

export interface UserSettings {
  userName: string;
  targetBg: number; // Target Glicemico Globale (Principale)
  isf: number;
  icr: number;
  doseStep: number;
  variableInsulinEnabled: boolean; // Attiva le fasce orarie per ISF e ICR
  insulinSegments: InsulinSegment[];
  theme: 'light' | 'dark';
  language: 'it' | 'en';
  minGlucoseTarget?: number;
  maxGlucoseTarget?: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  glucose: number;
  carbs: number;
  units: number;
  recommendedUnits?: number;
  type: 'bolus';
  mealType: string;
}

export interface FoodItem {
  id: string;
  name: string;
  carbsPerServing: number; // Carbo per 100g
  category: string;
  lastUsed: number;
}

export type SelectedFoodItem = FoodItem & { uniqueId: string; weight: number };