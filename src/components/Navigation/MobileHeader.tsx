import React from "react";

interface MobileHeaderProps {
  state: any;
  dispatch: any;
  credits: number;
  userTier: string;
  parentHub: string;
  setShowProModal: (val: boolean) => void;
  setShowMobileProjRP: (val: boolean) => void;
  showNotifCenter: boolean;
  setShowNotifCenter: (val: boolean) => void;
  theme: any;
}

export function MobileHeader({
  state, dispatch, credits, userTier, parentHub, setShowProModal, setShowMobileProjRP, showNotifCenter, setShowNotifCenter, theme: T
}: MobileHeaderProps) {
  return (
    <div style={{ 
      height: 48, 
      background: "rgba(250, 248, 245, 0.75)", 
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: `0.5px solid rgba(197, 160, 89, 0.2)`, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between",
      padding: "0 12px", 
      flexShrink: 0,
      position: "relative",
      zIndex: 100
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseBadge {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }
      `}} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button 
          onClick={() => dispatch({ type: "TOGGLE_SB" })} 
          style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 8, 
            border: "none", 
            background: "transparent", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            outline: "none",
            padding: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.text }}>
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="14" y2="18" />
          </svg>
        </button>

        {/* Elegant Left-Aligned Mobile Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, userSelect: "none" }}>
          <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13.5, fontWeight: 800, letterSpacing: 1.2, color: "#BFA366" }}>MUSE AI</span>
        </div>
      </div>

      {/* Right side: Hub label and Notification Bell */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Mobile Credits Capsule Button */}
        <div 
          onClick={() => setShowProModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255, 255, 255, 0.8)",
            border: "0.5px solid rgba(197, 160, 89, 0.35)",
            padding: "2.5px 6px",
            borderRadius: 12,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(138, 110, 62, 0.05)",
          }}
          title="靈感積分與付費計畫"
        >
          <span style={{ fontSize: 9.5, color: "#3D2E1A", fontWeight: 700, fontFamily: "monospace" }}>✨ {credits}</span>
          <span style={{ 
            fontSize: 7.5, 
            fontWeight: 800, 
            color: userTier === 'pro' ? '#fff' : (userTier === 'lite' ? '#3B82F6' : '#6B7280'), 
            background: userTier === 'pro' ? '#BFA366' : (userTier === 'lite' ? '#DBEAFE' : '#F3F4F6'),
            padding: "1px 4px",
            borderRadius: 4,
          }}>
            {userTier === 'pro' ? 'Pro' : (userTier === 'lite' ? 'Lite' : 'Free')}
          </span>
        </div>
        {state.navView === "workspace" && (
          <button
            onClick={() => setShowMobileProjRP(true)}
            style={{
              background: "rgba(197, 160, 89, 0.08)",
              border: "0.5px solid rgba(197, 160, 89, 0.25)",
              color: T.goldDark,
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 8,
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 3,
              marginRight: 4,
              outline: "none"
            }}
          >
            📊 企劃案
          </button>
        )}
        <span style={{ 
          fontSize: 9.5, 
          fontWeight: 700, 
          color: "#92400E", 
          background: "linear-gradient(135deg, #FFF3DF 0%, #FFFBEB 100%)", 
          border: "0.5px solid rgba(197, 160, 89, 0.25)",
          padding: "2.5px 7px", 
          borderRadius: 12
        }}>
          {parentHub === "workspace_hub" ? "工作" :
           parentHub === "creative_studio" ? "工坊" :
           parentHub === "mindful_growth" ? "成長" :
           parentHub === "my_persona" ? "設置" :
           state.navView === "mymuse" ? "Muse" :
           state.navView === "settings" ? "設定" : "AI"}
        </span>

        <button 
          onClick={() => setShowNotifCenter(!showNotifCenter)}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: showNotifCenter ? "rgba(197, 160, 89, 0.1)" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            outline: "none",
            padding: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: showNotifCenter ? T.goldDark : T.text }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {state.notifications?.filter((n: any) => !n.read).length > 0 && (
            <span style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: T.gold,
              border: "1px solid #fff",
              boxShadow: "0 0 6px rgba(197, 160, 89, 0.8)",
              animation: "pulseBadge 1.5s infinite"
            }} />
          )}
        </button>
      </div>
    </div>
  );
}
