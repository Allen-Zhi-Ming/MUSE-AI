/**
 * Agentic Tools Configuration
 * 
 * 集中管理 AI Agent 的相關設定，包含網址存取權限與預設搜尋引擎。
 * 將設定獨立於此檔案，可保持後端架構清晰，方便未來擴充。
 */

export const agentConfig = {
  // 預設的搜尋引擎網址 (DuckDuckGo Lite 為例，免 API Key 且容易解析 HTML)
  defaultSearchEngineUrl: "https://html.duckduckgo.com/html/?q=",

  // 允許 AI 讀取的網域列表 (若為空陣列，代表不限制，但會先過濾掉 disallowed)
  allowedDomains: [
    // "wikipedia.org", 
    // "github.com"
  ],

  // 絕對禁止 AI 存取的網域或關鍵字 (基於安全性考量，防止 SSRF 或讀取內部敏感服務)
  disallowedDomains: [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "10.0.0.",    // 私有 IP 範圍
    "192.168.",   // 私有 IP 範圍
    "172.16.",    // 私有 IP 範圍
    "internal",
    "admin",
    "aws",
    "metadata"
  ]
};

/**
 * 檢查給定的 URL 是否允許被 AI 讀取
 */
export function isUrlAllowed(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();

    // 1. 檢查是否在黑名單中
    for (const disallowed of agentConfig.disallowedDomains) {
      if (hostname.includes(disallowed) || urlStr.includes(disallowed)) {
        return false;
      }
    }

    // 2. 檢查是否在白名單中 (如果有設定的話)
    if (agentConfig.allowedDomains.length > 0) {
      const isAllowed = agentConfig.allowedDomains.some(domain => hostname.includes(domain));
      if (!isAllowed) {
        return false;
      }
    }

    return true;
  } catch (error) {
    // 網址解析失敗，基於安全考量一律拒絕
    return false;
  }
}
