# GlucoDose

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/capacitor-%231199EE.svg?style=flat&logo=capacitor&logoColor=white)

**GlucoDose** è un'applicazione mobile ibrida open-source progettata per supportare la gestione quotidiana del diabete insulino-dipendente. Offre strumenti rapidi per il calcolo dei bolus, il tracciamento della glicemia e la gestione nutrizionale, il tutto in un'interfaccia moderna e ottimizzata per dispositivi mobili.

---

## Funzionalità Principali

* **Calcolatore Bolus Avanzato**
    * Calcolo rapido basato su glicemia attuale e carboidrati.
    * Supporto per Rapporto Insulina/Carboidrati (ICR) e Fattore di Sensibilità (ISF).
    * Gestione dell'insulina attiva (IOB) *(Planned/In-Dev)*.
* **Libreria Alimenti Personale**
    * Database personalizzabile per salvare i valori nutrizionali dei cibi frequenti.
    * Inserimento rapido dei carboidrati nel calcolatore dalla libreria.
* **Storico e Log**
    * Registro dettagliato delle misurazioni glicemiche e delle dosi somministrate.
    * Persistenza dei dati locale per garantire privacy e funzionalità offline.
* **Configurazione Granulare**
    * Personalizzazione completa dei parametri medici (Target Glicemico, Fattori di correzione).
    * Supporto per Tema Scuro (Dark Mode) nativo.

---

## Stack Tecnologico

Il progetto è costruito utilizzando moderne tecnologie web, incapsulate per l'uso nativo tramite Capacitor.

| Categoria | Tecnologia | Scopo |
| :--- | :--- | :--- |
| **Core** | [React 18](https://reactjs.org/) | Libreria UI per la costruzione dell'interfaccia |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Tipizzazione statica per robustezza del codice |
| **Build Tool** | [Vite](https://vitejs.dev/) | Bundler ultra-veloce |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Framework CSS utility-first |
| **Mobile Runtime** | [Capacitor 6](https://capacitorjs.com/) | Bridge per funzionalità native iOS/Android |
| **Icons** | [Lucide React](https://lucide.dev/) | Set di icone leggero e coerente |

---

## Installazione e Sviluppo

### Prerequisiti
* [Node.js](https://nodejs.org/) (versione 18+ raccomandata)
* [Xcode](https://developer.apple.com/xcode/) (per compilazione iOS, solo su macOS)
* [CocoaPods](https://cocoapods.org/) (per gestione dipendenze iOS)

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

---

## 📱 Compilazione per iOS

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
    * In Xcode, seleziona il dispositivo target.
    * Premi `Cmd + R` o il tasto **Play**.

---

## 📂 Struttura della Repository

```text
/src
├── components/      # Componenti UI riutilizzabili (Layout, Button, Input...)
├── views/           # Schermate principali (Dashboard, History, Settings...)
├── images/          # Asset statici e icone
├── storageUtils.ts  # Logica di persistenza dati (LocalStorage/Capacitor Prefs)
├── types.ts         # Definizioni dei tipi TypeScript
├── App.tsx          # Entry point dell'applicazione e routing
└── main.tsx         # Mounting di React
/ios                 # Progetto nativo Xcode generato
```

## DISCLAIMER MEDICO E LEGALE

**LEGGERE ATTENTAMENTE PRIMA DELL'USO O DELLO SVILUPPO**

**GlucoDose NON è un dispositivo medico certificato.**

* **Nessuna garanzia medica:** Questo software è fornito "così com'è" a solo scopo informativo, educativo e di sviluppo. Non è destinato a diagnosticare, trattare, curare o prevenire alcuna malattia.
* **Responsabilità dell'utente:** I calcoli forniti dall'applicazione sono puramente matematici e basati sui parametri inseriti dall'utente. L'utente è l'unico responsabile della verifica della correttezza dei dati inseriti e del risultato ottenuto.
* **Consultare un medico:** Non basare mai le decisioni terapeutiche (come il dosaggio dell'insulina) esclusivamente sui dati forniti da questa app. Consultare sempre il proprio medico curante o utilizzare dispositivi medici certificati (glucometri, microinfusori) per le decisioni cliniche.
* **Limitazione di responsabilità:** Lo sviluppatore e i collaboratori di questa repository declinano ogni responsabilità per danni diretti, indiretti, incidentali o consequenziali derivanti dall'uso improprio dell'applicazione o da errori nel software.

**L'utilizzo di questo codice implica l'accettazione incondizionata di questo disclaimer.**

---

## 📄 Licenza

Copyright © 2026 Tommaso Lazzarin. Tutti i diritti riservati.
