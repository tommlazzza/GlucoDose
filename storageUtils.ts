import jsPDF from 'jspdf';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// --- INTERFACCE ---
interface InsulinSegment {
  startTime: string;
  endTime: string;
  target: number;
  isf: number;
  icr: number;
}

interface AppSettings {
  userName?: string;
  variableInsulinEnabled?: boolean;
  insulinSegments?: InsulinSegment[];
  targetBg?: number;
  isf?: number;
  icr?: number;
  doseStep?: number;
  minGlucoseTarget?: number;
  maxGlucoseTarget?: number;
}

interface HistoryItem {
  timestamp: string | Date;
  currentBg?: number;
  carbs?: number;
  totalDose?: number;
  units?: number;
  glucose?: number;
}

export const STORAGE_KEYS = {
  SETTINGS: 'gluco_settings',
  HISTORY: 'gluco_history',
  FOODS: 'gluco_foods',
  DASHBOARD_GLUCOSE: 'gluco_dashboard_glucose',
  DASHBOARD_FOODS: 'gluco_dashboard_foods',
};

/**
 * 1. ESPORTAZIONE PDF (SOLO FILE .PDF)
 * Senza loghi o immagini.
 */
export const exportAllDataAsPDF = async (periodDays: number = 30) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // Colori
    const primaryBlue: [number, number, number] = [41, 128, 185];
    const lightBlue: [number, number, number] = [174, 214, 241];
    const darkGray: [number, number, number] = [52, 73, 94];
    const lightGray: [number, number, number] = [236, 240, 241];

    // Helper: Header
    const addHeader = () => {
      // Titolo App (Allineato a sinistra)
      doc.setTextColor(...primaryBlue);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('GlucoDose', 15, 23);

      // Sottotitolo
      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Report Personale Diabete', 15, 28);

      // Data esportazione
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const dateStr = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(dateStr, pageWidth - 15, 23, { align: 'right' });

      // Linea separatore
      doc.setDrawColor(...lightBlue);
      doc.setLineWidth(0.5);
      doc.line(15, 33, pageWidth - 15, 33);
      yPosition = 43;
    };

    const addNewPage = () => {
      doc.addPage();
      yPosition = 20;
      addHeader();
    };

    const checkSpace = (needed: number) => {
      if (yPosition + needed > pageHeight - 20) {
        addNewPage();
        return true;
      }
      return false;
    };

    const addSection = (title: string) => {
      checkSpace(15);
      doc.setFillColor(...lightBlue);
      doc.roundedRect(15, yPosition - 5, pageWidth - 30, 10, 2, 2, 'F');
      doc.setTextColor(...primaryBlue);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, yPosition + 1);
      yPosition += 12;
    };

    const addField = (label: string, value: string, bold = false) => {
      checkSpace(7);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text(label + ':', 20, yPosition);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(value, 80, yPosition);
      yPosition += 7;
    };

    const addTable = (headers: string[], rows: string[][]) => {
      checkSpace(15 + rows.length * 8);
      const currentY = yPosition;
      const colWidth = (pageWidth - 40) / headers.length;

      doc.setFillColor(...primaryBlue);
      doc.rect(20, currentY, pageWidth - 40, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      headers.forEach((header, i) => {
        doc.text(header, 22 + i * colWidth, currentY + 5.5);
      });

      yPosition = currentY + 8;

      rows.forEach((row, rowIndex) => {
        if (rowIndex % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(20, yPosition, pageWidth - 40, 7, 'F');
        }
        doc.setTextColor(...darkGray);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        row.forEach((cell, i) => {
          const text = cell && cell.length > 30 ? cell.substring(0, 27) + '...' : (cell || '-');
          doc.text(text, 22 + i * colWidth, yPosition + 5);
        });
        yPosition += 7;
      });
      yPosition += 5;
    };

    // --- LOGICA DATI PDF ---
    addHeader();

    const settingsRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const settings: AppSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const historyRaw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    let history: HistoryItem[] = historyRaw ? JSON.parse(historyRaw) : [];

    history = history.map(h => ({
      ...h,
      currentBg: h.currentBg || h.glucose,
      totalDose: h.totalDose || h.units
    }));

    if (periodDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);
      cutoffDate.setHours(0, 0, 0, 0);
      history = history.filter((h) => new Date(h.timestamp) >= cutoffDate);
    }

    addSection('Informazioni Paziente');
    addField('Nome', settings.userName || 'Non specificato');
    addField('Data Report', new Date().toLocaleDateString('it-IT'));

    let periodLabel = 'Tutti i dati';
    if (periodDays === 7) periodLabel = 'Ultimi 7 giorni';
    else if (periodDays === 30) periodLabel = 'Ultimo mese';
    else if (periodDays === 90) periodLabel = 'Ultimi 3 mesi';
    else if (periodDays === 365) periodLabel = 'Ultimo anno';
    addField('Periodo Analizzato', periodLabel);
    yPosition += 5;

    addSection('Parametri Terapeutici');
    if (settings.variableInsulinEnabled && settings.insulinSegments && settings.insulinSegments.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(...darkGray);
      doc.text('Terapia a fasce orarie:', 20, yPosition);
      yPosition += 8;
      const headers = ['Orario', 'Target', 'ISF', 'ICR'];
      const rows = settings.insulinSegments.map(seg => [
        `${seg.startTime} - ${seg.endTime}`, `${seg.target}`, `${seg.isf}`, `${seg.icr}`
      ]);
      addTable(headers, rows);
    } else {
      addField('Target Glicemico', `${settings.targetBg || 100} mg/dL`, true);
      addField('ISF', settings.isf?.toString() || '-');
      addField('ICR', settings.icr?.toString() || '-');
    }
    yPosition += 5;

    addSection('Obiettivi');
    const minT = settings.minGlucoseTarget || 70;
    const maxT = settings.maxGlucoseTarget || 180;
    addField('Range Target', `${minT} - ${maxT} mg/dL`, true);
    yPosition += 5;

    if (history.length > 0) {
      addSection('Statistiche (TIR)');
      const validReadings = history.filter(h => h.currentBg && h.currentBg > 0);
      if (validReadings.length > 0) {
        const inRange = validReadings.filter(h => h.currentBg! >= minT && h.currentBg! <= maxT).length;
        const low = validReadings.filter(h => h.currentBg! < minT).length;
        const high = validReadings.filter(h => h.currentBg! > maxT).length;
        const total = validReadings.length;

        const tir = ((inRange / total) * 100).toFixed(1);
        const tLow = ((low / total) * 100).toFixed(1);
        const tHigh = ((high / total) * 100).toFixed(1);
        const sumBg = validReadings.reduce((acc, curr) => acc + (curr.currentBg || 0), 0);
        const avgBg = (sumBg / total).toFixed(0);

        checkSpace(35);

        const drawStatBox = (x: number, title: string, val: string, color: [number, number, number]) => {
          doc.setDrawColor(...color);
          doc.setLineWidth(1.5);
          doc.roundedRect(x, yPosition, 50, 20, 2, 2);
          doc.setTextColor(...color);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(val + '%', x + 25, yPosition + 10, { align: 'center' });
          doc.setTextColor(...darkGray);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(title, x + 25, yPosition + 16, { align: 'center' });
        };

        drawStatBox(20, 'Sotto Range', tLow, [231, 76, 60]); // Rosso
        drawStatBox(85, 'In Range', tir, [39, 174, 96]);    // Verde
        drawStatBox(150, 'Sopra Range', tHigh, [230, 126, 34]); // Arancio

        yPosition += 30;
        addField('Media Glicemica', `${avgBg} mg/dL`, true);
        addField('Totale Rilevazioni', total.toString());
      } else {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Dati insufficienti per le statistiche.', 20, yPosition);
        yPosition += 10;
      }
    }

    if (history.length > 0) {
      addSection('Diario (Ultimi inserimenti)');
      const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const slicedHistory = sortedHistory.slice(0, 50);
      const headers = ['Data/Ora', 'Glicemia', 'CHO', 'Dose'];
      const rows = slicedHistory.map(h => {
        const d = new Date(h.timestamp);
        return [
          d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          h.currentBg ? `${Math.round(h.currentBg)}` : '-',
          h.carbs ? `${h.carbs}g` : '-',
          h.totalDose ? `${h.totalDose}U` : '-'
        ];
      });
      addTable(headers, rows);
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${i} di ${pageCount} - Generato con GlucoDose`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    const pdfOutput = doc.output('datauristring');
    const base64Data = pdfOutput.split(',')[1];
    const fileName = `GlucoDose_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      await Share.share({
        title: 'Report Diabete',
        text: 'Ecco il mio report GlucoDose',
        url: result.uri,
        dialogTitle: 'Condividi PDF'
      });

      return { success: true, path: result.uri };
    } else {
      doc.save(fileName);
      return { success: true, path: 'download' };
    }

  } catch (error) {
    console.error("Errore esportazione PDF:", error);
    throw error;
  }
};

