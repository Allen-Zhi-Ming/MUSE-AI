export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
  tokens?: number | null;
  mode?: string;
  tok?: number;
}

export interface Thread {
  id: string;
  title: string;
  mode: string;
  ts: string;
  msgCount?: number;
}

export interface FileVersion {
  id: string;
  timestamp: string;
  content: string;
  author: string;
  versionLabel: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: string;
  folderId: string | null;
  size: string | null;
  content?: string;
  versions?: FileVersion[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Member {
  id: string;
  i: string;
  name: string;
  role: string;
  c: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  phase: string;
  brief: string;
  folders: Folder[];
  files: FileItem[];
  threads: Thread[];
  members: Member[];
  tokenUsage: number;
  tokenLimit: number;
}

export interface ImageGenSettings {
  aspectRatio: string;
  style: string;
  quality?: string;
  cfgScale?: number;
  negativePrompt?: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  desc: string;
  dueDate: string; // YYYY-MM-DD
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  reminder: boolean;
  reminderTime?: string;
  customColor?: string;
  dependsOn?: string;
}

export interface AppState {
  chatBgColor: string;
  navView: string;
  sbOpen: boolean;
  pvOpen: boolean;
  showHistoryDrawer: boolean;
  showProjectsDrawer: boolean;
  mode: string;
  genThreads: Thread[];
  activeGenThreadId: string | null;
  projects: Project[];
  tasks: Task[];
  activeProjId: string | null;
  activeThreadId: string | null;
  activeFileId: string | null;
  expanded: string[];
  editingBrief: boolean;
  briefDraft: string;
  rightTab: string;
  input: string;
  streaming: boolean;
  messages: Record<string, Message[]>;
  modal: string | null;
  studioTid: string;
  platform: string;
  commTid: string;
  commScenario: string;
  brandTones: string[];
  journalTid: string;
  todayMood: string;
  shareCardMsg: Message | null;
  cardBg: string;
  cardTc: string;
  generatedImages: GeneratedImage[];
  generatingImage: boolean;
  imageGenError?: string | null;
  imageGenSettings: ImageGenSettings;

  growthTid: string;
  streakCount: number;
  totalDays: number;
  skills: { name: string; level: number }[];
  achievements: { icon: string; name: string; earned: boolean; date: string }[];
  marketTid: string;
  marketTab: string;
  marketSearch: string;
  savedTemplates: string[];
  memoryTid: string;
  memoryItems: { id: string; cat: string; content: string; ts: string }[];
  userProfile: { name: string; bio: string; avatar: string; tone: string; cover?: string; coverType?: string; coverColor?: string };
  habitTid: string;
  habitMode: string;
  habits: { id: string; name: string; done: boolean; streak: number; icon: string }[];
  theme: string;
  journalTab: string;
  reflections: { id: string; date: string; mood: string; title: string; summary: string }[];
  palettes: { id: string; name: string; colors: string[] }[];
  cardTemplates: { id: string; name: string; desc: string; preview: any }[];
  studioWordCount: number;
  studioEmojiDensity: number;
  memoryResponseLength: number;
  myMuseAssets?: { id: string; name: string; type: string; content: string; ts: string; remark?: string; files?: Record<string, string>; }[];
  notifications?: { id: string; title: string; body: string; ts: string; read: boolean }[];
  activeNotification?: { id: string; title: string; body: string } | null;
  apiModel?: string;
  chatTemperature?: number;
  customSystemPrompt?: string;
  glassmorphismBlur?: number;
  fontFamily?: string;
  hideHomeCover?: boolean;
  enableCustomModels?: boolean;
  customModels?: { id: string; name: string; provider: string; active?: boolean }[];
  connectedProviders?: Record<string, string>;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    provider: "google" | "local";
  } | null;
  aiAssistant?: {
    name: string;
    avatar: string;
    constellation: string;
    personality: string;
    bubbleBg: string;
    bubbleText: string;
    bubbleBorder: string;
  };
  enabledSkills: Record<string, boolean>;
}
