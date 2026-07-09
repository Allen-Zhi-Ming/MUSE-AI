import React, { useReducer, useCallback, useState, useEffect, useRef, Suspense } from "react";
import { T, MODES, SYS, STUDIO_SYS, JOURNAL_SYS, COMM_SCENARIOS, INSPI_SYS, GROWTH_SYS, HABIT_SYS, MEMORY_SYS, MARKET_SYS, DESIGN_SYSTEM_PROMPT, SKILL_PROMPTS } from "./constants";
import { Sidebar, ProjGrid, PvPanel, ProjRP, FileTree, BriefEd, StudioRightPanel, JournalRightPanel, MarketRightPanel, MemoryRightPanel, GrowthRightPanel, HabitRightPanel, CommRightPanel } from "./components/Navigation";
import { ChatEngine, StudioView } from "./components/Views";
import { Btn } from "./components/Common";
import { LoginScreen } from "./components/LoginScreen";
import { LandingPage } from "./components/LandingPage";
import { SplashScreen } from "./components/SplashScreen";
import { AuthLayout } from "./layouts/AuthLayout";
import { DesktopLayout } from "./layouts/DesktopLayout";
import { MobileEmulatorLayout } from "./layouts/MobileEmulatorLayout";
import { DesktopTopbar } from "./components/Navigation/DesktopTopbar";
import { MobileHeader } from "./components/Navigation/MobileHeader";
import { NotificationDrawer } from "./components/Navigation/NotificationDrawer";
import { ActiveNotification } from "./components/Navigation/ActiveNotification";
import { ProjectsDrawer } from "./components/Navigation/ProjectsDrawer";
import { HistoryDrawer } from "./components/Navigation/HistoryDrawer";
import { ProjectsListDrawer } from "./components/Navigation/ProjectsListDrawer";
import { CoverBanner } from "./components/Profile/CoverBanner";
import { NewProjModal, AddFileModal, AddFolderModal, NewThreadModal, ProModal, LegalModal } from "./components/Modals";
import { useAppStore } from "./store";

// Lazy-loaded views (only loaded when user navigates to them)
const CalendarView = React.lazy(() => import("./components/CalendarView").then(m => ({ default: m.CalendarView })));
const SummarizerView = React.lazy(() => import("./components/SummarizerView").then(m => ({ default: m.SummarizerView })));
const JournalView = React.lazy(() => import("./components/Views").then(m => ({ default: m.JournalView })));
const MarketView = React.lazy(() => import("./components/Views").then(m => ({ default: m.MarketView })));
const MemoryView = React.lazy(() => import("./components/Views").then(m => ({ default: m.MemoryView })));
const GrowthView = React.lazy(() => import("./components/Views").then(m => ({ default: m.GrowthView })));
const HabitView = React.lazy(() => import("./components/Views").then(m => ({ default: m.HabitView })));
const CommView = React.lazy(() => import("./components/Views").then(m => ({ default: m.CommView })));
const ProfileView = React.lazy(() => import("./components/Views").then(m => ({ default: m.ProfileView })));
const MyMuseWorkspaceView = React.lazy(() => import("./components/Views").then(m => ({ default: m.MyMuseWorkspaceView })));
const SettingsView = React.lazy(() => import("./components/Views").then(m => ({ default: m.SettingsView })));
const AiPersonaView = React.lazy(() => import("./components/Views").then(m => ({ default: m.AiPersonaView })));
const BrandHubView = React.lazy(() => import("./components/Views").then(m => ({ default: m.BrandHubView })));

import { OmniBar } from "./windows/OmniBar";
import { SystemHUD } from "./components/SystemHUD";
import { ChainOfThought } from "./components/ChainOfThought";
import { BreakpointModal } from "./components/BreakpointModal";

