import React from "react";

interface DesktopTopbarProps {
  dispatch: any;
  userTier: string;
  credits: number;
  setShowProModal: (v: boolean) => void;
  isMobileFrame: boolean;
  setIsMobileFrame: (v: boolean) => void;
  theme: any;
}

export function DesktopTopbar({ 
  dispatch, 
  userTier, 
  credits, 
  setShowProModal, 
  isMobileFrame, 
  setIsMobileFrame, 
  theme: T 
}: DesktopTopbarProps) {
  return (
    <div className="drag-region" style={{ height: 50, background: T.bgCard, borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
      {/* Fine-line Hamburger Menu Toggle */}
      <button 
        className="no-drag"
        onClick={() => dispatch({ type: "TOGGLE_SB" })}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 4,
          outline: "none",
          color: T.textGhost,
          marginRight: 4
        }}
        onMouseEnter={e => { e.currentTarget.style.color = T.text; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.textGhost; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Gold Cube Icon and Georgia Muse AI Text */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BFA366" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15, fontWeight: 800, letterSpacing: 1.2, color: "#BFA366", marginLeft: 2 }}>Muse AI</span>
      </div>
      
      <div style={{ flex: 1 }} />
      
      {/* Credits & Subscription Capsule Button */}
      <div 
        className="no-drag"
        onClick={() => setShowProModal(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255, 255, 255, 0.8)",
          border: "1px solid rgba(197, 160, 89, 0.35)",
          padding: "3px 10px",
          borderRadius: 20,
          marginRight: 8,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(138, 110, 62, 0.05)",
          transition: "all 0.2s"
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.025)"; e.currentTarget.style.borderColor = "#BFA366"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "rgba(197, 160, 89, 0.35)"; }}
        title="靈感積分與付費計畫訂閱中心"
      >
        <span style={{ fontSize: 11.5, color: "#3D2E1A", fontWeight: 700, fontFamily: "monospace" }}>✨ {credits} 點</span>
        <span style={{ 
          fontSize: 8.5, 
          fontWeight: 800, 
          color: userTier === 'pro' ? '#fff' : (userTier === 'lite' ? '#3B82F6' : '#6B7280'), 
          background: userTier === 'pro' ? '#BFA366' : (userTier === 'lite' ? '#DBEAFE' : '#F3F4F6'),
          padding: "1px 6px",
          borderRadius: 6,
          textTransform: "uppercase"
        }}>
          {userTier === 'pro' ? 'Pro 👑' : (userTier === 'lite' ? 'Lite ⚡' : 'Free ☕')}
        </span>
      </div>

      {/* Mobile Viewport Toggle Button */}
      <button 
        className="no-drag"
        onClick={() => {
          const nextFrame = !isMobileFrame;
          setIsMobileFrame(nextFrame);
          // Open sidebar by default when toggling back to desktop, close in mobile
          dispatch({ type: "SET_SB_OPEN", open: !nextFrame });
          if (nextFrame) {
            dispatch({ type: "SET_PV_OPEN", open: false });
            (window as any).museAPI?.windowAction('resize', { width: 450, height: 850, center: true });
          } else {
            (window as any).museAPI?.windowAction('resize', { width: 1200, height: 800, center: true });
          }
        }}
        title={isMobileFrame ? "切換至電腦版" : "切換至手機模擬版"}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: `1px solid ${isMobileFrame ? T.gold : T.border}`,
          background: isMobileFrame ? "#FFFBEB" : "#fff",
          color: isMobileFrame ? T.goldDark : T.textGhost,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isMobileFrame ? "0 1px 3px rgba(138,110,62,0.1)" : "none",
          transition: "all 0.15s ease",
          outline: "none",
          padding: 0
        }}
      >
        {isMobileFrame ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2.5" ry="2.5" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        )}
      </button>

      <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.1)", margin: "0 8px" }} />

      {/* Windows Controls */}
      <div className="no-drag" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button 
          onClick={() => (window as any).museAPI?.windowAction('minimize')}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          title="最小化"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button 
          onClick={() => (window as any).museAPI?.windowAction('maximize')}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          title="放大/還原"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
        </button>
        <button 
          onClick={() => (window as any).museAPI?.windowAction('close')}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#666"; }}
          title="關閉"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  );
}
