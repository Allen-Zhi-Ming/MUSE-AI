import React, { useRef, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { T, MODES, STUDIO_SYS, JOURNAL_SYS, COMM_SCENARIOS, INSPI_SYS, GROWTH_SYS, HABIT_SYS, MARKET_SYS, MEMORY_SYS, MARKET_TEMPLATES } from "../constants";
import { Md, Btn, SkeletonLoader } from "./Common";
import { analytics } from "../utils/analytics";

function extractFilenameFromCode(code: string): { filename: string | null; cleanedCode: string } {
  if (!code) return { filename: null, cleanedCode: code };
  
  const lines = code.split("\n");
  const first3 = lines.slice(0, 3);
  
  // Pattern 1: [建立檔案：main.jsx] or [filename: main.jsx]
  const bracketRegex = /\[(?:建立檔案|建立|檔案|filename|file|名稱為|叫)[:：]?\s*([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)\s*\]/i;
  
  // Pattern 2: comment style or hash style
  // // main.jsx  or  /* FILE: main.jsx */  or  # style.css  or  <!-- index.html -->
  const commentRegex = /^(?:\/\/|\/\*|#|<!--)\s*(?:建立檔案|建立|檔案|filename|file|FILE|名稱為|叫)?\s*[:：]?\s*([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)(?:\s*\*\/|\s*-->)?/i;

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
  }
  
  return { filename: null, cleanedCode: code };
}

function parseMessageContent(text: string) {
  if (!text) return { cleanText: "", codeBlocks: [] };
  
  const codeBlocks: Array<{ filename: string; code: string; lang: string }> = [];
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
    // ═══════════════════════════════════════════════════════
    const isJSorReact = code.includes("import React") || code.includes("useState") || code.includes("export default") || code.includes("const ") || code.includes("function ") || lang === "jsx" || lang === "tsx" || lang === "js" || lang === "javascript";
    const isHTML = code.includes("<!DOCTYPE") || code.includes("<html") || code.includes("<head") || code.includes("<body");
    const isCSS = (lang === "css" || code.includes("body {") || code.includes("margin:") || code.includes("padding:")) && !isJSorReact && !isHTML;
    const isSVG = code.startsWith("<svg") || code.includes("</svg>") || lang === "svg";
    
    // 如果解析出來的檔名與實際內容特徵嚴重不符，進行智慧導正
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
        filename = `code.${lang || "txt"}`;
      }
    }
    
    codeBlocks.push({ filename, code, lang });
  }
  
  let cleanText = text.replace(/```([a-zA-Z0-9+#]+)?\s*([\s\S]*?)(?:```|$)/ig, "").trim();
  cleanText = cleanText.replace(/---/g, "").trim();
  
  return { cleanText, codeBlocks };
}

function buildPreviewSrcDoc(filename: string, code: string, files: Record<string, string>) {
  const cssContent = files["style.css"] || "";
  const htmlContent = files["index.html"] || "";
  const fileNames = Object.keys(files);
  
  const reactFiles = fileNames.filter(name => name.endsWith(".jsx") || name.endsWith(".tsx") || name.toLowerCase() === "app.js");
  
  // 智慧排序：確保入口檔案（如 main.jsx, index.jsx 或包含 ReactDOM / createRoot 的檔案）排在最後，
  // 讓所有其他組件（如 App.jsx）先宣告定義，避免執行時發生 "ReferenceError: App is not defined" 等未定義錯誤。
  reactFiles.sort((a, b) => {
    const aContent = files[a] || "";
    const bContent = files[b] || "";
    const aIsEntry = a.toLowerCase().includes("main") || a.toLowerCase().includes("index") || aContent.includes("createRoot") || aContent.includes("ReactDOM.render") || aContent.includes("ReactDOM.createRoot");
    const bIsEntry = b.toLowerCase().includes("main") || b.toLowerCase().includes("index") || bContent.includes("createRoot") || bContent.includes("ReactDOM.render") || bContent.includes("ReactDOM.createRoot");
    if (aIsEntry && !bIsEntry) return 1;
    if (!aIsEntry && bIsEntry) return -1;
    return 0;
  });

  let reactCode = "";
  if (reactFiles.length > 0) {
    reactCode = reactFiles.map(name => `/* FILE: ${name} */\n${files[name]}`).join("\n\n");
  } else {
    reactCode = code;
  }

  let detectedTheme = "organic";
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
    const compNames: string[] = [];
    const declRegex = /(?:const|let|var|function)\s+([A-Z][a-zA-Z0-9_]*)/g;
    let declMatch;
    while ((declMatch = declRegex.exec(reactCode)) !== null) {
      const name = declMatch[1];
      if (name && name !== 'React' && name !== 'ReactDOM' && name !== 'Babel' && !compNames.includes(name)) {
        compNames.push(name);
      }
    }
    
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

    const fileKeys = Object.keys(files);
    fileKeys.forEach(filename => {
      if (filename.endsWith(".js") || filename.endsWith(".jsx") || filename.endsWith(".tsx")) {
        const isReactEntry = filename === "App.jsx" || filename === "App.tsx" || filename === "App.js" || filename === "index.jsx" || filename === "index.tsx" || filename.includes("main");
        const escapedName = filename.replace(/\./g, "\\.");
        const scriptRegex = new RegExp(`<script[^>]*src=["'](?:\\.\\/|\\/)?${escapedName}["'][^>]*>([\\s\\S]*?)<\\/script>`, "gi");
        
        if (isReactEntry) {
          baseHtml = baseHtml.replace(scriptRegex, `<!-- Stripped React Entry script tag to prevent duplicate execution: ${filename} -->`);
        } else {
          const fileContent = files[filename];
          const isJsxFile = filename.endsWith(".jsx") || filename.endsWith(".tsx") || fileContent.includes("React") || /<[A-Z][a-zA-Z0-9]*/.test(fileContent);
          const scriptType = isJsxFile ? "type='text/babel'" : "";
          
          if (baseHtml.match(scriptRegex)) {
            const inlineScript = `<script ${scriptType}>\n${fileContent.replace(/<\/script>/gi, "<\\/script>")}\n</script>`;
            baseHtml = baseHtml.replace(scriptRegex, inlineScript);
          }
        }
      }
    });

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

    if (!baseHtml.includes("id=\"root\"") && !baseHtml.includes("id='root'")) {
      if (baseHtml.includes("<body>")) {
        baseHtml = baseHtml.replace("<body>", "<body>\n  <div id=\"root\"></div>");
      } else {
        baseHtml = "<div id=\"root\"></div>\n" + baseHtml;
      }
    }

    baseHtml = baseHtml.replace(/<body([^>]*)>/i, `<body class="theme-${detectedTheme} theme-box" $1>`);

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

    return baseHtml;
  } else {
    let finalHtml = htmlContent;
    if (!finalHtml && files["muse-vector.svg"]) {
      finalHtml = `<!DOCTYPE html><html><head><style>body { margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#FAF6F0; } svg { max-width:90%; max-height:90%; }</style></head><body>${files["muse-vector.svg"]}</body></html>`;
    } else if (!finalHtml) {
      finalHtml = `<!DOCTYPE html><html><head><style>body { margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#FAF6F0; color:#8A6E3E; font-family:sans-serif; font-size:12px; }</style></head><body><div style="text-align:center;padding:20px;">✦ 幾何預覽沙箱就緒 ✦</div></body></html>`;
    } else {
      const fileKeys = Object.keys(files);
      fileKeys.forEach(filename => {
        if (filename.endsWith(".js")) {
          const fileContent = files[filename];
          const escapedName = filename.replace(/\./g, "\\.");
          const scriptRegex = new RegExp(`<script[^>]*src=["'](?:\\.\\/|\\/)?${escapedName}["'][^>]*>([\\s\\S]*?)<\\/script>`, "gi");
          
          if (finalHtml.match(scriptRegex)) {
            const inlineScript = `<script>\n${fileContent.replace(/<\/script>/gi, "<\\/script>")}\n</script>`;
            finalHtml = finalHtml.replace(scriptRegex, inlineScript);
          }
        }
      });

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
      
      const styleTag = "<style>" + themeCss + cssContent + "</style>";
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

      
      finalHtml = finalHtml.replace(/<body([^>]*)>/i, `<body class="theme-${detectedTheme} theme-box" $1>`);

      const safeSvgStr = (files["muse-vector.svg"] || "")
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$/g, "\\$");

      const jsCode = files["app.js"] || "";
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
    return finalHtml;
  }
}

