// storageNative.ts - Storage nativo per iOS con Capacitor
// Usa UserDefaults su iOS e SharedPreferences su Android

import { Preferences } from '@capacitor/preferences';

export const STORAGE_KEYS = {
  SETTINGS: 'gluco_settings',
  HISTORY: 'gluco_history',
  FOODS: 'gluco_foods',
  DASHBOARD_GLUCOSE: 'gluco_dashboard_glucose',
  DASHBOARD_FOODS: 'gluco_dashboard_foods',
};

/**
 * Salva un valore (automaticamente serializza JSON)
 */
export const setItem = async (key: string, value: any): Promise<void> => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await Preferences.set({
      key,
      value: stringValue,
    });
  } catch (error) {
    console.error('Error saving to native storage:', error);
    throw error;
  }
};

/**
 * Recupera un valore (automaticamente deserializza JSON)
 */
export const getItem = async (key: string): Promise<any> => {
  try {
    const { value } = await Preferences.get({ key });
    
    if (!value) return null;
    
    // Prova a parsare come JSON
    try {
      return JSON.parse(value);
    } catch {
      // Se non è JSON, ritorna la stringa
      return value;
    }
  } catch (error) {
    console.error('Error reading from native storage:', error);
    return null;
  }
};

/**
 * Rimuovi un valore
 */
export const removeItem = async (key: string): Promise<void> => {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error('Error removing from native storage:', error);
    throw error;
  }
};

/**
 * Cancella tutti i dati
 */
export const clear = async (): Promise<void> => {
  try {
    await Preferences.clear();
  } catch (error) {
    console.error('Error clearing native storage:', error);
    throw error;
  }
};

/**
 * Ottieni tutte le chiavi
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    const { keys } = await Preferences.keys();
    return keys;
  } catch (error) {
    console.error('Error getting keys from native storage:', error);
    return [];
  }
};

/**
 * Migra i dati da localStorage a storage nativo
 * Utile quando converti una PWA in app nativa
 */
export const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    // Controlla se ci sono dati in localStorage
    const keysToMigrate = Object.values(STORAGE_KEYS);
    
    for (const key of keysToMigrate) {
      const value = localStorage.getItem(key);
      if (value) {
        await setItem(key, value);
        console.log(`Migrated ${key} to native storage`);
      }
    }
    
    console.log('Migration from localStorage completed');
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

/**
 * Esporta tutti i dati in un file JSON
 */
export const exportAllData = async (): Promise<string> => {
  const data: Record<string, any> = {
    exportDate: new Date().toISOString(),
    version: '1.0.0',
  };
  
  for (const key of Object.values(STORAGE_KEYS)) {
    const value = await getItem(key);
    if (value) {
      data[key] = value;
    }
  }
  
  return JSON.stringify(data, null, 2);
};

/**
 * Importa dati da un JSON
 */
export const importAllData = async (jsonData: string): Promise<void> => {
  try {
    const data = JSON.parse(jsonData);
    
    for (const [key, value] of Object.entries(data)) {
      if (Object.values(STORAGE_KEYS).includes(key)) {
        await setItem(key, value);
      }
    }
    
    console.log('Data import completed');
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('File non valido o corrotto');
  }
};

/**
 * Ottieni la dimensione approssimativa dei dati salvati
 */
export const getStorageSize = async (): Promise<string> => {
  let totalSize = 0;
  
  for (const key of Object.values(STORAGE_KEYS)) {
    const value = await getItem(key);
    if (value) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      totalSize += stringValue.length;
    }
  }
  
  // Converti in KB/MB
  const sizeInKB = totalSize / 1024;
  
  if (sizeInKB < 1) {
    return `${totalSize} bytes`;
  } else if (sizeInKB < 1024) {
    return `${sizeInKB.toFixed(2)} KB`;
  } else {
    return `${(sizeInKB / 1024).toFixed(2)} MB`;
  }
};
