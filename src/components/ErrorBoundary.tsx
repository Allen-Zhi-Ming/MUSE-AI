import React, { ErrorInfo, ReactNode } from "react";
import { T } from "../constants";
import { analytics } from "../utils/analytics";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    analytics.track("error", "React Crash", error.message);
    console.error("ErrorBoundary caught an uncaught rendering error:", error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem("muse_analytics_events");
    window.location.reload();
  };

  private handleClipboardCopy = () => {
    if (this.state.error) {
      const details = `Error: ${this.state.error.message}\n` + 
                      `Stack: ${this.state.error.stack}\n` + 
                      `Component Stack: ${this.state.errorInfo?.componentStack || "N/A"}`;
      navigator.clipboard.writeText(details)
        .then(() => alert("Diagnostic trace copied to clipboard!"))
        .catch(() => alert("Failed to copy."));
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#F5F1EE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "Inter, sans-serif"
        }}>
          <div style={{
            background: "#fff",
            border: `1px solid ${T.border}`,
            borderRadius: 24,
            width: "100%",
            maxWidth: 580,
            padding: 32,
            boxShadow: "0 16px 40px rgba(62, 53, 50, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 20
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#CB8B8522",
                color: "#CB8B85",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: "bold"
              }}>
                ⚠️
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>應用程式發生非預期錯誤</div>
                <div style={{ fontSize: 12, color: T.textGhost }}>我們已為您安全攔截此異常，並將寫入日誌。</div>
              </div>
            </div>

            <div style={{
              background: "#FAF6F5",
              border: `1px solid ${T.borderLight}`,
              borderRadius: 12,
              padding: 16,
              fontSize: 12,
              fontFamily: "JetBrains Mono, monospace",
              color: "#945B50",
              maxHeight: 200,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              lineHeight: 1.5
            }}>
              <strong>{this.state.error?.name || "Error"}:</strong> {this.state.error?.message || "Render exception"}
              {this.state.error?.stack && (
                <div style={{ opacity: 0.7, marginTop: 8, fontSize: 10 }}>
                  {this.state.error.stack}
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>
              請點擊下方<strong>「複製錯誤報告」</strong>與開發人員分享，或者點擊<strong>「重置應用常規」</strong>來清除快取、修復頁面。
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button 
                onClick={this.handleClipboardCopy} 
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: `1.5px solid ${T.border}`,
                  background: "transparent",
                  color: T.textMid,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                📋 複製錯誤報告
              </button>
              <button 
                onClick={this.handleReset} 
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "#CB8B85",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(203, 139, 133, 0.3)",
                  transition: "all 0.15s"
                }}
              >
                🔄 重置與重新載入
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ToastErrorState {
  error: string | null;
}

export class AppErrorNotifier extends React.Component<{ children: ReactNode }, ToastErrorState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = {
      error: null
    };
  }

  componentDidMount() {
    window.addEventListener("error", this.handleGeneralError);
    window.addEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleGeneralError);
    window.removeEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  handleGeneralError = (event: ErrorEvent) => {
    analytics.track("error", "General Error Caught", event.message);
    this.showToast(`Uncaught Error: ${event.message}`);
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const msg = event.reason?.message || "未知的異步承諾拒絕 (Promise Rejection)";
    analytics.track("error", "Promise Rejection Caught", msg);
    this.showToast(`Async Rejection: ${msg}`);
  };

  showToast = (msg: string) => {
    this.setState({ error: msg });
    setTimeout(() => {
      this.setState({ error: null });
    }, 5000);
  };

  render() {
    return (
      <div style={{ position: "relative", minHeight: "100%", display: "flex", flexDirection: "column", flex: 1 }}>
        {this.props.children}
        {this.state.error && (
          <div style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            background: "#fff",
            borderLeft: "4px solid #CB8B85",
            borderTop: `0.5px solid ${T.borderLight}`,
            borderRight: `0.5px solid ${T.borderLight}`,
            borderBottom: `0.5px solid ${T.borderLight}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "12px 14px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 99999,
            maxWidth: 360,
            fontSize: 11,
            color: T.text,
            animation: "slideIn 0.25s cubic-bezier(0, 0, 0.2, 1) both"
          }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
              <div style={{ fontWeight: 700, color: "#945B50", marginBottom: 2 }}>攔截到全局異常</div>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.9 }}>{this.state.error}</div>
            </div>
            <button 
              onClick={() => this.setState({ error: null })} 
              style={{ border: "none", background: "transparent", color: T.textGhost, cursor: "pointer", fontSize: 13, padding: "0 4px" }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }
}
