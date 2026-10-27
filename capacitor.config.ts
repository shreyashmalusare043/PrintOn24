import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.printon24.app',
  appName: 'PrintOn24',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;