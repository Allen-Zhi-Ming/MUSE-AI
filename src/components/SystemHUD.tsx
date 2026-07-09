import React, { useEffect, useState } from "react";
import { Activity, ShieldCheck, TerminalSquare } from "lucide-react";

export function SystemHUD() {
  const [status, setStatus] = useState({ connected: false, toolCount: 0 });

  useEffect(() => {
    const fetchStatus = async () => {
      if ((window as any).museAPI?.mcp) {
        try {
          const res = await (window as any).museAPI.mcp.status();
          setStatus(res);
        } catch(e) {}
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: 24,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none" // Pass clicks through
    }}>
      {/* HUD Panel */}
      <div style={{
        background: "rgba(20, 20, 20, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        color: "#fff",
        fontFamily: "'Inter', monospace",
        fontSize: 11,
        width: 220,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} color="#6EE7B7" />
            <span style={{ fontWeight: 600, color: "#6EE7B7" }}>SYS SECURE</span>
          </div>
          <span style={{ opacity: 0.6 }}>v2.0.1</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={12} color={status.connected ? "#93C5FD" : "#9CA3AF"} />
            <span style={{ opacity: 0.8 }}>MCP Orchestrator</span>
          </div>
          <span style={{ color: status.connected ? "#93C5FD" : "#9CA3AF", fontWeight: 600 }}>
            {status.connected ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TerminalSquare size={12} color="#FDBA74" />
            <span style={{ opacity: 0.8 }}>Active Tools</span>
          </div>
          <span style={{ fontWeight: 600 }}>{status.toolCount}</span>
        </div>
      </div>
    </div>
  );
}