// Loading fallback for lazy views
const ViewLoader = () => (
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF8F5" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(191,163,102,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", animation: "pulse 1.5s ease-in-out infinite" }}>
        <span style={{ fontSize: 18, color: "#C5A059" }}>✦</span>
      </div>
      <div style={{ fontSize: 12, color: "#A89B85", letterSpacing: 1 }}>載入中...</div>
    </div>
    <style dangerouslySetInnerHTML={{__html: `@keyframes pulse { 0%,100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }`}} />
  </div>
);

declare global {
  interface Window {
    activeChatAbortController?: AbortController | null;
    stopActiveChatStream?: (() => void) | null;
    google?: any;
  }
}

const MORANDI_COLORS = ["#FAF6F5", "#F3EBE6", "#EAECE7", "#E7ECF2", "#ECE6F2", "#FAF0F2", "#F2EBEB", "#EAEAE6"];

import { useSend, useImages } from "./hooks/useAi";

export default function App() {
  const state = useAppStore();
  const dispatch = useAppStore(s => s.dispatch);
  const [isMobileFrame, setIsMobileFrame] = useState(false);
  const [showMobileProjRP, setShowMobileProjRP] = useState(false);
  const [activeUacRequest, setActiveUacRequest] = useState<{ id: string; toolName: string; args: any } | null>(null);

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (window.museAPI) {
      window.museAPI.state.load()
        .then((data: any) => {
          if (data) dispatch({ type: "LOAD_STATE_SUCCESS", data });
        })
        .catch((err: any) => console.error("Failed to load state via IPC", err));
    }
  }, [dispatch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (window.museAPI) {
        window.museAPI.state.save({
          projects: state.projects,
          tasks: state.tasks,
          messages: state.messages,
          genThreads: state.genThreads,
          memoryItems: state.memoryItems,
          habits: state.habits,
          reflections: state.reflections,
        }).catch((err: any) => console.error("Failed to save state via IPC", err));
      }
    }, 2000); // Debounce save
    return () => clearTimeout(timeout);
  }, [state.projects, state.tasks, state.messages, state.genThreads, state.memoryItems, state.habits, state.reflections]);

  const renderGlobalDeveloperSwitcher = () => null;

  // Splash screen automatically disappears after 2.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const [showLegalModal, setShowLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // --- Muse AI Premium SaaS & Credits State Integration ---
  const [userTier, setUserTier] = useState<'free' | 'lite' | 'pro'>(() => {
    return (localStorage.getItem("muse_user_tier") as any) || 'free';
  });
  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem("muse_user_credits");
    return saved ? parseInt(saved, 10) : 1300;
  });
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [lastClaimedDate, setLastClaimedDate] = useState<string | null>(() => {
    return localStorage.getItem("muse_last_claimed_date");
  });
  const [showProModal, setShowProModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("muse_user_tier", userTier);
  }, [userTier]);

  useEffect(() => {
    localStorage.setItem("muse_user_credits", credits.toString());
  }, [credits]);

  useEffect(() => {
    if (lastClaimedDate) {
      localStorage.setItem("muse_last_claimed_date", lastClaimedDate);
    } else {
      localStorage.removeItem("muse_last_claimed_date");
    }
  }, [lastClaimedDate]);

  useEffect(() => {
    if (state.enabledSkills) {
      localStorage.setItem("muse_enabled_skills", JSON.stringify(state.enabledSkills));
    }
  }, [state.enabledSkills]);

  // 🔄 Restore persistent session state on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("muse_user_session");
      if (savedSession) {
        const user = JSON.parse(savedSession);
        if (user && user.id) {
          dispatch({ type: "LOGIN_SUCCESS", user });
        }
      }
    } catch (e) {
      console.error("Failed to restore user session:", e);
    }
  }, [dispatch]);

  // 🔐 Restore System-level Vault Keys
  useEffect(() => {
    const restoreVault = async () => {
      if (window.museAPI && window.museAPI.vault) {
        const providers = ["DeepSeek", "MiniMax", "Claude", "GPT", "OpenAI", "Anthropic"];
        for (const provider of providers) {
          try {
            const val = await window.museAPI.vault.load("api_key_" + provider);
            if (val) {
              let parsed = val;
              try { if (typeof val === "string" && val.startsWith("{")) parsed = JSON.parse(val); } catch(e){}
              dispatch({ type: "CONNECT_PROVIDER", provider, apiKey: parsed });
            }
          } catch(e) {}
        }
      }
    };
    restoreVault();
  }, [dispatch]);

  // Canvas Crop & Profile Cover Banner have been extracted to CoverBanner.tsx
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  const [sharedImageUrlParam, setSharedImageUrlParam] = useState<string | null>(null);
  const [sharedPromptParam, setSharedPromptParam] = useState<string>("");
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const send = useSend(state, dispatch);
  const genImg = useImages(state, dispatch);

  useEffect(() => {
    window.stopActiveChatStream = () => {
      if (window.activeChatAbortController) {
        window.activeChatAbortController.abort();
      }
    };
    return () => {
      window.stopActiveChatStream = null;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("sharedimg") || params.get("shareUrl");
    const promptText = params.get("prompt") || "";
    if (url) {
      setSharedImageUrlParam(url);
      setSharedPromptParam(promptText);
    }
  }, []);

  useEffect(() => {
    if ((window as any).ipcRenderer) {
      const handleUacRequest = (_event: any, data: any) => {
        setActiveUacRequest(data);
      };
      (window as any).ipcRenderer.on('mcp:request-permission', handleUacRequest);
      return () => {
        (window as any).ipcRenderer.off('mcp:request-permission', handleUacRequest);
      };
    }
  }, []);

  useEffect(() => {
    if (state.activeNotification) {
      const timer = setTimeout(() => {
        dispatch({ type: "CLEAR_ACTIVE_NOTIFICATION" });
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [state.activeNotification, dispatch]);

  const isMobile = isMobileFrame || windowWidth <= 768;

  const isOmniBar = window.location.hash === '#/omnibar';
  if (isOmniBar) {
    return <OmniBar />;
  }

  if (sharedImageUrlParam) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "#0c0a09", 
        fontFamily: "'Inter', sans-serif", 
        color: "#f5f5f4", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        padding: "40px 20px", 
        boxSizing: "border-box" 
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, userSelect: "none" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#D97706" }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.025em", margin: 0, color: "#fff" }}>MUSE AI ART GALLERY</h1>
            <p style={{ fontSize: 10, color: "#a8a29e", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>創意品牌圖像展示空間</p>
          </div>
        </div>

        {/* Content Box */}
        <div style={{ 
          background: "#1c1917", 
          border: "1px solid #2e2a24", 
          borderRadius: 24, 
          width: "100%", 
          maxWidth: 480, 
          padding: 24, 
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}>
          {/* Large Image Frame */}
          <div style={{ 
            width: "100%", 
            aspectRatio: "1/1", 
            borderRadius: 16, 
            overflow: "hidden", 
            border: "1px solid #2e2a24",
            background: "#0c0a09",
            position: "relative"
          }}>
            <img src={sharedImageUrlParam} alt="Public showcase" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
          </div>

          {/* Details */}
          {sharedPromptParam && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>✨ AI 創作指令 (Prompt)</span>
              <div style={{ 
                background: "#12100e", 
                border: "1px solid #2e2a24", 
                padding: "12px 14px", 
                borderRadius: 12, 
                fontSize: 12, 
                lineHeight: 1.6, 
                color: "#e7e5e4", 
                fontFamily: "var(--font-mono), monospace" 
              }}>
                {sharedPromptParam}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <button 
              onClick={async () => {
                try {
                  const res = await fetch(sharedImageUrlParam);
                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = blobUrl;
                  a.download = "muse-artwork.png";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                } catch (e) {
                  window.open(sharedImageUrlParam, "_blank");
                }
              }} 
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                borderRadius: 12, 
                background: "#D97706", 
                color: "#fff", 
                border: "none", 
                fontSize: 13, 
                fontWeight: 600, 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: 8,
                transition: "background 0.2s"
              }}
            >
              <span>📥</span> 下載此品牌圖像
            </button>
            <button 
              onClick={() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                setSharedImageUrlParam(null);
              }} 
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                borderRadius: 12, 
                background: "transparent", 
                color: "#d6d3d1", 
                border: "1px solid #3f3f46", 
                fontSize: 13, 
                fontWeight: 600, 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: 8,
                transition: "all 0.2s"
              }}
            >
              <span>✨</span> 立刻體驗 Muse AI，自己生成一張！
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, fontSize: 11, color: "#57534e", textAlign: "center" }}>
          © {new Date().getFullYear()} Muse AI. All rights reserved.
        </div>
      </div>
    );
  }

  const body = (isMobile: boolean) => {
    if (state.navView === "projects") return <ProjGrid state={state} dispatch={dispatch} isMobile={isMobile} />;
    if (state.navView === "workspace") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!isMobile && <FileTree state={state} dispatch={dispatch} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {state.editingBrief ? (
            <BriefEd state={state} dispatch={dispatch} />
          ) : (
            <ChatEngine state={state} dispatch={dispatch} tid={state.activeThreadId} proj={state.projects.find(p => p.id === state.activeProjId)} onSend={send} isMobile={isMobile} />
          )}
        </div>
        {!isMobile && <ProjRP state={state} dispatch={dispatch} />}
        <PvPanel state={state} dispatch={dispatch} isMobile={isMobile} />
      </div>
    );
    if (state.navView === "studio") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <StudioView state={state} dispatch={dispatch} send={send} genImg={genImg} isMobile={isMobile} />
        {!isMobile && <StudioRightPanel state={state} dispatch={dispatch} />}
      </div>
    );
    if (state.navView === "journal") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <JournalView state={state} dispatch={dispatch} send={send} isMobile={isMobile} />
        {!isMobile && <JournalRightPanel />}
      </div>
    );
    if (state.navView === "market") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <MarketView state={state} dispatch={dispatch} send={send} isMobile={isMobile} />
        {!isMobile && <MarketRightPanel />}
      </div>
    );
    if (state.navView === "memory") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <MemoryView state={state} dispatch={dispatch} send={send} isMobile={isMobile} />
        {!isMobile && <MemoryRightPanel state={state} />}
      </div>
    );
    if (state.navView === "growth") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <GrowthView state={state} dispatch={dispatch} send={send} isMobile={isMobile} />
        {!isMobile && <GrowthRightPanel state={state} />}
      </div>
    );
    if (state.navView === "habit") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <HabitView state={state} dispatch={dispatch} send={send} isMobile={isMobile} />
        {!isMobile && <HabitRightPanel />}
      </div>
    );

    if (state.navView === "comm") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <CommView state={state} dispatch={dispatch} send={send} isMobile={isMobile} />
        {!isMobile && <CommRightPanel />}
      </div>
    );
    if (state.navView === "mymuse") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <MyMuseWorkspaceView state={state} dispatch={dispatch} isMobile={isMobile} />
      </div>
    );
    if (state.navView === "profile") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ProfileView state={state} dispatch={dispatch} isMobile={isMobile} />
      </div>
    );
    if (state.navView === "ai_persona") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <AiPersonaView state={state} dispatch={dispatch} isMobile={isMobile} />
      </div>
    );
    if (state.navView === "settings") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <SettingsView state={state} dispatch={dispatch} isMobile={isMobile} setShowLegalModal={setShowLegalModal} />
      </div>
    );
    if (state.navView === "brand_hub") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <BrandHubView state={state} dispatch={dispatch} isMobile={isMobile} />
      </div>
    );
    if (state.navView === "calendar") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <CalendarView state={state} dispatch={dispatch} isMobile={isMobile} />
      </div>
    );
    if (state.navView === "summarizer") return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <SummarizerView state={state} dispatch={dispatch} isMobile={isMobile} />
      </div>
    );

    const tid = state.activeGenThreadId;
    return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {tid ? (
            <ChatEngine state={state} dispatch={dispatch} tid={tid} proj={null} onSend={send} isMobile={isMobile} />
          ) : (
            <ChatEngine
              state={state}
              dispatch={dispatch}
              tid="virtual-empty-thread"
              proj={null}
              onSend={(text: string, mode: string, virtualTid: string, attachments?: any[]) => {
                const newTid = "gt-" + Date.now();
                dispatch({ type: "NEW_GEN_THREAD", id: newTid, title: text.slice(0, 15) || "新智慧對話", mode: state.mode });
                send(text, mode, newTid, attachments);
              }}
              isMobile={isMobile}
            />
          )}
        </div>
        {(state.navView === "chat" || state.navView === "workspace") && (
          <PvPanel state={state} dispatch={dispatch} isMobile={isMobile} />
        )}
      </div>
    );
  };

  const getParentHub = (view: string) => {
    if (["workspace_hub", "chat", "projects", "workspace", "calendar"].includes(view)) return "workspace_hub";
    if (["creative_studio", "studio", "comm", "market", "summarizer"].includes(view)) return "creative_studio";
    if (["mymuse"].includes(view)) return "mymuse";
    if (["mindful_growth", "journal", "habit", "growth"].includes(view)) return "mindful_growth";
    if (["my_persona", "profile", "memory"].includes(view)) return "my_persona";
    if (["ai_persona"].includes(view)) return "ai_persona";
    if (["settings"].includes(view)) return "settings";
    return "workspace_hub";
  };

  const hubTabsMap: Record<string, Array<{ key: string; label: string; view: string }>> = {
    workspace_hub: isMobile ? [
      { key: "chat", label: "💬 對話", view: "chat" },
      { key: "projects", label: "📁 企劃案", view: "projects" },
      { key: "calendar", label: "📅 日曆", view: "calendar" }
    ] : [
      { key: "chat", label: "💬 智慧對話", view: "chat" },
      { key: "projects", label: "📁 個人企劃案", view: "projects" },
      { key: "calendar", label: "📅 任務日曆", view: "calendar" }
    ],
    creative_studio: [
      { key: "studio", label: "✨ 內容生成器", view: "studio" },
      { key: "comm", label: "🎭 溝通模擬", view: "comm" },
      { key: "market", label: "🛒 模板市集", view: "market" },
      { key: "summarizer", label: "📋 內容總結器", view: "summarizer" }
    ],
    mindful_growth: [
      { key: "journal", label: "📓 心情日記", view: "journal" },
      { key: "habit", label: "🌱 生活習慣", view: "habit" },
      { key: "growth", label: "📈 成長分析", view: "growth" }
    ],
    my_persona: [
      { key: "profile", label: "👤 個人設置", view: "profile" },
      { key: "memory", label: "✦ AI 記憶體", view: "memory" }
    ]
  };

  const getActiveTabKey = (view: string) => {
    if (["projects", "workspace"].includes(view)) return "projects";
    if (view === "chat") return "chat";
    if (view === "calendar") return "calendar";
    return view;
  };



  const renderMainContent = (isMobile: boolean) => {
    const parentHub = getParentHub(state.navView);
    const tabs = hubTabsMap[parentHub];
    const activeTabKey = getActiveTabKey(state.navView);

    const hubTab = ["projects", "workspace"].includes(state.navView) ? "projects" : (state.navView === "calendar" ? "calendar" : "chat");
    const studioTab = ["studio", "comm", "market", "summarizer"].includes(state.navView) ? state.navView : "studio";
    const growthTab = ["journal", "habit", "growth"].includes(state.navView) ? state.navView : "journal";
    const personaTab = ["profile", "memory"].includes(state.navView) ? state.navView : "profile";

    return (
      <div style={{ 
        flex: 1, 
        display: "flex", 
        overflow: "hidden", 
        position: "relative"
      }}>
        {isMobile && <ActiveNotification notification={state.activeNotification} dispatch={dispatch} theme={T} />}
        {isMobile && showNotifCenter && <NotificationDrawer state={state} dispatch={dispatch} setShowNotifCenter={setShowNotifCenter} theme={T} />}
        {/* Mobile Sidebar backdrop */}
        {isMobile && state.sbOpen && (
          <div 
            onClick={() => dispatch({ type: "TOGGLE_SB" })} 
            style={{ 
              position: "absolute", 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: "rgba(0,0,0,0.3)", 
              backdropFilter: "blur(2px)",
              zIndex: 999 
            }} 
          />
        )}

        <Sidebar 
          state={state} 
          dispatch={dispatch} 
          isMobile={isMobile} 
          hubTab={hubTab} 
          studioTab={studioTab} 
          growthTab={growthTab} 
          personaTab={personaTab} 
        />

        {/* Outer Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {isMobile && (
            <MobileHeader
              state={state}
              dispatch={dispatch}
              credits={credits}
              userTier={userTier}
              parentHub={parentHub}
              setShowProModal={setShowProModal}
              setShowMobileProjRP={setShowMobileProjRP}
              showNotifCenter={showNotifCenter}
              setShowNotifCenter={setShowNotifCenter}
              theme={T}
            />
          )}

          <CoverBanner state={state} dispatch={dispatch} parentHub={parentHub} isMobile={isMobile} theme={T} />

          {/* Luxury Pill Capsule Tab Switcher */}
          {tabs && (
            <div style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg, #FAF8F5 0%, #FFFDFB 100%)", borderBottom: `0.5px solid rgba(220, 215, 206, 0.5)`, paddingRight: isMobile ? 8 : 16 }}>
              <div 
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: isMobile ? "8px 4px 8px 12px" : "10px 4px 10px 16px",
                  flexShrink: 0,
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  flex: 1
                }}
                className="hub-tabs-container"
              >
                <style dangerouslySetInnerHTML={{__html: `
                  .hub-tabs-container::-webkit-scrollbar { display: none; }
                `}} />
                {/* 🔮 Desktop Back to Chat Button */}
                {!isMobile && state.navView !== "chat" && (
                  <button 
                    onClick={() => dispatch({ type: "SET_NAV", view: "chat" })}
                    style={{
                      background: "#fff",
                      border: "0.5px solid rgba(197, 160, 89, 0.45)",
                      borderRadius: "50%",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: T.goldDark,
                      boxShadow: "0 2px 6px rgba(197, 160, 89, 0.06)",
                      transition: "all 0.2s",
                      outline: "none",
                      flexShrink: 0,
                      marginRight: 8
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = T.goldLight;
                      e.currentTarget.style.transform = "translateX(-2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                    title="返回對話頁面"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                )}
                {tabs.map(tab => {
                  const isTabActive = activeTabKey === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => dispatch({ type: "SET_NAV", view: tab.view })}
                      style={{
                        padding: isMobile ? "4px 10px" : "6px 14px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: isTabActive ? 600 : 400,
                        cursor: "pointer",
                        border: isTabActive ? "0.5px solid rgba(197, 160, 89, 0.4)" : "0.5px solid transparent",
                        background: isTabActive ? "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)" : "transparent",
                        color: isTabActive ? T.goldDark : T.textGhost,
                        boxShadow: isTabActive ? "0 2px 8px rgba(197, 160, 89, 0.08)" : "none",
                        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                        outline: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                      onMouseEnter={e => {
                        if (!isTabActive) {
                          e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                          e.currentTarget.style.color = T.text;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isTabActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = T.textGhost;
                        }
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}

                {parentHub === "workspace_hub" && (
                  <>
                    <div style={{
                      width: 1,
                      height: 16,
                      background: "rgba(220, 215, 206, 0.8)",
                      margin: isMobile ? "0 4px" : "0 6px",
                      flexShrink: 0
                    }} />

                    {isMobile ? (
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "4px",
                          background: state.chatBgColor || "#FAF6F5",
                          border: "1.5px solid #BFA366",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                          cursor: "pointer",
                          outline: "none",
                          padding: 0,
                          flexShrink: 0,
                          transition: "transform 0.15s ease"
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {MORANDI_COLORS.map(color => {
                          const isSelected = (state.chatBgColor || "#FAF6F5") === color;
                          return (
                            <button
                              key={color}
                              onClick={() => dispatch({ type: "SET_CHAT_BG_COLOR", color })}
                              style={{
                                width: 15,
                                height: 15,
                                borderRadius: "50%",
                                background: color,
                                border: isSelected ? "2.5px solid #BFA366" : "1.5px solid rgba(220, 215, 206, 0.8)",
                                boxShadow: isSelected ? "0 2px 8px rgba(191, 163, 102, 0.45)" : "0 1px 3px rgba(0,0,0,0.06)",
                                cursor: "pointer",
                                outline: "none",
                                padding: 0,
                                flexShrink: 0,
                                transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform = "scale(1.25)";
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = "#BFA366";
                                }
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = "scale(1)";
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = "rgba(220, 215, 206, 0.8)";
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 🔮 Right-side pinned controls (YC Avatar & Preview Toggle) */}
              {parentHub === "workspace_hub" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12, marginRight: isMobile ? 4 : 0 }}>
                  {/* YC Avatar */}
                  <div style={{ width: 23, height: 23, borderRadius: "50%", background: T.gold, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600 }} title="使用者帳戶">YC</div>
                  
                  {/* Preview Toggle Button [||] */}
                  <button 
                    onClick={() => dispatch({ type: "TOGGLE_PV" })}
                    style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: 6, 
                      border: `0.5px solid ${state.pvOpen ? T.gold : T.border}`, 
                      background: state.pvOpen ? "rgba(197, 160, 89, 0.08)" : T.bgCard, 
                      cursor: "pointer", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      color: state.pvOpen ? T.goldDark : T.textGhost,
                      transition: "all 0.2s"
                    } as any}
                    title="側邊欄✦PREVIEW & EXPORT 收/展"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M15 3v18" />
                    </svg>
                  </button>
                </div>
              )}

              {isMobile && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 32,
                  background: "linear-gradient(to left, #FFFDFB 15%, transparent 100%)",
                  pointerEvents: "none",
                  zIndex: 10
                }} />
              )}
              {isMobile && parentHub === "workspace_hub" && showColorPicker && (
                <>
                  <div 
                    onClick={() => setShowColorPicker(false)}
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 99999,
                      background: "transparent"
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 12,
                    background: "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "0.5px solid rgba(197, 160, 89, 0.35)",
                    borderRadius: 16,
                    padding: "12px",
                    boxShadow: "0 10px 30px rgba(138, 110, 62, 0.18)",
                    zIndex: 100000,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 10,
                    animation: "fadeInColorPicker 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                  }}>
                    <style dangerouslySetInnerHTML={{__html: `
                       @keyframes fadeInColorPicker {
                         0% { opacity: 0; transform: translateY(-5px) scale(0.95); }
                         100% { opacity: 1; transform: translateY(0) scale(1); }
                       }
                    `}} />
                    {MORANDI_COLORS.map(color => {
                      const isSelected = (state.chatBgColor || "#FAF6F5") === color;
                      return (
                        <button
                          key={color}
                          onClick={() => {
                            dispatch({ type: "SET_CHAT_BG_COLOR", color });
                            setShowColorPicker(false);
                          }}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: color,
                            border: isSelected ? "2.5px solid #BFA366" : "1.5px solid rgba(220, 215, 206, 0.8)",
                            boxShadow: isSelected ? "0 2px 8px rgba(191, 163, 102, 0.5)" : "0 1px 3px rgba(0,0,0,0.06)",
                            cursor: "pointer",
                            outline: "none",
                            padding: 0,
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: T.bg }}>
            <Suspense fallback={<ViewLoader />}>
              {body(isMobile)}
            </Suspense>
          </div>

          <ProjectsDrawer state={state} dispatch={dispatch} showMobileProjRP={showMobileProjRP} setShowMobileProjRP={setShowMobileProjRP} theme={T} />

          {/* ⏳ 局部滑動式歷史智慧對話抽屜 Drawer Overlay */}
          <HistoryDrawer state={state} dispatch={dispatch} theme={T} />

          {/* 📁 局部滑動式協作專案列表抽屜 Drawer Overlay */}
          <ProjectsListDrawer state={state} dispatch={dispatch} theme={T} />

        </div>
      </div>
    );
  };

  if (showSplash) {
    return (
      <AuthLayout isMobileFrame={isMobileFrame} frameBg="#1C1A17" bottomBarBg="#0C0A09">
        <SplashScreen onDismiss={() => setShowSplash(false)} />
        {renderGlobalDeveloperSwitcher()}
      </AuthLayout>
    );
  }

  if (!state.user) {
    return (
      <AuthLayout isMobileFrame={isMobileFrame} frameBg="#fff" bottomBarBg={T.bgCard}>
        <LandingPage state={state} dispatch={dispatch} setShowLegalModal={setShowLegalModal} isMobile={isMobile} />
        {renderGlobalDeveloperSwitcher()}
      </AuthLayout>
    );
  }

  const modalsBlock = (
    <>
      {state.modal === "new-project" && <NewProjModal dispatch={dispatch} />}
      {state.modal === "add-file" && <AddFileModal state={state} dispatch={dispatch} />}
      {state.modal === "add-folder" && <AddFolderModal dispatch={dispatch} />}
      {state.modal === "new-proj-thread" && <NewThreadModal dispatch={dispatch} isProject={true} />}
      {state.modal === "new-gen-thread" && <NewThreadModal dispatch={dispatch} isProject={false} />}

      {/* 👑 Muse AI 訂閱與付費計畫 Modal */}
      {showProModal && (
        <ProModal 
          userTier={userTier} setUserTier={setUserTier}
          credits={credits} setCredits={setCredits}
          billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod}
          setShowProModal={setShowProModal}
        />
      )}

      {/* 📜 隱私權政策與服務條款 Modal */}
      {showLegalModal && (
        <LegalModal 
          showLegalModal={showLegalModal} 
          setShowLegalModal={setShowLegalModal} 
        />
      )}

      {/* 🛡️ System HUD for MCP/Status */}
      <div className="no-drag">
        <SystemHUD />
      </div>      {/* 🛑 Breakpoint Modal */}
      {activeUacRequest && (
        <div className="no-drag">
          <BreakpointModal 
            toolName={activeUacRequest.toolName} 
            args={activeUacRequest.args} 
            onAllow={() => {
              (window as any).ipcRenderer.send(`mcp:permission-response:${activeUacRequest.id}`, true);
              setActiveUacRequest(null);
            }} 
            onDeny={() => {
              (window as any).ipcRenderer.send(`mcp:permission-response:${activeUacRequest.id}`, false);
              setActiveUacRequest(null);
            }} 
          />
        </div>
      )}
    </>
  );

  if (isMobileFrame) {
    return (
      <MobileEmulatorLayout fontFamily={state.fontFamily} renderGlobalDeveloperSwitcher={renderGlobalDeveloperSwitcher}>
        {renderMainContent(true)}
        {modalsBlock}
      </MobileEmulatorLayout>
    );
  }

  return (
    <DesktopLayout 
      fontFamily={state.fontFamily} 
      theme={T}
      topbar={
        <DesktopTopbar 
          dispatch={dispatch} 
          userTier={userTier} 
          credits={credits} 
          setShowProModal={setShowProModal} 
          isMobileFrame={isMobileFrame} 
          setIsMobileFrame={setIsMobileFrame} 
          theme={T} 
        />
      }
      modals={<>{modalsBlock}{renderGlobalDeveloperSwitcher()}</>}
    >
      {renderMainContent(false)}
    </DesktopLayout>
  );
}
