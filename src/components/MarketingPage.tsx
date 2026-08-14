import React from 'react';
import { motion } from 'motion/react';
import { Zap, Shield, FileText, Smartphone, Network, Languages, PenTool, LayoutTemplate, History } from 'lucide-react';
import { T } from '../constants'; // For theme colors if needed, though we will use Tailwind mostly for structure and inline styles for exact Morandi colors.
import type { MuseLocale } from '../lib/musediniLocale';

interface MarketingPageProps {
  locale: MuseLocale;
  onLocaleChange: (locale: MuseLocale) => void;
}

const translations = {
  zh: {
    navTitle: "MUSE AI",
    loginBtn: "開啟工作區",
    closedBeta: "封測中",
    tagline: "高奢智慧寫作與個人企劃案沙盒",
    heroTitlePart1: "重塑靈感，",
    heroTitlePart2: "淬鍊卓越文字",
    heroDesc: "Muse AI 專為極致內容創作者打造。融合 Local-First 本地隱私與強大 AI 協作，這是一個純淨、無干擾的智慧寫作與文件管理宇宙，讓您的每一個點子都能優雅落地。",
    exploreBtn: "立即進入沙盒",
    learnMoreBtn: "探索功能",
    whyChooseTitle: "為何選擇 MUSE AI？",
    whyChooseSubtitle: "專為高價值內容創造而生的基礎架構",
    ctaTitle: "準備好開始您的下一個偉大企劃了嗎？",
    ctaDesc: "無論是深度研究、文學創作還是專業報告，Muse AI 都能為您提供最優雅的撰寫與整理體驗。",
    ctaBtn: "免費建立個人工作區",
    aboutMusedini: "關於 Musedini",
    guide: "公開指南",
    terms: "服務條款",
    privacy: "隱私權政策",
    copyright: "Musedini. 保留所有權利。",
    features: [
      {
        icon: "Shield",
        title: "極致隱私保護 (Local-First)",
        desc: "您的創作心血預設儲存於裝置本地端。在單機沙盒模式下，給您最高規格的安全感與隱私保護。"
      },
      {
        icon: "PenTool",
        title: "智慧寫作助理",
        desc: "整合頂尖大型語言模型，隨時為您提供靈感啟發、文章續寫、語氣潤飾與結構重組，成為您的第二大腦。"
      },
      {
        icon: "Network",
        title: "靈動樹狀整理",
        desc: "極致流暢的樹狀雙端拖放體驗，讓思緒與資料層級平滑歸位、井然有序，告別凌亂的文件夾。"
      },
      {
        icon: "History",
        title: "時光沙盒 (版本控制)",
        desc: "仿若時光機的 Git-like 版本歷史，逐行還原靈感蛻變與卓越演進，讓您隨時找回最初的感動。"
      },
      {
        icon: "FileText",
        title: "無縫格式匯出",
        desc: "支援一鍵生成 100% 真實 PDF、Word 及 Excel 格式，無縫連動您的日常辦公與專業出版系統。"
      },
      {
        icon: "LayoutTemplate",
        title: "莫蘭迪美學介面",
        desc: "低飽和度的莫蘭迪色系設計，減少長時間工作的視覺疲勞，打造沉浸式、純粹的頂級寫作環境。"
      }
    ]
  },
  'zh-Hans': {
    navTitle: "MUSE AI",
    loginBtn: "开启工作区",
    closedBeta: "封测中",
    tagline: "高奢智能写作与个人企划案沙盒",
    heroTitlePart1: "重塑灵感，",
    heroTitlePart2: "淬炼卓越文字",
    heroDesc: "Muse AI 专为极致内容创作者打造。融合 Local-First 本地隐私与强大 AI 协作，这是一个纯净、无干扰的智能写作与文件管理宇宙，让您的每一个点子都能优雅落地。",
    exploreBtn: "立即进入沙盒",
    learnMoreBtn: "探索功能",
    whyChooseTitle: "为何选择 MUSE AI？",
    whyChooseSubtitle: "专为高价值内容创造而生的基础架构",
    ctaTitle: "准备好开始您的下一个伟大企划了吗？",
    ctaDesc: "无论是深度研究、文学创作还是专业报告，Muse AI 都能为您提供最优雅的撰写与整理体验。",
    ctaBtn: "免费建立个人工作区",
    aboutMusedini: "关于 Musedini",
    guide: "公开指南",
    terms: "服务条款",
    privacy: "隐私权政策",
    copyright: "Musedini. 保留所有权利。",
    features: [
      {
        icon: "Shield",
        title: "极致隐私保护 (Local-First)",
        desc: "您的创作心血默认储存于设备本地端。在单机沙盒模式下，给您最高规格的安全感与隐私保护。"
      },
      {
        icon: "PenTool",
        title: "智能写作助理",
        desc: "整合顶尖大型语言模型，随时为您提供灵感启发、文章续写、语气润饰与结构重组，成为您的第二大脑。"
      },
      {
        icon: "Network",
        title: "灵动树状整理",
        desc: "极致流畅的树状双端拖放体验，让思绪与资料层级平滑归位、井然有序，告别凌乱的文件夹。"
      },
      {
        icon: "History",
        title: "时光沙盒 (版本控制)",
        desc: "仿若时光机的 Git-like 版本历史，逐行还原灵感蜕变与卓越演进，让您随时找回最初的感动。"
      },
      {
        icon: "FileText",
        title: "无缝格式导出",
        desc: "支持一键生成 100% 真实 PDF、Word 及 Excel 格式，无缝联动您的日常办公与专业出版系统。"
      },
      {
        icon: "LayoutTemplate",
        title: "莫兰迪美学界面",
        desc: "低饱和度的莫兰迪色系设计，减少长时间工作的视觉疲劳，打造沉浸式、纯粹的顶级写作环境。"
      }
    ]
  },
  en: {
    navTitle: "MUSE AI",
    loginBtn: "Launch Workspace",
    closedBeta: "Closed beta",
    tagline: "Premium Smart Writing & Personal Project Sandbox",
    heroTitlePart1: "Reshape Inspiration,",
    heroTitlePart2: "Refine Excellence",
    heroDesc: "Muse AI is crafted for ultimate content creators. Blending Local-First privacy with powerful AI collaboration, it's a pure, distraction-free smart writing and document management universe where every idea lands elegantly.",
    exploreBtn: "Enter Sandbox Now",
    learnMoreBtn: "Explore Features",
    whyChooseTitle: "Why Choose MUSE AI?",
    whyChooseSubtitle: "Infrastructure built for high-value content creation",
    ctaTitle: "Ready to start your next great project?",
    ctaDesc: "Whether it's in-depth research, literary creation, or professional reports, Muse AI provides you with the most elegant writing and organizing experience.",
    ctaBtn: "Create Free Workspace",
    aboutMusedini: "About Musedini",
    guide: "Public guide",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    copyright: "Musedini. All rights reserved.",
    features: [
      {
        icon: "Shield",
        title: "Ultimate Privacy (Local-First)",
        desc: "Your creative work is stored locally on your device by default. Sandbox mode provides the highest level of security and privacy."
      },
      {
        icon: "PenTool",
        title: "Smart Writing Assistant",
        desc: "Integrated with top LLMs to provide inspiration, text continuation, tone refinement, and restructuring at any time."
      },
      {
        icon: "Network",
        title: "Dynamic Tree Organization",
        desc: "Fluid drag-and-drop tree interface keeps your thoughts and data hierarchy perfectly organized. Say goodbye to messy folders."
      },
      {
        icon: "History",
        title: "Time Sandbox (Version Control)",
        desc: "A Git-like version history acts as a time machine, restoring the evolution of your inspiration line by line."
      },
      {
        icon: "FileText",
        title: "Seamless Format Export",
        desc: "One-click export to 100% real PDF, Word, and Excel formats, seamlessly connecting to your daily office and publishing systems."
      },
      {
        icon: "LayoutTemplate",
        title: "Morandi Aesthetic UI",
        desc: "Low-saturation Morandi color design reduces visual fatigue during long hours, creating an immersive, pure writing environment."
      }
    ]
  },
  ja: {
    navTitle: "MUSE AI",
    loginBtn: "ワークスペースを開く",
    closedBeta: "クローズドベータ",
    tagline: "高級なスマート執筆＆個人プロジェクトサンドボックス",
    heroTitlePart1: "インスピレーションを再構築し、",
    heroTitlePart2: "卓越した文章を磨き上げる",
    heroDesc: "Muse AI は究極のコンテンツクリエイターのために作られました。ローカルファーストのプライバシーと強力なAIコラボレーションを融合させた、純粋で集中できるスマート執筆・ドキュメント管理の宇宙です。",
    exploreBtn: "今すぐサンドボックスへ",
    learnMoreBtn: "機能を探索",
    whyChooseTitle: "なぜ MUSE AI を選ぶのか？",
    whyChooseSubtitle: "高付加価値なコンテンツ作成のためのインフラストラクチャ",
    ctaTitle: "次の素晴らしいプロジェクトを始める準備はできましたか？",
    ctaDesc: "綿密な調査、文学的創作、専門的なレポートなど、Muse AI は最もエレガントな執筆と整理の体験を提供します。",
    ctaBtn: "無料のワークスペースを作成",
    aboutMusedini: "Musedini について",
    guide: "公開ガイド",
    terms: "利用規約",
    privacy: "プライバシーポリシー",
    copyright: "Musedini. All rights reserved.",
    features: [
      {
        icon: "Shield",
        title: "究極のプライバシー (ローカルファースト)",
        desc: "あなたの創作物はデフォルトでデバイスのローカルに保存されます。サンドボックスモードにより最高レベルのセキュリティを提供します。"
      },
      {
        icon: "PenTool",
        title: "スマート執筆アシスタント",
        desc: "トップクラスのLLMを統合し、インスピレーションの提供、文章の続き、トーンの洗練、構造の再編成をいつでもサポートします。"
      },
      {
        icon: "Network",
        title: "動的なツリー整理",
        desc: "極めてスムーズなドラッグ＆ドロップのツリーUIにより、思考とデータの階層が整理され、煩雑なフォルダから解放されます。"
      },
      {
        icon: "History",
        title: "タイムサンドボックス (バージョン管理)",
        desc: "タイムマシンのようなGit風のバージョン履歴により、インスピレーションの進化と卓越へのプロセスを行単位で復元します。"
      },
      {
        icon: "FileText",
        title: "シームレスなフォーマット出力",
        desc: "100%本物のPDF、Word、Excel形式へのワンクリック出力に対応し、日常のオフィスや出版システムとシームレスに連携します。"
      },
      {
        icon: "LayoutTemplate",
        title: "モランディ美学のUI",
        desc: "低彩度のモランディカラー設計により、長時間の作業による目の疲れを軽減し、没入型で純粋な執筆環境を作り出します。"
      }
    ]
  },
  ko: {
    navTitle: "MUSE AI",
    loginBtn: "워크스페이스 열기",
    closedBeta: "비공개 베타",
    tagline: "프리미엄 스마트 글쓰기 및 개인 프로젝트 샌드박스",
    heroTitlePart1: "영감을 재구성하고,",
    heroTitlePart2: "탁월함을 정제하다",
    heroDesc: "Muse AI는 궁극의 콘텐츠 크리에이터를 위해 만들어졌습니다. 로컬 퍼스트 프라이버시와 강력한 AI 협업이 융합된, 방해 요소 없는 순수한 스마트 글쓰기 및 문서 관리 우주입니다.",
    exploreBtn: "지금 샌드박스 입장",
    learnMoreBtn: "기능 살펴보기",
    whyChooseTitle: "왜 MUSE AI인가요?",
    whyChooseSubtitle: "고부가가치 콘텐츠 창작을 위한 인프라",
    ctaTitle: "다음 위대한 프로젝트를 시작할 준비가 되셨나요?",
    ctaDesc: "심층 연구, 문학 창작, 전문 보고서 등 어떤 작업이든 Muse AI는 가장 우아한 글쓰기 및 정리 경험을 제공합니다.",
    ctaBtn: "무료 워크스페이스 생성",
    aboutMusedini: "Musedini 소개",
    guide: "공개 가이드",
    terms: "이용약관",
    privacy: "개인정보처리방침",
    copyright: "Musedini. All rights reserved.",
    features: [
      {
        icon: "Shield",
        title: "궁극의 프라이버시 (로컬 퍼스트)",
        desc: "창작물은 기본적으로 기기 로컬에 저장됩니다. 샌드박스 모드는 최고 수준의 보안과 프라이버시를 제공합니다."
      },
      {
        icon: "PenTool",
        title: "스마트 글쓰기 어시스턴트",
        desc: "최고의 LLM과 통합되어 영감 제공, 문장 이어쓰기, 톤 보정, 구조 재구성을 언제든 지원합니다."
      },
      {
        icon: "Network",
        title: "유기적인 트리 정리",
        desc: "매끄러운 드래그 앤 드롭 트리 UI로 생각과 데이터의 계층 구조를 완벽하게 정리하여 지저분한 폴더에서 벗어나게 합니다."
      },
      {
        icon: "History",
        title: "타임 샌드박스 (버전 관리)",
        desc: "타임머신 같은 Git 형태의 버전 기록이 영감의 진화와 탁월함을 향한 과정을 줄 단위로 복원합니다."
      },
      {
        icon: "FileText",
        title: "매끄러운 포맷 내보내기",
        desc: "100% 실제 PDF, Word, Excel 형식으로 원클릭 내보내기를 지원하여 일상적인 오피스 및 출판 시스템과 매끄럽게 연결됩니다."
      },
      {
        icon: "LayoutTemplate",
        title: "모란디 미학 UI",
        desc: "저채도의 모란디 컬러 디자인이 장시간 작업 시의 시각적 피로를 줄여주며 몰입도 높은 순수한 글쓰기 환경을 만듭니다."
      }
    ]
  }
};

