import React, { useState } from "react";
import { TIn, Lbl, Sel, Btn, MBox } from "./Common";
import { PROJ_COLORS, PHASES, MODES, T } from "../constants";

export function NewProjModal({ dispatch }: any) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJ_COLORS[0]);
  const [brief, setBrief] = useState("");
  return (
    <MBox title="建立新企劃案" onClose={() => dispatch({ type: "CLOSE_MODAL" })}>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div>
          <Lbl>企劃案名稱</Lbl>
          <TIn value={name} onChange={setName} placeholder="輸入企劃案名稱..." />
        </div>
        <div>
          <Lbl>標記色彩</Lbl>
          <div style={{ display: "flex", gap: 8 }}>
            {PROJ_COLORS.map(c => (
              <div key={c} onClick={() => setColor(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? `2.5px solid ${T.text}` : "2px solid transparent", transition: "border .15s" }} />
            ))}
          </div>
        </div>
        <div>
          <Lbl>Plan Brief（選填）</Lbl>
          <TIn value={brief} onChange={setBrief} placeholder="描述目標、受眾、AI 回應框架..." rows={3} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <Btn onClick={() => dispatch({ type: "CLOSE_MODAL" })}>取消</Btn>
          <Btn disabled={!name.trim()} style={{ background: "#bfccd4", color: "#fff", border: "none" }} onClick={() => { if (name.trim()) dispatch({ type: "NEW_PROJECT", name, color, brief }); }}>建立企劃案</Btn>
        </div>
      </div>
    </MBox>
  );
}

