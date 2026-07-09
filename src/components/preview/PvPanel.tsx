import React, { useState, useEffect, useRef } from "react";
import { T, MOCK_FILE_CONTENTS } from "../../constants";
import { Md } from "../Common";

function extractFilenameFromCode(code: string): { filename: string | null; cleanedCode: string } {
  if (!code) return { filename: null, cleanedCode: code };
  
  const lines = code.split("\n");
  const first3 = lines.slice(0, 3);
  
  // Pattern 1: [建立檔案：市場調查報告.pdf] or [filename: 市場調查報告.pdf]
  const bracketRegex = /\[(?:建立檔案|建立|檔案|filename|file|名稱為|叫)[:：]?\s*([a-zA-Z0-9_\-\.\/\u4e00-\u9fa5]+\.[a-zA-Z0-9]+)\s*\]/i;
  
  // Pattern 2: comment style or hash style
  const commentRegex = /^(?:\/\/|\/\*|#|<!--)\s*(?:建立檔案|建立|檔案|filename|file|FILE|名稱為|叫)?\s*[:：]?\s*([a-zA-Z0-9_\-\.\/\u4e00-\u9fa5]+\.[a-zA-Z0-9]+)(?:\s*\*\/|\s*-->)?/i;

  // Pattern 3: direct bracket [市場調查報告.pdf]
  const directBracketRegex = /^\[\s*([a-zA-Z0-9_\-\.\/\u4e00-\u9fa5]+\.[a-zA-Z0-9]+)\s*\]/i;

  for (let i = 0; i < first3.length; i++) {
    let line = first3[i].trim();
    if (!line) continue;
    
    let match = line.match(bracketRegex);
    if (match && match[1]) {
      const parts = match[1].split("/");
      const filename = parts[parts.length - 1];
      const remainingLines = [...lines];
      remainingLines.splice(i, 1);
      return { filename, cleanedCode: remainingLines.join("\n").trim() };
    }
    
    match = line.match(commentRegex);
    if (match && match[1]) {
      const parts = match[1].split("/");
      const filename = parts[parts.length - 1];
      const remainingLines = [...lines];
      remainingLines.splice(i, 1);
      return { filename, cleanedCode: remainingLines.join("\n").trim() };
    }

    match = line.match(directBracketRegex);
    if (match && match[1]) {
      const parts = match[1].split("/");
      const filename = parts[parts.length - 1];
      const remainingLines = [...lines];
      remainingLines.splice(i, 1);
      return { filename, cleanedCode: remainingLines.join("\n").trim() };
    }
  }
  
  return { filename: null, cleanedCode: code };
}

export function PvPanel({ state, dispatch, isMobile }: any) {
  if (!state || !state.pvOpen) return null;

  const proj = state.projects.find((p: any) => p.id === state.activeProjId);

  // Dynamically build files record from conversation history
  const files: Record<string, string> = {};

  const activeTid = state.navView === "workspace" ? state.activeThreadId : state.activeGenThreadId;
  const conversation = activeTid ? (state.messages[activeTid] || []) : [];
  
  conversation.forEach((msg: any) => {
    if (msg.role === "assistant" && msg.content) {
      const text = msg.content;
      // Regex to capture markdown code blocks with their languages
      const regex = /```([a-zA-Z0-9+#]+)?\s*([\s\S]*?)(?:```|$)/ig;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const lang = (match[1] || "").toLowerCase();
        let rawCode = match[2];
        if (rawCode.endsWith("```")) {
          rawCode = rawCode.slice(0, -3);
        }
        rawCode = rawCode.trim();
        if (!rawCode) continue;

        // 先嘗試從程式碼的前三行提取檔名註記（高優先權，避免前後文解析錯誤，並清除妨礙編譯的宣告行）
        const { filename: extractedName, cleanedCode } = extractFilenameFromCode(rawCode);
        let code = cleanedCode;
        let filename = extractedName || "";
        
        if (!filename) {
          const precedingText = text.slice(0, match.index);
          const fileRegex = /(?:file|filename|建立|寫入|建立檔案|為|寫在|名稱為|叫|檔案|名叫)\s*[:：`"']?([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)[`"']?|([a-zA-Z0-9_\-\.]+\.(?:jsx|tsx|js|css|html|json|svg|md))/gi;
          let filenameMatch = null;
          let lastMatch = null;
          while ((filenameMatch = fileRegex.exec(precedingText)) !== null) {
            lastMatch = filenameMatch;
          }
          
          if (lastMatch) {
            filename = lastMatch[1] || lastMatch[2];
          }
        }
        
        // ═══════════════════════════════════════════════════════
        // 🛡️ 智慧檔案類型與副檔名相容性安全防線 (Type-Safety Validation)
        const isHTML = code.includes("<!DOCTYPE html>") || code.includes("<html") || lang === "html";
        const isCSS = code.includes("body {") || code.includes("margin:") || lang === "css";
        const isJSorReact = code.includes("import React") || code.includes("export default") || code.includes("function App") || lang === "jsx" || lang === "tsx" || lang === "javascript" || lang === "typescript";
        const isSVG = code.startsWith("<svg") || code.includes("</svg>") || lang === "svg";

        if (filename) {
          const lowerFile = filename.toLowerCase();
          if (lowerFile.endsWith(".svg") && !isSVG) {
            if (isJSorReact) {
              filename = lang === "tsx" ? "App.tsx" : "App.jsx";
            } else if (isHTML) {
              filename = "index.html";
            } else {
              filename = "App.jsx";
            }
          } else if ((lowerFile.endsWith(".jsx") || lowerFile.endsWith(".tsx") || lowerFile.endsWith(".js")) && !isJSorReact) {
            if (isHTML) filename = "index.html";
            else if (isCSS) filename = "style.css";
            else if (isSVG) filename = "muse-vector.svg";
          } else if (lowerFile.endsWith(".css") && !isCSS) {
            if (isJSorReact) filename = "App.jsx";
            else if (isHTML) filename = "index.html";
          } else if (lowerFile.endsWith(".html") && !isHTML) {
            if (isJSorReact) filename = "App.jsx";
            else if (isCSS) filename = "style.css";
          }
        }
        
        // 如果完全沒有解析出檔名，走原有的特徵預設
        if (!filename) {
          if (isHTML) {
            filename = "index.html";
          } else if (isCSS) {
            filename = "style.css";
          } else if (isSVG) {
            filename = "muse-vector.svg";
          } else if (lang === "jsx") {
            filename = "App.jsx";
          } else if (lang === "tsx") {
            filename = "App.tsx";
          } else if (isJSorReact) {
            filename = "App.jsx";
          } else if (lang === "markdown" || lang === "md") {
            filename = "README.md";
          } else {
            filename = "code." + (lang || "txt");
          }
        }
        
        files[filename] = code;
      }
    }
  });

  // 1. Prepopulate from project files list
  if (proj) {
    proj.files.forEach((f: any) => {
      if (!files[f.name]) {
        if (f.content) {
          files[f.name] = f.content;
        } else if (MOCK_FILE_CONTENTS[f.name]) {
          files[f.name] = MOCK_FILE_CONTENTS[f.name];
        } else {
          files[f.name] = `# 檔案：${f.name}\n\n這是一個由企劃案建立的空白文件。`;
        }
      }
    });
  }

  const fileNames = Object.keys(files);
  const hasPwa = fileNames.some(name => name === "manifest.json" || name === "pwa.js" || name === "sw.js" || name.toLowerCase().includes("pwa"));
  const [selectedFile, setSelectedFile] = React.useState("");
  const activeFile = files[selectedFile] ? selectedFile : (fileNames[0] || "");
  const [showDocReader, setShowDocReader] = React.useState(false);

  const getFileLargeIcon = (name: string) => {
    if (name.endsWith(".pdf")) return "📕";
    if (name.endsWith(".docx")) return "📘";
    if (name.endsWith(".xlsx")) return "📊";
    if (name.endsWith(".csv")) return "📊";
    if (name.endsWith(".md")) return "📝";
    return "🌐";
  };

  const getHeaderBgColor = (name: string) => {
    if (name.endsWith(".pdf")) return "linear-gradient(135deg, #EF4444, #B91C1C)"; // Acrobat Red
    if (name.endsWith(".docx")) return "linear-gradient(135deg, #2563EB, #1D4ED8)"; // Word Blue
    if (name.endsWith(".xlsx") || name.endsWith(".csv")) return "linear-gradient(135deg, #059669, #047857)"; // Excel Green
    return "linear-gradient(135deg, #C5A059, #8A6E3E)"; // Muse Gold
  };

  const getHeaderTextColor = (name: string) => "#ffffff";

  const getViewerSubtitle = (name: string) => {
    if (name.endsWith(".pdf")) return "(PDF 高奢文件閱讀器)";
    if (name.endsWith(".docx")) return "(Word 精裝文件編輯器)";
    if (name.endsWith(".xlsx") || name.endsWith(".csv")) return "(Excel 智慧電子數據表)";
    return "(Creative Studio 品牌文檔)";
  };

  const downloadDocumentFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderDocumentContentBody = (filename: string, content: string) => {
    if (filename.endsWith(".xlsx") || filename.endsWith(".csv")) {
      const rows = content.trim().split("\n").map(line => line.split(","));
      const headers = rows[0] || [];
      const dataRows = rows.slice(1);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", height: "100%" }}>
          <div style={{ display: "flex", gap: 8, fontSize: 10.5, color: T.textGhost, userSelect: "none" }}>
            <span>📊 表格視圖: Sheet1</span>
            <span>|</span>
            <span>✦ Microsoft Excel Spreadsheet Mode</span>
          </div>
          <div style={{
            width: "100%",
            overflowX: "auto",
            border: "1px solid rgba(220, 215, 206, 0.6)",
            borderRadius: 12,
            background: "#fff"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, color: T.text, minWidth: 500 }}>
              <thead>
                <tr style={{ background: "#F3EBE6", borderBottom: "1px solid rgba(220, 215, 206, 0.8)", height: 32 }}>
                  {headers.map((h, idx) => (
                    <th key={idx} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, borderRight: "1px solid rgba(220, 215, 206, 0.4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? "#FFFDFB" : "#FAF8F5", borderBottom: "1px solid rgba(220, 215, 206, 0.3)", height: 30 }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ padding: "8px 12px", borderRight: "1px solid rgba(220, 215, 206, 0.2)" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (filename.endsWith(".pdf")) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: T.textGhost, userSelect: "none", marginBottom: 4 }}>
            <span>🔍 縮放: 100%</span>
            <span>|</span>
            <span>📄 頁數: 1 / 1</span>
            <span>|</span>
            <span>✦ Adobe Acrobat PDF Engine</span>
          </div>
          <div style={{
            width: "100%",
            maxWidth: 580,
            minHeight: 680,
            background: "#ffffff",
            boxShadow: "0 8px 30px rgba(61,46,26,0.06)",
            border: "1px solid rgba(220, 215, 206, 0.5)",
            borderRadius: 8,
            padding: "40px 48px",
            boxSizing: "border-box",
            fontFamily: "'Georgia', Serif",
            color: "#3D2E1A",
            lineHeight: 1.7,
            fontSize: 12.5
          }}>
            <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
          </div>
        </div>
      );
    }

    if (filename.endsWith(".docx")) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: T.textGhost, userSelect: "none" }}>
            <span>📝 頁面佈局: 標準頁面</span>
            <span>|</span>
            <span>✦ Microsoft Word Editorial Mode</span>
          </div>
          <div style={{
            width: "100%",
            maxWidth: 580,
            minHeight: 600,
            background: "#ffffff",
            boxShadow: "0 8px 30px rgba(61,46,26,0.06)",
            border: "1px solid rgba(220, 215, 206, 0.5)",
            borderRadius: 8,
            padding: "36px 44px",
            boxSizing: "border-box",
            fontFamily: "system-ui, sans-serif",
            color: T.text,
            lineHeight: 1.65,
            fontSize: 12.5
          }}>
            <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        width: "100%",
        background: "#ffffff",
        border: "1px solid rgba(220, 215, 206, 0.5)",
        borderRadius: 12,
        padding: 24,
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif"
      }}>
        <Md text={content} />
      </div>
    );
  };

  const isDocument = activeFile && (activeFile.endsWith(".pdf") || activeFile.endsWith(".docx") || activeFile.endsWith(".xlsx") || activeFile.endsWith(".csv") || activeFile.endsWith(".md") || activeFile === "Brand guidelines v3");

  const lastCompleteFilesRef = React.useRef<Record<string, string>>({});
  React.useEffect(() => {
    if (!state.streaming && Object.keys(files).length > 0) {
      lastCompleteFilesRef.current = { ...files };
    }
  }, [state.streaming, files]);

  const filesToRender = state.streaming 
    ? (Object.keys(lastCompleteFilesRef.current).length > 0 ? lastCompleteFilesRef.current : files)
    : files;

  React.useEffect(() => {
    const handleSelect = (e: any) => {
      if (e.detail && e.detail.filename) {
        setSelectedFile(e.detail.filename);
      }
    };
    window.addEventListener("muse-select-pv-file", handleSelect);
    return () => window.removeEventListener("muse-select-pv-file", handleSelect);
  }, [fileNames]);

  const handlePush = () => {
    if (fileNames.length === 0) {
      alert("⚠️ 當前尚無 AI 生成的企劃案檔案可以推送！");
      return;
    }
    dispatch({
      type: "PUSH_TO_MY_MUSE",
      asset: {
        id: "asset-" + Date.now(),
        name: "Plan · " + new Date().toLocaleTimeString("zh-TW", { hour: '2-digit', minute: '2-digit' }),
        type: "code",
        content: files[fileNames[0]] || "",
        ts: new Date().toLocaleTimeString("zh-TW", { hour: '2-digit', minute: '2-digit' }),
        remark: "AI 生成的網頁/React 代碼企劃案...",
        files: { ...files }
      }
    });
    alert("🎉 推送成功！已將當前 AI 產出的網頁檔案組件保存至「🎀 My Muse」成品專區。");
  };

  const handleExportZip = async () => {
    if (fileNames.length === 0) {
      alert("⚠️ 當前企劃案中無任何 AI 產出的檔案可以導出！");
      return;
    }
    try {
      const JSZip = (window as any).JSZip;
      if (!JSZip) {
        alert("⚠️ ZIP 套件載入中，請稍候...");
        return;
      }
      const zip = new JSZip();
      fileNames.forEach(name => {
        zip.file(name, files[name]);
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "muse-plan.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ZIP export failed:", error);
      alert("導出 ZIP 企劃案失敗，請重試！");
    }
  };

  // 取得檔案圖示
  const getFileIcon = (filename: string) => {
    if (filename.endsWith(".html")) return "🌐";
    if (filename.endsWith(".css")) return "🎨";
    if (filename.endsWith(".svg")) return "✦";
    if (filename.endsWith(".jsx") || filename.endsWith(".tsx")) return "⚛️";
    if (filename.endsWith(".js")) return "⚡";
    return "📝";
  };

  // Construct a live iframe srcDoc using filesToRender
  let srcDoc = "";
  const cssContent = filesToRender["style.css"] || "";
  const htmlContent = filesToRender["index.html"] || "";
  
  const fileNamesToRender = Object.keys(filesToRender);
  const reactFiles = fileNamesToRender.filter(name => name.endsWith(".jsx") || name.endsWith(".tsx") || name.toLowerCase() === "app.js");
  
  // 智慧排序：確保入口檔案（如 main.jsx, index.jsx 或包含 ReactDOM / createRoot 的檔案）排在最後，
  // 讓所有其他組件（如 App.jsx）先宣告定義，避免執行時發生 "ReferenceError: App is not defined" 等未定義錯誤。
  reactFiles.sort((a, b) => {
    const aContent = filesToRender[a] || "";
    const bContent = filesToRender[b] || "";
    const aIsEntry = a.toLowerCase().includes("main") || a.toLowerCase().includes("index") || aContent.includes("createRoot") || aContent.includes("ReactDOM.render") || aContent.includes("ReactDOM.createRoot");
    const bIsEntry = b.toLowerCase().includes("main") || b.toLowerCase().includes("index") || bContent.includes("createRoot") || bContent.includes("ReactDOM.render") || bContent.includes("ReactDOM.createRoot");
    if (aIsEntry && !bIsEntry) return 1;
    if (!aIsEntry && bIsEntry) return -1;
    return 0;
  });

  let reactCode = "";
  if (reactFiles.length > 0) {
    reactCode = reactFiles.map(name => `/* FILE: ${name} */\n${filesToRender[name]}`).join("\n\n");
  }

  // Detect theme from React code or HTML
  let detectedTheme = "organic"; // Default to organic luxury
  if (reactCode) {
    const themeMatch = reactCode.match(/\/\*\s*THEME:\s*['"]?([a-zA-Z0-9_-]+)['"]?\s*\*\//i);
    if (themeMatch && themeMatch[1]) {
      detectedTheme = themeMatch[1].toLowerCase();
    } else {
      const fallbackMatch = reactCode.match(/theme\s*:\s*['"]?([a-zA-Z0-9_-]+)['"]?/i);
      if (fallbackMatch && fallbackMatch[1]) {
        detectedTheme = fallbackMatch[1].toLowerCase();
      }
    }
  } else if (htmlContent) {
    const themeMatch = htmlContent.match(/\/\*\s*THEME:\s*['"]?([a-zA-Z0-9_-]+)['"]?\s*\*\//i);
    if (themeMatch && themeMatch[1]) {
      detectedTheme = themeMatch[1].toLowerCase();
    }
  }

  const isReactJSX = reactFiles.length > 0 && reactCode && (reactCode.includes("import React") || reactCode.includes("ReactDOM") || reactCode.includes("JSX") || reactCode.includes("React.") || /<[A-Z][a-zA-Z0-9]*/.test(reactCode));

  if (isReactJSX && reactCode) {
    // Parent-side component scanning and automatic window exporting
    const compNames: string[] = [];
    const declRegex = /(?:const|let|var|function)\s+([A-Z][a-zA-Z0-9_]*)/g;
    let declMatch;
    while ((declMatch = declRegex.exec(reactCode)) !== null) {
      const name = declMatch[1];
      if (name && name !== 'React' && name !== 'ReactDOM' && name !== 'Babel' && !compNames.includes(name)) {
        compNames.push(name);
      }
    }
    
    // Also check for export default function App style declarations
    const exportMatch = reactCode.match(/export\s+default\s+(?:function|class)?\s*([A-Z][a-zA-Z0-9_]*)/);
    if (exportMatch && exportMatch[1] && !compNames.includes(exportMatch[1])) {
      compNames.push(exportMatch[1]);
    }
    
    compNames.forEach(name => {
      reactCode += `\ntry { if (typeof ${name} !== "undefined") { window.${name} = ${name}; } } catch(e) {}`;
    });

    let cleanReactCode = reactCode;
    
    // Rewrite lucide-react destructured imports to window.LucideReact
    cleanReactCode = cleanReactCode.replace(/import\s+\{([\s\S]*?)\}\s+from\s+['"]lucide-react['"];?/gi, (match, imports) => {
      return `const { ${imports} } = window.LucideReact || {};`;
    });
    
    // Rewrite framer-motion destructured imports to window.Motion
    cleanReactCode = cleanReactCode.replace(/import\s+\{([\s\S]*?)\}\s+from\s+['"]framer-motion['"];?/gi, (match, imports) => {
      return `const { ${imports} } = window.Motion || {};`;
    });

    cleanReactCode = cleanReactCode
      .replace(/import\s+[\s\S]*?\s+from\s+['"].*?['"];?/g, '')
      .replace(/import\s+['"].*?['"];?/g, '')
      .replace(/export\s+default\s+/g, '')
      .replace(/<\/script>/gi, "<\\/script>");

    // Build sandbox based on index.html if it exists, preserving custom header structures, fonts and styling
    let baseHtml = htmlContent;
    if (!baseHtml) {
      baseHtml = [
        "<!DOCTYPE html>",
        "<html>",
        "<head>",
        "  <meta charset='UTF-8'>",
        "  <title>Live Preview</title>",
        "  <style>",
        "    body { margin: 0; padding: 12px; font-size: 13px; width: 100vw; height: 100vh; overflow-x: hidden; }",
        "    #root { width: 100%; min-height: 100vh; display: flex; flex-direction: column; }",
        "  </style>",
        "</head>",
        "<body>",
        "  <div id='root'></div>",
        "</body>",
        "</html>"
      ].join("\n");
    }

    // Inlining and resolving local relative script tags from files to prevent 404 Script error crashes
    const fileKeys = Object.keys(filesToRender);
    fileKeys.forEach(filename => {
      if (filename.endsWith(".js") || filename.endsWith(".jsx") || filename.endsWith(".tsx")) {
        const isReactEntry = filename === "App.jsx" || filename === "App.tsx" || filename === "App.js" || filename === "index.jsx" || filename === "index.tsx" || filename.includes("main");
        const escapedName = filename.replace(/\./g, "\\.");
        const scriptRegex = new RegExp(`<script[^>]*src=["'](?:\\.\\/|\\/)?${escapedName}["'][^>]*>([\\s\\S]*?)<\\/script>`, "gi");
        
        if (isReactEntry) {
          baseHtml = baseHtml.replace(scriptRegex, `<!-- Stripped React Entry script tag to prevent duplicate execution: ${filename} -->`);
        } else {
          const fileContent = filesToRender[filename];
          const isJsxFile = filename.endsWith(".jsx") || filename.endsWith(".tsx") || fileContent.includes("React") || /<[A-Z][a-zA-Z0-9]*/.test(fileContent);
          const scriptType = isJsxFile ? "type='text/babel'" : "";
          
          if (baseHtml.match(scriptRegex)) {
            const inlineScript = `<script ${scriptType}>\n${fileContent.replace(/<\/script>/gi, "<\\/script>")}\n</script>`;
            baseHtml = baseHtml.replace(scriptRegex, inlineScript);
          }
        }
      }
    });

    // Also strip any other relative script tags referencing local files that don't exist in files to prevent 404 CORS/Script error crashes
    baseHtml = baseHtml.replace(/<script[^>]*src=["']((?!\/\/|http).+?)["'][^>]*>([\s\S]*?)<\/script>/gi, (match, src) => {
      return `<!-- Stripped unresolved relative script: ${src} -->`;
    });

    // Strip any inline script tags in index.html that contain local relative imports to prevent native browser ES module failures
    baseHtml = baseHtml.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptContent) => {
      if (scriptContent.includes("from './") || scriptContent.includes("from \"./") || scriptContent.includes("import './") || scriptContent.includes("import \"./") || scriptContent.includes("import App") || scriptContent.includes("from '.'")) {
        return `<!-- Stripped local relative module import script to prevent Script error crash: ${scriptContent.slice(0, 100).trim()}... -->`;
      }
      return match;
    });

    // 1. Inject React + ReactDOM + Babel CDNs (WITHOUT crossorigin to prevent CORS script EADDRINUSE/Script error!)
    const pwaSandboxMocks = `
      <script>
        // 🌸 [Safe Sandbox] Core Security Mocks to prevent "Script error." and Sandbox Crashes
        (function() {
          try {
            if (!('serviceWorker' in navigator) || !navigator.serviceWorker) {
              Object.defineProperty(navigator, 'serviceWorker', {
                value: {
                  register: function(url) {
                    console.log("🌸 [Safe Sandbox] Mocked ServiceWorker registration for: " + url);
                    return Promise.resolve({
                      scope: '/',
                      unregister: function() { return Promise.resolve(true); },
                      update: function() { return Promise.resolve(); },
                      addEventListener: function() {},
                      removeEventListener: function() {}
                    });
                  },
                  addEventListener: function() {},
                  removeEventListener: function() {},
                  getRegistration: function() { return Promise.resolve(undefined); },
                  getRegistrations: function() { return Promise.resolve([]); }
                },
                configurable: true,
                writable: true
              });
            } else {
              const originalRegister = navigator.serviceWorker.register;
              navigator.serviceWorker.register = function() {
                try {
                  return originalRegister.apply(navigator.serviceWorker, arguments);
                } catch (e) {
                  console.warn("🌸 [Safe Sandbox] ServiceWorker registration blocked, falling back to mock: ", e);
                  return Promise.resolve({
                    scope: '/',
                    unregister: function() { return Promise.resolve(true); },
                    update: function() { return Promise.resolve(); },
                    addEventListener: function() {},
                    removeEventListener: function() {}
                  });
                }
              };
            }
          } catch (e) { console.warn("🌸 [Safe Sandbox] Failed to mock ServiceWorker:", e); }

          try {
            if (!('caches' in window) || !window.caches) {
              Object.defineProperty(window, 'caches', {
                value: {
                  open: function() {
                    return Promise.resolve({
                      addAll: function() { return Promise.resolve(); },
                      add: function() { return Promise.resolve(); },
                      put: function() { return Promise.resolve(); },
                      match: function() { return Promise.resolve(undefined); },
                      keys: function() { return Promise.resolve([]); },
                      delete: function() { return Promise.resolve(true); }
                    });
                  },
                  match: function() { return Promise.resolve(undefined); },
                  has: function() { return Promise.resolve(false); },
                  delete: function() { return Promise.resolve(true); },
                  keys: function() { return Promise.resolve([]); }
                },
                configurable: true,
                writable: true
              });
            }
          } catch (e) { console.warn("🌸 [Safe Sandbox] Failed to mock CacheStorage:", e); }

          try {
            const dummy = window.localStorage;
          } catch (e) {
            console.warn("🌸 [Safe Sandbox] LocalStorage blocked, installing memory mock.");
            const createMockStorage = () => {
              let store = {};
              return {
                getItem: function(key) { return store[key] || null; },
                setItem: function(key, val) { store[key] = String(val); },
                removeItem: function(key) { delete store[key]; },
                clear: function() { store = {}; },
                key: function(idx) { return Object.keys(store)[idx] || null; },
                get length() { return Object.keys(store).length; }
              };
            };
            try {
              Object.defineProperty(window, 'localStorage', { value: createMockStorage(), configurable: true });
              Object.defineProperty(window, 'sessionStorage', { value: createMockStorage(), configurable: true });
            } catch (err) { console.warn("🌸 [Safe Sandbox] Failed to define Storage mocks:", err); }
          }
        })();
      </script>
    `;

    const cdnScripts = pwaSandboxMocks + `
      <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin="anonymous"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin="anonymous"></script>
      <script src="https://unpkg.com/lucide-react@0.300.0/dist/umd/lucide-react.js" crossorigin="anonymous"></script>
      <script src="https://unpkg.com/framer-motion@10.16.4/dist/framer-motion.js" crossorigin="anonymous"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin="anonymous"></script>
    `;
    if (baseHtml.includes("</head>")) {
      baseHtml = baseHtml.replace("</head>", cdnScripts + "</head>");
    } else if (baseHtml.includes("<head>")) {
      baseHtml = baseHtml.replace("<head>", "<head>" + cdnScripts);
    } else {
      baseHtml = cdnScripts + baseHtml;
    }


    // 2. Inject global design themes & cssContent
    const themeCss = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
    .theme-geek { --bg-main: #050505; --bg-card: rgba(11, 11, 11, 0.85); --border-color: rgba(197, 160, 89, 0.15); --text-title: #F5F5F5; --text-body: #A3A3A3; --accent-color: #C5A059; --font-serif: 'Inter', sans-serif; --radius-card: 12px; --shadow-style: 0 8px 32px rgba(0,0,0,0.6); }
    .theme-organic { --bg-main: #FAF8F5; --bg-card: rgba(255, 255, 255, 0.72); --border-color: rgba(197, 160, 89, 0.22); --text-title: #3D2E1A; --text-body: #8A6E3E; --accent-color: #BFA366; --font-serif: 'Playfair Display', 'Georgia', serif; --radius-card: 20px; --shadow-style: 0 12px 40px -15px rgba(138, 110, 62, 0.12); }
    .theme-neon { --bg-main: #06040A; --bg-card: rgba(15, 10, 24, 0.75); --border-color: rgba(212, 83, 126, 0.15); --text-title: #FAF6F0; --text-body: #A78BFA; --accent-color: #D4537E; --font-serif: 'Outfit', sans-serif; --radius-card: 24px; --shadow-style: 0 15px 45px rgba(212,83,126,0.08); }
    .theme-cybertech { --bg-main: #0A0F1D; --bg-card: rgba(14, 22, 45, 0.8); --border-color: rgba(56, 189, 248, 0.15); --text-title: #E2E8F0; --text-body: #94A3B8; --accent-color: #38BDF8; --font-serif: 'Outfit', sans-serif; --radius-card: 8px; --shadow-style: 0 10px 35px rgba(56,189,248,0.06); }
    .theme-box { background: var(--bg-main) !important; color: var(--text-body) !important; font-family: 'Outfit', 'Inter', system-ui, sans-serif !important; transition: all 0.3s ease; }
    .theme-title { font-family: var(--font-serif) !important; color: var(--text-title) !important; }
    .theme-card { background: var(--bg-card) !important; border: 1px solid var(--border-color) !important; border-radius: var(--radius-card) !important; box-shadow: var(--shadow-style) !important; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .theme-card:hover { transform: translateY(-2px); filter: brightness(1.02); }
    .theme-button { background: var(--accent-color) !important; color: #ffffff !important; font-weight: 600 !important; border-radius: 12px !important; border: none !important; box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; }
    .theme-button:hover { transform: translateY(-1px) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important; }`;
    const styleTag = `<style>${themeCss}\n${cssContent}</style>`;
    
    if (baseHtml.includes("style.css")) {
      baseHtml = baseHtml.replace(/<link[^>]*href=["']\/?style\.css["'][^>]*>/gi, styleTag);
    } else if (baseHtml.includes("</head>")) {
      baseHtml = baseHtml.replace("</head>", styleTag + "</head>");
    }

    // 3. Inject Error listeners and mounting helper
    const errorScripts = `
      <script>
        window.addEventListener('error', function(event) {
          const rootEl = document.getElementById('root') || document.body;
          rootEl.innerHTML = '<div style="color:#d32f2f;padding:16px;font-size:12px;font-family:monospace;background:#fde8e8;border:0.5px solid #f5c2c2;border-radius:8px;margin:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);"><strong style="font-size:13px;display:block;margin-bottom:6px;">⚠️ 執行時錯誤:</strong><pre style="white-space:pre-wrap;margin:0;font-size:11px;line-height:1.4;">' + event.message + '</pre></div>';
        });
        window.addEventListener('unhandledrejection', function(event) {
          const rootEl = document.getElementById('root') || document.body;
          rootEl.innerHTML = '<div style="color:#d32f2f;padding:16px;font-size:12px;font-family:monospace;background:#fde8e8;border:0.5px solid #f5c2c2;border-radius:8px;margin:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);"><strong style="font-size:13px;display:block;margin-bottom:6px;">⚠️ 異步承諾錯誤:</strong><pre style="white-space:pre-wrap;margin:0;font-size:11px;line-height:1.4;">' + event.reason + '</pre></div>';
        });
        window.reactComponentMounted = false;
        window.mountReactComponent = function(Target) {
          try {
            if (Target) {
              const root = ReactDOM.createRoot(document.getElementById('root'));
              root.render(React.createElement(Target));
              window.reactComponentMounted = true;
              console.log('⚛️ React Component successfully rendered!');
            }
          } catch (err) {
            document.getElementById('root').innerHTML = '<div style="color:red;padding:12px;font-size:11px;font-family:monospace;">JSX 渲染錯誤: ' + err.message + '</div>';
          }
        };
      </script>
    `;
    if (baseHtml.includes("</head>")) {
      baseHtml = baseHtml.replace("</head>", errorScripts + "</head>");
    }

    // 4. Ensure a root div exists for React to mount into
    if (!baseHtml.includes("id=\"root\"") && !baseHtml.includes("id='root'")) {
      if (baseHtml.includes("<body>")) {
        baseHtml = baseHtml.replace("<body>", "<body>\n  <div id=\"root\"></div>");
      } else {
        baseHtml = "<div id=\"root\"></div>\n" + baseHtml;
      }
    }

    // 5. Inject theme class into body of HTML
    baseHtml = baseHtml.replace(/<body([^>]*)>/i, `<body class="theme-${detectedTheme} theme-box" $1>`);

    // 6. Append dynamic Babel compiled script block
    const reactScriptBlock = [
      "<script type='text/plain' id='react-jsx-code'>",
      cleanReactCode,
      "</script>",
      "<script>",
      "  (function() {",
      "    window.addEventListener('DOMContentLoaded', function() {",
      "      setTimeout(function() {",
      "        if (window.reactComponentMounted) return;",
      "        try {",
      "          const codeEl = document.getElementById('react-jsx-code');",
      "          if (!codeEl) return;",
      "          const rawCode = codeEl.textContent;",
      "          ",
      "          console.log('⚛️ [Babel Custom Compiler] Starting UMD compilation...');",
      "          const compiled = Babel.transform(rawCode, {",
      "            presets: ['react'],",
      "            filename: 'App.jsx'",
      "          }).code;",
      "          ",
      "          console.log('⚛️ [Babel Custom Compiler] Compilation successful! Evaluating...');",
      "          const script = document.createElement('script');",
      "          script.textContent = compiled;",
      "          document.head.appendChild(script);",
      "          ",
      "          let Target = null;",
      "          if (typeof window.ClothingWebsite !== 'undefined') Target = window.ClothingWebsite;",
      "          else if (typeof window.App !== 'undefined') Target = window.App;",
      "          else {",
      "            const keys = Object.keys(window);",
      "            const compName = keys.find(k => k[0] === k[0].toUpperCase() && typeof window[k] === 'function' && k !== 'React' && k !== 'ReactDOM' && k !== 'Babel');",
      "            if (compName) Target = window[compName];",
      "          }",
      "          ",
      "          if (Target) {",
      "            window.mountReactComponent(Target);",
      "          } else {",
      "            document.getElementById('root').innerHTML = '<div style=\"padding:30px 15px;text-align:center;font-size:12px;color:#8A6E3E;background:#fff;border-radius:12px;margin:20px;box-shadow:0 4px 12px rgba(0,0,0,0.03);\">✦ 服飾網頁代碼載入成功 ✦<br/><span style=\"font-size:10px;color:#A89B85;margin-top:8px;display:block;\">(React 元件已安全導出，可點擊「匯出 ZIP」查看完整 JSX 代碼)</span></div>';",
      "          }",
      "        } catch (err) {",
      "          console.error('⚛️ [Babel Custom Compiler] Compilation/Render Error:', err);",
      "          const rootEl = document.getElementById('root') || document.body;",
      "          rootEl.innerHTML = '<div style=\"color:#d32f2f;padding:16px;font-size:12px;font-family:monospace;background:#fde8e8;border:0.5px solid #f5c2c2;border-radius:8px;margin:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);\"><strong style=\"font-size:13px;display:block;margin-bottom:6px;\">⚠️ JSX 編譯/渲染錯誤:</strong><pre style=\"white-space:pre-wrap;margin:0;font-size:11px;line-height:1.4;\">' + err.message + '</pre></div>';",
      "        }",
      "      }, 100);",
      "    });",
      "  })();",
      "</script>"
    ].join("\n");

    if (baseHtml.includes("</body>")) {
      baseHtml = baseHtml.replace("</body>", reactScriptBlock + "</body>");
    } else {
      baseHtml = baseHtml + reactScriptBlock;
    }

    srcDoc = baseHtml;
  } else {
    let finalHtml = htmlContent;
    if (!finalHtml && filesToRender["muse-vector.svg"]) {
      finalHtml = `<!DOCTYPE html><html><head><style>body { margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#FAF6F0; } svg { max-width:90%; max-height:90%; }</style></head><body>${filesToRender["muse-vector.svg"]}</body></html>`;
    } else if (!finalHtml) {
      finalHtml = `<!DOCTYPE html><html><head><style>body { margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#FAF6F0; color:#8A6E3E; font-family:sans-serif; font-size:12px; }</style></head><body><div style="text-align:center;padding:20px;">✦ 幾何預覽沙箱就緒 ✦<br/><span style="font-size:10px;color:#A89B85;margin-top:6px;display:block;">(請在左側發起對話叫 AI 寫代碼，成品將於此預覽)</span></div></body></html>`;
    } else {
      // Inlining and resolving local relative script tags in vanilla branch
      const fileKeys = Object.keys(filesToRender);
      fileKeys.forEach(filename => {
        if (filename.endsWith(".js")) {
          const fileContent = filesToRender[filename];
          const escapedName = filename.replace(/\./g, "\\.");
          const scriptRegex = new RegExp(`<script[^>]*src=["'](?:\\.\\/|\\/)?${escapedName}["'][^>]*>([\\s\\S]*?)<\\/script>`, "gi");
          
          if (finalHtml.match(scriptRegex)) {
            const inlineScript = `<script>\n${fileContent.replace(/<\/script>/gi, "<\\/script>")}\n</script>`;
            finalHtml = finalHtml.replace(scriptRegex, inlineScript);
          }
        }
      });

      // Strip any other relative script tags referencing local files that don't exist in files to prevent 404 CORS/Script error crashes
      finalHtml = finalHtml.replace(/<script[^>]*src=["']((?!\/\/|http).+?)["'][^>]*>([\s\S]*?)<\/script>/gi, (match, src) => {
        return `<!-- Stripped unresolved relative script: ${src} -->`;
      });

      let themeCss = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
      .theme-geek { --bg-main: #050505; --bg-card: rgba(11, 11, 11, 0.85); --border-color: rgba(197, 160, 89, 0.15); --text-title: #F5F5F5; --text-body: #A3A3A3; --accent-color: #C5A059; --font-serif: 'Inter', sans-serif; --radius-card: 12px; --shadow-style: 0 8px 32px rgba(0,0,0,0.6); }
      .theme-organic { --bg-main: #FAF8F5; --bg-card: rgba(255, 255, 255, 0.72); --border-color: rgba(197, 160, 89, 0.22); --text-title: #3D2E1A; --text-body: #8A6E3E; --accent-color: #BFA366; --font-serif: 'Playfair Display', 'Georgia', serif; --radius-card: 20px; --shadow-style: 0 12px 40px -15px rgba(138, 110, 62, 0.12); }
      .theme-neon { --bg-main: #06040A; --bg-card: rgba(15, 10, 24, 0.75); --border-color: rgba(212, 83, 126, 0.15); --text-title: #FAF6F0; --text-body: #A78BFA; --accent-color: #D4537E; --font-serif: 'Outfit', sans-serif; --radius-card: 24px; --shadow-style: 0 15px 45px rgba(212,83,126,0.08); }
      .theme-cybertech { --bg-main: #0A0F1D; --bg-card: rgba(14, 22, 45, 0.8); --border-color: rgba(56, 189, 248, 0.15); --text-title: #E2E8F0; --text-body: #94A3B8; --accent-color: #38BDF8; --font-serif: 'Outfit', sans-serif; --radius-card: 8px; --shadow-style: 0 10px 35px rgba(56,189,248,0.06); }
      .theme-box { background: var(--bg-main) !important; color: var(--text-body) !important; font-family: 'Outfit', 'Inter', system-ui, sans-serif !important; transition: all 0.3s ease; }
      .theme-title { font-family: var(--font-serif) !important; color: var(--text-title) !important; }
      .theme-card { background: var(--bg-card) !important; border: 1px solid var(--border-color) !important; border-radius: var(--radius-card) !important; box-shadow: var(--shadow-style) !important; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      .theme-card:hover { transform: translateY(-2px); filter: brightness(1.02); }
      .theme-button { background: var(--accent-color) !important; color: #ffffff !important; font-weight: 600 !important; border-radius: 12px !important; border: none !important; box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; }
      .theme-button:hover { transform: translateY(-1px) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important; }`;
      
      const styleTag = `<style>${themeCss}\n${cssContent}</style>`;
      const pwaSandboxMocks = `
        <script>
          // 🌸 [Safe Sandbox] Core Security Mocks to prevent "Script error." and Sandbox Crashes
          (function() {
            try {
              if (!('serviceWorker' in navigator) || !navigator.serviceWorker) {
                Object.defineProperty(navigator, 'serviceWorker', {
                  value: {
                    register: function(url) {
                      console.log("🌸 [Safe Sandbox] Mocked ServiceWorker registration for: " + url);
                      return Promise.resolve({
                        scope: '/',
                        unregister: function() { return Promise.resolve(true); },
                        update: function() { return Promise.resolve(); },
                        addEventListener: function() {},
                        removeEventListener: function() {}
                      });
                    },
                    addEventListener: function() {},
                    removeEventListener: function() {},
                    getRegistration: function() { return Promise.resolve(undefined); },
                    getRegistrations: function() { return Promise.resolve([]); }
                  },
                  configurable: true,
                  writable: true
                });
              } else {
                const originalRegister = navigator.serviceWorker.register;
                navigator.serviceWorker.register = function() {
                  try {
                    return originalRegister.apply(navigator.serviceWorker, arguments);
                  } catch (e) {
                    console.warn("🌸 [Safe Sandbox] ServiceWorker registration blocked, falling back to mock: ", e);
                    return Promise.resolve({
                      scope: '/',
                      unregister: function() { return Promise.resolve(true); },
                      update: function() { return Promise.resolve(); },
                      addEventListener: function() {},
                      removeEventListener: function() {}
                    });
                  }
                };
              }
            } catch (e) { console.warn("🌸 [Safe Sandbox] Failed to mock ServiceWorker:", e); }

            try {
              if (!('caches' in window) || !window.caches) {
                Object.defineProperty(window, 'caches', {
                  value: {
                    open: function() {
                      return Promise.resolve({
                        addAll: function() { return Promise.resolve(); },
                        add: function() { return Promise.resolve(); },
                        put: function() { return Promise.resolve(); },
                        match: function() { return Promise.resolve(undefined); },
                        keys: function() { return Promise.resolve([]); },
                        delete: function() { return Promise.resolve(true); }
                      });
                    },
                    match: function() { return Promise.resolve(undefined); },
                    has: function() { return Promise.resolve(false); },
                    delete: function() { return Promise.resolve(true); },
                    keys: function() { return Promise.resolve([]); }
                  },
                  configurable: true,
                  writable: true
                });
              }
            } catch (e) { console.warn("🌸 [Safe Sandbox] Failed to mock CacheStorage:", e); }

            try {
              const dummy = window.localStorage;
            } catch (e) {
              console.warn("🌸 [Safe Sandbox] LocalStorage blocked, installing memory mock.");
              const createMockStorage = () => {
                let store = {};
                return {
                  getItem: function(key) { return store[key] || null; },
                  setItem: function(key, val) { store[key] = String(val); },
                  removeItem: function(key) { delete store[key]; },
                  clear: function() { store = {}; },
                  key: function(idx) { return Object.keys(store)[idx] || null; },
                  get length() { return Object.keys(store).length; }
                };
              };
              try {
                Object.defineProperty(window, 'localStorage', { value: createMockStorage(), configurable: true });
                Object.defineProperty(window, 'sessionStorage', { value: createMockStorage(), configurable: true });
              } catch (err) { console.warn("🌸 [Safe Sandbox] Failed to define Storage mocks:", err); }
            }
          })();
        </script>
      `;

      if (finalHtml.includes("style.css")) {
        finalHtml = finalHtml.replace(/<link[^>]*href=["']style\.css["'][^>]*>/gi, styleTag);
      } else if (finalHtml.includes("</head>")) {
        finalHtml = finalHtml.replace("</head>", styleTag + "</head>");
      } else {
        finalHtml = styleTag + finalHtml;
      }

      if (finalHtml.includes("</head>")) {
        finalHtml = finalHtml.replace("</head>", pwaSandboxMocks + "</head>");
      } else if (finalHtml.includes("<head>")) {
        finalHtml = finalHtml.replace("<head>", "<head>" + pwaSandboxMocks);
      } else {
        finalHtml = pwaSandboxMocks + finalHtml;
      }

      
      // Inject theme-box and theme class into body of HTML
      finalHtml = finalHtml.replace(/<body([^>]*)>/i, `<body class="theme-${detectedTheme} theme-box" $1>`);

      const safeSvgStr = (filesToRender["muse-vector.svg"] || "")
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$/g, "\\$");

      const jsCode = filesToRender["app.js"] || "";
      const injectScript = [
        "<script>",
        "  const originalFetch = window.fetch;",
        "  window.fetch = function(url) {",
        "    if (url === 'muse-vector.svg') {",
        "      return Promise.resolve(new Response(`" + safeSvgStr + "`, {",
        "        headers: { 'Content-Type': 'image/svg+xml' }",
        "      }));",
        "    }",
        "    return originalFetch(url);",
        "  };",
        "  try {",
        "    " + jsCode.replace(/<\/script>/gi, "<\\/script>"),
        "  } catch(e) {",
        "    console.error(e);",
        "  }",
        "</script>"
      ].join("\n");

      if (finalHtml.includes("app.js")) {
        finalHtml = finalHtml.replace(/<script[^>]*src=["']app\\.js["'][^>]*>([\s\S]*?)<\/script>/gi, injectScript);
      } else if (finalHtml.includes("</body>")) {
        finalHtml = finalHtml.replace("</body>", injectScript + "</body>");
      } else {
        finalHtml = finalHtml + injectScript;
      }
    }
    srcDoc = finalHtml;
  }

  return (
    <div style={{ 
      width: isMobile ? "100%" : 280, 
      height: isMobile ? "100%" : "auto",
      position: isMobile ? "absolute" : "relative",
      left: isMobile ? 0 : "auto",
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: isMobile ? 2000 : "auto",
      background: "rgba(248, 246, 242, 0.98)", 
      backdropFilter: "blur(20px)",
      borderLeft: isMobile ? "none" : `0.5px solid rgba(220, 215, 206, 0.8)`, 
      display: "flex", 
      flexDirection: "column", 
      flexShrink: 0,
      boxShadow: isMobile ? "0 4px 30px rgba(0,0,0,0.15)" : "-4px 0 30px rgba(0,0,0,0.03)"
    }}>
      {/* 頂部 Header */}
      <div style={{ 
        padding: "10px 14px", 
        background: "rgba(255, 255, 255, 0.4)", 
        borderBottom: `0.5px solid rgba(220, 215, 206, 0.6)`, 
        display: "flex", 
        alignItems: "center", 
        gap: 6 
      }}>
        <span style={{ fontSize: 12, color: T.gold }}>✦</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: 0.5 }}>PREVIEW & EXPORT</span>
        {hasPwa && (
          <span 
            title="本企劃案支援 PWA 桌面/手機安裝標準，打包後可直接新增至桌面獨立開啟運行！"
            style={{ 
              fontSize: 9, 
              fontWeight: "bold", 
              color: "#D97706", 
              background: "rgba(217, 119, 6, 0.08)", 
              border: "0.5px solid rgba(217, 119, 6, 0.25)",
              padding: "1px 6px", 
              borderRadius: 99, 
              display: "flex", 
              alignItems: "center", 
              gap: 2,
              cursor: "help",
              marginLeft: 6
            }}
          >
            ✨ PWA
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button 
          onClick={() => dispatch({ type: "TOGGLE_PV" })} 
          style={{ 
            border: "none", 
            borderRadius: "50%", 
            background: "rgba(0,0,0,0.04)", 
            cursor: "pointer", 
            fontSize: 10, 
            color: T.textDim, 
            width: 20, 
            height: 20, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            transition: "background 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 12, gap: 12, overflowY: "auto" }}>
        {/* Simulated Sandbox Preview Simulator */}
        <div style={{ 
          height: 160,
          width: "100%", 
          borderRadius: 14, 
          background: "#fff", 
          border: `1px solid rgba(220, 215, 206, 0.6)`, 
          overflow: "hidden", 
          boxShadow: "0 4px 20px rgba(61,46,26,0.04)",
          position: "relative",
          flexShrink: 0
        }}>
          {isDocument ? (
            <div style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #FAF8F5 0%, #FFFDF9 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              boxSizing: "border-box",
              gap: 8,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 28 }}>{getFileLargeIcon(activeFile)}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.text, maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeFile}
              </div>
              <button
                onClick={() => setShowDocReader(true)}
                style={{
                  border: `1px solid ${T.gold}`,
                  background: "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)",
                  color: T.goldDark,
                  borderRadius: 8,
                  padding: "4px 12px",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(197, 160, 89, 0.08)",
                  transition: "all 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                👁️ 開啟高奢閱讀器
              </button>
            </div>
          ) : (
            <iframe 
              title="Muse AI Live Preview"
              srcDoc={srcDoc} 
              style={{ 
                width: "100%", 
                height: "100%", 
                border: "none",
                display: "block"
              }} 
            />
          )}
          
          {/* Glassmorphism Loading Mask during Streaming */}
          {state.streaming && (
            <div style={{
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255, 254, 250, 0.94)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              textAlign: "center",
              zIndex: 10
            }}>
              <span style={{
                fontSize: 22,
                color: T.gold,
                marginBottom: 6,
                display: "inline-block"
              }}>✦</span>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#8A6E3E",
                letterSpacing: 0.5,
                marginBottom: 4
              }}>
                ✦ AI 正在精心設計企劃案架構中...
              </div>
              <span style={{
                fontSize: 10,
                color: "#A89B85",
                lineHeight: 1.4
              }}>
                完成後將自動編譯並渲染成品
              </span>
            </div>
          )}
        </div>

        {/* Action Controls Panel */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button 
            onClick={handlePush}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #FEF3C7, #FFFBEB)",
              border: `1px solid ${T.gold}`,
              color: T.goldDark,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              boxShadow: "0 2px 4px rgba(197,160,89,0.1)",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            🚀 推送成品
          </button>
          <button 
            onClick={handleExportZip}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              background: "#3D2E1A",
              border: "none",
              color: "#FFF8F0",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            📦 匯出 ZIP
          </button>
        </div>

        {/* PROJECT FILES List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5 }}>
              PROJECT FILES
            </span>
            <span style={{ fontSize: 9, color: T.gold, fontWeight: "bold" }}>
              {fileNames.length} 個檔案
            </span>
          </div>
          
          {fileNames.length > 0 ? (
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 6,
              padding: "2px 0"
            }}>
              {fileNames.map((name) => {
                const isActive = name === activeFile;
                return (
                  <div
                    key={name}
                    onClick={() => setSelectedFile(name)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isActive ? "#FEF3C7" : "#FAF6F5",
                      border: isActive ? `1px solid ${T.gold}` : `1px solid ${T.borderLight}`,
                      color: isActive ? T.goldDark : T.text,
                      fontSize: 11,
                      fontWeight: isActive ? 600 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.2s ease",
                      boxShadow: isActive ? "0 2px 6px rgba(61,46,26,0.03)" : "none"
                    }}
                  >
                    <span>{getFileIcon(name)}</span>
                    <span>{name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              fontSize: 10, 
              color: T.textGhost, 
              padding: "8px 12px", 
              background: "rgba(255, 255, 255, 0.35)", 
              borderRadius: 8, 
              border: `1.5px dashed rgba(220, 215, 206, 0.6)`,
              textAlign: "center"
            }}>
              ✦ 尚無產出檔案 (請在左側發起對話叫 AI 寫代碼)
            </div>
          )}
        </div>

        {/* CODE VIEWER Panel */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          gap: 6, 
          minHeight: 180, 
          overflow: "hidden" 
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5 }}>
              CODE VIEWER
            </span>
          </div>
          
          <div style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden"
          }}>
            {/* Header Tab */}
            <div style={{
              padding: "6px 12px",
              background: "#FAF6F5",
              border: `1.5px solid ${T.borderLight}`,
              borderBottom: "none",
              borderRadius: "8px 8px 0 0",
              fontSize: 10,
              fontWeight: 600,
              color: T.textMid,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0
            }}>
              <span>{activeFile || "code"}</span>
              {activeFile && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(files[activeFile] || "");
                    alert(`📋 已成功複製 ${activeFile} 的源代碼！`);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 9,
                    color: T.goldDark,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  📋 複製代碼
                </button>
              )}
            </div>
            
            {/* Code Content Body */}
            <div style={{
              flex: 1,
              background: "#FCF9F6",
              border: `1.5px solid ${T.borderLight}`,
              borderRadius: "0 0 8px 8px",
              padding: 10,
              overflow: "auto",
              boxShadow: "inset 0 1px 4px rgba(61,46,26,0.02)"
            }}>
              {activeFile ? (
                <pre style={{
                  margin: 0,
                  fontFamily: "var(--font-mono, 'Consolas', 'Courier New', monospace)",
                  fontSize: 10,
                  color: T.text,
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all"
                }}>
                  <code>
                    {files[activeFile] || ""}
                  </code>
                </pre>
              ) : (
                <div style={{ 
                  height: "100%",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: 10, 
                  color: T.textGhost, 
                  fontStyle: "italic",
                  fontFamily: "monospace"
                }}>
                  // 尚未生成 any 原始碼
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDocReader && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: "rgba(30, 24, 16, 0.4)",
          backdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? 12 : 40,
          boxSizing: "border-box",
          animation: "fadeIn 0.3s ease-out"
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{
            width: "100%",
            maxWidth: 960,
            height: "100%",
            maxHeight: "90vh",
            background: "#FAF8F5",
            borderRadius: 20,
            boxShadow: "0 25px 50px -12px rgba(61, 46, 26, 0.25), 0 0 40px rgba(197, 160, 89, 0.1)",
            border: "1px solid rgba(220, 215, 206, 0.8)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            {/* Header */}
            <div style={{
              background: getHeaderBgColor(activeFile),
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#ffffff",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              zIndex: 10
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{getFileLargeIcon(activeFile)}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: 0.5, color: "#ffffff" }}>{activeFile}</h2>
                    <span style={{ fontSize: 10, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                      {getViewerSubtitle(activeFile)}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2, fontFamily: "monospace" }}>
                    Size: {new Blob([files[activeFile] || ""]).size} bytes | Format: Verified Luxury Document
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => downloadDocumentFile(activeFile, files[activeFile] || "")}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.4)",
                    color: "#ffffff",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
                >
                  📥 下載檔案
                </button>
                
                <button
                  onClick={() => setShowDocReader(false)}
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "none",
                    color: "#ffffff",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0, 0, 0, 0.4)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0, 0, 0, 0.2)"}
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Document Content Viewport */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? "20px 16px" : "40px",
              background: "#FAF8F5",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}>
              {renderDocumentContentBody(activeFile, files[activeFile] || "")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
