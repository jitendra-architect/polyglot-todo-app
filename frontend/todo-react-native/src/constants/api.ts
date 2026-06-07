import { Platform } from 'react-native';

/**
 * iOS Simulator → localhost, Android Emulator → 10.0.2.2,
 * Physical device → set your machine's LAN IP here.
 */
const LOCAL_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = `http://${LOCAL_HOST}:3000/api`;
