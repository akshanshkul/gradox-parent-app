export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.28:8000/api';

export const APP_CONFIG = {
  isGlobalApp: process.env.EXPO_PUBLIC_IS_GLOBAL_APP === 'true',
  defaultSchool: {
    id: process.env.EXPO_PUBLIC_SCHOOL_ID,
    slug: process.env.EXPO_PUBLIC_SCHOOL_SLUG,
    name: process.env.EXPO_PUBLIC_SCHOOL_NAME,
    logo: process.env.EXPO_PUBLIC_SCHOOL_LOGO,
  }
};
