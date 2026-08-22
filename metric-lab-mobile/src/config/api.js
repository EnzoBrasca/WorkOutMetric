import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  if (__DEV__) {
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      const localIp = debuggerHost.split(':')[0];
      return `http://${localIp}:3000/api`;
    }
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  // PRODUCTION URL (Replace this with your Vercel URL once deployed)
  return 'https://metric-lab-api.vercel.app/api';
};

export const API_URL = getApiUrl();
