export type ViewState = 'dashboard' | 'food' | 'history' | 'settings';

export interface InsulinSegment {
  startTime: string;
  endTime?: string;
  isf: number;
  icr: number;
  labelKey: string;
}

export interface UserSettings {
  userName: string;
  targetBg: number;
  isf: number;
  icr: number;
  doseStep: number;
  variableInsulinEnabled: boolean;
  insulinSegments: InsulinSegment[];
  theme: 'light' | 'dark';
  language: 'it' | 'en';
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  glucose: number;
  carbs: number;
  units: number;
  recommendedUnits?: number; // <--- NUOVO CAMPO
  type: 'bolus' | 'basal';
  mealType: string;
}

export interface FoodItem {
  id: string;
  name: string;
  carbsPerServing: number; // Carbo per 100g
  category: string;
  lastUsed: number;
}