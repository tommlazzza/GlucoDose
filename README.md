# GlucoDose

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/capacitor-%231199EE.svg?style=flat&logo=capacitor&logoColor=white)

**GlucoDose** è un'applicazione mobile ibrida progettata per supportare la gestione quotidiana del diabete insulino-dipendente. Offre strumenti avanzati per il calcolo dei bolus, il tracciamento della glicemia e la gestione nutrizionale, combinando un'interfaccia moderna con algoritmi precisi per la stima dell'insulina attiva.

---

## 🚀 Funzionalità Principali

### 🧮 Calcolatore Bolus Intelligente
* **Calcolo Integrato**: Determina la dose suggerita combinando i carboidrati del pasto e la correzione della glicemia attuale.
* **Insulina Attiva (IOB)**: Sottrazione automatica dell'insulina residua dai precedenti boli per prevenire l'ipoglicemia da accumulo (*stacking*).
* **Safety Checks**: Rilevamento di insulina non registrata e validazione dei range glicemici di sicurezza (20-600 mg/dL).
* **Precisione Penna**: Supporto configurabile per incrementi di dose da 0.5 U o 1.0 U.

### ⚙️ Personalizzazione Avanzata (Fasce Orarie)
* **Profilo Variabile**: Possibilità di configurare diversi parametri medici (ICR, ISF, Target) in base all'orario della giornata (es. Colazione, Pranzo, Cena, Notte).
* **Target Range**: Definizione personalizzata delle soglie di ipo e iperglicemia per la visualizzazione grafica.

### 📊 Analisi e Monitoraggio
* **Dashboard Interattiva**: Visualizzazione immediata dell'ultima glicemia valida e del trend.
* **Grafici IOB e Glicemia**: Curve di decadimento dell'insulina in tempo reale e storico glicemico giornaliero visualizzati tramite grafici interattivi.
* **Diario Dettagliato**: Log completo di carboidrati, glicemie, unità somministrate e consigliate, con analisi per fasce orarie.

### 💾 Gestione Dati
* **Database Alimenti**: Libreria personalizzabile con calcolo automatico dei carboidrati in base al peso (g) o volume (ml).
* **Backup Locale**: Funzionalità di esportazione e importazione dati (JSON) per backup sicuri o trasferimento tra dispositivi.
* **Privacy First**: Tutti i dati risiedono localmente sul dispositivo.

---

## 📐 Algoritmi e Modelli Matematici

GlucoDose utilizza modelli matematici deterministici per garantire la sicurezza e la prevedibilità del calcolo.

### 1. Formula del Calcolo Bolus
Il calcolo della dose totale raccomandata segue la logica standard della terapia funzionale, integrata con la gestione dell'insulina attiva:

$$Dose_{totale} = (Bolus_{pasto} + Bolus_{correzione}) - IOB$$

Dove:
* **Bolus Pasto**: $\frac{\text{Carboidrati Totali (g)}}{\text{ICR}}$
* **Bolus Correzione**: $\frac{\text{Glicemia Attuale} - \text{Target}}{\text{ISF}}$ *(Calcolato solo se Glicemia > Target)*
* **IOB**: Insulina Attiva calcolata al momento attuale.

### 2. Modello di Decadimento Insulina (IOB)
Per stimare l'insulina ancora attiva nel corpo (Insulin On Board), l'applicazione utilizza una **curva di decadimento quadratico**. Questo modello approssima la farmacocinetica degli analoghi rapidi dell'insulina.

La formula implementata nel codice è basata su una durata d'azione di 4 ore (240 minuti):

```typescript
const duration = 240; // Durata azione insulina in minuti
const progress = minutesSinceInjection / duration;
const remainingFactor = Math.pow(1 - progress, 2);

activeInsulin = injectedUnits * remainingFactor;
```

* Se il tempo trascorso supera i 240 minuti, l'insulina attiva è considerata 0.
* La curva è utilizzata sia per la sottrazione nel calcolatore che per la visualizzazione grafica nell'area *History*.

