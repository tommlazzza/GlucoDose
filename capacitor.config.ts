import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'GlucoDose',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,      // Dura 2 secondi
      backgroundColor: "#ECF4E8",    // Colore di sfondo
      showSpinner: false,            // Nasconde la rotella di caricamento (opzionale)
      androidScaleType: "CENTER_CROP", // <--- IL TRUCCO MAGICO
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;