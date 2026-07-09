import React, { useState } from "react";
import { ChevronDown, ChevronRight, BrainCircuit, CheckCircle2, CircleDashed } from "lucide-react";

interface Step {
  id: string;
  label: string;
  status: "pending" | "running" | "done";
}

export function ChainOfThought() {
  const [expanded, setExpanded] = useState(false);

  // Mock data for demo
  const steps: Step[] = [
    { id: "1", label: "解析使用者意圖與需求架構", status: "done" },
    { id: "2", label: "掃描系統相依性與權限", status: "done" },
    { id: "3", label: "生成程式碼與重構邏輯", status: "running" },
    { id: "4", label: "安全審查與沙箱驗證", status: "pending" },
    { id: "5", label: "佈署與結果反饋", status: "pending" }
  ];

  const currentStepIndex = steps.findIndex(s => s.status === "running");
  const progress = Math.max(0, (currentStepIndex / steps.length) * 100);

  return (
    <div style={{
      margin: "16px 0",
      background: "#fff",
      border: "1px solid rgba(197, 160, 89, 0.2)",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(138, 110, 62, 0.05)"
    }}>
      {/* Header / Progress Bar */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          background: "linear-gradient(to right, #FAF8F5, #fff)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BrainCircuit size={18} color="#C5A059" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#3E3532" }}>
            🧠 AI 運算邏輯 (Chain of Thought)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#8A6E3E", fontWeight: 500 }}>
            {currentStepIndex + 1} / {steps.length} 執行中
          </span>
          {expanded ? <ChevronDown size={16} color="#A89B85" /> : <ChevronRight size={16} color="#A89B85" />}
        </div>
      </div>

      {/* Progress Line */}
      <div style={{ width: "100%", height: 2, background: "#F3EBE6" }}>
        <div style={{ 
          width: `${progress}%`, 
          height: "100%", 
          background: "linear-gradient(90deg, #D4AF37, #F3E5AB)",
          transition: "width 0.4s ease"
        }} />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ padding: "16px", background: "#FAF8F5", borderTop: "1px solid rgba(197, 160, 89, 0.1)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ marginTop: 2 }}>
                  {step.status === "done" && <CheckCircle2 size={16} color="#10B981" />}
                  {step.status === "running" && <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #C5A059", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />}
                  {step.status === "pending" && <CircleDashed size={16} color="#D1D5DB" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: 13, 
                    fontWeight: step.status === "running" ? 600 : 500,
                    color: step.status === "pending" ? "#9CA3AF" : "#3E3532"
                  }}>
                    Task {idx + 1}: {step.label}
                  </div>
                  {step.status === "running" && (
                    <div style={{ 
                      marginTop: 6, 
                      padding: 8, 
                      background: "rgba(197, 160, 89, 0.08)", 
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#8A6E3E",
                      fontFamily: "monospace"
                    }}>
                      &gt; 正在解析 AST 並匹配對應的 MCP 節點...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
