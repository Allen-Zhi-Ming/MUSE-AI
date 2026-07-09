import React from "react";

interface ActiveNotificationProps {
  notification: { title: string; body: string };
  dispatch: any;
  theme: any;
}

export function ActiveNotification({ notification, dispatch, theme: T }: ActiveNotificationProps) {
  if (!notification) return null;
  
  return (
    <div 
      style={{
        position: "absolute",
        top: 26,
        left: "5%",
        width: "90%",
        background: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(12px)",
        border: "0.5px solid rgba(197, 160, 89, 0.35)",
        borderRadius: 16,
        padding: "12px 14px",
        boxShadow: "0 10px 30px rgba(138, 110, 62, 0.15)",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        animation: "slideDownNotif 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        cursor: "pointer"
      }}
      onClick={() => dispatch({ type: "CLEAR_ACTIVE_NOTIFICATION" })}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideDownNotif {
          0% { transform: translateY(-100px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: "bold" }}>M</div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: T.text, letterSpacing: 0.5 }}>MUSE AI</span>
        </div>
        <span style={{ fontSize: 9.5, color: T.textGhost }}>現在</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{notification.title}</span>
        <span style={{ fontSize: 10.5, color: T.textMid, marginTop: 2, lineHeight: 1.35 }}>{notification.body}</span>
      </div>
    </div>
  );
}