export { ChatEngine } from './views/ChatEngine';
export function StudioView({ state, dispatch, send, genImg }: any) {
  const [showGenSettings, setShowGenSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedLinkType, setCopiedLinkType] = useState<"direct" | "public" | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  
  // Custom states requested for collateral settings grouping and explicit URL sharing modal
  const [ratioExpanded, setRatioExpanded] = useState(true);
  const [styleExpanded, setStyleExpanded] = useState(true);
  const [qualityExpanded, setQualityExpanded] = useState(false);
  const [cfgExpanded, setCfgExpanded] = useState(false);
  const [negExpanded, setNegExpanded] = useState(false);
  const [sharedImage, setSharedImage] = useState<any | null>(null);
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [imageGenProgress, setImageGenProgress] = useState(0);

  // --- Plan A & User Request States ---
  const THEMES = [
    { key: "story", label: "🏷️ 品牌故事" },
    { key: "features", label: "🏷️ 產品特點" },
    { key: "knowledge", label: "🏷️ 社群乾貨" },
    { key: "promotion", label: "🏷️ 活動推廣" },
    { key: "quotes", label: "🏷️ 感性語錄" }
  ];
  const [selectedThemes, setSelectedThemes] = useState<string[]>(["story"]);
  const [studioDesc, setStudioDesc] = useState("");
  const [selectedLayout, setSelectedLayout] = useState<"minimalist" | "editorial" | "poster" | "split">("minimalist");
  const [layoutImageIdx, setLayoutImageIdx] = useState(0);
  const [copiedLayout, setCopiedLayout] = useState(false);

  useEffect(() => {
    let timer: any;
    if (state.generatingImage) {
      setImageGenProgress(1);
      timer = setInterval(() => {
        setImageGenProgress((prev) => {
          if (prev >= 95) {
            return prev;
          }
          const step = prev < 30 ? 6 : prev < 65 ? 3 : prev < 85 ? 1.5 : 0.5;
          return Math.min(prev + step, 97);
        });
      }, 180);
    } else {
      setImageGenProgress(0);
    }
    return () => clearInterval(timer);
  }, [state.generatingImage]);

  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 252; // width (240) + gap (12)
      carouselRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  const downloadImage = async (url: string, index: number) => {
    try {
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `muse-ai-gen-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `muse-ai-gen-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (e) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `muse-ai-gen-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const shareImage = (url: string, index: number, prompt?: string) => {
    setSharedImage({ url, index, prompt });
  };

  const swapImages = (idxA: number, idxB: number) => {
    if (idxB < 0 || idxB >= state.generatedImages.length) return;
    const newList = [...state.generatedImages];
    const item = newList[idxA];
    newList.splice(idxA, 1);
    newList.splice(idxB, 0, item);
    dispatch({ type: "REORDER_GENERATED_IMAGES", images: newList });
  };

  const PLATS = [["ig", "IG 貼文"], ["xhs", "小紅書"], ["linkedin", "LinkedIn"], ["blog", "部落格"], ["email", "Email"]];
  const RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"];
  const STYLES = [
    { id: "photorealistic", n: "寫實" },
    { id: "digital_art", n: "數位藝術" },
    { id: "oil_painting", n: "油畫" },
    { id: "sketch", n: "素描" },
    { id: "anime", n: "動漫" },
    { id: "minimalist", n: "極簡" }
  ];
  const QUALITIES = [
    { id: "standard", n: "標準品質" },
    { id: "hd", n: "超高畫質 (HD)" }
  ];
  const CFGS = [5.0, 7.5, 10.0, 15.0];

  const msgs = state.messages[state.studioTid] || [];
  const botRef = useRef<HTMLDivElement>(null);
  
  // Find generated copywriting text from AI assistant response
  const lastAssistantMsg = [...msgs].reverse().find(m => m.role === "assistant" && m.content);
  const generatedCopyText = lastAssistantMsg ? lastAssistantMsg.content : "";

  // Triggering text copywriting generation
  const handleGenerateCopy = () => {
    if (state.streaming) return;
    const themeLabels = THEMES.filter(t => selectedThemes.includes(t.key)).map(t => t.label.replace(/🏷️\s*/, ""));
    const selectedPlatformLabel = PLATS.find(p => p[0] === state.platform)?.[1] || "IG 貼文";
    
    let finalPrompt = `我想為以下主題生成一篇精美的高奢 ${selectedPlatformLabel} 行銷文案：【${themeLabels.join("、")}】。`;
    if (studioDesc.trim()) {
      finalPrompt += `\n額外要求與描述：${studioDesc.trim()}`;
    }
    finalPrompt += `\n請注意：請使用符合品牌定位的尊榮奢華、富有情緒張力與莫蘭迪溫柔質感的文字，並提供一些精美的主標題與排版符號。`;
    
    send(finalPrompt, "spark", state.studioTid);
  };

  // Convert copywriting to image using genImg
  const handleConvertToImage = () => {
    if (state.generatingImage || !generatedCopyText) return;
    // Summarize the copywriting slightly as prompt to make image gen highly focused
    const imagePrompt = `${generatedCopyText.slice(0, 120)}, Morandi aesthetic photography, luxury branding backdrop, high-end professional lighting, detailed texture, 8k`;
    genImg(imagePrompt);
  };

  // Handle template exporting as copy
  const handleCopyLayoutResult = () => {
    const activeImgUrl = state.generatedImages[layoutImageIdx]?.url || state.generatedImages[0]?.url || "";
    const textToCopy = `【Muse AI 高奢排版作品 - 模板：${
      selectedLayout === "minimalist" ? "極簡留白式" :
      selectedLayout === "editorial" ? "高奢雜誌式" :
      selectedLayout === "poster" ? "海報宣傳式" : "品牌特寫式"
    }】\n\n圖片網址：${activeImgUrl}\n\n文案內容：\n${generatedCopyText}`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopiedLayout(true);
    setTimeout(() => setCopiedLayout(false), 2000);
  };

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, state.streaming]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#FAF9F5" }}>


      {/* Main Dual Column Dashboard Container */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden" }}>
        
        {/* LEFT COLUMN: Parameters & Interactive Input Form */}
        <div style={{ width: 350, borderRight: `0.5px solid ${T.border}`, background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto", padding: "16px 20px", gap: 18, scrollbarWidth: "none" as any }}>
          
          {/* Theme Selector Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🏷️</span> 選擇文案生成主題 <span style={{ fontSize: 9.5, color: T.textGhost }}>(可多選)</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {THEMES.map(t => {
                const isSelected = selectedThemes.includes(t.key);
                return (
                  <div
                    key={t.key}
                    onClick={() => {
                      if (isSelected) {
                        if (selectedThemes.length > 1) {
                          setSelectedThemes(prev => prev.filter(x => x !== t.key));
                        }
                      } else {
                        setSelectedThemes(prev => [...prev, t.key]);
                      }
                    }}
                    style={{
                      fontSize: 10.5,
                      padding: "5px 12px",
                      borderRadius: 14,
                      border: isSelected ? "0.5px solid #8A6E3E" : `0.5px solid ${T.border}`,
                      background: isSelected ? "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)" : "rgba(0,0,0,0.02)",
                      color: isSelected ? "#fff" : T.textMid,
                      cursor: "pointer",
                      fontWeight: isSelected ? 700 : 500,
                      boxShadow: isSelected ? "0 2px 6px rgba(197, 160, 89, 0.15)" : "none",
                      transform: isSelected ? "scale(1.03)" : "scale(1)",
                      transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                  >
                    {t.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ height: "0.5px", background: T.borderLight }} />

          {/* Description Input Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
              <span>✍️</span> 輸入關鍵字與細部要求
            </label>
            <textarea
              value={studioDesc}
              onChange={(e) => setStudioDesc(e.target.value)}
              placeholder="請輸入欲推廣的產品特點、品牌理念或是寫作方向... (如：北歐米白色簡約花瓶，適合慵懶午後風格)"
              style={{
                width: "100%",
                height: 100,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 12.5,
                color: T.text,
                background: T.bgInput,
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                lineHeight: 1.5
              }}
            />
          </div>

          <div style={{ height: "0.5px", background: T.borderLight }} />

          {/* Image Settings Section (Collapsed/Expanded Accordions) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
                <span>🎨</span> 配套設計圖片設定
              </span>
              <button 
                onClick={() => setShowGenSettings(!showGenSettings)}
                style={{ background: "transparent", border: "none", color: T.gold, fontSize: 11, cursor: "pointer", fontWeight: 700 }}
              >
                {showGenSettings ? "隱藏高級 ▲" : "自訂參數 ⚙️"}
              </button>
            </div>

            {showGenSettings && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#FAF9F6", padding: 12, borderRadius: 12, border: `0.5px solid ${T.border}` }}>
                {/* Ratio Selector */}
                <div>
                  <div onClick={() => setRatioExpanded(!ratioExpanded)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMid }}>📐 比例寬高比 <span style={{ fontSize: 9, color: T.goldDark, background: T.gold + "20", padding: "0px 4px", borderRadius: 4 }}>{state.imageGenSettings.aspectRatio}</span></span>
                    <span style={{ fontSize: 9, color: T.textGhost }}>{ratioExpanded ? "▲" : "▼"}</span>
                  </div>
                  {ratioExpanded && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px 2px 2px" }}>
                      {RATIOS.map(r => {
                        const isActive = state.imageGenSettings.aspectRatio === r;
                        return (
                          <div 
                            key={r} 
                            onClick={() => dispatch({ type: "SET_IMAGE_GEN_SETTING", field: "aspectRatio", val: r })} 
                            style={{ 
                              fontSize: 9.5, 
                              padding: "4px 10px", 
                              borderRadius: 8, 
                              border: isActive ? "0.5px solid #8A6E3E" : `0.5px solid ${T.border}`, 
                              background: isActive ? "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)" : "#fff", 
                              color: isActive ? "#fff" : T.textMid, 
                              cursor: "pointer", 
                              fontWeight: isActive ? 700 : 400, 
                              boxShadow: isActive ? "0 2px 6px rgba(197, 160, 89, 0.25)" : "none",
                              transform: isActive ? "scale(1.03)" : "none",
                              transition: "all .18s"
                            }}
                          >
                            {r}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ height: "0.5px", background: T.borderLight }} />

                {/* Style Selector */}
                <div>
                  <div onClick={() => setStyleExpanded(!styleExpanded)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMid }}>🎨 畫面風格傾向 <span style={{ fontSize: 9, color: T.goldDark, background: T.gold + "20", padding: "0px 4px", borderRadius: 4 }}>{STYLES.find(s => s.id === state.imageGenSettings.style)?.n || "預設"}</span></span>
                    <span style={{ fontSize: 9, color: T.textGhost }}>{styleExpanded ? "▲" : "▼"}</span>
                  </div>
                  {styleExpanded && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px 2px 2px" }}>
                      {STYLES.map(s => {
                        const isActive = state.imageGenSettings.style === s.id;
                        return (
                          <div 
                            key={s.id} 
                            onClick={() => dispatch({ type: "SET_IMAGE_GEN_SETTING", field: "style", val: s.id })} 
                            style={{ 
                              fontSize: 9.5, 
                              padding: "4px 10px", 
                              borderRadius: 8, 
                              border: isActive ? "0.5px solid #8A6E3E" : `0.5px solid ${T.border}`, 
                              background: isActive ? "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)" : "#fff", 
                              color: isActive ? "#fff" : T.textMid, 
                              cursor: "pointer", 
                              fontWeight: isActive ? 700 : 400, 
                              boxShadow: isActive ? "0 2px 6px rgba(197, 160, 89, 0.25)" : "none",
                              transform: isActive ? "scale(1.03)" : "none",
                              transition: "all .18s"
                            }}
                          >
                            {s.n}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ height: "0.5px", background: T.borderLight }} />

                {/* Quality Selector */}
                <div>
                  <div onClick={() => setQualityExpanded(!qualityExpanded)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMid }}>✨ 圖片生成品質 <span style={{ fontSize: 9, color: T.goldDark, background: T.gold + "20", padding: "0px 4px", borderRadius: 4 }}>{QUALITIES.find(q => q.id === state.imageGenSettings.quality)?.n || "標準品質"}</span></span>
                    <span style={{ fontSize: 9, color: T.textGhost }}>{qualityExpanded ? "▲" : "▼"}</span>
                  </div>
                  {qualityExpanded && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px 2px 2px" }}>
                      {QUALITIES.map(q => {
                        const isActive = state.imageGenSettings.quality === q.id;
                        return (
                          <div 
                            key={q.id} 
                            onClick={() => dispatch({ type: "SET_IMAGE_GEN_SETTING", field: "quality", val: q.id })} 
                            style={{ 
                              fontSize: 9.5, 
                              padding: "4px 10px", 
                              borderRadius: 8, 
                              border: isActive ? "0.5px solid #8A6E3E" : `0.5px solid ${T.border}`, 
                              background: isActive ? "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)" : "#fff", 
                              color: isActive ? "#fff" : T.textMid, 
                              cursor: "pointer", 
                              fontWeight: isActive ? 700 : 400, 
                              boxShadow: isActive ? "0 2px 6px rgba(197, 160, 89, 0.25)" : "none",
                              transform: isActive ? "scale(1.03)" : "none",
                              transition: "all .18s"
                            }}
                          >
                            {q.n}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ height: "0.5px", background: T.borderLight }} />

                {/* CFG Scale Selector */}
                <div>
                  <div onClick={() => setCfgExpanded(!cfgExpanded)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMid }}>🎯 提示詞契合度 (CFG) <span style={{ fontSize: 9, color: T.goldDark, background: T.gold + "20", padding: "0px 4px", borderRadius: 4 }}>{state.imageGenSettings.cfgScale ?? 7.5}</span></span>
                    <span style={{ fontSize: 9, color: T.textGhost }}>{cfgExpanded ? "▲" : "▼"}</span>
                  </div>
                  {cfgExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 2px 2px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {CFGS.map(c => {
                          const isActive = state.imageGenSettings.cfgScale === c;
                          return (
                            <div 
                              key={c} 
                              onClick={() => dispatch({ type: "SET_IMAGE_GEN_SETTING", field: "cfgScale", val: c })} 
                              style={{ 
                                fontSize: 9.5, 
                                padding: "4px 10px", 
                                borderRadius: 8, 
                                border: isActive ? "0.5px solid #8A6E3E" : `0.5px solid ${T.border}`, 
                                background: isActive ? "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)" : "#fff", 
                                color: isActive ? "#fff" : T.textMid, 
                                cursor: "pointer", 
                                fontWeight: isActive ? 700 : 400, 
                                boxShadow: isActive ? "0 2px 6px rgba(197, 160, 89, 0.25)" : "none",
                                transform: isActive ? "scale(1.03)" : "none",
                                transition: "all .18s"
                              }}
                            >
                              {c.toFixed(1)}
                            </div>
                          );
                        })}
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        step="0.5" 
                        value={state.imageGenSettings.cfgScale ?? 7.5} 
                        onChange={(e) => dispatch({ type: "SET_IMAGE_GEN_SETTING", field: "cfgScale", val: parseFloat(e.target.value) })}
                        style={{ width: "100%", accentColor: T.gold, height: 4, margin: "6px 0" }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ height: "0.5px", background: T.borderLight }} />

                {/* Negative Prompt */}
                <div>
                  <div onClick={() => setNegExpanded(!negExpanded)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMid }}>🚫 排除排除詞 <span style={{ fontSize: 9, color: T.goldDark, background: T.gold + "20", padding: "0px 4px", borderRadius: 4 }}>{state.imageGenSettings.negativePrompt ? "已啟用" : "未設定"}</span></span>
                    <span style={{ fontSize: 9, color: T.textGhost }}>{negExpanded ? "▲" : "▼"}</span>
                  </div>
                  {negExpanded && (
                    <div style={{ padding: "6px 2px 2px" }}>
                      <textarea 
                        value={state.imageGenSettings.negativePrompt ?? ""} 
                        onChange={(e) => dispatch({ type: "SET_IMAGE_GEN_SETTING", field: "negativePrompt", val: e.target.value })}
                        placeholder="輸入畫面中不想出現的事物 (如：模糊, 簡體字)"
                        style={{ width: "100%", height: 44, border: `1px solid ${T.borderLight}`, borderRadius: 8, padding: "6px 8px", fontSize: 10.5, color: T.text, background: T.bgInput, resize: "none", outline: "none" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleGenerateCopy}
            disabled={state.streaming}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              background: state.streaming ? T.borderLight : T.gold,
              border: "none",
              fontSize: 12.5,
              fontWeight: 700,
              color: "#fff",
              cursor: state.streaming ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(197, 160, 89, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: "auto",
              transition: "opacity 0.2s"
            }}
            onMouseEnter={e => { if(!state.streaming) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={e => { if(!state.streaming) e.currentTarget.style.opacity = "1"; }}
          >
            {state.streaming ? "⚡ 正在智能化撰寫文案中..." : "✦ 立即生成高奢行銷文案"}
          </button>
        </div>

        {/* RIGHT COLUMN: Results Display & Automatic Templates Layout Center */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "20px 24px", gap: 20 }}>
          
          {/* Image carousel / Pinned Image Gallery (100% Keeping original features as in Image 2) */}
          {(state.generatedImages.length > 0 || state.generatingImage) && (
            <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 16, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textGhost, marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
                <span>🎨</span> 已生成的設計圖片庫 <span style={{ fontSize: 9.5, fontWeight: 400 }}>(左右拖曳可移動排序 · 點擊下方的排版即可切換排版版面)</span>
              </div>
              
              <div style={{ position: "relative" }}>
                <div 
                  ref={carouselRef}
                  style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 10, scrollbarWidth: "none" as any }}
                >
                  {state.imageGenError && (
                    <div style={{ width: 140, height: 140, borderRadius: 12, background: "#FEF2F2", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 12, boxSizing: "border-box", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 16 }}>⚠️</span>
                      <div style={{ fontWeight: 700, color: "#991B1B", fontSize: 11 }}>生成失敗</div>
                      <button onClick={() => dispatch({ type: "SET_IMAGE_GEN_ERROR", error: null })} style={{ border: "none", background: "rgba(239, 68, 68, 0.08)", color: "#991B1B", borderRadius: 6, padding: "2px 8px", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>關閉</button>
                    </div>
                  )}
                  {state.generatingImage && (
                    <SkeletonLoader type="image" height={140} width={140} prompt="高奢設計變體中..." progress={imageGenProgress} />
                  )}
                  {state.generatedImages.map((img: any, i: number) => {
                    const isDragged = draggedIdx === i;
                    const isDragOver = dragOverIdx === i;
                    const isSelected = layoutImageIdx === i;
                    return (
                      <div 
                        key={img.url} 
                        draggable 
                        onDragStart={(e) => {
                          setDraggedIdx(i);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", i.toString());
                        }}
                        onDragEnd={() => {
                          setDraggedIdx(null);
                          setDragOverIdx(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverIdx !== i) setDragOverIdx(i);
                        }}
                        onDragLeave={() => {
                          if (dragOverIdx === i) setDragOverIdx(null);
                        }}
                        onDragEnter={() => {
                          if (draggedIdx !== null && draggedIdx !== i) {
                            const newList = [...state.generatedImages];
                            const draggedItem = newList[draggedIdx];
                            newList.splice(draggedIdx, 1);
                            newList.splice(i, 0, draggedItem);
                            setDraggedIdx(i);
                            dispatch({ type: "REORDER_GENERATED_IMAGES", images: newList });
                          }
                        }}
                        onClick={() => setLayoutImageIdx(i)}
                        style={{ 
                          position: "relative", 
                          width: 140, 
                          aspectRatio: "1/1", 
                          borderRadius: 12, 
                          overflow: "hidden", 
                          border: isSelected ? `2px solid ${T.gold}` : isDragOver ? `2px dashed ${T.gold}` : `0.5px solid ${T.borderLight}`, 
                          flexShrink: 0, 
                          scrollSnapAlign: "start",
                          cursor: "pointer",
                          opacity: isDragged ? 0.3 : 1,
                          transform: isSelected ? "scale(1.02)" : "scale(1)",
                          boxShadow: isSelected ? "0 4px 12px rgba(197, 160, 89, 0.2)" : "none",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                        }}
                      >
                        <img src={img.url} alt="Gen" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" draggable={false} />
                        {isSelected && <div style={{ position: "absolute", inset: 0, background: "rgba(197,160,89,0.06)", pointerEvents: "none" }} />}
                        
                        {/* Variation trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const basePrompt = img.prompt || "高奢行銷插圖";
                            genImg(`${basePrompt}, high-end alternative visual, luxurious details`);
                          }}
                          disabled={state.generatingImage}
                          style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: 6, padding: "2px 6px", fontSize: 8, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, backdropFilter: "blur(4px)" }}
                        >
                          🪄 變體
                        </button>
                        
                        {/* Carousel image badge */}
                        <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(255,255,255,0.85)", color: T.textGhost, padding: "1px 4px", borderRadius: 4, fontSize: 8, fontWeight: 600 }}>{i + 1}/{state.generatedImages.length}</div>

                        {/* Top floating control deck */}
                        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => {
                            dispatch({ type: "PUSH_TO_MY_MUSE", asset: { id: `asset-${Date.now()}`, name: "工坊收藏", type: "image", content: img.url, ts: "剛剛" } });
                            dispatch({ type: "SET_ACTIVE_NOTIFICATION", notification: { id: `notif-${Date.now()}`, title: "💖 已收藏至靈感庫", body: "該插圖已儲存至靈感庫！", ts: "剛剛" } });
                          }} style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>💖</button>
                          <button onClick={() => shareImage(img.url, i, img.prompt)} style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>🔗</button>
                          <button onClick={() => setEditingImage({ url: img.url, index: i, prompt: img.prompt })} style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>✂️</button>
                          <button onClick={() => downloadImage(img.url, i)} style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>↓</button>
                          <button onClick={() => dispatch({ type: "DEL_GENERATED_IMAGE", index: i })} style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold" }}>×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {state.generatedImages.length > 2 && (
                  <>
                    <button onClick={() => scrollCarousel("left")} style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", background: "#fff", border: `1px solid ${T.border}`, boxShadow: "0 2px 6px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, fontSize: 12 }}>‹</button>
                    <button onClick={() => scrollCarousel("right")} style={{ position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", background: "#fff", border: `1px solid ${T.border}`, boxShadow: "0 2px 6px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, fontSize: 12 }}>›</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* AI Generated Text Copywriting Display Card */}
          {generatedCopyText ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 16, padding: "20px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", borderLeft: "4px solid #C5A059" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>✨</span>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: T.goldDark, letterSpacing: "0.02em" }}>已生成之高奢品牌文案</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCopyText);
                      const btn = document.getElementById("copy-raw-copy-btn");
                      if (btn) btn.innerHTML = "已複製 ✓";
                      setTimeout(() => { if (btn) btn.innerHTML = "複製純文案 📋"; }, 2000);
                    }}
                    id="copy-raw-copy-btn"
                    style={{ border: "none", background: "#FAF7F0", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, color: T.goldDark, cursor: "pointer", transition: "background 0.2s" }}
                  >
                    複製純文案 📋
                  </button>
                </div>
                
                <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7, background: "#FAFBFD", padding: 14, borderRadius: 10, border: `0.5px solid ${T.borderLight}` }}>
                  <Md text={generatedCopyText} />
                </div>

                {/* Covert Copy to Image Action Button */}
                {state.generatedImages.length === 0 && (
                  <button
                    onClick={handleConvertToImage}
                    disabled={state.generatingImage}
                    style={{
                      width: "100%",
                      padding: "10px 0",
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #1E1A2E 0%, #3D2E1A 100%)",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#FFF8F2",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginTop: 14,
                      boxShadow: "0 4px 12px rgba(61,46,26,0.15)",
                      transition: "opacity 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    {state.generatingImage ? "正在努力構思畫面細節中..." : "🎨 一鍵將文案轉成設計圖片 (AI Generate Image)"}
                  </button>
                )}
              </div>

              {/* AUTOMATIC LAYOUT PRESENTATION CENTER */}
              {state.generatedImages.length > 0 && (() => {
                const activeImg = state.generatedImages[layoutImageIdx]?.url || state.generatedImages[0]?.url || "";
                
                // Four Preset Layout Cards Renderers
                const renderLayoutPreview = () => {
                  switch (selectedLayout) {
                    case "minimalist": // 1. Minimalist stacked
                      return (
                        <div style={{ background: "#ffffff", border: "0.5px solid rgba(197, 160, 89, 0.3)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 10px 30px rgba(61,46,26,0.06)" }}>
                          <div style={{ width: "100%", maxHeight: 360, overflow: "hidden", position: "relative" }}>
                            <img src={activeImg} alt="Layout" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                          </div>
                          <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 2, height: 28, background: "#C5A059" }} />
                              <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: "#3D2E1A", fontStyle: "italic" }}>
                                Muse AI Design Studio
                              </div>
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.8, color: "#2D2A26", whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", letterSpacing: "0.01em" }}>
                              {generatedCopyText}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 12, fontSize: 9.5, color: T.textGhost, letterSpacing: "0.08em" }}>
                              <span>✦ MUSEDINI PREMIUM</span>
                              <span>VOL. 2026</span>
                            </div>
                          </div>
                        </div>
                      );
                    case "editorial": // 2. Editorial split overlapping style
                      return (
                        <div style={{ background: "#F5F1EB", border: "1px solid rgba(197, 160, 89, 0.25)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 10px 30px rgba(61,46,26,0.08)", position: "relative" }}>
                          <div style={{ position: "absolute", top: 12, right: 16, fontSize: 8.5, fontWeight: 700, color: T.goldDark, border: "0.5px solid rgba(197,160,89,0.3)", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.05em" }}>PAGE 01 / EDITORIAL</div>
                          
                          <div style={{ display: "flex", gap: 18, flexDirection: "row", flexWrap: "wrap" }}>
                            <div style={{ flex: "1 1 200px", maxWidth: 280, height: 220, borderRadius: 10, overflow: "hidden", border: "0.5px solid rgba(197,160,89,0.4)", boxShadow: "0 8px 24px rgba(197, 160, 89, 0.15)" }}>
                              <img src={activeImg} alt="Layout" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                            </div>
                            <div style={{ flex: "2 1 280px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
                              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "#8A6E3E", margin: 0, fontWeight: 700 }}>THE MODERN LUXURY</h2>
                              <div style={{ background: "rgba(255,255,255,0.75)", padding: 12, borderRadius: 8, borderLeft: "3px solid #8A6E3E", fontStyle: "italic", fontSize: 11.5, color: T.text, lineHeight: 1.5 }}>
                                &ldquo;細節鑄就完美，而完美不是一個細節。探索最深邃的品牌觸感。&rdquo;
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ fontSize: 12.5, lineHeight: 1.7, color: T.textMid, whiteSpace: "pre-wrap", textAlign: "justify", borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 16 }}>
                            {generatedCopyText}
                          </div>
                        </div>
                      );
                    case "poster": // 3. Poster full bleed glassmorphism overlay
                      return (
                        <div style={{ 
                          width: "100%", 
                          minHeight: 460, 
                          borderRadius: 16, 
                          overflow: "hidden", 
                          position: "relative", 
                          display: "flex", 
                          flexDirection: "column", 
                          justifyContent: "flex-end",
                          padding: 24,
                          boxSizing: "border-box",
                          boxShadow: "0 12px 36px rgba(0,0,0,0.15)"
                        }}>
                          {/* Image backdrop */}
                          <img src={activeImg} alt="Backdrop" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} referrerPolicy="no-referrer" />
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(30,24,18,0.2) 0%, rgba(30,24,18,0.65) 100%)", zIndex: 2 }} />
                          
                          {/* Floating glassmorphic card */}
                          <div style={{ 
                            position: "relative",
                            zIndex: 3,
                            background: "rgba(255, 253, 250, 0.88)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            border: "0.5px solid rgba(255,255,255,0.4)",
                            borderRadius: 14,
                            padding: 20,
                            boxShadow: "0 8px 32px rgba(61,46,26,0.12)"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: "#C5A059", padding: "2px 8px", borderRadius: 20, letterSpacing: "0.08em" }}>✦ BRAND ESSENCE</span>
                              <span style={{ fontSize: 9, color: T.textGhost, fontWeight: 600 }}>MUSE AI POSTER</span>
                            </div>
                            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "#3D2E1A", whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto", scrollbarWidth: "none" as any }}>
                              {generatedCopyText}
                            </div>
                          </div>
                        </div>
                      );
                    case "split": // 4. Split 50/50 Showcase style
                      return (
                        <div style={{ background: "#ffffff", border: "0.5px solid rgba(197, 160, 89, 0.35)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "row", flexWrap: "wrap", minHeight: 340, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
                          <div style={{ flex: "1 1 240px", minHeight: 280, position: "relative" }}>
                            <img src={activeImg} alt="Split" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                          </div>
                          <div style={{ flex: "1 1 240px", background: "#FAF8F3", padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", borderLeft: "0.5px solid rgba(197, 160, 89, 0.2)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <div style={{ fontSize: 10, color: T.goldDark, fontWeight: 700, letterSpacing: "0.15em" }}>CREATIVE PORTFOLIO ✦ 2026</div>
                              <div style={{ fontSize: 12, lineHeight: 1.7, color: T.textMid, whiteSpace: "pre-wrap" }}>
                                {generatedCopyText}
                              </div>
                            </div>
                            
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "0.5px solid rgba(0,0,0,0.05)", paddingTop: 12, marginTop: 12 }}>
                              <div style={{ fontSize: 8.5, color: T.textGhost, fontWeight: 600 }}>DESIGNED BY MUSE AI</div>
                              {/* Signature Stamp */}
                              <div style={{ width: 24, height: 24, borderRadius: "50%", border: "1px double #D4537E", color: "#D4537E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: "bold", transform: "rotate(-15deg)" }}>M</div>
                            </div>
                          </div>
                        </div>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>📐</span> AI 自動排版設計中心 <span style={{ fontSize: 10, color: T.textGhost, fontWeight: 400 }}>(已經為您套用排版效果)</span>
                      </span>
                    </div>

                    {/* Template Selection Tabs with Symmetrical Share Pill */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none" as any, flex: 1 }}>
                        {[
                          { key: "minimalist", label: "🌿 極簡留白式" },
                          { key: "editorial", label: "📖 高奢雜誌式" },
                          { key: "poster", label: "🏷️ 海報宣傳式" },
                          { key: "split", label: "📐 品牌特寫式" }
                        ].map(tab => {
                          const isLayoutOn = selectedLayout === tab.key;
                          return (
                            <div
                              key={tab.key}
                              onClick={() => setSelectedLayout(tab.key as any)}
                              style={{
                                fontSize: 10,
                                padding: "6px 14px",
                                borderRadius: 20,
                                border: isLayoutOn ? "0.5px solid #8A6E3E" : `0.5px solid ${T.border}`,
                                background: isLayoutOn ? "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)" : "#fff",
                                color: isLayoutOn ? "#fff" : T.textMid,
                                cursor: "pointer",
                                fontWeight: isLayoutOn ? 700 : 500,
                                whiteSpace: "nowrap",
                                boxShadow: isLayoutOn ? "0 2px 6px rgba(197, 160, 89, 0.15)" : "none",
                                transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
                              }}
                            >
                              {tab.label}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleCopyLayoutResult}
                        style={{
                          fontSize: 10,
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: `0.5px solid ${T.border}`,
                          background: copiedLayout ? "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)" : "#fff",
                          color: copiedLayout ? "#fff" : T.textMid,
                          cursor: "pointer",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          boxShadow: copiedLayout ? "0 2px 6px rgba(197, 160, 89, 0.15)" : "none",
                          transition: "all 0.2s"
                        }}
                      >
                        <span>🔗</span> {copiedLayout ? "已複製分享 ✓" : "分享排版"}
                      </button>
                    </div>

                    {/* Beautifully Rendered Layout presentation card */}
                    <div style={{ marginTop: 6 }}>
                      {renderLayoutPreview()}
                    </div>

                    {/* Layout actions buttons */}
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <button
                        onClick={handleCopyLayoutResult}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          borderRadius: 10,
                          border: `0.5px solid ${T.border}`,
                          background: "#fff",
                          color: T.textMid,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6
                        }}
                      >
                        {copiedLayout ? "已複製完整排版 ✓" : "📋 複製完整排版 (含圖片與文案)"}
                      </button>
                      <button
                        onClick={() => {
                          downloadImage(activeImg, 0);
                          dispatch({ type: "SET_ACTIVE_NOTIFICATION", notification: { id: `notif-${Date.now()}`, title: "📥 開始下載排版海報", body: "排版底圖已開始下載！", ts: "剛剛" } });
                        }}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          borderRadius: 10,
                          border: "none",
                          background: T.gold,
                          color: "#fff",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6
                        }}
                      >
                        📥 下載排版海報圖片
                      </button>
                      <button
                        onClick={() => {
                          const bridgeMsg = `這是我在【創意工坊】設計好的海報方案：\n\n【排版模板】：${
                            selectedLayout === "minimalist" ? "極簡留白式" :
                            selectedLayout === "editorial" ? "高奢雜誌式" :
                            selectedLayout === "poster" ? "海報宣傳式" : "品牌特寫式"
                          }\n\n【文案成品】：\n${generatedCopyText}\n\n【圖片配圖】：${activeImg}\n\n請幫我評估一下如何能讓這個行銷提案更鋒利，並提出改進策略。`;
                          send(bridgeMsg, state.mode, state.studioTid);
                          dispatch({ type: "SET_NAV", view: "chat" });
                        }}
                        style={{
                          padding: "0 16px",
                          borderRadius: 10,
                          border: "none",
                          background: "rgba(197, 160, 89, 0.15)",
                          color: T.goldDark,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4
                        }}
                        title="將此生成成品送至中央對話進行策略微調"
                      >
                        💬 中央微調
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Empty initial display panel */
            <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 0" }}>
              <span style={{ fontSize: 44, animation: "bounce 2.5s infinite" }}>✍️</span>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginTop: 14, marginBottom: 6 }}>
                高奢行銷文案與自動排版設計中心
              </div>
              <div style={{ fontSize: 12, color: T.textGhost, maxWidth: 300, textAlign: "center", lineHeight: 1.7 }}>
                在左側多選主題並描述產品關鍵字，一鍵為您生成頂級排版貼文。您也可使用一鍵轉圖進行四種固定高訂模板排版！
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Share dialog modals */}
      {sharedImage && (() => {
        const publicShareUrl = `${window.location.origin}${window.location.pathname}?shareUrl=${encodeURIComponent(sharedImage.url)}&prompt=${encodeURIComponent(sharedImage.prompt || "品牌形象設計")}`;
        return (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 320, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>📤 分享產生的圖片</span>
                <button onClick={() => { setSharedImage(null); setCopiedLinkType(null); }} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: T.textGhost }}>×</button>
              </div>
              
              <div style={{ width: "100%", height: 140, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.borderLight}`, position: "relative" }}>
                <img src={sharedImage.url} alt="Share" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 4 }}>編號 {sharedImage.index + 1}</div>
              </div>

              {/* Public Gallery Link */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: T.goldDark, display: "flex", alignItems: "center", gap: 3 }}><span>✨</span> 公開分享展示網址</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input readOnly value={publicShareUrl} style={{ flex: 1, fontSize: 11, padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.gold}`, background: "#FFFDF9", overflow: "hidden", textOverflow: "ellipsis" }} onClick={e => (e.target as any).select()} />
                  <button onClick={() => { navigator.clipboard.writeText(publicShareUrl); setCopiedLinkType("public"); setTimeout(() => setCopiedLinkType(null), 2000); }} style={{ background: T.gold, color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{copiedLinkType === "public" ? "已複製 ✓" : "複製連結"}</button>
                </div>
              </div>

              {/* Direct Link */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: T.textGhost }}>原始圖片網址 (Direct)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input readOnly value={sharedImage.url} style={{ flex: 1, fontSize: 11, padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#FAFBFD", overflow: "hidden", textOverflow: "ellipsis" }} onClick={e => (e.target as any).select()} />
                  <button onClick={() => { navigator.clipboard.writeText(sharedImage.url); setCopiedLinkType("direct"); setTimeout(() => setCopiedLinkType(null), 2000); }} style={{ background: "#4B5563", color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{copiedLinkType === "direct" ? "已複製 ✓" : "複製連結"}</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => window.open(publicShareUrl, "_blank")} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `0.5px solid ${T.border}`, background: "#fff", color: T.textMid, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>展示預覽 ↗</button>
              </div>
            </div>
          </div>
        );
      })()}

      {editingImage && (
        <ImageEditorModal 
          img={editingImage} 
          onClose={() => setEditingImage(null)} 
          T={T} 
          onSave={(editedUrl) => {
            dispatch({ type: "UPDATE_GENERATED_IMAGE", index: editingImage.index, url: editedUrl });
            setEditingImage(null);
          }}
        />
      )}
    </div>
  );
}

export function ImageEditorModal({ img, onClose, onSave, T }: any) {
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:3" | "16:9" | "9:16">("1:1");
  const [zoom, setZoom] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>("none");
  const [outputSize, setOutputSize] = useState<number>(512);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const getFilterValue = (f: string) => {
    switch (f) {
      case "grayscale": return "grayscale(100%)";
      case "sepia": return "sepia(90%)";
      case "invert": return "invert(100%)";
      case "blur": return "blur(3px)";
      case "vintage": return "contrast(115%) sepia(30%) hue-rotate(-15deg)";
      case "cool": return "saturate(85%) hue-rotate(15deg) brightness(105%)";
      case "contrast": return "contrast(140%) saturate(130%)";
      case "warm": return "sepia(30%) saturate(120%) brightness(102%)";
      default: return "none";
    }
  };

  const FILTERS = [
    { id: "none", name: "原圖" },
    { id: "grayscale", name: "時尚黑白" },
    { id: "sepia", name: "懷舊金黃" },
    { id: "vintage", name: "復古底片" },
    { id: "warm", name: "暖意日光" },
    { id: "cool", name: "冷冽科技" },
    { id: "contrast", name: "鮮豔強烈" },
    { id: "blur", name: "磨砂景深" },
  ];

  useEffect(() => {
    if (!imageLoaded || !imgRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let baseWidth = outputSize;
    let baseHeight = outputSize;
    if (aspectRatio === "4:3") {
      baseHeight = Math.round(outputSize * 3 / 4);
    } else if (aspectRatio === "16:9") {
      baseHeight = Math.round(outputSize * 9 / 16);
    } else if (aspectRatio === "9:16") {
      baseWidth = Math.round(outputSize * 9 / 16);
      baseHeight = outputSize;
    }

    canvas.width = baseWidth;
    canvas.height = baseHeight;
    ctx.clearRect(0, 0, baseWidth, baseHeight);

    ctx.filter = getFilterValue(selectedFilter);

    const imgAspect = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
    const canvasAspect = baseWidth / baseHeight;
    let renderWidth = baseWidth;
    let renderHeight = baseHeight;
    if (imgAspect > canvasAspect) {
      renderWidth = baseHeight * imgAspect;
    } else {
      renderHeight = baseWidth / imgAspect;
    }

    const finalWidth = renderWidth * zoom;
    const finalHeight = renderHeight * zoom;

    const x = (baseWidth - finalWidth) / 2 + offsetX;
    const y = (baseHeight - finalHeight) / 2 + offsetY;

    ctx.drawImage(imgRef.current, x, y, finalWidth, finalHeight);
  }, [imageLoaded, aspectRatio, zoom, offsetX, offsetY, selectedFilter, outputSize, img.url]);

  const handleReset = () => {
    setAspectRatio("1:1");
    setZoom(1.0);
    setOffsetX(0);
    setOffsetY(0);
    setSelectedFilter("none");
    setOutputSize(512);
  };

  const handleSave = () => {
    setErrorMsg(null);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    } catch (e) {
      console.error(e);
      setErrorMsg("系統安全性限制：由於跨來源安全性限制，無法儲存。您可以下載原圖或取得公開連結分享。");
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!imageLoaded) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = { x: offsetX, y: offsetY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    setOffsetX(dragStartOffset.current.x + dx);
    setOffsetY(dragStartOffset.current.y + dy);
  };

  const onMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 660, padding: 22, boxShadow: "0 15px 35px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflowY: "auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
            <span>✂️</span> AI 品牌設計圖片編輯器 (Crop & Filters)
          </span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: T.textGhost }}>×</button>
        </div>

        {errorMsg && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#991B1B", lineHeight: 1.5 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "center" }}>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0a09", borderRadius: 14, border: "1px solid #2e2a24", padding: 16, position: "relative" }}>
            
            <div 
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUpOrLeave}
              onMouseLeave={onMouseUpOrLeave}
              style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", cursor: "move", userSelect: "none" }}
            >
              <canvas 
                ref={canvasRef} 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "260px", 
                  borderRadius: 8, 
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  objectFit: "contain",
                  background: "#1c1917"
                }} 
              />
            </div>

            <div style={{ display: "flex", gap: 6, fontSize: 10, color: "#a8a29e", marginTop: 10, alignItems: "center" }}>
              <span>👆 直接在圖片上「拖曳」進行構圖微調</span>
            </div>

            <img 
              ref={imgRef}
              src={img.url}
              alt="Source"
              style={{ display: "none" }}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onLoad={() => {
                setImageLoaded(true);
                setErrorMsg(null);
              }}
              onError={() => {
                setErrorMsg("加載原始圖片失敗。這可能是因為跨網域安全性 (CORS) 限制，但您可以直接下載或分享原始圖片。");
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 380, paddingRight: 4 }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>📐 裁剪比例 (Aspect Ratio)</span>
              <div style={{ display: "flex", gap: 6 }}>
                {(["1:1", "4:3", "16:9", "9:16"] as const).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => {
                      setAspectRatio(ratio);
                      setOffsetX(0);
                      setOffsetY(0);
                    }}
                    style={{
                      flex: 1,
                      padding: "6px 4px",
                      borderRadius: 8,
                      border: `1px solid ${aspectRatio === ratio ? T.gold : T.border}`,
                      background: aspectRatio === ratio ? "#FFFDF9" : "#fff",
                      color: aspectRatio === ratio ? T.goldDark : T.textMid,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    {ratio === "1:1" ? "1:1 正方" : ratio === "4:3" ? "4:3 標準" : ratio === "16:9" ? "16:9 橫幅" : "9:16 直幅"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#FAFBFD", padding: 10, borderRadius: 10, border: `1px solid ${T.borderLight}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>⚙️ 尺寸倍率與偏移微調</span>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textGhost }}>
                  <span>放大倍率 (Zoom Scale)</span>
                  <span style={{ fontWeight: 600, color: T.text }}>{Math.round(zoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05" 
                  value={zoom} 
                  onChange={e => {
                    setZoom(parseFloat(e.target.value));
                  }} 
                  style={{ width: "100%", accentColor: T.gold }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textGhost }}>
                  <span>水平對齊 (X Offset)</span>
                  <span style={{ fontWeight: 600, color: T.text }}>{offsetX}px</span>
                </div>
                <input 
                  type="range" 
                  min="-200" 
                  max="200" 
                  step="1" 
                  value={offsetX} 
                  onChange={e => setOffsetX(parseInt(e.target.value))} 
                  style={{ width: "100%", accentColor: T.gold }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textGhost }}>
                  <span>垂直對齊 (Y Offset)</span>
                  <span style={{ fontWeight: 600, color: T.text }}>{offsetY}px</span>
                </div>
                <input 
                  type="range" 
                  min="-200" 
                  max="200" 
                  step="1" 
                  value={offsetY} 
                  onChange={e => setOffsetY(parseInt(e.target.value))} 
                  style={{ width: "100%", accentColor: T.gold }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>🎨 濾鏡藝術效果 (Filters)</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFilter(f.id)}
                    style={{
                      padding: "6px 2px",
                      borderRadius: 8,
                      border: `1px solid ${selectedFilter === f.id ? T.gold : T.border}`,
                      background: selectedFilter === f.id ? "#FFFDF9" : "#fff",
                      color: selectedFilter === f.id ? T.goldDark : T.textGhost,
                      fontSize: 10,
                      fontWeight: 505,
                      cursor: "pointer",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "all 0.15s"
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>💾 輸出解析度設定 (Resolution)</span>
              <div style={{ display: "flex", gap: 6 }}>
                {([256, 512, 1024] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setOutputSize(size)}
                    style={{
                      flex: 1,
                      padding: "6px 4px",
                      borderRadius: 8,
                      border: `1px solid ${outputSize === size ? T.gold : T.border}`,
                      background: outputSize === size ? "#FFFDF9" : "#fff",
                      color: outputSize === size ? T.goldDark : T.textMid,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    {size === 256 ? "256px 精簡" : size === 512 ? "512px 標準" : "1024px 高清"}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.borderLight}`, paddingTop: 14, justifyContent: "flex-end" }}>
          <button 
            onClick={handleReset}
            style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", color: T.textMid, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            重設
          </button>
          <button 
            onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${T.borderLight}`, background: "#F5F5F4", color: T.textGhost, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={!imageLoaded}
            style={{ 
              padding: "8px 24px", 
              borderRadius: 10, 
              border: "none", 
              background: imageLoaded ? T.gold : T.borderLight, 
              color: "#fff", 
              fontSize: 11, 
              fontWeight: 700, 
              cursor: imageLoaded ? "pointer" : "not-allowed" 
            }}
          >
            套用修改，儲存!
          </button>
        </div>

      </div>
    </div>
  );
}

export function JournalView({ state, dispatch, send, isMobile }: any) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [mood, setMood] = useState("happy");
  const [search, setSearch] = useState("");

  const MOODS = [["happy", "😊 開心"], ["excited", "✨ 充滿動力"], ["calm", "😌 平靜"], ["tired", "😴 擺爛"], ["anxious", "😟 焦慮"], ["frustrated", "😤 挫折"]];
  const msgs = state.messages[state.journalTid] || [];
  const botRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (state.journalTab === "daily") {
      botRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }
  }, [msgs.length, state.streaming, state.journalTab]);

  const FORM_MOODS = [
    ["happy", "😊 Happy"],
    ["excited", "✨ Power"],
    ["calm", "😌 Calm"],
    ["tired", "😴 Layoff"]
  ];

  const getMoodConfig = (m: string) => {
    switch (m) {
      case "happy":
        return { label: "😊 Happy", color: "#C68B7F", bg: "#FAF3F0", border: "#E2C3BC" };
      case "excited":
        return { label: "✨ Power", color: "#8FA89B", bg: "#F4F7F5", border: "#D2DDD7" };
      case "calm":
        return { label: "😌 Calm", color: "#A898BC", bg: "#F6F4F8", border: "#DECFE6" };
      case "tired":
        return { label: "😴 Layoff", color: "#C3B5B2", bg: "#FAF7F6", border: "#E6DEDC" };
      default:
        return { label: "📝 心情日記", color: T.gold, bg: "#fff", border: T.borderLight };
    }
  };

  const handleSave = () => {
    if (!title.trim() || !summary.trim()) return;
    dispatch({
      type: "ADD_REFLECTION",
      mood,
      title: title.trim(),
      summary: summary.trim(),
      date: new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }).replaceAll("/", ".")
    });
    setTitle("");
    setSummary("");
    setMood("happy");
  };

  if (state.journalTab === "reflect") {
    const reflections = state.reflections || [];
    const moodCounts = reflections.reduce((acc: Record<string, number>, r: any) => {
      acc[r.mood] = (acc[r.mood] || 0) + 1;
      return acc;
    }, {});

    const filteredReflections = reflections.filter((r: any) => {
      const kw = search.trim().toLowerCase();
      if (!kw) return true;
      return (
        (r.title || "").toLowerCase().includes(kw) ||
        (r.summary || "").toLowerCase().includes(kw)
      );
    });

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.bg }}>
        {/* Scrollable Dashboard */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 14px" : "20px 24px", display: "flex", flexDirection: "column", gap: 16, scrollbarWidth: "thin" as any }}>
          
          {/* A. 頂部奢華數據與金句卡 (Morandi Color Card) */}
          <div style={{
            background: "linear-gradient(135deg, #FFFDFB 0%, #F9F6F0 100%)",
            borderRadius: 16,
            border: `1px solid ${T.goldBorder}`,
            padding: "16px 20px",
            boxShadow: "0 4px 15px rgba(198, 139, 127, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: T.goldDark,
                background: T.goldLight,
                padding: "4px 12px",
                borderRadius: 20,
                border: `0.5px solid ${T.goldBorder}`
              }}>
                🔥 已連續反思 {reflections.length} 天
              </span>
              <span style={{ fontSize: 10, color: T.textGhost, fontWeight: 500 }}>
                MUSE DIARY · 奢華心靈儀表板
              </span>
            </div>

            {/* Mood statistics distribution */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textMid }}>能量狀態分佈：</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FORM_MOODS.map(([k, label]) => {
                  const count = moodCounts[k] || 0;
                  const cfg = getMoodConfig(k);
                  return (
                    <div
                      key={k}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 600,
                        background: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <span>{label}</span>
                      <span style={{
                        background: cfg.color,
                        color: "#fff",
                        borderRadius: "50%",
                        width: 14,
                        height: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9
                      }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Soul Quote */}
            <div style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: `0.5px solid ${T.borderLight}`,
              textAlign: "center"
            }}>
              <p style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 13,
                color: T.textMid,
                lineHeight: 1.6,
                margin: 0
              }}>
                「在寧靜中沉澱，方能見生命最本真的光芒。」✦
              </p>
            </div>
          </div>

          {/* B. 「✍️ 撰寫今日反思」高質感卡片表單 */}
          <div style={{
            background: "#fff",
            borderRadius: 16,
            border: `1.5px solid ${T.borderLight}`,
            padding: "16px 20px",
            boxShadow: "0 2px 10px rgba(62, 53, 50, 0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
              <span>✍️ 撰寫今日反思</span>
            </div>

            {/* Mood selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.textMid }}>選擇今日能量心情：</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FORM_MOODS.map(([k, label]) => {
                  const active = mood === k;
                  const cfg = getMoodConfig(k);
                  return (
                    <button
                      key={k}
                      onClick={() => setMood(k)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        border: `1.5px solid ${active ? cfg.color : T.borderLight}`,
                        background: active ? cfg.bg : "#fff",
                        color: active ? cfg.color : T.textMid,
                        boxShadow: active ? `0 2px 8px rgba(0,0,0,0.03)` : "none",
                        transform: active ? "scale(1.02)" : "scale(1)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title field */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.textMid }}>日記標題：</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="輸入今日主題..."
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: T.bgInput,
                  fontSize: 12,
                  color: T.text,
                  outline: "none",
                  transition: "all 0.15s",
                  fontFamily: "inherit"
                }}
              />
            </div>

            {/* Content field */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.textMid }}>深度反思與成長點滴：</label>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="在靜謐中，細細品味並記下今天的點滴感悟與成長..."
                rows={4}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: T.bgInput,
                  fontSize: 12,
                  color: T.text,
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.5,
                  transition: "all 0.15s",
                  fontFamily: "inherit"
                }}
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!title.trim() || !summary.trim()}
              style={{
                marginTop: 4,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: (!title.trim() || !summary.trim()) ? T.borderLight : `linear-gradient(135deg, ${T.gold} 0%, ${T.goldDark} 100%)`,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: (!title.trim() || !summary.trim()) ? "not-allowed" : "pointer",
                boxShadow: (!title.trim() || !summary.trim()) ? "none" : "0 4px 10px rgba(198, 139, 127, 0.2)",
                transition: "all 0.2s ease"
              }}
            >
              儲存今日反思 ✦
            </button>
          </div>

          {/* C. 歷史反思瀑布流 (Timeline Waterfall) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>📜 歷史反思紀錄</span>
              
              {/* Search input with 🔍 icon */}
              <div style={{
                position: "relative",
                display: "flex",
                alignItems: "center"
              }}>
                <span style={{ position: "absolute", left: 10, fontSize: 11, color: T.textGhost }}>🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜尋歷史感悟..."
                  style={{
                    padding: "6px 10px 6px 26px",
                    borderRadius: 20,
                    border: `1px solid ${T.border}`,
                    background: "#fff",
                    fontSize: 11,
                    color: T.text,
                    outline: "none",
                    width: isMobile ? 130 : 180,
                    transition: "all 0.15s",
                    fontFamily: "inherit"
                  }}
                />
              </div>
            </div>

            {/* Waterfall List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredReflections.length === 0 ? (
                <div style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  background: "#fff",
                  borderRadius: 14,
                  border: `1px dashed ${T.border}`
                }}>
                  <p style={{ fontSize: 12, color: T.textGhost, margin: 0 }}>
                    {search.trim() ? "未找到符合的歷史反思項目 ✦" : "暫無反思記錄，寫下今日的第一筆感觸吧... ✦"}
                  </p>
                </div>
              ) : (
                filteredReflections.map((r: any) => {
                  const cfg = getMoodConfig(r.mood);
                  return (
                    <div
                      key={r.id}
                      style={{
                        background: "#fff",
                        borderRadius: 14,
                        border: `1.5px solid ${T.borderLight}`,
                        borderLeft: `5px solid ${cfg.color}`,
                        padding: "14px 16px",
                        boxShadow: "0 2px 6px rgba(62,53,50,0.01)",
                        position: "relative",
                        transition: "all 0.18s ease-in-out"
                      }}
                    >
                      {/* Delete Button */}
                      <button
                        onClick={() => dispatch({ type: "DELETE_REFLECTION", id: r.id })}
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: "none",
                          border: "none",
                          color: T.textGhost,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = T.danger; e.currentTarget.style.background = "#FAF2F1"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = T.textGhost; e.currentTarget.style.background = "none"; }}
                      >
                        ✕
                      </button>

                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: cfg.color,
                          background: cfg.bg,
                          padding: "2px 8px",
                          borderRadius: 12,
                          border: `0.5px solid ${cfg.border}`
                        }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 10, color: T.textDim, fontWeight: 500 }}>
                          📅 {r.date}
                        </span>
                      </div>

                      {/* Title */}
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.text,
                        marginBottom: 6,
                        paddingRight: 24
                      }}>
                        {r.title}
                      </div>

                      {/* Summary */}
                      <div style={{
                        fontSize: 12,
                        color: T.textMid,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                      }}>
                        {r.summary}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 12px", borderBottom: "0.5px solid " + T.border, background: "transparent", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#534AB7", marginBottom: 8, paddingLeft: 4 }}>今天心情如何？</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 4 }}>{MOODS.map(([k, l]) => { const on = state.todayMood === k; return (<div key={k} onClick={() => dispatch({ type: "SET_MOOD", mood: k })} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", background: on ? "#7F77DD" : "#fff", color: on ? "#fff" : T.textMid, border: `0.5px solid ${on ? "#7F77DD" : T.border}`, transition: "all .15s", boxShadow: on ? "0 2px 4px rgba(127,119,221,0.2)" : "none" }}>{l}</div>); })}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 16, scrollbarWidth: "thin" as any }}>
        {msgs.map((msg: any, i: number) => {
          if (msg.role === "user") return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "row-reverse", gap: 8, alignSelf: "flex-end", maxWidth: "80%" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.text, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, flexShrink: 0 } as any}>YC</div>
              <div style={{ background: T.text, color: "#fff", borderRadius: "14px 4px 14px 14px", padding: "9px 13px", fontSize: 13, lineHeight: 1.6 }}>{msg.content}</div>
            </div>
          );
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "90%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: "#EEEDFE", border: "0.5px solid #7F77DD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#534AB7", fontWeight: 600, flexShrink: 0 } as any}>M</div><span style={{ fontSize: 11, color: T.textDim, fontWeight: 500 }}>Journal · 反思夥伴</span></div>
              <div style={{ background: "transparent", border: "0.5px solid " + T.border, borderLeft: "2.5px solid #7F77DD", borderRadius: "0 12px 12px 12px", padding: "12px 16px", backgroundImage: "linear-gradient(to right, #FBFDFF, #fff)" }}>{msg.content ? <Md text={msg.content} /> : <SkeletonLoader type="text" />}</div>
            </div>
          );
        })}
        <div ref={botRef} />
      </div>
      <div style={{ padding: "8px 14px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `0.5px solid ${T.borderLight}`, borderRadius: 10, padding: "0 7px 0 14px", height: 44 }}>
          <span style={{ fontSize: 13, color: T.textGhost }}>✦</span>
          <input value={state.input} onChange={e => dispatch({ type: "SET_INPUT", text: e.target.value })} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(state.input, state.mode, state.journalTid); } }} disabled={state.streaming} placeholder="寫下你的想法..." style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: T.text, fontFamily: "inherit" }} />
          <button onClick={() => send(state.input, state.mode, state.journalTid)} disabled={state.streaming || !state.input.trim()} style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: state.streaming || !state.input.trim() ? T.borderLight : T.gold, color: "#fff", cursor: state.streaming || !state.input.trim() ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );
}

