import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TextareaAutosize from "react-textarea-autosize";
import { T } from "../constants";

export function Md({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 13, lineHeight: 1.72, color: T.text }} className="markdown-container">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export function SkeletonLoader({ type = "text", height = 11, width = "100%", prompt, progress }: { type?: "text" | "image" | "card"; height?: number; width?: string | number; prompt?: string; progress?: number }) {
  if (type === "text") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%", padding: "4px 0", maxWidth: 440 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <div className="skeleton-box" style={{ height, borderRadius: 4, width: "100%" }} />
        <div className="skeleton-box" style={{ height, borderRadius: 4, width: "85%" }} />
        <div className="skeleton-box" style={{ height, borderRadius: 4, width: "55%" }} />
      </div>
    );
  }
  if (type === "image") {
    return (
      <div className="skeleton-box" style={{ width, height: height, borderRadius: 14, border: `1px solid ${T.borderLight}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, boxSizing: "border-box", backgroundSize: "200% 100%" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 24, animation: "pulse 1.2s ease infinite" }}>🎨</span>
          <span style={{ fontSize: 18, animation: "pulse 1.2s ease infinite", animationDelay: "0.3s" }}>✨</span>
        </div>
        <div style={{ fontSize: 11, color: T.textGhost, display: "flex", alignItems: "center", gap: 3, fontWeight: "600", letterSpacing: "0.05em" }}>
          AI 圖片生成中
          <span className="typing-dot" style={{ width: 3, height: 3, background: T.gold }} />
          <span className="typing-dot" style={{ width: 3, height: 3, background: T.gold }} />
          <span className="typing-dot" style={{ width: 3, height: 3, background: T.gold }} />
        </div>
        {prompt && (
          <div 
            style={{
              fontSize: 10,
              lineHeight: "13px",
              color: T.textMid,
              background: "rgba(255,255,255,0.75)",
              border: `0.5px solid ${T.border}`,
              borderRadius: 8,
              padding: "4px 8px",
              maxWidth: "90%",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: 4,
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              backdropFilter: "blur(2px)"
            }} 
            title={prompt}
          >
            「{prompt}」
          </div>
        )}
        {progress !== undefined && progress > 0 && (
          <div style={{ width: "85%", marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textGhost, fontWeight: 500, marginBottom: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: T.gold, animation: "pulse 1.2s infinite" }} />
                {progress < 15 ? "正在初始化..." : 
                 progress < 40 ? "分析視覺風格..." : 
                 progress < 70 ? "AI 擴散與概念繪製..." : 
                 progress < 95 ? "高畫質細節微調..." : "即將完成!"}
              </span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: T.goldDark }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: "100%", height: 6, background: T.borderLight, borderRadius: 3, overflow: "hidden", border: `0.5px solid ${T.border}` }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${progress}%`, 
                  background: `linear-gradient(90deg, ${T.gold} 0%, #F59E0B 100%)`, 
                  borderRadius: 3, 
                  transition: "width 0.2s cubic-bezier(0.1, 0.8, 0.25, 1)" 
                }} 
              />
            </div>
          </div>
        )}
      </div>
    );
  }
  if (type === "card") {
    return (
      <div className="skeleton-box" style={{ padding: 16, borderRadius: 12, background: "transparent", border: `1px solid ${T.borderLight}`, width: "100%", height, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ width: "35%", height: 14, borderRadius: 4, background: "rgba(0,0,0,0.05)" }} />
        <div style={{ width: "85%", height: 10, borderRadius: 3, background: "rgba(0,0,0,0.03)" }} />
        <div style={{ width: "50%", height: 10, borderRadius: 3, background: "rgba(0,0,0,0.03)" }} />
      </div>
    );
  }
  return null;
}

export function Btn({ children, onClick, gold = false, disabled = false, title = "", style: sx = {} }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", border: gold ? "none" : `0.5px solid ${T.border}`, background: gold ? T.gold : T.bgCard, color: gold ? "#fff" : T.textMid, opacity: disabled ? 0.5 : 1, transition: "opacity .15s", ...sx }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = ".82"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
    >
      {children}
    </button>
  );
}

export function TIn({ value, onChange, placeholder, rows, style: sx = {} }: any) {
  const s = { width: "100%", padding: "8px 11px", border: `0.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", background: T.bgInput, fontFamily: "inherit", ...sx };
  return rows ? (
    <TextareaAutosize minRows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...s, resize: "none" as any }} />
  ) : (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />
  );
}

export function Sel({ value, onChange, options }: any) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "7px 10px", border: `0.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, background: T.bgInput, fontFamily: "inherit" }}>
      {options.map(([v, l]: any) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Lbl({ children }: any) {
  return <div style={{ fontSize: 12, fontWeight: 500, color: T.textDim, marginBottom: 5 }}>{children}</div>;
}

export function ICard({ title, children }: any) {
  return (
    <div style={{ background: T.bgCard, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "9px 10px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textDim, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

export function SR({ label, children }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 3 }}>
      <span style={{ color: T.textDim }}>{label}</span>
      <span style={{ fontWeight: 500, color: T.text }}>{children}</span>
    </div>
  );
}

export function MBox({ title, onClose, width = 440, children }: any) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(30,20,10,.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 } as any}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: T.bgCard, border: `0.5px solid ${T.border}`, borderRadius: 12, width, padding: "20px 22px", boxShadow: "0 8px 32px rgba(0,0,0,.12)", margin: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: T.text }}>{title}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: T.textGhost }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
