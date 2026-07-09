import React, { useState } from "react";
import { T } from "../constants";
import { Btn, Md } from "./Common";

export function SummarizerView({ state, dispatch }: any) {
  const [sourceType, setSourceType] = useState<"custom" | "brief" | "chat">("custom");
  const [customText, setCustomText] = useState("");
  const [selectedProjId, setSelectedProjId] = useState(state.activeProjId || state.projects[0]?.id || "");
  const [selectedThreadId, setSelectedThreadId] = useState(state.activeThreadId || state.activeGenThreadId || state.genThreads[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // Scheduling Form inside state
  const [scheduleTaskText, setScheduleTaskText] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("2026-05-20");
  const [taskProjId, setTaskProjId] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Extract text based on selection
  const getSelectedText = () => {
    if (sourceType === "custom") {
      return customText;
    }
    if (sourceType === "brief") {
      const p = state.projects.find((x: any) => x.id === selectedProjId);
      return p ? p.brief : "";
    }
    if (sourceType === "chat") {
      const msgs = state.messages[selectedThreadId] || [];
      if (msgs.length === 0) return "";
      return msgs
        .map((m: any) => `${m.role === "user" ? "使用者" : "Muse AI"}: ${m.content}`)
        .join("\n\n");
    }
    return "";
  };

  const handleSummarize = async () => {
    const textToSummarize = getSelectedText();
    if (!textToSummarize.trim()) {
      setError("請先提供或選擇欲總結的內容！");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!window.museAPI) throw new Error("IPC not available");
      const data = await window.museAPI.ai.summarize({ content: textToSummarize });
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  };

  const triggerSchedule = (itemText: string) => {
    setScheduleTaskText(itemText);
    setTaskProjId(sourceType === "brief" ? selectedProjId : (state.activeProjId || ""));
    const todayStr = new Date().toISOString().split("T")[0];
    setTaskDueDate(todayStr);
    setTaskPriority("medium");
    setShowScheduleForm(true);
  };

  const confirmScheduleTask = () => {
    if (!scheduleTaskText.trim()) return;

    dispatch({
      type: "ADD_TASK",
      task: {
        title: scheduleTaskText,
        desc: "由 AI 總結行動清單產生",
        dueDate: taskDueDate,
        projectId: taskProjId || null,
        priority: taskPriority,
        status: "todo",
        reminder: true,
      },
    });

    setShowScheduleForm(false);
    // Show feedback popup/alert in a clean div later
    const toast = document.createElement("div");
    toast.className = "fixed bottom-5 right-5 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-2xl z-[9999] transition-all flex items-center gap-2 text-sm pointer-events-none";
    toast.innerHTML = `<span>✅</span> 任務已成功排程並加入行事曆！`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 2500);
  };

  const selectedTextVal = getSelectedText();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "#FAF9F6", overflowY: "auto" }}>
      {/* Title block */}
      <div style={{ padding: "24px 28px 18px", borderBottom: `0.5px solid ${T.borderLight}`, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.goldLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em" }}>AI 內容總結器</h1>
            <p style={{ fontSize: 11, color: T.textGhost, margin: "2px 0 0" }}>使用 Gemini 3.5 智慧模型，萃取長文、專案簡報與對話紀錄的精要和行動指南。</p>
          </div>
        </div>
      </div>

      {/* Main panel container */}
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        
        {/* Source selector and input widget */}
        <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", background: "#FAF9F5", borderBottom: `0.5px solid ${T.borderLight}`, padding: "4px 8px" }}>
            <button
              onClick={() => { setSourceType("custom"); setError(null); }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: sourceType === "custom" ? 600 : 500,
                color: sourceType === "custom" ? T.goldDark : T.textGhost,
                background: sourceType === "custom" ? "#fff" : "transparent",
                border: "none",
                cursor: "pointer",
                boxShadow: sourceType === "custom" ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                transition: "all 0.15s"
              }}
            >
              ✍️ 貼上自訂文字
            </button>
            <button
              onClick={() => { setSourceType("brief"); setError(null); }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: sourceType === "brief" ? 600 : 500,
                color: sourceType === "brief" ? T.goldDark : T.textGhost,
                background: sourceType === "brief" ? "#fff" : "transparent",
                border: "none",
                cursor: "pointer",
                boxShadow: sourceType === "brief" ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                transition: "all 0.15s"
              }}
            >
              📁 專案 Brief 簡報
            </button>
            <button
              onClick={() => { setSourceType("chat"); setError(null); }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: sourceType === "chat" ? 600 : 500,
                color: sourceType === "chat" ? T.goldDark : T.textGhost,
                background: sourceType === "chat" ? "#fff" : "transparent",
                border: "none",
                cursor: "pointer",
                boxShadow: sourceType === "chat" ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                transition: "all 0.15s"
              }}
            >
              💬 AI 智慧對話紀錄
            </button>
          </div>

          <div style={{ padding: 20 }}>
            {sourceType === "custom" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="請將您要分析的文章、會議錄音文字稿、電子郵件、或是長篇文稿貼到此處做萃取分析..."
                  rows={8}
                  style={{
                    width: "100%",
                    padding: 14,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    fontSize: 13,
                    color: T.text,
                    background: T.bgInput,
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 11, color: T.textGhost }}>
                  已經輸入 {customText.length} 字元
                </div>
              </div>
            )}

            {sourceType === "brief" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T.textMid, fontWeight: 500 }}>選擇專案：</span>
                  <select
                    value={selectedProjId}
                    onChange={(e) => setSelectedProjId(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontSize: 12,
                      color: T.text,
                      outline: "none",
                      background: "#fff"
                    }}
                  >
                    {state.projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ padding: 14, background: "#FAF9F5", border: `0.5px solid ${T.borderLight}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: T.textGhost, fontWeight: 600, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>BRIEF 內文預覽</div>
                  {selectedTextVal ? (
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: T.textMid, whiteSpace: "pre-wrap" }}>{selectedTextVal}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.textGhost, fontStyle: "italic" }}>這個專案目前沒有填寫 Brief 內容。</div>
                  )}
                </div>
              </div>
            )}

            {sourceType === "chat" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T.textMid, fontWeight: 500 }}>選擇對話頻道：</span>
                  <select
                    value={selectedThreadId}
                    onChange={(e) => setSelectedThreadId(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontSize: 12,
                      color: T.text,
                      outline: "none",
                      background: "#fff",
                      maxWidth: "100%"
                    }}
                  >
                    <optgroup label="✨ 獨立 AI 會話">
                      {state.genThreads.map((t: any) => (
                        <option key={t.id} value={t.id}>💬 {t.title} ({t.mode})</option>
                      ))}
                    </optgroup>
                    <optgroup label="📁 專案內置對話">
                      {state.projects.flatMap((p: any) => 
                        p.threads.map((t: any) => (
                          <option key={t.id} value={t.id}>📂 [{p.name}] {t.title}</option>
                        ))
                      )}
                    </optgroup>
                  </select>
                </div>
                <div style={{ padding: 14, background: "#FAF9F5", border: `0.5px solid ${T.borderLight}`, borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>
                  <div style={{ fontSize: 11, color: T.textGhost, fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em" }}>完整會話紀錄長度：{(state.messages[selectedThreadId] || []).length} 條</div>
                  {selectedTextVal ? (
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: T.textMid, whiteSpace: "pre-wrap" }}>{selectedTextVal.slice(0, 1000)}{selectedTextVal.length > 1000 ? "\n\n...(為保護排版已折疊其餘內容)..." : ""}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.textGhost, fontStyle: "italic" }}>此對話頻道目前尚沒有任何歷史交談。</div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "0.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, color: "#991B1B", display: "flex", alignItems: "center", gap: 6 }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <Btn
                gold
                onClick={handleSummarize}
                disabled={loading || !selectedTextVal.trim()}
                style={{ padding: "10px 24px", borderRadius: 10, fontWeight: 600, fontSize: 13 }}
              >
                {loading ? "⚡ 正在智能化萃取分析中..." : "✦ 開始 AI 萃取總結"}
              </Btn>
            </div>
          </div>
        </div>

        {/* Loading Spinner Skeleton */}
        {loading && (
          <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 16, padding: "30px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", padding: "40px 0" }}>
              <span style={{ fontSize: 36, animation: "bounce 2s infinite" }}>🧠</span>
              <div style={{ fontWeight: 600, fontSize: 14, color: T.textMid }}>
                Gemini 3.5 正在閱讀整篇上下文資訊...
              </div>
              <div style={{ fontSize: 11, color: T.textGhost }}>
                正在理解架構並生成摘要、核心 Insights 與行動清單...
              </div>
              <div style={{ width: "60%", background: T.borderLight, height: 4, borderRadius: 2, overflow: "hidden", marginTop: 12 }}>
                <div style={{ background: T.gold, height: "100%", width: "70%", animation: "pulse 1.5s infinite" }} />
              </div>
            </div>
          </div>
        )}

        {/* Results layout */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 30px rgba(0,0,0,0.03)" }}>
              
              {/* Header result */}
              <div style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", padding: "16px 20px", borderBottom: `0.5px solid #FDE68A`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>✨</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: T.goldDark, letterSpacing: "0.02em" }}>MUSE AI 智慧分析報告</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`【AI 總結】\n${result.summary}\n\n【關鍵要點】\n${result.takeaways.map((t: string) => `• ${t}`).join("\n")}`);
                    const btn = document.getElementById("copy-all-btn");
                    if (btn) btn.innerHTML = "已複製全部 📋";
                    setTimeout(() => { if (btn) btn.innerHTML = "複製分析報告 ⎘"; }, 2000);
                  }}
                  id="copy-all-btn"
                  style={{ border: "none", background: "rgba(255,255,255,0.8)", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 500, color: T.goldDark, cursor: "pointer" }}
                >
                  複製分析報告 ⎘
                </button>
              </div>

              {/* Summary details */}
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
                
                {/* Executive Summary */}
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>📝</span> 高度摘要分析 (Executive Summary)
                  </h3>
                  <div style={{ padding: 14, background: "#FAF9F6", borderRadius: 10, border: `1px solid ${T.borderLight}`, fontSize: 13, lineHeight: 1.7, color: T.textMid }}>
                    {result.summary}
                  </div>
                </div>

                {/* Key takeaways */}
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🎯</span> 關鍵思維要點 (Key Insights & Takeaways)
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 0, display: "flex", flexDirection: "column", gap: 8, listStyleType: "none" }}>
                    {result.takeaways.map((t: string, i: number) => (
                      <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.6, color: T.textMid }}>
                        <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#FEF3C7", color: T.goldDark, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0 }}>{i + 1}</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action items */}
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>⚙️</span> 具體行動方案 (Action Items)
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.actionItems.map((item: string, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          background: "#fff",
                          border: `0.5px solid ${T.border}`,
                          borderRadius: 10,
                          gap: 12,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.01)"
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1 }}>
                          <span style={{ fontSize: 12, color: T.gold, marginTop: 1 }}>🔹</span>
                          <span style={{ fontSize: 12.5, color: T.textMid, lineHeight: 1.5 }}>{item}</span>
                        </div>
                        <button
                          onClick={() => triggerSchedule(item)}
                          style={{
                            border: `0.5px solid ${T.goldBorder}`,
                            background: T.goldLight,
                            color: T.goldDark,
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          📅 排程為日程任務
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

      {/* Task Scheduling Dialog/Drawer Modal */}
      {showScheduleForm && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            border: `1.5px solid ${T.gold}`,
            padding: 22,
            width: "100%",
            maxWidth: 460,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>📅 排程此工作項目為任務</div>
              <button onClick={() => setShowScheduleForm(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: T.textGhost }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 3 }}>任務名稱</label>
                <input
                  type="text"
                  value={scheduleTaskText}
                  onChange={(e) => setScheduleTaskText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    fontSize: 12.5,
                    color: T.text,
                    background: T.bgInput,
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 3 }}>預定截止日期</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: T.text,
                      background: T.bgInput,
                      outline: "none"
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 3 }}>優先級別</label>
                  <select
                    value={taskPriority}
                    onChange={(e: any) => setTaskPriority(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: T.text,
                      outline: "none",
                      background: "#fff"
                    }}
                  >
                    <option value="low">🟢 低優先 (Low)</option>
                    <option value="medium">🟡 中優先 (Medium)</option>
                    <option value="high">🔴 高優先 (High)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 3 }}>規劃歸屬專案 (可選)</label>
                <select
                  value={taskProjId}
                  onChange={(e) => setTaskProjId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: T.text,
                    outline: "none",
                    background: "#fff"
                  }}
                >
                  <option value="">📂 一般日常任務 (不隸屬特定專案)</option>
                  {state.projects.map((p: any) => (
                    <option key={p.id} value={p.id}>📁 {p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <button
                onClick={() => setShowScheduleForm(false)}
                style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11, cursor: "pointer", color: T.textGhost }}
              >
                取消
              </button>
              <button
                onClick={confirmScheduleTask}
                style={{ padding: "8px 16px", background: T.gold, border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", color: "#fff", fontWeight: 600 }}
              >
                確認並建立任務
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
