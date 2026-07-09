import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
  isMobileFrame: boolean;
  frameBg?: string;
  bottomBarBg?: string;
}

export function AuthLayout({ children, isMobileFrame, frameBg = "#1C1A17", bottomBarBg = "#0C0A09" }: AuthLayoutProps) {
  return (
    <div className="muse-app drag-region" style={{ width: "100vw", height: "100vh", background: isMobileFrame ? "transparent" : frameBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {isMobileFrame ? (
        <div className="no-drag" style={{ 
          width: 375, 
          height: "100%", 
          maxHeight: 740, 
          background: frameBg, 
          borderRadius: 36, 
          border: "12px solid #1C1C1E", 
          boxShadow: "0 20px 50px rgba(0,0,0,0.12)", 
          position: "relative", 
          transform: "translate(0, 0)",
          display: "flex", 
          boxSizing: "border-box",
          flexDirection: "column", 
          overflow: "hidden" 
        }}>
          {/* Top Speaker Notch */}
          <div style={{ 
            position: "absolute", 
            top: 0, 
            left: "50%", 
            transform: "translateX(-50%)", 
            width: 140, 
            height: 18, 
            background: "#1C1C1E", 
            borderBottomLeftRadius: 14, 
            borderBottomRightRadius: 14, 
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#2C2C2E" }} />
          </div>
          
          <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
            {children}
          </div>
          
          {/* Bottom Home Indicator Bar */}
          <div style={{ 
            height: 16, 
            background: bottomBarBg, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            flexShrink: 0,
            zIndex: 9999 
          }}>
            <div style={{ width: 110, height: 4, borderRadius: 2, background: "#C7C7CC" }} />
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
