import React, { useState, useEffect } from "react";
import { T } from "../constants";

function mapSupabaseUser(user: any) {
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Musedini 會員",
    email: user.email || "",
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || "M",
    provider: "google"
  };
}

export function LoginScreen({ state, dispatch, setShowLegalModal, isMobile }: any) {
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom/offline profile switcher states
  const [showCustomLogin, setShowCustomLogin] = useState(false);
  const [customName, setCustomName] = useState("莫蘭迪探索者");
  const [customEmail, setCustomEmail] = useState("morandi@muse-ai.com");
  const [selectedAvatar, setSelectedAvatar] = useState("✨");

  const handleGoogleLogin = async (response: any) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (!window.museAPI) {
        throw new Error("Electron environment not detected. IPC is unavailable.");
      }
      const data = await window.museAPI.auth.google(response.credential);
      localStorage.setItem("muse_user_session", JSON.stringify(data.user));
      dispatch({ type: "LOGIN_SUCCESS", user: data.user });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "伺服器連線異常，請確認後端已啟動");
    } finally {
      setLoading(false);
    }
  };

  const handleWebGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { supabase } = await import("../lib/supabaseClient");
      if (!supabase) throw new Error("MUSE AI 的共用會員登入尚未設定。");
      sessionStorage.setItem("muse_musedini_sso_attempted", "1");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` }
      });
      if (error) throw error;
    } catch (err: any) {
      sessionStorage.removeItem("muse_musedini_sso_attempted");
      setErrorMessage(err.message || "Google 登入啟動失敗");
      setLoading(false);
    }
  };

  const handleCustomProfileLogin = () => {
    if (!customName.trim() || !customEmail.trim()) {
      setErrorMessage("您的姓名或電子郵件尚未輸入完成");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const mockUser = {
        id: "mock_user_" + Date.now(),
        name: customName.trim(),
        email: customEmail.trim(),
        avatar: selectedAvatar,
        provider: "local"
      };
      localStorage.setItem("muse_user_session", JSON.stringify(mockUser));
      dispatch({ type: "LOGIN_SUCCESS", user: mockUser });
      setLoading(false);
    }, 450);
  };

  const handleBypassLogin = () => {
    setLoading(true);
    setTimeout(() => {
      const mockUser = {
        id: "mock_user_yc",
        name: "莫蘭迪探索者",
        email: "morandi@muse-ai.com",
        avatar: "YC", // Works with local profile
        provider: "local"
      };
      localStorage.setItem("muse_user_session", JSON.stringify(mockUser));
      dispatch({ type: "LOGIN_SUCCESS", user: mockUser });
      setLoading(false);
    }, 450);
  };

  useEffect(() => {
    if (!window.museAPI) {
      let disposed = false;
      let unsubscribe: (() => void) | undefined;

      const restoreWebSession = async () => {
        const { supabase } = await import("../lib/supabaseClient");
        if (disposed) return;
        if (!supabase) {
          setGoogleLoaded(false);
          setErrorMessage("MUSE AI 的共用會員登入尚未設定。");
          return;
        }

        const acceptSession = (session: any) => {
          if (!session?.user || disposed) return false;
          const user = mapSupabaseUser(session.user);
          localStorage.setItem("muse_user_session", JSON.stringify(user));
          sessionStorage.removeItem("muse_musedini_sso_attempted");
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.has("sso")) {
            currentUrl.searchParams.delete("sso");
            window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search + currentUrl.hash);
          }
          dispatch({ type: "LOGIN_SUCCESS", user });
          return true;
        };

        const { data: sessionData } = await supabase.auth.getSession();
        if (acceptSession(sessionData.session)) return;

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          acceptSession(session);
        });
        unsubscribe = () => authListener.subscription.unsubscribe();
        setGoogleLoaded(true);

        const attemptKey = "muse_musedini_sso_attempted";
        if (sessionStorage.getItem(attemptKey)) return;
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 3500);
        try {
          const response = await fetch("https://www.musedini.com/api/sso/status", {
            credentials: "include",
            mode: "cors",
            cache: "no-store",
            signal: controller.signal
          });
          const payload = await response.json().catch(() => null) as { authenticated?: boolean } | null;
          if (!disposed && response.ok && payload?.authenticated) {
            sessionStorage.setItem(attemptKey, "1");
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/?sso=1` }
            });
            if (error) sessionStorage.removeItem(attemptKey);
          }
        } catch {
          // Central SSO is an enhancement; the normal MUSE AI login remains available.
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      restoreWebSession().catch((error) => {
        if (!disposed) setErrorMessage(error instanceof Error ? error.message : "會員登入初始化失敗");
      });
      return () => {
        disposed = true;
        unsubscribe?.();
      };
    }

    const scriptId = "google-gis-sdk";
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const initButton = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "898517228830-g30q75r1lfls873jkslhspgrkh9m8d1j.apps.googleusercontent.com", // Valid default placeholder client ID
          callback: handleGoogleLogin
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn-container"),
          { theme: "outline", size: "large", width: 280, shape: "pill", text: "signin_with" }
        );
        setGoogleLoaded(true);
      }
    };

    if (window.google) {
      initButton();
    } else {
      script.onload = () => {
        initButton();
      };
    }
  }, [dispatch]);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "linear-gradient(135deg, #FAF8F5 0%, #E6DFD5 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'Outfit', system-ui, sans-serif",
      position: "relative",
      overflowY: "auto",
      overflowX: "hidden",
      padding: "16px 0",
      boxSizing: "border-box"
    }}>
      {/* Transparent Drag Region with Window Controls */}
      {!isMobile && (
        <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 40, display: "flex", justifyContent: "flex-end", padding: "0 16px", alignItems: "center", zIndex: 9999 }}>
          <div className="no-drag" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button 
              onClick={(e) => { e.stopPropagation(); window.museAPI?.windowAction('minimize'); }}
              style={{ width: 14, height: 14, borderRadius: "50%", background: "#E5E5EA", border: "none", cursor: "pointer", opacity: 0.8 }}
            />
            <button 
              onClick={(e) => { e.stopPropagation(); window.museAPI?.windowAction('maximize'); }}
              style={{ width: 14, height: 14, borderRadius: "50%", background: "#E5E5EA", border: "none", cursor: "pointer", opacity: 0.8 }}
            />
            <button 
              onClick={(e) => { e.stopPropagation(); window.museAPI?.windowAction('close'); }}
              style={{ width: 14, height: 14, borderRadius: "50%", background: "#ef4444", border: "none", cursor: "pointer", opacity: 0.9 }}
            />
          </div>
        </div>
      )}

      {/* Decorative Orbs */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(197, 160, 89, 0.08) 0%, rgba(197, 160, 89, 0) 70%)", top: "-10%", left: "-10%", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(108, 138, 192, 0.06) 0%, rgba(108, 138, 192, 0) 70%)", bottom: "-15%", right: "-10%", filter: "blur(50px)" }} />

      <div style={{
        width: "90%",
        maxWidth: 420,
        padding: isMobile ? "16px 20px" : "40px 32px",
        borderRadius: 24,
        background: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(220, 215, 206, 0.6)",
        boxShadow: "0 20px 50px rgba(61, 46, 26, 0.1)",
        textAlign: "center",
        boxSizing: "border-box",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "fadeIn 0.6s ease-out",
        margin: "auto 0"
      }}>
        {/* Title (Bronze gold color applied from the removed star, cleanly shifted upwards) */}
        <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, letterSpacing: 1, color: T.gold, fontFamily: "'Georgia', serif" }}>
          MUSE AI
        </h1>
        
        {/* Subtitle */}
        <div style={{ fontSize: isMobile ? 9.5 : 11.5, color: T.textMid, marginTop: isMobile ? 4 : 8, letterSpacing: 0.5, lineHeight: 1.5 }}>
          您的專屬高奢智慧寫作與個人企劃案工作區
        </div>

        <div style={{ borderBottom: `0.5px solid ${T.borderLight}`, width: "100%", margin: isMobile ? "8px 0" : "20px 0" }} />

        {/* Feature Highlights */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: isMobile ? 6 : 11, 
          width: "100%", 
          textAlign: "left", 
          marginBottom: isMobile ? 12 : 24, 
          background: "rgba(197, 160, 89, 0.03)", 
          padding: isMobile ? "8px 12px" : "14px 18px", 
          borderRadius: 16, 
          border: "0.5px solid rgba(197, 160, 89, 0.12)" 
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 6 : 8, fontSize: isMobile ? 9.5 : 11, color: T.textMid }}>
            <span style={{ color: T.gold, fontWeight: "bold", marginTop: 1 }}>✨</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontWeight: 650, color: "#3D2E1A" }}>臻至細節的實體編譯</span>
              <span style={{ fontSize: isMobile ? 8.5 : 9.5, color: T.textGhost, lineHeight: 1.3 }}>支援一鍵生成 100% 真實 PDF、Word 及 Excel 格式，無縫連動辦公系統。</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 6 : 8, fontSize: isMobile ? 9.5 : 11, color: T.textMid }}>
            <span style={{ color: T.gold, fontWeight: "bold", marginTop: 1 }}>🌱</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontWeight: 650, color: "#3D2E1A" }}>靈動優雅的樹狀整理</span>
              <span style={{ fontSize: isMobile ? 8.5 : 9.5, color: T.textGhost, lineHeight: 1.3 }}>極致流暢的樹狀雙端拖放體驗，讓思緒與資料層級平滑歸位、井然有序。</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 6 : 8, fontSize: isMobile ? 9.5 : 11, color: T.textMid }}>
            <span style={{ color: T.gold, fontWeight: "bold", marginTop: 1 }}>✦</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontWeight: 650, color: "#3D2E1A" }}>歲月留痕的時光沙盒</span>
              <span style={{ fontSize: isMobile ? 8.5 : 9.5, color: T.textGhost, lineHeight: 1.3 }}>仿若時光機的 Git-like 版本歷史，逐行還原靈感蛻變與卓越演進。</span>
            </div>
          </div>
        </div>

        {/* Login Buttons Area */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 8 : 12 }}>
          {errorMessage && (
            <div style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#EF4444",
              fontSize: 10.5,
              textAlign: "left",
              lineHeight: 1.4,
              boxSizing: "border-box"
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {loading ? (
            <div style={{ fontSize: 12, color: T.gold, padding: "12px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${T.gold}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              安全連線驗證中...
            </div>
          ) : (
            <>
              {/* Google Button Container Wrapper (Ensures visibility state is fully respected by overriding any third-party SDK dynamic styles) */}
              <div style={{ display: !showCustomLogin ? "flex" : "none", width: "100%", justifyContent: "center", marginBottom: !showCustomLogin ? 12 : 0 }}>
                {window.museAPI ? (
                  <div
                    id="google-signin-btn-container"
                    style={{
                      display: "flex",
                      minHeight: 40,
                      justifyContent: "center",
                      width: "100%"
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleWebGoogleLogin}
                    disabled={!googleLoaded}
                    style={{
                      width: 280,
                      minHeight: 40,
                      borderRadius: 20,
                      border: "1px solid #DADCE0",
                      background: "#FFFFFF",
                      color: "#3C4043",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: googleLoaded ? "pointer" : "wait"
                    }}
                  >
                    使用 Google 帳號登入
                  </button>
                )}
              </div>

              {!showCustomLogin ? (
                <>
                  {!googleLoaded && (
                    <div style={{ fontSize: 10.5, color: T.textGhost }}>
                      正在載入 Google 安全登入元件...
                    </div>
                  )}

                  {/* Google error hint */}
                  <div style={{ fontSize: 9.5, color: T.textGhost, maxWidth: 300, margin: "4px 0", lineHeight: 1.45 }}>
                    💡 本地離線環境無法連線 Google OAuth？您可以點擊下方切換為「自訂創作者身份登入」來自由切換與建立帳號！
                  </div>

                  {/* Or divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", margin: isMobile ? "4px 0" : "8px 0" }}>
                    <div style={{ flex: 1, height: "0.5px", background: T.borderLight }} />
                    <span style={{ fontSize: 9.5, color: T.textGhost, fontWeight: 600 }}>或</span>
                    <div style={{ flex: 1, height: "0.5px", background: T.borderLight }} />
                  </div>

                  {/* Switch to Custom Button */}
                  <button
                    onClick={() => setShowCustomLogin(true)}
                    style={{
                      width: 280,
                      height: isMobile ? 36 : 40,
                      borderRadius: 20,
                      border: `1.5px solid ${T.goldBorder}`,
                      background: "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)",
                      color: T.goldDark,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      boxShadow: "0 2px 5px rgba(197, 160, 89, 0.06)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.015)"; e.currentTarget.style.boxShadow = "0 4px 8px rgba(197, 160, 89, 0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 5px rgba(197, 160, 89, 0.06)"; }}
                  >
                    🎨 自訂創作者身份登入
                  </button>
                </>
              ) : (
                <div style={{
                  width: "100%",
                  background: "#FAF9F6",
                  border: `0.5px solid ${T.border}`,
                  borderRadius: 16,
                  padding: isMobile ? "10px 14px" : "16px 20px",
                  boxSizing: "border-box",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: isMobile ? 8 : 12,
                  animation: "fadeIn 0.3s ease-out"
                }}>
                  <div style={{ fontSize: 13, fontWeight: 750, color: "#3D2E1A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>✦ 切換/自訂登入帳號</span>
                    <span style={{ fontSize: 9.5, fontWeight: "normal", color: T.goldDark, background: T.goldLight, padding: "1px 6px", borderRadius: 6 }}>OFFLINE WORKSPACE</span>
                  </div>

                  <div>
                    <label style={{ fontSize: isMobile ? 9.5 : 10.5, fontWeight: 600, color: T.textDim, display: "block", marginBottom: isMobile ? 2 : 4 }}>創作者姓名</label>
                    <input 
                      type="text" 
                      value={customName} 
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="例如：莫蘭迪探索者"
                      style={{
                        width: "100%",
                        padding: isMobile ? "6px 8px" : "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        fontSize: isMobile ? 10.5 : 11.5,
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: isMobile ? 9.5 : 10.5, fontWeight: 600, color: T.textDim, display: "block", marginBottom: isMobile ? 2 : 4 }}>電子郵件 Email</label>
                    <input 
                      type="text" 
                      value={customEmail} 
                      onChange={e => setCustomEmail(e.target.value)}
                      placeholder="例如：morandi@muse-ai.com"
                      style={{
                        width: "100%",
                        padding: isMobile ? "6px 8px" : "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        fontSize: isMobile ? 10.5 : 11.5,
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: isMobile ? 9.5 : 10.5, fontWeight: 600, color: T.textDim, display: "block", marginBottom: isMobile ? 4 : 6 }}>選擇靈魂頭像</label>
                    <div style={{ display: "flex", gap: isMobile ? 6 : 10, justifyContent: "space-around" }}>
                      {["✨", "🎨", "📁", "⚡", "☕"].map(emoji => {
                        const active = selectedAvatar === emoji;
                        return (
                          <button
                            key={emoji}
                            onClick={() => setSelectedAvatar(emoji)}
                            style={{
                              width: isMobile ? 28 : 32,
                              height: isMobile ? 28 : 32,
                              borderRadius: "50%",
                              border: active ? `2px solid ${T.gold}` : "0.5px solid rgba(220,215,206,0.8)",
                              background: active ? "#FFFDF9" : "#ffffff",
                              fontSize: isMobile ? 14 : 16,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s",
                              boxShadow: active ? "0 3px 8px rgba(197,160,89,0.2)" : "none"
                            }}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: isMobile ? 2 : 4 }}>
                    <button
                      onClick={() => setShowCustomLogin(false)}
                      style={{
                        flex: 1,
                        padding: isMobile ? "6px 0" : "8px 0",
                        borderRadius: 10,
                        border: `0.5px solid ${T.border}`,
                        background: "#ffffff",
                        color: T.textDim,
                        fontSize: isMobile ? 10.5 : 11,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      返回
                    </button>
                    <button
                      onClick={handleCustomProfileLogin}
                      style={{
                        flex: 2,
                        padding: isMobile ? "6px 0" : "8px 0",
                        borderRadius: 10,
                        border: "none",
                        background: T.goldDark,
                        color: "#ffffff",
                        fontSize: isMobile ? 10.5 : 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 3px 8px rgba(138,110,62,0.25)"
                      }}
                    >
                      確認登入帳號
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ fontSize: isMobile ? 8 : 9.5, color: T.textGhost, marginTop: isMobile ? 12 : 32, lineHeight: isMobile ? 1.35 : 1.6 }}>
          登入即代表您同意以單機沙盒運行本產品二進位編譯服務。
          請參閱 
          <span 
            onClick={() => setShowLegalModal('privacy')} 
            style={{ color: T.goldDark, cursor: "pointer", textDecoration: "underline", margin: "0 4px", fontWeight: "bold" }}
          >
            隱私權政策
          </span>
          與 
          <span 
            onClick={() => setShowLegalModal('terms')} 
            style={{ color: T.goldDark, cursor: "pointer", textDecoration: "underline", margin: "0 4px", fontWeight: "bold" }}
          >
            服務條款
          </span>
          。
          <div style={{ marginTop: isMobile ? 2 : 6, opacity: 0.85, fontSize: isMobile ? 8 : 9 }}>
            Muse AI is developed by Musedini. (Muse AI 由 Musedini 開發。)
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
