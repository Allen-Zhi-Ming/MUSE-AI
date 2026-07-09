import React, { useState, useEffect } from 'react';
import MarketingPage from './MarketingPage';
import { LoginScreen } from './LoginScreen';

interface LandingPageProps {
  state: any;
  dispatch: any;
  setShowLegalModal: any;
  isMobile: boolean;
}

export const LandingPage = ({ state, dispatch, setShowLegalModal, isMobile }: LandingPageProps) => {
  const [showAuth, setShowAuth] = useState(false);
  const [locale, setLocale] = useState<'zh' | 'en' | 'ja' | 'ko'>(() => {
    const saved = localStorage.getItem('muse_locale');
    if (saved === 'en' || saved === 'zh' || saved === 'ja' || saved === 'ko') return saved;
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('ko')) return 'ko';
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('muse_locale', locale);
  }, [locale]);

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
          返回首頁
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
