import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface BreakpointModalProps {
  toolName: string;
  args: any;
  onAllow: () => void;
  onDeny: () => void;
}

export function BreakpointModal({ toolName, args, onAllow, onDeny }: BreakpointModalProps) {
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 999999
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        width: 460,
        overflow: "hidden",
        boxShadow: "0 24px 48px rgba(0, 0, 0, 0.15)"
      }}>
        <div style={{ 
          background: "#FEF2F2", 
          padding: "20px 24px", 
          display: "flex", 
          alignItems: "flex-start", 
          gap: 16 
        }}>
          <div style={{ 
            width: 48, height: 48, 
            background: "#FEE2E2", 
            borderRadius: "50%", 
            display: "flex", alignItems: "center", justifyGround: "center",
            flexShrink: 0,
            justifyContent: "center"
          }}>
            <AlertTriangle size={24} color="#EF4444" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#991B1B" }}>
              高風險操作授權 (UAC)
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "#B91C1C", lineHeight: 1.5 }}>
              AI 代理人正嘗試執行敏感操作。請審查以下請求，以防影響系統安全。
            </p>
          </div>
          <button onClick={onDeny} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <X size={20} color="#991B1B" opacity={0.5} />
          </button>
        </div>

        <div style={{ padding: "24px", background: "#FAF8F5" }}>
          <div style={{ 
            background: "#1C1917", 
            padding: 16, 
            borderRadius: 12, 
            fontFamily: "monospace", 
            fontSize: 12, 
            color: "#FAF8F5",
            marginBottom: 24,
            maxHeight: 250,
            overflowY: "auto",
            textAlign: "left"
          }}>
            <div style={{ marginBottom: 8 }}><span style={{ color: "#F87171", fontWeight: "bold" }}>Tool Action:</span> {toolName}</div>
            <div><span style={{ color: "#38BDF8", fontWeight: "bold" }}>Parameters:</span></div>
            <pre style={{ margin: "4px 0 0 0", color: "#A78BFA", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button 
              onClick={onDeny}
              style={{
                flex: 1,
                padding: "12px 0",
                background: "#fff",
                border: "1px solid #E7E5E4",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color: "#57534E",
                cursor: "pointer"
              }}
            >
              拒絕執行
            </button>
            <button 
              onClick={onAllow}
              style={{
                flex: 1,
                padding: "12px 0",
                background: "#EF4444",
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
              }}
            >
              允許 (風險自負)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