### 3. Logica delle Fasce Orarie
Il sistema seleziona dinamicamente i parametri **ICR** (Rapporto Insulina/Carboidrati) e **ISF** (Fattore di Sensibilità) basandosi sull'orario corrente del dispositivo.
1.  L'algoritmo ordina i segmenti temporali configurati dall'utente.
2.  Identifica il segmento attivo confrontando i minuti correnti (dalla mezzanotte) con gli intervalli di *Start Time* ed *End Time*.

---

## 🛠 Stack Tecnologico

Il progetto è costruito utilizzando moderne tecnologie web, incapsulate per l'uso nativo tramite Capacitor.

| Categoria | Tecnologia | Scopo |
| :--- | :--- | :--- |
| **Core** | React 18 | Libreria UI per la costruzione dell'interfaccia |
| **Language** | TypeScript | Tipizzazione statica per robustezza del codice e dei calcoli |
| **Build Tool** | Vite | Bundler ultra-veloce |
| **Styling** | Tailwind CSS | Framework CSS utility-first per design responsivo e Dark Mode |
| **Charts** | Recharts | Libreria per la visualizzazione dei dati e curve IOB |
| **Mobile Runtime** | Capacitor 6 | Bridge per funzionalità native iOS/Android |
| **Icons** | Lucide React | Set di icone leggero e coerente |

---

## 📦 Installazione e Sviluppo

### Prerequisiti
* **Node.js** (versione 18+ raccomandata)
* **Xcode** (per compilazione iOS, solo su macOS)
* **CocoaPods** (per gestione dipendenze iOS)

### Setup del Progetto

1.  **Clona la repository**
    ```bash
    git clone [https://github.com/tommlazzza/glucodose.git](https://github.com/tommlazzza/glucodose.git)
    cd glucodose
    ```

2.  **Installa le dipendenze**
    ```bash
    npm install
    ```

3.  **Avvia il server di sviluppo locale**
    ```bash
    npm run dev
    ```
    L'app sarà accessibile all'indirizzo `http://localhost:5173`.

### 📱 Compilazione per iOS
Per eseguire l'app su un simulatore o su un dispositivo fisico (iPhone/iPad):

1.  **Build della web app**
    Genera la cartella `dist` ottimizzata per la produzione.
    ```bash
    npm run build
    ```

2.  **Sincronizzazione con Capacitor**
    Copia i web asset nella cartella nativa `ios/`.
    ```bash
    npx cap sync
    ```

3.  **Apertura in Xcode**
    ```bash
    npx cap open ios
    ```

4.  **Esecuzione**
    In Xcode, seleziona il dispositivo target.
    Premi `Cmd + R` o il tasto Play.

---

## ⚠️ DISCLAIMER MEDICO E LEGALE

> **LEGGERE ATTENTAMENTE PRIMA DELL'USO O DELLO SVILUPPO**

**GlucoDose NON è un dispositivo medico certificato.**

1.  **Nessuna garanzia medica**: Questo software è fornito "così com'è" a solo scopo informativo, educativo e di sviluppo open-source. Non è destinato a diagnosticare, trattare, curare o prevenire alcuna malattia.
2.  **Responsabilità dell'utente**: I calcoli forniti dall'applicazione sono puramente matematici e basati esclusivamente sui parametri inseriti dall'utente. L'utente è l'unico responsabile della verifica della correttezza dei dati (ICR, ISF, Carboidrati) e del risultato ottenuto.
3.  **Consultare un medico**: Non basare mai le decisioni terapeutiche (come il dosaggio dell'insulina) esclusivamente sui dati forniti da questa app. Consultare sempre il proprio medico curante o utilizzare dispositivi medici certificati (glucometri, microinfusori) per le decisioni cliniche.
4.  **Limitazione di responsabilità**: Lo sviluppatore e i collaboratori di questa repository declinano ogni responsabilità per danni diretti, indiretti, incidentali o consequenziali derivanti dall'uso improprio dell'applicazione, da bug del software o da errori di calcolo.

**L'utilizzo di questo codice implica l'accettazione incondizionata di questo disclaimer.**

---

## 📄 Licenza

Copyright © 2026 Tommaso Lazzarin. Tutti i diritti riservati.
