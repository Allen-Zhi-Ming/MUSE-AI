import { AppState, Project, Thread, Message, FileItem, Folder, FileVersion } from "./types";
import { uid, T, MODES, MOCK_FILE_CONTENTS } from "./constants";
import { analytics } from "./utils/analytics";

const getSavedProfile = () => {
  const defaultProfile = { 
    name: "YC", 
    bio: "視覺設計師 · 品牌顧問", 
    avatar: "YC", 
    tone: "活潑自信", 
    cover: "", 
    coverType: "color", 
    coverColor: "linear-gradient(135deg, #FEF3C7, #FDE68A)" 
  };
  try {
    const saved = localStorage.getItem("muse_user_profile");
    if (saved) {
      return { ...defaultProfile, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return defaultProfile;
};

const getSavedAiAssistant = () => {
  const defaultAssistant = {
    name: "Muse AI 智慧伴侶",
    avatar: "🪐",
    constellation: "雙子座",
    personality: "預設",
    bubbleBg: "#FAF3F0", // default match Morandi Bg
    bubbleText: "#3E3532", // default match Morandi Text
    bubbleBorder: "#C68B7F" // default match Morandi Gold
  };
  try {
    const saved = localStorage.getItem("muse_ai_assistant");
    if (saved) {
      return { ...defaultAssistant, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return defaultAssistant;
};

const getSavedEnabledSkills = () => {
  try {
    const saved = localStorage.getItem("muse_enabled_skills");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return {
    similarweb: false,
    markdown: false,
    slides: false,
    github_pages: false,
    github_actions: false,
    git_collab: false
  };
};

export const INIT: AppState = {
  aiAssistant: getSavedAiAssistant(),
  user: null,
  navView: "chat",
  sbOpen: true,
  pvOpen: typeof window !== "undefined" ? window.innerWidth > 768 : false,
  showHistoryDrawer: false,
  showProjectsDrawer: false,
  mode: "spark",
  enabledSkills: getSavedEnabledSkills(),
  genThreads: [{ id: "gt1", title: "品牌策略討論", mode: "spark", ts: "10:42" }, { id: "gt2", title: "技術架構問答", mode: "architect", ts: "昨天" }, { id: "gt3", title: "市場競品研究", mode: "analyst", ts: "2天前" }],
  activeGenThreadId: null,
  projects: [
    {
      id: "p1",
      name: "品牌重構 2025",
      color: "#C5A059",
      phase: "Discovery",
      brief: "為「WaveForm」品牌進行完整定位重構，目標受眾為 25–40 歲創意工作者，核心差異化方向為「工具即創作夥伴」。所有 AI 回應必須符合此框架。",
      folders: [
        { id: "fo1", name: "市場研究", parentId: null },
        { id: "fo2", name: "競品分析", parentId: null }
      ],
      files: [
        {
          id: "fi1",
          name: "市場調查報告.pdf",
          type: "pdf",
          folderId: "fo1",
          size: "2.4 MB",
          content: MOCK_FILE_CONTENTS["市場調查報告.pdf"],
          versions: [
            { id: "v_fi1_1", timestamp: "3天前", content: MOCK_FILE_CONTENTS["市場調查報告.pdf"], author: "You", versionLabel: "V1" }
          ]
        },
        {
          id: "fi2",
          name: "競品分析 Q1.docx",
          type: "docx",
          folderId: "fo2",
          size: "840 KB",
          content: MOCK_FILE_CONTENTS["競品分析 Q1.docx"],
          versions: [
            { id: "v_fi2_1", timestamp: "3天前", content: MOCK_FILE_CONTENTS["競品分析 Q1.docx"], author: "You", versionLabel: "V1" }
          ]
        },
        {
          id: "fi3",
          name: "用戶訪談數據.xlsx",
          type: "xlsx",
          folderId: null,
          size: "1.1 MB",
          content: MOCK_FILE_CONTENTS["用戶訪談數據.xlsx"],
          versions: [
            { id: "v_fi3_1", timestamp: "3天前", content: MOCK_FILE_CONTENTS["用戶訪談數據.xlsx"], author: "You", versionLabel: "V1" }
          ]
        },
        {
          id: "fi4",
          name: "Brand guidelines v3",
          type: "link",
          folderId: null,
          size: null,
          content: MOCK_FILE_CONTENTS["Brand guidelines v3"] || "",
          versions: [
            { id: "v_fi4_1", timestamp: "3天前", content: MOCK_FILE_CONTENTS["Brand guidelines v3"] || "", author: "You", versionLabel: "V1" }
          ]
        }
      ],
      threads: [
        { id: "th1", title: "定位策略分析", mode: "analyst", msgCount: 8, ts: "10:42" },
        { id: "th2", title: "Messaging 審查", mode: "critique", msgCount: 3, ts: "09:15" }
      ],
      members: [
        { id: "mb1", i: "YC", name: "You (owner)", role: "owner", c: "#C5A059" },
        { id: "mb2", i: "LM", name: "Lisa M.", role: "editor", c: "#6c8ac0" },
        { id: "mb3", i: "KC", name: "Ken C.", role: "viewer", c: "#76b193" }
      ],
      tokenUsage: 24800,
      tokenLimit: 100000
    },
    {
      id: "p2",
      name: "Q3 財務分析",
      color: "#6c8ac0",
      phase: "Analysis",
      brief: "針對 Q3 財務數據深度分析，聚焦異常支出與成長瓶頸。輸出格式：董事會簡報。",
      folders: [],
      files: [
        {
          id: "fi5",
          name: "Q3_financial.xlsx",
          type: "xlsx",
          folderId: null,
          size: "3.2 MB",
          content: "姓名,預算,支出,結餘,備註\n行銷部門,50000,48000,2000,合規\n研發團隊,120000,118000,2000,合規\n運營維護,30000,35000,-5000,超支",
          versions: [
            { id: "v_fi5_1", timestamp: "4天前", content: "姓名,預算,支出,結餘,備註\n行銷部門,50000,48000,2000,合規\n研發團隊,120000,118000,2000,合規\n運營維護,30000,35000,-5000,超支", author: "You", versionLabel: "V1" }
          ]
        }
      ],
      threads: [
        { id: "th3", title: "支出異常分析", mode: "analyst", msgCount: 5, ts: "昨天" }
      ],
      members: [
        { id: "mb1", i: "YC", name: "You (owner)", role: "owner", c: "#C5A059" }
      ],
      tokenUsage: 8400,
      tokenLimit: 100000
    },
    {
      id: "p3",
      name: "系統架構評估",
      color: "#a898bc",
      phase: "Synthesis",
      brief: "評估微服務架構擴展瓶頸，提出重構建議。技術棧：Node.js + PostgreSQL + Redis。",
      folders: [
        { id: "fo3", name: "技術文件", parentId: null }
      ],
      files: [
        {
          id: "fi6",
          name: "current_arch.md",
          type: "md",
          folderId: "fo3",
          size: "12 KB",
          content: MOCK_FILE_CONTENTS["current_arch.md"],
          versions: [
            { id: "v_fi6_1", timestamp: "5天前", content: MOCK_FILE_CONTENTS["current_arch.md"], author: "You", versionLabel: "V1" }
          ]
        }
      ],
      threads: [
        { id: "th4", title: "瓶頸識別", mode: "architect", msgCount: 2, ts: "2天前" }
      ],
      members: [
        { id: "mb1", i: "YC", name: "You (owner)", role: "owner", c: "#C5A059" },
        { id: "mb4", i: "RW", name: "Ray W.", role: "editor", c: "#a898bc" }
      ],
      tokenUsage: 3200,
      tokenLimit: 100000
    }
  ],
  reflections: [
    { id: "r1", date: "2024.05.15", mood: "happy", title: "品牌專案大進展", summary: "今天完成了 WaveForm 的核心定位重構，客戶非常滿意。感覺自己的策略思考能力提升了。" },
    { id: "r2", date: "2024.05.14", mood: "calm", title: "寧靜的早晨", summary: "嘗試了新的早起習慣，喝了咖啡並閱讀了 30 分鐘，心情非常穩定。" }
  ],
  notifications: [
    { id: "n1", title: "📅 任務到期提醒", body: "您的任務「品牌重構 2025 ➔ 定位策略分析」即將於 1 小時後截止，請及時跟進！", ts: "13:00", read: false },
    { id: "n2", title: "✨ 每日深度反思", body: "今天忙碌了一天，不妨抽空寫下今天的反思日記，記錄自己的心靈成長吧！", ts: "昨天", read: true }
  ],
  activeNotification: null,
  palettes: [
    { id: "p1", name: "微風奶油", colors: ["#FFF8F0", "#F4F2EE", "#D4C7B0", "#A89B85", "#3D2E1A"] },
    { id: "p2", name: "暗夜迷霧", colors: ["#1E1A2E", "#3D2E1A", "#8A6E3E", "#C5A059", "#F8F6F2"] }
  ],
  cardTemplates: [
    { id: "minimal", name: "極簡留白", desc: "大量空白+單色系", preview: { bg: "#FAFAF9", accent: "#3D2E1A", style: "serif" } },
    { id: "editorial", name: "編輯風", desc: "雜誌排版感", preview: { bg: "#F0EDE8", accent: "#8A6E3E", style: "editorial" } }
  ],
  activeProjId: null, activeThreadId: null, activeFileId: null,
  expanded: ["fo1", "fo2", "fo3"], editingBrief: false, briefDraft: "", rightTab: "info",
  input: "", streaming: false,
  messages: {
    gt1: [{ id: "gm1", role: "user", content: "幫我分析 brand 定位策略，找出最大弱點", ts: "10:42", tokens: null }, { id: "gm2", role: "assistant", mode: "spark", ts: "10:42", tokens: 482, content: "從現有定位來看，核心弱點集中在三個層面：\n\n**品牌識別度模糊** — 視覺語言在不同接觸點缺乏一致性，受眾記憶錨點分散。\n\n**目標受眾重疊** — 主次 persona 邊界模糊，行銷資源被迫分散配置。\n\n**差異化主張不夠鋒利** — 核心 value proposition 無法在 5 秒內傳達。" }],
    gt2: [], gt3: [],
    st1: [{ id: "sm0", role: "assistant", mode: "studio", ts: "", tok: 0, content: "你好！我是你的 Content Studio ✨\n\n選擇上方的平台，告訴我你想發什麼內容，我來幫你寫出最適合的文案。" }],
    jn1: [{ id: "jm0", role: "assistant", mode: "journal", ts: "", tok: 0, content: "今天是新的一天 📓\n\n選擇你現在的心情，或者直接告訴我今天發生了什麼事？我在這裡陪你。" }],
    cm1: [{ id: "cm0", role: "assistant", mode: "comm", ts: "", tok: 0, content: "你好！我是你的溝通助手 💬\n\n選擇上方的情境，告訴我收到什麼訊息或你想說什麼，我來幫你找到最適合的表達方式。" }],

    gr1: [{ id: "gr0", role: "assistant", mode: "growth", ts: "", tok: 0, content: "歡迎來到成長儀表板 📈\n\n你已經連續使用 7 天了 🔥\n\n想要我幫你生成本週成長報告，或者告訴我你正在培養的技能？" }],
    hb1: [{ id: "hb0", role: "assistant", mode: "habit", ts: "", tok: 0, content: "今天的習慣打卡 🌱\n\n選擇上方的模式，我可以幫你：\n· 建立新習慣計劃\n· 購物決策分析\n· 能量週期規劃\n· 預算整理" }],
    mk1: [{ id: "mk0", role: "assistant", mode: "market", ts: "", tok: 0, content: "歡迎來到模板市集 🛒\n\n瀏覽社群分享的 Prompt 模板，找到最適合你的，一鍵套用或自訂。\n\n你也可以上傳自己的模板，幫助其他創作者！" }],
    mm1: [{ id: "mm0", role: "assistant", mode: "memory", ts: "", tok: 0, content: "嗨 YC！我記得你是視覺設計師，主要做品牌設計 🎨\n\n你的個人品牌目標是服務中小企業客戶，喜歡活潑但專業的語調。\n\n今天想聊什麼？或者，你想更新我對你的了解？" }],
    th1: [{ id: "m1", role: "user", content: "分析 WaveForm 的 messaging hierarchy 問題", ts: "10:42", tokens: null }, { id: "m2", role: "assistant", mode: "analyst", ts: "10:42", tokens: 1240, content: "基於「工具即創作夥伴」定位框架，hierarchy 存在三層問題：\n\n**首屏訊息失焦** — 強調功能參數（BPM, latency）而非情感連結。\n\n**中層 proof points 錯位** — 創意工作者買的是「創作可能性」不是「規格表」。\n\n**CTA 層缺乏橋接** — 「了解規格」直跳「立即購買」，跳過信任建立階段。" }],
    th2: [], th3: [], th4: []
  },
  modal: null,
  studioTid: "st1", platform: "ig",
  commTid: "cm1", commScenario: "reply",
  brandTones: ["活潑", "自信"],
  journalTid: "jn1", todayMood: "happy", journalTab: "daily",
  shareCardMsg: null, cardBg: "#FEF3C7", cardTc: "#3D2E1A",
  generatedImages: [],
  generatingImage: false,
  imageGenError: null,
  imageGenSettings: { aspectRatio: "1:1", style: "photorealistic", quality: "standard", cfgScale: 7.5, negativePrompt: "" },

  growthTid: "gr1", streakCount: 7, totalDays: 23,
  skills: [{ name: "寫作", level: 72 }, { name: "策略思考", level: 58 }, { name: "簡報", level: 45 }, { name: "溝通表達", level: 81 }],
  achievements: [{ icon: "🔥", name: "連續7天", earned: true, date: "2024.05.12" }, { icon: "📚", name: "完成10篇日記", earned: true, date: "2024.05.10" }, { icon: "⭐", name: "達成月目標", earned: false, date: "-" }, { icon: "🏆", name: "連續30天", earned: false, date: "-" }],
  marketTid: "mk1", marketTab: "browse", marketSearch: "",
  savedTemplates: ["t2", "t5"],
  memoryTid: "mm1",
  memoryItems: [
    { id: "mi1", cat: "職業", content: "視覺設計師，主要做品牌設計與 UI", ts: "2h前" },
    { id: "mi2", cat: "目標", content: "建立個人品牌，目標客群為中小企業", ts: "昨天" },
    { id: "mi3", cat: "語調", content: "喜歡活潑但專業的語調，適量使用 emoji", ts: "昨天" },
    { id: "mi4", cat: "平台", content: "主要在 IG 和小紅書發文，受眾為 25–35 歲女性", ts: "2天前" },
    { id: "mi5", cat: "習慣", content: "每週日做週回顧，每天晚上11點前睡覺", ts: "3天前" },
  ],
  userProfile: getSavedProfile(),
  habitTid: "hb1", habitMode: "habit",
  habits: [
    { id: "hb1", name: "每日日記", done: false, streak: 7, icon: "📓" },
    { id: "hb2", name: "30分鐘閱讀", done: true, streak: 3, icon: "📚" },
    { id: "hb3", name: "運動20分鐘", done: false, streak: 1, icon: "🏃" },
    { id: "hb4", name: "喝足2L水", done: true, streak: 5, icon: "💧" },
  ],
  theme: "cream",
  chatBgColor: "#FAF6F5",
  apiModel: "gemini-2.5-flash",
  chatTemperature: 0.7,
  customSystemPrompt: "",
  glassmorphismBlur: 12,
  fontFamily: "Georgia Serif",
  hideHomeCover: false,
  enableCustomModels: false,
  customModels: [
    { id: "cm1", name: "deepseek-v3", provider: "DeepSeek", active: false },
    { id: "cm2", name: "minimax-abab6", provider: "MiniMax", active: false },
    { id: "cm3", name: "claude-3.5-sonnet", provider: "Claude", active: false },
    { id: "cm4", name: "gpt-4o", provider: "GPT", active: false }
  ],
  connectedProviders: {},
  studioWordCount: 50,
  studioEmojiDensity: 70,
  memoryResponseLength: 50,
  tasks: [
    { id: "t1", projectId: "p1", title: "撰寫 WaveForm 競品定位分析報導", desc: "彙整 Q1 競品分析報告並編製最終投影片", dueDate: "2026-05-21", priority: "high", status: "in_progress", reminder: true },
    { id: "t2", projectId: "p1", title: "準備創意受眾焦點訪談題目", desc: "擬定訪談大綱，鎖定 25-40 歲創意工作者", dueDate: "2026-05-22", priority: "medium", status: "todo", reminder: false },
    { id: "t3", projectId: "p2", title: "核對 Q3 行銷宣傳異常支出", desc: "分析 Facebook Ads 與 Google Ads 廣告花費是否有超支情況", dueDate: "2026-05-20", priority: "high", status: "done", reminder: true },
    { id: "t4", projectId: "p3", title: "微服務架構 Redis 緩存負載評估", desc: "測試高負載下 Redis 哨兵模式 of 自動故障轉移機制", dueDate: "2026-05-24", priority: "low", status: "todo", reminder: false },
    { id: "t5", projectId: null, title: "日常慢跑 & 冥想半小時", desc: "保持身心平穩，養成晨跑好習慣", dueDate: "2026-05-23", priority: "medium", status: "done", reminder: false }
  ],
  myMuseAssets: [
    {
      id: "preset-1",
      name: "莫蘭迪 · 星光幾何特輯",
      type: "svg",
      content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFF8F0;stop-opacity:1" /><stop offset="100%" style="stop-color:#C5A059;stop-opacity:1" /></linearGradient><linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#FAF2EE;stop-opacity:1" /><stop offset="100%" style="stop-color:#3D2E1A;stop-opacity:1" /></linearGradient></defs><rect width="100" height="100" rx="15" fill="#FAF6F0" /><circle cx="50" cy="50" r="30" fill="url(#grad1)" opacity="0.8" /><circle cx="40" cy="45" r="20" fill="url(#grad2)" opacity="0.6" style="mix-blend-mode: multiply;" /><path d="M 50,25 Q 50,45 30,45 Q 50,45 50,65 Q 50,45 70,45 Q 50,45 50,25 Z" fill="#fff" opacity="0.95" /><circle cx="70" cy="25" r="3" fill="#D4537E" /><circle cx="30" cy="70" r="2" fill="#8A6E3E" /></svg>`,
      ts: "10:42",
      remark: "這是極致奢華的莫蘭迪色系幾何星光 SVG 設計，極具現代美學感。",
      files: {
        "muse-vector.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFF8F0;stop-opacity:1" /><stop offset="100%" style="stop-color:#C5A059;stop-opacity:1" /></linearGradient><linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#FAF2EE;stop-opacity:1" /><stop offset="100%" style="stop-color:#3D2E1A;stop-opacity:1" /></linearGradient></defs><rect width="100" height="100" rx="15" fill="#FAF6F0" /><circle cx="50" cy="50" r="30" fill="url(#grad1)" opacity="0.8" /><circle cx="40" cy="45" r="20" fill="url(#grad2)" opacity="0.6" style="mix-blend-mode: multiply;" /><path d="M 50,25 Q 50,45 30,45 Q 50,45 50,65 Q 50,45 70,45 Q 50,45 50,25 Z" fill="#fff" opacity="0.95" /><circle cx="70" cy="25" r="3" fill="#D4537E" /><circle cx="30" cy="70" r="2" fill="#8A6E3E" /></svg>`,
        "index.html": `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>莫蘭迪 · 星光幾何特輯</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>✨ 莫蘭迪 · 星光幾何特輯</h1>
      <p>由 Muse AI 生成的極奢幾何星光設計</p>
    </header>
    <main>
      <div class="art-frame">
        <div class="vector-content"></div>
      </div>
    </main>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
        "style.css": `body {
  margin: 0;
  padding: 0;
  background: #FAF6F0;
  color: #3D2E1A;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.container {
  text-align: center;
  max-width: 600px;
}
.art-frame {
  width: 320px;
  height: 320px;
  margin: 20px auto;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(61,46,26,0.06);
  border: 1px solid rgba(220, 215, 206, 0.5);
  overflow: hidden;
  padding: 10px;
}`,
        "app.js": `// Muse Vector AI - Client Side Controller
document.addEventListener("DOMContentLoaded", () => {
  console.log("🎨 Muse AI Art successfully loaded!");
  fetch("muse-vector.svg")
    .then(res => res.text())
    .then(data => {
      document.querySelector(".vector-content").innerHTML = data;
    });
});`,
        "README.md": `# 🎀 莫蘭迪 · 星光幾何特輯
本專案由 **MUSE AI** 生成。專案內含反應奶油風奢華美學的極致幾何星光 SVG。`
      }
    }
  ]
};

export function reducer(s: AppState, a: any): AppState {
  // Ensure customModels is always initialized with standard defaults if empty/undefined
  if (!s.customModels || s.customModels.length === 0) {
    s = {
      ...s,
      customModels: [
        { id: "cm1", name: "deepseek-v3", provider: "DeepSeek", active: false },
        { id: "cm2", name: "minimax-abab6", provider: "MiniMax", active: false },
        { id: "cm3", name: "claude-3.5-sonnet", provider: "Claude", active: false },
        { id: "cm4", name: "gpt-4o", provider: "GPT", active: false }
      ]
    };
  }

  try {
    switch (a.type) {
      case "UPDATE_MY_MUSE_ASSET":
        analytics.track("engagement", "編輯 My Muse 成品資訊", `ID: ${a.id}`);
        break;
      case "PUSH_TO_MY_MUSE":
        return {
          ...s,
          myMuseAssets: [a.asset, ...(s.myMuseAssets || [])]
        };
      case "SET_NAV":
        analytics.track("engagement", "切換至頁面", `${a.view}`);
        break;
      case "NEW_GEN_THREAD":
        analytics.track("chat", "建立新智慧對話", `${a.title || "新對話"}`);
        break;
      case "NEW_PROJECT":
        analytics.track("project", "建立新企劃案", `${a.name}`);
        break;
      case "ADD_FILE":
        analytics.track("project", "上傳附加檔案到企劃案", `${a.name} (${a.size || "大小未知"})`);
        break;
      case "ADD_MSG":
        if (a.msg?.role === "user") {
          analytics.track("chat", "傳送訊息給 AI", a.msg.content ? a.msg.content.slice(0, 50) : "無文字");
        }
        break;
      case "TOGGLE_HABIT":
        analytics.track("habit", "打卡生活習慣項目", `ID: ${a.id}`);
        break;
      case "ADD_GENERATED_IMAGE":
        analytics.track("studio", "使用 AI 生成圖片", a.image?.prompt ? a.image.prompt.slice(0, 50) : "無描述");
        break;
      case "SET_THEME":
        analytics.track("theme", "變更系統佈景主題", `${a.theme}`);
        break;
      case "UPDATE_PROFILE":
        analytics.track("engagement", "更新個人專屬檔案", `${a.profile.name} | ${a.profile.tone}`);
        break;
      case "ADD_MEMORY":
        analytics.track("inspi", "新增 AI 記憶存檔", `類別: ${a.cat}`);
        break;
      case "DEL_MEMORY":
        analytics.track("inspi", "刪除 AI 記憶存檔", `ID: ${a.id}`);
        break;
      case "SET_MOOD":
        analytics.track("journal", "紀錄今日心情狀態", `心情: ${a.mood}`);
        break;
      case "SET_COMM_SCENARIO":
        analytics.track("comm", "切換溝通模擬場景", `${a.v}`);
        break;

      case "SET_HABIT_MODE":
        analytics.track("habit", "切換生活規劃模組", a.v === "budget" ? "家庭收支明細" : "日常健康習慣");
        break;
      case "START_EDIT_BRIEF":
        analytics.track("project", "開啟企劃案 Brief 編輯", "");
        break;
      case "SAVE_BRIEF":
        analytics.track("project", "儲存企劃案 Brief 改動", "");
        break;
      case "SET_IMAGE_GEN_SETTING":
        analytics.track("studio", "調整繪圖參數比例", `${a.field}: ${a.val}`);
        break;
    }
  } catch (err) {
    console.error("Analytics failure inside reducer:", err);
  }

  switch (a.type) {
    case "LOAD_STATE_SUCCESS":
      if (!a.data) return s;
      return {
        ...s,
        projects: a.data.projects || s.projects,
        tasks: a.data.tasks || s.tasks,
        messages: a.data.messages || s.messages,
        genThreads: a.data.genThreads || s.genThreads,
        memoryItems: a.data.memoryItems || s.memoryItems,
        habits: a.data.habits || s.habits,
        reflections: a.data.reflections || s.reflections,
      };
    case "SET_NAV": return { ...s, navView: a.view };
    case "TOGGLE_SB": return { ...s, sbOpen: !s.sbOpen };
    case "TOGGLE_PV": return { ...s, pvOpen: !s.pvOpen };
    case "SET_SB_OPEN": return { ...s, sbOpen: a.open };
    case "SET_PV_OPEN": return { ...s, pvOpen: a.open };
    case "TOGGLE_HISTORY_DRAWER": return { ...s, showHistoryDrawer: !s.showHistoryDrawer };
    case "SET_HISTORY_DRAWER": return { ...s, showHistoryDrawer: a.val };
    case "TOGGLE_PROJECTS_DRAWER": return { ...s, showProjectsDrawer: !s.showProjectsDrawer };
    case "SET_PROJECTS_DRAWER": return { ...s, showProjectsDrawer: a.val };
    case "TOGGLE_SKILL": {
      const nextSkills = { ...s.enabledSkills, [a.skillKey]: !s.enabledSkills[a.skillKey] };
      analytics.track("skills", `變更了技能 "${a.skillKey}" 開關狀態為: ${nextSkills[a.skillKey] ? '啟用' : '關閉'}`, "");
      return { ...s, enabledSkills: nextSkills };
    }
    case "SET_STUDIO_SLIDER": return { ...s, [a.field]: a.val };
    case "SET_MEMORY_SLIDER": return { ...s, [a.field]: a.val };
    case "ENTER_PROJECT": { const p = s.projects.find(p => p.id === a.id); return { ...s, navView: "workspace", activeProjId: a.id, activeThreadId: p?.threads[0]?.id || null }; }
    case "BACK_TO_PROJ": return { ...s, navView: "projects", activeProjId: null, activeThreadId: null, editingBrief: false };
    case "NEW_GEN_THREAD": { const id = a.id || uid(); return { ...s, genThreads: [{ id, title: a.title || "新對話", mode: s.mode, ts: "剛剛" }, ...s.genThreads], activeGenThreadId: id, messages: { ...s.messages, [id]: [] }, modal: null }; }
    case "SELECT_GEN_THREAD": return { ...s, activeGenThreadId: a.id };
    case "DELETE_GEN_THREAD": { const rem = s.genThreads.filter(t => t.id !== a.id); return { ...s, genThreads: rem, activeGenThreadId: s.activeGenThreadId === a.id ? (rem[0]?.id || null) : s.activeGenThreadId }; }
    case "NEW_PROJECT": { const tid = uid(); const proj: Project = { id: uid(), name: a.name, color: a.color, phase: "Discovery", brief: a.brief || "", folders: [], files: [], threads: [{ id: tid, title: "第一個對話", mode: "spark", msgCount: 0, ts: "剛剛" }], members: [{ id: "mb1", i: "YC", name: "You (owner)", role: "owner", c: T.gold }], tokenUsage: 0, tokenLimit: 100000 }; return { ...s, projects: [...s.projects, proj], messages: { ...s.messages, [tid]: [] }, modal: null }; }
    case "DELETE_PROJECT": return { ...s, projects: s.projects.filter(p => p.id !== a.id) };
    case "UPDATE_PROJ_FIELD": return { ...s, projects: s.projects.map(p => p.id === s.activeProjId ? { ...p, [a.field]: a.value } : p) };
    case "START_EDIT_BRIEF": { const p = s.projects.find(p => p.id === s.activeProjId); return { ...s, editingBrief: true, briefDraft: p?.brief || "" }; }
    case "SET_BRIEF_DRAFT": return { ...s, briefDraft: a.text };
    case "SAVE_BRIEF": return { ...s, editingBrief: false, projects: s.projects.map(p => p.id === s.activeProjId ? { ...p, brief: s.briefDraft } : p) };
    case "CANCEL_BRIEF": return { ...s, editingBrief: false };
    case "LOGIN_SUCCESS": return { ...s, user: a.user, userProfile: { ...s.userProfile, name: a.user.name, avatar: a.user.avatar } };
    case "LOGOUT": return { ...s, user: null };
    case "MOVE_FILE": {
      return {
        ...s,
        projects: s.projects.map(p => p.id === s.activeProjId ? {
          ...p,
          files: p.files.map(f => f.id === a.fileId ? { ...f, folderId: a.toFolderId } : f)
        } : p)
      };
    }
    case "MOVE_FOLDER": {
      return {
        ...s,
        projects: s.projects.map(p => p.id === s.activeProjId ? {
          ...p,
          folders: p.folders.map(f => f.id === a.folderId ? { ...f, parentId: a.toFolderId } : f)
        } : p)
      };
    }
    case "SAVE_FILE_CONTENT": {
      return {
        ...s,
        projects: s.projects.map(p => {
          if (p.id !== s.activeProjId) return p;
          return {
            ...p,
            files: p.files.map(f => {
              if (f.id === a.fileId || f.name === a.filename) {
                const nextLabel = `V${(f.versions?.length || 0) + 1}`;
                const newVer = { id: uid(), timestamp: "剛剛", content: a.content, author: a.author || "You", versionLabel: nextLabel };
                return {
                  ...f,
                  content: a.content,
                  versions: [...(f.versions || []), newVer]
                };
              }
              return f;
            })
          };
        })
      };
    }
    case "UPDATE_FILE_AI_VERSION": {
      return {
        ...s,
        projects: s.projects.map(p => {
          if (p.id !== s.activeProjId) return p;
          const exists = p.files.find(f => f.name === a.name);
          if (exists) {
            const nextLabel = `V${(exists.versions?.length || 0) + 1}`;
            const newVer = { id: uid(), timestamp: "剛剛", content: a.content, author: "AI", versionLabel: nextLabel };
            return {
              ...p,
              files: p.files.map(f => f.name === a.name ? { ...f, content: a.content, versions: [...(f.versions || []), newVer] } : f)
            };
          } else {
            const newFile = {
              id: uid(),
              name: a.name,
              type: a.ftype,
              folderId: a.folderId || null,
              size: a.size || "—",
              content: a.content,
              versions: [{ id: uid(), timestamp: "剛剛", content: a.content, author: "AI", versionLabel: "V1" }]
            };
            return { ...p, files: [...p.files, newFile] };
          }
        })
      };
    }
    case "ADD_FOLDER": { const folder = { id: uid(), name: a.name, parentId: null }; return { ...s, modal: null, projects: s.projects.map(p => p.id === s.activeProjId ? { ...p, folders: [...p.folders, folder] } : p) }; }
    case "DELETE_FOLDER": return { ...s, projects: s.projects.map(p => p.id !== s.activeProjId ? p : { ...p, folders: p.folders.filter(f => f.id !== a.id), files: p.files.map(f => f.folderId === a.id ? { ...f, folderId: null } : f) }) };
    case "TOGGLE_FOLDER": return { ...s, expanded: s.expanded.includes(a.id) ? s.expanded.filter(i => i !== a.id) : [...s.expanded, a.id] };
    case "ADD_FILE": { 
      const proj = s.projects.find(p => p.id === s.activeProjId);
      if (!proj || proj.files.length >= 10) return s;

      const fileId = uid();
      const fileContent = a.content || "";
      const file = { 
        id: fileId, 
        name: a.name, 
        type: a.ftype, 
        folderId: a.folderId || null, 
        size: a.size || "—", 
        content: fileContent,
        versions: [
          { id: uid(), timestamp: "剛剛", content: fileContent, author: "You", versionLabel: "V1" }
        ]
      }; 
      return { ...s, modal: null, projects: s.projects.map(p => p.id === s.activeProjId ? { ...p, files: [...p.files, file] } : p) }; 
    }
    case "DELETE_FILE": return { ...s, activeFileId: s.activeFileId === a.id ? null : s.activeFileId, projects: s.projects.map(p => p.id === s.activeProjId ? { ...p, files: p.files.filter(f => f.id !== a.id) } : p) };
    case "SET_ACTIVE_FILE": return { ...s, activeFileId: s.activeFileId === a.id ? null : a.id };
    case "NEW_PROJ_THREAD": { const id = uid(); return { ...s, modal: null, activeThreadId: id, messages: { ...s.messages, [id]: [] }, projects: s.projects.map(p => p.id === s.activeProjId ? { ...p, threads: [...p.threads, { id, title: a.title, mode: s.mode, msgCount: 0, ts: "剛剛" }] } : p) }; }
    case "DELETE_PROJ_THREAD": { const proj = s.projects.find(p => p.id === s.activeProjId); if (!proj) return s; const rem = proj.threads.filter(t => t.id !== a.id); return { ...s, activeThreadId: s.activeThreadId === a.id ? (rem[0]?.id || null) : s.activeThreadId, projects: s.projects.map(p => p.id === s.activeProjId ? { ...p, threads: rem } : p) }; }
    case "SELECT_PROJ_THREAD": return { ...s, activeThreadId: a.id };
    case "SET_MODE": return { ...s, mode: a.mode };
    case "SET_INPUT": return { ...s, input: a.text };
    case "SET_STREAMING": return { ...s, streaming: a.val };
    case "ADD_MSG": return { ...s, messages: { ...s.messages, [a.tid]: [...(s.messages[a.tid] || []), a.msg] } };
    case "EDIT_AND_TRUNCATE_MSG": {
      const arr = s.messages[a.tid] || [];
      const idx = arr.findIndex((m: any) => m.id === a.msgId);
      if (idx === -1) return s;
      const sliced = arr.slice(0, idx + 1);
      sliced[idx] = { ...sliced[idx], content: a.newContent };
      return {
        ...s,
        messages: {
          ...s.messages,
          [a.tid]: sliced
        }
      };
    }
    case "UPDATE_LAST": { const arr = s.messages[a.tid] || []; return { ...s, messages: { ...s.messages, [a.tid]: arr.map((m, i) => i === arr.length - 1 ? { ...m, content: a.content } : m) } } };
    case "FINISH_STREAM": { const arr = s.messages[a.tid] || []; const newMsgs = { ...s.messages, [a.tid]: arr.map((m, i) => i === arr.length - 1 ? { ...m, tokens: a.tokens } : m) }; const np = s.navView === "workspace" ? s.projects.map(p => p.id !== s.activeProjId ? p : { ...p, tokenUsage: p.tokenUsage + (a.tokens || 0), threads: p.threads.map(t => t.id === a.tid ? { ...t, msgCount: (t.msgCount || 0) + 2, ts: "剛剛" } : t) }) : s.projects; const ng = s.navView === "chat" ? s.genThreads.map(t => t.id === a.tid ? { ...t, ts: "剛剛" } : t) : s.genThreads; return { ...s, streaming: false, messages: newMsgs, projects: np, genThreads: ng }; }
    case "OPEN_MODAL": return { ...s, modal: a.modal };
    case "CLOSE_MODAL": return { ...s, modal: null };
    case "SET_RIGHT_TAB": return { ...s, rightTab: a.tab };
    case "SET_PLATFORM": return { ...s, platform: a.v };
    case "TOGGLE_BRAND_TONE": { const tones = s.brandTones.includes(a.tone) ? s.brandTones.filter(t => t !== a.tone) : [...s.brandTones, a.tone]; return { ...s, brandTones: tones }; }
    case "SET_MOOD": return { ...s, todayMood: a.mood };
    case "SET_COMM_SCENARIO": return { ...s, commScenario: a.v };

    case "TOGGLE_HABIT": { const habits = s.habits.map(h => h.id === a.id ? { ...h, done: !h.done } : h); return { ...s, habits }; }
    case "SET_HABIT_MODE": return { ...s, habitMode: a.v };
    case "SET_JOURNAL_TAB": return { ...s, journalTab: a.tab };
    case "SET_MARKET_TAB": return { ...s, marketTab: a.tab };
    case "SET_MARKET_SEARCH": return { ...s, marketSearch: a.v };
    case "TOGGLE_SAVE_TEMPLATE": { 
      const isSaving = !s.savedTemplates.includes(a.id);
      analytics.track("engagement", isSaving ? "儲存/收藏商品範本" : "移除收藏商品範本", `ID: ${a.id}`);
      const saved = s.savedTemplates.includes(a.id) ? s.savedTemplates.filter(i => i !== a.id) : [...s.savedTemplates, a.id]; 
      return { ...s, savedTemplates: saved }; 
    }
    case "ADD_MEMORY": { const item = { id: "mi" + Date.now(), cat: a.cat, content: a.content, ts: "剛剛" }; return { ...s, memoryItems: [...s.memoryItems, item] }; }
    case "DEL_MEMORY": return { ...s, memoryItems: s.memoryItems.filter(m => m.id !== a.id) };
    case "SET_SHARE_CARD": return { ...s, shareCardMsg: a.msg };
    case "ADD_GENERATED_IMAGE": return { ...s, generatedImages: [a.image, ...s.generatedImages], generatingImage: false, imageGenError: null };
    case "UPDATE_GENERATED_IMAGE": { 
      const newList = [...s.generatedImages]; 
      if (newList[a.index]) {
        newList[a.index] = { ...newList[a.index], url: a.url };
      }
      return { ...s, generatedImages: newList }; 
    }
    case "DEL_GENERATED_IMAGE": return { ...s, generatedImages: s.generatedImages.filter((_, i) => i !== a.index) };
    case "REORDER_GENERATED_IMAGES": return { ...s, generatedImages: a.images };
    case "SET_IMAGE_GEN_ERROR": return { ...s, imageGenError: a.error, generatingImage: false };
    case "SET_GENERATING_IMAGE": return { ...s, generatingImage: a.val };
    case "SET_IMAGE_GEN_SETTING": return { ...s, imageGenSettings: { ...s.imageGenSettings, [a.field]: a.val } };
    case "SET_CARD_BG": return { ...s, cardBg: a.bg, cardTc: a.tc };
    case "SET_THEME": return { ...s, theme: a.theme };
    case "SET_CHAT_BG_COLOR": return { ...s, chatBgColor: a.color };
    case "UPDATE_PROFILE": {
      const nextProfile = { ...s.userProfile, ...a.profile };
      try {
        localStorage.setItem("muse_user_profile", JSON.stringify(nextProfile));
      } catch (e) {}
      return { ...s, userProfile: nextProfile };
    }
    case "UPDATE_AI_ASSISTANT": {
      const nextAssistant = { ...s.aiAssistant, ...a.aiAssistant };
      try {
        localStorage.setItem("muse_ai_assistant", JSON.stringify(nextAssistant));
      } catch (e) {}
      return { ...s, aiAssistant: nextAssistant as any };
    }
    case "ADD_TASK": { const t = { id: uid(), status: "todo", priority: "medium", reminder: false, ...a.task }; return { ...s, tasks: [...s.tasks, t] }; }
    case "UPDATE_TASK": return { ...s, tasks: s.tasks.map(t => t.id === a.task.id ? { ...t, ...a.task } : t) };
    case "REORDER_TASKS": return { ...s, tasks: a.tasks };
    case "DELETE_TASK": return { ...s, tasks: s.tasks.filter(t => t.id !== a.id) };
    case "UPDATE_MY_MUSE_ASSET": return { ...s, myMuseAssets: s.myMuseAssets.map(asset => asset.id === a.id ? { ...asset, name: a.name, remark: a.remark } : asset) };
    case "TOGGLE_TASK_STATUS": return { ...s, tasks: s.tasks.map(t => t.id === a.id ? { ...t, status: t.status === "done" ? "todo" : (t.status === "todo" ? "in_progress" : "done") } : t) };
    case "ADD_REFLECTION": {
      const ref = { id: uid(), date: a.date || new Date().toLocaleDateString("zh-TW"), mood: a.mood, title: a.title, summary: a.summary };
      return { ...s, reflections: [ref, ...s.reflections] };
    }
    case "DELETE_REFLECTION": return { ...s, reflections: s.reflections.filter(r => r.id !== a.id) };
    case "TRIGGER_NOTIFICATION": {
      const notif = { id: uid(), title: a.title, body: a.body, ts: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }), read: false };
      return { ...s, activeNotification: notif, notifications: [notif, ...(s.notifications || [])] };
    }
    case "CLEAR_ACTIVE_NOTIFICATION": return { ...s, activeNotification: null };
    case "CLEAR_UNREAD_NOTIFICATIONS": {
      const updated = (s.notifications || []).map(n => ({ ...n, read: true }));
      return { ...s, notifications: updated };
    }
    case "SET_API_MODEL": return { ...s, apiModel: a.val };
    case "SET_CHAT_TEMP": return { ...s, chatTemperature: a.val };
    case "SET_CUSTOM_SYS_PROMPT": return { ...s, customSystemPrompt: a.val };
    case "SET_GLASS_BLUR": return { ...s, glassmorphismBlur: a.val };
    case "SET_FONT_FAMILY": return { ...s, fontFamily: a.val };
    case "SET_HIDE_HOME_COVER": return { ...s, hideHomeCover: a.val };
    case "SET_ENABLE_CUSTOM_MODELS": {
      const defaultApiModel = a.val 
        ? (s.customModels?.[0]?.name || "deepseek-v3") 
        : "gemini-2.5-flash";
      return { 
        ...s, 
        enableCustomModels: a.val,
        apiModel: defaultApiModel
      };
    }
    case "ADD_CUSTOM_MODEL": {
      const newModel = { id: `cm-${Date.now()}`, name: a.name, provider: a.provider, active: false };
      return { 
        ...s, 
        customModels: [...(s.customModels || []), newModel],
        apiModel: a.name
      };
    }
    case "DELETE_CUSTOM_MODEL": {
      const filtered = (s.customModels || []).filter(m => m.id !== a.id);
      const isDeletingSelected = s.apiModel === (s.customModels || []).find(m => m.id === a.id)?.name;
      let nextModel = s.apiModel;
      let enableCustom = s.enableCustomModels;
      
      if (isDeletingSelected) {
        if (filtered.length > 0) {
          nextModel = filtered[0].name;
        } else {
          nextModel = "gemini-2.5-flash";
          enableCustom = false;
        }
      }
      return { 
        ...s, 
        customModels: filtered,
        apiModel: nextModel,
        enableCustomModels: enableCustom
      };
    }
    case "SET_CUSTOM_MODELS": {
      return {
        ...s,
        customModels: a.models || []
      };
    }
    case "CONNECT_PROVIDER_WITH_MODELS": {
      const { provider, apiKey, models: fetchedModels } = a;
      const nextProviders = { ...(s.connectedProviders || {}), [provider]: apiKey };
      
      // Remove existing models for this provider, then add fetched ones
      const currentModels = (s.customModels || []).filter((m: any) => m.provider !== provider);
      const nextModels = [...currentModels, ...fetchedModels];
      
      // Auto-select first model from this provider
      const selectModelName = fetchedModels.length > 0 ? fetchedModels[0].name : s.apiModel;

      return {
        ...s,
        connectedProviders: nextProviders,
        customModels: nextModels,
        apiModel: selectModelName,
        enableCustomModels: true
      };
    }
    case "CONNECT_PROVIDER": {
      const { provider, apiKey } = a;
      const nextProviders = { ...(s.connectedProviders || {}), [provider]: apiKey };
      
      // Get standard models for this provider
      const providerModels: any[] = [];
      if (provider === "DeepSeek") {
        providerModels.push(
          { id: `ds-${Date.now()}-1`, name: "deepseek-chat", provider: "DeepSeek" },
          { id: `ds-${Date.now()}-2`, name: "deepseek-reasoner", provider: "DeepSeek" },
          { id: `ds-${Date.now()}-3`, name: "deepseek-coder", provider: "DeepSeek" }
        );
      } else if (provider === "MiniMax") {
        providerModels.push(
          { id: `mm-${Date.now()}-1`, name: "abab6.5s-chat", provider: "MiniMax" },
          { id: `mm-${Date.now()}-2`, name: "abab6.5t-chat", provider: "MiniMax" },
          { id: `mm-${Date.now()}-3`, name: "abab6.5g-chat", provider: "MiniMax" }
        );
      } else if (provider === "Claude") {
        providerModels.push(
          { id: `cl-${Date.now()}-1`, name: "claude-3-5-sonnet-20241022", provider: "Claude" },
          { id: `cl-${Date.now()}-2`, name: "claude-3-5-haiku-20241022", provider: "Claude" },
          { id: `cl-${Date.now()}-3`, name: "claude-3-opus-20240229", provider: "Claude" }
        );
      } else if (provider === "GPT") {
        providerModels.push(
          { id: `gpt-${Date.now()}-1`, name: "gpt-4o", provider: "GPT" },
          { id: `gpt-${Date.now()}-2`, name: "gpt-4o-mini", provider: "GPT" },
          { id: `gpt-${Date.now()}-3`, name: "o1-preview", provider: "GPT" },
          { id: `gpt-${Date.now()}-4`, name: "o1-mini", provider: "GPT" }
        );
      }

      // Filter out existing models with the same name to prevent duplicates
      const currentModels = s.customModels || [];
      const newModels = providerModels.filter(pm => !currentModels.some(cm => cm.name === pm.name));
      const nextModels = [...currentModels, ...newModels];
      
      // Auto-select the first newly added model
      const selectModelName = providerModels[0]?.name || s.apiModel;

      return {
        ...s,
        connectedProviders: nextProviders,
        customModels: nextModels,
        apiModel: selectModelName,
        enableCustomModels: true
      };
    }
    case "DISCONNECT_PROVIDER": {
      const { provider } = a;
      const nextProviders = { ...(s.connectedProviders || {}) };
      delete nextProviders[provider];

      // Remove all custom models for this provider
      const filtered = (s.customModels || []).filter(m => m.provider !== provider);
      const isDeletingSelected = (s.customModels || []).some(m => m.provider === provider && m.name === s.apiModel);
      let nextModel = s.apiModel;
      let enableCustom = s.enableCustomModels;

      if (isDeletingSelected) {
        if (filtered.length > 0) {
          nextModel = filtered[0].name;
        } else {
          nextModel = "gemini-2.5-flash";
          enableCustom = false;
        }
      }

      return {
        ...s,
        connectedProviders: nextProviders,
        customModels: filtered,
        apiModel: nextModel,
        enableCustomModels: enableCustom
      };
    }
    case "REFRESH_CUSTOM_MODELS": {
      const defaults = [
        { id: "cm1", name: "deepseek-v3", provider: "DeepSeek" },
        { id: "cm2", name: "minimax-abab6", provider: "MiniMax" },
        { id: "cm3", name: "claude-3.5-sonnet", provider: "Claude" },
        { id: "cm4", name: "gpt-4o", provider: "GPT" }
      ];

      const connected = Object.keys(s.connectedProviders || {});
      if (connected.length === 0) {
        const merged = s.customModels && s.customModels.length > 0 ? s.customModels : defaults;
        return { ...s, customModels: [...merged] };
      }

      let refreshedModels: any[] = [];
      const manualModels = (s.customModels || []).filter(m => {
        const isStandardDeepSeek = m.provider === "DeepSeek" && ["deepseek-chat", "deepseek-reasoner", "deepseek-coder"].includes(m.name);
        const isStandardMiniMax = m.provider === "MiniMax" && ["abab6.5s-chat", "abab6.5t-chat", "abab6.5g-chat"].includes(m.name);
        const isStandardClaude = m.provider === "Claude" && ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"].includes(m.name);
        const isStandardGPT = m.provider === "GPT" && ["gpt-4o", "gpt-4o-mini", "o1-preview", "o1-mini"].includes(m.name);
        return !isStandardDeepSeek && !isStandardMiniMax && !isStandardClaude && !isStandardGPT;
      });

      refreshedModels = [...manualModels];

      connected.forEach(provider => {
        if (provider === "DeepSeek") {
          refreshedModels.push(
            { id: `ds-ref-1`, name: "deepseek-chat", provider: "DeepSeek" },
            { id: `ds-ref-2`, name: "deepseek-reasoner", provider: "DeepSeek" },
            { id: `ds-ref-3`, name: "deepseek-coder", provider: "DeepSeek" }
          );
        } else if (provider === "MiniMax") {
          refreshedModels.push(
            { id: `mm-ref-1`, name: "abab6.5s-chat", provider: "MiniMax" },
            { id: `mm-ref-2`, name: "abab6.5t-chat", provider: "MiniMax" },
            { id: `mm-ref-3`, name: "abab6.5g-chat", provider: "MiniMax" }
          );
        } else if (provider === "Claude") {
          refreshedModels.push(
            { id: `cl-ref-1`, name: "claude-3-5-sonnet-20241022", provider: "Claude" },
            { id: `cl-ref-2`, name: "claude-3-5-haiku-20241022", provider: "Claude" },
            { id: `cl-ref-3`, name: "claude-3-opus-20240229", provider: "Claude" }
          );
        } else if (provider === "GPT") {
          refreshedModels.push(
            { id: `gpt-ref-1`, name: "gpt-4o", provider: "GPT" },
            { id: `gpt-ref-2`, name: "gpt-4o-mini", provider: "GPT" },
            { id: `gpt-ref-3`, name: "o1-preview", provider: "GPT" },
            { id: `gpt-ref-4`, name: "o1-mini", provider: "GPT" }
          );
        }
      });

      return {
        ...s,
        customModels: refreshedModels
      };
    }
    case "IMPORT_ALL_DATA": return { ...s, ...a.data };
    case "RESET_STATE": return { ...INIT };
    default: return s;
  }
}
