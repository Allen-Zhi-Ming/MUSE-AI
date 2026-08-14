import React, { useState, useEffect } from 'react';
import MarketingPage from './MarketingPage';
import {
  persistMuseLocale,
  readInitialMuseLocale,
  subscribeToSharedMuseLocale,
  type MuseLocale,
} from '../lib/musediniLocale';

export const LandingPage = () => {
  const [locale, setLocale] = useState<MuseLocale>(readInitialMuseLocale);

  useEffect(() => {
    persistMuseLocale(locale);
  }, [locale]);

  useEffect(() => subscribeToSharedMuseLocale(setLocale), []);

  return (
    <MarketingPage 
      locale={locale} 
      onLocaleChange={setLocale} 
    />
  );
};
