require('dotenv').config();

export default ({ config }) => {
  const isGlobalApp = process.env.EXPO_PUBLIC_IS_GLOBAL_APP === 'true';
  const schoolName = process.env.EXPO_PUBLIC_SCHOOL_NAME || 'Gradox';

  // App name based on your logic: Gradox if global or fallback, otherwise School Name
  const dynamicName = isGlobalApp ? 'Gradox Parent' : schoolName;

  return {
    ...config,
    name: dynamicName,
    slug: 'gradox-parent',
    icon: './assets/logo/logo.png',
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: './assets/logo/logo.png',
        backgroundColor: '#ffffff',
      },
    },
    notification: {
      icon: './assets/logo/logo.png',
      color: '#4f46e5',
    },
    splash: {
      image: './assets/logo/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    extra: {
      ...config.extra,
      isGlobalApp,
      schoolName,
      schoolLogo: process.env.EXPO_PUBLIC_SCHOOL_LOGO,
    },
  };
};