export function AddFileModal({ state, dispatch }: any) {
  const proj = state.projects.find((p: any) => p.id === state.activeProjId);
  const [name, setName] = useState("");
  const [ftype, setFtype] = useState("pdf");
  const [folderId, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileCount = proj?.files?.length || 0;
  const isLimitReached = fileCount >= 10;

  const handleAdd = async () => {
    if (!name.trim() && !file) return;
    
    let finalName = name;
    let content = "";
    
    if (file) {
      setUploading(true);
      try {
        if (!window.museAPI) throw new Error("IPC not available");
        const buffer = await file.arrayBuffer();
        const data = await window.museAPI.file.parse({
          name: file.name,
          type: file.type,
          buffer
        });
        if (data.success) {
          finalName = name.trim() || data.filename;
          content = data.content;
          // auto detect ext
          if (data.filename.endsWith(".pdf")) setFtype("pdf");
          if (data.filename.endsWith(".md")) setFtype("md");
          if (data.filename.endsWith(".txt")) setFtype("txt");
        } else {
          alert("上傳失敗：" + data.error);
          setUploading(false);
          return;
        }
      } catch (err) {
        alert("上傳發生錯誤");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    
    const ext = `.${ftype}`;
    finalName = (ftype !== "link" && !finalName.toLowerCase().endsWith(ext)) ? `${finalName}${ext}` : finalName;
    dispatch({ type: "ADD_FILE", name: finalName, ftype, folderId: folderId || null, content }); 
  };

  return (
    <MBox title="新增或上傳檔案" onClose={() => dispatch({ type: "CLOSE_MODAL" })} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {isLimitReached && (
          <div style={{ background: "#FEF2F2", color: "#DC2626", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid #F87171" }}>
            本專案已達 10 個檔案上限，請先刪除舊檔案再上傳。
          </div>
        )}
        <div>
          <Lbl>檔案名稱 (選填，若上傳檔案將自動帶入)</Lbl>
          <TIn value={name} onChange={setName} placeholder="例：市場調查" disabled={isLimitReached} />
        </div>
        <div>
          <Lbl>上傳實體檔案 (支援 PDF, TXT, MD，上限 5MB)</Lbl>
          <input 
            type="file" 
            accept=".pdf,.txt,.md" 
            disabled={isLimitReached}
            onChange={e => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                if (selectedFile.size > 5 * 1024 * 1024) {
                  alert("檔案大小不能超過 5MB");
                  e.target.value = "";
                  setFile(null);
                  return;
                }
                setFile(selectedFile);
              } else {
                setFile(null);
              }
            }}
            style={{ fontSize: 12, padding: "8px 0", width: "100%", opacity: isLimitReached ? 0.5 : 1 }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Lbl>類型</Lbl>
            <Sel value={ftype} onChange={setFtype} options={["pdf", "docx", "xlsx", "csv", "md", "txt", "link"].map(t => [t, `.${t}`])} />
          </div>
          <div style={{ flex: 1 }}>
            <Lbl>資料夾</Lbl>
            <Sel value={folderId} onChange={setFolder} options={[["", "（根目錄）"], ...(proj?.folders || []).map((f: any) => [f.id, `📁 ${f.name}`])]} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn onClick={() => dispatch({ type: "CLOSE_MODAL" })}>取消</Btn>
          <Btn gold disabled={isLimitReached || (!name.trim() && !file) || uploading} onClick={handleAdd}>
            {uploading ? "解析中..." : "新增"}
          </Btn>
        </div>
      </div>
    </MBox>
  );
}

export function AddFolderModal({ dispatch }: any) {
  const [name, setName] = useState("");
  return (
    <MBox title="新建資料夾" onClose={() => dispatch({ type: "CLOSE_MODAL" })} width={360}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TIn value={name} onChange={setName} placeholder="資料夾名稱..." />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn onClick={() => dispatch({ type: "CLOSE_MODAL" })}>取消</Btn>
          <Btn gold disabled={!name.trim()} onClick={() => { if (name.trim()) dispatch({ type: "ADD_FOLDER", name }); }}>建立</Btn>
        </div>
      </div>
    </MBox>
  );
}

export function NewThreadModal({ dispatch, isProject = false }: any) {
  const [title, setTitle] = useState("");
  const action = isProject ? "NEW_PROJ_THREAD" : "NEW_GEN_THREAD";
  return (
    <MBox title="新建對話執行緒" onClose={() => dispatch({ type: "CLOSE_MODAL" })} width={380}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TIn value={title} onChange={setTitle} placeholder="執行緒主題..." />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn onClick={() => dispatch({ type: "CLOSE_MODAL" })}>取消</Btn>
          <Btn gold disabled={!title.trim()} onClick={() => { if (title.trim()) dispatch({ type: action, title }); }}>建立</Btn>
        </div>
      </div>
    </MBox>
  );
}

export function ProModal({
  userTier, setUserTier, credits, setCredits, billingPeriod, setBillingPeriod, setShowProModal
}: any) {
  return (
    <>
      {/* 👑 Muse AI 訂閱與付費計畫 Modal */}
      <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 16
        }} onClick={() => setShowProModal(false)}>
          <div style={{
            background: "rgba(18, 18, 24, 0.45)",
            backdropFilter: "blur(30px) saturate(160%)",
            WebkitBackdropFilter: "blur(30px) saturate(160%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 32,
            padding: 32,
            width: "95%",
            maxWidth: 620,
            boxShadow: "0 30px 80px rgba(197, 160, 89, 0.08), 0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            maxHeight: "90vh",
            overflowY: "auto",
            boxSizing: "border-box",
            textAlign: "left"
          }} onClick={e => e.stopPropagation()}>
            
            {/* Gold soft ambient blur */}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 260, height: 60, background: "rgba(197, 160, 89, 0.15)", borderRadius: "50%", filter: "blur(28px)", pointerEvents: "none" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: 1.2, fontFamily: "Georgia, serif" }}>👑 MUSE AI 訂閱與付費計畫</span>
                <span style={{ fontSize: 10, color: "#BFA366", fontFamily: "Georgia, serif", fontStyle: "italic", marginTop: 4, letterSpacing: 0.5 }}>by Musedini</span>
              </div>
              <button 
                onClick={() => setShowProModal(false)}
                style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#8E8E93" }}
              >
                ✕
              </button>
            </div>

            {/* Monthly / Yearly Switcher */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)", padding: 4, borderRadius: 16, maxWidth: 300, width: "100%", margin: "0 auto 28px" }}>
              <button
                onClick={() => setBillingPeriod('monthly')}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 12,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background: billingPeriod === 'monthly' ? '#BFA366' : 'transparent',
                  color: billingPeriod === 'monthly' ? '#000' : '#8E8E93',
                  transition: "all 0.2s"
                }}
              >
                月付計劃 (Monthly)
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 12,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background: billingPeriod === 'yearly' ? '#BFA366' : 'transparent',
                  color: billingPeriod === 'yearly' ? '#000' : '#8E8E93',
                  position: "relative",
                  transition: "all 0.2s"
                }}
              >
                年付計劃 (Yearly)
                <span style={{ position: "absolute", top: -8, right: -4, background: "#EF4444", color: "#fff", fontSize: 7, fontWeight: 900, padding: "1px 6px", borderRadius: 8, transform: "scale(0.85)" }}>-20%</span>
              </button>
            </div>

            {/* Side-by-side Pricing Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              
              {/* LITE TIER */}
              <div style={{
                background: "rgba(255,255,255,0.015)",
                border: userTier === 'lite' ? '1.5px solid #3B82F6' : '1px solid rgba(255,255,255,0.05)',
                borderRadius: 24,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
                boxShadow: userTier === 'lite' ? '0 8px 32px rgba(59, 130, 246, 0.08)' : 'none'
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#3B82F6", letterSpacing: 0.5 }}>⚡ AI Lite</span>
                    {userTier === 'lite' && <span style={{ fontSize: 9, color: "#3B82F6", background: "rgba(59,130,246,0.1)", padding: "2px 7px", borderRadius: 6, fontWeight: "bold" }}>使用中</span>}
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{billingPeriod === 'monthly' ? '$9' : '$7.2'}</span>
                    <span style={{ fontSize: 11, color: "#8E8E93" }}> / 月</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                    <div style={{ fontSize: 11, color: "#D1D5DB", lineHeight: 1.45 }}>✓ 每月 **1,800** 點靈感點數 🪙</div>
                    <div style={{ fontSize: 11, color: "#D1D5DB", lineHeight: 1.45 }}>✓ 啟用高達 **4 個** 專屬技能 🧠</div>
                    <div style={{ fontSize: 11, color: "#D1D5DB", lineHeight: 1.45 }}>✓ 最多建立 **3 個** 自訂 AI 🤖</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserTier('lite');
                    setCredits(1800);
                    setShowProModal(false);
                    alert("🎉 訂閱成功！已開通 Muse AI Lite 智慧寫作服務！");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 14,
                    fontSize: 11.5,
                    fontWeight: 750,
                    cursor: "pointer",
                    border: "none",
                    background: userTier === 'lite' ? 'rgba(59,130,246,0.1)' : '#fff',
                    color: userTier === 'lite' ? '#3B82F6' : '#000',
                    transition: "all 0.15s"
                  }}
                >
                  {userTier === 'lite' ? '目前方案' : '開通 Lite'}
                </button>
              </div>

              {/* PRO TIER */}
              <div style={{
                background: "rgba(197, 160, 89, 0.015)",
                border: userTier === 'pro' ? '1.5px solid #BFA366' : '1px solid rgba(197, 160, 89, 0.25)',
                borderRadius: 24,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
                position: "relative",
                boxShadow: userTier === 'pro' ? '0 12px 40px rgba(197, 160, 89, 0.12)' : 'none'
              }}>
                <div style={{ position: "absolute", top: -10, right: 14, background: "#BFA366", color: "#000", fontSize: 8, fontWeight: 900, padding: "2px 8px", borderRadius: 6 }}>熱門推薦</div>
                
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#BFA366", letterSpacing: 0.5 }}>👑 AI Pro</span>
                    {userTier === 'pro' && <span style={{ fontSize: 9, color: "#BFA366", background: "rgba(191,163,102,0.15)", padding: "2px 7px", borderRadius: 6, fontWeight: "bold" }}>使用中</span>}
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{billingPeriod === 'monthly' ? '$19' : '$15.2'}</span>
                    <span style={{ fontSize: 11, color: "#8E8E93" }}> / 月</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                    <div style={{ fontSize: 11, color: "#BFA366", fontWeight: "bold", lineHeight: 1.45 }}>★ **無上限** 靈感點數 🪙</div>
                    <div style={{ fontSize: 11, color: "#D1D5DB", lineHeight: 1.45 }}>✓ 解鎖全部 **6 大** 協作技能 🧠</div>
                    <div style={{ fontSize: 11, color: "#D1D5DB", lineHeight: 1.45 }}>✓ 無限制自訂 AI 好友與席位 🤖</div>
                    <div style={{ fontSize: 11, color: "#D1D5DB", lineHeight: 1.45 }}>✓ 高級 AI 會議錄音自動轉譯 🎙️</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserTier('pro');
                    setCredits(99999);
                    setShowProModal(false);
                    alert("👑 恭喜升級！已為您解鎖 Muse AI Pro 無限尊榮服務！");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 14,
                    fontSize: 11.5,
                    fontWeight: 750,
                    cursor: "pointer",
                    border: "none",
                    background: '#BFA366',
                    color: '#000',
                    boxShadow: "0 4px 15px rgba(191,163,102,0.3)",
                    transition: "all 0.15s"
                  }}
                >
                  {userTier === 'pro' ? '目前方案' : '開通 Pro'}
                </button>
              </div>

            </div>
          </div>
        </div>
    </>
  );
}

