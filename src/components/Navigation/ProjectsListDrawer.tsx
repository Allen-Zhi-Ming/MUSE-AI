import React from "react";

interface ProjectsListDrawerProps {
  state: any;
  dispatch: any;
  theme: any;
}

export function ProjectsListDrawer({ state, dispatch, theme: T }: ProjectsListDrawerProps) {
  if (!state.showProjectsDrawer) return null;

  const activeProjId = state.activeProjId;
  const projectsList = state.projects || [];
  const drawerTitle = "📁 協作專案列表";
  const emptyText = "尚無協作專案";

  return (
    <>
      <div 
        onClick={() => dispatch({ type: "SET_PROJECTS_DRAWER", val: false })}
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
            onClick={() => dispatch({ type: "SET_PROJECTS_DRAWER", val: false })}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: T.textGhost, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Projects List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 5, scrollbarWidth: "none" as any }}>
          {projectsList.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: T.textGhost, fontSize: 11 }}>☕ {emptyText}</div>
          ) : (
            projectsList.map((p: any) => {
              const isActive = activeProjId === p.id;
              const mc = p.color || T.gold;
              return (
                <div 
                  key={p.id}
                  onClick={() => {
                    dispatch({ type: "ENTER_PROJECT", id: p.id });
                    dispatch({ type: "SET_PROJECTS_DRAWER", val: false });
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
                        {p.name || "無標題專案"}
                      </div>
                      <div style={{ fontSize: 9, color: T.textGhost, marginTop: 2 }}>{p.phase || "未知階段"} · {(p.files || []).length} 個檔案</div>
                    </div>
                  </div>

                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm("確定要刪除此協作專案嗎？")) {
                        dispatch({ type: "DELETE_PROJECT", id: p.id });
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
              dispatch({ type: "OPEN_MODAL", modal: "new-project" });
              dispatch({ type: "SET_PROJECTS_DRAWER", val: false });
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
            <span>＋</span> 新建協作專案
          </button>
        </div>
      </div>
    </>
  );
}
