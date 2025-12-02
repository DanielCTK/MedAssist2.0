import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medassist.app',
  appName: 'MedAssist',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;