const iconMap: Record<string, React.ReactNode> = {
  Shield: <Shield className="w-6 h-6" />,
  PenTool: <PenTool className="w-6 h-6" />,
  Network: <Network className="w-6 h-6" />,
  History: <History className="w-6 h-6" />,
  FileText: <FileText className="w-6 h-6" />,
  LayoutTemplate: <LayoutTemplate className="w-6 h-6" />
};

const MarketingPage = ({ locale, onLocaleChange }: MarketingPageProps) => {
  const t = translations[locale] || translations['en'];

  return (
    <div className="h-[100dvh] w-full text-white font-sans overflow-y-auto overflow-x-hidden bg-[#0a0a0a] relative selection:bg-[#C5A059]/30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#C5A059]/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-3 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src="/m-logo.png"
            alt="M"
            className="w-9 h-9 sm:w-10 sm:h-10 flex-none object-contain drop-shadow-[0_0_10px_rgba(197,160,89,0.5)]"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
              const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div className="hidden w-10 h-10 rounded-2xl items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-[#E8A33E] to-[#BFA366] text-xl border border-white/20" style={{ display: 'none' }}>M</div>
          <span className="whitespace-nowrap font-bold text-base sm:text-xl tracking-wider text-white" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>{t.navTitle}</span>
        </div>
        <div className="flex flex-none items-center gap-2 sm:gap-4">
          <div className="relative group cursor-pointer flex items-center gap-1 sm:gap-2 text-white/80 hover:text-white transition-colors bg-[#1a1a1a] px-2 sm:px-4 py-2 rounded-full border border-white/10 hover:border-white/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 8 6 6" />
              <path d="m4 14 6-6 2-3" />
              <path d="M2 5h12" />
              <path d="M7 2h1" />
              <path d="m22 22-5-10-5 10" />
              <path d="M14 18h6" />
            </svg>
            <select 
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value as any)}
              className="w-[64px] sm:w-auto appearance-none bg-transparent outline-none cursor-pointer text-xs sm:text-sm font-medium sm:pr-2 [&>option]:bg-[#1a1a1a]"
            >
              <option value="zh">繁體中文</option>
              <option value="zh-Hans">简体中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>
          <button 
            type="button"
            disabled
            aria-disabled="true"
            className="flex-none whitespace-nowrap px-3 sm:px-6 py-2 rounded-full font-bold text-[11px] sm:text-sm text-[#3D2E1A] bg-gradient-to-r from-[#F0C27B] to-[#E8A33E] opacity-75 cursor-not-allowed"
          >
            {t.closedBeta}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#E2C48D]"
        >
          <span className="w-2 h-2 rounded-full bg-[#E2C48D] animate-pulse"></span>
          {t.tagline}
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {t.heroTitlePart1} <br/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E2C48D] via-[#C5A059] to-[#D97706]">
            {t.heroTitlePart2}
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl max-w-2xl text-white/60 mb-10 leading-relaxed font-light"
        >
          {t.heroDesc}
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button 
            type="button"
            disabled
            aria-disabled="true"
            className="px-8 py-4 rounded-full font-bold text-lg text-[#0a0a0a] bg-gradient-to-r from-[#E2C48D] to-[#C5A059] opacity-75 cursor-not-allowed"
          >
            {t.closedBeta}
          </button>
          <a href="#features" className="px-8 py-4 rounded-full font-medium text-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white backdrop-blur-sm">
            {t.learnMoreBtn}
          </a>
        </motion.div>
      </section>

      {/* App Preview Mockup / Decorative */}
      <section className="max-w-5xl mx-auto px-6 mb-32 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="rounded-2xl border border-white/10 p-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative bg-black/40 backdrop-blur-xl"
        >
          <div className="absolute top-4 left-4 flex gap-2 z-20">
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
          </div>
          <div className="w-full aspect-[16/9] rounded-xl overflow-hidden relative bg-[#0f0f0f] border border-white/5">
             {/* Mockup interior content to show the "vibe" */}
             <div className="absolute inset-0 flex">
                <div className="w-64 border-r border-white/5 p-4 hidden md:flex flex-col gap-4 bg-[#0a0a0a]/50">
                    <div className="h-6 w-32 rounded bg-white/5 mt-6 mb-2"></div>
                    <div className="h-4 w-full rounded bg-white/5"></div>
                    <div className="h-4 w-5/6 rounded bg-white/5"></div>
                    <div className="h-4 w-4/6 rounded bg-white/5"></div>
                </div>
                <div className="flex-1 p-8 flex flex-col gap-6 relative">
                    {/* Inner glowing orb */}
                    <div className="absolute top-[20%] left-[30%] w-[300px] h-[300px] rounded-full bg-[#C5A059]/5 blur-[80px] pointer-events-none" />
                    
                    <div className="h-8 w-64 rounded bg-gradient-to-r from-[#C5A059]/20 to-transparent"></div>
                    <div className="h-4 w-full rounded bg-white/5"></div>
                    <div className="h-4 w-full rounded bg-white/5"></div>
                    <div className="h-4 w-3/4 rounded bg-white/5"></div>
                    <div className="mt-8 flex gap-4">
                       <div className="h-32 flex-1 rounded-xl bg-white/5 border border-white/5 shadow-inner"></div>
                       <div className="h-32 flex-1 rounded-xl bg-white/5 border border-white/5 shadow-inner"></div>
                    </div>
                </div>
             </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 relative z-10 border-t border-white/5 bg-[#0a0a0a]/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white tracking-tight">{t.whyChooseTitle}</h2>
            <p className="text-white/50 text-lg">{t.whyChooseSubtitle}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.map((feature: any, index: number) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-8 rounded-2xl hover:shadow-[0_0_30px_rgba(197,160,89,0.1)] transition-all duration-300 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#C5A059]/30 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#C5A059]/0 via-transparent to-[#C5A059]/0 group-hover:from-[#C5A059]/5 transition-all duration-500" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#D97706] group-hover:to-[#C5A059] group-hover:text-[#0a0a0a] text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/20 group-hover:border-transparent relative z-10">
                  {iconMap[feature.icon]}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white relative z-10">{feature.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm font-light relative z-10">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D97706] via-[#E2C48D] to-[#BFA366]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#C5A059]/5 blur-[100px] pointer-events-none" />
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white relative z-10 tracking-tight">{t.ctaTitle}</h2>
            <p className="text-lg text-white/60 mb-10 max-w-2xl mx-auto relative z-10 font-light">
              {t.ctaDesc}
            </p>
            <button 
              type="button"
              disabled
              aria-disabled="true"
              className="relative z-10 px-10 py-4 rounded-full font-bold text-lg text-[#0a0a0a] bg-gradient-to-r from-[#E2C48D] to-[#C5A059] opacity-75 cursor-not-allowed"
            >
              {t.closedBeta}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 relative z-10 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-white/50 font-medium text-sm">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[#0a0a0a] shadow-sm text-xs bg-gradient-to-br from-[#E2C48D] to-[#C5A059]">M</div>
            <span>© {new Date().getFullYear()} {t.copyright}</span>
          </div>
          <div className="flex gap-6 text-sm text-white/50 font-light">
            <a href="/guide/index.html" className="hover:text-[#C5A059] transition-colors">{t.guide}</a>
            <a href="https://www.musedini.com/about" className="hover:text-[#C5A059] transition-colors">{t.aboutMusedini}</a>
            <a href="https://www.musedini.com/legal/terms-of-service" className="hover:text-[#C5A059] transition-colors">{t.terms}</a>
            <a href="https://www.musedini.com/legal/privacy-policy" className="hover:text-[#C5A059] transition-colors">{t.privacy}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingPage;
