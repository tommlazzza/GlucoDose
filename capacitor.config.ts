import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'GlucoDose',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ECF4E8",
      showSpinner: false,
      androidScaleType: "FIT_CENTRE",
      //splashFullScreen: true,
      //splashImmersive: true,
    },
  },
};

export default config;