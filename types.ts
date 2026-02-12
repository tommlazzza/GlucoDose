
export interface InsulinSegment {
  startTime: string; // HH:mm
  labelKey: string;
  isf: number;
  icr: number;
}

export interface UserSettings {
  userName: string;
  isf: number; // Fallback se variabile è disattivato
  icr: number; // Fallback se variabile è disattivato
  targetBg: number;
  doseStep: 0.5 | 1.0;
  language: 'it' | 'en';
  theme: 'light' | 'dark';
  variableInsulinEnabled: boolean;
  insulinSegments: InsulinSegment[];
}

export interface FoodItem {
  id: string;
  name: string;
  carbsPerServing: number;
  servingUnit: string;
  category: 'fruit' | 'vegetable' | 'grain' | 'dairy' | 'protein' | 'sweet';
  color: string;
  lastUsed?: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  glucose: number;
  carbs: number;
  units: number;
  type: 'bolus' | 'basal';
  mealType: string;
}

export type ViewState = 'dashboard' | 'food' | 'history' | 'settings';