/**
 * 2. ESPORTAZIONE JSON (BACKUP)
 * Questa funzione crea un file .json
 */
export const exportAllData = async () => {
  try {
    const data = {
      settings: localStorage.getItem(STORAGE_KEYS.SETTINGS),
      history: localStorage.getItem(STORAGE_KEYS.HISTORY),
      foods: localStorage.getItem(STORAGE_KEYS.FOODS),
      dashboardGlucose: localStorage.getItem(STORAGE_KEYS.DASHBOARD_GLUCOSE),
      dashboardFoods: localStorage.getItem(STORAGE_KEYS.DASHBOARD_FOODS),
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    const jsonString = JSON.stringify(data, null, 2);
    // IMPORTANTE: Estensione .json
    const fileName = `glucodose-backup-${new Date().toISOString().slice(0, 10)}.json`;

    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: 'GlucoDose Backup',
        url: result.uri,
        dialogTitle: 'Salva Backup'
      });

      return { success: true, path: result.uri };
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, path: 'browser-download' };
    }
  } catch (error) {
    console.error('Errore export JSON:', error);
    throw error;
  }
};

/**
 * 3. IMPORTAZIONE JSON
 */
export const importAllData = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.version && !data.settings) {
          throw new Error('Formato backup non valido');
        }

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
 * UTILS
 */
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

export const getStorageSize = (): string => {
  let totalSize = 0;
  Object.values(STORAGE_KEYS).forEach(key => {
    const item = localStorage.getItem(key);
    if (item) {
      totalSize += item.length * 2;
    }
  });

  const sizeInKB = totalSize / 1024;
  if (sizeInKB < 1) return `${totalSize} bytes`;
  if (sizeInKB < 1024) return `${sizeInKB.toFixed(2)} KB`;
  return `${(sizeInKB / 1024).toFixed(2)} MB`;
};

export const hasStoredData = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEYS.SETTINGS) || !!localStorage.getItem(STORAGE_KEYS.HISTORY);
};