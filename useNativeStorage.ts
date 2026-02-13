// useNativeStorage.ts - Hook per storage nativo iOS/Android
import { useState, useEffect, useCallback } from 'react';
import * as NativeStorage from './storageNative';

/**
 * Hook per salvare/caricare dati da storage nativo
 * Simile a useState ma con persistenza automatica
 */
export function useNativeStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Carica il valore all'inizio
  useEffect(() => {
    const loadValue = async () => {
      try {
        const value = await NativeStorage.getItem(key);
        if (value !== null) {
          setStoredValue(value);
        }
      } catch (error) {
        console.error(`Error loading ${key}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [key]);

  // Salva quando il valore cambia
  useEffect(() => {
    if (!isLoading) {
      const saveValue = async () => {
        try {
          await NativeStorage.setItem(key, storedValue);
        } catch (error) {
          console.error(`Error saving ${key}:`, error);
        }
      };

      saveValue();
    }
  }, [key, storedValue, isLoading]);

  // Funzione per aggiornare il valore
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prevValue => {
      const newValue = value instanceof Function ? value(prevValue) : value;
      return newValue;
    });
  }, []);

  return [storedValue, setValue, isLoading] as const;
}

/**
 * Hook per gestire array con storage nativo
 */
export function useNativeStorageArray<T>(key: string, initialValue: T[] = []) {
  const [array, setArray, isLoading] = useNativeStorage<T[]>(key, initialValue);

  const addItem = useCallback((item: T) => {
    setArray(prev => [...prev, item]);
  }, [setArray]);

  const removeItem = useCallback((index: number) => {
    setArray(prev => prev.filter((_, i) => i !== index));
  }, [setArray]);

  const updateItem = useCallback((index: number, item: T) => {
    setArray(prev => prev.map((val, i) => (i === index ? item : val)));
  }, [setArray]);

  const clear = useCallback(() => {
    setArray([]);
  }, [setArray]);

  return {
    array,
    setArray,
    addItem,
    removeItem,
    updateItem,
    clear,
    isLoading,
  };
}
