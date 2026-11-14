import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.instacleaner.unfollowmanager',
  appName: 'Insta Cleaner',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'instagram.com',
      '*.instagram.com',
      'play.google.com',
    ],
  },
  android: {
    backgroundColor: '#0B1020',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
