import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medassist.app',
  appName: 'MedAssist',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Experience #1: Allow navigation to your Vercel domain for API calls
    allowNavigation: [
      'med-assist2-0.vercel.app',
      'generativelanguage.googleapis.com', // For Google Gemini API
      'firebasestorage.googleapis.com',    // For Firebase Storage
      '*.firebaseio.com',
      '*.googleapis.com'
    ]
  }
};

export default config;