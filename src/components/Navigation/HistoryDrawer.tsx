import React from "react";
import { MODES } from "../../constants";

interface HistoryDrawerProps {
  state: any;
  dispatch: any;
  theme: any;
}

export function HistoryDrawer({ state, dispatch, theme: T }: HistoryDrawerProps) {
  if (!state.showHistoryDrawer) return null;

  const isWorkspace = ["workspace", "projects"].includes(state.navView);
  const activeProj = isWorkspace ? state.projects.find((p: any) => p.id === state.activeProjId) : null;
  const threadsList = isWorkspace ? (activeProj?.threads || []) : (state.genThreads || []);
  const activeThreadId = isWorkspace ? state.activeThreadId : state.activeGenThreadId;
  const drawerTitle = isWorkspace ? `📁 ${activeProj?.name || "專案"} 歷史對話` : "💬 歷史智慧對話";
  const emptyText = isWorkspace ? "此企劃案尚無對話" : "尚無歷史對話";

  return (
    <>
      <div 
        onClick={() => dispatch({ type: "SET_HISTORY_DRAWER", val: false })}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(30, 24, 18, 0.15)",
          zIndex: 9998,
          animation: "fadeInBackdrop 0.2s ease-out"
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeInBackdrop { from { opacity: 0; } to { opacity: 1; } }
        `}} />
      </div>

      <div 
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          background: "rgba(255, 253, 250, 0.96)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: "0.5px solid rgba(197, 160, 89, 0.25)",
          boxShadow: "10px 0 30px rgba(61, 46, 26, 0.08)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          animation: "slideInLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        `}} />
        
        {/* Header */}
        <div style={{ padding: "16px 14px", borderBottom: `0.5px solid rgba(220, 215, 206, 0.4)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
            {drawerTitle}
          </span>
          <button 
            onClick={() => dispatch({ type: "SET_HISTORY_DRAWER", val: false })}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: T.textGhost, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Threads List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 5, scrollbarWidth: "none" as any }}>
          {threadsList.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: T.textGhost, fontSize: 11 }}>☕ {emptyText}</div>
          ) : (
            threadsList.map((t: any) => {
              const isActive = activeThreadId === t.id;
              const mc = MODES[t.mode]?.c || T.gold;
              return (
                <div 
                  key={t.id}
                  onClick={() => {
                    if (isWorkspace) {
                      dispatch({ type: "SELECT_PROJ_THREAD", id: t.id });
                      dispatch({ type: "SET_NAV", view: "workspace" });
                    } else {
                      dispatch({ type: "SELECT_GEN_THREAD", id: t.id });
                      dispatch({ type: "SET_NAV", view: "chat" });
                    }
                    dispatch({ type: "SET_HISTORY_DRAWER", val: false });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: isActive ? "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)" : "transparent",
                    border: `0.5px solid ${isActive ? "rgba(197, 160, 89, 0.35)" : "rgba(0,0,0,0.02)"}`,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                  onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: mc, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: isActive ? 700 : 500, color: isActive ? T.goldDark : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title || "無標題對話"}
                      </div>
                      <div style={{ fontSize: 9, color: T.textGhost, marginTop: 2 }}>{MODES[t.mode]?.n || "對話"} · {t.ts || "剛剛"}</div>
                    </div>
                  </div>

                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(isWorkspace ? "確定要刪除此工作對話嗎？" : "確定要刪除此歷史對話嗎？")) {
                        if (isWorkspace) {
                          dispatch({ type: "DELETE_PROJ_THREAD", id: t.id });
                        } else {
                          dispatch({ type: "DELETE_GEN_THREAD", id: t.id });
                        }
                      }
                    }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 10, color: T.textGhost, opacity: 0.6, padding: "4px 2px" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Action Button (法式奶油金) */}
        <div style={{ padding: 12, borderTop: `0.5px solid rgba(220, 215, 206, 0.4)`, background: "rgba(255, 255, 255, 0.4)" }}>
          <button
            onClick={() => {
              if (isWorkspace) {
                dispatch({ type: "NEW_PROJ_THREAD", title: "新工作對話" });
                dispatch({ type: "SET_NAV", view: "workspace" });
              } else {
                const newTid = "gt-" + Date.now();
                dispatch({ type: "NEW_GEN_THREAD", id: newTid, title: "新智慧對話", mode: state.mode });
                dispatch({ type: "SET_NAV", view: "chat" });
              }
              dispatch({ type: "SET_HISTORY_DRAWER", val: false });
            }}
            style={{
              width: "100%",
              padding: "8px 0",
              borderRadius: 10,
              background: T.gold,
              border: "none",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(197,160,89,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "opacity 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <span>＋</span> {isWorkspace ? "新開工作對話" : "新開智慧對話"}
          </button>
        </div>
      </div>
    </>
  );
}
