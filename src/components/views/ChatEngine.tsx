import React, { useRef, useEffect, useState } from "react";
import { T, MODES, STUDIO_SYS, JOURNAL_SYS, COMM_SCENARIOS, INSPI_SYS, GROWTH_SYS, HABIT_SYS, MARKET_SYS, MEMORY_SYS, MARKET_TEMPLATES } from "../../constants";
import { Md, Btn, SkeletonLoader } from "../Common";
import { analytics } from "../../utils/analytics";

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

export function ChatEngine({ state, dispatch, tid, proj, onSend, isMobile }: any) {
  const msgs = state.messages[tid] || [];
  const pct = Math.round((proj?.tokenUsage || 0) / (proj?.tokenLimit || 100000) * 100);
  const botRef = useRef<HTMLDivElement>(null);

  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [expandedPreview, setExpandedPreview] = useState<any>(null);
  const [selectedContexts, setSelectedContexts] = useState<any[]>([]);
  const [showContextPopover, setShowContextPopover] = useState(false);
  const [contextCategory, setContextCategory] = useState<string>("muse");
  const [isDragging, setIsDragging] = useState(false);
  const [hideWelcome, setHideWelcome] = useState(() => localStorage.getItem("muse_hide_welcome") === "true");
  const [sessionHide, setSessionHide] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [showSkillsHud, setShowSkillsHud] = useState(false);

  const HUD_SKILLS = [
    { key: "similarweb", name: "SimilarWeb", icon: "📊" },
    { key: "markdown", name: "學筆記美化", icon: "📓" },
    { key: "slides", name: "寫精美簡報", icon: "📝" },
    { key: "github_pages", name: "Pages 網頁", icon: "🌐" },
    { key: "github_actions", name: "Actions 自動化", icon: "🚀" },
    { key: "git_collab", name: "Git 專案協作", icon: "🌿" }
  ];

  useEffect(() => {
    const handleWelcomeChanged = () => {
      setHideWelcome(localStorage.getItem("muse_hide_welcome") === "true");
    };
    window.addEventListener("muse_welcome_changed", handleWelcomeChanged);
    return () => window.removeEventListener("muse_welcome_changed", handleWelcomeChanged);
  }, []);

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, state.streaming]);

  const renderWelcomeDashboard = () => {
    if (proj || state.navView !== "chat" || hideWelcome || sessionHide || msgs.length > 0) return null;

    const cards = [
      {
        icon: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#C5A059">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        ),
        label: "內容生成",
        onClick: () => dispatch({ type: "SET_NAV", view: "studio" })
      },
      {
        icon: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#C5A059">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        ),
        label: "靈感日曆",
        onClick: () => dispatch({ type: "SET_NAV", view: "calendar" })
      },
      {
        icon: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#C5A059">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        ),
        label: "啟動對話",
        onClick: () => dispatch({ type: "OPEN_MODAL", modal: "new-gen-thread" })
      },
      {
        icon: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#C5A059">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
        ),
        label: "載入企劃案",
        onClick: () => dispatch({ type: "SET_NAV", view: "projects" })
      }
    ];

    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px"
      }}>
        <div 
          style={{
            background: "#FFFFFF",
            border: "0.5px solid rgba(197, 160, 89, 0.25)",
            borderRadius: 24,
            padding: isMobile ? "24px 16px" : "36px 36px",
            boxShadow: "0 12px 36px rgba(138, 110, 62, 0.08)",
            width: "100%",
            maxWidth: isMobile ? "320px" : "480px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isMobile ? 16 : 24,
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Close Button X */}
          <button 
            onClick={() => setShowConfirmClose(true)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "rgba(197, 160, 89, 0.06)",
              color: "#C5A059",
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(197, 160, 89, 0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(197, 160, 89, 0.06)"; }}
          >
            ✕
          </button>

          {/* Brand / Subtitle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, userSelect: "none" }}>
            <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: isMobile ? 22 : 26, fontWeight: 800, letterSpacing: 1.5, color: "#C5A059", margin: 0 }}>Muse AI</h2>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: isMobile ? 10 : 11, fontWeight: 700, letterSpacing: 2, color: "#C5A059", marginTop: 2 }}>靈感來自與您</span>
          </div>

          {/* 4 Cards Grid */}
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              width: "100%",
              gap: isMobile ? 8 : 12
            }}
          >
            {cards.map((c, idx) => (
              <div 
                key={idx}
                onClick={c.onClick}
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(197, 160, 89, 0.15)",
                  borderRadius: 16,
                  padding: isMobile ? "12px 8px" : "16px 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: isMobile ? 8 : 12,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: "0 2px 8px rgba(138, 110, 62, 0.02)",
                  height: isMobile ? 80 : 96
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#FFFDFB";
                  e.currentTarget.style.border = "1.5px solid rgba(197, 160, 89, 0.35)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(138, 110, 62, 0.06)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#FFFFFF";
                  e.currentTarget.style.border = "1.5px solid rgba(197, 160, 89, 0.15)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(138, 110, 62, 0.02)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", transform: isMobile ? "scale(0.85)" : "scale(1)" }}>
                  {c.icon}
                </div>
                <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: "#3D2E1A" }}>{c.label}</span>
              </div>
            ))}
          </div>

        {/* Glassmorphism Confirmation Overlay */}
        {showConfirmClose && (
          <div 
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255, 253, 250, 0.94)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              gap: 12,
              zIndex: 10,
              animation: "welcomeFadeIn 0.2s ease forwards"
            }}
          >
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes welcomeFadeIn {
                0% { opacity: 0; transform: scale(0.98); }
                100% { opacity: 1; transform: scale(1); }
              }
            `}} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
              <span style={{ fontSize: 20 }}>🧭</span>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: "#3D2E1A", margin: 0 }}>關閉歡迎視窗</h3>
              <p style={{ fontSize: 10.5, color: T.textGhost, margin: "2px 0 0", lineHeight: 1.35, padding: "0 10px" }}>下次如欲再次啟用，請至「個人頁面 ➔ 系統引導設定」重啟。</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 190, gap: 6 }}>
              <button 
                onClick={() => {
                  localStorage.setItem("muse_hide_welcome", "true");
                  setHideWelcome(true);
                  setShowConfirmClose(false);
                  window.dispatchEvent(new Event("muse_welcome_changed"));
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "#BFA366",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(191, 163, 102, 0.15)",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#A88D52"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#BFA366"; }}
              >
                下次不再顯示
              </button>
              <button 
                onClick={() => {
                  setSessionHide(true);
                  setShowConfirmClose(false);
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(197, 160, 89, 0.2)",
                  background: "rgba(255, 255, 255, 0.8)",
                  color: "#7A5C28",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(197, 160, 89, 0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)"; }}
              >
                僅關閉這次
              </button>
              <button 
                onClick={() => setShowConfirmClose(false)}
                style={{
                  width: "100%",
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: T.textGhost,
                  fontSize: 10.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "color 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.textGhost; }}
              >
                取消
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (filesList: FileList | any[]) => {
    if (!filesList || filesList.length === 0) return;
    
    const currentCount = (proj?.files?.length || 0) + pendingFiles.length;
    let allowedCount = 10 - currentCount;
    
    if (allowedCount <= 0) {
      alert("⚠️ 專案檔案數量已達上限 (最多 10 個)。");
      return;
    }

    const validFiles = Array.from(filesList).filter((f: any) => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`⚠️ 檔案 ${f.name} 超過 5MB 上限，無法上傳。`);
        return false;
      }
      return true;
    }).slice(0, allowedCount);

    if (validFiles.length < Array.from(filesList).length && validFiles.length > 0 && Array.from(filesList).every((f: any) => f.size <= 5 * 1024 * 1024)) {
       alert(`⚠️ 專案檔案數量最多 10 個，僅加入了前 ${validFiles.length} 個檔案。`);
    }

    const added = validFiles.map((f: any) => ({
      id: "upl-" + Math.random().toString(36).substr(2, 9),
      name: f.name,
      size: f.size > 1024 * 1024 
        ? (f.size / (1024 * 1024)).toFixed(1) + " MB" 
        : Math.round(f.size / 1024) + " KB",
      type: f.name.split('.').pop() || 'txt',
      rawFile: f
    }));
    setPendingFiles(prev => [...prev, ...added]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const triggerUpload = (filesList: FileList | null) => {
    if (filesList) processFiles(filesList);
  };

  const currentSend = async () => {
    const hasAttachments = pendingFiles.length > 0;
    if (!state.input.trim() && !hasAttachments) return;

    let finalPrompt = state.input;
    if (selectedContexts.length > 0) {
      let contextText = "\n\n🌐 [攜入系統上下文連動]\n";
      selectedContexts.forEach(ctx => {
        contextText += `* **${ctx.icon} ${ctx.name}** (${ctx.type})\n`;
      });
      contextText += "\n```xml\n<context_integration>\n";
      selectedContexts.forEach(ctx => {
        contextText += `  <item type="${ctx.type}" name="${ctx.name}">\n`;
        contextText += `    <payload>${JSON.stringify(ctx.payload)}</payload>\n`;
        contextText += `  </item>\n`;
      });
      contextText += "</context_integration>\n```\n";
      finalPrompt = finalPrompt + contextText;
    }

    // Read all files text asynchronously
    const attachmentsWithContent = await Promise.all(
      pendingFiles.map(async (f) => {
        let content = "";
        try {
          if (f.rawFile) {
            content = await f.rawFile.text();
            if (content.length > 100000) {
              alert(`⚠️ 檔案 ${f.name} 字數過長 (超過 10 萬字元)，為保護系統效能已自動截斷。`);
              content = content.substring(0, 100000) + "\n\n【⚠️ 系統警告：檔案過長，已截斷至前 10 萬字元】";
            }
          }
        } catch (e) {
          console.warn("Failed to read file content:", e);
        }
        return {
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          content: content
        };
      })
    );

    onSend(finalPrompt, state.mode, tid, attachmentsWithContent);

    if (proj && hasAttachments) {
      attachmentsWithContent.forEach(f => {
        dispatch({
          type: "ADD_FILE",
          name: f.name,
          ftype: f.type,
          size: f.size,
          content: f.content,
          folderId: null
        });
      });
    }

    setPendingFiles([]);
    setSelectedContexts([]);
  };

  const files: Record<string, string> = {};
  msgs.forEach((m: any) => {
    if (m.role === "assistant" && m.content) {
      const { codeBlocks } = parseMessageContent(m.content);
      codeBlocks.forEach(block => {
        files[block.filename] = block.code;
      });
    }
  });

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        overflow: "hidden", 
        position: "relative",
        background: state.chatBgColor || "#FAF6F5",
        transition: "background 0.3s ease"
      }}
    >
      {isDragging && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(3px)",
          border: `2px dashed ${T.gold}`,
          margin: 10,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          color: T.goldDark,
          pointerEvents: "none"
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>將相關文檔拖曳到此處上傳</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>支援 PDF、Word、Excel、TXT、圖片等文檔</div>
        </div>
      )}

      {proj?.brief && <div style={{ background: "#FFFDF7", borderBottom: `0.5px solid #EDE8DF`, padding: "6px 14px", display: "flex", alignItems: "flex-start", gap: 7, flexShrink: 0 }}><span style={{ fontSize: 11, color: T.gold, flexShrink: 0 }}>📋</span><div style={{ fontSize: 11, color: "#7A5C28", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><strong>Brief:</strong> {proj.brief}</div><span style={{ fontSize: 10, color: T.gold, cursor: "pointer", flexShrink: 0 }} onClick={() => dispatch({ type: "START_EDIT_BRIEF" })}>✎</span></div>}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 13, scrollbarWidth: "thin" as any, scrollbarColor: `${T.border} transparent` }}>
        {renderWelcomeDashboard()}
        {proj && <div style={{ alignSelf: "center", background: T.bgInput, border: `0.5px solid ${T.border}`, borderRadius: 20, padding: "3px 12px", fontSize: 11, color: T.textDim, display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: T.gold }}/>{proj.files.length} files · project context</div>}
        {msgs.length === 0 && !(state.navView === "chat" && !proj && !hideWelcome && !sessionHide) && <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim }}><div style={{ fontWeight: 500, color: T.textMid, fontSize: 14, letterSpacing: 0.5 }}>開始對話</div>{proj && <div style={{ fontSize: 12, marginTop: 6 }}>在「{proj.name}」框架內進行</div>}</div>}
        {msgs.map((msg: any, i: number) => {
          const isLive = state.streaming && i === msgs.length - 1 && msg.role === "assistant";
          const mc = MODES[msg.mode]?.c || T.gold;
          if (msg.role === "user") {
            const isEditingThis = editingMsgId === msg.id;
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "row-reverse", gap: 7, alignSelf: "flex-end", width: "100%", maxWidth: 520 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.text, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, flexShrink: 0 } as any}>YC</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  {isEditingThis ? (
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                      <textarea
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: 80,
                          background: "#FAF8F6",
                          border: "1px solid #C5A059",
                          borderRadius: 12,
                          padding: "10px 12px",
                          fontSize: 13,
                          color: T.text,
                          outline: "none",
                          fontFamily: "inherit",
                          lineHeight: 1.6,
                          resize: "vertical",
                          boxShadow: "inset 0 1px 3px rgba(138, 110, 62, 0.05)"
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => {
                            setEditingMsgId(null);
                            setEditingText("");
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: T.textGhost,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                            padding: "4px 8px"
                          }}
                        >
                          取消
                        </button>
                        <button
                          onClick={() => {
                            if (!editingText.trim()) return;
                            onSend(editingText, msg.mode || state.mode, tid, msg.attachments || [], msg.id);
                            setEditingMsgId(null);
                            setEditingText("");
                          }}
                          style={{
                            border: "none",
                            background: T.gold,
                            color: "#fff",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: "5px 12px",
                            boxShadow: "0 2px 6px rgba(197, 160, 89, 0.2)"
                          }}
                        >
                          儲存並重新傳送
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ background: T.text, color: "#fff", borderRadius: "14px 4px 14px 14px", padding: "9px 13px", fontSize: 13, lineHeight: 1.65, width: "fit-content", maxWidth: "100%" }}>
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8, borderTop: "0.5px solid rgba(255,255,255,0.2)", paddingTop: 6 }}>
                            {msg.attachments.map((file: any) => {
                              let icon = "📄";
                              if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(file.type?.toLowerCase())) icon = "🖼️";
                              else if (["xls", "xlsx", "csv"].includes(file.type?.toLowerCase())) icon = "📊";
                              else if (["doc", "docx", "pdf"].includes(file.type?.toLowerCase())) icon = "📕";
                              return (
                                <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255, 255, 255, 0.15)", borderRadius: 6, padding: "4px 8px", fontSize: 11 }}>
                                  <span style={{ fontSize: 12 }}>{icon}</span>
                                  <span style={{ textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={file.name}>{file.name}</span>
                                  <span style={{ opacity: 0.8, fontSize: 10 }}>({file.size})</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", marginTop: 4, fontSize: 10.5, color: T.textGhost, userSelect: "none" }}>
                        <span>{msg.ts}</span>
                        <span style={{ color: "rgba(197, 160, 89, 0.25)" }}>|</span>
                        <span 
                          style={{ cursor: "pointer", transition: "color 0.2s" }}
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            dispatch({ type: "TRIGGER_NOTIFICATION", title: "📋 複製成功", body: "已複製使用者訊息內容至剪貼簿！" });
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = T.goldDark}
                          onMouseLeave={e => e.currentTarget.style.color = T.textGhost}
                        >
                          複製
                        </span>
                        <span style={{ color: "rgba(197, 160, 89, 0.25)" }}>|</span>
                        <span 
                          style={{ cursor: "pointer", transition: "color 0.2s" }}
                          onClick={() => {
                            const quoted = `> ${msg.content.split('\n').join('\n> ')}\n\n`;
                            dispatch({ type: "SET_INPUT", text: quoted + state.input });
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = T.goldDark}
                          onMouseLeave={e => e.currentTarget.style.color = T.textGhost}
                        >
                          引用
                        </span>
                        <span style={{ color: "rgba(197, 160, 89, 0.25)" }}>|</span>
                        <span 
                          style={{ cursor: "pointer", transition: "color 0.2s" }}
                          onClick={() => {
                            setEditingMsgId(msg.id);
                            setEditingText(msg.content);
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = T.goldDark}
                          onMouseLeave={e => e.currentTarget.style.color = T.textGhost}
                        >
                          編輯
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          }
          const { cleanText, codeBlocks } = parseMessageContent(msg.content);
          const hasCodeBlocks = codeBlocks.length > 0 || msg.content.includes("```");
          const showCard = codeBlocks.length > 0 && !isLive;
          const displayMarkdown = hasCodeBlocks
            ? (cleanText || "✦ AI 已為您啟動高奢企劃案架構設計，網頁程式碼正安全寫入右側代碼檢視器...")
            : msg.content;

          const assistAvatar = state.aiAssistant?.avatar || "🪐";
          const isUploadedAvatar = assistAvatar.startsWith("data:image");
          const assistName = state.aiAssistant?.name || MODES[msg.mode]?.n || "Muse AI";
          const assistConstel = state.aiAssistant?.constellation || "";

          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 560 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {isUploadedAvatar ? (
                  <img src={assistAvatar} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.goldLight, border: `0.5px solid ${T.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.goldDark, fontWeight: 600, flexShrink: 0 } as any}>
                    {assistAvatar}
                  </div>
                )}
                <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600 }}>{assistName}</span>
                {assistConstel && (
                  <span style={{ fontSize: 8.5, color: T.goldDark, background: T.goldLight, border: "0.5px solid rgba(197, 160, 89, 0.25)", padding: "1px 5px", borderRadius: 4, fontWeight: "bold" }}>
                    {assistConstel}
                  </span>
                )}
                {isLive && <span style={{ fontSize: 10, color: T.goldDark, background: T.goldLight, padding: "1px 7px", borderRadius: 10, animation: "pulse 1.2s ease infinite" }}>✦ 思考中</span>}
              </div>
              <div style={{ 
                background: state.aiAssistant?.bubbleBg || T.bgCard, 
                border: `0.5px solid ${state.aiAssistant?.bubbleBorder || T.border}`, 
                borderLeft: `2.5px solid ${state.aiAssistant?.bubbleBorder || mc}`, 
                borderRadius: "0 12px 12px 12px", 
                padding: "10px 13px" 
              }}>
                <div style={{ color: state.aiAssistant?.bubbleText || T.text }}>
                  {displayMarkdown ? <Md text={displayMarkdown} /> : <SkeletonLoader type="text" />}
                </div>
                
                {/* 正在串流生成且包含程式碼時，顯示極致美觀的「努力加載中」莫蘭迪光影漸層卡片 */}
                {isLive && hasCodeBlocks && (
                  <div 
                    style={{
                      marginTop: 12,
                      background: "linear-gradient(90deg, #FAF3F0 0%, #E2C3BC 50%, #FAF3F0 100%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2.5s infinite linear",
                      border: "0.5px solid rgba(198, 139, 127, 0.25)",
                      borderRadius: 14,
                      padding: "14px 18px",
                      boxShadow: "0 6px 20px rgba(198, 139, 127, 0.05)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="animate-spin-custom" style={{ fontSize: 18 }}>⚙️</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#945B50", fontSize: 12.5, display: "flex", alignItems: "center", gap: 4 }}>
                          努力加載中
                          <span className="typing-dot" style={{ background: "#945B50", width: 3, height: 3 }} />
                          <span className="typing-dot" style={{ background: "#945B50", width: 3, height: 3 }} />
                          <span className="typing-dot" style={{ background: "#945B50", width: 3, height: 3 }} />
                        </div>
                        <div style={{ fontSize: 10.5, color: "#945B50", opacity: 0.8, marginTop: 1, fontWeight: 500 }}>
                          ✨ 莫蘭迪高奢網頁代碼生成中，已實時導入右側 CODE VIEWER...
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showCard && (() => {
                  const primaryBlock = codeBlocks.find(b => b.filename.endsWith(".jsx") || b.filename.endsWith(".tsx") || b.filename.endsWith(".html")) || codeBlocks[0];
                  return (
                    <div 
                      style={{
                        marginTop: 12,
                        background: "linear-gradient(135deg, #FFFBF6 0%, #FFFDF9 100%)",
                        border: "1px solid rgba(197, 160, 89, 0.22)",
                        borderRadius: 16,
                        padding: "16px 20px",
                        boxShadow: "0 8px 24px rgba(138, 110, 62, 0.05)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        transition: "all 0.3s ease",
                      }}
                    >
                      {/* Title and Icon */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 20 }}>⚛️</span>
                          <div>
                            <div style={{ fontWeight: 600, color: "#3D2E1A", fontSize: 13 }}>
                              ✨ AI 智能設計企劃案成品
                            </div>
                            <div style={{ fontSize: 11, color: "#8A6E3E", opacity: 0.85, marginTop: 1 }}>
                              ✦ React 與多檔案架構沙箱渲染就緒
                            </div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#C5A059",
                          background: "rgba(197, 160, 89, 0.08)",
                          padding: "3px 8px",
                          borderRadius: 8,
                          border: "0.5px solid rgba(197, 160, 89, 0.15)",
                          letterSpacing: 0.5
                        }}>
                          PROJECT SHELL
                        </span>
                      </div>

                      {/* File Explorer Inside the Card */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ fontSize: 10, color: T.textGhost, fontWeight: 500 }}>企劃案產出檔案列表 (點擊可在右側查看原始碼)：</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                          {codeBlocks.map((block, bIdx) => {
                            let icon = "📄";
                            if (block.filename.endsWith(".jsx") || block.filename.endsWith(".tsx")) icon = "⚛️";
                            else if (block.filename.endsWith(".css")) icon = "🎨";
                            else if (block.filename.endsWith(".html")) icon = "🌐";
                            else if (block.filename.endsWith(".svg")) icon = "✦";
                            else if (block.filename.endsWith(".sh") || block.filename.endsWith(".bash")) icon = "⚡";
                            
                            return (
                              <span 
                                key={bIdx}
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent("muse-select-pv-file", { detail: { filename: block.filename } }));
                                  alert(`📁 已自動為您切換並在右側開啟「${block.filename}」原始碼！`);
                                }}
                                style={{
                                  fontSize: "10.5px",
                                  color: "#8A6E3E",
                                  background: "rgba(197, 160, 89, 0.05)",
                                  border: "0.5px solid rgba(197, 160, 89, 0.2)",
                                  padding: "4px 9px",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  transition: "all 0.15s"
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = "rgba(197, 160, 89, 0.12)";
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = "rgba(197, 160, 89, 0.05)";
                                }}
                              >
                                {icon} {block.filename}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Separator Line */}
                      <div style={{ height: 0.5, background: "rgba(197, 160, 89, 0.15)", margin: "4px 0" }} />

                      {/* Interactive Buttons */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => setExpandedPreview({ filename: primaryBlock.filename, code: primaryBlock.code })}
                          style={{
                            flex: 1,
                            height: 34,
                            borderRadius: 10,
                            background: "linear-gradient(135deg, #C5A059 0%, #BFA366 100%)",
                            border: "none",
                            color: "#ffffff",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            boxShadow: "0 4px 12px rgba(197, 160, 89, 0.2)",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "0 6px 16px rgba(197, 160, 89, 0.3)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(197, 160, 89, 0.2)";
                          }}
                        >
                          🔍 點擊放大預覽
                        </button>
                        
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("muse-select-pv-file", { detail: { filename: primaryBlock.filename } }));
                            alert(`📁 已自動為您切換並在右側代碼檢視器開啟主元件「${primaryBlock.filename}」！`);
                          }}
                          style={{
                            flex: 1,
                            height: 34,
                            borderRadius: 10,
                            background: "rgba(197, 160, 89, 0.05)",
                            border: "0.5px solid rgba(197, 160, 89, 0.3)",
                            color: "#8A6E3E",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(197, 160, 89, 0.09)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(197, 160, 89, 0.05)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          📁 檢視原始代碼
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 10.5, color: T.textGhost, marginTop: 4, paddingLeft: 2, userSelect: "none" }}>
                <span 
                  style={{ cursor: "pointer", transition: "color 0.2s" }}
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content);
                    dispatch({ type: "TRIGGER_NOTIFICATION", title: "📋 複製成功", body: "已複製 AI 回覆內容至剪貼簿！" });
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = T.goldDark}
                  onMouseLeave={e => e.currentTarget.style.color = T.textGhost}
                >
                  複製
                </span>
                <span style={{ color: "rgba(197, 160, 89, 0.25)" }}>|</span>
                <span 
                  style={{ cursor: "pointer", transition: "color 0.2s" }}
                  onClick={() => {
                    const quoted = `> ${msg.content.split('\n').join('\n> ')}\n\n`;
                    dispatch({ type: "SET_INPUT", text: quoted + state.input });
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = T.goldDark}
                  onMouseLeave={e => e.currentTarget.style.color = T.textGhost}
                >
                  引用
                </span>
                {msg.tokens && (
                  <>
                    <span style={{ color: "rgba(197, 160, 89, 0.25)" }}>|</span>
                    <span style={{ marginLeft: "auto" }}>{msg.tokens.toLocaleString()} tok</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={botRef} />
      </div>
      <div style={{ borderTop: `0.5px solid ${T.border}`, background: T.bgCard, padding: "7px 12px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" as any, flexShrink: 0 }}>{Object.entries(MODES).map(([k, m]: any) => { const active = state.mode === k; return (<div key={k} onClick={() => dispatch({ type: "SET_MODE", mode: k })} style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, border: "0.5px solid", borderColor: active ? "transparent" : T.border, background: active ? m.c : T.bgCard, color: active ? (["critique", "auto"].includes(k) ? "#412402" : "#fff") : T.textMid, transition: "all .15s" }}>{m.l}</div>); })}</div>
        
        {/* Selected Contexts Tags */}
        {selectedContexts.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "4px 0 8px 4px", borderBottom: `0.5px solid ${T.borderLight}`, marginBottom: 6 }}>
            {selectedContexts.map((ctx, idx) => (
              <div 
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(197, 160, 89, 0.06)",
                  border: "0.5px solid rgba(197, 160, 89, 0.22)",
                  borderRadius: 12,
                  padding: "3px 9px",
                  fontSize: "10.5px",
                  color: "#8A6E3E",
                  fontWeight: 500
                }}
              >
                <span>{ctx.icon}</span>
                <span>{ctx.name}</span>
                <button 
                  onClick={() => setSelectedContexts(prev => prev.filter((_, i) => i !== idx))} 
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#BFA366",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "0 2px",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "4px 0 8px 4px", overflowX: "auto" }}>
            {pendingFiles.map(file => {
              let icon = "📄";
              if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(file.type.toLowerCase())) icon = "🖼️";
              else if (["xls", "xlsx", "csv"].includes(file.type.toLowerCase())) icon = "📊";
              else if (["doc", "docx", "pdf"].includes(file.type.toLowerCase())) icon = "📕";
              return (
                <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 5, background: T.bgInput, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "3px 8px", fontSize: 11, color: T.textMid }}>
                  <span>{icon}</span>
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={file.name}>{file.name}</span>
                  <span style={{ fontSize: 9, color: T.textGhost }}>({file.size})</span>
                  <button onClick={() => setPendingFiles(prev => prev.filter(f => f.id !== file.id))} style={{ border: "none", background: "transparent", color: T.textGhost, cursor: "pointer", fontSize: 11, padding: "0 2px" }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: `0.5px solid ${T.borderLight}`, borderRadius: 10, padding: "0 7px 0 11px", height: 41, position: "relative" }}>
          {/* 🔮 Quick Access Skills HUD Trigger */}
          <button 
            type="button"
            onClick={() => setShowSkillsHud(!showSkillsHud)}
            style={{
              background: showSkillsHud ? "rgba(197, 160, 89, 0.15)" : "transparent",
              border: "none",
              borderRadius: "50%",
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 15,
              transition: "transform 0.2s, background 0.2s",
              outline: "none"
            }}
            title="🔮 協作技能智庫 HUD"
          >
            🔮
          </button>

          {/* + Context Button */}
          <button 
            type="button"
            onClick={() => setShowContextPopover(!showContextPopover)}
            style={{
              background: selectedContexts.length > 0 ? "rgba(197, 160, 89, 0.12)" : "transparent",
              border: "none",
              borderRadius: "50%",
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              color: selectedContexts.length > 0 ? T.goldDark : T.textDim,
              fontWeight: "bold",
              transition: "all 0.2s",
              outline: "none"
            }}
            title="攜入系統上下文 (My Muse, 日誌, 企劃案...)"
          >
            ＋
          </button>

          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: pendingFiles.length > 0 ? T.goldLight : "transparent", color: pendingFiles.length > 0 ? T.goldDark : T.textDim, transition: "background 0.2s" }} title="上傳文檔">
            <span style={{ fontSize: 15 }}>📎</span>
            <input 
              type="file" 
              multiple 
              onChange={(e) => triggerUpload(e.target.files)} 
              style={{ display: "none" }} 
            />
          </label>
          <input value={state.input} onChange={e => dispatch({ type: "SET_INPUT", text: e.target.value })} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); currentSend(); } }} disabled={state.streaming} placeholder={MODES[state.mode]?.ph || "Ask Muse AI..."} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: T.text, fontFamily: "inherit" }} />
          {state.streaming ? (
            <button 
              onClick={() => {
                if (window.stopActiveChatStream) {
                  window.stopActiveChatStream();
                }
              }} 
              style={{ 
                width: 30, 
                height: 30, 
                borderRadius: 8, 
                border: "none", 
                background: "#EF4444", 
                color: "#fff", 
                cursor: "pointer", 
                fontSize: 12, 
                fontWeight: 700, 
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s"
              }}
              title="停止生成"
              onMouseEnter={e => e.currentTarget.style.background = "#DC2626"}
              onMouseLeave={e => e.currentTarget.style.background = "#EF4444"}
            >
              ■
            </button>
          ) : (
            <button onClick={currentSend} disabled={(!state.input.trim() && pendingFiles.length === 0)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: (!state.input.trim() && pendingFiles.length === 0) ? T.borderLight : T.gold, color: (!state.input.trim() && pendingFiles.length === 0) ? T.textGhost : "#fff", cursor: (!state.input.trim() && pendingFiles.length === 0) ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>↑</button>
          )}

          {/* Context Selection Popover Menu */}
          {showContextPopover && (
            <div 
              style={{
                position: "absolute",
                bottom: 48,
                left: 0,
                width: 320,
                height: 250,
                background: "#FFFFFF",
                border: "0.5px solid rgba(197, 160, 89, 0.25)",
                borderRadius: 16,
                boxShadow: "0 12px 36px rgba(138, 110, 62, 0.12)",
                display: "flex",
                overflow: "hidden",
                zIndex: 1000,
                textAlign: "left"
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Left Column Category list */}
              <div 
                style={{
                  width: 95,
                  background: "linear-gradient(to bottom, #FFFDFB, #FAF6F0)",
                  borderRight: "0.5px solid rgba(197, 160, 89, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px 0",
                  flexShrink: 0
                }}
              >
                {[
                  { k: "muse", n: "My Muse", i: "🎀" },
                  { k: "schedule", n: "日常規劃", i: "🌱" },
                  { k: "studio", n: "創意工坊", i: "✨" },
                  { k: "journal", n: "日記反思", i: "📕" },
                  { k: "project", n: "企劃案連動", i: "📁" }
                ].map(cat => {
                  const active = contextCategory === cat.k;
                  return (
                    <div 
                      key={cat.k}
                      onClick={() => setContextCategory(cat.k)}
                      style={{
                        padding: "8px 10px",
                        fontSize: 10.5,
                        fontWeight: active ? 600 : 400,
                        color: active ? "#8A6E3E" : T.textMid,
                        background: active ? "rgba(197, 160, 89, 0.08)" : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        transition: "all 0.15s"
                      }}
                    >
                      <span>{cat.i}</span>
                      <span>{cat.n}</span>
                    </div>
                  );
                })}
              </div>

              {/* Right Column Items list */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#ffffff" }}>
                <div style={{ padding: "6px 12px", borderBottom: "0.5px solid rgba(197, 160, 89, 0.1)", fontSize: 10, fontWeight: 600, color: T.gold, background: "#FFFDF9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>選擇攜入上下文</span>
                  <span style={{ cursor: "pointer", color: T.textGhost }} onClick={() => setShowContextPopover(false)}>✕</span>
                </div>
                
                <div style={{ flex: 1, overflowY: "auto", padding: "6px 0", scrollbarWidth: "none" as any }}>
                  {contextCategory === "muse" && (() => {
                    const assets = state.myMuseAssets || [];
                    if (assets.length === 0) return <div style={{ padding: 20, textAlign: "center", fontSize: 10, color: T.textGhost }}>尚無 My Muse 成品</div>;
                    return assets.map((asset: any) => (
                      <div 
                        key={asset.id}
                        onClick={() => {
                          if (selectedContexts.some(c => c.id === asset.id)) return;
                          setSelectedContexts(prev => [...prev, { id: asset.id, type: "muse", name: asset.name, icon: "🎀", payload: { assetId: asset.id, name: asset.name, remark: asset.remark } }]);
                          setShowContextPopover(false);
                        }}
                        style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer", borderBottom: "0.5px solid rgba(0,0,0,0.02)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#FAF8F5"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ fontWeight: 500, color: T.text }}>🎀 {asset.name}</div>
                        <div style={{ fontSize: 9, color: T.textGhost, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{asset.remark || "暫無簡介"}</div>
                      </div>
                    ));
                  })()}

                  {contextCategory === "schedule" && (() => {
                    const tasks = state.tasks || [];
                    const habits = state.habits || [];
                    if (tasks.length === 0 && habits.length === 0) return <div style={{ padding: 20, textAlign: "center", fontSize: 10, color: T.textGhost }}>尚無日常任務或習慣</div>;
                    return (
                      <div>
                        {tasks.map((task: any) => (
                          <div 
                            key={task.id}
                            onClick={() => {
                              if (selectedContexts.some(c => c.id === task.id)) return;
                              setSelectedContexts(prev => [...prev, { id: task.id, type: "task", name: task.title, icon: "📋", payload: { title: task.title, desc: task.desc, dueDate: task.dueDate, priority: task.priority } }]);
                              setShowContextPopover(false);
                            }}
                            style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer", borderBottom: "0.5px solid rgba(0,0,0,0.02)" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#FAF8F5"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ fontWeight: 500, color: T.text }}>📋 {task.title}</div>
                            <div style={{ fontSize: 9, color: T.textGhost, marginTop: 2 }}>截止日: {task.dueDate} · 優先級: {task.priority}</div>
                          </div>
                        ))}
                        {habits.map((habit: any) => (
                          <div 
                            key={habit.id}
                            onClick={() => {
                              if (selectedContexts.some(c => c.id === habit.id)) return;
                              setSelectedContexts(prev => [...prev, { id: habit.id, type: "habit", name: habit.name, icon: habit.icon || "📓", payload: { name: habit.name, streak: habit.streak } }]);
                              setShowContextPopover(false);
                            }}
                            style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer", borderBottom: "0.5px solid rgba(0,0,0,0.02)" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#FAF8F5"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ fontWeight: 500, color: T.text }}>{habit.icon || "📓"} {habit.name}</div>
                            <div style={{ fontSize: 9, color: T.textGhost, marginTop: 2 }}>已連續培養: {habit.streak} 天</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {contextCategory === "studio" && (() => {
                    const images = state.generatedImages || [];
                    if (images.length === 0) return <div style={{ padding: 20, textAlign: "center", fontSize: 10, color: T.textGhost }}>尚無創意生成圖像</div>;
                    return images.map((img: any, idx: number) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          if (selectedContexts.some(c => c.name === `生成影像 #${idx+1}`)) return;
                          setSelectedContexts(prev => [...prev, { id: `studio-img-${idx}`, type: "studio_image", name: `生成影像 #${idx+1}`, icon: "🖼️", payload: { prompt: img.prompt } }]);
                          setShowContextPopover(false);
                        }}
                        style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer", borderBottom: "0.5px solid rgba(0,0,0,0.02)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#FAF8F5"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ fontWeight: 500, color: T.text }}>🖼️ 創意影像 #{idx+1}</div>
                        <div style={{ fontSize: 9, color: T.textGhost, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{img.prompt || "無 Prompt"}</div>
                      </div>
                    ));
                  })()}

                  {contextCategory === "journal" && (() => {
                    const journals = [
                      { id: "j1", title: "今日日記 (2026-05-23)", icon: "📓", content: "今天完成了 React UMD 沙箱與全螢幕預覽模擬器的重構，對代碼編譯管道有了更深的體悟。品牌重構專案也在順暢推進中。" },
                      { id: "j2", title: "昨日日記 (2026-05-22)", icon: "📓", content: "準備進行 UI 成品卡片殼與空狀態閃電移除優化。希望能創造出宛如 Bolt.new 的極致奢華體驗。" },
                      { id: "j3", title: "深度反思 (日常技能成長)", icon: "🧠", content: "思考如何在日常規劃中更好地結合 AI 進行敏捷開發。目前看來，動態上下文攜入是最為關鍵的一步。" }
                    ];
                    return journals.map(journal => (
                      <div 
                        key={journal.id}
                        onClick={() => {
                          if (selectedContexts.some(c => c.id === journal.id)) return;
                          setSelectedContexts(prev => [...prev, { id: journal.id, type: "journal", name: journal.title, icon: journal.icon, payload: { title: journal.title, content: journal.content } }]);
                          setShowContextPopover(false);
                        }}
                        style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer", borderBottom: "0.5px solid rgba(0,0,0,0.02)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#FAF8F5"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ fontWeight: 500, color: T.text }}>{journal.icon} {journal.title}</div>
                        <div style={{ fontSize: 9, color: T.textGhost, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{journal.content}</div>
                      </div>
                    ));
                  })()}

                  {contextCategory === "project" && (() => {
                    const projects = state.projects || [];
                    return (
                      <div>
                        {projects.map((p: any) => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              if (selectedContexts.some(c => c.id === p.id)) return;
                              setSelectedContexts(prev => [...prev, { id: p.id, type: "project", name: p.name, icon: "📁", payload: { projectId: p.id, brief: p.brief, fileCount: p.files.length } }]);
                              setShowContextPopover(false);
                            }}
                            style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer", borderBottom: "0.5px solid rgba(0,0,0,0.02)", background: state.activeProjId === p.id ? "rgba(197,160,89,0.03)" : "transparent" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#FAF8F5"}
                            onMouseLeave={e => e.currentTarget.style.background = state.activeProjId === p.id ? "rgba(197,160,89,0.03)" : "transparent"}
                          >
                            <div style={{ fontWeight: 500, color: T.text, display: "flex", alignItems: "center", gap: 5 }}>
                              📁 {p.name}
                              {state.activeProjId === p.id && <span style={{ fontSize: 9, color: T.gold, border: "0.5px solid rgba(197,160,89,0.3)", padding: "0 4px", borderRadius: 4 }}>當前選取</span>}
                            </div>
                            <div style={{ fontSize: 9, color: T.textGhost, marginTop: 2 }}>Brief: {p.brief || "無簡報介紹"}</div>
                          </div>
                        ))}
                        
                        <div 
                          onClick={() => {
                            dispatch({ type: "OPEN_MODAL", modal: "new-project" });
                            setShowContextPopover(false);
                          }}
                          style={{ padding: "10px 12px", fontSize: 11, color: T.gold, cursor: "pointer", textAlign: "center", fontWeight: 600, borderTop: "0.5px solid rgba(197,160,89,0.15)", background: "#FFFDF9" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(197,160,89,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "#FFFDF9"}
                        >
                          ＋ 建立新企劃案
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* 🔮 Quick Access Skills HUD Drawer/Popover */}
          {showSkillsHud && (
            isMobile ? (
              /* Mobile Bottom Sheet Drawer */
              <div 
                style={{
                  position: "fixed",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(255, 253, 250, 0.95)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderTop: "0.5px solid rgba(197, 160, 89, 0.3)",
                  borderRadius: "24px 24px 0 0",
                  padding: "16px 16px 32px 16px",
                  boxShadow: "0 -10px 30px rgba(61, 46, 26, 0.12)",
                  zIndex: 99999,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                }}
              >
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes slideUp {
                    0% { transform: translateY(100%); }
                    100% { transform: translateY(0); }
                  }
                `}} />
                {/* Drag Handle Bar */}
                <div style={{ width: 40, height: 4, background: "rgba(61, 46, 26, 0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 4 }} onClick={() => setShowSkillsHud(false)} />
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#3D2E1A" }}>🔮 協作技能智庫 HUD</span>
                  <button onClick={() => setShowSkillsHud(false)} style={{ border: "none", background: "transparent", color: T.goldDark, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>完成</button>
                </div>

                {/* 6 Skills Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {HUD_SKILLS.map(skill => {
                    const isActive = !!state.enabledSkills?.[skill.key];
                    return (
                      <div 
                        key={skill.key}
                        onClick={() => dispatch({ type: "TOGGLE_SKILL", skillKey: skill.key })}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: isActive ? "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)" : "rgba(255, 255, 255, 0.6)",
                          border: `0.5px solid ${isActive ? "rgba(197, 160, 89, 0.35)" : "rgba(220, 215, 206, 0.4)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{skill.icon}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: isActive ? T.goldDark : T.text }}>{skill.name}</span>
                        </div>
                        {/* Status dot */}
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? T.gold : "rgba(220, 215, 206, 0.8)", transition: "background 0.2s" }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Desktop Floating Popover */
              <div 
                style={{
                  position: "absolute",
                  bottom: 50,
                  left: 0,
                  width: 320,
                  background: "rgba(255, 253, 250, 0.95)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "0.5px solid rgba(197, 160, 89, 0.3)",
                  borderRadius: 20,
                  padding: 16,
                  boxShadow: "0 12px 36px rgba(61, 46, 26, 0.12)",
                  zIndex: 99999,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  animation: "popFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                }}
              >
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes popFadeIn {
                    0% { transform: translateY(10px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                  }
                `}} />
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>🔮</span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "#3D2E1A" }}>協作技能智庫 HUD</span>
                  </div>
                  <button onClick={() => setShowSkillsHud(false)} style={{ border: "none", background: "transparent", color: T.textGhost, fontSize: 10, cursor: "pointer", fontWeight: "bold" }}>關閉</button>
                </div>

                <div style={{ borderBottom: "0.5px solid rgba(220, 215, 206, 0.4)" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {HUD_SKILLS.map(skill => {
                    const isActive = !!state.enabledSkills?.[skill.key];
                    return (
                      <div 
                        key={skill.key}
                        onClick={() => dispatch({ type: "TOGGLE_SKILL", skillKey: skill.key })}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: isActive ? "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)" : "transparent",
                          border: `0.5px solid ${isActive ? "rgba(197, 160, 89, 0.3)" : "rgba(0,0,0,0.02)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.03)"; }}
                        onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13 }}>{skill.icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? T.goldDark : T.text }}>{skill.name}</span>
                        </div>
                        
                        {/* Toggle switch */}
                        <div 
                          style={{
                            width: 28,
                            height: 14,
                            borderRadius: 7,
                            background: isActive ? T.gold : "rgba(220, 215, 206, 0.8)",
                            position: "relative",
                            transition: "background 0.2s"
                          }}
                        >
                          <div 
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "#fff",
                              position: "absolute",
                              top: 2,
                              left: isActive ? 16 : 2,
                              transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {expandedPreview && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(30, 24, 18, 0.45)",
            backdropFilter: "blur(18px) saturate(160%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.25s ease-out",
            padding: isMobile ? 12 : 32,
            boxSizing: "border-box"
          }}
          onClick={() => setExpandedPreview(null)}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleUp { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}} />
          
          <div 
            style={{
              width: "100%",
              maxWidth: 1120,
              height: "90vh",
              background: "rgba(255, 255, 255, 0.94)",
              border: "1.5px solid rgba(197, 160, 89, 0.25)",
              borderRadius: 24,
              boxShadow: "0 24px 64px rgba(61, 46, 26, 0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Browser Mockup Top bar */}
            <div 
              style={{
                height: 48,
                background: "linear-gradient(to bottom, #FAF6F0, #F4ECE0)",
                borderBottom: "1px solid rgba(197, 160, 89, 0.2)",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: 16,
                flexShrink: 0
              }}
            >
              {/* Mac OS Window control dots */}
              <div style={{ display: "flex", gap: 6 }}>
                <div onClick={() => setExpandedPreview(null)} style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(0,0,0,0.5)", fontSize: 8, fontWeight: "bold" }}>✕</div>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }}></div>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C93F" }}></div>
              </div>

              {/* Address Mockup */}
              <div 
                style={{
                  flex: 1,
                  height: 28,
                  background: "#ffffff",
                  border: "0.5px solid rgba(197, 160, 89, 0.2)",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  gap: 8,
                  maxWidth: 620,
                  margin: "0 auto"
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.5 }}>🔒</span>
                <span style={{ fontSize: 11, color: "#8A6E3E", fontWeight: 500 }}>
                  muse-preview.local/sandbox/{expandedPreview.filename}
                </span>
                <span style={{ fontSize: 9, color: T.gold, background: "rgba(197, 160, 89, 0.08)", padding: "1px 6px", borderRadius: 4, marginLeft: "auto" }}>
                  LIVE
                </span>
              </div>

              {/* Action icons / Close buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Refresh Button */}
                <button
                  onClick={() => {
                    const iframe = document.getElementById("fullscreen-iframe") as HTMLIFrameElement;
                    if (iframe) {
                      const doc = buildPreviewSrcDoc(expandedPreview.filename, expandedPreview.code, files);
                      iframe.srcdoc = doc;
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 15,
                    color: "#8A6E3E",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.2s"
                  }}
                  title="重新整理"
                  onMouseEnter={e => e.currentTarget.style.transform = "rotate(45deg)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "rotate(0)"}
                >
                  🔄
                </button>
                
                <button 
                  onClick={() => setExpandedPreview(null)}
                  style={{
                    background: "rgba(197, 160, 89, 0.08)",
                    border: "none",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#8A6E3E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(197, 160, 89, 0.16)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(197, 160, 89, 0.08)"; }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Frame Sandbox */}
            <div style={{ flex: 1, background: "#FAF6F0", position: "relative" }}>
              <iframe
                id="fullscreen-iframe"
                srcDoc={buildPreviewSrcDoc(expandedPreview.filename, expandedPreview.code, files)}
                title="Fullscreen Live Preview Sandbox"
                sandbox="allow-scripts allow-modals allow-same-origin"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#FAF6F0"
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
