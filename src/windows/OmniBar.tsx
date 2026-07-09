import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";

export function OmniBar() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Automatically focus when shown
    inputRef.current?.focus();

    const handleFocus = () => {
      inputRef.current?.focus();
    };
    
    // Listen to focus events from main process (if implemented)
    if (window.ipcRenderer) {
      window.ipcRenderer.on('focus-omnibar', handleFocus);
      return () => window.ipcRenderer.off('focus-omnibar', handleFocus);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      // Execute fast action
      console.log("Execute fast action:", query);
      setQuery("");
      // Hide window after execution
      if (window.museAPI) {
        window.museAPI.windowAction('close');
      }
    } else if (e.key === "Escape") {
      if (window.museAPI) {
        window.museAPI.windowAction('close'); // or 'minimize'/hide
      }
    }
  };

  return (
    <div style={{
      width: "100%",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      padding: 12,
      boxSizing: "border-box"
    }}>
      <div style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: 24,
        padding: "12px 24px",
        boxShadow: "0 8px 32px rgba(138, 110, 62, 0.15)",
        border: "1px solid rgba(197, 160, 89, 0.4)",
        WebkitAppRegion: "no-drag"
      } as any}>
        <Search size={24} color="#8A6E3E" style={{ marginRight: 16 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="快速輸入指令或提問 (Press Enter to execute, Esc to close)..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 20,
            color: "#3E3532",
            fontWeight: 500
          }}
        />
      </div>
    </div>
  );
}
