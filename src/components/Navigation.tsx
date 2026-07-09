import React, { useState } from "react";
import { T, MODES, PHASES, fi, uid, MARKET_TEMPLATES, MOCK_FILE_CONTENTS } from "../constants";
import { Btn, ICard, SR, TIn, Md } from "./Common";

const getParentHub = (view: string) => {
  if (["workspace_hub", "chat", "projects", "workspace", "calendar"].includes(view)) return "workspace_hub";
  if (["creative_studio", "studio", "comm", "market", "summarizer"].includes(view)) return "creative_studio";
  if (["mymuse"].includes(view)) return "mymuse";
  if (["mindful_growth", "journal", "habit", "growth"].includes(view)) return "mindful_growth";
  if (["ai_persona"].includes(view)) return "ai_persona";
  if (["my_persona", "profile", "memory"].includes(view)) return "my_persona";
  if (["settings"].includes(view)) return "settings";
  if (["brand_hub"].includes(view)) return "brand_hub";
  return "workspace_hub";
};

export function Sidebar({ state, dispatch, isMobile, hubTab = "projects", studioTab = "studio", growthTab = "journal", personaTab = "profile" }: any) {
  const [hovT, setHovT] = useState<string | null>(null);
  const open = isMobile ? state.sbOpen : state.sbOpen;
  const nav = state.navView;
  const proj = state.projects.find((p: any) => p.id === state.activeProjId);
  const navItems = [
    { icon: "💬", label: "智慧工作區", view: "workspace_hub" },
    { icon: "✨", label: "創意工坊", view: "creative_studio" },
    { icon: "🎀", label: "My Muse", view: "mymuse", badge: true },
    { icon: "🌱", label: "日常規劃", view: "mindful_growth" },
    { icon: "🎭", label: "專屬 AI 角色設定", view: "ai_persona" },
    { icon: "🏰", label: "Musedini 品牌中心", view: "brand_hub" },
    { icon: "👤", label: "我的設置", view: "my_persona" },
    { icon: "⚙️", label: "Settings", view: "settings" }
  ];

  const handleNavClick = (view: string) => {
    let targetView = view;
    if (view === "workspace_hub") {
      targetView = hubTab === "chats" ? "chat" : hubTab;
    } else if (view === "creative_studio") {
      targetView = studioTab;
    } else if (view === "mindful_growth") {
      targetView = growthTab;
    } else if (view === "my_persona") {
      targetView = personaTab;
    }

    dispatch({ type: "SET_NAV", view: targetView });
    if (isMobile) {
      dispatch({ type: "TOGGLE_SB" });
    }
  };

  const handleSubClick = () => {
    if (isMobile) {
      dispatch({ type: "TOGGLE_SB" });
    }
  };

  const sidebarWidth = isMobile ? (open ? 200 : 0) : (open ? 200 : 48);

  return (
    <div style={{ 
      width: sidebarWidth, 
      background: T.bgCard, 
      borderRight: isMobile && !open ? "none" : `0.5px solid ${T.border}`, 
      display: "flex", 
      flexDirection: "column", 
      flexShrink: 0, 
      transition: "all .22s cubic-bezier(.4,0,.2,1)", 
      overflow: "hidden",
      position: isMobile ? "absolute" : "relative",
      left: isMobile ? (open ? 0 : -200) : 0,
      top: 0,
      bottom: 0,
      zIndex: 1000,
      boxShadow: isMobile && open ? "4px 0 24px rgba(0,0,0,0.15)" : "none"
    }}>
      <div style={{ padding: (isMobile || open) ? "12px 12px 16px" : "12px 0", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: `0.5px solid ${T.borderLight}`, flexShrink: 0, gap: 10 }}>
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: (isMobile || open) ? "flex-end" : "center", padding: (isMobile || open) ? "0 4px" : "0" }}>
          <button onClick={() => dispatch({ type: "TOGGLE_SB" })} style={{ width: 28, height: 28, borderRadius: 6, border: `0.5px solid ${T.border}`, background: T.bgCard, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textGhost, flexShrink: 0 } as any}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        </div>
        
        <div onClick={() => handleNavClick("my_persona")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", width: "100%" }}>
          <div style={{ width: (isMobile || open) ? 52 : 32, height: (isMobile || open) ? 52 : 32, borderRadius: "50%", background: (state.userProfile.avatar && state.userProfile.avatar.startsWith("data:image/")) ? "transparent" : "linear-gradient(135deg, #C5A059, #8A6E3E)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: (isMobile || open) ? 22 : 12, fontWeight: 700, boxShadow: "0 6px 16px rgba(189,183,176,0.3)", border: "2px solid #fff", transition: "all .2s", overflow: "hidden" }}>
            {(state.userProfile.avatar && state.userProfile.avatar.startsWith("data:image/")) ? (
              <img src={state.userProfile.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              state.userProfile.avatar || "YC"
            )}
          </div>
          {(isMobile || open) && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: T.goldDark, letterSpacing: 0.5, marginBottom: 2 }}>MUSE AI</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{state.userProfile.name}</div>
              <div style={{ fontSize: 10, color: T.textGhost, marginTop: 2 }}>{state.userProfile.bio}</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: "8px 7px 6px", borderBottom: `0.5px solid ${T.borderLight}`, flexShrink: 0 }}>
        <button onClick={() => {
          if (nav === "workspace") dispatch({ type: "OPEN_MODAL", modal: "new-proj-thread" });
          else if (nav === "projects") dispatch({ type: "OPEN_MODAL", modal: "new-project" });
          else dispatch({ type: "OPEN_MODAL", modal: "new-gen-thread" });
          if (isMobile) dispatch({ type: "TOGGLE_SB" });
        }} style={{ width: "100%", padding: (isMobile || open) ? "6px 9px" : "6px 0", borderRadius: 8, border: `0.5px solid ${T.border}`, background: T.bgCard, color: T.goldDark, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, justifyContent: (isMobile || open) ? "flex-start" : "center", fontFamily: "inherit" } as any}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>+</span>
          {(isMobile || open) && <span style={{ whiteSpace: "nowrap" }}>{nav === "workspace" ? "New thread" : nav === "projects" ? "New project" : "New chat"}</span>}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
        {navItems.map(n => {
          const active = getParentHub(nav) === n.view;
          const renderOpen = isMobile || open;
          
          return (
            <div key={n.view} style={{ display: "flex", flexDirection: "column", marginBottom: 3 }}>
              {/* Category Nav Button */}
              <div 
                onClick={() => handleNavClick(n.view)} 
                style={{ 
                  padding: renderOpen ? "7px 10px" : "7px 0", 
                  borderRadius: 8, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  justifyContent: renderOpen ? "flex-start" : "center", 
                  cursor: "pointer", 
                  background: active ? "#FFF8ED" : "transparent", 
                  color: active ? T.goldDark : T.textMid, 
                  fontWeight: active ? 600 : 400, 
                  fontSize: 12,
                  transition: "background .12s" 
                } as any}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#FAF6EF"; }} 
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{n.icon}</span>
                {renderOpen && <span style={{ whiteSpace: "nowrap", flex: 1 }}>{n.label}</span>}
                {renderOpen && n.badge && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4537E", flexShrink: 0 }} />}
              </div>

              {/* Active Context Content Inline Nested */}
              {active && (
                <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* For workspace_hub */}
                  {n.view === "workspace_hub" && renderOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 10, padding: "4px 0" }}>
                      {/* 💬 智慧對話 入口 */}
                      <div 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          dispatch({ type: "SET_NAV", view: "chat" }); 
                          handleSubClick(); 
                        }} 
                        style={{ 
                          padding: "6px 10px", 
                          borderRadius: 6, 
                          fontSize: 11.5, 
                          cursor: "pointer", 
                          background: nav === "chat" ? "rgba(197, 160, 89, 0.12)" : "transparent", 
                          color: nav === "chat" ? T.goldDark : T.textMid, 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 6,
                          fontWeight: nav === "chat" ? 600 : 400,
                          transition: "all 0.12s"
                        }}
                        onMouseEnter={e => { if(nav !== "chat") e.currentTarget.style.background = "#FAF7F0"; }}
                        onMouseLeave={e => { if(nav !== "chat") e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: 12 }}>💬</span>
                        <span style={{ whiteSpace: "nowrap" }}>智慧對話</span>
                      </div>

                      {/* 📜 歷史對話 入口 */}
                      <div 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          dispatch({ type: "SET_HISTORY_DRAWER", val: true });
                          handleSubClick(); 
                        }} 
                        style={{ 
                          padding: "5px 8px", 
                          marginLeft: 14,
                          marginBottom: 4,
                          borderRadius: 6, 
                          fontSize: 11, 
                          cursor: "pointer", 
                          background: state.showHistoryDrawer ? "rgba(197, 160, 89, 0.08)" : "transparent", 
                          color: state.showHistoryDrawer ? T.goldDark : T.textMid, 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 6,
                          fontWeight: state.showHistoryDrawer ? 600 : 400,
                          transition: "all 0.12s"
                        }}
                        onMouseEnter={e => { if(!state.showHistoryDrawer) e.currentTarget.style.background = "#FAF7F0"; }}
                        onMouseLeave={e => { if(!state.showHistoryDrawer) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: 11 }}>📜</span>
                        <span style={{ whiteSpace: "nowrap" }}>歷史對話</span>
                      </div>

                      {/* 📁 個人企劃案 入口 */}
                      <div 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          dispatch({ type: "SET_NAV", view: "projects" }); 
                          handleSubClick(); 
                        }} 
                        style={{ 
                          padding: "6px 10px", 
                          borderRadius: 6, 
                          fontSize: 11.5, 
                          cursor: "pointer", 
                          background: (nav === "projects" || nav === "workspace") ? "rgba(197, 160, 89, 0.12)" : "transparent", 
                          color: (nav === "projects" || nav === "workspace") ? T.goldDark : T.textMid, 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 6,
                          fontWeight: (nav === "projects" || nav === "workspace") ? 600 : 400,
                          transition: "all 0.12s"
                        }}
                        onMouseEnter={e => { if(nav !== "projects" && nav !== "workspace") e.currentTarget.style.background = "#FAF7F0"; }}
                        onMouseLeave={e => { if(nav !== "projects" && nav !== "workspace") e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: 12 }}>📁</span>
                        <span style={{ whiteSpace: "nowrap" }}>個人企劃案</span>
                      </div>

                      {/* 📁 專案列表 入口 */}
                      <div 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          dispatch({ type: "SET_PROJECTS_DRAWER", val: true });
                          handleSubClick(); 
                        }} 
                        style={{ 
                          padding: "5px 8px", 
                          marginLeft: 14,
                          marginBottom: 4,
                          borderRadius: 6, 
                          fontSize: 11, 
                          cursor: "pointer", 
                          background: state.showProjectsDrawer ? "rgba(197, 160, 89, 0.08)" : "transparent", 
                          color: state.showProjectsDrawer ? T.goldDark : T.textMid, 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 6,
                          fontWeight: state.showProjectsDrawer ? 600 : 400,
                          transition: "all 0.12s"
                        }}
                        onMouseEnter={e => { if(!state.showProjectsDrawer) e.currentTarget.style.background = "#FAF7F0"; }}
                        onMouseLeave={e => { if(!state.showProjectsDrawer) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: 11 }}>📁</span>
                        <span style={{ whiteSpace: "nowrap" }}>專案列表</span>
                      </div>
                    </div>
                  )}

                  {/* For creative_studio */}
                  {n.view === "creative_studio" && renderOpen && state.savedTemplates.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginLeft: 14, padding: "2px 0" }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: T.textGhost, paddingLeft: 6 }}>已收藏範本</div>
                      {state.savedTemplates.slice(0, 3).map((tID: string) => {
                        const temp = (MARKET_TEMPLATES || []).find((x: any) => x.id === tID);
                        const title = temp ? temp.title : `範本 ${tID}`;
                        return (
                          <div key={tID} style={{ fontSize: 10, color: T.textMid, padding: "4px 8px", background: "#F4F2EE", borderRadius: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                        );
                      })}
                    </div>
                  )}

                  {/* For mindful_growth */}
                  {n.view === "mindful_growth" && renderOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginLeft: 14, padding: "2px 0" }}>
                        {[{ id: "daily", n: "📔 每日日記" }, { id: "reflect", n: "✨ 深度反思" }].map(t => (
                          <div key={t.id} onClick={(e) => { e.stopPropagation(); dispatch({ type: "SET_JOURNAL_TAB", tab: t.id }); dispatch({ type: "SET_NAV", view: "journal" }); handleSubClick(); }} style={{ padding: "5px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: state.journalTab === t.id && nav === "journal" ? "#EEEDFE" : "transparent", color: state.journalTab === t.id && nav === "journal" ? "#534AB7" : T.textMid }}>{t.n}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* For my_persona */}
                  {n.view === "my_persona" && renderOpen && state.memoryItems.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginLeft: 14, padding: "2px 0" }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: T.textGhost, paddingLeft: 6 }}>記憶快取</div>
                      {state.memoryItems.slice(0, 2).map((m: any) => (
                        <div key={m.id} style={{ fontSize: 10, color: T.textMid, padding: "4px 8px", borderLeft: `2.5px solid ${T.gold}`, background: T.bgInput, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.content}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        padding: "8px 6px",
        borderTop: `0.5px solid ${T.borderLight}`,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4
      }}>
        <button
          onClick={() => {
            dispatch({ type: "LOGOUT" });
            localStorage.removeItem("muse_user_session");
          }}
          style={{
            width: "100%",
            padding: (isMobile || open) ? "8px 10px" : "8px 0",
            borderRadius: 8,
            border: "1px solid rgba(239, 68, 68, 0.15)",
            background: "rgba(239, 68, 68, 0.04)",
            color: "#DC2626",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: (isMobile || open) ? "flex-start" : "center",
            gap: 8,
            fontFamily: "inherit",
            transition: "all 0.2s ease"
          } as any}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.09)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.04)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.15)";
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>🚪</span>
          {(isMobile || open) && <span style={{ whiteSpace: "nowrap" }}>登出帳號</span>}
        </button>
      </div>
    </div>
  );
}

