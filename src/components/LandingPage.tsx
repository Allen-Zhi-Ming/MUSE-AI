import React, { useState, useEffect } from 'react';
import MarketingPage from './MarketingPage';
import { LoginScreen } from './LoginScreen';
import {
  persistMuseLocale,
  readInitialMuseLocale,
  subscribeToSharedMuseLocale,
  type MuseLocale,
} from '../lib/musediniLocale';

interface LandingPageProps {
  state: any;
  dispatch: any;
  setShowLegalModal: any;
  isMobile: boolean;
}

export const LandingPage = ({ state, dispatch, setShowLegalModal, isMobile }: LandingPageProps) => {
  const [showAuth, setShowAuth] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hasOAuthResponse = /(?:^|[&#])(access_token|refresh_token|error|error_description)=/.test(hash);

    return params.get('sso') === '1' || hasOAuthResponse;
  });
  const [locale, setLocale] = useState<MuseLocale>(readInitialMuseLocale);

  useEffect(() => {
    persistMuseLocale(locale);
  }, [locale]);

  useEffect(() => subscribeToSharedMuseLocale(setLocale), []);

  const backHomeLabel: Record<MuseLocale, string> = {
    zh: '返回首頁',
    'zh-Hans': '返回首页',
    en: 'Back to home',
    ja: 'ホームへ戻る',
    ko: '홈으로 돌아가기',
  };

  // If user clicks login on the marketing page, we show the actual LoginScreen
  if (showAuth) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Back Button Overlay */}
        <button 
          onClick={() => setShowAuth(false)}
          style={{
            position: 'absolute',
            top: isMobile ? 12 : 24,
            left: isMobile ? 16 : 32,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(220, 215, 206, 0.8)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: 12,
            fontWeight: 600,
            color: '#8A7A66',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(138,110,62,0.1)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#C5A059';
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
            e.currentTarget.style.color = '#8A7A66';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          {backHomeLabel[locale]}
        </button>

        {/* Original Login Screen */}
        <LoginScreen 
          state={state} 
          dispatch={dispatch} 
          setShowLegalModal={setShowLegalModal} 
          isMobile={isMobile} 
        />
      </div>
    );
  }

  return (
    <MarketingPage 
      onLoginClick={() => setShowAuth(true)} 
      locale={locale} 
      onLocaleChange={setLocale} 
    />
  );
};