export function MarketView({ state, dispatch, send, isMobile }: any) {
  const msgs = state.messages[state.marketTid] || [];
  const botRef = useRef<HTMLDivElement>(null);
  const [activeSubTab, setActiveSubTab] = useState<"templates" | "preview">("templates");
  const [activeCat, setActiveCat] = useState("全部");

  const [userTemplates, setUserTemplates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("muse_user_templates");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customCat, setCustomCat] = useState("Studio");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [customPrompt, setCustomPrompt] = useState("");
  const [customTags, setCustomTags] = useState("");
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, state.streaming]);

  const CATS = ["全部", "Studio", "Journal", "溝通", "生活"];
  const CAT_COLORS: Record<string, string> = { Studio: "#D4537E", Journal: "#7F77DD", 溝通: "#C5A059", 生活: "#1D9E75" };

  const handleSelectTemplate = (t: any) => {
    setSelectedTemplate(t);
    setCustomTitle(`${t.title} (自訂)`);
    setCustomCat(t.cat);
    setCustomPrompt(t.preview);
    setCustomTags(t.tags.join(", "));
    
    // Detect variables in curly braces
    const placeholderRegex = /\{([^}]+)\}/g;
    const matches = [...t.preview.matchAll(placeholderRegex)].map(m => m[1]);
    const initVals: Record<string, string> = {};
    matches.forEach(m => {
      initVals[m] = "";
    });
    setVariableValues(initVals);
    setShowSaveSuccess(false);
  };

  const getRenderedPrompt = () => {
    let text = selectedTemplate ? selectedTemplate.preview : "";
    Object.entries(variableValues).forEach(([placeholder, value]) => {
      if (value.trim()) {
        text = text.replaceAll(`{${placeholder}}`, value);
      }
    });
    return text;
  };

  const handleSaveCustomTemplate = () => {
    if (!selectedTemplate) return;
    
    const newId = "ut_" + Date.now();
    const finalPrompt = getRenderedPrompt();
    const tagsArr = customTags.split(",").map(tg => tg.trim()).filter(Boolean);
    
    const newTemp = {
      id: newId,
      title: customTitle || `${selectedTemplate.title} (自訂)`,
      cat: customCat,
      author: "@You (owner)",
      likes: 0,
      uses: 1,
      preview: finalPrompt,
      tags: tagsArr.length > 0 ? tagsArr : selectedTemplate.tags,
      isUserCreated: true,
      originalTemplateId: selectedTemplate.id
    };
    
    const updated = [newTemp, ...userTemplates];
    setUserTemplates(updated);
    try {
      localStorage.setItem("muse_user_templates", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    
    // Auto store/star it in user collection
    analytics.track("engagement", "儲存自訂商品模版", newTemp.title);
    dispatch({ type: "TOGGLE_SAVE_TEMPLATE", id: newId });
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
      setSelectedTemplate(null);
    }, 1200);
  };

  const allTemplates = [...MARKET_TEMPLATES, ...userTemplates];

  const filteredTemplates = allTemplates.filter(t => {
    // 1. Category Filter
    if (activeCat !== "全部" && t.cat !== activeCat) return false;
    // 2. Tab Filter
    if (state.marketTab === "saved") {
      if (!state.savedTemplates.includes(t.id)) return false;
    } else if (state.marketTab === "mine") {
      if (t.author !== "@zara.design" && t.isUserCreated !== true) return false;
    }
    // 3. Search Filter
    if (state.marketSearch.trim()) {
      const kw = state.marketSearch.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(kw);
      const matchPreview = t.preview.toLowerCase().includes(kw);
      const matchTags = t.tags.some(tg => tg.toLowerCase().includes(kw));
      if (!matchTitle && !matchPreview && !matchTags) return false;
    }
    return true;
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ borderBottom: `0.5px solid ${T.border}`, background: T.bgCard, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px" }}>
        <div style={{ display: "flex" }}>
          {[["browse", "🛒 探索"], ["saved", "⭐ 已收藏"], ["mine", "✦ 我的模板"]].map(([k, l]) => (
            <div key={k} onClick={() => dispatch({ type: "SET_MARKET_TAB", tab: k })} style={{ padding: "10px 14px", fontSize: 12, fontWeight: state.marketTab === k ? 600 : 400, cursor: "pointer", color: state.marketTab === k ? T.text : T.textGhost, borderBottom: state.marketTab === k ? `2.5px solid ${T.gold}` : "2.5px solid transparent", whiteSpace: "nowrap" } as any}>{l}</div>
          ))}
        </div>
        <div style={{ background: "#F4F2EE", borderRadius: 20, display: "flex", alignItems: "center", padding: "4px 12px", border: `0.5px solid ${T.borderLight}` }}>
           <span style={{ fontSize: 11, color: T.textGhost, marginRight: 6 }}>🔍</span>
           <input value={state.marketSearch} onChange={e => dispatch({ type: "SET_MARKET_SEARCH", v: e.target.value })} placeholder="搜尋模板..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 11, width: isMobile ? 60 : 100, color: T.textMid }} />
        </div>
      </div>

      {isMobile && (
        <div style={{ display: "flex", borderBottom: `0.5px solid ${T.borderLight}`, background: "#fff", flexShrink: 0 }}>
          <div onClick={() => setActiveSubTab("templates")} style={{ flex: 1, padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: activeSubTab === "templates" ? 600 : 400, color: activeSubTab === "templates" ? T.goldDark : T.textGhost, borderBottom: activeSubTab === "templates" ? `2.5px solid ${T.gold}` : "none", cursor: "pointer" }}>🎪 範本選項</div>
          <div onClick={() => setActiveSubTab("preview")} style={{ flex: 1, padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: activeSubTab === "preview" ? 600 : 400, color: activeSubTab === "preview" ? T.goldDark : T.textGhost, borderBottom: activeSubTab === "preview" ? `2.5px solid ${T.gold}` : "none", cursor: "pointer" }}>👁️ 範本預覽</div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sub Categories Sidebar - Hidden on mobile */}
        {!isMobile && (
          <div style={{ width: 130, borderRight: `0.5px solid ${T.border}`, background: "transparent", display: "flex", flexDirection: "column", gap: 1, padding: "12px 6px", flexShrink: 0 }}>
            {CATS.map(c => {
               const on = activeCat === c;
               return (
                 <div key={c} onClick={() => setActiveCat(c)} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 11, color: on ? T.text : T.textDim, cursor: "pointer", background: on ? "#EFECE5" : "transparent", fontWeight: on ? 600 : 400 }}>{c}</div>
               );
            })}
          </div>
        )}

        {/* Template List */}
        {(!isMobile || activeSubTab === "templates") && (
          <div style={{ flex: isMobile ? 1 : 1.2, borderRight: isMobile ? "none" : `0.5px solid ${T.border}`, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, background: "transparent" }}>
            {isMobile && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" as any, flexShrink: 0 }}>
                {CATS.map(c => {
                  const on = activeCat === c;
                  return (
                    <span key={c} onClick={() => setActiveCat(c)} style={{ display: "inline-block", padding: "4px 10px", borderRadius: 12, background: on ? "#EFECE5" : "transparent", color: T.textMid, fontSize: 10, border: `0.5px solid ${on ? T.gold : T.border}`, whiteSpace: "nowrap", cursor: "pointer" }}>{c}</span>
                  );
                })}
              </div>
            )}
            {filteredTemplates.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: T.textGhost, fontSize: 12, gap: 8 }}>
                <span>📁 尚無符合篩選條件的範本</span>
                <span style={{ fontSize: 10 }}>您可以嘗試切換分類或搜尋其他關鍵字</span>
              </div>
            ) : (
              filteredTemplates.map(t => {
                const isSelected = selectedTemplate?.id === t.id;
                return (
                  <div key={t.id} onClick={() => { handleSelectTemplate(t); if (isMobile) setActiveSubTab("preview"); }} style={{ background: isSelected ? "#FAF8F5" : T.bgCard, border: isSelected ? `1px solid ${T.gold}` : `0.5px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t.title}</div>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: CAT_COLORS[t.cat] + "15", color: CAT_COLORS[t.cat], border: `0.5px solid ${CAT_COLORS[t.cat]}33`, fontWeight: 600 }}>{t.cat}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textGhost, marginBottom: 8 }}>{t.author} · {t.uses.toLocaleString()} 次使用</div>
                    <div style={{ color: T.textMid, whiteSpace: "pre-wrap", background: "#FAFBFD", padding: "8px 10px", borderRadius: 8, marginBottom: 8, border: `0.5px dashed ${T.border}`, fontSize: 11 }}>
                      {t.preview}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {t.tags.map(tg => <span key={tg} style={{ fontSize: 9, color: T.textDim, background: "#F4F2EE", padding: "2px 6px", borderRadius: 4 }}>#{tg}</span>)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.textGhost, borderTop: `0.5px solid ${T.borderLight}`, paddingTop: 8, marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: "TOGGLE_SAVE_TEMPLATE", id: t.id }); }} 
                          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 6, transition: "background .15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#F4F2EE"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <span style={{ color: state.savedTemplates.includes(t.id) ? T.gold : T.textGhost }}>
                            {state.savedTemplates.includes(t.id) ? "★" : "☆"}
                          </span>
                          <span style={{ fontSize: 10, color: T.textGhost }}>
                            {state.savedTemplates.includes(t.id) ? "已收藏" : "加入收藏"}
                          </span>
                        </button>

                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSelectTemplate(t); if (isMobile) setActiveSubTab("preview"); }} 
                          style={{ border: `0.5px solid ${T.border}`, background: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 6, color: T.textMid, transition: "background .15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#FAF8F6"}
                          onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                        >
                          <span>✏️ 自訂與預覽</span>
                        </button>
                      </div>
                      <span>⭐ {t.likes}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Right Column: Template Preview & Design Console */}
        {(!isMobile || activeSubTab === "preview") && (
          <div style={{ flex: isMobile ? 1 : 1.5, display: "flex", flexDirection: "column", overflow: "hidden", background: "#FAF9F5", padding: isMobile ? "12px" : "20px" }}>
            {!selectedTemplate ? (
              /* Empty State */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.textGhost, gap: 12, border: `1px dashed ${T.border}`, borderRadius: 16, background: "#fff", padding: 24 }}>
                <span style={{ fontSize: 40 }}>🎪</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.textMid }}>大師級範本設計工坊</span>
                <span style={{ fontSize: 11.5, color: T.textGhost, textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
                  請在左側瀏覽並選擇一個設計範本。您可以在此進行動態參數填充、即時預覽成效，並一鍵套用至 AI 智慧對話！
                </span>
              </div>
            ) : (
              /* Active State - Customization & Preview Panel */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 16, padding: "20px 24px", gap: 16, boxShadow: "0 4px 20px rgba(138, 110, 62, 0.05)" }}>
                
                {/* Template Header Info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `0.5px solid ${T.borderLight}`, paddingBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>✨</span> {selectedTemplate.title}
                    </div>
                    <div style={{ fontSize: 11, color: T.textGhost, marginTop: 4 }}>
                      創作者：{selectedTemplate.author} · 使用次數：{selectedTemplate.uses.toLocaleString()} 次
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: CAT_COLORS[selectedTemplate.cat] + "15", color: CAT_COLORS[selectedTemplate.cat], border: `0.5px solid ${CAT_COLORS[selectedTemplate.cat]}33`, fontWeight: 600 }}>
                    {selectedTemplate.cat}
                  </span>
                </div>

                {/* Dynamic Variables Filler (if variables exist) */}
                {Object.keys(variableValues).length > 0 && (
                  <div style={{ background: "#FAF9F6", borderRadius: 12, padding: "14px 16px", border: `0.5px solid ${T.borderLight}`, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: T.goldDark, display: "flex", alignItems: "center", gap: 5 }}>
                      <span>🛠️</span> 參數填充與動態調整
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Object.keys(variableValues).map(vkey => (
                        <div key={vkey} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: T.textMid }}>{vkey}</span>
                          <input 
                            value={variableValues[vkey]} 
                            onChange={e => setVariableValues({ ...variableValues, [vkey]: e.target.value })} 
                            placeholder={`請輸入${vkey}...`}
                            style={{ width: "100%", border: `1px solid ${T.borderLight}`, borderRadius: 8, padding: "6px 10px", fontSize: 11.5, outline: "none", color: T.text, background: "#fff" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Real-Time Rendered Prompt Preview */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>即時範本渲染預覽</label>
                  <div style={{ width: "100%", border: `1px dashed ${T.gold}`, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: T.textMid, background: "#FCFAF6", minHeight: 80, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {getRenderedPrompt()}
                  </div>
                </div>

                {/* Save/Customization Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `0.5px solid ${T.borderLight}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textGhost }}>💾 儲存為我的自訂範本（選填）</div>
                  
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: T.textMid, display: "block", marginBottom: 3 }}>範本別名</label>
                      <input 
                        value={customTitle} 
                        onChange={e => setCustomTitle(e.target.value)} 
                        placeholder="例如：自訂行銷範本"
                        style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 11, outline: "none", color: T.text }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: T.textMid, display: "block", marginBottom: 3 }}>保存分類</label>
                      <select 
                        value={customCat} 
                        onChange={e => setCustomCat(e.target.value)} 
                        style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 6px", fontSize: 11, outline: "none", color: T.text, background: "#fff" }}
                      >
                        {["Studio", "Journal", "溝通", "生活"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 10, color: T.textMid, display: "block", marginBottom: 3 }}>標籤組 (以半角逗號隔開)</label>
                    <input 
                      value={customTags} 
                      onChange={e => setCustomTags(e.target.value)} 
                      placeholder="品牌, 社群, 廣告"
                      style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 11, outline: "none", color: T.text }}
                    />
                  </div>
                </div>

                {/* Premium Action Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", paddingTop: 12 }}>
                  
                  {showSaveSuccess ? (
                    <div style={{ background: "#FAFBFD", border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "8px 12px", textAlign: "center", color: T.goldDark, fontSize: 11.5, fontWeight: 700 }}>
                      🎉 成功儲存並收藏此範本！
                    </div>
                  ) : (
                    <button 
                      onClick={handleSaveCustomTemplate} 
                      style={{ 
                        width: "100%", 
                        padding: "8px 0", 
                        borderRadius: 10, 
                        border: `0.5px solid ${T.border}`, 
                        background: "#fff", 
                        color: T.textMid, 
                        fontSize: 11.5, 
                        fontWeight: 600, 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: 5,
                        transition: "background 0.2s" 
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAF8F6"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                    >
                      <span>💾</span> 儲存自訂範本至「我的模板」
                    </button>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(getRenderedPrompt());
                        alert("✨ 已成功複製渲染後的範本 Prompt 內容！");
                      }} 
                      style={{ 
                        flex: 1, 
                        padding: "10px 0", 
                        borderRadius: 10, 
                        border: `0.5px solid ${T.border}`, 
                        background: "#fff", 
                        color: T.textMid, 
                        fontSize: 12, 
                        fontWeight: 600, 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: 5,
                        transition: "background 0.2s" 
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAF8F6"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                    >
                      <span>📋</span> 複製 Prompt 設定
                    </button>

                    <button 
                      onClick={() => {
                        const newTid = "gt_" + Date.now();
                        const renderedPrompt = getRenderedPrompt();
                        dispatch({ type: "NEW_GEN_THREAD", id: newTid, title: selectedTemplate.title });
                        dispatch({ type: "SET_NAV", view: "chat" });
                        send(renderedPrompt, "spark", newTid);
                        setSelectedTemplate(null);
                      }} 
                      style={{ 
                        flex: 1.5, 
                        padding: "10px 0", 
                        borderRadius: 10, 
                        border: "none", 
                        background: "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)", 
                        color: "#fff", 
                        fontSize: 12, 
                        fontWeight: 700, 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: 5,
                        boxShadow: "0 4px 12px rgba(197, 160, 89, 0.25)",
                        transition: "opacity 0.2s" 
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      <span>✨</span> 一鍵套用至智慧對話
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MemoryView({ state, dispatch, send }: any) {
  const msgs = state.messages[state.memoryTid] || [];
  const botRef = useRef<HTMLDivElement>(null);
  
  const [showAdd, setShowAdd] = useState(false);
  const [addCat, setAddCat] = useState("喜好");
  const [addContent, setAddContent] = useState("");

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, state.streaming]);

  const handleSaveMemory = () => {
    if (!addContent.trim()) return;
    dispatch({ type: "ADD_MEMORY", cat: addCat, content: addContent });
    setAddContent("");
    setShowAdd(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #FAF3F0, #FFFBF9)", borderBottom: `0.5px solid ${T.border}`, padding: "20px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: (state.userProfile.avatar && state.userProfile.avatar.startsWith("data:image/")) ? "transparent" : `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, boxShadow: "0 4px 12px rgba(198,139,127,0.15)", overflow: "hidden" } as any}>
              {(state.userProfile.avatar && state.userProfile.avatar.startsWith("data:image/")) ? (
                <img src={state.userProfile.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                state.userProfile.avatar || "YC"
              )}
            </div>
           <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{state.userProfile.name}</div>
                <Btn onClick={() => dispatch({ type: "SET_NAV", view: "profile" })} style={{ padding: "1px 8px", fontSize: 9, background: "#fff", border: `0.5px solid ${T.border}` }}>✎ 編輯資料</Btn>
              </div>
              <div style={{ fontSize: 12, color: T.textMid, marginTop: 4 }}>{state.userProfile.bio}</div>
              <div style={{ fontSize: 11, color: T.goldDark, marginTop: 2, fontWeight: 500 }}>設定語調：{state.userProfile.tone} · 已儲存 {state.memoryItems.length} 條核心記憶</div>
           </div>
        </div>
      </div>

      <div style={{ borderBottom: `0.5px solid ${T.border}`, padding: "12px 24px", background: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>核心記憶節點 (對話將依此高度客製化)</div>
          <Btn onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 11, padding: "2px 8px", background: showAdd ? "#F4F2EE" : T.goldLight, color: showAdd ? T.textMid : T.goldDark }}>
            {showAdd ? "取消" : "+ 新增記憶"}
          </Btn>
        </div>

        {showAdd && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, background: "#FAF8F6", border: `1px solid ${T.borderLight}`, borderRadius: 10, padding: 10, marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.textMid }}>類別：</span>
            <select value={addCat} onChange={e => setAddCat(e.target.value)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 11, background: "#fff", outline: "none", color: T.text }}>
              {["職業", "目標", "語調", "喜好", "習慣", "品牌", "受眾"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input 
              value={addContent} 
              onChange={e => setAddContent(e.target.value)} 
              placeholder="例如：主要客群為25-35歲想要個人品牌的創意女性..." 
              style={{ flex: 1, minWidth: 150, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 11, outline: "none", color: T.text }} 
              onKeyDown={e => { if (e.key === "Enter") handleSaveMemory(); }}
            />
            <button onClick={handleSaveMemory} style={{ padding: "4px 12px", border: "none", background: T.gold, color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>儲存</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" as any }}>
          {state.memoryItems.map((m: any) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FAF6F5", padding: "6px 12px", borderRadius: 20, border: `0.5px solid ${T.borderLight}`, flexShrink: 0 }}>
               <span style={{ fontSize: 10, color: T.goldDark, fontWeight: 600 }}>{m.cat}</span>
               <span style={{ fontSize: 11, color: T.textMid }}>{m.content}</span>
               <span 
                 onClick={() => dispatch({ type: "DEL_MEMORY", id: m.id })} 
                 style={{ fontSize: 13, color: T.textGhost, cursor: "pointer", display: "inline-flex", padding: "0 2px", fontWeight: "bold" }}
                 onMouseEnter={e => e.currentTarget.style.color = T.danger}
                 onMouseLeave={e => e.currentTarget.style.color = T.textGhost}
                 title="刪除這條記憶"
               >
                 ×
               </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {msgs.map((msg: any) => (
           <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "90%", alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' } as any}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: msg.role === 'user' ? T.text : "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: msg.role === 'user' ? '#fff' : T.goldDark, fontWeight: 600 } as any}>{msg.role === 'user' ? 'YC' : 'M'}</div>
                <span style={{ fontSize: 11, color: T.textDim }}>{msg.role === 'user' ? 'YC' : 'Muse AI · 個性化模式'}</span>
              </div>
              <div style={{ background: msg.role === 'user' ? T.text : "#fff", color: msg.role === 'user' ? "#fff" : T.textMid, borderRadius: msg.role === 'user' ? "14px 4px 14px 14px" : "0 14px 14px 14px", border: msg.role === 'user' ? 'none' : `1px solid ${T.border}`, padding: "12px 16px" }}>
                {msg.content ? <Md text={msg.content} /> : <SkeletonLoader type="text" />}
              </div>
           </div>
        ))}
        <div ref={botRef} />
      </div>

      <div style={{ padding: "8px 14px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `0.5px solid ${T.borderLight}`, borderRadius: 10, padding: "0 7px 0 14px", height: 44 }}>
          <span style={{ fontSize: 13, color: T.textGhost }}>✦</span>
          <input value={state.input} onChange={e => dispatch({ type: "SET_INPUT", text: e.target.value })} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(state.input, state.mode, state.memoryTid); } }} disabled={state.streaming} placeholder="問 AI 關於你自己的任何事..." style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: T.text, fontFamily: "inherit" }} />
          <button onClick={() => send(state.input, state.mode, state.memoryTid)} disabled={state.streaming || !state.input.trim()} style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: state.streaming || !state.input.trim() ? T.borderLight : T.gold, color: "#fff", cursor: state.streaming || !state.input.trim() ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );
}

export function GrowthView({ state, dispatch, send }: any) {
  const msgs = state.messages[state.growthTid] || [];
  const botRef = useRef<HTMLDivElement>(null);
  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, state.streaming]);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: `0.5px solid ${T.border}`, background: "#fff", flexShrink: 0 }}>
        {[{ label: "連續天數", v: "15", c: "#D4537E", ic: "🔥" }, { label: "能量值", v: "85%", c: T.goldDark, ic: "⚡" }, { label: "完成里程碑", v: "12", c: "#1D9E75", ic: "🏆" }, { label: "技能等級", v: "LV.8", c: "#534AB7", ic: "✨" }].map((s) => (
          <div key={s.label} style={{ flex: 1, padding: "14px 10px", textAlign: "center", borderRight: s.label !== "技能等級" ? `0.5px solid ${T.border}` : "none" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.c, marginBottom: 2 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: T.textGhost, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {msgs.map((msg: any) => (
           <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "90%", alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' } as any}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: msg.role === 'user' ? T.text : "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: msg.role === 'user' ? '#fff' : "#534AB7", fontWeight: 600 } as any}>{msg.role === 'user' ? 'YC' : 'M'}</div>
                <span style={{ fontSize: 11, color: T.textDim }}>{msg.role === 'user' ? 'YC' : 'Muse AI · 成長教練'}</span>
              </div>
              <div style={{ background: msg.role === 'user' ? T.text : "#FFFDF8", color: msg.role === 'user' ? "#fff" : T.textMid, borderRadius: msg.role === 'user' ? "14px 4px 14px 14px" : "0 14px 14px 14px", border: msg.role === 'user' ? 'none' : `1px solid ${T.border}`, padding: "12px 16px" }}>
                {msg.content ? <Md text={msg.content} /> : <SkeletonLoader type="text" />}
              </div>
           </div>
        ))}
        <div ref={botRef} />
      </div>
      <div style={{ padding: "8px 14px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, overflowX: "auto", scrollbarWidth: "none" as any }}>
           {["生成週報", "分析強項", "規劃目標", "反思障礙"].map(t => (
             <Btn key={t} onClick={() => send(t, "auto", state.growthTid)} style={{ whiteSpace: "nowrap", flexShrink: 0, background: T.goldLight, color: T.goldDark, border: `0.5px solid ${T.goldBorder}` }}>{t}</Btn>
           ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `0.5px solid ${T.borderLight}`, borderRadius: 10, padding: "0 7px 0 14px", height: 44 }}>
          <span style={{ fontSize: 13, color: T.textGhost }}>✦</span>
          <input value={state.input} onChange={e => dispatch({ type: "SET_INPUT", text: e.target.value })} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(state.input, state.mode, state.growthTid); } }} disabled={state.streaming} placeholder="輸入成長相關問題..." style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: T.text, fontFamily: "inherit" }} />
          <button onClick={() => send(state.input, state.mode, state.growthTid)} disabled={state.streaming || !state.input.trim()} style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: state.streaming || !state.input.trim() ? T.borderLight : T.gold, color: "#fff", cursor: state.streaming || !state.input.trim() ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );
}

export function HabitView({ state, dispatch, send }: any) {
  const msgs = state.messages[state.habitTid] || [];
  const botRef = useRef<HTMLDivElement>(null);
  const isBudget = state.habitMode === "budget";

  // Habit local custom storage
  const [customHabits, setCustomHabits] = useState<any[]>([]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("🌸");

  // Budget local custom ledger
  const [expenses, setExpenses] = useState<any[]>([
    { id: "e1", tag: "☕ 餐飲", desc: "燕麥拿鐵 & 司康", val: 195 },
    { id: "e2", tag: "🩰 運動", desc: "皮拉提斯單堂體驗", val: 800 },
    { id: "e3", tag: "💄 美妝", desc: "莫蘭迪霧面唇彩", val: 580 },
    { id: "e4", tag: "📚 學習", desc: "品牌設計與美學雜誌", val: 420 },
  ]);
  const [budgetLimit] = useState(15000);
  const [showAddExp, setShowAddExp] = useState(false);
  const [newExpDesc, setNewExpDesc] = useState("");
  const [newExpVal, setNewExpVal] = useState("");
  const [newExpTag, setNewExpTag] = useState("☕ 餐飲");

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, state.streaming]);

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.val, 0);
  const maxLimit = budgetLimit;
  const remaining = maxLimit - totalSpent;

  const handleToggleCustomHabit = (id: string) => {
    setCustomHabits(prev => prev.map(h => h.id === id ? { ...h, done: !h.done } : h));
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    const item = {
      id: "ch-" + Date.now(),
      name: newHabitName,
      done: false,
      icon: newHabitIcon,
    };
    analytics.track("habit", "新增自訂健康習慣", `${newHabitIcon} ${newHabitName}`);
    setCustomHabits(prev => [...prev, item]);
    setNewHabitName("");
    setShowAddHabit(false);
  };

  const handleAddExpense = () => {
    const valNum = parseInt(newExpVal, 10);
    if (!newExpDesc.trim() || isNaN(valNum)) return;
    const item = {
      id: "ex-" + Date.now(),
      tag: newExpTag,
      desc: newExpDesc,
      val: valNum,
    };
    analytics.track("habit", "登錄家庭收支明細", `${newExpTag} | ${newExpDesc} | $${valNum}`);
    setExpenses(prev => [item, ...prev]);
    setNewExpDesc("");
    setNewExpVal("");
    setShowAddExp(false);
  };

  const handleRemoveExpense = (id: string) => {
    const target = expenses.find(x => x.id === id);
    if (target) {
      analytics.track("habit", "移除家庭收支明細", `${target.tag} | ${target.desc}`);
    }
    setExpenses(prev => prev.filter(x => x.id !== id));
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ borderBottom: `0.5px solid ${T.border}`, background: "#fff", flexShrink: 0, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", background: "#FAF6F5", padding: 2, borderRadius: 8, width: "fit-content", border: `0.5px solid ${T.borderLight}` }}>
            {[["habit", "🎯 習慣打卡"], ["budget", "💰 理財記帳"]].map(([k, l]) => (
              <div key={k} onClick={() => dispatch({ type: "SET_HABIT_MODE", v: k })} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: state.habitMode === k ? "#fff" : "transparent", color: state.habitMode === k ? T.text : T.textGhost, fontWeight: state.habitMode === k ? 600 : 400, boxShadow: state.habitMode === k ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "all 0.15s" }}>{l}</div>
            ))}
          </div>
          
          <div>
            {isBudget ? (
              <button onClick={() => setShowAddExp(!showAddExp)} style={{ border: "none", background: T.goldLight, color: T.goldDark, padding: "5px 12px", borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                {showAddExp ? "關閉" : "✏️ 記一筆"}
              </button>
            ) : (
              <button onClick={() => setShowAddHabit(!showAddHabit)} style={{ border: "none", background: T.goldLight, color: T.goldDark, padding: "5px 12px", borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                {showAddHabit ? "關閉" : "＋ 新增習慣"}
              </button>
            )}
          </div>
        </div>

        {/* Inline Adders */}
        {showAddHabit && (
          <div style={{ display: "flex", gap: 6, padding: "8px 10px", background: "#FAF8F6", borderRadius: 10, border: `1px solid ${T.borderLight}`, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.textGhost }}>圖示</span>
            <select value={newHabitIcon} onChange={e => setNewHabitIcon(e.target.value)} style={{ padding: "3px 6px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 11, outline: "none", background: "#fff" }}>
              {["🌸", "🧘", "🩰", "💧", "📚", "🍳", "🛀", "🏃", "☕"].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <input 
              value={newHabitName} 
              onChange={e => setNewHabitName(e.target.value)} 
              placeholder="習慣名稱（如：每天冥想 10 分鐘）..." 
              style={{ flex: 1, padding: "4px 8px", fontSize: 11, border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", color: T.text }}
              onKeyDown={e => { if (e.key === "Enter") handleAddHabit(); }}
            />
            <button onClick={handleAddHabit} style={{ padding: "4px 12px", background: T.gold, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>新增</button>
          </div>
        )}

        {showAddExp && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px", background: "#FAF8F6", borderRadius: 10, border: `1px solid ${T.borderLight}`, alignItems: "center" }}>
            <select value={newExpTag} onChange={e => setNewExpTag(e.target.value)} style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 11, outline: "none", background: "#fff" }}>
              {["☕ 餐飲", "🍿 娛樂", "💄 美妝", "🩰 運動", "🛍 生活", "🚌 交通", "📚 學習"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input 
              value={newExpDesc} 
              onChange={e => setNewExpDesc(e.target.value)} 
              placeholder="消費描述（香草鮮奶茶）..." 
              style={{ flex: 1, minWidth: 120, padding: "4px 8px", fontSize: 11, border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", color: T.text }}
            />
            <input 
              value={newExpVal} 
              onChange={e => setNewExpVal(e.target.value)} 
              placeholder="金額 ($)..." 
              type="number"
              style={{ width: 80, padding: "4px 8px", fontSize: 11, border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", color: T.text }}
              onKeyDown={e => { if (e.key === "Enter") handleAddExpense(); }}
            />
            <button onClick={handleAddExpense} style={{ padding: "4px 12px", background: T.gold, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>新增</button>
          </div>
        )}

        {/* Dynamic Display */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" as any }}>
          {isBudget ? (
            <>
              <div style={{ padding: "6px 12px", borderRadius: 12, background: "linear-gradient(135deg, #FAF3F0, #FFFBF9)", border: `0.5px solid ${T.goldBorder}`, fontSize: 11, fontWeight: 600, color: T.goldDark, whiteSpace: "nowrap" }}>
                🎯 本月預算: ${maxLimit.toLocaleString()}
              </div>
              <div style={{ padding: "6px 12px", borderRadius: 12, background: "#FAF6F5", border: `0.5px solid ${T.border}`, fontSize: 11, fontWeight: 500, color: T.textMid, whiteSpace: "nowrap" }}>
                💸 已支出: ${totalSpent.toLocaleString()}
              </div>
              <div style={{ padding: "6px 12px", borderRadius: 12, background: remaining < 1000 ? "#FAF0F0" : "#F0FAF5", border: `0.5px solid ${remaining < 1000 ? T.danger + "40" : T.success + "40"}`, fontSize: 11, fontWeight: 600, color: remaining < 1000 ? T.danger : T.success, whiteSpace: "nowrap" }}>
                ✨ 剩餘預算: ${remaining.toLocaleString()}
              </div>
            </>
          ) : (
            <>
              {/* Built-in Habits */}
              {state.habits.map((h: any) => (
                <div key={h.id} onClick={() => dispatch({ type: "TOGGLE_HABIT", id: h.id })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 12, border: `0.5px solid ${h.done ? T.success : T.border}`, background: h.done ? "#EFF6F3" : "#fff", cursor: "pointer", transition: "all .15s", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: h.done ? "#5A7265" : T.textMid }}>{h.icon} {h.name}</span>
                  {h.done && <span style={{ fontSize: 9, background: T.success, color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</span>}
                </div>
              ))}
              {/* Custom Habits */}
              {customHabits.map((h: any) => (
                <div key={h.id} onClick={() => handleToggleCustomHabit(h.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 12, border: `0.5px solid ${h.done ? T.success : T.border}`, background: h.done ? "#EFF6F3" : "#fff", cursor: "pointer", transition: "all .15s", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: h.done ? "#5A7265" : T.textMid }}>{h.icon} {h.name}</span>
                  {h.done && <span style={{ fontSize: 9, background: T.success, color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</span>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* If budget mode is active, display the transaction ledger ledger visually next to chat */}
        {isBudget && (
          <div style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, borderBottom: `0.5px solid ${T.borderLight}`, paddingBottom: 6 }}>Recent Ledger 記帳本</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 150, overflowY: "auto" }}>
              {expenses.map((x: any) => (
                <div key={x.id} style={{ display: "flex", alignSelf: "stretch", alignItems: "center", justifyContent: "space-between", background: "#FAF8F6", borderRadius: 10, padding: "8px 12px", border: `0.5px solid ${T.borderLight}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, background: "#FAF0ED", color: T.goldDark, padding: "2px 6px", borderRadius: 6, fontWeight: 600 }}>{x.tag}</span>
                    <span style={{ fontSize: 11, color: T.text, fontWeight: 500 }}>{x.desc}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.goldDark }}>${x.val}</span>
                    <button 
                      onClick={() => handleRemoveExpense(x.id)} 
                      style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: T.textGhost }}
                      onMouseEnter={e => e.currentTarget.style.color = T.danger}
                      onMouseLeave={e => e.currentTarget.style.color = T.textGhost}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {msgs.map((msg: any) => (
           <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "90%", alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' } as any}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: msg.role === 'user' ? T.text : "#E6F0EA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: msg.role === 'user' ? '#fff' : "#5A7265", fontWeight: 600 } as any}>{msg.role === 'user' ? 'YC' : 'M'}</div>
                <span style={{ fontSize: 11, color: T.textDim }}>{msg.role === 'user' ? 'YC' : `Muse AI · ${isBudget ? '記帳助理' : '習慣夥伴'}`}</span>
              </div>
              <div style={{ background: msg.role === 'user' ? T.text : "#fff", color: msg.role === 'user' ? "#fff" : T.textMid, borderRadius: msg.role === 'user' ? "14px 4px 14px 14px" : "0 14px 14px 14px", border: msg.role === 'user' ? 'none' : `1px solid ${T.border}`, padding: "12px 16px", fontSize: 13, lineHeight: 1.6 }}>
                {msg.content ? <Md text={msg.content} /> : <SkeletonLoader type="text" />}
              </div>
           </div>
        ))}
        <div ref={botRef} />
      </div>

      <div style={{ padding: "8px 14px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
           {[isBudget ? "分析開支" : "制定計劃", isBudget ? "報告生成" : "調整難度"].map(t => (
             <Btn key={t} onClick={() => send(t, "auto", state.habitTid)} style={{ flex: 1, background: T.goldLight, color: T.goldDark, border: `0.5px solid ${T.goldBorder}` }}>{t}</Btn>
           ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `0.5px solid ${T.borderLight}`, borderRadius: 10, padding: "0 7px 0 14px", height: 44 }}>
          <span style={{ fontSize: 13, color: T.textGhost }}>✦</span>
          <input value={state.input} onChange={e => dispatch({ type: "SET_INPUT", text: e.target.value })} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(state.input, state.mode, state.habitTid); } }} disabled={state.streaming} placeholder={isBudget ? "輸入消費紀錄或請教理財建議，如：早餐吃熱狗 80..." : "紀錄進度或對話..."} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: T.text, fontFamily: "inherit" }} />
          <button onClick={() => send(state.input, state.mode, state.habitTid)} disabled={state.streaming || !state.input.trim()} style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: state.streaming || !state.input.trim() ? T.borderLight : T.gold, color: "#fff", cursor: state.streaming || !state.input.trim() ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );
}

export function CommView({ state, dispatch, send }: any) {
  const [commContext, setCommContext] = useState("");
  const [copiedComm, setCopiedComm] = useState(false);
  const msgs = state.messages[state.commTid] || [];
  const botRef = useRef<HTMLDivElement>(null);

  // Find generated communication copy from AI assistant response
  const lastAssistantMsg = [...msgs].reverse().find(m => m.role === "assistant" && m.content);
  const generatedCommText = lastAssistantMsg ? lastAssistantMsg.content : "";

  const handleGenerateComm = () => {
    if (state.streaming || !commContext.trim()) return;
    const scenarioLabel = COMM_SCENARIOS[state.commScenario || 'work']?.label || "溝通模擬";
    const prompt = `我想針對以下情境生成最佳的溝通模擬方案：【${scenarioLabel}】。\n具體來信或情境內容：\n${commContext.trim()}\n請為我量身打造一篇得體、專業且符合高奢質感的溝通稿件。`;
    send(prompt, "spark", state.commTid);
  };

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, state.streaming]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#FAF9F5" }}>
      {/* Scenario tabs */}
      <div style={{ display: "flex", gap: 6, padding: "8px 16px", borderBottom: `0.5px solid ${T.border}`, overflowX: "auto", scrollbarWidth: "none" as any, flexShrink: 0, background: "#fff" }}>
        {Object.entries(COMM_SCENARIOS).map(([k, v]: any) => {
          const isActive = state.commScenario === k;
          return (
            <div 
              key={k} 
              onClick={() => dispatch({ type: "SET_COMM_SCENARIO", v: k })} 
              style={{ 
                padding: "6px 14px", 
                borderRadius: 20, 
                fontSize: 11, 
                fontWeight: 600, 
                cursor: "pointer", 
                whiteSpace: "nowrap", 
                border: isActive ? "0.5px solid #8A6E3E" : `0.5px solid ${T.border}`, 
                background: isActive ? "linear-gradient(135deg, #C5A059 0%, #B38E46 100%)" : "#fff", 
                color: isActive ? "#fff" : T.textGhost, 
                boxShadow: isActive ? "0 2px 6px rgba(197, 160, 89, 0.15)" : "none",
                transition: "all .15s" 
              }}
            >
              {v.icon} {v.label}
            </div>
          );
        })}
      </div>

      {/* Dual Column Dashboard Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden" }}>
        
        {/* LEFT COLUMN: Controls Form */}
        <div style={{ width: 340, borderRight: `0.5px solid ${T.border}`, background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0, padding: "20px 18px", gap: 16, overflowY: "auto", scrollbarWidth: "none" as any }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 5 }}>
              <span>🎭</span> 角色情境模擬說明
            </div>
            <div style={{ fontSize: 11.5, color: T.textGhost, lineHeight: 1.6, background: "#FAFBFD", padding: 12, borderRadius: 10, border: `0.5px solid ${T.borderLight}` }}>
              {COMM_SCENARIOS[state.commScenario || 'work']?.desc}
            </div>
          </div>

          <div style={{ height: "0.5px", background: T.borderLight }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>來信內文或溝通情境</label>
            <textarea
              value={commContext}
              onChange={(e) => setCommContext(e.target.value)}
              placeholder="請貼上您收到的來信、或描述您目前希望與對方進行對話、簡報溝通的背景..."
              style={{
                width: "100%",
                height: 180,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 12.5,
                color: T.text,
                background: T.bgInput,
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                lineHeight: 1.5
              }}
            />
          </div>

          <button
            onClick={handleGenerateComm}
            disabled={state.streaming || !commContext.trim()}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              background: state.streaming || !commContext.trim() ? T.borderLight : T.gold,
              border: "none",
              fontSize: 12.5,
              fontWeight: 700,
              color: "#fff",
              cursor: state.streaming || !commContext.trim() ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(197, 160, 89, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: "auto",
              transition: "opacity 0.2s"
            }}
            onMouseEnter={e => { if(!state.streaming && commContext.trim()) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={e => { if(!state.streaming && commContext.trim()) e.currentTarget.style.opacity = "1"; }}
          >
            {state.streaming ? "⚡ 正在智能化生成回覆..." : "🎭 立即生成模擬回覆草案"}
          </button>
        </div>

        {/* RIGHT COLUMN: Results Envelope Showcase */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "20px 24px", gap: 20 }}>
          {generatedCommText ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Luxury envelope paper visual container */}
              <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 16, padding: "24px 28px", boxShadow: "0 10px 30px rgba(61,46,26,0.04)", borderLeft: "4px solid #C5A059" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15 }}>✉️</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: T.goldDark, letterSpacing: "0.02em" }}>高奢溝通模擬方案</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCommText);
                      setCopiedComm(true);
                      setTimeout(() => setCopiedComm(false), 2000);
                    }}
                    style={{ border: "none", background: "#FAF7F0", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, color: T.goldDark, cursor: "pointer" }}
                  >
                    {copiedComm ? "已複製 ✓" : "複製溝通稿 📋"}
                  </button>
                </div>
                
                <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7, background: "#FCFAF6", padding: 18, borderRadius: 10, border: `0.5px dashed rgba(197, 160, 89, 0.4)`, fontStyle: "italic", fontFamily: "var(--font-sans)" }}>
                  <Md text={generatedCommText} />
                </div>
              </div>

              {/* Symmetrical Central Chat Bridge for role-playing */}
              <button
                onClick={() => {
                  const bridgeMsg = `這是我在【溝通模擬】中生成的對話/郵件方案：\n\n【溝通情境】：${COMM_SCENARIOS[state.commScenario || 'work']?.label}\n\n【溝通內容】：\n${generatedCommText}\n\n請幫我扮演對方，與我進行一輪模擬的真實角色扮演對答，測試此溝通稿是否能完美達到預期目的。`;
                  send(bridgeMsg, state.mode, state.commTid);
                  dispatch({ type: "SET_NAV", view: "chat" });
                }}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  borderRadius: 10,
                  background: T.gold,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(197, 160, 89, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <span>💬</span> 送至中央智慧對話進行「模擬角色扮演 (Role-Play)」
              </button>
            </div>
          ) : (
            /* Empty initial display panel */
            <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 0" }}>
              <span style={{ fontSize: 44, animation: "bounce 2.5s infinite" }}>🎭</span>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginTop: 14, marginBottom: 6 }}>
                專業級溝通模擬與角色扮演中心
              </div>
              <div style={{ fontSize: 12, color: T.textGhost, maxWidth: 300, textAlign: "center", lineHeight: 1.7 }}>
                在左側選擇溝通角色情境，貼上需要回覆的來信或背景，一鍵為您生成得體的高規格對話模擬！
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export function ProfileView({ state, dispatch, isMobile }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(state.userProfile.name);
  const [bio, setBio] = useState(state.userProfile.bio);
  const [tone, setTone] = useState(state.userProfile.tone);
  const [avatar, setAvatar] = useState(state.userProfile.avatar);
  const [showWelcomeCheck, setShowWelcomeCheck] = useState(() => localStorage.getItem("muse_hide_welcome") !== "true");

  // 當開啟編輯或全站資料更新時，自動同步表單編輯狀態，防止上傳自訂裁剪頭貼後被舊狀態覆蓋
  useEffect(() => {
    setName(state.userProfile.name);
    setBio(state.userProfile.bio);
    setTone(state.userProfile.tone);
    setAvatar(state.userProfile.avatar);
  }, [state.userProfile, isEditing]);

  useEffect(() => {
    const handleWelcomeChanged = () => {
      setShowWelcomeCheck(localStorage.getItem("muse_hide_welcome") !== "true");
    };
    window.addEventListener("muse_welcome_changed", handleWelcomeChanged);
    return () => window.removeEventListener("muse_welcome_changed", handleWelcomeChanged);
  }, []);

  // Error simulation states
  const [triggerCrash, setTriggerCrash] = useState(false);

  // Live analytics state
  const [analyticsEvents, setAnalyticsEvents] = useState(() => analytics.getEvents());
  const [categoryBreakdown, setCategoryBreakdown] = useState(() => analytics.getCategoryBreakdown());
  const [logFilter, setLogFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");

  useEffect(() => {
    const handleAnalyticsUpdate = () => {
      setAnalyticsEvents(analytics.getEvents());
      setCategoryBreakdown(analytics.getCategoryBreakdown());
    };
    window.addEventListener("muse_analytics_updated", handleAnalyticsUpdate);
    return () => window.removeEventListener("muse_analytics_updated", handleAnalyticsUpdate);
  }, []);

  if (triggerCrash) {
    throw new Error("💥 模擬前端崩潰：React 執行時期渲染異常 (ErrorBoundary Fallback Triggered)");
  }

  const stats = [
    {label: "企劃案總數", val: state.projects.length, icon: "📁", color: "#C5A059"},
    { label: "連續天數", val: state.streakCount, icon: "🔥", color: "#D4537E" },
    { label: "總對話數", val: Object.values(state.messages).reduce((acc: number, m: any) => acc + (m.length || 0), 0), icon: "💬", color: "#534AB7" },
    { label: "記憶節點", val: state.memoryItems.length, icon: "✦", color: "#1D9E75" }
  ];

  const handleSaveProfile = () => {
    dispatch({
      type: "UPDATE_PROFILE",
      profile: { name, bio, tone, avatar }
    });
    setIsEditing(false);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#FAF9F6", paddingBottom: 40, scrollbarWidth: "thin" as any }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "16px" : "24px 30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
            <span>👤 帳戶設定與資訊</span>
            {state.user && state.user.provider === "google" && (
              <span style={{ fontSize: 9.5, background: "linear-gradient(135deg, #FFF9EE, #FFF3DF)", border: `0.5px solid ${T.gold}`, color: T.goldDark, padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                [Google 帳號已綁定]
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setIsEditing(!isEditing)} gold style={{ padding: "6px 16px", fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>✎</span> {isEditing ? "取消編輯" : "編輯個人資料"}
            </Btn>
            <button 
              onClick={() => { 
                if (confirm("確定要安全登出當前帳號並返回登入畫面嗎？")) {
                  dispatch({ type: "LOGOUT" }); 
                  localStorage.removeItem("muse_user_session");
                } 
              }}
              style={{
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
                border: "1.5px solid rgba(239, 68, 68, 0.25)",
                color: "#EF4444",
                background: "#FEF2F2",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                boxShadow: "0 2px 4px rgba(239, 68, 68, 0.04)",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
              onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}
            >
              🚪 登出帳號
            </button>
          </div>
        </div>

        {/* Editing Modal Panel */}
        {isEditing && (
          <div style={{ background: "#fff", border: `1px solid ${T.goldBorder}`, borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.goldDark, marginBottom: 14 }}>✏️ 編輯個人專屬檔案</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: T.textGhost }}>頭像 EmojI</span>
                <select value={avatar} onChange={e => setAvatar(e.target.value)} style={{ width: "100%", padding: "7px 10px", marginTop: 4, fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 8, outline: "none", background: "#fff" }}>
                  {avatar.startsWith("data:image/") && (
                    <option value={avatar}>🖼️ 自訂上傳頭像</option>
                  )}
                  {["✨", "🩰", "🐈", "🌸", "💄", "🎨", "🍵", "🦢", "💻", "🕶️"].map(e => <option key={e} value={e}>{e} 標誌</option>)}
                </select>
              </div>
              <div>
                <span style={{ fontSize: 11, color: T.textGhost }}>使用者暱稱</span>
                <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "7px 10px", marginTop: 4, fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 8, outline: "none" }} />
              </div>
              <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                <span style={{ fontSize: 11, color: T.textGhost }}>自我介紹 (Bio)</span>
                <input value={bio} onChange={e => setBio(e.target.value)} style={{ width: "100%", padding: "7px 10px", marginTop: 4, fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 8, outline: "none" }} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: T.textGhost }}>對話語調偏好 (Tone)</span>
                <input value={tone} onChange={e => setTone(e.target.value)} style={{ width: "100%", padding: "7px 10px", marginTop: 4, fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 8, outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setIsEditing(false)} style={{ border: "none", background: "transparent", fontSize: 12, color: T.textGhost, cursor: "pointer", padding: "6px 12px" }}>取消</button>
              <Btn onClick={handleSaveProfile} gold style={{ padding: "6px 16px", fontSize: 11 }}>儲存變更</Btn>
            </div>
          </div>
        )}
        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: isMobile ? 10 : 16, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "12px 14px" : "18px 20px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: T.textGhost, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
          {/* Personality Card */}
          <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 7 }}><span>✨</span> AI 的印象與偏好</div>
            <div style={{ background: "#FBF9F4", border: `0.5px solid ${T.borderLight}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6, fontStyle: "italic" }}>
                "{state.userProfile.name} 是一位非常有條理且富有創意的設計師。他在溝通中偏好<strong>{state.userProfile.tone}</strong>的語調，主要關注品牌重構與實踐優化。"
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, marginBottom: 8 }}>設定的語調與屬性</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["活潑自信", "專業嚴謹", "喜歡 Emoji", "品牌專家", "視覺導向"].map(t => (
                  <span key={t} style={{ background: "#F4F2EE", padding: "4px 10px", borderRadius: 20, fontSize: 11, color: T.textMid }}>{t}</span>
                ))}
              </div>
            </div>
            <Btn style={{ marginTop: "auto", alignSelf: "flex-start", fontSize: 11 }}>更新 AI 的了解 →</Btn>
          </div>

          {/* Activity / Milestones */}
          <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 7 }}><span>🏆</span> 成就獎章</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {(state.achievements || []).map((a: any) => (
                <div key={a.name} style={{ opacity: a.earned ? 1 : 0.4, background: "#F8F6F2", border: `0.5px solid ${T.borderLight}`, borderRadius: 12, padding: "12px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>{a.icon}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>{a.name}</div>
                    <div style={{ fontSize: 9, color: T.textGhost }}>{a.earned ? a.date : "尚未達成"}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textGhost, marginBottom: 5 }}><span>本月目標達成率</span><span>65%</span></div>
              <div style={{ height: 6, background: "#F4F2EE", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", background: T.gold, width: "65%" }} /></div>
            </div>
          </div>
        </div>

        {/* System Guide Settings */}
        <div style={{ marginTop: 24, background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 7 }}>
            <span>🧭</span> 系統引導設定
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FBF9F4", border: `0.5px solid ${T.borderLight}`, borderRadius: 14, padding: "14px 16px" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>顯示智慧工作區歡迎視窗</div>
              <div style={{ fontSize: 11, color: T.textGhost, marginTop: 3 }}>在智慧對話頂部顯示為您量身定制的歡迎引導面板與功能捷徑</div>
            </div>
            <input 
              type="checkbox" 
              checked={showWelcomeCheck} 
              onChange={(e) => {
                const checked = e.target.checked;
                setShowWelcomeCheck(checked);
                if (checked) {
                  localStorage.removeItem("muse_hide_welcome");
                } else {
                  localStorage.setItem("muse_hide_welcome", "true");
                }
                window.dispatchEvent(new Event("muse_welcome_changed"));
              }}
              style={{
                width: 18,
                height: 18,
                accentColor: T.gold,
                cursor: "pointer"
              }}
            />
          </div>
        </div>

        {/* System Tracking & Live Analytics Dashboard */}
        <div id="telemetry_analytics_board" style={{ marginTop: 24, background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 10, borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 20 }}>📊</span> 系統數據追蹤與功能使用率分析
              </div>
              <div style={{ fontSize: 11, color: T.textGhost, marginTop: 4 }}>
                基於本地安全快取機制，實時分析功能交互、參與熱度與全局異常診斷
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 10 }}>
              <button 
                id="clear_telemetry_logs_btn"
                onClick={() => {
                  analytics.clear();
                  alert("所有追蹤日誌已清除！");
                }} 
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#945B50",
                  background: "#FAF1F0",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                🗑️ 清除追蹤日誌
              </button>
            </div>
          </div>

          {/* Grid: Metrics Bar Chart & Error Testing Room */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: 24, minHeight: 250 }}>
            {/* Left side: Pure CSS high-fidelity progress chart mapping usage share */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid }}>🔥 功能熱度與模組呼叫分佈 (Feature Shares)</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#FAF9F6", borderRadius: 12, padding: 16, border: `0.5px solid ${T.borderLight}` }}>
                {[
                  { key: "chat", name: "💬 智慧助理對話 (Chats)", color: T.gold },
                  { key: "habit", name: "🌱 生活規劃與預算 (Planner)", color: "#1D9E75" },
                  { key: "project", name: "📁 個人企劃案檔案 (Workspace)", color: "#C5A059" },
                  { key: "studio", name: "✨ AI 圖片與文案生成 (Studio)", color: "#534AB7" },
                  { key: "theme", name: "🎨 佈景與靈感配色 (Theming)", color: "#D4537E" },
                  { key: "error", name: "⚠️ 全局異常防禦 (Logged Errors)", color: "#CB8B85" }
                ].map(item => {
                  const val = categoryBreakdown[item.key] || 0;
                  const total = Object.keys(categoryBreakdown).reduce((acc: number, currentKey: string) => {
                    return acc + Number(categoryBreakdown[currentKey] || 0);
                  }, 0) || 1;
                  const pct = Math.round((val / total) * 100);
                  
                  return (
                    <div key={item.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textMid } as any}>
                        <span>{item.name}</span>
                        <span style={{ fontWeight: 600 }}>{val} 次 ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(0,0,0,0.03)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: item.color, width: `${Math.max(pct, val > 0 ? 3 : 0)}%`, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Resigned Testing Room */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid }}>🛡️ 異常防禦與隔離機制測試 (Resilience Testing)</div>
              
              <div style={{ background: "#F5F6FC", borderRadius: 12, padding: 16, border: `0.5px solid #7F77DD33`, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <div style={{ fontSize: 11, color: "#534AB7", lineHeight: 1.5 }}>
                  <strong>除錯與測試控制台：</strong> 點擊下方按鈕可人為製造執行異常，直觀體驗此應用之全局防護層與非阻塞式承諾追蹤通知。
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
                  <button 
                    id="trigger_hard_crash_btn"
                    onClick={() => setTriggerCrash(true)} 
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#CB8B85",
                      color: "#fff",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      boxShadow: "0 4px 10px rgba(203, 139, 133, 0.2)"
                    }}
                  >
                    💥 模擬 React 渲染嚴重崩潰 (觸發 ErrorBoundary)
                  </button>

                  <button 
                    id="trigger_promise_rejection_btn"
                    onClick={() => {
                      // Trigger general unhandled promise rejection
                      Promise.reject(new Error("模擬網絡超時或 503 API 服務異步承諾拒絕！"));
                    }} 
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#FAF6F5",
                      border: "1.5px solid #CB8B85",
                      color: "#945B50",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6
                    }}
                  >
                    ⚠️ 拋出 Unhandled Rejection (觸發非阻塞式 Toast)
                  </button>

                  <button 
                    id="simulate_user_click_btn"
                    onClick={() => {
                      const actions = [
                        { c: "chat", a: "AI 寫作輔助", l: "優化了一段長文" },
                        { c: "habit", a: "每日預算登錄", l: "登錄了一筆餐飲支出 $120" },
                        { c: "project", a: "查看 Brief", l: "確認了 WaveForm guidelines" }
                      ];
                      const chosen = actions[Math.floor(Math.random() * actions.length)];
                      analytics.track(chosen.c, chosen.a, chosen.l);
                    }} 
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "#fff",
                      border: `1.5px solid ${T.border}`,
                      color: T.textMid,
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6
                    }}
                  >
                    ⚡ 模擬隨機使用者點擊 (生成追蹤日誌)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Logs Chronicles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `0.5px solid ${T.borderLight}`, paddingTop: 16 }}>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid }}>📰 實時交互行為日誌存檔 (Activity Chronicle)</div>
              
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input 
                  type="text" 
                  value={logSearch} 
                  onChange={e => setLogSearch(e.target.value)} 
                  placeholder="搜尋行為關鍵字..." 
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    outline: "none",
                    width: isMobile ? "100%" : 160
                  }}
                />
                <select 
                  value={logFilter} 
                  onChange={e => setLogFilter(e.target.value)} 
                  style={{
                    fontSize: 11,
                    padding: "4px 6px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    background: "#fff",
                    outline: "none"
                  }}
                >
                  <option value="all">🔍 所有模組</option>
                  <option value="chat">💬 對話模組</option>
                  <option value="habit">🌱 生活模組</option>
                  <option value="project">📁 企劃案模組</option>
                  <option value="studio">✨ 創作模組</option>
                  <option value="error">⚠️ 錯誤日誌</option>
                </select>
              </div>
            </div>

            {/* List roll */}
            <div style={{
              maxHeight: 180,
              overflowY: "auto",
              background: "#FAF9F6",
              border: `0.5px solid ${T.border}`,
              borderRadius: 12,
              fontSize: 11,
              scrollbarWidth: "none"
            } as any}>
              {analyticsEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: T.textGhost, fontStyle: "italic" }}>
                  暫無追蹤日誌，您可以切換其他模組聊天打卡，或點擊上方「模擬使用者點擊」按鈕自動記錄。
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#EEECDF", color: T.textDim, fontWeight: 700, borderBottom: `0.5px solid ${T.border}` }}>
                      <th style={{ padding: "8px 12px", width: 80 }}>時間</th>
                      <th style={{ padding: "8px 12px", width: 100 }}>系統模組</th>
                      <th style={{ padding: "8px 12px", width: 140 }}>追蹤事件</th>
                      <th style={{ padding: "8px 12px" }}>細節標記</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsEvents
                      .filter(ev => logFilter === "all" || ev.category === logFilter)
                      .filter(ev => !logSearch || ev.action.toLowerCase().includes(logSearch.toLowerCase()) || ev.label.toLowerCase().includes(logSearch.toLowerCase()))
                      .map((ev, index) => {
                        let color = "#768193";
                        if (ev.category === "chat") color = T.goldDark;
                        else if (ev.category === "error") color = "#CB8B85";
                        else if (ev.category === "habit") color = "#1D9E75";
                        else if (ev.category === "studio") color = "#534AB7";
                        else if (ev.category === "project") color = "#C5A059";

                        return (
                          <tr key={ev.id} style={{ borderBottom: `0.5px solid ${T.borderLight}`, background: index % 2 === 0 ? "transparent" : "#FFFDFC" }}>
                            <td style={{ padding: "8px 12px", color: T.textGhost, fontFamily: "JetBrains Mono" }}>{ev.ts}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{
                                background: color + "15",
                                color: color,
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontWeight: 600,
                                fontSize: 9
                              }}>
                                {ev.category.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px", color: T.text, fontWeight: 600 }}>{ev.action}</td>
                            <td style={{ padding: "8px 12px", color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }} title={ev.label}>{ev.label}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Project List / Recent Work */}
        <div style={{ marginTop: 24, background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}><span>📂</span> 進行中的企劃案 ({state.projects.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(state.projects || []).map((p: any) => (
              <div key={p.id} onClick={() => dispatch({ type: "ENTER_PROJECT", id: p.id })} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 14, border: `0.5px solid ${T.borderLight}`, cursor: "pointer", transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "#FBF9F4"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: p.color + "20", border: `0.5px solid ${p.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📁</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: T.textGhost }}>{p.phase} · {p.threads.length} 對話 · {p.files.length} 檔案</div>
                </div>
                <div style={{ fontSize: 18, color: T.textGhost }}>›</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyMuseView({ state, dispatch, isMobile }: any) {
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);
  
  const activeAssetId = selectedAssetId || (state.myMuseAssets && state.myMuseAssets[0]?.id);
  const activeAsset = state.myMuseAssets && state.myMuseAssets.find((a: any) => a.id === activeAssetId);

  return (
    <div style={{ display: "flex", gap: 20, minHeight: "100%", height: "auto", flexDirection: isMobile ? "column" : "row" } as any}>
      {/* 左側：成品清單 */}
      <div style={{ width: isMobile ? "100%" : 250, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5, marginBottom: 4 }}>SAVED MUSE ARTWORKS</div>
        {(state.myMuseAssets || []).length === 0 ? (
          <div style={{ 
            background: "rgba(255, 255, 255, 0.4)", 
            border: `1.5px dashed rgba(220, 215, 206, 0.8)`, 
            borderRadius: 16, 
            padding: "40px 20px", 
            textAlign: "center",
            color: T.textGhost,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12
          }}>
            <span style={{ fontSize: 32 }}>🎀</span>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>目前尚無成品</div>
            <div style={{ fontSize: 10, lineHeight: 1.5 }}>快在右側預覽面板中點擊「🚀 推送成品」將你的精美設計珍藏於此！</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: isMobile ? "240px" : "calc(100vh - 220px)", overflowY: "auto", paddingRight: 4 }}>
            {(state.myMuseAssets || []).map((asset: any) => {
              const isSelected = activeAssetId === asset.id;
              return (
                <div 
                  key={asset.id} 
                  onClick={() => setSelectedAssetId(asset.id)}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: isSelected ? "#FFFBF0" : "rgba(255, 255, 255, 0.5)",
                    border: `1px solid ${isSelected ? T.gold : "rgba(220, 215, 206, 0.4)"}`,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: isSelected ? "0 4px 12px rgba(197,160,89,0.06)" : "none",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                      e.currentTarget.style.borderColor = "rgba(220, 215, 206, 0.8)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
                      e.currentTarget.style.borderColor = "rgba(220, 215, 206, 0.4)";
                    }
                  }}
                >
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 8, 
                    overflow: "hidden", 
                    background: "#fff", 
                    border: "1px solid rgba(0,0,0,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 2,
                    flexShrink: 0
                  }}>
                    <div 
                      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                      dangerouslySetInnerHTML={{ __html: asset.content }} 
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {asset.name}
                    </div>
                    <div style={{ fontSize: 9, color: T.textGhost, marginTop: 2 }}>
                      {asset.ts} 推送
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 右側：成品高清大圖與分析 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, width: isMobile ? "100%" : "auto" }}>
        {activeAsset ? (
          <div style={{ 
            background: "#fff", 
            border: `1px solid rgba(220, 215, 206, 0.6)`, 
            borderRadius: 20, 
            padding: 20, 
            boxShadow: "0 10px 30px rgba(61,46,26,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: 10, alignItems: isMobile ? "flex-start" : "center" } as any}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: 0 }}>
                  {activeAsset.name}
                </h2>
                <p style={{ fontSize: 10, color: T.textGhost, margin: "2px 0 0" }}>
                  ID: {activeAsset.id} · 向量格式 (Vector SVG)
                </p>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(activeAsset.content);
                  alert("📋 已成功複製該成品的 SVG 代碼！");
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.03)",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.textMid,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
              >
                <span>📋</span> 複製 SVG 代碼
              </button>
            </div>

            <div style={{ 
              width: "100%", 
              height: isMobile ? 200 : 280, 
              borderRadius: 16, 
              background: "#FAF9F6", 
              backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0)",
              backgroundSize: "24px 24px",
              border: "1px solid rgba(220, 215, 206, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ 
                width: isMobile ? 160 : 240, 
                height: isMobile ? 160 : 240, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
                borderRadius: 24,
                background: "#fff",
                padding: 10,
                boxSizing: "border-box",
                transition: "transform 0.3s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02) rotate(0.5deg)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}
              >
                <div 
                  style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  dangerouslySetInnerHTML={{ __html: activeAsset.content }} 
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5 }}>AESTHETIC COLOR PALETTE ANALYSIS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { hex: "#FFF8F0", desc: "象牙燕麥" },
                  { hex: "#C5A059", desc: "奢華霧金" },
                  { hex: "#FAF2EE", desc: "柔美奶茶" },
                  { hex: "#3D2E1A", desc: "靜謐深木" },
                  { hex: "#D4537E", desc: "煙燻玫瑰" }
                ].map((paletteColor, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: "rgba(248, 246, 242, 0.6)",
                      border: "1px solid rgba(220, 215, 206, 0.4)",
                      borderRadius: 10,
                      fontSize: 11
                    }}
                  >
                    <div style={{ 
                      width: 14, 
                      height: 14, 
                      borderRadius: "50%", 
                      background: paletteColor.hex,
                      border: "1px solid rgba(0,0,0,0.05)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                    }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 700, color: T.text, fontSize: 10 }}>{paletteColor.desc}</span>
                      <span style={{ color: T.textGhost, fontSize: 9, fontFamily: "monospace" }}>{paletteColor.hex}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            flex: 1, 
            background: "#fff", 
            border: `1px solid rgba(220, 215, 206, 0.5)`, 
            borderRadius: 20, 
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.textGhost,
            flexDirection: "column",
            gap: 10,
            padding: 40
          }}>
            <span>🎨</span>
            <div style={{ fontSize: 12, fontWeight: 600 }}>請在左側選擇一個成品以檢視詳情</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MyMuseWorkspaceView({ state, dispatch, isMobile }: any) {
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);
  
  // Local state for editing name & remark
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editRemark, setEditRemark] = React.useState("");

  const activeAssetId = selectedAssetId || (state.myMuseAssets && state.myMuseAssets[0]?.id);
  const activeAsset = state.myMuseAssets && state.myMuseAssets.find((a: any) => a.id === activeAssetId);

  // File tree local state
  const [selectedFile, setSelectedFile] = React.useState("muse-vector.svg");

  const handleEditStart = (asset: any) => {
    setEditingId(asset.id);
    setEditName(asset.name);
    setEditRemark(asset.remark || "");
  };

  const handleEditSave = (id: string) => {
    if (!editName.trim()) {
      alert("⚠️ 標題不能為空！");
      return;
    }
    dispatch({
      type: "UPDATE_MY_MUSE_ASSET",
      id,
      name: editName,
      remark: editRemark
    });
    setEditingId(null);
  };

  const handleExportZip = async (asset: any) => {
    try {
      const JSZip = (window as any).JSZip;
      if (!JSZip) {
        alert("⚠️ ZIP 套件載入中，請稍候...");
        return;
      }
      const zip = new JSZip();
      const files = asset.files || {};
      zip.file("index.html", files["index.html"] || "");
      zip.file("style.css", files["style.css"] || "");
      zip.file("muse-vector.svg", files["muse-vector.svg"] || asset.content || "");
      zip.file("app.js", files["app.js"] || "");
      zip.file("README.md", files["README.md"] || "");
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${asset.name.split(" · ")[0] || "muse"}-project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e: any) {
      alert("❌ ZIP 匯出失敗：" + e.message);
    }
  };

  const assetFiles = activeAsset?.files || {
    "muse-vector.svg": activeAsset?.content || "",
    "index.html": `<!DOCTYPE html><html><body>${activeAsset?.name || "Muse Artwork"}</body></html>`,
    "style.css": `body { background: #faf6f0; }`,
    "app.js": `console.log("Loaded");`,
    "README.md": `# ${activeAsset?.name || "Muse Artwork"}`
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: isMobile ? "column" : "row" }}>
      {/* 左側：成品卡片列表 */}
      <div style={{ width: isMobile ? "100%" : 280, background: T.bgCard, borderRight: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `0.5px solid ${T.borderLight}`, background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.goldDark, letterSpacing: 0.5 }}>🎀 MY MUSE 成品專區</span>
          <span style={{ fontSize: 10, background: T.goldLight, color: T.goldDark, padding: "2px 6px", borderRadius: 10, fontWeight: 700 }}>{(state.myMuseAssets || []).length} 個項目</span>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {(state.myMuseAssets || []).length === 0 ? (
            <div style={{ 
              background: "rgba(255, 255, 255, 0.4)", 
              border: `1.5px dashed rgba(220, 215, 206, 0.8)`, 
              borderRadius: 16, 
              padding: "40px 20px", 
              textAlign: "center",
              color: T.textGhost,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12
            }}>
              <span style={{ fontSize: 32 }}>🎀</span>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>目前尚無成品</div>
              <div style={{ fontSize: 10, lineHeight: 1.5 }}>快在右側預覽面板中點擊「🚀 推送成品」將你的精美設計珍藏於此！</div>
            </div>
          ) : (
            (state.myMuseAssets || []).map((asset: any) => {
              const isSelected = activeAssetId === asset.id;
              const isEditing = editingId === asset.id;
              
              if (isEditing) {
                return (
                  <div 
                    key={asset.id} 
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      background: "#fff",
                      border: `1px solid ${T.gold}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      boxShadow: "0 6px 16px rgba(197,160,89,0.08)"
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.gold }}>編輯成品資訊</div>
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      placeholder="輸入標題..."
                      style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, outline: "none", color: T.text }}
                    />
                    <textarea 
                      value={editRemark} 
                      onChange={e => setEditRemark(e.target.value)} 
                      placeholder="輸入備註說明..."
                      rows={3}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, outline: "none", color: T.textMid, resize: "none", fontFamily: "inherit" }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <Btn gold onClick={() => handleEditSave(asset.id)} style={{ flex: 1, fontSize: 10, padding: "4px 0" }}>儲存</Btn>
                      <Btn onClick={() => setEditingId(null)} style={{ flex: 1, fontSize: 10, padding: "4px 0" }}>取消</Btn>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    background: isSelected ? "#FFFBF0" : "rgba(255, 255, 255, 0.6)",
                    border: `1px solid ${isSelected ? T.gold : "rgba(220, 215, 206, 0.4)"}`,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    boxShadow: isSelected ? "0 4px 14px rgba(197,160,89,0.06)" : "none",
                    position: "relative",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                      e.currentTarget.style.borderColor = "rgba(220, 215, 206, 0.8)";
                    }
                    const editBtn = e.currentTarget.querySelector(".edit-btn-trigger") as HTMLElement;
                    if (editBtn) editBtn.style.opacity = "1";
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)";
                      e.currentTarget.style.borderColor = "rgba(220, 215, 206, 0.4)";
                    }
                    const editBtn = e.currentTarget.querySelector(".edit-btn-trigger") as HTMLElement;
                    if (editBtn) editBtn.style.opacity = "0";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: 8, 
                      overflow: "hidden", 
                      background: "#fff", 
                      border: "1px solid rgba(0,0,0,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 2,
                      flexShrink: 0
                    }}>
                      <div 
                        style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                        dangerouslySetInnerHTML={{ __html: asset.content }} 
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {asset.name}
                      </div>
                      <div style={{ fontSize: 9, color: T.textGhost, marginTop: 1 }}>
                        {asset.ts} 推送
                      </div>
                    </div>
                    {/* Pencil Edit Icon Button */}
                    <button
                      className="edit-btn-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart(asset);
                      }}
                      title="編輯標題與備註"
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        opacity: 0,
                        transition: "all 0.15s ease",
                        background: "rgba(255, 255, 255, 0.8)",
                        border: `1px solid ${T.border}`,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        padding: 0
                      }}
                    >
                      ✏️
                    </button>
                  </div>
                  
                  {/* Note/Remark field */}
                  <div style={{ 
                    fontSize: 11, 
                    color: asset.remark ? T.textMid : T.textGhost, 
                    background: isSelected ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.02)", 
                    padding: "6px 10px", 
                    borderRadius: 8,
                    lineHeight: 1.4,
                    wordBreak: "break-all"
                  }}>
                    {asset.remark || "（無備註說明，懸停以編輯）"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 中間：高清預覽 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, overflowY: "auto", padding: 24, gap: 16 }}>
        {activeAsset ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>{activeAsset.name}</h1>
                <p style={{ fontSize: 11, color: T.textGhost, margin: "4px 0 0" }}>向量格式 (SVG Vector Art) · 尊榮收藏於成品庫</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(activeAsset.content);
                    alert("📋 已成功複製該成品的 SVG 代碼！");
                  }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 10,
                    background: "#fff",
                    border: `1px solid ${T.border}`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.textMid,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FAF9F6"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <span>📋</span> 複製 SVG
                </button>
                <button 
                  onClick={() => handleExportZip(activeAsset)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 10,
                    background: T.gold,
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 4px 12px rgba(197,160,89,0.2)",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.goldDark}
                  onMouseLeave={e => e.currentTarget.style.background = T.gold}
                >
                  <span>📦</span> 匯出 ZIP
                </button>
              </div>
            </div>

            <div style={{ 
              width: "100%", 
              height: 340, 
              borderRadius: 24, 
              background: "#fff", 
              backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1.5px, transparent 0)",
              backgroundSize: "28px 28px",
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(61,46,26,0.02)"
            }}>
              <div style={{ 
                width: 260, 
                height: 260, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                boxShadow: "0 16px 48px rgba(61,46,26,0.08)",
                borderRadius: 28,
                background: "#fff",
                padding: 12,
                boxSizing: "border-box",
                transition: "transform 0.4s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03) rotate(0.8deg)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}
              >
                <div 
                  style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  dangerouslySetInnerHTML={{ __html: activeAsset.content }} 
                />
              </div>
            </div>

            {/* Note Display box */}
            {activeAsset.remark && (
              <div style={{ padding: 16, background: "#fff", borderRadius: 16, border: `0.5px solid ${T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5, marginBottom: 6 }}>CREATIVE NOTES / 成品備註</div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{activeAsset.remark}</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#fff", padding: 18, borderRadius: 20, border: `0.5px solid ${T.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5 }}>AESTHETIC COLOR PALETTE ANALYSIS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { hex: "#FFF8F0", desc: "象牙燕麥" },
                  { hex: "#C5A059", desc: "奢華霧金" },
                  { hex: "#FAF2EE", desc: "柔美奶茶" },
                  { hex: "#3D2E1A", desc: "靜謐深木" },
                  { hex: "#D4537E", desc: "煙燻玫瑰" }
                ].map((paletteColor, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "#FBF9F4",
                      border: "1px solid rgba(220, 215, 206, 0.5)",
                      borderRadius: 12,
                      fontSize: 12
                    }}
                  >
                    <div style={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: "50%", 
                      background: paletteColor.hex,
                      border: "1px solid rgba(0,0,0,0.05)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                    }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 700, color: T.text, fontSize: 11 }}>{paletteColor.desc}</span>
                      <span style={{ color: T.textGhost, fontSize: 10, fontFamily: "monospace" }}>{paletteColor.hex}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: T.textGhost, gap: 12 }}>
            <span style={{ fontSize: 48 }}>🎨</span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>成品專區目前尚無成品</div>
          </div>
        )}
      </div>

      {/* 右側：PREVIEW 檔案樹 */}
      {!isMobile && activeAsset && (
        <div style={{ width: 280, background: "#FBF9F5", borderLeft: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ height: 42, background: "#fff", borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 14px", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5 }}>PREVIEW 檔案樹</span>
            <button 
              onClick={() => handleExportZip(activeAsset)}
              style={{ fontSize: 10, padding: "2px 8px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}
            >
              📦 匯出 ZIP
            </button>
          </div>
          
          {/* Top mini Preview */}
          <div style={{ height: 160, borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: 10, boxSizing: "border-box", flexShrink: 0 }}>
            <div style={{ width: 120, height: 120 }} dangerouslySetInnerHTML={{ __html: assetFiles["muse-vector.svg"] }} />
          </div>

          {/* File Tree List */}
          <div style={{ padding: 10, background: "rgba(0,0,0,0.01)", borderBottom: `0.5px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5, marginBottom: 6 }}>PROJECT FILES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {Object.keys(assetFiles).map(fileName => {
                const isSel = selectedFile === fileName;
                return (
                  <div
                    key={fileName}
                    onClick={() => setSelectedFile(fileName)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                      background: isSel ? "rgba(197,160,89,0.1)" : "transparent",
                      color: isSel ? T.goldDark : T.textMid,
                      fontWeight: isSel ? 600 : 400,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <span>{fileName.endsWith(".svg") ? "🎨" : fileName.endsWith(".html") ? "🌐" : fileName.endsWith(".css") ? "🎨" : fileName.endsWith(".js") ? "⚡" : "📝"}</span>
                    <span>{fileName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Code Viewer */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "6px 12px", background: "rgba(0,0,0,0.02)", borderBottom: `0.5px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5 }}>CODE VIEWER (${selectedFile})</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(assetFiles[selectedFile] || "");
                  alert(`📋 已複製 ${selectedFile} 的原始代碼！`);
                }}
                style={{ fontSize: 9, background: "none", border: "none", cursor: "pointer", color: T.goldDark, fontWeight: 600 }}
              >
                複製
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", background: "#1E1E1E", padding: "10px 14px", margin: 0, boxSizing: "border-box" }}>
              <pre style={{ 
                margin: 0, 
                color: "#E3E3E3", 
                fontSize: 10, 
                fontFamily: "var(--font-mono), monospace", 
                whiteSpace: "pre-wrap", 
                wordBreak: "break-all",
                lineHeight: 1.5 
              }}>
                {assetFiles[selectedFile] || ""}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsView({ state, dispatch, isMobile, setShowLegalModal }: any) {
  const [sysPromptDraft, setSysPromptDraft] = useState(state.customSystemPrompt || "");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [newModelProvider, setNewModelProvider] = useState("DeepSeek");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState("https://api.deepseek.com");
  const [connectProvider, setConnectProvider] = useState("DeepSeek");
  const [showSkillsModal, setShowSkillsModal] = useState(false);

  const SKILLS_LIST = [
    { key: "similarweb", name: "SimilarWeb 流量分析", icon: "📊", desc: "自動為競品分析、流量查詢、市場研究等話題注入專業 SimilarWeb 表格數據格式與 LTV/CAC 商業指標建議。" },
    { key: "markdown", name: "學筆記美化排版", icon: "📓", desc: "嚴格對回答進行精緻排版，使用精準標題、Morandi Emoji、重點加粗與核心行動點總結，打造極奢閱讀體驗。" },
    { key: "slides", name: "寫精美簡報 Marp", icon: "📝", desc: "偵測簡報與大綱需求，自動輸出完整、合規且可直接複製的標準 Marp Markdown 投影片程式碼。" },
    { key: "github_pages", name: "GitHub Pages 奢華網頁", icon: "🌐", desc: "生成完整、可運作的響應式網頁，以法式低飽和奶油風美學渲染，並融入精美 CSS Hover 微動效。" },
    { key: "github_actions", name: "GitHub Actions 自動化", icon: "🚀", desc: "提供生產級 .github/workflows CI/CD 設定檔，包含快取優化、多階段 Jobs 部署與狀態回報機制。" },
    { key: "git_collab", name: "Git 團隊專案協作", icon: "🌿", desc: "提供專業 Git-Flow 開發分支模型、Conventional Commits 規範範例及 PR 審查與衝突對比指令。" }
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Re-enable Welcome Guide
  const handleReenableWelcome = () => {
    localStorage.setItem("muse_hide_welcome", "false");
    window.dispatchEvent(new Event("muse_welcome_changed"));
    triggerToast("✨ 已成功重新啟用主頁歡迎引導視窗！");
  };

  // Export Data
  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `muse_ai_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast("📦 全站數據備份檔案下載成功！");
  };

  // Import Data
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === "object") {
          dispatch({ type: "IMPORT_ALL_DATA", data: parsed });
          triggerToast("📥 備份數據匯入成功，已恢復所有企劃案與對話！");
        } else {
          alert("❌ 格式錯誤：非合法的 JSON 備份檔案");
        }
      } catch (err: any) {
        alert("❌ 讀取檔案失敗：" + err.message);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = ""; // Clear file selector
  };

  // Reset State
  const handleResetState = () => {
    dispatch({ type: "RESET_STATE" });
    localStorage.removeItem("muse_hide_welcome");
    localStorage.removeItem("muse_user_profile");
    window.dispatchEvent(new Event("muse_welcome_changed"));
    setShowResetConfirm(false);
    triggerToast("🔄 系統已重設為出廠預設狀態！");
  };

  // Crash Simulation
  const handleSimulateCrash = () => {
    if (confirm("⚠️ 即將模擬前端崩潰，這將會拋出一個未捕獲的錯誤，是否繼續？")) {
      throw new Error("💥 Muse AI 模擬前端崩潰測試錯誤");
    }
  };

  // Text temp helper description
  const getTempDesc = (temp: number) => {
    if (temp <= 0.3) return "精準嚴謹 (精準分析與程式碼)";
    if (temp <= 0.7) return "標準平衡 (日常問答與流暢創作)";
    if (temp <= 1.2) return "發散創新 (視覺設計與行銷文案)";
    return "天馬行空 (極具隨機性的靈感碰撞)";
  };

  return (
    <div 
      style={{ 
        flex: 1, 
        background: "linear-gradient(135deg, #FAF8F5 0%, #FFFDFB 100%)", 
        overflowY: "auto", 
        padding: isMobile ? "20px 14px" : "28px 36px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        position: "relative",
        fontFamily: state.fontFamily || "inherit"
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          style={{
            position: "absolute",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(61, 46, 26, 0.9)",
            backdropFilter: "blur(8px)",
            color: "#FAF6F5",
            fontSize: 12,
            padding: "8px 18px",
            borderRadius: 20,
            zIndex: 99999,
            boxShadow: "0 6px 20px rgba(61,46,26,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "toastFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes toastFadeIn {
              0% { transform: translate(-50%, -20px); opacity: 0; }
              100% { transform: translate(-50%, 0); opacity: 1; }
            }
          `}} />
          <span>💡</span>
          <strong>{toastMessage}</strong>
        </div>
      )}

      {/* Header Panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* 🔮 Desktop Back to Chat Button */}
          {!isMobile && (
            <button 
              onClick={() => dispatch({ type: "SET_NAV", view: "chat" })}
              style={{
                background: "#fff",
                border: "0.5px solid rgba(197, 160, 89, 0.45)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: T.goldDark,
                boxShadow: "0 2px 8px rgba(197, 160, 89, 0.08)",
                transition: "all 0.2s",
                outline: "none",
                flexShrink: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = T.goldLight;
                e.currentTarget.style.transform = "translateX(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateX(0)";
              }}
              title="返回對話頁面"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          )}
          <span style={{ fontSize: 24 }}>⚙️</span>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#3D2E1A", margin: 0, letterSpacing: 0.5 }}>系統控制中心</h1>
        </div>
        <p style={{ fontSize: 11, color: T.textGhost, margin: 0, textTransform: "uppercase", letterSpacing: "1.5px" }}>
          Muse AI Control Room / 調整您的尊榮智能體驗
        </p>
      </div>

      {/* Grid Layout Container */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 20,
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        {/* Section 1: AI與模型偏好 */}
        <div 
          style={{
            background: "rgba(255, 255, 255, 0.75)",
            backdropFilter: `blur(${state.glassmorphismBlur ?? 12}px)`,
            border: "0.5px solid rgba(197, 160, 89, 0.2)",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 10px 30px rgba(138, 110, 62, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(220, 215, 206, 0.4)", paddingBottom: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A6E3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
            <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "#3D2E1A", margin: 0 }}>AI 模型與參數偏好</h2>
          </div>

          {/* Model selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMid }}>預設智慧 AI 模型</label>
              
              {/* Gemini 旁邊的小開關 (切換啟用自訂外部擴充模型，兩者互斥避免衝突) */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: state.enableCustomModels ? T.textGhost : T.goldDark, fontWeight: "bold" }}>Gemini 原生</span>
                <div 
                  onClick={() => dispatch({ type: "SET_ENABLE_CUSTOM_MODELS", val: !state.enableCustomModels })}
                  style={{
                    width: 32,
                    height: 18,
                    borderRadius: 9,
                    background: state.enableCustomModels ? T.gold : "#E1D7D4",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                >
                  <div 
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 2,
                      left: state.enableCustomModels ? 16 : 2,
                      transition: "left 0.2s"
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: state.enableCustomModels ? T.goldDark : T.textGhost, fontWeight: "bold" }}>自訂外部</span>
              </div>
            </div>

            <select 
              value={state.apiModel || (state.enableCustomModels ? (state.customModels?.[0]?.name || "") : "gemini-2.5-flash")}
              onChange={e => dispatch({ type: "SET_API_MODEL", val: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 12,
                border: "0.5px solid rgba(197, 160, 89, 0.3)",
                background: "#FFFDFB",
                color: "#3D2E1A",
                fontSize: 12.5,
                fontWeight: 600,
                outline: "none",
                cursor: "pointer"
              }}
            >
              {!state.enableCustomModels ? (
                <>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (快速靈敏，適合日常問答)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (強悍推理，適合複雜分析與編程)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (經典敏捷模型)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (經典高智能模型)</option>
                </>
              ) : (
                <>
                  {(state.customModels || []).map((m: any) => (
                    <option key={m.id} value={m.name}>
                      {m.provider} · {m.name} (自訂外部)
                    </option>
                  ))}
                  {(!state.customModels || state.customModels.length === 0) && (
                    <option value="">(尚未連接任何外部模型)</option>
                  )}
                </>
              )}
            </select>
          </div>

          {/* Chat temperature slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMid }}>智慧創意溫度 (Temperature)</label>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.goldDark, background: T.goldLight, padding: "2px 8px", borderRadius: 10 }}>
                {state.chatTemperature ?? 0.7}
              </span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="2.0" 
              step="0.1" 
              value={state.chatTemperature ?? 0.7}
              onChange={e => dispatch({ type: "SET_CHAT_TEMP", val: parseFloat(e.target.value) })}
              style={{
                width: "100%",
                accentColor: T.gold,
                cursor: "pointer",
                margin: "4px 0"
              }}
            />
            <span style={{ fontSize: 10, color: T.textGhost, fontStyle: "italic" }}>
              當前狀態：{getTempDesc(state.chatTemperature ?? 0.7)}
            </span>
          </div>

          {/* Custom system prompt override */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMid }}>客製化系統人格指令 (Custom Prompt)</label>
            <textarea 
              value={sysPromptDraft}
              onChange={e => setSysPromptDraft(e.target.value)}
              placeholder="例如：&#10;- 請所有的回答均使用溫柔優雅的中文，並適度附加精美 Emoji 裝點。&#10;- 以高奢行銷總監的語氣回覆，字句精練流暢，段落分明。&#10;- 在分析技術架構時，多使用條列式 Markdown 及類比說明。"
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "0.5px solid rgba(197, 160, 89, 0.2)",
                background: "#FFFDFB",
                color: T.text,
                fontSize: 11.5,
                lineHeight: 1.5,
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button 
                onClick={() => {
                  dispatch({ type: "SET_CUSTOM_SYS_PROMPT", val: sysPromptDraft.trim() });
                  triggerToast("✨ 客製化系統人格指令已套用聯動！");
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  background: T.gold,
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(197,160,89,0.15)",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.goldDark}
                onMouseLeave={e => e.currentTarget.style.background = T.gold}
              >
                儲存並生效指令
              </button>
            </div>
          </div>
        </div>

        {/* Section 1.5: 自訂外部擴充模型管理 (獨立卡片，之後可隨時拆卸拔除，不與原生 AI 介面混雜) */}
        {state.enableCustomModels && (
          <div 
            style={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: `blur(${state.glassmorphismBlur ?? 12}px)`,
              border: "0.5px solid rgba(197, 160, 89, 0.25)",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 10px 30px rgba(138, 110, 62, 0.03)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginTop: 16
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(220, 215, 206, 0.4)", paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15 }}>🔌</span>
                <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "#3D2E1A", margin: 0 }}>自訂外部擴充模型管理 (獨立模組)</h2>
              </div>
              
              {/* 手動重新整理按鈕 */}
              <button
                onClick={async () => {
                  const btn = document.getElementById("refresh-model-btn");
                  if (btn) btn.style.transform = "rotate(360deg)";
                  
                  // Fetch real models from all connected providers via server API
                  const connected = Object.entries(state.connectedProviders || {});
                  if (connected.length > 0) {
                    let allModels: any[] = [];
                    // Keep manual/non-standard models
                    const manualModels = (state.customModels || []).filter((m: any) => {
                      const isAutoAdded = connected.some(([p]) => m.provider === p);
                      return !isAutoAdded;
                    });
                    allModels = [...manualModels];
                    
                    for (const [provider, info] of connected) {
                      let keyVal = "";
                      let baseUrlVal = "";
                      if (info && typeof info === "object") {
                        keyVal = (info as any).apiKey || "";
                        baseUrlVal = (info as any).baseUrl || "";
                      } else {
                        keyVal = (info as any) || "";
                      }
                      try {
                        if (!window.museAPI) throw new Error("IPC not available");
                        const data = await window.museAPI.ai.fetchModels({ provider, apiKey: keyVal, baseUrl: baseUrlVal });
                        allModels = [...allModels, ...data.models];
                      } catch (e) { console.error(`Failed to fetch models for ${provider}:`, e); }
                    }
                    dispatch({ type: "SET_CUSTOM_MODELS", models: allModels });
                    triggerToast(`↻ 已從 ${connected.map(([p]) => p).join("、")} 即時刷新取得 ${allModels.length} 個可用模型！`);
                  } else {
                    dispatch({ type: "REFRESH_CUSTOM_MODELS" });
                    triggerToast("↻ 已手動重新整理自訂擴充模型清單！");
                  }
                  setTimeout(() => { if (btn) btn.style.transform = "rotate(0deg)"; }, 600);
                }}
                id="refresh-model-btn"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 11.5,
                  color: T.goldDark,
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 700,
                  transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                ↻ 重新整理清單
              </button>
            </div>

            {/* 已連接的 API 廠商列表 */}
            {state.connectedProviders && Object.keys(state.connectedProviders).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(16, 185, 129, 0.02)", border: "0.5px solid rgba(16, 185, 129, 0.15)", borderRadius: 16, padding: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
                  <span>🔑 已連接並授權之官方 API 廠商</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(state.connectedProviders).map(([provider, key]: any) => (
                    <div 
                      key={provider}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "rgba(16, 185, 129, 0.06)",
                        border: "0.5px solid rgba(16, 185, 129, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 10.5,
                        fontWeight: "bold",
                        color: "#10B981"
                      }}
                    >
                      <span>{provider === "DeepSeek" ? "🔵" : (provider === "Claude" ? "🔶" : (provider === "GPT" ? "🟢" : "🟣"))} {provider} 核心庫</span>
                      <button 
                        onClick={() => {
                          dispatch({ type: "DISCONNECT_PROVIDER", provider });
                          if (window.museAPI?.vault) window.museAPI.vault.delete("api_key_" + provider);
                          triggerToast(`🗑️ 已拔除並斷開 ${provider} 廠商模型庫！`);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#CB8B85",
                          cursor: "pointer",
                          fontSize: 12,
                          padding: "0 2px",
                          fontWeight: "bold"
                        }}
                        title="拔除廠商庫"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              {/* Form 1: 一鍵連通廠商模型庫 */}
              <div style={{ background: "rgba(16, 185, 129, 0.02)", border: "0.5px solid rgba(16, 185, 129, 0.15)", borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#10B981" }}>🔌 快速連通官方廠商模型庫 (推薦)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {/* 廠商選擇 */}
                    <select
                      value={connectProvider}
                      onChange={e => {
                        const val = e.target.value;
                        setConnectProvider(val);
                        if (val === "DeepSeek") {
                          setBaseUrlInput("https://api.deepseek.com");
                        } else if (val === "GPT") {
                          setBaseUrlInput("https://api.openai.com/v1");
                        } else if (val === "Claude") {
                          setBaseUrlInput("https://api.anthropic.com");
                        } else if (val === "MiniMax") {
                          setBaseUrlInput("https://api.minimax.chat/v1");
                        }
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "0.5px solid rgba(16, 185, 129, 0.25)",
                        background: "#FFFDFB",
                        color: T.text,
                        fontSize: 12,
                        outline: "none",
                        cursor: "pointer",
                        width: 100
                      }}
                    >
                      <option value="DeepSeek">DeepSeek</option>
                      <option value="MiniMax">MiniMax</option>
                      <option value="Claude">Claude</option>
                      <option value="GPT">GPT</option>
                    </select>

                    {/* API Key 輸入 */}
                    <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                      <input 
                        type={showApiKey ? "text" : "password"}
                        placeholder="輸入該廠商 API Key 金鑰"
                        value={apiKeyInput}
                        onChange={e => setApiKeyInput(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 30px 6px 10px",
                          borderRadius: 8,
                          border: "0.5px solid rgba(16, 185, 129, 0.25)",
                          background: "#FFFDFB",
                          color: T.text,
                          fontSize: 12,
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        style={{
                          position: "absolute",
                          right: 8,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          opacity: 0.5
                        }}
                      >
                        {showApiKey ? <EyeOff size={14} color={T.text} /> : <Eye size={14} color={T.text} />}
                      </button>
                    </div>
                  </div>

                  {/* 代理網址 Base URL 輸入 */}
                  <input 
                    type="text"
                    placeholder="自訂中轉/代理網址 Base URL (選填，如：https://api.openai-sb.com)"
                    value={baseUrlInput}
                    onChange={e => setBaseUrlInput(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "0.5px solid rgba(16, 185, 129, 0.15)",
                      background: "#FFFDFB",
                      color: T.text,
                      fontSize: 11,
                      outline: "none"
                    }}
                  />

                  <button
                    onClick={async () => {
                      if (!apiKeyInput.trim()) {
                        alert("⚠️ 請輸入該廠商的 API 金鑰！");
                        return;
                      }
                      const key = apiKeyInput.trim();
                      const baseUrlVal = baseUrlInput.trim();
                      const storedKey = baseUrlVal ? { apiKey: key, baseUrl: baseUrlVal } : key;
                      
                      // Fetch real models from server API
                      triggerToast(`🔄 正在從 ${connectProvider} 即時獲取可用模型清單...`);
                      try {
                        if (!window.museAPI) throw new Error("IPC not available");
                        const data = await window.museAPI.ai.fetchModels({ provider: connectProvider, apiKey: key, baseUrl: baseUrlVal });
                        const fetchedModels = data.models || [];
                        
                        // Store the provider connection and replace models with real ones
                        dispatch({ type: "CONNECT_PROVIDER_WITH_MODELS", provider: connectProvider, apiKey: storedKey, models: fetchedModels });
                        if (window.museAPI?.vault) window.museAPI.vault.save("api_key_" + connectProvider, typeof storedKey === "string" ? storedKey : JSON.stringify(storedKey));
                        triggerToast(`✨ 已成功連通 ${connectProvider}，即時載入 ${fetchedModels.length} 個可用模型！`);
                      } catch (e: any) {
                        if (e.message && e.message.includes("API error")) {
                          alert(`⚠️ ${connectProvider} API 錯誤：${e.message}\\n（請檢查金鑰或自訂代理網址是否正確）`);
                        } else {
                          // Fallback to static models
                          dispatch({ type: "CONNECT_PROVIDER", provider: connectProvider, apiKey: storedKey });
                          if (window.museAPI?.vault) window.museAPI.vault.save("api_key_" + connectProvider, typeof storedKey === "string" ? storedKey : JSON.stringify(storedKey));
                          triggerToast(`✨ 已連通 ${connectProvider}（使用預設模型清單）`);
                        }
                      }
                      setApiKeyInput("");
                      if (connectProvider === "DeepSeek") {
                        setBaseUrlInput("https://api.deepseek.com");
                      } else if (connectProvider === "GPT") {
                        setBaseUrlInput("https://api.openai.com/v1");
                      } else if (connectProvider === "Claude") {
                        setBaseUrlInput("https://api.anthropic.com");
                      } else if (connectProvider === "MiniMax") {
                        setBaseUrlInput("https://api.minimax.chat/v1");
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "#10B981",
                      border: "none",
                      color: "#fff",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(16,185,129,0.15)",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#059669"}
                    onMouseLeave={e => e.currentTarget.style.background = "#10B981"}
                  >
                    連線獲取模型清單
                  </button>
                </div>
              </div>

              {/* Form 2: 手動新增特定模型代碼 */}
              <div style={{ background: "rgba(197, 160, 89, 0.02)", border: "0.5px solid rgba(197, 160, 89, 0.15)", borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMid }}>✍️ 手動新增單一特定模型代碼</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={newModelProvider}
                      onChange={e => setNewModelProvider(e.target.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "0.5px solid rgba(197, 160, 89, 0.25)",
                        background: "#FFFDFB",
                        color: T.text,
                        fontSize: 12,
                        outline: "none",
                        cursor: "pointer",
                        width: 100
                      }}
                    >
                      <option value="DeepSeek">DeepSeek</option>
                      <option value="MiniMax">MiniMax</option>
                      <option value="Claude">Claude</option>
                      <option value="GPT">GPT</option>
                    </select>

                    <input 
                      type="text"
                      placeholder="輸入自訂代碼 (如 deepseek-chat)"
                      value={newModelName}
                      onChange={e => setNewModelName(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "0.5px solid rgba(197, 160, 89, 0.25)",
                        background: "#FFFDFB",
                        color: T.text,
                        fontSize: 12,
                        outline: "none"
                      }}
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!newModelName.trim()) {
                        alert("⚠️ 請輸入有效的自訂模型名稱！");
                        return;
                      }
                      dispatch({ type: "ADD_CUSTOM_MODEL", name: newModelName.trim().toLowerCase(), provider: newModelProvider });
                      triggerToast(`✨ 已成功連線並加入外部模型「${newModelName.trim()}」！`);
                      setNewModelName("");
                    }}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: T.gold,
                      border: "none",
                      color: "#fff",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(197,160,89,0.15)",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.goldDark}
                    onMouseLeave={e => e.currentTarget.style.background = T.gold}
                  >
                    連線新增特定模型
                  </button>
                </div>
              </div>
            </div>

            {/* 自訂模型列表 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textGhost, letterSpacing: 0.5 }}>已連接之外部擴充模型 (點擊可立即切換為預設 API 模型)</div>
              
              {state.customModels && state.customModels.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {state.customModels.map((m: any) => {
                    const isSelected = state.apiModel === m.name;
                    return (
                      <div 
                        key={m.id}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          background: isSelected ? "#FFFDF6" : "#FFFDFB",
                          border: `0.5px solid ${isSelected ? T.gold : "rgba(220, 215, 206, 0.4)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          boxShadow: "0 2px 6px rgba(61,46,26,0.01)"
                        }}
                      >
                        {/* 供應商標籤 */}
                        <span 
                          style={{
                            fontSize: 9,
                            fontWeight: "bold",
                            color: m.provider === "DeepSeek" ? "#2563EB" : (m.provider === "Claude" ? "#D97706" : (m.provider === "GPT" ? "#10B981" : "#8B5CF6")),
                            background: m.provider === "DeepSeek" ? "rgba(37,99,235,0.08)" : (m.provider === "Claude" ? "rgba(217,119,6,0.08)" : (m.provider === "GPT" ? "rgba(16,185,129,0.08)" : "rgba(139,92,246,0.08)")),
                            border: `0.5px solid ${m.provider === "DeepSeek" ? "rgba(37,99,235,0.2)" : (m.provider === "Claude" ? "rgba(217,119,6,0.2)" : (m.provider === "GPT" ? "rgba(16,185,129,0.2)" : "rgba(139,92,246,0.2)"))}`,
                            padding: "2px 6px",
                            borderRadius: 99,
                            textTransform: "uppercase"
                          }}
                        >
                          {m.provider}
                        </span>

                        {/* 模型名稱代碼 */}
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1, fontFamily: "monospace" }}>
                          {m.name}
                        </span>

                        {/* 選用按鈕 */}
                        <button
                          onClick={() => {
                            dispatch({ type: "SET_API_MODEL", val: m.name });
                            triggerToast(`💡 已成功切換 API 模型為「${m.name}」！`);
                          }}
                          style={{
                            border: "none",
                            background: isSelected ? T.gold : "rgba(0,0,0,0.03)",
                            color: isSelected ? "#fff" : T.textMid,
                            fontSize: 10,
                            fontWeight: "bold",
                            padding: "3px 10px",
                            borderRadius: 6,
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          {isSelected ? "✓ 已選用" : "選用"}
                        </button>

                        {/* 獨立拔除/刪除按鈕 */}
                        <button
                          onClick={() => {
                            dispatch({ type: "DELETE_CUSTOM_MODEL", id: m.id });
                            triggerToast(`🗑️ 已拔除自訂模型「${m.name}」！`);
                            if (isSelected) {
                              dispatch({ type: "SET_API_MODEL", val: "gemini-2.5-flash" });
                            }
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#CB8B85",
                            fontSize: 12,
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: 4,
                            fontWeight: "bold"
                          }}
                          title="拔除此自訂擴充模型"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "20px 12px", border: `1px dashed rgba(220, 215, 206, 0.6)`, borderRadius: 12, color: T.textGhost, fontSize: 11, textAlign: "center", fontStyle: "italic", background: "rgba(255,255,255,0.2)" }}>
                  (無連接的外部擴充模型，請於上方表單新增)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: UI視覺與美學特效 */}
        <div 
          style={{
            background: "rgba(255, 255, 255, 0.75)",
            backdropFilter: `blur(${state.glassmorphismBlur ?? 12}px)`,
            border: "0.5px solid rgba(197, 160, 89, 0.2)",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 10px 30px rgba(138, 110, 62, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: 18
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(220, 215, 206, 0.4)", paddingBottom: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A6E3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.0234 19.1648 5.09341 19.3986 5.03923 19.6258L4.6 21.5L6.47417 21.0658C6.70138 21.0116 6.93518 21.0816 7.1 21.2464C8.80376 22.9097 10.2745 22 12 22Z" />
            </svg>
            <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "#3D2E1A", margin: 0 }}>UI 視覺與美學特效</h2>
          </div>

          {/* Glassmorphism Blur Strength */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMid }}>毛玻璃模糊特效強度 (Glassmorphism)</label>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.goldDark, background: T.goldLight, padding: "2px 8px", borderRadius: 10 }}>
                {state.glassmorphismBlur ?? 12} px
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="30" 
              step="1" 
              value={state.glassmorphismBlur ?? 12}
              onChange={e => dispatch({ type: "SET_GLASS_BLUR", val: parseInt(e.target.value) })}
              style={{
                width: "100%",
                accentColor: T.gold,
                cursor: "pointer",
                margin: "4px 0"
              }}
            />
            <span style={{ fontSize: 10, color: T.textGhost }}>
              調節面板、側邊欄及背景毛玻璃效果的模糊層次感。
            </span>
          </div>

          {/* Hide Home Cover Switch */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(197, 160, 89, 0.04)", padding: "12px 14px", borderRadius: 14, border: "0.5px solid rgba(197, 160, 89, 0.15)", marginTop: 6 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMid }}>隱藏主頁面個人封面與資訊</label>
              <span style={{ fontSize: 9.5, color: T.textGhost }}>
                開啟後將隱藏主畫面頂部的 Stripe/Notion 風格封面與個人 YC 頭像資訊欄，使版面更為緊湊。
              </span>
            </div>
            <button 
              onClick={() => dispatch({ type: "SET_HIDE_HOME_COVER", val: !state.hideHomeCover })}
              style={{
                width: 44,
                height: 22,
                borderRadius: 11,
                background: state.hideHomeCover ? T.gold : "rgba(220, 215, 206, 0.6)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                padding: 0,
                outline: "none"
              }}
            >
              <div 
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 2,
                  left: state.hideHomeCover ? 24 : 2,
                  transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                }}
              />
            </button>
          </div>

          {/* Font Family selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMid }}>全站字體美學風格</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { id: "Georgia Serif", label: "大氣經典襯線 (Georgia)", font: "Georgia, serif" },
                { id: "'Inter', sans-serif", label: "現代優雅無襯線 (Inter)", font: "'Inter', sans-serif" },
                { id: "'Outfit', sans-serif", label: "高奢圓潤無襯線 (Outfit)", font: "'Outfit', sans-serif" },
                { id: "system-ui, sans-serif", label: "極簡系統預設 (System)", font: "system-ui, sans-serif" }
              ].map(f => {
                const isSel = state.fontFamily === f.id;
                return (
                  <div 
                    key={f.id}
                    onClick={() => dispatch({ type: "SET_FONT_FAMILY", val: f.id })}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: `1.5px solid ${isSel ? T.gold : "rgba(220, 215, 206, 0.4)"}`,
                      background: isSel ? "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)" : "#FFFDFB",
                      color: isSel ? T.goldDark : T.text,
                      cursor: "pointer",
                      fontSize: 11.5,
                      fontWeight: isSel ? 700 : 500,
                      fontFamily: f.font,
                      textAlign: "center",
                      boxShadow: isSel ? "0 4px 10px rgba(197,160,89,0.06)" : "none",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => { if(!isSel) e.currentTarget.style.borderColor = "rgba(197, 160, 89, 0.5)"; }}
                    onMouseLeave={e => { if(!isSel) e.currentTarget.style.borderColor = "rgba(220, 215, 206, 0.4)"; }}
                  >
                    {f.label}
                  </div>
                );
              })}
            </div>
            <div 
              style={{
                marginTop: 8,
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(197, 160, 89, 0.04)",
                border: "0.5px solid rgba(197, 160, 89, 0.15)",
                fontSize: 11,
                color: T.textMid,
                lineHeight: 1.5
              }}
            >
              <strong>即時美學預覽：</strong><br />
              「在低飽和度的法式莫蘭迪色調中，Muse AI 將以最優雅的身姿，承載您的每一個奇思妙想。」
            </div>
          </div>
        </div>

        {/* Section 3: 資料備份與恢復 */}
        <div 
          style={{
            background: "rgba(255, 255, 255, 0.75)",
            backdropFilter: `blur(${state.glassmorphismBlur ?? 12}px)`,
            border: "0.5px solid rgba(197, 160, 89, 0.2)",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 10px 30px rgba(138, 110, 62, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(220, 215, 206, 0.4)", paddingBottom: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A6E3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "#3D2E1A", margin: 0 }}>全站數據備份與管理</h2>
          </div>

          <p style={{ fontSize: 11, color: T.textGhost, lineHeight: 1.5, margin: 0 }}>
            您可以將當前 Muse AI 的完整智能狀態（包含所有對話紀錄、企劃案項目、個人記憶庫、已生成的藝術圖庫及設置偏好）安全導出至本地進行保存，或在全新設備上隨時匯入恢復。
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            {/* Export data button */}
            <button 
              onClick={handleExportData}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#FFFDFB",
                border: "0.5px solid rgba(197, 160, 89, 0.4)",
                fontSize: 12,
                fontWeight: 700,
                color: T.goldDark,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 2px 6px rgba(197, 160, 89, 0.04)",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.goldLight; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#FFFDFB"; }}
            >
              <span>📦</span> 導出當前全站數據 (Download JSON)
            </button>

            {/* Import data button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)",
                border: "0.5px solid rgba(197, 160, 89, 0.3)",
                fontSize: 12,
                fontWeight: 700,
                color: T.goldDark,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(197, 160, 89, 0.06)",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#FEEFDD"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)"; }}
            >
              <span>📥</span> 匯入舊有備份數據 (Upload JSON)
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportData}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {/* Section 4: 系統快取與引導 */}
        <div 
          style={{
            background: "rgba(255, 255, 255, 0.75)",
            backdropFilter: `blur(${state.glassmorphismBlur ?? 12}px)`,
            border: "0.5px solid rgba(197, 160, 89, 0.2)",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 10px 30px rgba(138, 110, 62, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(220, 215, 206, 0.4)", paddingBottom: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A6E3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "#3D2E1A", margin: 0 }}>系統引導與安全工具</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Guide activation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: T.textMid }}>重新啟動歡迎視窗</span>
                <span style={{ fontSize: 10, color: T.textGhost }}>重置對話首頁的系統操作導引視窗。</span>
              </div>
              <button 
                onClick={handleReenableWelcome}
                style={{
                  padding: "7px 12px",
                  borderRadius: 10,
                  background: "#FFFDFB",
                  border: `0.5px solid ${T.border}`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textMid,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                啟用歡迎引導
              </button>
            </div>

            {/* Crash Simulation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderTop: "0.5px solid rgba(220, 215, 206, 0.3)", paddingTop: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: T.textMid }}>前端崩潰壓力測試</span>
                <span style={{ fontSize: 10, color: T.textGhost }}>模擬拋出 JS 致命異常，測試系統容錯性。</span>
              </div>
              <button 
                onClick={handleSimulateCrash}
                style={{
                  padding: "7px 12px",
                  borderRadius: 10,
                  background: "#FEF2F2",
                  border: "0.5px solid #FCA5A5",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#DC2626",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                模擬系統崩潰
              </button>
            </div>

            {/* Factory Reset */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderTop: "0.5px solid rgba(220, 215, 206, 0.3)", paddingTop: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626" }}>重設所有全站快取</span>
                <span style={{ fontSize: 10, color: T.textGhost }}>清除全部聊天紀錄與企劃案，還原預設初始狀態。</span>
              </div>
              <button 
                onClick={() => setShowResetConfirm(true)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 10,
                  background: "#DC2626",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 3px 8px rgba(220,38,38,0.15)"
                }}
              >
                一鍵重設系統
              </button>
            </div>
          </div>
        </div>

        {/* Bento Grid Card: 🔮 技能智庫主控台 */}
        <div 
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(254, 243, 199, 0.25) 100%)",
            backdropFilter: `blur(${state.glassmorphismBlur ?? 12}px)`,
            border: "0.5px solid rgba(197, 160, 89, 0.3)",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 10px 30px rgba(138, 110, 62, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div 
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              background: "radial-gradient(circle, rgba(197, 160, 89, 0.15) 0%, transparent 70%)",
              pointerEvents: "none"
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(220, 215, 206, 0.4)", paddingBottom: 10 }}>
            <span style={{ fontSize: 20 }}>🔮</span>
            <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "#3D2E1A", margin: 0 }}>技能智庫主控台 (Skills Console)</h2>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, color: T.goldDark, background: T.goldLight, padding: "2px 8px", borderRadius: 10 }}>
              Morandi Core
            </span>
          </div>

          <p style={{ fontSize: 11, color: T.textGhost, lineHeight: 1.5, margin: 0 }}>
            啟用或停用 Muse AI 的 6 大高階協同技能。已啟用的技能專業指令將自動注入到每次對話的系統 Prompt 中，不論在一般聊天或 Workspace 企劃專案中皆會精準遵守。
          </p>

          {/* 簡化預覽列 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, background: "rgba(255, 255, 255, 0.4)", padding: 10, borderRadius: 16, border: "0.5px solid rgba(220, 215, 206, 0.3)" }}>
            {SKILLS_LIST.map(skill => {
              const isActive = !!state.enabledSkills?.[skill.key];
              return (
                <div 
                  key={skill.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 6px",
                    borderRadius: 8,
                    background: isActive ? "rgba(197, 160, 89, 0.08)" : "transparent",
                    border: `0.5px solid ${isActive ? "rgba(197, 160, 89, 0.25)" : "transparent"}`,
                    transition: "all 0.2s"
                  }}
                >
                  <span style={{ fontSize: 12 }}>{skill.icon}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: isActive ? T.goldDark : T.textGhost, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {skill.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowSkillsModal(true)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              background: T.gold,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(197, 160, 89, 0.2)",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.goldDark; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.gold; }}
          >
            🔮 開啟技能智庫主控台
          </button>
        </div>

        {/* Section 5: 關於 Muse AI / About Muse AI */}
        <div 
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 249, 238, 0.7) 100%)",
            backdropFilter: `blur(${state.glassmorphismBlur ?? 12}px)`,
            border: "0.5px solid rgba(197, 160, 89, 0.35)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(138, 110, 62, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            gridColumn: isMobile ? "span 1" : "span 2",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div 
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              width: 100,
              height: 100,
              background: "radial-gradient(circle, rgba(197, 160, 89, 0.1) 0%, transparent 70%)",
              pointerEvents: "none"
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "0.5px solid rgba(197, 160, 89, 0.25)", paddingBottom: 12 }}>
            <span style={{ fontSize: 20 }}>✦</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "#3D2E1A", margin: 0, letterSpacing: 0.5 }}>關於 Muse AI</h2>
              <span style={{ fontSize: 9.5, color: T.textGhost, fontWeight: 700, letterSpacing: 1 }}>ABOUT MUSE AI</span>
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: T.goldDark, background: "rgba(197, 160, 89, 0.12)", padding: "3px 10px", borderRadius: 12 }}>
              v3.6.2 Premium
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 20, alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 12.5, color: "#3D2E1A", fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
                Muse AI is developed by Musedini. <br />
                <span style={{ color: T.goldDark, fontWeight: 700 }}>Muse AI 由 Musedini 開發。</span>
              </p>
              <p style={{ fontSize: 11, color: T.textGhost, margin: 0, lineHeight: 1.5 }}>
                以法式莫蘭迪美學與前沿 AI 引擎為核心打造的高端智能企劃與靈感共創空間。本軟體的所有技術架構、UI 設計與演算法整合均由 Musedini 研發與維護。
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
              <button 
                onClick={() => setShowLegalModal?.('privacy')}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: "transparent",
                  border: "0.5px solid rgba(197, 160, 89, 0.4)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: T.goldDark,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(197, 160, 89, 0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <span>📜</span> 隱私權政策
              </button>
              <button 
                onClick={() => setShowLegalModal?.('terms')}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: "transparent",
                  border: "0.5px solid rgba(197, 160, 89, 0.4)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: T.goldDark,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(197, 160, 89, 0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <span>⚖️</span> 服務條款
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", borderTop: "0.5px solid rgba(220, 215, 206, 0.4)", paddingTop: 12, marginTop: 4 }}>
            <span style={{ fontSize: 10.5, color: T.textGhost, fontStyle: "italic", letterSpacing: 0.5 }}>
              © 2026 Muse AI by Musedini. All rights reserved.
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Overlay for Resetting */}
      {showResetConfirm && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(61, 46, 26, 0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 999999,
            animation: "resetFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes resetFadeIn {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `}} />
          <div 
            style={{
              background: "#fff",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              boxShadow: "0 20px 48px rgba(61,46,26,0.12)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              textAlign: "center"
            }}
          >
            <span style={{ fontSize: 36 }}>🚨</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#DC2626", margin: 0 }}>確認重設系統至預設狀態？</h3>
              <p style={{ fontSize: 11.5, color: T.textGhost, margin: 0, lineHeight: 1.5 }}>
                本操作極具破壞性且無法復原。這將永久刪除您所有的對話頻道、建立的企劃案文件、個人長期記憶節點及所有的打卡生活習慣。建議先下載備份！
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 8 }}>
              <button 
                onClick={handleResetState}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#DC2626",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 3px 8px rgba(220,38,38,0.2)"
                }}
              >
                確認清除所有數據，重設系統
              </button>
              <button 
                onClick={handleExportData}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#FFFDFB",
                  border: `0.5px solid ${T.border}`,
                  color: T.textMid,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                先下載備份 JSON 數據
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)}
                style={{
                  width: "100%",
                  padding: "6px 14px",
                  borderRadius: 12,
                  background: "transparent",
                  border: "none",
                  color: T.textGhost,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔮 技能智庫高奢莫蘭迪半透明霧玻璃彈窗 */}
      {showSkillsModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(61, 46, 26, 0.45)",
            backdropFilter: "blur(15px)",
            WebkitBackdropFilter: "blur(15px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? 12 : 24,
            animation: "modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
          onClick={() => setShowSkillsModal(false)}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes modalFadeIn {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
            @keyframes sheetSlideUp {
              0% { transform: translateY(40px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
          `}} />
          <div 
            style={{
              width: "100%",
              maxWidth: 580,
              background: "rgba(255, 253, 250, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "0.5px solid rgba(197, 160, 89, 0.35)",
              borderRadius: 28,
              padding: isMobile ? "20px 16px" : "24px 28px",
              boxShadow: "0 20px 50px rgba(61, 46, 26, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              maxHeight: "90vh",
              boxSizing: "border-box",
              animation: "sheetSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid rgba(220, 215, 206, 0.4)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>🔮</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#3D2E1A", margin: 0 }}>技能智庫主控台</h2>
                  <span style={{ fontSize: 9.5, color: T.textGhost, fontWeight: 700, letterSpacing: 1 }}>MUSE AI SKILLS CONSOLE</span>
                </div>
              </div>
              <button 
                onClick={() => setShowSkillsModal(false)}
                style={{
                  border: "none",
                  background: "rgba(61, 46, 26, 0.05)",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: "bold",
                  color: T.textGhost,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {/* Skills List Container */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: "auto", 
                display: "flex", 
                flexDirection: "column", 
                gap: 14,
                paddingRight: 4
              }}
            >
              {SKILLS_LIST.map(skill => {
                const isActive = !!state.enabledSkills?.[skill.key];
                return (
                  <div 
                    key={skill.key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      padding: 14,
                      borderRadius: 20,
                      background: isActive ? "linear-gradient(135deg, rgba(255, 253, 245, 0.9) 0%, rgba(254, 243, 199, 0.25) 100%)" : "rgba(255, 255, 255, 0.4)",
                      border: `0.5px solid ${isActive ? "rgba(197, 160, 89, 0.35)" : "rgba(220, 215, 206, 0.3)"}`,
                      boxShadow: isActive ? "0 4px 15px rgba(197, 160, 89, 0.04)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    <div 
                      style={{ 
                        fontSize: 22, 
                        width: 40, 
                        height: 40, 
                        borderRadius: 12, 
                        background: isActive ? "rgba(197, 160, 89, 0.12)" : "rgba(61, 46, 26, 0.03)", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        border: `0.5px solid ${isActive ? "rgba(197, 160, 89, 0.2)" : "rgba(220, 215, 206, 0.15)"}`
                      }}
                    >
                      {skill.icon}
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isActive ? T.goldDark : "#3D2E1A" }}>
                        {skill.name}
                      </span>
                      <span style={{ fontSize: 10.5, color: T.textGhost, lineHeight: 1.4 }}>
                        {skill.desc}
                      </span>
                    </div>

                    {/* iOS-style toggle button */}
                    <div 
                      onClick={() => dispatch({ type: "TOGGLE_SKILL", skillKey: skill.key })}
                      style={{
                        width: 42,
                        height: 22,
                        borderRadius: 11,
                        background: isActive ? T.gold : "rgba(220, 215, 206, 0.6)",
                        position: "relative",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        alignSelf: "center",
                        flexShrink: 0
                      }}
                    >
                      <div 
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#fff",
                          position: "absolute",
                          top: 2,
                          left: isActive ? 22 : 2,
                          transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{ borderTop: "0.5px solid rgba(220, 215, 206, 0.4)", paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowSkillsModal(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 12,
                  background: T.gold,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(197,160,89,0.15)"
                }}
              >
                確 定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AiPersonaView({ state, dispatch, isMobile }: any) {
  return (
    <div 
      style={{
        flex: 1,
        padding: isMobile ? "16px 12px" : "32px 40px",
        overflowY: "auto",
        background: "linear-gradient(135deg, #FAF8F5 0%, #E6DFD5 100%)",
        fontFamily: "'Outfit', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        boxSizing: "border-box"
      }}
    >
      {/* Title Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* 🔮 Desktop Back to Chat Button */}
          {!isMobile && (
            <button 
              onClick={() => dispatch({ type: "SET_NAV", view: "chat" })}
              style={{
                background: "#fff",
                border: "0.5px solid rgba(197, 160, 89, 0.45)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: T.goldDark,
                boxShadow: "0 2px 8px rgba(197, 160, 89, 0.08)",
                transition: "all 0.2s",
                outline: "none",
                flexShrink: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = T.goldLight;
                e.currentTarget.style.transform = "translateX(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateX(0)";
              }}
              title="返回對話頁面"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          )}
          <span style={{ fontSize: 24 }}>🎭</span>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#3D2E1A", margin: 0, fontFamily: "'Georgia', serif" }}>
            專屬 AI 角色設定
          </h1>
        </div>
        <p style={{ fontSize: 11.5, color: T.textGhost, margin: 0, letterSpacing: 0.5 }}>
          MUSE AI CUSTOM ASSISTANT PERSONA / 為您的智慧伴侶訂製獨特的靈魂特質與精緻光彩
        </p>
      </div>

      <div style={{ borderBottom: `0.5px solid ${T.borderLight}`, width: "100%" }} />

      {/* Main Settings Card */}
      <div 
        style={{
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: `blur(${state.glassmorphismBlur ?? 12}px)`,
          border: "0.5px solid rgba(197, 160, 89, 0.2)",
          borderRadius: 24,
          padding: isMobile ? 16 : 24,
          boxShadow: "0 10px 30px rgba(138, 110, 62, 0.03)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: 680
        }}
      >
        <p style={{ fontSize: 11.5, color: T.textMid, lineHeight: 1.6, margin: 0 }}>
          在此為您的專屬 AI 智慧助理賦予獨特的人格特質、星座、頭像，並隨心所欲地自訂其對話框與文字色彩，打造全宇宙最溫暖、最具陪伴感的靈魂伴侶。
        </p>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {/* Assistant Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>智慧伴侶稱呼</label>
            <input 
              type="text"
              value={state.aiAssistant?.name || "Muse AI 智慧伴侶"}
              onChange={e => dispatch({ type: "UPDATE_AI_ASSISTANT", aiAssistant: { name: e.target.value } })}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "0.5px solid rgba(197, 160, 89, 0.25)",
                background: "#FFFDFB",
                color: T.text,
                fontSize: 12,
                outline: "none"
              }}
            />
          </div>

          {/* Assistant Horoscope/Constellation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>守護星座 (影響性格深度)</label>
            <select
              value={state.aiAssistant?.constellation || "雙子座"}
              onChange={e => dispatch({ type: "UPDATE_AI_ASSISTANT", aiAssistant: { constellation: e.target.value } })}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "0.5px solid rgba(197, 160, 89, 0.25)",
                background: "#FFFDFB",
                color: T.text,
                fontSize: 12,
                outline: "none",
                cursor: "pointer"
              }}
            >
              {["牡羊座", "金牛座", "雙子座", "巨蟹座", "獅子座", "處女座", "天秤座", "天蠍座", "射手座", "摩羯座", "水瓶座", "雙魚座"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Personality Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>性格與風格設定 (打勾只能擇一)</label>
          {(() => {
            const presets = [
              { key: "default", label: "預設 🪐", desc: "預設" },
              { key: "gentle", label: "溫柔貼心 💖", desc: "溫柔、貼心、善解人意" },
              { key: "lively", label: "活潑開朗 ☀️", desc: "活潑、熱情、充滿陽光" },
              { key: "humorous", label: "幽默風趣 🎨", desc: "風趣、機智、經常開玩笑" },
              { key: "calm", label: "冷靜理性 🧠", desc: "冷靜、睿智、邏輯分析" },
              { key: "tsundere", label: "傲嬌軟萌 🐱", desc: "帶點小傲嬌、嘴硬心軟、軟萌可愛" }
            ];

            const currentDesc = state.aiAssistant?.personality || "預設";
            // Determine active preset
            const activePreset = presets.find(p => p.desc === currentDesc) || presets[0]; // defaults to default if not matched
            const activeKey = activePreset.key;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Checkboxes Grid */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 10 }}>
                  {presets.map(p => {
                    const isSelected = activeKey === p.key;
                    return (
                      <div 
                        key={p.key}
                        onClick={() => {
                          dispatch({ type: "UPDATE_AI_ASSISTANT", aiAssistant: { personality: p.desc } });
                        }}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: `1.5px solid ${isSelected ? T.gold : "rgba(197, 160, 89, 0.25)"}`,
                          background: isSelected ? "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)" : "#FFFDFB",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 4px 10px rgba(197,160,89,0.06)" : "none"
                        }}
                        onMouseEnter={e => { if(!isSelected) e.currentTarget.style.borderColor = "rgba(197, 160, 89, 0.6)"; }}
                        onMouseLeave={e => { if(!isSelected) e.currentTarget.style.borderColor = "rgba(197, 160, 89, 0.25)"; }}
                      >
                        <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 500, color: isSelected ? T.goldDark : T.text }}>
                          {p.label}
                        </span>
                        
                        {/* Round Checkbox tick mark indicator */}
                        <div style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: isSelected ? "none" : "1.5px solid rgba(197, 160, 89, 0.4)",
                          background: isSelected ? T.gold : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          color: "#fff",
                          fontWeight: "bold",
                          flexShrink: 0
                        }}>
                          {isSelected && "✓"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Avatar Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>智慧伴侶頭像與外觀</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Current Avatar Preview */}
            <div style={{ flexShrink: 0 }}>
              {state.aiAssistant?.avatar && state.aiAssistant.avatar.startsWith("data:image") ? (
                <img 
                  src={state.aiAssistant.avatar} 
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.gold}` }} 
                />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.goldLight, border: `2px solid ${T.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  {state.aiAssistant?.avatar || "🪐"}
                </div>
              )}
            </div>

            {/* Preset Emojis & Upload */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {["🪐", "🦉", "🦢", "🦊", "🦄"].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => dispatch({ type: "UPDATE_AI_ASSISTANT", aiAssistant: { avatar: emoji } })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: state.aiAssistant?.avatar === emoji ? `1.5px solid ${T.gold}` : "0.5px solid rgba(220,215,206,0.8)",
                      background: state.aiAssistant?.avatar === emoji ? "#FFFDF9" : "#ffffff",
                      fontSize: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div>
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          dispatch({ type: "UPDATE_AI_ASSISTANT", aiAssistant: { avatar: reader.result as string } });
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#FFFDFB",
                    border: "0.5px solid rgba(197, 160, 89, 0.4)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.goldDark,
                    cursor: "pointer"
                  }}
                >
                  📸 上傳自訂大頭照
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Color Theme Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: T.textMid }}>智慧伴侶對話框配色主題 (採用系統高奢配色)</label>
          {(() => {
            const colorThemes = [
              { name: "暖沙香檳 🪵", bg: "#FAF3F0", text: "#3E3532", border: "#C68B7F", desc: "暖金玫瑰色調，溫暖體貼" },
              { name: "靜謐清灰 🌫️", bg: "#FAF6F5", text: "#6B5A57", border: "#E1D7D4", desc: "燕麥清灰質感，冷靜睿智" },
              { name: "優雅珊瑚 🌸", bg: "#FFFDFB", text: "#945B50", border: "#CB8B85", desc: "溫柔莫蘭迪粉，靈動活潑" },
              { name: "春分草木 🌿", bg: "#FAFBF9", text: "#3A4F44", border: "#8FA89B", desc: "自然鼠尾草綠，清爽舒緩" }
            ];

            const currentBg = state.aiAssistant?.bubbleBg || "#FAF3F0";
            const currentText = state.aiAssistant?.bubbleText || "#3E3532";
            const currentBorder = state.aiAssistant?.bubbleBorder || "#C68B7F";

            // Find matching preset, default to Warm Champagne
            const activeTheme = colorThemes.find(t => t.bg === currentBg && t.text === currentText && t.border === currentBorder) || colorThemes[0];

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 11.5, color: T.textGhost, margin: 0, letterSpacing: 0.2 }}>
                  已為您鎖定專利高奢配色方案，採用本站主頁及背景經典灰調與莫蘭迪色，免除繁瑣調色困擾。
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12 }}>
                  {colorThemes.map(theme => {
                    const isSelected = activeTheme.name === theme.name;
                    return (
                      <div
                        key={theme.name}
                        onClick={() => {
                          dispatch({ 
                            type: "UPDATE_AI_ASSISTANT", 
                            aiAssistant: { bubbleBg: theme.bg, bubbleText: theme.text, bubbleBorder: theme.border } 
                          });
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 14,
                          border: `1.5px solid ${isSelected ? T.gold : "rgba(197, 160, 89, 0.2)"}`,
                          background: isSelected ? "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)" : "#FFFDFB",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 4px 10px rgba(197,160,89,0.06)" : "none"
                        }}
                        onMouseEnter={e => { if(!isSelected) e.currentTarget.style.borderColor = "rgba(197, 160, 89, 0.5)"; }}
                        onMouseLeave={e => { if(!isSelected) e.currentTarget.style.borderColor = "rgba(197, 160, 89, 0.2)"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? T.goldDark : T.text }}>
                            {theme.name}
                          </span>
                          
                          {/* Round Checkbox indicator */}
                          <div style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: isSelected ? "none" : "1.5px solid rgba(197, 160, 89, 0.4)",
                            background: isSelected ? T.gold : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            color: "#fff",
                            fontWeight: "bold",
                            flexShrink: 0
                          }}>
                            {isSelected && "✓"}
                          </div>
                        </div>

                        {/* Theme Colors Preview Row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {/* Bg circle */}
                            <div title="對話框背景" style={{ width: 14, height: 14, borderRadius: "50%", background: theme.bg, border: "0.5px solid rgba(0,0,0,0.08)" }} />
                            {/* Text circle */}
                            <div title="文字顏色" style={{ width: 14, height: 14, borderRadius: "50%", background: theme.text, border: "0.5px solid rgba(0,0,0,0.08)" }} />
                            {/* Border circle */}
                            <div title="邊框/金邊" style={{ width: 14, height: 14, borderRadius: "50%", background: theme.border, border: "0.5px solid rgba(0,0,0,0.08)" }} />
                          </div>
                          <span style={{ fontSize: 9.5, color: T.textGhost, marginLeft: "auto" }}>
                            {theme.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Instant Live Preview */}
        <div style={{
          background: state.aiAssistant?.bubbleBg || T.bgCard,
          border: `0.5px solid ${state.aiAssistant?.bubbleBorder || T.border}`,
          borderLeft: `2.5px solid ${state.aiAssistant?.bubbleBorder || T.gold}`,
          borderRadius: 14,
          padding: "10px 14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
          marginTop: 4
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            {state.aiAssistant?.avatar && state.aiAssistant.avatar.startsWith("data:image") ? (
              <img src={state.aiAssistant.avatar} style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 11 }}>{state.aiAssistant?.avatar || "🪐"}</span>
            )}
            <span style={{ fontSize: 9.5, fontWeight: 700, color: state.aiAssistant?.bubbleText || T.text }}>
              {state.aiAssistant?.name || "Muse AI 智慧伴侶"}
            </span>
            {state.aiAssistant?.constellation && (
              <span style={{ fontSize: 8, background: T.goldLight, color: T.goldDark, padding: "0 4px", borderRadius: 3, fontWeight: "bold" }}>
                {state.aiAssistant.constellation}
              </span>
            )}
            <span style={{ fontSize: 8, color: T.textGhost, marginLeft: "auto" }}>即時回覆效果預覽</span>
          </div>
          <p style={{ fontSize: 11.5, margin: 0, lineHeight: 1.45, color: state.aiAssistant?.bubbleText || T.text }}>
            「嗨！我是您的專屬智慧伴侶。我的守護星座是{state.aiAssistant?.constellation || "雙子座"}，性格設定為『{state.aiAssistant?.personality || "預設"}』。今天，有什麼我可以為您分憂或共同策劃的嗎？✨」
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🏰 BrandHubView: Musedini 品牌與法律合規中心
// ==========================================
export function BrandHubView({ state, dispatch, isMobile }: any) {
  const [activeTab, setActiveTab] = useState<"company" | "muse_ai" | "vibe" | "laws">("company");
  const [signatureName, setSignatureName] = useState("");
  const [signatureDate, setSignatureDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [pledgeMessage, setPledgeMessage] = useState("我承諾將本平台之智慧產出與數據分析（如 SimilarWeb 模擬器、Marp 簡報）作為學術或內部規劃研究參考，遵守智慧財產與本地隱私保障法規。");
  const [signedCert, setSignedCert] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  
  // Muse AI active swatches simulation
  const [activeSwatch, setActiveSwatch] = useState<number>(0);
  const swatches = [
    { name: "莫蘭迪粉金", hex: "#C68B7F", bg: "#FAF3F0" },
    { name: "禪意石墨", hex: "#3E3532", bg: "#F5F1EE" },
    { name: "歐若拉發光綠", hex: "#8FA89B", bg: "#FAF6F5" }
  ];

  // Vibe Social interactive whiteboards simulation
  const [whiteboards, setWhiteboards] = useState([
    { id: 1, title: "富士山跨年色彩靈感板 🗻", creator: "Alice", likes: 142, vibeCoins: 350 },
    { id: 2, title: "極簡包裝結構設計共創 📦", creator: "Bob", likes: 89, vibeCoins: 210 },
    { id: 3, title: "賽博發光綠產品升級藍圖 🌌", creator: "You", likes: 256, vibeCoins: 880 }
  ]);

  const handleSignTerms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) return;
    if (!agreedToTerms) return;

    const certNo = `MUSE-IP-${Math.floor(1000 + Math.random() * 9000)}`;
    setSignedCert({
      name: signatureName,
      date: signatureDate,
      certNo: certNo,
      message: pledgeMessage
    });
    
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4500);
  };

  return (
    <div className="theme-organic theme-box" style={{
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? "20px 16px" : "40px 48px",
      background: "#FAF8F5",
      fontFamily: "'Outfit', 'Playfair Display', serif"
    }}>
      
      {/* 🌟 Luxury Header Hero Section */}
      <div style={{
        position: "relative",
        borderRadius: 24,
        overflow: "hidden",
        height: isMobile ? "220px" : "320px",
        marginBottom: 32,
        boxShadow: "0 16px 45px -12px rgba(138, 110, 62, 0.15)",
        border: "0.5px solid rgba(197, 160, 89, 0.25)"
      }}>
        <img 
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80" 
          alt="Musedini Premium Heritage" 
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.72) contrast(1.05)" }}
        />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(61,46,26,0.2) 0%, rgba(61,46,26,0.85) 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: isMobile ? "24px 20px" : "40px 48px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, letterSpacing: 3, color: "#C5A059", fontWeight: 700, textTransform: "uppercase" }}>Musedini Heritage Portal</span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#C5A059" }} />
            <span style={{ fontSize: 11.5, color: "#FAF6F0", letterSpacing: 0.5 }}>企業、產品與法律合規中心</span>
          </div>
          <h1 className="theme-title" style={{
            fontSize: isMobile ? "26px" : "42px",
            fontWeight: 400,
            color: "#FAF6F0",
            margin: 0,
            lineHeight: 1.2,
            textShadow: "0 2px 10px rgba(0,0,0,0.15)"
          }}>
            探尋法式莫蘭迪美學與前沿 AI 科技之巔 ✦
          </h1>
        </div>
      </div>

      {/* 🌟 Tab Navigation Row (Glassmorphism Navbar) */}
      <div style={{
        display: "flex",
        justifyContent: isMobile ? "flex-start" : "center",
        overflowX: "auto",
        gap: 8,
        padding: "6px",
        background: "rgba(255, 255, 255, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "0.5px solid rgba(197, 160, 89, 0.22)",
        borderRadius: 16,
        marginBottom: 32,
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 8px 30px rgba(138, 110, 62, 0.04)"
      }}>
        {[
          { id: "company", label: "🏰 Musedini 企業主頁", sub: "ABOUT US" },
          { id: "muse_ai", label: "✨ Muse AI 產品旗艦", sub: "MUSE WORKSPACE" },
          { id: "vibe", label: "📱 Vibe Social 產品", sub: "VIBE NETWORK" },
          { id: "laws", label: "⚖️ 法律合規與資產中心", sub: "LEGAL STANDARDS" }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: isMobile ? "0 0 auto" : "1",
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                background: isSelected ? "#3D2E1A" : "transparent",
                color: isSelected ? "#FAF6F0" : "#6B5A57",
                cursor: "pointer",
                transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500 }}>{tab.label}</span>
              <span style={{ fontSize: 8, letterSpacing: 1, opacity: isSelected ? 0.7 : 0.5, textTransform: "uppercase" }}>{tab.sub}</span>
            </button>
          );
        })}
      </div>

      {/* 🌟 Tab Content Dispenser */}
      <div style={{ minHeight: "450px" }}>
        
        {/* 1. COMPANY HERITAGE TAB */}
        {activeTab === "company" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* Split Screen Introduction */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
              gap: 36,
              alignItems: "center"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M12 2v9M8 5h8" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: T.goldDark }}>MUSEDINI BRAND STATEMENT</span>
                </div>
                <h2 className="theme-title" style={{ fontSize: "28px", color: "#3D2E1A", fontWeight: 400, margin: 0 }}>
                  極致工藝、安全隱私與優雅美學之化身
                </h2>
                <p style={{ fontSize: 13.5, color: "#6B5A57", lineHeight: 1.8, margin: 0 }}>
                  <strong>Musedini</strong> 創立於 2026 年，是一家立足於「極致美學」與「隱私安全首要（Local-First Architecture）」的奢華科技創意研發工坊。我們深信，工具不應只是冰冷無感的技术拼湊，而應是用戶思想的優雅延伸與靈感共創夥伴。
                </p>
                <p style={{ fontSize: 13.5, color: "#6B5A57", lineHeight: 1.8, margin: 0 }}>
                  為此，Musedini 開拓了獨樹一幟的法式莫蘭迪視覺體系，並結合了高效的安全本地沙盒機制。我們旗下所有的系統（包括 Muse AI 智慧企劃工作區及 Vibe Social 密友社交網絡），均致力於將使用者的創作所有權、隱私權以及數據快取百分之百保存在使用者個人的裝置本機中。我們以此高標準的自我要求，重塑當代科技產品的隱私標準。
                </p>
                <div style={{
                  padding: "16px 20px",
                  borderLeft: `2.5px solid ${T.gold}`,
                  background: "#FFFDFB",
                  borderRadius: "0 14px 14px 0",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: T.goldDark,
                  lineHeight: 1.6
                }}>
                  “優雅，是唯一不會褪色的美。科技，是思想的優雅畫筆。” — Musedini 品牌宣言
                </div>
              </div>
              <div style={{
                borderRadius: 20,
                overflow: "hidden",
                border: "0.5px solid rgba(197, 160, 89, 0.22)",
                boxShadow: "0 12px 36px rgba(138, 110, 62, 0.08)",
                height: "300px"
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80" 
                  alt="Musedini Premium Atelier"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "0.5px solid rgba(220, 215, 206, 0.4)" }} />

            {/* Local-First Technology Sandbox Architecture Detail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 className="theme-title" style={{ fontSize: "20px", color: "#3D2E1A", margin: 0, fontWeight: 500 }}>
                🏰 獨家技術架構：Musedini Local-First 本地安全沙盒
              </h3>
              <p style={{ fontSize: 13, color: "#6B5A57", lineHeight: 1.7, margin: 0 }}>
                Musedini 捨棄了傳統 SaaS 平台將用戶隱私數據頻繁上傳至雲端進行大數據分析的隱私侵犯作法，創新採用了 **100% 本地安全儲存架構 (LocalStorage & IndexedDB Sandbox)**：
              </p>

              {/* Sandbox Diagram Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 20,
                marginTop: 8
              }}>
                <div style={{
                  background: "#FFFDFB",
                  padding: 20,
                  borderRadius: 16,
                  border: "0.5px solid rgba(197, 160, 89, 0.22)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(197, 160, 89, 0.12)", color: T.goldDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold" }}>
                    🔒
                  </div>
                  <h4 style={{ fontSize: 13.5, color: T.text, margin: 0, fontWeight: 700 }}>1. 本地數據不落地</h4>
                  <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
                    所有的聊天對話歷史、自訂 AI 人格、日常規劃日記、Vibe 密友相簿及手繪白板草稿，均預設寫入您本機的安全沙盒，絕不未經許可上傳。
                  </p>
                </div>

                <div style={{
                  background: "#FFFDFB",
                  padding: 20,
                  borderRadius: 16,
                  border: "0.5px solid rgba(197, 160, 89, 0.22)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(197, 160, 89, 0.12)", color: T.goldDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold" }}>
                    🔑
                  </div>
                  <h4 style={{ fontSize: 13.5, color: T.text, margin: 0, fontWeight: 700 }}>2. 金鑰端到端加密</h4>
                  <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
                    當您在設定中配置個人 API 金鑰（如 OpenAI, Gemini）時，金鑰經過加密後保存在本機，連線直接在裝置與 API 伺服器間進行，Musedini 伺服器絕不中轉。
                  </p>
                </div>

                <div style={{
                  background: "#FFFDFB",
                  padding: 20,
                  borderRadius: 16,
                  border: "0.5px solid rgba(197, 160, 89, 0.22)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(197, 160, 89, 0.12)", color: T.goldDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold" }}>
                    ⚡
                  </div>
                  <h4 style={{ fontSize: 13.5, color: T.text, margin: 0, fontWeight: 700 }}>3. 本地模擬引擎</h4>
                  <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
                    本系統的數據分析（例如 SimilarWeb 數據、靈感簽到 XP、Marp 簡報）均由 Musedini 自研的本地沙盒模擬引擎生成，確保無額外外部連線，兼具流暢與安全。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MUSE AI PRODUCT TAB */}
        {activeTab === "muse_ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "2fr 3fr",
              gap: 36,
              alignItems: "center"
            }}>
              <div style={{
                borderRadius: 20,
                overflow: "hidden",
                border: "0.5px solid rgba(197, 160, 89, 0.22)",
                boxShadow: "0 12px 36px rgba(138, 110, 62, 0.08)",
                height: "320px"
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80" 
                  alt="Muse AI Co-creation"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#C5A059" }}>✦</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: T.goldDark }}>MUSE AI FLAGSHIP SYSTEM</span>
                </div>
                <h2 className="theme-title" style={{ fontSize: "28px", color: "#3D2E1A", fontWeight: 400, margin: 0 }}>
                  Muse AI 高端智能企劃與美學工作區
                </h2>
                <p style={{ fontSize: 13.5, color: "#6B5A57", lineHeight: 1.7, margin: 0 }}>
                  **Muse AI** 是 Musedini 匠心獨運的個人企劃案工作區與靈感共創套件。它集成了六大專業協作技能智庫（包括 SimilarWeb 行銷分析、學筆記美化排版、Marp 投影片簡報編譯等），並內嵌法式低飽和度「Morandi 莫蘭迪暖調奶油風」網頁即時編譯沙盒，能將您每一次與 AI 的討論，以極緻優雅的排版直接導出。
                </p>

                {/* Swatches Switcher Simulation */}
                <div style={{
                  padding: "16px 20px",
                  background: swatches[activeSwatch].bg,
                  borderRadius: 16,
                  border: `1px solid rgba(197, 160, 89, 0.3)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "all 0.3s ease"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: T.textMid, fontWeight: "bold" }}>✦ 系統色彩主題：{swatches[activeSwatch].name}</span>
                    <span style={{ fontSize: 10, color: T.goldDark, background: "#fff", padding: "2px 8px", borderRadius: 10, border: "0.5px solid rgba(197,160,89,0.2)" }}>即時主題切換</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {swatches.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSwatch(idx)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: s.hex,
                          border: activeSwatch === idx ? "2.5px solid #3D2E1A" : "1px solid rgba(197,160,89,0.3)",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Muse AI Key Features Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 className="theme-title" style={{ fontSize: "18px", color: "#3D2E1A", margin: 0, fontWeight: 500 }}>
                ✨ Muse AI 卓越核心特色
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: 20
              }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 16, color: "#C5A059" }}>✦</div>
                  <div>
                    <h4 style={{ fontSize: 13, color: T.text, margin: "0 0 4px 0", fontWeight: 700 }}>莫蘭迪極致奶油風網頁編譯器</h4>
                    <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
                      所有生成的 React/HTML/CSS 代碼均注入高端奶油色調與精細星光邊框，支持長篇垂直滾動的呼吸留白，絕對禁用 Emoji 破壞質感，代之以幼線條 SVG。
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 16, color: "#C5A059" }}>✦</div>
                  <div>
                    <h4 style={{ fontSize: 13, color: T.text, margin: "0 0 4px 0", fontWeight: 700 }}>六大領域專業協作技能智庫</h4>
                    <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
                      可隨時開啟「SimilarWeb 行銷流量數據」、「Marp 簡報結構分析」、「GitHub Pages 前端大師」、「Git 團隊協作」等大廠 Tech Lead 級技能指令。
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 16, color: "#C5A059" }}>✦</div>
                  <div>
                    <h4 style={{ fontSize: 13, color: T.text, margin: "0 0 4px 0", fontWeight: 700 }}>智慧企劃沙盒文件導出</h4>
                    <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
                      本地中樞完美模擬微服務導出。內建 PDF 閱讀器、Excel 數據表視圖與 Marp 簡報投影片架構，支持一鍵本地快取導出為 TXT, CSV 等格式。
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 16, color: "#C5A059" }}>✦</div>
                  <div>
                    <h4 style={{ fontSize: 13, color: T.text, margin: "0 0 4px 0", fontWeight: 700 }}>多合一智慧生活陪伴日常</h4>
                    <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.5 }}>
                      除了專業工作，更包含 IG/小紅書/LinkedIn 創意工坊、同理心心情日記、連續簽到打卡習慣教練，以及依據使用歷史構建的長期記憶快取。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. VIBE SOCIAL PRODUCT TAB */}
        {activeTab === "vibe" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
              gap: 36,
              alignItems: "center"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#C5A059" }}>⚡</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: T.goldDark }}>VIBE SOCIAL SYSTEM</span>
                </div>
                <h2 className="theme-title" style={{ fontSize: "28px", color: "#3D2E1A", fontWeight: 400, margin: 0 }}>
                  Vibe Social 密友共創與靈感交互網絡
                </h2>
                <p style={{ fontSize: 13.5, color: "#6B5A57", lineHeight: 1.7, margin: 0 }}>
                  **Vibe Social** 是 Musedini 匠心打造的下世代密友共創社交元宇宙。有別於傳統社群平台的演算法焦慮與隱私轉售，Vibe 專注於親密密友之間的「靈感交互與色彩共振」。
                </p>
                <p style={{ fontSize: 13.5, color: "#6B5A57", lineHeight: 1.7, margin: 0 }}>
                  系統首創了 **「AI 創意異構牆 (Aether Image Collage)」** 與 **「共創相簿白板 (Shared Album Whiteboards)」**，創作者與其摯友可以在同一個手繪白板上實時塗鴉、拼接靈感大片、貼上色彩趨勢研調報告，並通過參與社群共創來收穫 **「Vibe 幣 (Vibe Coins)」**，在完全本機沙盒加密的安全保護下，享受純粹無壓力的分享樂趣。
                </p>
              </div>

              <div style={{
                borderRadius: 20,
                overflow: "hidden",
                border: "0.5px solid rgba(197, 160, 89, 0.22)",
                boxShadow: "0 12px 36px rgba(138, 110, 62, 0.08)",
                height: "300px"
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=600&q=80" 
                  alt="Vibe Social Interface"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "0.5px solid rgba(220, 215, 206, 0.4)" }} />

            {/* Interactive Vibe Whiteboard Table */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="theme-title" style={{ fontSize: "18px", color: "#3D2E1A", margin: 0, fontWeight: 500 }}>
                  🎨 熱門 Vibe 密友共創手繪白板
                </h3>
                <span style={{ fontSize: 11, color: T.textGhost }}>本機沙盒沙箱模擬數據</span>
              </div>

              <div style={{
                border: "1px solid rgba(220, 215, 206, 0.6)",
                borderRadius: 14,
                overflow: "hidden",
                background: "#fff"
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F3EBE6", borderBottom: "1px solid rgba(220, 215, 206, 0.6)", height: 36 }}>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700 }}>白板名稱</th>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700 }}>發起人</th>
                      <th style={{ padding: "8px 16px", textAlign: "right", fontWeight: 700 }}>熱度 (Likes)</th>
                      <th style={{ padding: "8px 16px", textAlign: "right", fontWeight: 700 }}>創作者 Vibe 幣收益</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whiteboards.map((board) => (
                      <tr key={board.id} style={{ borderBottom: "1px solid rgba(220, 215, 206, 0.3)", height: 34 }}>
                        <td style={{ padding: "8px 16px", color: T.text, fontWeight: 600 }}>{board.title}</td>
                        <td style={{ padding: "8px 16px", color: T.textMid }}>{board.creator}</td>
                        <td style={{ padding: "8px 16px", color: "#CB8B85", textAlign: "right", fontWeight: "bold" }}>❤️ {board.likes}</td>
                        <td style={{ padding: "8px 16px", color: T.goldDark, textAlign: "right", fontWeight: "bold" }}>🪙 {board.vibeCoins} Vibe</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. LEGAL COMPLIANCE TAB */}
        {activeTab === "laws" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* Split Screen: Left - Exquisite Laws, Right - Agreement pledge form */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
              gap: 36,
              alignItems: "flex-start"
            }}>
              
              {/* Exquisite Law Accordion */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: T.goldDark }}>MUSEDINI LEGAL COMPLIANCE HUB</span>
                </div>
                <h2 className="theme-title" style={{ fontSize: "24px", color: "#3D2E1A", fontWeight: 400, margin: 0 }}>
                  智慧權益與法令保護宣告
                </h2>
                
                {/* Law detail card 1 */}
                <div style={{
                  background: "#FFFDFB",
                  padding: 20,
                  borderRadius: 16,
                  border: "0.5px solid rgba(197, 160, 89, 0.22)",
                  boxShadow: "0 4px 15px rgba(138, 110, 62, 0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>🛡️</span>
                    <h4 style={{ fontSize: 13.5, color: T.text, margin: 0, fontWeight: 700 }}>中華民國個人資料保護法（個資法）與隱私權規範</h4>
                  </div>
                  <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.6 }}>
                    本軟體（含 Muse AI & Vibe）在設計上嚴格遵守個資法之「數據最小化」與「當事人自我決定權」原則。本系統所有對話歷史、打卡數據及資產內容皆預設保存在您個人裝置之 LocalStorage 安全沙盒中。我們不會在未經您明確授權與 API 配置之情況下，向雲端伺服器收集、上傳或轉售您的任何個人敏感隱私數據。
                  </p>
                </div>

                {/* Law detail card 2 */}
                <div style={{
                  background: "#FFFDFB",
                  padding: 20,
                  borderRadius: 16,
                  border: "0.5px solid rgba(197, 160, 89, 0.22)",
                  boxShadow: "0 4px 15px rgba(138, 110, 62, 0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>🎨</span>
                    <h4 style={{ fontSize: 13.5, color: T.text, margin: 0, fontWeight: 700 }}>智慧財產權與商標保護聲明（著作權法）</h4>
                  </div>
                  <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.6 }}>
                    Musedini、Muse AI 智慧工作區、Vibe Social 及其產品標誌、UI 排版框架、本地模擬引擎演算法，皆為 **Musedini** 或其關係人之原創設計，依法享有商標權、專利權及著作權。本軟體提供之代碼生成與 ZIP 匯出等功能，僅授予用戶合規範圍內之商業及個人授權，嚴禁惡意反編譯或破解本軟體之授權計數保護裝置。
                  </p>
                </div>

                {/* Law detail card 3 */}
                <div style={{
                  background: "#FFFDFB",
                  padding: 20,
                  borderRadius: 16,
                  border: "0.5px solid rgba(197, 160, 89, 0.22)",
                  boxShadow: "0 4px 15px rgba(138, 110, 62, 0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>⚖️</span>
                    <h4 style={{ fontSize: 13.5, color: T.text, margin: 0, fontWeight: 700 }}>數位服務法規與沙盒免責聲明</h4>
                  </div>
                  <p style={{ fontSize: 11.5, color: T.textMid, margin: 0, lineHeight: 1.6 }}>
                    本產品為一款注重創意展示與本地工作區管理之高級應用。本產品內建之 SimilarWeb 數據分析、靈感積分簽到加值、Marp 投影片架構生成等功能，皆基於本機安全沙盒的數據邏輯與模擬引擎運算，僅供學術探討、個人靈感記錄與企業內部預備規劃參考，不構成任何現實投資或具體操作之決策依據，用戶依據此進行之投資決策應自負風險。
                  </p>
                </div>
              </div>

              {/* Agreement Pledge Form */}
              <div style={{
                background: "rgba(255, 255, 255, 0.8)",
                border: `0.5px solid rgba(197, 160, 89, 0.25)`,
                boxShadow: "0 10px 30px rgba(138, 110, 62, 0.06)",
                borderRadius: 20,
                padding: "24px 20px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 14 }}>✍️</span>
                  <h3 className="theme-title" style={{ fontSize: "16px", color: "#3D2E1A", margin: 0, fontWeight: 700 }}>
                    Musedini 品牌法規認證簽署
                  </h3>
                </div>
                
                {signedCert ? (
                  <div style={{
                    background: "linear-gradient(135deg, #FFFDFB 0%, #FAF3F0 100%)",
                    border: "2px solid #C5A059",
                    borderRadius: 14,
                    padding: 16,
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {/* Exquisite stamp */}
                    <div style={{
                      position: "absolute",
                      bottom: -10,
                      right: -10,
                      width: 90,
                      height: 90,
                      borderRadius: "50%",
                      border: "2px dashed rgba(197, 160, 89, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(197, 160, 89, 0.35)",
                      fontSize: 10,
                      fontWeight: 800,
                      transform: "rotate(-20deg)",
                      userSelect: "none"
                    }}>
                      MUSEDINI SECURE
                    </div>

                    <div style={{ fontSize: 9, color: T.goldDark, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>PLEDGE CERTIFICATE</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: T.text, margin: "6px 0 10px 0" }}>合規簽署成功 ✦</div>
                    <div style={{ fontSize: 10.5, color: T.textMid, lineHeight: 1.5, marginBottom: 12 }}>
                      感謝您，<strong>{signedCert.name}</strong>。您已於 <strong>{signedCert.date}</strong> 正式簽署 Musedini 品牌合規條款，本裝置本地安全沙盒已正式啟用並授權以下聲明：
                      <div style={{ margin: "6px 0", padding: 8, borderLeft: "2px solid #C68B7F", background: "rgba(255,255,255,0.5)", fontSize: 9.5 }}>{signedCert.message}</div>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "0.5px solid rgba(197, 160, 89, 0.2)", paddingTop: 8 }}>
                      <span style={{ fontSize: 9, color: T.textGhost }}>證書編號：</span>
                      <span style={{ fontSize: 10, color: T.goldDark, fontWeight: "bold", letterSpacing: 1 }}>{signedCert.certNo}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSignTerms} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: T.textMid }}>使用者真實姓名</label>
                      <input 
                        type="text" 
                        placeholder="請輸入姓名"
                        value={signatureName}
                        onChange={e => setSignatureName(e.target.value)}
                        required
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
                          fontSize: 11.5,
                          background: T.bgInput,
                          color: T.text,
                          outline: "none",
                          transition: "all 0.2s"
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = T.gold}
                        onBlur={e => e.currentTarget.style.borderColor = T.border}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: T.textMid }}>簽署生效日期</label>
                      <input 
                        type="date" 
                        value={signatureDate}
                        onChange={e => setSignatureDate(e.target.value)}
                        required
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
                          fontSize: 11.5,
                          background: T.bgInput,
                          color: T.text,
                          outline: "none"
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: T.textMid }}>合規承諾聲明</label>
                      <textarea
                        value={pledgeMessage}
                        onChange={e => setPledgeMessage(e.target.value)}
                        rows={3}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
                          fontSize: 11,
                          background: T.bgInput,
                          color: T.text,
                          outline: "none",
                          resize: "none"
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4 }}>
                      <input 
                        type="checkbox" 
                        id="agree_terms"
                        checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)}
                        style={{ marginTop: 2, accentColor: T.gold }}
                      />
                      <label htmlFor="agree_terms" style={{ fontSize: 10.5, color: T.textMid, lineHeight: 1.4, cursor: "pointer" }}>
                        本人已詳細閱讀並同意遵守 Musedini 品牌保護、個人資料保護法（LocalStorage 沙盒儲存）以及數位服務合規條款。
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!agreedToTerms || !signatureName.trim()}
                      className="theme-button"
                      style={{
                        padding: "10px 0",
                        width: "100%",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: (!agreedToTerms || !signatureName.trim()) ? "not-allowed" : "pointer",
                        opacity: (!agreedToTerms || !signatureName.trim()) ? 0.5 : 1
                      }}
                    >
                      ✦ 簽署品牌合規條款
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 Custom Success Toast Overlay */}
      {showToast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "#3D2E1A",
          border: `1px solid ${T.gold}`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          borderRadius: 14,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "#FAF6F0",
          zIndex: 99999,
          animation: "slideIn 0.3s ease forwards"
        }}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideIn {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />
          <span style={{ fontSize: 18 }}>📜</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11.5, fontWeight: "bold" }}>Musedini 認證簽署成功</span>
            <span style={{ fontSize: 9, color: "#C5A059", marginTop: 2 }}>授權證書已被安全寫入您的本地安全沙盒</span>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, marginLeft: 8 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 🌟 press and marquee at bottom */}
      <div style={{
        marginTop: 48,
        borderTop: "0.5px solid rgba(220, 215, 206, 0.4)",
        paddingTop: 24,
        textAlign: "center"
      }}>
        <div style={{ fontSize: 10, color: T.textGhost, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
          Partners & Press
        </div>
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: isMobile ? 16 : 36,
          flexWrap: "wrap",
          opacity: 0.4
        }}>
          {["VOGUE", "ELLE", "LVMH", "GQ", "MUSEDINI LAB"].map((p, idx) => (
            <span key={idx} style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: T.text }}>{p}</span>
          ))}
        </div>
        <div style={{ fontSize: 9.5, color: T.textGhost, marginTop: 20 }}>
          © 2026 Muse AI by Musedini. All rights reserved. 隱私加密沙盒架構保護中。
        </div>
      </div>
    </div>
  );
}
