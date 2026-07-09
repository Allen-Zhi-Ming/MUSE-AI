import React from "react";

interface MobileEmulatorLayoutProps {
  children: React.ReactNode;
  fontFamily?: string;
  renderGlobalDeveloperSwitcher: () => React.ReactNode;
}

export function MobileEmulatorLayout({ children, fontFamily = "inherit", renderGlobalDeveloperSwitcher }: MobileEmulatorLayoutProps) {
  return (
    <div className="drag-region" style={{ 
      width: "100vw", 
      height: "100vh", 
      background: "transparent", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      overflow: "hidden",
      fontFamily
    }}>
      <div className="no-drag" style={{ 
        width: 375, 
        height: "100%", 
        maxHeight: 740, 
        background: "#fff", 
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

        <div style={{ flex: 1, display: "flex", overflow: "hidden", paddingTop: 36, position: "relative" }}>
          {children}
        </div>

        {/* Bottom Home Indicator Bar */}
        <div style={{ 
          height: 16, 
          background: "#fff", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          borderTop: "0.5px solid rgba(0,0,0,0.05)", 
          flexShrink: 0,
          zIndex: 9999 
        }}>
          <div style={{ width: 110, height: 4, borderRadius: 2, background: "#C7C7CC" }} />
        </div>
      </div>
      
      {renderGlobalDeveloperSwitcher()}
    </div>
  );
}
