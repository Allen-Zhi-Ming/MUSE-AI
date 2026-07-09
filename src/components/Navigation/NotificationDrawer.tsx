import React from "react";

interface NotificationDrawerProps {
  state: any;
  dispatch: any;
  setShowNotifCenter: (val: boolean) => void;
  theme: any;
}

export function NotificationDrawer({ state, dispatch, setShowNotifCenter, theme: T }: NotificationDrawerProps) {
  return (
    <div 
      style={{
        position: "absolute",
        top: 54,
        right: 12,
        width: 300,
        maxHeight: 360,
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(15px)",
        border: "0.5px solid rgba(197, 160, 89, 0.3)",
        borderRadius: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "fadeInNotif 0.2s ease-out forwards"
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInNotif {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}} />
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: `0.5px solid ${T.borderLight}`, background: "rgba(197,160,89,0.05)" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>🔔 通知中心 (Notifications)</span>
        <button 
          onClick={() => {
            dispatch({ type: "CLEAR_UNREAD_NOTIFICATIONS" });
            setShowNotifCenter(false);
          }}
          style={{ border: "none", background: "none", fontSize: 9.5, fontWeight: 700, color: T.goldDark, cursor: "pointer" }}
        >
          全部標記已讀
        </button>
      </div>
      {/* Notification list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", padding: "6px 0" }}>
        {!state.notifications || state.notifications.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: T.textGhost, fontSize: 11 }}>
            ☕ 暫無任何通知
          </div>
        ) : (
          state.notifications.map((n: any) => (
            <div 
              key={n.id} 
              style={{
                padding: "10px 14px",
                borderBottom: `0.5px solid ${T.borderLight}`,
                background: n.read ? "transparent" : "rgba(197, 160, 89, 0.03)",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                transition: "background 0.2s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: n.read ? T.text : T.goldDark }}>{n.title}</span>
                <span style={{ fontSize: 9, color: T.textGhost }}>{n.ts}</span>
              </div>
              <span style={{ fontSize: 10, color: T.textMid, lineHeight: 1.4 }}>{n.body}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
