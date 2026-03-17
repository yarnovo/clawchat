import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clawchat.app',
  appName: 'ClawChat',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
    // 开发调试：指向 Vite dev server（需先 make dev）
    url: 'http://192.168.18.197:5173',
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
