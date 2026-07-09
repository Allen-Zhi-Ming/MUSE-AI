import React from "react";

interface DesktopLayoutProps {
  topbar: React.ReactNode;
  children: React.ReactNode;
  modals?: React.ReactNode;
  fontFamily?: string;
  theme: any;
}

export function DesktopLayout({ topbar, children, modals, fontFamily = "inherit", theme: T }: DesktopLayoutProps) {
  return (
    <div className="muse-app drag-region" style={{ 
      boxSizing: "border-box", 
      background: T.bg, 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      fontSize: 13, 
      fontFamily 
    }}>
      {topbar}
      
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {children}
      </div>

      {modals}
    </div>
  );
}
