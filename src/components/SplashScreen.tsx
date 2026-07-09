import React from "react";

interface SplashScreenProps {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  return (
    <div 
      onClick={onDismiss}
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #1C1A17 0%, #0C0A09 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Georgia', serif",
        overflow: "hidden",
        position: "relative",
        cursor: "pointer"
      }}>
      
      {/* Transparent Drag Region with Window Controls */}
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 40, display: "flex", justifyContent: "flex-end", padding: "0 16px", alignItems: "center", zIndex: 9999 }}>
        <div className="no-drag" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); window.museAPI?.windowAction('minimize'); }}
            style={{ width: 14, height: 14, borderRadius: "50%", background: "#E5E5EA", border: "none", cursor: "pointer", opacity: 0.5 }}
          />
          <button 
            onClick={(e) => { e.stopPropagation(); window.museAPI?.windowAction('maximize'); }}
            style={{ width: 14, height: 14, borderRadius: "50%", background: "#E5E5EA", border: "none", cursor: "pointer", opacity: 0.5 }}
          />
          <button 
            onClick={(e) => { e.stopPropagation(); window.museAPI?.windowAction('close'); }}
            style={{ width: 14, height: 14, borderRadius: "50%", background: "#ef4444", border: "none", cursor: "pointer", opacity: 0.8 }}
          />
        </div>
      </div>

      {/* Glow ambient orbs */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(197, 160, 89, 0.1) 0%, rgba(197, 160, 89, 0) 70%)", top: "10%", left: "10%", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(108, 138, 192, 0.08) 0%, rgba(108, 138, 192, 0) 70%)", bottom: "10%", right: "10%", filter: "blur(50px)" }} />

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "splashPulse 2.2s infinite ease-in-out",
        zIndex: 10
      }}>
        <div style={{ fontSize: 64, color: "#BFA366", marginBottom: 20, textShadow: "0 0 25px rgba(191, 163, 102, 0.4)" }}>✦</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: 3, color: "#FFF", margin: 0, fontFamily: "Georgia, serif" }}>Muse AI</h1>
        <span style={{ fontSize: 12, color: "#BFA366", letterSpacing: 2, marginTop: 6, fontStyle: "italic" }}>by Musedini</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 24, animation: "pulse 2s infinite" }}>[ 點擊畫面進入 ]</span>
      </div>

      <div style={{
        position: "absolute",
        bottom: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        zIndex: 10
      }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: "bold" }}>Muse AI is developed by Musedini.</span>
        <span style={{ fontSize: 9.5, color: "rgba(191,163,102,0.45)", fontWeight: "bold" }}>Muse AI 由 Musedini 開發。</span>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes splashPulse {
          0%, 100% { transform: scale(0.97); opacity: 0.9; }
          50% { transform: scale(1.02); opacity: 1; }
        }
      `}} />
    </div>
  );
}
