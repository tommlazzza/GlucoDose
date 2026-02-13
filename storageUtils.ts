// Utility per la gestione del localStorage

export const STORAGE_KEYS = {
  SETTINGS: 'gluco_settings',
  HISTORY: 'gluco_history',
  FOODS: 'gluco_foods',
  DASHBOARD_GLUCOSE: 'gluco_dashboard_glucose',
  DASHBOARD_FOODS: 'gluco_dashboard_foods',
};

/**
 * Esporta tutti i dati dell'app in un file JSON scaricabile
 */
export const exportAllData = () => {
  const data = {
    settings: localStorage.getItem(STORAGE_KEYS.SETTINGS),
    history: localStorage.getItem(STORAGE_KEYS.HISTORY),
    foods: localStorage.getItem(STORAGE_KEYS.FOODS),
    dashboardGlucose: localStorage.getItem(STORAGE_KEYS.DASHBOARD_GLUCOSE),
    dashboardFoods: localStorage.getItem(STORAGE_KEYS.DASHBOARD_FOODS),
    exportDate: new Date().toISOString(),
    version: '1.0.0'
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `glucodose-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Importa i dati da un file JSON
 */
export const importAllData = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Verifica che il file contenga i dati corretti
        if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, data.settings);
        if (data.history) localStorage.setItem(STORAGE_KEYS.HISTORY, data.history);
        if (data.foods) localStorage.setItem(STORAGE_KEYS.FOODS, data.foods);
        if (data.dashboardGlucose) localStorage.setItem(STORAGE_KEYS.DASHBOARD_GLUCOSE, data.dashboardGlucose);
        if (data.dashboardFoods) localStorage.setItem(STORAGE_KEYS.DASHBOARD_FOODS, data.dashboardFoods);
        
        resolve();
      } catch (error) {
        reject(new Error('File non valido o corrotto'));
      }
    };
    
    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
    reader.readAsText(file);
  });
};

/**
 * Cancella tutti i dati salvati (reset completo)
 */
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Ottieni la dimensione totale dei dati salvati
 */
export const getStorageSize = (): string => {
  let totalSize = 0;
  Object.values(STORAGE_KEYS).forEach(key => {
    const item = localStorage.getItem(key);
    if (item) {
      totalSize += item.length;
    }
  });
  
  // Converti in KB
  const sizeInKB = totalSize / 1024;
  
  if (sizeInKB < 1) {
    return `${totalSize} bytes`;
  } else if (sizeInKB < 1024) {
    return `${sizeInKB.toFixed(2)} KB`;
  } else {
    return `${(sizeInKB / 1024).toFixed(2)} MB`;
  }
};

/**
 * Verifica se ci sono dati salvati
 */
export const hasStoredData = (): boolean => {
  return Object.values(STORAGE_KEYS).some(key => localStorage.getItem(key) !== null);
};
