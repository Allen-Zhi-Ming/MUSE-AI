import React from "react";
import { ProjRP } from ".";

interface ProjectsDrawerProps {
  state: any;
  dispatch: any;
  showMobileProjRP: boolean;
  setShowMobileProjRP: (val: boolean) => void;
  theme: any;
}

export function ProjectsDrawer({ state, dispatch, showMobileProjRP, setShowMobileProjRP, theme: T }: ProjectsDrawerProps) {
  if (!showMobileProjRP) return null;

  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      background: "rgba(30, 24, 16, 0.4)",
      backdropFilter: "blur(8px)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end"
    }}>
      <div 
        onClick={() => setShowMobileProjRP(false)} 
        style={{ flex: 1, width: "100%" }} 
      />
      <div style={{
        width: "100%",
        height: "75%",
        background: "#FAF8F5",
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -10px 30px rgba(61, 46, 26, 0.15)",
        borderTop: "1px solid rgba(220, 215, 206, 0.8)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideUpMobile {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}} />
        <div style={{
          width: "100%",
          padding: "8px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.4)",
          borderBottom: `0.5px solid ${T.borderLight}`,
          flexShrink: 0
        }}>
          <div style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "rgba(61, 46, 26, 0.15)",
            marginBottom: 8
          }} />
          <div style={{
            width: "100%",
            padding: "0 16px",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>📊 企劃案詳情與管理</span>
            <button
              onClick={() => setShowMobileProjRP(false)}
              style={{
                border: "none",
                background: "rgba(0,0,0,0.05)",
                borderRadius: "50%",
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                cursor: "pointer",
                color: T.textGhost
              }}
            >
              ✕
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <ProjRP state={state} dispatch={dispatch} isMobile={true} />
        </div>
      </div>
    </div>
  );
}