export function ProjGrid({ state, dispatch, isMobile }: any) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 16px" : "22px 26px" }}>
      <div style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        marginBottom: 20,
        gap: 10
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: T.text }}>Plans</div>
          <div style={{
            fontSize: isMobile ? 11 : 12,
            color: T.textDim,
            marginTop: 3,
            lineHeight: 1.4
          }}>
            {isMobile
              ? `${state.projects.length} 個企劃案 · 獨立 brief 與 AI 空間`
              : `${state.projects.length} 個企劃案 · 每個有獨立 brief、檔案與 AI 空間`
            }
          </div>
        </div>
        <Btn onClick={() => dispatch({ type: "OPEN_MODAL", modal: "new-project" })} style={{ padding: isMobile ? "6px 12px" : "8px 16px", fontSize: isMobile ? 12 : 13, background: "#bfccd4", color: "#fff", border: "none", flexShrink: 0 }}>+ 建立新企劃案</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {state.projects.map((proj: any) => {
          const pct = Math.round(proj.tokenUsage / proj.tokenLimit * 100);
          return (
            <div key={proj.id} style={{ background: T.bgCard, border: `0.5px solid ${T.border}`, borderRadius: 12, overflow: "hidden", transition: "box-shadow .2s" }} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,.07)"} onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ height: 3, background: proj.color }} />
              <div style={{ padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: proj.color + "22", border: `0.5px solid ${proj.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 } as any}>📁</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.name}</div><div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{proj.phase} · {proj.threads.length} threads</div></div>
                </div>
                <div style={{ display: "flex", gap: 6 }}><Btn style={{ flex: 1, textAlign: "center", background: "#bfccd4", color: "#fff", border: "none" }} onClick={() => dispatch({ type: "ENTER_PROJECT", id: proj.id })}>開啟 →</Btn></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StudioRightPanel({ state, dispatch }: any) {
  const TONES = ["活潑", "自信", "溫暖", "專業", "幽默", "理性"];
  if (state.shareCardMsg) {
    const msg = state.shareCardMsg;
    const CARD_THEMES = [{ bg: "#FEF3C7", tc: "#3D2E1A" }, { bg: "#EEEDFE", tc: "#3C3489" }, { bg: "#E1F5EE", tc: "#085041" }, { bg: "#3D2E1A", tc: "#C5A059" }];
    return (
      <div style={{ width: 220, background: "#F8F6F2", borderLeft: "0.5px solid " + T.border, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: "0.5px solid " + T.border, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 11, color: "#D4537E" }}>✦ 分享卡片</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => dispatch({ type: "SET_SHARE_CARD", msg: null })} style={{ border: "0.5px solid " + T.border, borderRadius: 5, background: T.bgCard, cursor: "pointer", fontSize: 11, color: T.textDim, padding: "1px 6px" }}>返回</button>
        </div>
        <div style={{ flex: 1, padding: 9, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ borderRadius: 10, padding: 14, border: "0.5px solid " + T.border, background: state.cardBg, minHeight: 160, display: "flex", flexDirection: "column", justifyContent: "space-between" } as any}>
            <div style={{ fontSize: 11, lineHeight: 1.65, color: state.cardTc }}>{(msg.content || "").slice(0, 120)}...</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {CARD_THEMES.map((ct, i) => <div key={i} onClick={() => dispatch({ type: "SET_CARD_BG", bg: ct.bg, tc: ct.tc })} style={{ width: 26, height: 26, borderRadius: 6, background: ct.bg, cursor: "pointer", border: state.cardBg === ct.bg ? "2px solid " + T.text : "1.5px solid transparent" }} />)}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: 220, background: "#F8F6F2", borderLeft: "0.5px solid " + T.border, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: "0.5px solid " + T.border, fontSize: 11, fontWeight: 500, color: T.textMid }}>語調設定</div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {TONES.map(tone => { const on = state.brandTones.includes(tone); return (<div key={tone} onClick={() => dispatch({ type: "TOGGLE_BRAND_TONE", tone })} style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, cursor: "pointer", background: on ? "#FBEAF0" : T.bgCard, color: on ? "#993556" : T.textMid, border: on ? "0.5px solid #F4C0D1" : "0.5px solid " + T.border }}>{tone}</div>); })}
        </div>
      </div>
      <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: "0.5px solid " + T.border, borderTop: "0.5px solid " + T.border, fontSize: 11, fontWeight: 500, color: T.textMid }}>生成控制</div>
      <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 11, color: T.textMid }}>字數限制</span><span style={{ fontSize: 11, color: T.goldDark, fontWeight: 600 }}>{state.studioWordCount} 字</span></div>
          <input type="range" min="20" max="500" step="10" value={state.studioWordCount} onChange={e => dispatch({ type: "SET_STUDIO_SLIDER", field: "studioWordCount", val: parseInt(e.target.value) })} style={{ width: "100%", accentColor: T.gold }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 11, color: T.textMid }}>Emoji 密度</span><span style={{ fontSize: 11, color: T.goldDark, fontWeight: 600 }}>{state.studioEmojiDensity}%</span></div>
          <input type="range" min="0" max="100" step="5" value={state.studioEmojiDensity} onChange={e => dispatch({ type: "SET_STUDIO_SLIDER", field: "studioEmojiDensity", val: parseInt(e.target.value) })} style={{ width: "100%", accentColor: "#D4537E" }} />
        </div>
      </div>
    </div>
  );
}

export function JournalRightPanel() {
  const DAYS = ["一", "二", "三", "四", "五", "六", "日"];
  return (
    <div style={{ width: 196, background: "#F8F6F2", borderLeft: "0.5px solid " + T.border, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: "0.5px solid " + T.border, fontSize: 11, fontWeight: 500, color: T.textMid }}>週回顧</div>
      <div style={{ flex: 1, padding: 9 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {DAYS.map(d => <div key={d} style={{ flex: 1, height: 34, borderRadius: 6, background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid " + T.borderLight, fontSize: 9 } as any}>{d}</div>)}
        </div>
      </div>
    </div>
  );
}

export function MarketRightPanel() {
  const TOP_TEMPLATES = [
    { title: "高效週排程", uses: "5.2k", icon: "📅" },
    { title: "心靈對決劇本", uses: "3.8k", icon: "🎭" },
    { title: "極簡產品攝影", uses: "2.9k", icon: "📸" }
  ];
  return (
    <div style={{ width: 180, background: "#F8F6F2", borderLeft: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "8px 10px", background: T.bgCard, borderBottom: `0.5px solid ${T.border}`, fontSize: 11, fontWeight: 500, color: T.textMid }}>熱門排行</div>
      <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {TOP_TEMPLATES.map((t) => (
          <div key={t.title} style={{ padding: "8px 10px", background: T.bgCard, borderRadius: 8, border: `0.5px solid ${T.borderLight}` }}>
             <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
               <span style={{ fontSize: 14 }}>{t.icon}</span>
               <div style={{ fontSize: 11, fontWeight: 600, color: T.textMid }}>{t.title}</div>
             </div>
             <div style={{ fontSize: 9, color: T.textGhost }}>{t.uses} 人正在用</div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "10px", background: "linear-gradient(135deg, #FFF8ED, #FFFDF7)", border: `0.5px solid ${T.gold}`, borderRadius: 10, textAlign: "center" }}>
           <div style={{ fontSize: 11, fontWeight: 600, color: T.goldDark, marginBottom: 4 }}>成為創作者</div>
           <Btn gold style={{ width: "100%", fontSize: 10, padding: "5px 0" }}>上傳你的模板</Btn>
        </div>
      </div>
    </div>
  );
}

export function MemoryRightPanel({ state, dispatch }: any) {
  const TONE_OPTIONS = ["活潑自信", "溫柔細膩", "專業嚴謹", "幽默輕鬆", "簡潔直接"];
  return (
    <div style={{ width: 196, background: "#F8F6F2", borderLeft: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: `0.5px solid ${T.border}`, fontSize: 11, fontWeight: 500, color: T.textMid }}>個性化設定</div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {TONE_OPTIONS.map(t => (
            <div key={t} style={{ padding: "6px 9px", borderRadius: 7, background: state.userProfile.tone === t ? "#FFF8ED" : T.bgCard, border: `0.5px solid ${state.userProfile.tone === t ? T.gold : T.border}`, fontSize: 11, color: state.userProfile.tone === t ? T.goldDark : T.textMid, cursor: "pointer" }}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: "0.5px solid " + T.border, borderTop: "0.5px solid " + T.border, fontSize: 11, fontWeight: 500, color: T.textMid }}>回覆偏好</div>
      <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 11, color: T.textMid }}>回應詳簡</span><span style={{ fontSize: 11, color: T.goldDark, fontWeight: 600 }}>{state.memoryResponseLength} 字</span></div>
          <input type="range" min="10" max="250" step="10" value={state.memoryResponseLength} onChange={e => dispatch({ type: "SET_MEMORY_SLIDER", field: "memoryResponseLength", val: parseInt(e.target.value) })} style={{ width: "100%", accentColor: T.gold }} />
        </div>
        <div style={{ fontSize: 10, color: T.textGhost, fontStyle: "italic", lineHeight: 1.5 }}>設定 AI 在「記憶模式」下回應你的平均長度。</div>
      </div>
    </div>
  );
}

export function GrowthRightPanel({ state }: any) {
  return (
    <div style={{ width: 200, background: "#F8F6F2", borderLeft: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: `0.5px solid ${T.border}`, fontSize: 11, fontWeight: 500, color: T.textMid }}>技能與成就</div>
      <div style={{ flex: 1, padding: 9, display: "flex", flexDirection: "column", gap: 8 }}>
        {state.skills.map((sk: any) => (
          <div key={sk.name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textMid, marginBottom: 3 } as any}><span>{sk.name}</span><span>{sk.level}%</span></div>
            <div style={{ height: 5, background: T.borderLight, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", background: "#7F77DD", width: `${sk.level}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HabitRightPanel() {
  const WEEK_LOG = [
    { day: "05.12", task: "晨間冥想已完成", val: "+5 XP" },
    { day: "05.11", task: "晚餐支出 $250", val: "📊" },
    { day: "05.10", task: "閱讀 30 分鐘", val: "+10 XP" }
  ];
  return (
    <div style={{ width: 200, background: "#F8F6F2", borderLeft: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: `0.5px solid ${T.border}`, fontSize: 11, fontWeight: 500, color: T.textMid }}>本週紀錄</div>
      <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {WEEK_LOG.map((l) => (
          <div key={`${l.day}-${l.task}`} style={{ padding: "8px 10px", background: T.bgCard, borderRadius: 8, border: `0.5px solid ${T.borderLight}` }}>
            <div style={{ fontSize: 9, color: T.textGhost, marginBottom: 2 }}>{l.day}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" } as any}>
              <div style={{ fontSize: 11, color: T.textMid }}>{l.task}</div>
              <div style={{ fontSize: 10, color: T.goldDark, fontWeight: 600 }}>{l.val}</div>
            </div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: 12, background: "#EEEDFE", borderRadius: 10, border: "0.5px solid #7F77DD44" }}>
           <div style={{ fontSize: 11, fontWeight: 600, color: "#534AB7", marginBottom: 4 }}>Muse 建議</div>
           <div style={{ fontSize: 10, color: "#7F77DD", lineHeight: 1.5 }}>你已經連續完成習慣 3 天了！繼續保持，明天就能升級「毅力」技能。</div>
        </div>
      </div>
    </div>
  );
}



export { PvPanel } from './preview/PvPanel';
// PvPanel moved to ./preview/PvPanel
export function CommRightPanel() {
  const HISTORY = [
    { label: "婉拒會議邀請", ts: "2h ago" },
    { label: "詢問報價進度", ts: "5h ago" },
    { label: "解釋延期原因", ts: "昨天" }
  ];
  return (
    <div style={{ width: 210, background: "#F8F6F2", borderLeft: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "8px 11px", background: T.bgCard, borderBottom: `0.5px solid ${T.border}`, fontSize: 11, fontWeight: 500, color: T.textMid }}>腳本庫</div>
      <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: T.textGhost, marginBottom: 2 }}>最近生成</div>
        {HISTORY.map((h) => (
          <div key={h.label} style={{ padding: "8px 10px", background: T.bgCard, borderRadius: 8, border: `0.5px solid ${T.borderLight}`, cursor: "pointer" }}>
            <div style={{ fontSize: 11, color: T.textMid, marginBottom: 2 }}>{h.label}</div>
            <div style={{ fontSize: 9, color: T.textGhost }}>{h.ts}</div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: 12, background: "#F9F5EE", borderRadius: 10, border: "0.5px solid #C5A05944" }}>
           <div style={{ fontSize: 11, fontWeight: 600, color: "#8A6E3E", marginBottom: 4 }}>溝通小撇步</div>
           <div style={{ fontSize: 10, color: "#8A6E3E", lineHeight: 1.5, opacity: 0.8 }}>先肯定對方的價值，再提出你的需求，能有效降低摩擦。</div>
        </div>
      </div>
    </div>
  );
}

export function ProjRP({ state, dispatch, isMobile }: any) {
  const proj = state.projects.find((p: any) => p.id === state.activeProjId); if (!proj) return null;
  const tab = state.rightTab;

  const getFileIcon = (filename: string) => {
    if (filename.endsWith(".pdf")) return "📕";
    if (filename.endsWith(".docx")) return "📘";
    if (filename.endsWith(".xlsx") || filename.endsWith(".csv")) return "📊";
    if (filename.endsWith(".md")) return "📝";
    return "🌐";
  };

  const getEvents = () => {
    const list: any[] = [];
    // 1. Creation
    list.push({ icon: "✦", title: "企劃案建立", body: `您建立了「${proj.name}」本地企劃案`, time: "5天前" });
    // 2. Members
    proj.members.forEach((m: any) => {
      if (m.role !== "owner") {
        list.push({ icon: "👤", title: "人員加入", body: `${m.name} (${m.role}) 關聯了此企劃案`, time: "3天前" });
      }
    });
    // 3. Threads
    proj.threads.forEach((t: any, idx: number) => {
      list.push({ icon: "💬", title: "對話啟動", body: `您發起了執行緒「${t.title}」`, time: t.ts === "剛剛" ? "剛剛" : `${idx + 1}天前` });
    });
    // 4. Files
    proj.files.forEach((f: any, idx: number) => {
      const isAI = f.size === "AI 生成";
      list.push({
        icon: isAI ? "✨" : "📥",
        title: isAI ? "AI 產出檔案" : "上傳/建立檔案",
        body: isAI ? `AI 自動生成並保存了「${f.name}」` : `您手動上傳/建立了「${f.name}」`,
        time: f.size === "AI 生成" ? "剛剛" : `${idx % 2 === 0 ? 1 : 2}天前`
      });
    });

    list.sort((a, b) => {
      if (a.time === "剛剛" && b.time !== "剛剛") return -1;
      if (a.time !== "剛剛" && b.time === "剛剛") return 1;
      return 0;
    });
    return list;
  };

  const renderFilesHierarchy = () => {
    const rootFiles = proj.files.filter((f: any) => !f.folderId);
    return (
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer.getData("text/plain");
          if (raw) {
            const item = JSON.parse(raw);
            if (item.type === "file") {
              dispatch({ type: "MOVE_FILE", fileId: item.id, toFolderId: null });
            } else if (item.type === "folder") {
              dispatch({ type: "MOVE_FOLDER", folderId: item.id, toFolderId: null });
            }
          }
        }}
        style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4, minHeight: 200 }}
      >
        {/* Action Controls inside ProjRP */}
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <button 
            onClick={() => dispatch({ type: "OPEN_MODAL", modal: "add-folder" })}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "5px 0", fontSize: 9.5, fontWeight: 700, borderRadius: 5, border: `0.5px solid ${T.border}`, background: "#fff", color: T.textGhost, cursor: "pointer", outline: "none" }}
          >
            ＋📁 資料夾
          </button>
          <button 
            onClick={() => dispatch({ type: "OPEN_MODAL", modal: "add-file" })}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "5px 0", fontSize: 9.5, fontWeight: 700, borderRadius: 5, border: `0.5px solid ${T.gold}`, background: "linear-gradient(135deg, #FFF9EE, #FFF3DF)", color: T.goldDark, cursor: "pointer", outline: "none" }}
          >
            ＋📄 檔案
          </button>
        </div>

        {/* Folders */}
        {proj.folders.map((folder: any) => {
          const folderFiles = proj.files.filter((f: any) => f.folderId === folder.id);
          return (
            <div key={folder.id} style={{ display: "flex", flexDirection: "column" }}>
              <div 
                draggable={true}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData("text/plain", JSON.stringify({ type: "folder", id: folder.id }));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); e.currentTarget.style.background = "rgba(197, 160, 89, 0.12)"; }}
                onDragLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.style.background = "transparent";
                  const raw = e.dataTransfer.getData("text/plain");
                  if (raw) {
                    const item = JSON.parse(raw);
                    if (item.type === "file") {
                      dispatch({ type: "MOVE_FILE", fileId: item.id, toFolderId: folder.id });
                    } else if (item.type === "folder" && item.id !== folder.id) {
                      dispatch({ type: "MOVE_FOLDER", folderId: item.id, toFolderId: folder.id });
                    }
                  }
                }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: T.textMid, padding: "5px 8px", borderRadius: 6, cursor: "pointer", userSelect: "none", transition: "background 0.2s" }}
                onMouseEnter={e => {
                  const trash = e.currentTarget.querySelector(".del-btn");
                  if (trash) (trash as HTMLElement).style.opacity = "1";
                }}
                onMouseLeave={e => {
                  const trash = e.currentTarget.querySelector(".del-btn");
                  if (trash) (trash as HTMLElement).style.opacity = "0";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📁</span>
                  <span>{folder.name}</span>
                </div>
                <button
                  className="del-btn"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`確定要刪除資料夾「${folder.name}」嗎？`)) dispatch({ type: "DELETE_FOLDER", id: folder.id }); }}
                  style={{ opacity: 0, border: "none", background: "transparent", color: "#EF4444", fontSize: 9, cursor: "pointer", padding: "0 2px", outline: "none" }}
                >
                  🗑️
                </button>
              </div>
              
              <div style={{ paddingLeft: 12, borderLeft: `1px solid rgba(220, 215, 206, 0.4)`, marginLeft: 14, display: "flex", flexDirection: "column", gap: 2 }}>
                {folderFiles.length === 0 ? (
                  <div style={{ fontSize: 9, color: T.textGhost, padding: "4px 8px", fontStyle: "italic" }}>資料夾為空</div>
                ) : (
                  folderFiles.map((f: any) => renderFileRow(f))
                )}
              </div>
            </div>
          );
        })}

        {/* Root Files */}
        {rootFiles.map((f: any) => renderFileRow(f))}
      </div>
    );
  };

  const renderFileRow = (f: any) => {
    return (
      <div 
        key={f.id}
        draggable={true}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "file", id: f.id }));
        }}
        onClick={() => {
          window.dispatchEvent(new CustomEvent("muse-select-pv-file", { detail: { filename: f.name } }));
          if (!state.pvOpen) dispatch({ type: "TOGGLE_PV" });
        }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: T.textMid, padding: "5px 8px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s", marginBottom: 2 }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(197,160,89,0.06)";
          e.currentTarget.style.color = T.goldDark;
          const trash = e.currentTarget.querySelector(".del-btn");
          if (trash) (trash as HTMLElement).style.opacity = "1";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = T.textMid;
          const trash = e.currentTarget.querySelector(".del-btn");
          if (trash) (trash as HTMLElement).style.opacity = "0";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
          <span>{getFileIcon(f.name)}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
        </div>
        <button
          className="del-btn"
          onClick={(e) => { e.stopPropagation(); if (confirm(`確定要永久刪除檔案「${f.name}」嗎？`)) dispatch({ type: "DELETE_FILE", id: f.id }); }}
          style={{ opacity: 0, border: "none", background: "transparent", color: "#EF4444", fontSize: 9, cursor: "pointer", padding: "0 2px", outline: "none" }}
        >
          🗑️
        </button>
      </div>
    );
  };

  return (
    <div style={{ width: isMobile ? "100%" : 188, background: "#F8F6F2", borderLeft: isMobile ? "none" : `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, height: "100%" }}>
      <div style={{ display: "flex", borderBottom: `0.5px solid ${T.border}`, background: T.bgCard }}>{[["info", "📊"], ["files", "📁"], ["log", "🛡️"]].map(([k, ic]) => <div key={k} onClick={() => dispatch({ type: "SET_RIGHT_TAB", tab: k })} style={{ flex: 1, padding: "9px 0", fontSize: 12, textAlign: "center", cursor: "pointer", color: tab === k ? T.goldDark : T.textGhost, borderBottom: tab === k ? `2px solid ${T.gold}` : "2px solid transparent" }}>{ic}</div>)}</div>
      <div style={{ flex: 1, padding: 9, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
        {tab === "info" && (
          <>
            <ICard title="狀態">
              <SR label="Phase">{proj.phase}</SR>
              <SR label="Threads">{proj.threads.length}</SR>
              <SR label="Files">{proj.files.length}</SR>
            </ICard>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5 }}>企劃案擁有人 (個人單機)</div>
              {proj.members.map((m: any) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "#fff", borderRadius: 8, border: "1px solid rgba(220, 215, 206, 0.4)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: m.c || T.gold, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                    {m.i}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: T.text }}>{m.name}</span>
                    <span style={{ fontSize: 8.5, color: m.role === "owner" ? "#D97706" : T.textGhost, fontWeight: "bold" }}>
                      {m.role.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {tab === "files" && renderFilesHierarchy()}

        {tab === "log" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 8px" }}>
            {getEvents().map((e, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FAF6F2", border: `1px solid ${T.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                    {e.icon}
                  </div>
                  {idx < getEvents().length - 1 && (
                    <div style={{ width: 1, flex: 1, background: "rgba(220, 215, 206, 0.5)", margin: "4px 0" }} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 8, flex: 1, textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{e.title}</span>
                    <span style={{ fontSize: 8.5, color: T.textGhost, fontWeight: 600 }}>{e.time}</span>
                  </div>
                  <span style={{ fontSize: 9.5, color: T.textMid, lineHeight: 1.35 }}>{e.body}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


export function FileTree({ state, dispatch }: any) {
  const proj = state.projects.find((p: any) => p.id === state.activeProjId);
  if (!proj) return null;

  const rootFiles = proj.files.filter((f: any) => !f.folderId);

  const getFileIcon = (filename: string) => {
    if (filename.endsWith(".pdf")) return "📕";
    if (filename.endsWith(".docx")) return "📘";
    if (filename.endsWith(".xlsx") || filename.endsWith(".csv")) return "📊";
    if (filename.endsWith(".md")) return "📝";
    return "🌐";
  };

  const renderFileRow = (f: any) => {
    return (
      <div 
        key={f.id}
        draggable={true}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "file", id: f.id }));
        }}
        onClick={() => {
          window.dispatchEvent(new CustomEvent("muse-select-pv-file", { detail: { filename: f.name } }));
          if (!state.pvOpen) dispatch({ type: "TOGGLE_PV" });
        }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: T.textMid, padding: "6px 8px", borderRadius: 6, cursor: "pointer", transition: "all 0.15s", marginBottom: 2 }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(197,160,89,0.06)";
          e.currentTarget.style.color = T.goldDark;
          const trash = e.currentTarget.querySelector(".del-btn");
          if (trash) (trash as HTMLElement).style.opacity = "1";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = T.textMid;
          const trash = e.currentTarget.querySelector(".del-btn");
          if (trash) (trash as HTMLElement).style.opacity = "0";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
          <span>{getFileIcon(f.name)}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
        </div>
        <button
          className="del-btn"
          onClick={(e) => { e.stopPropagation(); if (confirm(`確定要永久刪除檔案「${f.name}」嗎？`)) dispatch({ type: "DELETE_FILE", id: f.id }); }}
          style={{ opacity: 0, border: "none", background: "transparent", color: "#EF4444", fontSize: 9, cursor: "pointer", padding: "0 2px", outline: "none" }}
        >
          🗑️
        </button>
      </div>
    );
  };

  return (
    <div style={{ width: 180, background: T.bgCard, borderRight: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
      <div style={{ padding: "8px 10px", borderBottom: `0.5px solid ${T.borderLight}`, flexShrink: 0 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 10, fontWeight: 600, color: T.textDim }}>Brief</span><span style={{ fontSize: 11, color: T.gold, cursor: "pointer" }} onClick={() => dispatch({ type: "START_EDIT_BRIEF" })}>✎</span></div><div style={{ fontSize: 11, color: proj.brief ? T.textMid : T.textGhost, fontStyle: proj.brief ? "normal" : "italic", lineHeight: 1.5 }}>{proj.brief || "點擊新增..."}</div></div>
      
      {/* Action Controls inside FileTree */}
      <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderBottom: `0.5px solid ${T.borderLight}`, flexShrink: 0 }}>
        <button 
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: "add-folder" })}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "4px 0", fontSize: 9.5, fontWeight: 700, borderRadius: 5, border: `0.5px solid ${T.border}`, background: "#fff", color: T.textGhost, cursor: "pointer", outline: "none" }}
        >
          ＋📁 資料夾
        </button>
        <button 
          onClick={() => dispatch({ type: "OPEN_MODAL", modal: "add-file" })}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "4px 0", fontSize: 9.5, fontWeight: 700, borderRadius: 5, border: `0.5px solid ${T.gold}`, background: "linear-gradient(135deg, #FFF9EE, #FFF3DF)", color: T.goldDark, cursor: "pointer", outline: "none" }}
        >
          ＋📄 檔案
        </button>
      </div>

      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer.getData("text/plain");
          if (raw) {
            const item = JSON.parse(raw);
            if (item.type === "file") {
              dispatch({ type: "MOVE_FILE", fileId: item.id, toFolderId: null });
            } else if (item.type === "folder") {
              dispatch({ type: "MOVE_FOLDER", folderId: item.id, toFolderId: null });
            }
          }
        }}
        style={{ flex: 1, overflowY: "auto", padding: "10px" }}
      >
        {/* Folders */}
        {proj.folders.map((folder: any) => {
          const folderFiles = proj.files.filter((f: any) => f.folderId === folder.id);
          return (
            <div key={folder.id} style={{ display: "flex", flexDirection: "column", marginBottom: 6 }}>
              <div 
                draggable={true}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData("text/plain", JSON.stringify({ type: "folder", id: folder.id }));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); e.currentTarget.style.background = "rgba(197, 160, 89, 0.12)"; }}
                onDragLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.style.background = "transparent";
                  const raw = e.dataTransfer.getData("text/plain");
                  if (raw) {
                    const item = JSON.parse(raw);
                    if (item.type === "file") {
                      dispatch({ type: "MOVE_FILE", fileId: item.id, toFolderId: folder.id });
                    } else if (item.type === "folder" && item.id !== folder.id) {
                      dispatch({ type: "MOVE_FOLDER", folderId: item.id, toFolderId: folder.id });
                    }
                  }
                }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: T.textMid, padding: "5px 8px", borderRadius: 6, cursor: "pointer", userSelect: "none", transition: "background 0.2s" }}
                onMouseEnter={e => {
                  const trash = e.currentTarget.querySelector(".del-btn");
                  if (trash) (trash as HTMLElement).style.opacity = "1";
                }}
                onMouseLeave={e => {
                  const trash = e.currentTarget.querySelector(".del-btn");
                  if (trash) (trash as HTMLElement).style.opacity = "0";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📁</span>
                  <span>{folder.name}</span>
                </div>
                <button
                  className="del-btn"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`確定要刪除資料夾「${folder.name}」嗎？`)) dispatch({ type: "DELETE_FOLDER", id: folder.id }); }}
                  style={{ opacity: 0, border: "none", background: "transparent", color: "#EF4444", fontSize: 9, cursor: "pointer", padding: "0 2px", outline: "none" }}
                >
                  🗑️
                </button>
              </div>
              
              <div style={{ paddingLeft: 12, borderLeft: `1px solid rgba(220, 215, 206, 0.4)`, marginLeft: 14, display: "flex", flexDirection: "column", gap: 2 }}>
                {folderFiles.length === 0 ? (
                  <div style={{ fontSize: 9, color: T.textGhost, padding: "4px 8px", fontStyle: "italic" }}>資料夾為空</div>
                ) : (
                  folderFiles.map((f: any) => renderFileRow(f))
                )}
              </div>
            </div>
          );
        })}

        {/* Root Files */}
        {rootFiles.map((f: any) => renderFileRow(f))}
      </div>
    </div>
  );
}

export function BriefEd({ state, dispatch }: any) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `0.5px solid ${T.border}`, background: T.bgCard, flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 600, fontSize: 14, color: T.text }}>✎ Plan Brief</span></div>
      <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <TIn value={state.briefDraft} onChange={(t: string) => dispatch({ type: "SET_BRIEF_DRAFT", text: t })} placeholder="描述此企劃案的目標..." rows={10} style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" } as any}><Btn onClick={() => dispatch({ type: "CANCEL_BRIEF" })}>取消</Btn><Btn gold onClick={() => dispatch({ type: "SAVE_BRIEF" })}>儲存</Btn></div>
      </div>
    </div>
  );
}