export function LegalModal({
  showLegalModal, setShowLegalModal
}: any) {
  return (
    <>
      {/* 📜 隱私權政策與服務條款 Modal */}
      <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: 16
        }} onClick={() => setShowLegalModal(null)}>
          <div style={{
            background: "rgba(22, 20, 18, 0.85)",
            backdropFilter: "blur(30px) saturate(140%)",
            WebkitBackdropFilter: "blur(30px) saturate(140%)",
            border: "1px solid rgba(197, 160, 89, 0.2)",
            borderRadius: 24,
            padding: 24,
            width: "95%",
            maxWidth: 520,
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            maxHeight: "80vh",
            boxSizing: "border-box",
            textAlign: "left"
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(197, 160, 89, 0.15)", paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: 1.2 }}>
                  {showLegalModal === 'privacy' ? '📜 隱私權政策 (Privacy Policy)' : '📜 服務條款 (Terms of Service)'}
                </span>
                <span style={{ fontSize: 9.5, color: "#BFA366", fontStyle: "italic", marginTop: 2 }}>
                  Muse AI is developed by Musedini. / Muse AI 由 Musedini 開發。
                </span>
              </div>
              <button 
                onClick={() => setShowLegalModal(null)}
                style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: "#8E8E93" }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Contents */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingRight: 6, fontSize: 11.5, color: "#E5E7EB", lineHeight: 1.6 }}>
              {showLegalModal === 'privacy' ? (
                <>
                  <p style={{ margin: 0, fontWeight: "bold", color: "#BFA366" }}>關於本政策</p>
                  <p style={{ margin: 0 }}>**Muse AI 由 Musedini 開發。** 本服務致力於保護您的隱私權。在使用本軟體服務時，您所有的對話、企劃案及資產數據均預設保存在您本機的安全沙盒（LocalStorage）中，我們絕不會在未經授權的情況下向雲端伺服器上傳或轉售您的任何創作內容。</p>
                  
                  <p style={{ margin: 0, fontWeight: "bold", color: "#BFA366" }}>1. 數據收集與儲存</p>
                  <p style={{ margin: 0 }}>我們僅會在本機儲存您建立的自訂 AI 設定、靈感積分餘額、自訂技能開關以及聊天對話歷史。這一切均歸屬於 **Muse AI by Musedini** 所設計的沙盒體系。</p>

                  <p style={{ margin: 0, fontWeight: "bold", color: "#BFA366" }}>2. API 金鑰連線說明</p>
                  <p style={{ margin: 0 }}>若您選擇在設定中連線您的 OpenAI、DeepSeek 或 Gemini 官方個人金鑰，該金鑰亦僅會儲存在您的本機快取中，我們僅會在使用時通過您的裝置向官方伺服器發起加密通訊，確保第三方無法竊取。</p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontWeight: "bold", color: "#BFA366" }}>服務合約與法律宣告</p>
                  <p style={{ margin: 0 }}>**Muse AI 由 Musedini 開發。** 歡迎使用 Muse AI，這是一套高端智慧協作與個人企劃案工作區。使用本產品即代表您已同意遵守本合約的所有條款。</p>
                  
                  <p style={{ margin: 0, fontWeight: "bold", color: "#BFA366" }}>1. 版權所有與免責聲明</p>
                  <p style={{ margin: 0 }}>本軟體之架構、編譯導出功能及品牌均隸屬於 **Muse AI by Musedini**。本產品提供之 AI 內容生成、簡報編譯及 SimilarWeb 流量數據均由本機沙盒模擬引擎生成，僅供學術與企劃研討參考，不構成任何真實投資或操作建議。</p>

                  <p style={{ margin: 0, fontWeight: "bold", color: "#BFA366" }}>2. 尊榮多階訂閱條款</p>
                  <p style={{ margin: 0 }}>用戶可選用 Free、Lite 或 Pro 方案。所有方案之靈感積分計算、每日簽到點數福利以及技能超限鎖定，皆遵循 Musedini 制定之產品階梯規則。若有惡意破解行為，本軟體快取可能自動重置並鎖定服務。</p>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(197, 160, 89, 0.15)", paddingTop: 12, marginTop: 16 }}>
              <button
                onClick={() => setShowLegalModal(null)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 10,
                  background: "#BFA366",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 11,
                  border: "none",
                  cursor: "pointer"
                }}
              >
                已閱讀並同意
              </button>
            </div>
          </div>
        </div>
    </>
  );
}
