import React, { useState, useEffect, useRef } from "react";
import { T } from "../constants";
import { Btn } from "./Common";

export function CalendarView({ state, dispatch, isMobile }: any) {
  // Theme customization states (with localStorage persistence)
  const [calendarBgColor, setCalendarBgColor] = useState(() => localStorage.getItem("cal_bg") || "#FAF9F6");
  const [calendarPaperColor, setCalendarPaperColor] = useState(() => localStorage.getItem("cal_paper") || "#ffffff");
  const [calendarTextColor, setCalendarTextColor] = useState(() => localStorage.getItem("cal_text") || "#3E3532");
  const [calendarAccentColor, setCalendarAccentColor] = useState(() => localStorage.getItem("cal_accent") || "#C68B7F");
  const [calendarHighPriorityColor, setCalendarHighPriorityColor] = useState(() => localStorage.getItem("cal_high") || "#CB8B85");
  const [calendarMediumPriorityColor, setCalendarMediumPriorityColor] = useState(() => localStorage.getItem("cal_med") || "#D1AE94");
  const [calendarLowPriorityColor, setCalendarLowPriorityColor] = useState(() => localStorage.getItem("cal_low") || "#8FA89B");
  
  // Highlight style & mode customization
  const [taskHighlightMode, setTaskHighlightMode] = useState<"priority" | "project" | "accent">(
    () => (localStorage.getItem("cal_hl_mode") as any) || "priority"
  );
  const [taskHighlightStyle, setTaskHighlightStyle] = useState<"border" | "fill" | "outline" | "pill">(
    () => (localStorage.getItem("cal_hl_style") as any) || "border"
  );
  const [taskProgressVisualMode, setTaskProgressVisualMode] = useState<"bar" | "bg" | "badge" | "none">(
    () => (localStorage.getItem("cal_progress_visual") as any) || "bar"
  );
  const [showThemeSettings, setShowThemeSettings] = useState(false);

  // Navigation states
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 20)); // Defaults to May 20, 2026
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "day">("month");
  
  // Filtering states
  const [filterProjId, setFilterProjId] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Task Creation states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("2026-05-20");
  const [taskProjId, setTaskProjId] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskStatus, setTaskStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [taskReminder, setTaskReminder] = useState(true);

  // AI Summary panel states
  const [showAiSummaryPanel, setShowAiSummaryPanel] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [aiSummaryResult, setAiSummaryResult] = useState<{
    summary: string;
    takeaways: string[];
    actionItems: string[];
  } | null>(null);

  // Task Board Sidebar & Interactive features
  const [selectedDateStr, setSelectedDateStr] = useState("2026-05-20");
  const [showTaskListSidebar, setShowTaskListSidebar] = useState(true);
  const [sidebarRange, setSidebarRange] = useState<"day" | "week" | "month">("month");
  const [hoveredTask, setHoveredTask] = useState<any | null>(null);
  const [hoveredTaskPos, setHoveredTaskPos] = useState<{ x: number; y: number } | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  // Custom task colors and relationship states
  const [taskCustomColor, setTaskCustomColor] = useState("");
  const [taskDependsOn, setTaskDependsOn] = useState("");
  const [dependencyLines, setDependencyLines] = useState<any[]>([]);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Theme presets definitions
  const presets = [
    {
      name: "古色米白 (Classic Rice)",
      bg: "#FAF9F6",
      paper: "#ffffff",
      text: "#3E3532",
      accent: "#C68B7F",
      high: "#CB8B85",
      med: "#D1AE94",
      low: "#8FA89B",
      hlMode: "priority",
      hlStyle: "border"
    },
    {
      name: "極黑夜色 (Midnight Sky)",
      bg: "#0F172A",
      paper: "#1E293B",
      text: "#F1F5F9",
      accent: "#6366F1",
      high: "#F43F5E",
      med: "#FB923C",
      low: "#34D399",
      hlMode: "priority",
      hlStyle: "fill"
    },
    {
      name: "森林翡翠 (Forest Woods)",
      bg: "#EDF5F1",
      paper: "#ffffff",
      text: "#152E20",
      accent: "#10B981",
      high: "#E11D48",
      med: "#D97706",
      low: "#059669",
      hlMode: "project",
      hlStyle: "border"
    },
    {
      name: "海洋之夢 (Ocean Breeze)",
      bg: "#F0F9FF",
      paper: "#ffffff",
      text: "#0C4A6E",
      accent: "#0284C7",
      high: "#F43F5E",
      med: "#EAB308",
      low: "#10B981",
      hlMode: "accent",
      hlStyle: "outline"
    },
    {
      name: "薰衣草香 (Lavender Fields)",
      bg: "#FAF5FF",
      paper: "#ffffff",
      text: "#3B0764",
      accent: "#8B5CF6",
      high: "#EC4899",
      med: "#F59E0B",
      low: "#10B981",
      hlMode: "priority",
      hlStyle: "pill"
    },
    {
      name: "優雅灰金 (Morandi Chic)",
      bg: "#E8E7E3",
      paper: "#F5F5F3",
      text: "#3F3F46",
      accent: "#78716C",
      high: "#CB8B85",
      med: "#D1AE94",
      low: "#8FA89B",
      hlMode: "project",
      hlStyle: "border"
    }
  ];

  const applyPreset = (preset: any) => {
    setCalendarBgColor(preset.bg);
    setCalendarPaperColor(preset.paper);
    setCalendarTextColor(preset.text);
    setCalendarAccentColor(preset.accent);
    setCalendarHighPriorityColor(preset.high);
    setCalendarMediumPriorityColor(preset.med);
    setCalendarLowPriorityColor(preset.low);
    if (preset.hlMode) setTaskHighlightMode(preset.hlMode);
    if (preset.hlStyle) setTaskHighlightStyle(preset.hlStyle);

    localStorage.setItem("cal_bg", preset.bg);
    localStorage.setItem("cal_paper", preset.paper);
    localStorage.setItem("cal_text", preset.text);
    localStorage.setItem("cal_accent", preset.accent);
    localStorage.setItem("cal_high", preset.high);
    localStorage.setItem("cal_med", preset.med);
    localStorage.setItem("cal_low", preset.low);
    if (preset.hlMode) localStorage.setItem("cal_hl_mode", preset.hlMode);
    if (preset.hlStyle) localStorage.setItem("cal_hl_style", preset.hlStyle);
  };

  const handleCustomColorChange = (key: string, value: string) => {
    if (key === "bg") { setCalendarBgColor(value); localStorage.setItem("cal_bg", value); }
    if (key === "paper") { setCalendarPaperColor(value); localStorage.setItem("cal_paper", value); }
    if (key === "text") { setCalendarTextColor(value); localStorage.setItem("cal_text", value); }
    if (key === "accent") { setCalendarAccentColor(value); localStorage.setItem("cal_accent", value); }
    if (key === "high") { setCalendarHighPriorityColor(value); localStorage.setItem("cal_high", value); }
    if (key === "med") { setCalendarMediumPriorityColor(value); localStorage.setItem("cal_med", value); }
    if (key === "low") { setCalendarLowPriorityColor(value); localStorage.setItem("cal_low", value); }
  };

  const handleHighlightConfigChange = (type: "mode" | "style" | "progress", value: string) => {
    if (type === "mode") {
      setTaskHighlightMode(value as any);
      localStorage.setItem("cal_hl_mode", value);
    } else if (type === "style") {
      setTaskHighlightStyle(value as any);
      localStorage.setItem("cal_hl_style", value);
    } else {
      setTaskProgressVisualMode(value as any);
      localStorage.setItem("cal_progress_visual", value);
    }
  };

  // Helper date naming resources
  const weekDays = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
  const monthsList = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

  // Navigate calendar ranges
  const handlePrev = () => {
    let newDate = new Date(currentDate);
    if (calendarMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (calendarMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    let newDate = new Date(currentDate);
    if (calendarMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (calendarMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  // Date formatting helpers
  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Filtering matching
  const filteredTasks = state.tasks.filter((t: any) => {
    if (filterProjId && t.projectId !== filterProjId) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterStatus === "todo" && t.status === "done") return false;
    if (filterStatus === "done" && t.status !== "done") return false;
    return true;
  });

  // Modal controllers
  const openNewTaskModal = (initDateStr?: string) => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    const targetDate = initDateStr || formatDateString(currentDate);
    setTaskDueDate(targetDate);
    setSelectedDateStr(targetDate);
    setTaskProjId(state.activeProjId || "");
    setTaskPriority("medium");
    setTaskStatus("todo");
    setTaskReminder(true);
    setTaskCustomColor("");
    setTaskDependsOn("");
    // Reset AI summarizer states
    setShowAiSummaryPanel(false);
    setAiSummaryLoading(false);
    setAiSummaryError(null);
    setAiSummaryResult(null);
    setShowAddModal(true);
  };

  const openEditTaskModal = (task: any) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.desc || "");
    setTaskDueDate(task.dueDate);
    setTaskProjId(task.projectId || "");
    setTaskPriority(task.priority);
    setTaskStatus(task.status || "todo");
    setTaskReminder(task.reminder);
    setTaskCustomColor(task.customColor || "");
    setTaskDependsOn(task.dependsOn || "");
    // Reset AI summarizer states
    setShowAiSummaryPanel(false);
    setAiSummaryLoading(false);
    setAiSummaryError(null);
    setAiSummaryResult(null);
    setShowAddModal(true);
  };

  const handleAiSummarizeTask = async () => {
    if (!taskTitle.trim()) {
      setAiSummaryError("請先輸入欲總結的任務名稱！");
      return;
    }
    setAiSummaryLoading(true);
    setAiSummaryError(null);
    setAiSummaryResult(null);
    setShowAiSummaryPanel(true);

    try {
      const proj = state.projects.find((p: any) => p.id === taskProjId);
      const contentToSummarize = `任務名稱: ${taskTitle}
任務細項與工作描述: ${taskDesc || "（使用者無自訂工作描述，僅有核心任務名稱）"}
${proj ? `關聯企劃案: ${proj.name}\n企劃案背景與說明簡報: ${proj.brief || "（企劃案未提供背景簡報文字）"}` : "（此任務為日常獨立待辦日程，並未限定企劃案與歸屬成員）"}`;

      if (!window.museAPI) throw new Error("IPC not available");
      const data = await window.museAPI.ai.summarize({ content: contentToSummarize });
      setAiSummaryResult(data);
    } catch (err: any) {
      console.error(err);
      setAiSummaryError(err.message || "脈絡總結發生未知錯誤");
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleAddActionItemToTasks = (itemText: string) => {
    dispatch({
      type: "ADD_TASK",
      task: {
        title: itemText,
        desc: `衍生自排程任務「${taskTitle}」之 AI 總結行動項目`,
        dueDate: taskDueDate,
        projectId: taskProjId || null,
        priority: "medium",
        status: "todo",
        reminder: true,
      }
    });

    // Toast feedback notification
    const toast = document.createElement("div");
    toast.className = "fixed bottom-5 right-5 bg-stone-900 border text-white px-4 py-3 rounded-xl shadow-2xl z-[9999] transition-all flex items-center gap-2 text-sm pointer-events-none";
    toast.style.borderColor = calendarAccentColor;
    toast.innerHTML = `<span style="color: ${calendarAccentColor}">✦</span> <strong>行動要點：</strong> 任務已成功排入「${taskDueDate}」日程中！`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  };

  const saveTaskForm = () => {
    if (!taskTitle.trim()) return;

    if (editingTask) {
      dispatch({
        type: "UPDATE_TASK",
        task: {
          id: editingTask.id,
          title: taskTitle,
          desc: taskDesc,
          dueDate: taskDueDate,
          projectId: taskProjId || null,
          priority: taskPriority,
          reminder: taskReminder,
          status: taskStatus,
          customColor: taskCustomColor,
          dependsOn: taskDependsOn
        }
      });
    } else {
      dispatch({
        type: "ADD_TASK",
        task: {
          title: taskTitle,
          desc: taskDesc,
          dueDate: taskDueDate,
          projectId: taskProjId || null,
          priority: taskPriority,
          status: taskStatus,
          reminder: taskReminder,
          customColor: taskCustomColor,
          dependsOn: taskDependsOn
        }
      });
    }

    setShowAddModal(false);
  };

  const handleDeleteTask = (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("確認要刪除此項任務關聯排程嗎？")) {
      dispatch({ type: "DELETE_TASK", id });
    }
  };

  const toggleTaskStatus = (id: string, e: any) => {
    e.stopPropagation();
    dispatch({ type: "TOGGLE_TASK_STATUS", id });
  };

  // Get project meta safely
  const getProjMeta = (projId: string | null) => {
    if (!projId) return { name: "日常任務", color: "#A8A29E" };
    const p = state.projects.find((p: any) => p.id === projId);
    return p ? { name: p.name, color: p.color } : { name: "日常任務", color: "#A8A29E" };
  };

  // Fetch color base on user's highlight settings
  const getTaskHighlightColor = (t: any) => {
    if (t && t.customColor) {
      return t.customColor;
    }
    if (taskHighlightMode === "accent") {
      return calendarAccentColor;
    } else if (taskHighlightMode === "project") {
      return getProjMeta(t.projectId).color;
    } else { // "priority"
      return t.priority === "high"
        ? calendarHighPriorityColor
        : t.priority === "medium"
        ? calendarMediumPriorityColor
        : calendarLowPriorityColor;
    }
  };

  const getDependencyBadge = (t: any) => {
    if (!t.dependsOn) return null;
    const parentTask = state.tasks.find((pt: any) => pt.id === t.dependsOn);
    if (!parentTask) return null;
    const isParentDone = parentTask.status === "done";
    return (
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3.5,
        padding: "2px 6px",
        borderRadius: 4,
        background: isParentDone ? "#10B98118" : "#EF444418",
        color: isParentDone ? "#10B981" : "#EF4444",
        fontSize: "8.5px",
        fontWeight: "bold",
        marginTop: 2,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        border: `0.5px solid ${isParentDone ? "#10B98130" : "#EF444430"}`
      }} title={`前置任務：${parentTask.title} (${isParentDone ? "已完成" : "未完成"})`}>
        <span>{isParentDone ? "⛓️ 已完成" : "⚠️ 連鎖前置:"}</span>
        <span style={{ textDecoration: isParentDone ? "line-through" : "none" }}>{parentTask.title}</span>
      </div>
    );
  };

  const recalculateLines = () => {
    if (!workspaceRef.current) return;
    const container = workspaceRef.current;
    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    const newLines: any[] = [];

    state.tasks.forEach((t: any) => {
      if (!t.dependsOn) return;
      const parentTask = state.tasks.find((pt: any) => pt.id === t.dependsOn);
      if (!parentTask) return;

      // Find all matching elements for t and parent
      const childElements = document.querySelectorAll(`[data-task-id="${t.id}"]`);
      const parentElements = document.querySelectorAll(`[data-task-id="${parentTask.id}"]`);

      childElements.forEach((childEl) => {
        parentElements.forEach((parentEl) => {
          const childRect = childEl.getBoundingClientRect();
          const parentRect = parentEl.getBoundingClientRect();

          // Calculate offset points including scroll offset
          const x1 = parentRect.left + parentRect.width / 2 - containerRect.left + scrollLeft;
          const y1 = parentRect.bottom - containerRect.top + scrollTop;
          const x2 = childRect.left + childRect.width / 2 - containerRect.left + scrollLeft;
          const y2 = childRect.top - containerRect.top + scrollTop;

          // Check if elements are of visible sizes
          if (parentRect.width > 0 && childRect.width > 0) {
            const dy = Math.abs(y2 - y1) * 0.45;
            const path = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
            const color = getTaskHighlightColor(parentTask);
            const isDone = parentTask.status === "done";
            
            newLines.push({
              key: `${t.id}-${parentTask.id}-${x1.toFixed(1)}-${y1.toFixed(1)}`,
              path,
              color,
              isDone,
              childId: t.id,
              parentId: parentTask.id
            });
          }
        });
      });
    });

    setDependencyLines(newLines);
  };

  useEffect(() => {
    const timer = setTimeout(recalculateLines, 150);
    window.addEventListener("resize", recalculateLines);
    
    // Setup scroll listener on the workspace
    const container = workspaceRef.current;
    if (container) {
      container.addEventListener("scroll", recalculateLines, { passive: true });
    }
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", recalculateLines);
      if (container) {
        container.removeEventListener("scroll", recalculateLines);
      }
    };
  }, [state.tasks, calendarMode, showTaskListSidebar, sidebarRange, currentDate, filteredTasks, hoveredTask]);

  // Render individual task items base on chosen style configs
  const getTaskStyle = (t: any) => {
    const isDone = t.status === "done";
    const hlColor = getTaskHighlightColor(t);
    const taskProgressPct = t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 0;

    const baseStyles: React.CSSProperties = {
      fontSize: "10px",
      margin: "2px 0",
      padding: "3px 6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      transition: "all 0.12s ease",
      wordBreak: "break-all",
      userSelect: "none"
    };

    let bgStyle = "";
    if (taskHighlightStyle === "fill") {
      bgStyle = isDone ? `${calendarBgColor}CC` : `${hlColor}1F`;
    } else if (taskHighlightStyle === "outline") {
      bgStyle = "transparent";
    } else if (taskHighlightStyle === "pill") {
      bgStyle = isDone ? `${calendarBgColor}90` : `${calendarBgColor}E0`;
    } else { // "border"
      bgStyle = isDone ? `${calendarBgColor}80` : `${hlColor}0A`;
    }

    // Overwrite with dynamic horizontal progress background gradient if 'bg' visual mode is active
    if (taskProgressVisualMode === "bg" && !isDone && taskProgressPct > 0) {
      if (taskHighlightStyle === "fill") {
        bgStyle = `linear-gradient(90deg, ${hlColor}3A 0%, ${hlColor}3A ${taskProgressPct}%, ${hlColor}12 ${taskProgressPct}%, ${hlColor}12 100%)`;
      } else if (taskHighlightStyle === "outline") {
        bgStyle = `linear-gradient(90deg, ${hlColor}22 0%, ${hlColor}22 ${taskProgressPct}%, transparent ${taskProgressPct}%, transparent 100%)`;
      } else if (taskHighlightStyle === "pill") {
        bgStyle = `linear-gradient(90deg, ${hlColor}2A 0%, ${hlColor}2A ${taskProgressPct}%, ${calendarBgColor}E0 ${taskProgressPct}%, ${calendarBgColor}E0 100%)`;
      } else { // "border"
        bgStyle = `linear-gradient(90deg, ${hlColor}1E 0%, ${hlColor}1E ${taskProgressPct}%, ${hlColor}04 ${taskProgressPct}%, ${hlColor}04 100%)`;
      }
    } else if (taskProgressVisualMode === "bg" && isDone) {
      // 100% complete gets soft green translucent filling across the style to denote achievements!
      if (taskHighlightStyle === "fill") {
        bgStyle = `linear-gradient(90deg, #10B9812A 0%, #10B9812A 100%)`;
      } else if (taskHighlightStyle === "outline") {
        bgStyle = `linear-gradient(90deg, #10B98114 0%, #10B98114 100%)`;
      } else if (taskHighlightStyle === "pill") {
        bgStyle = `linear-gradient(90deg, #10B9811C 0%, #10B9811C 100%)`;
      } else { // "border"
        bgStyle = `linear-gradient(90deg, #10B9811A 0%, #10B9811A 100%)`;
      }
    }

    if (taskHighlightStyle === "fill") {
      return {
        ...baseStyles,
        background: bgStyle,
        border: `0.5px solid ${isDone ? T.borderLight : `${hlColor}33`}`,
        borderRadius: "4px",
        color: isDone ? T.textGhost : calendarTextColor,
        textDecoration: isDone ? "line-through" : "none"
      };
    } else if (taskHighlightStyle === "outline") {
      return {
        ...baseStyles,
        background: bgStyle,
        border: `1.2px solid ${isDone ? T.borderLight : hlColor}`,
        borderRadius: "4px",
        color: isDone ? T.textGhost : calendarTextColor,
        textDecoration: isDone ? "line-through" : "none"
      };
    } else if (taskHighlightStyle === "pill") {
      return {
        ...baseStyles,
        background: bgStyle,
        borderLeft: `4px solid ${isDone ? "#10B981" : hlColor}`,
        borderTop: `0.5px solid ${T.borderLight}`,
        borderBottom: `0.5px solid ${T.borderLight}`,
        borderRight: `0.5px solid ${T.borderLight}`,
        borderRadius: "12px",
        color: isDone ? T.textGhost : calendarTextColor,
        textDecoration: isDone ? "line-through" : "none"
      };
    } else { // "border"
      return {
        ...baseStyles,
        background: bgStyle,
        borderLeft: `2.5px solid ${isDone ? "#10B981" : hlColor}`,
        borderTop: `0.5px solid ${T.borderLight}`,
        borderBottom: `0.5px solid ${T.borderLight}`,
        borderRight: `0.5px solid ${T.borderLight}`,
        borderRadius: "2px 4px 4px 2px",
        color: isDone ? T.textGhost : calendarTextColor,
        textDecoration: isDone ? "line-through" : "none"
      };
    }
  };

  // --------------------------------------------------------
  // MONTHLY VIEW RENDER LOGIC
  // --------------------------------------------------------
  const renderMonthlyGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const gridDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Prev month offsets
    for (let i = startOffset - 1; i >= 0; i--) {
      gridDays.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    // Active month days
    for (let i = 1; i <= totalDays; i++) {
      gridDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month offsets rounding to multiple of 7 (full 6-week matrix is 42)
    const remaining = 42 - gridDays.length;
    for (let i = 1; i <= remaining; i++) {
      gridDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, background: calendarPaperColor, borderRadius: 16, border: `0.5px solid ${T.border}`, overflow: "hidden", minHeight: 650 }}>
        {/* Days Header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `0.5px solid ${T.borderLight}`, background: calendarBgColor, padding: "8px 0" }}>
          {weekDays.map((wd) => (
            <div key={wd} style={{ textAlign: "center", fontSize: 11, fontWeight: 750, color: calendarTextColor + "B3", padding: "4px 0" }}>{wd}</div>
          ))}
        </div>

        {/* Date cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)", flex: 1 }}>
          {gridDays.map((cell, idx) => {
            const dateStr = formatDateString(cell.date);
            const isToday = dateStr === "2026-05-20";
            const dayTasks = filteredTasks.filter((t: any) => t.dueDate === dateStr);

            // Calculate progress rates
            const totalCount = dayTasks.length;
            const doneCount = dayTasks.filter((t: any) => t.status === "done").length;
            const inProgressCount = dayTasks.filter((t: any) => t.status === "in_progress").length;
            const progressPct = totalCount > 0 ? Math.round(((doneCount + inProgressCount * 0.5) / totalCount) * 100) : 0;

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDateStr(dateStr);
                  openNewTaskModal(dateStr);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = `${calendarAccentColor}28`;
                }}
                onDragLeave={() => {
                  // No-op - background gets reset automatically on state-based render
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropToReschedule(e, dateStr);
                }}
                style={{
                  border: dateStr === selectedDateStr ? `2px solid ${calendarAccentColor}` : "none",
                  borderRight: dateStr !== selectedDateStr && (idx + 1) % 7 !== 0 ? `0.5px solid ${T.borderLight}` : `2px solid ${calendarAccentColor}`,
                  borderBottom: dateStr !== selectedDateStr && idx < 35 ? `0.5px solid ${T.borderLight}` : `2px solid ${calendarAccentColor}`,
                  padding: "8px 10px",
                  minHeight: 135,
                  background: dateStr === selectedDateStr ? `${calendarAccentColor}1C` : (cell.isCurrentMonth ? (isToday ? `${calendarAccentColor}12` : calendarPaperColor) : `${calendarBgColor}50`),
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  transition: "all 0.12s ease"
                }}
                onMouseEnter={(e) => { 
                  if (dateStr !== selectedDateStr) {
                    e.currentTarget.style.background = isToday ? `${calendarAccentColor}22` : `${calendarAccentColor}06`; 
                  }
                }}
                onMouseLeave={(e) => { 
                  if (dateStr !== selectedDateStr) {
                    e.currentTarget.style.background = cell.isCurrentMonth ? (isToday ? `${calendarAccentColor}12` : calendarPaperColor) : `${calendarBgColor}50`; 
                  }
                }}
              >
                {/* Day label */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontWeight: cell.isCurrentMonth ? (isToday ? 800 : 500) : 400,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isToday ? calendarAccentColor : "transparent",
                      color: isToday ? "#fff" : (cell.isCurrentMonth ? calendarTextColor : T.textGhost),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11
                    }}
                  >
                    {cell.date.getDate()}
                  </span>
                  
                  {isToday && (
                    <span style={{ fontSize: 8.5, background: `${calendarAccentColor}20`, color: calendarAccentColor, padding: "1px 5px", borderRadius: 4, fontWeight: "bold" }}>今天</span>
                  )}
                </div>

                {/* Monthly Tasks in current cell */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3.5, flex: 1, overflowY: "auto" }}>
                  {dayTasks.map((t: any) => {
                    const taskStyle = getTaskStyle(t);
                    const taskProgressPct = t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 0;
                    
                    return (
                      <div
                        key={t.id}
                        data-task-id={t.id}
                        onClick={(e) => { e.stopPropagation(); openEditTaskModal(t); }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredTask(t);
                          setHoveredTaskPos({
                            x: rect.left + window.scrollX,
                            y: rect.bottom + window.scrollY + 6
                          });
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          setHoveredTask(null);
                          setHoveredTaskPos(null);
                        }}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", t.id);
                          setDraggedTaskId(t.id);
                        }}
                        onDragEnd={(e) => {
                          e.stopPropagation();
                          setDraggedTaskId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          handleDropToReorderTask(e, t.id);
                        }}
                        style={taskStyle}
                      >
                        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 2 }} title={t.title}>
                              {t.dependsOn && "🔗 "}{t.title}
                            </span>
                            
                            {/* Priority color coded visual dot element */}
                            {taskProgressVisualMode !== "none" && (
                              <span style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: getTaskHighlightColor(t) || calendarAccentColor,
                                display: "inline-block",
                                flexShrink: 0,
                                marginRight: 4,
                                boxShadow: "0 0 2px rgba(0,0,0,0.1)"
                              }} title={`優先權：${t.priority}`} />
                            )}

                            {/* Status badge or completion indicator */}
                            {taskProgressVisualMode === "badge" ? (
                              <span style={{
                                fontSize: "7px",
                                fontWeight: "bold",
                                padding: "1px 3px",
                                borderRadius: 3,
                                background: t.status === "done" ? "#10B9811A" : t.status === "in_progress" ? `${calendarAccentColor}1A` : "#8E87851A",
                                color: t.status === "done" ? "#10B981" : t.status === "in_progress" ? calendarAccentColor : "#8E8785",
                                scale: "0.9",
                                flexShrink: 0
                              }}>
                                {t.status === "done" ? "完成" : t.status === "in_progress" ? "50%" : "待辦"}
                              </span>
                            ) : (
                              <span style={{ fontSize: "8px", flexShrink: 0 }}>
                                {t.status === "done" && "✅"}
                                {t.status === "in_progress" && "🔄"}
                                {t.status === "todo" && "⏳"}
                              </span>
                            )}
                          </div>

                          {/* Dynamic progress bar if mode is 'bar' */}
                          {taskProgressVisualMode === "bar" && (
                            <div style={{ width: "100%", height: 2, background: "rgba(0,0,0,0.06)", borderRadius: 1, overflow: "hidden", marginTop: 3 }}>
                              <div style={{
                                width: `${taskProgressPct}%`,
                                height: "100%",
                                background: t.status === "done" ? "#10B981" : t.status === "in_progress" ? (getTaskHighlightColor(t) || calendarAccentColor) : "#D1D5DB",
                                transition: "width 0.2s"
                              }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Day micro progress graph indicator */}
                {totalCount > 0 && (
                  <div style={{ marginTop: "auto", paddingTop: 4, borderTop: `1.5px dashed ${T.borderLight}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8, color: T.textGhost, marginBottom: 2 }}>
                      <span>完成 {doneCount}/{totalCount}</span>
                      <span style={{ fontWeight: "bold", color: progressPct === 100 ? "#10B981" : calendarAccentColor }}>{progressPct}%</span>
                    </div>
                    <div style={{ width: "100%", height: 3.5, background: `${calendarBgColor}D0`, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${progressPct}%`, height: "100%", background: progressPct === 100 ? "#10B981" : calendarAccentColor, transition: "width 0.2s" }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --------------------------------------------------------
  // WEEKLY VIEW RENDER LOGIC
  // --------------------------------------------------------
  const renderWeeklyGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const activeDate = new Date(year, month, day);

    // Monday starting offset correction
    const currentDayOfWeekIdx = activeDate.getDay();
    const mondayOffset = currentDayOfWeekIdx === 0 ? -6 : 1 - currentDayOfWeekIdx;

    const mondayDate = new Date(activeDate);
    mondayDate.setDate(mondayDate.getDate() + mondayOffset);

    const weekDaysArray: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(mondayDate);
      nextDate.setDate(nextDate.getDate() + i);
      weekDaysArray.push(nextDate);
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 14, minHeight: 650 }}>
        {weekDaysArray.map((date, idx) => {
          const dateStr = formatDateString(date);
          const isToday = dateStr === "2026-05-20";
          const dayTasks = filteredTasks.filter((t: any) => t.dueDate === dateStr);
          
          const totalCount = dayTasks.length;
          const doneCount = dayTasks.filter((t: any) => t.status === "done").length;
          const inProgressCount = dayTasks.filter((t: any) => t.status === "in_progress").length;
          const progressPct = totalCount > 0 ? Math.round(((doneCount + inProgressCount * 0.5) / totalCount) * 100) : 0;

          const isSelected = dateStr === selectedDateStr;
          return (
            <div
              key={idx}
              onClick={() => {
                setSelectedDateStr(dateStr);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = `${calendarAccentColor}14`;
              }}
              onDragLeave={() => {
                // background resets itself on re-render
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropToReschedule(e, dateStr);
              }}
              style={{
                background: isSelected ? `${calendarAccentColor}12` : (isToday ? `${calendarAccentColor}08` : calendarPaperColor),
                border: isSelected ? `2.5px solid ${calendarAccentColor}` : (isToday ? `2.5px solid ${calendarAccentColor}80` : `0.5px solid ${T.border}`),
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.05)" : "0 2px 8px rgba(0,0,0,0.01)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {/* Day title & top rates */}
              <div style={{ borderBottom: `0.5px solid ${T.borderLight}`, paddingBottom: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textGhost }}>{weekDays[idx]}</div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: isToday ? calendarAccentColor : calendarTextColor,
                  marginTop: 2
                }}>
                  {date.getDate()}
                </div>
                <div style={{ fontSize: 8.5, color: T.textGhost }}>{monthsList[date.getMonth()]}</div>

                {/* Day scale progress bar */}
                {totalCount > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: T.textGhost }}>
                      <span>完成度 {doneCount}/{totalCount}</span>
                      <span style={{ fontWeight: 700, color: progressPct === 100 ? "#10B981" : calendarAccentColor }}>{progressPct}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, background: `${calendarBgColor}`, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${progressPct}%`, height: "100%", background: progressPct === 100 ? "#10B981" : calendarAccentColor, transition: "width 0.2s" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Day core tasks list */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
                {dayTasks.map((t: any) => {
                  const pMeta = getProjMeta(t.projectId);
                  const hColor = getTaskHighlightColor(t);
                  const taskProgressPct = t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 0;
                  const isDone = t.status === "done";

                  return (
                    <div
                      key={t.id}
                      data-task-id={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData("text/plain", t.id);
                        setDraggedTaskId(t.id);
                      }}
                      onDragEnd={(e) => {
                        e.stopPropagation();
                        setDraggedTaskId(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        handleDropToReorderTask(e, t.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditTaskModal(t);
                      }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredTask(t);
                        setHoveredTaskPos({
                          x: rect.left + window.scrollX,
                          y: rect.bottom + window.scrollY + 6
                        });
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        setHoveredTask(null);
                        setHoveredTaskPos(null);
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: taskProgressVisualMode === "bg"
                          ? (isDone
                            ? `linear-gradient(90deg, #10B9811A 0%, #10B9811A 100%)`
                            : `linear-gradient(90deg, ${hColor}18 0%, ${hColor}18 ${taskProgressPct}%, ${calendarPaperColor} ${taskProgressPct}%, ${calendarPaperColor} 100%)`)
                          : (isDone ? `${calendarBgColor}50` : calendarPaperColor),
                        border: isDone ? `1px dashed #10B98180` : `1px solid ${T.borderLight}`,
                        borderLeft: `3.5px solid ${isDone ? "#10B981" : hColor}`,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.01)",
                        cursor: "grab",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        opacity: isDone ? 0.8 : 1,
                        transition: "all 0.1s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                        <button
                          onClick={(e) => toggleTaskStatus(t.id, e)}
                          style={{
                            border: `1.5px solid ${isDone ? calendarAccentColor : T.border}`,
                            background: isDone ? calendarAccentColor : "transparent",
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 9,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 1,
                            flexShrink: 0
                          }}
                        >
                          {isDone && "✓"}
                        </button>
                        <span style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: isDone ? T.textGhost : calendarTextColor,
                          textDecoration: isDone ? "line-through" : "none",
                          wordBreak: "break-all"
                        }}>
                          {t.title}
                        </span>
                      </div>

                      {t.desc && (
                        <p style={{ fontSize: 9.5, color: T.textGhost, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 } as any}>{t.desc}</p>
                      )}

                      {getDependencyBadge(t)}

                      {/* Single task progress visualization */}
                      {taskProgressVisualMode !== "none" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 1 }}>
                          {taskProgressVisualMode === "badge" ? (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "2px 0 0" }}>
                              <span style={{
                                fontSize: "8px",
                                fontWeight: "bold",
                                padding: "1.5px 5px",
                                borderRadius: 4,
                                background: isDone ? "#10B9811A" : t.status === "in_progress" ? `${calendarAccentColor}1A` : "#8E87851A",
                                color: isDone ? "#10B981" : t.status === "in_progress" ? calendarAccentColor : "#8E8785",
                              }}>
                                📊 {isDone ? "已完成" : t.status === "in_progress" ? "進行中" : "待處理"} ({taskProgressPct}%)
                              </span>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8, color: T.textGhost }}>
                                <span style={{ fontWeight: 600, color: t.status === "in_progress" ? hColor : T.textGhost }}>
                                  {isDone ? "已完成" : t.status === "in_progress" ? "進行中" : "待處理"}
                                </span>
                                <span>{taskProgressPct}%</span>
                              </div>
                              <div style={{ width: "100%", height: 3.5, background: `${calendarBgColor}`, borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${taskProgressPct}%`, height: "100%", background: isDone ? "#10B981" : t.status === "in_progress" ? hColor : "#D1D5DB" }} />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3, marginTop: 2 }}>
                        <span style={{
                          fontSize: 8,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: `${pMeta.color}15`,
                          color: pMeta.color,
                          fontWeight: 700,
                          maxWidth: 65,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {pMeta.name}
                        </span>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: hColor }} />
                          <span style={{ fontSize: 8.5, color: T.textGhost, textTransform: "capitalize" }}>{t.priority}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => openNewTaskModal(dateStr)}
                  style={{
                    border: `1.5px dashed ${calendarAccentColor}50`,
                    background: "transparent",
                    color: calendarAccentColor,
                    fontSize: 10,
                    padding: "6px 0",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${calendarAccentColor}10`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  + 新增工作日程
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  // --------------------------------------------------------
  // DAILY VIEW RENDER LOGIC
  // --------------------------------------------------------
  const renderDailyGrid = () => {
    const targetDateStr = formatDateString(currentDate);
    const dayTasks = filteredTasks.filter((t: any) => t.dueDate === targetDateStr);
    const dayName = weekDays[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1];

    const totalCount = dayTasks.length;
    const doneCount = dayTasks.filter((t: any) => t.status === "done").length;
    const inProgressCount = dayTasks.filter((t: any) => t.status === "in_progress").length;
    const progressPct = totalCount > 0 ? Math.round(((doneCount + inProgressCount * 0.5) / totalCount) * 100) : 0;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5" style={{ minHeight: 650 }}>
        {/* Main tasks list */}
        <div style={{ background: calendarPaperColor, border: `0.5px solid ${T.border}`, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `0.5px solid ${T.borderLight}`, paddingBottom: 12 }}>
            <div>
              <span style={{ fontSize: 11.5, background: `${calendarAccentColor}1F`, color: calendarAccentColor, padding: "2px 8px", borderRadius: 6, fontWeight: "bold" }}>今日任務焦點</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: calendarTextColor, margin: "6px 0 0" }}>{monthsList[currentDate.getMonth()]} {currentDate.getDate()} 日 ( {dayName} )</h2>
            </div>
            <Btn style={{ background: calendarAccentColor, color: "#fff" }} onClick={() => openNewTaskModal(targetDateStr)}>+ 建立日程工作</Btn>
          </div>

          {/* High polished progress indicator dashboard widget */}
          {totalCount > 0 && (
            <div style={{ background: `${calendarAccentColor}08`, border: `1px solid ${calendarAccentColor}22`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: calendarTextColor }}>📊 本日執行率分析</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: calendarAccentColor }}>{progressPct}% ({doneCount}/{totalCount} 項已完成)</span>
              </div>
              <div style={{ width: "100%", height: 7, background: calendarBgColor, borderRadius: 3.5, overflow: "hidden" }}>
                <div style={{ width: `${progressPct}%`, height: "100%", background: progressPct === 100 ? "#10B981" : calendarAccentColor, transition: "width 0.3s" }} />
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: T.textGhost, marginTop: 2 }}>
                <span>⏳ 待處理: {dayTasks.filter(t => t.status === "todo").length} 項</span>
                <span>🔄 進行中: {inProgressCount} 項</span>
                <span>✅ 已完成: {doneCount} 項</span>
              </div>
            </div>
          )}

          {/* Agenda items listing */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dayTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: T.textGhost }}>
                <span style={{ fontSize: 32 }}>🍵</span>
                <h3 style={{ fontSize: 13, marginTop: 8, fontWeight: 600, color: calendarTextColor }}>本日排程皆已處理完畢</h3>
                <p style={{ fontSize: 11, color: T.textGhost, marginTop: 4 }}>安排個下午茶時光，或者新增更多的關聯學習日程！</p>
              </div>
            ) : (
              dayTasks.map((t: any) => {
                const pMeta = getProjMeta(t.projectId);
                const hColor = getTaskHighlightColor(t);
                const taskProgressPct = t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 0;
                const isHigh = t.priority === "high";

                return (
                  <div
                    key={t.id}
                    data-task-id={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      setDraggedTaskId(t.id);
                    }}
                    onDragEnd={() => setDraggedTaskId(null)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      handleDropToReorderTask(e, t.id);
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredTask(t);
                      setHoveredTaskPos({
                        x: rect.left + window.scrollX,
                        y: rect.bottom + window.scrollY + 6
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredTask(null);
                      setHoveredTaskPos(null);
                    }}
                     style={{
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "space-between",
                       padding: 14,
                       background: taskProgressVisualMode === "bg"
                         ? (t.status === "done"
                           ? `linear-gradient(90deg, #10B9811A 0%, #10B9811A 100%)`
                           : `linear-gradient(90deg, ${hColor}18 0%, ${hColor}18 ${taskProgressPct}%, ${calendarPaperColor} ${taskProgressPct}%, ${calendarPaperColor} 100%)`)
                         : (t.status === "done" ? `${calendarBgColor}50` : calendarPaperColor),
                       border: isHigh ? `1px solid ${calendarAccentColor}` : `0.5px solid ${T.border}`,
                       borderLeft: `4.5px solid ${hColor}`,
                       borderRadius: 12,
                       boxShadow: "0 2px 6px rgba(0,0,0,0.01)",
                       cursor: "grab",
                       transition: "all 0.1s"
                     }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, marginRight: 16 }}>
                      {/* Interactive toggle block checkbox */}
                      <button
                        onClick={(e) => toggleTaskStatus(t.id, e)}
                        style={{
                          border: `1.5px solid ${t.status === "done" ? calendarAccentColor : T.border}`,
                          background: t.status === "done" ? calendarAccentColor : "transparent",
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 10,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 2,
                          flexShrink: 0
                        }}
                      >
                        {t.status === "done" && "✓"}
                      </button>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                        <span style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: t.status === "done" ? T.textGhost : calendarTextColor,
                          textDecoration: t.status === "done" ? "line-through" : "none"
                        }}>
                          {t.title}
                        </span>
                        
                        {t.desc && (
                          <span style={{ fontSize: 11, color: T.textGhost }}>{t.desc}</span>
                        )}

                        {getDependencyBadge(t)}

                        {/* Interactive dynamic slider/segment indicator on single tasks */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3.5, marginTop: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                              <span style={{ fontSize: 8.5, color: T.textGhost, fontWeight: 600 }}>進程狀態控制:</span>
                              
                              <div style={{ display: "flex", background: `${calendarBgColor}`, borderRadius: 6, padding: 1.5, gap: 1.5 }}>
                                {([ "todo", "in_progress", "done" ] as const).map((st) => (
                                  <button
                                    key={st}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dispatch({
                                        type: "UPDATE_TASK",
                                        task: { ...t, status: st }
                                      });
                                    }}
                                    style={{
                                      border: "none",
                                      background: t.status === st ? (st === "done" ? "#10B981" : st === "in_progress" ? calendarAccentColor : "#8E8785") : "transparent",
                                      color: t.status === st ? "#fff" : T.textGhost,
                                      padding: "1.5px 6px",
                                      borderRadius: 4,
                                      fontSize: 8.5,
                                      fontWeight: 700,
                                      cursor: "pointer"
                                    }}
                                  >
                                    {st === "todo" ? "待處理" : st === "in_progress" ? "進行中" : "已完成"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {taskProgressVisualMode !== "none" && (
                              <span style={{ fontSize: 9.5, fontWeight: "bold", color: t.status === "done" ? "#10B981" : t.status === "in_progress" ? hColor : T.textGhost }}>
                                {taskProgressVisualMode === "badge" ? `📊 ${taskProgressPct}%` : `${taskProgressPct}%`}
                              </span>
                            )}
                          </div>
                          {taskProgressVisualMode !== "none" && taskProgressVisualMode !== "badge" && (
                            <div style={{ width: "100%", height: 3.5, background: `${calendarBgColor}`, borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ width: `${taskProgressPct}%`, height: "100%", background: t.status === "done" ? "#10B981" : t.status === "in_progress" ? hColor : "#E5E7EB", transition: "width 0.2s" }} />
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: `${pMeta.color}15`, color: pMeta.color, fontWeight: 700 }}>
                            {pMeta.name}
                          </span>
                          
                          <span style={{ fontSize: 10, fontWeight: 600, color: hColor, display: "flex", alignItems: "center", gap: 3.5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: hColor }} />
                            {t.priority === "high" ? "🚨 高優先" : t.priority === "medium" ? "⚡ 中優先" : "🟢 低優先"}
                          </span>

                          {t.reminder && (
                            <span style={{ fontSize: 9.5, color: calendarAccentColor, background: `${calendarAccentColor}12`, padding: "1px 5px", borderRadius: 4, fontWeight: "500" }}>⏰ 已設定通知</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => openEditTaskModal(t)}
                        style={{ border: "none", background: `${calendarBgColor}`, cursor: "pointer", padding: "6px 10px", borderRadius: 6, fontSize: 11, color: calendarTextColor }}
                      >
                        編輯
                      </button>
                      <button
                        onClick={(e) => handleDeleteTask(t.id, e)}
                        style={{ border: "none", background: "#fff1f2", cursor: "pointer", padding: "6px 10px", borderRadius: 6, fontSize: 11, color: "#E11D48" }}
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar statistics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Progress graph card */}
          <div style={{ background: calendarPaperColor, border: `0.5px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: calendarTextColor, margin: "0 0 12px" }}>📊 日程執行率分析</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 66, height: 66, borderRadius: "50%", border: `4px solid ${calendarBgColor}`, borderTopColor: calendarAccentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: calendarAccentColor }}>
                  {filteredTasks.length > 0 ? Math.round((filteredTasks.filter((t: any) => t.status === "done").length / filteredTasks.length) * 100) : 0}%
                </span>
              </div>
              <div>
                <p style={{ fontSize: 12, color: calendarTextColor + "B3", margin: "0 0 4px" }}>
                  目前條件累計共 <strong>{filteredTasks.length}</strong> 項任務
                </p>
                <div style={{ fontSize: 10, color: T.textGhost }}>
                  已完成任務：{filteredTasks.filter((t: any) => t.status === "done").length} 項<br/>
                  進行中任務：{filteredTasks.filter((t: any) => t.status === "in_progress").length} 項
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: `linear-gradient(135deg, ${calendarPaperColor} 0%, ${calendarBgColor}80 100%)`, border: `0.5px solid ${calendarAccentColor}30`, borderRadius: 16, padding: 18 }}>
            <h3 style={{ fontSize: 12.5, fontWeight: 700, color: calendarAccentColor, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}>💡 智慧排程分析</h3>
            <p style={{ fontSize: 11, lineHeight: 1.6, color: calendarTextColor + "CC", margin: 0 }}>
              「多維度大腦筆記整理」被評定為本日最耗神項目。建議在<strong>上午 09:30 - 11:30</strong> 做最高專注力配置，配合隨手音訊筆記輔助思考！
            </p>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------
  // DRAG & DROP & SIDEBAR RENDER LOGIC
  // --------------------------------------------------------
  
  const handleDropToReschedule = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;
    const task = state.tasks.find((t: any) => t.id === taskId);
    if (task) {
      dispatch({
        type: "UPDATE_TASK",
        task: { ...task, dueDate: targetDateStr }
      });
      
      // Toast notice
      const toast = document.createElement("div");
      toast.className = "fixed bottom-5 right-5 bg-stone-900 border text-white px-4 py-3 rounded-xl shadow-2xl z-[9999] transition-all flex items-center gap-2 text-sm pointer-events-none";
      toast.style.borderColor = calendarAccentColor;
      toast.innerHTML = `<span style="color: ${calendarAccentColor}">✦</span> <strong>重新排程：</strong> 「${task.title}」已移至 ${targetDateStr}！`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
      }, 3000);
    }
  };

  const handleDropToReorderTask = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceTaskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const sourceTask = state.tasks.find((t: any) => t.id === sourceTaskId);
    const targetTask = state.tasks.find((t: any) => t.id === targetTaskId);
    if (!sourceTask || !targetTask) return;

    // 1. Reorder tasks array
    let updatedTasks = [...state.tasks];
    const sourceIdx = updatedTasks.findIndex((t: any) => t.id === sourceTaskId);
    if (sourceIdx === -1) return;

    const [removedTask] = updatedTasks.splice(sourceIdx, 1);
    
    // Update its due date to target's due date, and match target task's status
    const updatedRemovedTask = { 
      ...removedTask, 
      dueDate: targetTask.dueDate,
      status: targetTask.status 
    };

    const targetIdx = updatedTasks.findIndex((t: any) => t.id === targetTaskId);
    if (targetIdx === -1) return;

    // Insert at target slot
    updatedTasks.splice(targetIdx, 0, updatedRemovedTask);

    dispatch({
      type: "REORDER_TASKS",
      tasks: updatedTasks
    });

    // Toast notice
    const toast = document.createElement("div");
    toast.className = "fixed bottom-5 right-5 bg-stone-900 border text-white px-4 py-3 rounded-xl shadow-2xl z-[9999] transition-all flex items-center gap-2 text-sm pointer-events-none";
    toast.style.borderColor = calendarAccentColor;
    toast.innerHTML = `<span style="color: ${calendarAccentColor}">✦</span> <strong>日程排序調整：</strong> 「${sourceTask.title}」已成功排至「${targetTask.title}」相鄰位置！`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  };

  const handleDropToUpdateStatus = (e: React.DragEvent, status: "todo" | "in_progress" | "done") => {
    e.preventDefault();
    setActiveDropZone(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;
    const task = state.tasks.find((t: any) => t.id === taskId);
    if (task) {
      dispatch({
        type: "UPDATE_TASK",
        task: { ...task, status }
      });

      // Status change toast
      const toast = document.createElement("div");
      toast.className = "fixed bottom-5 right-5 bg-stone-900 border text-white px-4 py-3 rounded-xl shadow-2xl z-[9999] transition-all flex items-center gap-2 text-sm pointer-events-none";
      toast.style.borderColor = calendarAccentColor;
      const statusNames = { todo: "待辦日程", in_progress: "進行中", done: "已完成" };
      toast.innerHTML = `<span style="color: ${calendarAccentColor}">✦</span> <strong>狀態更新：</strong> 「${task.title}」已變更為【${statusNames[status]}】！`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
      }, 3000);
    }
  };

  const renderTaskListSidebar = () => {
    // 1. Get visible dates for current week of currentDate
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const activeDate = new Date(year, month, day);
    const currentDayOfWeekIdx = activeDate.getDay();
    const mondayOffset = currentDayOfWeekIdx === 0 ? -6 : 1 - currentDayOfWeekIdx;
    const mondayDate = new Date(activeDate);
    mondayDate.setDate(mondayDate.getDate() + mondayOffset);

    const weeklyDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(mondayDate);
      nextDate.setDate(nextDate.getDate() + i);
      weeklyDates.push(formatDateString(nextDate));
    }

    // 2. Filter tasks base on chosen sidebarRange
    const tasksInScope = filteredTasks.filter((t: any) => {
      if (sidebarRange === "day") {
        return t.dueDate === selectedDateStr;
      } else if (sidebarRange === "week") {
        return weeklyDates.includes(t.dueDate);
      } else { // "month"
        const tDate = new Date(t.dueDate);
        return !isNaN(tDate.getTime()) && 
               tDate.getFullYear() === currentDate.getFullYear() && 
               tDate.getMonth() === currentDate.getMonth();
      }
    });

    const todoTasks = tasksInScope.filter((t: any) => t.status === "todo");
    const progressTasks = tasksInScope.filter((t: any) => t.status === "in_progress");
    const doneTasks = tasksInScope.filter((t: any) => t.status === "done");

    const getScopeTitle = () => {
      if (sidebarRange === "day") return `📅 焦點日：${selectedDateStr}`;
      if (sidebarRange === "week") return `🗓️ 焦點週：${weeklyDates[0]} ~ ${weeklyDates[6]}`;
      return `📁 焦點月：${currentDate.getFullYear()} 年 ${currentDate.getMonth() + 1} 月`;
    };

    return (
      <div 
        className="w-full lg:w-[380px]"
        style={{ 
          flexShrink: 0, 
          display: "flex", 
          flexDirection: "column", 
          gap: 16, 
          background: calendarPaperColor, 
          border: `0.5px solid ${T.border}`, 
          borderRadius: 16, 
          padding: 18, 
          width: isMobile ? "100%" : "380px",
          maxHeight: isMobile ? "none" : 650, 
          overflowY: isMobile ? "visible" : "auto",
          boxShadow: "0 6px 18px rgba(0,0,0,0.03)"
        }}
      >
        {/* Sidebar Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, borderBottom: `0.5px solid ${T.borderLight}`, paddingBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: calendarTextColor }}>📋 任務看板 (Scope Board)</span>
            <span style={{ fontSize: 9.5, background: `${calendarAccentColor}15`, color: calendarAccentColor, padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>按住並拖曳卡片</span>
          </div>
          
          {/* Range selectors tabs */}
          <div style={{ display: "flex", background: T.bgInput, borderRadius: 8, padding: 3, gap: 2 }}>
            {(["day", "week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSidebarRange(r)}
                style={{
                  flex: 1,
                  border: "none",
                  background: sidebarRange === r ? "#fff" : "transparent",
                  color: sidebarRange === r ? calendarAccentColor : T.textGhost,
                  padding: "4px 0",
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: sidebarRange === r ? "bold" : "normal",
                  cursor: "pointer",
                  transition: "all 0.1s",
                  boxShadow: sidebarRange === r ? "0 1px 3px rgba(0,0,0,0.04)" : "none"
                }}
              >
                {r === "day" ? "單日" : r === "week" ? "整週" : "全月"}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 11, color: calendarTextColor, fontWeight: 700, margin: "2px 0 0" }}>
            {getScopeTitle()}
          </div>
          <div style={{ fontSize: 9.5, color: T.textGhost, lineHeight: 1.35 }}>
            💡 提示：按住任務向上下拖曳即可變更狀態；將卡片放至月曆或週曆的日期儲存格上，即可快捷變更完工截止日期！
          </div>
        </div>

        {/* DRAG AND DROP STATUS LANES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* LANE 1: TODO */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setActiveDropZone("todo"); }}
            onDragLeave={() => setActiveDropZone(null)}
            onDrop={(e) => handleDropToUpdateStatus(e, "todo")}
            style={{
              background: activeDropZone === "todo" ? `${calendarAccentColor}0E` : `${calendarBgColor}70`,
              border: activeDropZone === "todo" ? `1.5px solid ${calendarAccentColor}` : `1.2px dashed ${T.borderLight}`,
              borderRadius: 12,
              padding: 10,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: calendarTextColor }}>⏳ 待處理日程 (Todo)</span>
              <span style={{ fontSize: 10, background: `${T.border}`, padding: "1px 6px", borderRadius: 10, color: T.textGhost, fontWeight: "bold" }}>{todoTasks.length}</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todoTasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", fontSize: 10, color: T.textGhost }}>
                  無待執行日程，拖拉其他工作至此！
                </div>
              ) : (
                todoTasks.map((t: any) => renderSidebarTaskCard(t))
              )}
            </div>
          </div>

          {/* LANE 2: IN PROGRESS */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setActiveDropZone("in_progress"); }}
            onDragLeave={() => setActiveDropZone(null)}
            onDrop={(e) => handleDropToUpdateStatus(e, "in_progress")}
            style={{
              background: activeDropZone === "in_progress" ? `${calendarAccentColor}0E` : `${calendarBgColor}70`,
              border: activeDropZone === "in_progress" ? `1.5px solid ${calendarAccentColor}` : `1.2px dashed ${T.borderLight}`,
              borderRadius: 12,
              padding: 10,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: calendarAccentColor }}>🔄 執行中 (Doing)</span>
              <span style={{ fontSize: 10, background: `${calendarAccentColor}1A`, padding: "1px 6px", borderRadius: 10, color: calendarAccentColor, fontWeight: "bold" }}>{progressTasks.length}</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {progressTasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", fontSize: 10, color: T.textGhost }}>
                  無進行中日程，拖拉工作至此！
                </div>
              ) : (
                progressTasks.map((t: any) => renderSidebarTaskCard(t))
              )}
            </div>
          </div>

          {/* LANE 3: DONE */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setActiveDropZone("done"); }}
            onDragLeave={() => setActiveDropZone(null)}
            onDrop={(e) => handleDropToUpdateStatus(e, "done")}
            style={{
              background: activeDropZone === "done" ? `${calendarAccentColor}08` : `${calendarBgColor}70`,
              border: activeDropZone === "done" ? `1.5px solid #10B981` : `1.2px dashed ${T.borderLight}`,
              borderRadius: 12,
              padding: 10,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#10B981" }}>✅ 已完成工作 (Done)</span>
              <span style={{ fontSize: 10, background: "#10B9811A", padding: "1px 6px", borderRadius: 10, color: "#10B981", fontWeight: "bold" }}>{doneTasks.length}</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {doneTasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", fontSize: 10, color: T.textGhost }}>
                  尚未有完工項目！
                </div>
              ) : (
                doneTasks.map((t: any) => renderSidebarTaskCard(t))
              )}
            </div>
          </div>

        </div>

        {/* Quick add button in sidebar */}
        <button
          onClick={() => openNewTaskModal(sidebarRange === "day" ? selectedDateStr : undefined)}
          style={{
            marginTop: 4,
            background: calendarAccentColor,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}
        >
          <span>＋ 建立排程工作事項</span>
        </button>
      </div>
    );
  };

  const renderSidebarTaskCard = (t: any) => {
    const isDone = t.status === "done";
    const hColor = getTaskHighlightColor(t);
    const pMeta = getProjMeta(t.projectId);
    const isHigh = t.priority === "high";

    return (
      <div
        key={t.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", t.id);
          setDraggedTaskId(t.id);
        }}
        onDragEnd={() => setDraggedTaskId(null)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          handleDropToReorderTask(e, t.id);
        }}
        onClick={() => openEditTaskModal(t)}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoveredTask(t);
          setHoveredTaskPos({
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY + 6
          });
        }}
        onMouseLeave={() => {
          setHoveredTask(null);
          setHoveredTaskPos(null);
        }}
        style={{
          background: taskProgressVisualMode === "bg"
            ? (isDone
              ? `linear-gradient(90deg, #10B9811A 0%, #10B9811A 100%)`
              : `linear-gradient(90deg, ${hColor}18 0%, ${hColor}18 ${t.status === "in_progress" ? 50 : 0}%, ${calendarPaperColor} ${t.status === "in_progress" ? 50 : 0}%, ${calendarPaperColor} 100%)`)
            : calendarPaperColor,
          border: isHigh ? `1.5px solid ${calendarAccentColor}` : `0.5px solid ${T.border}`,
          borderLeft: `4.5px solid ${isDone ? "#10B981" : hColor}`,
          borderRadius: 8,
          padding: "10px 12px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          cursor: "grab",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          opacity: isDone ? 0.75 : 1,
          transition: "all 0.1s"
        }}
        className="hover:scale-[1.01] hover:shadow-md"
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flex: 1 }}>
            <button
              onClick={(e) => toggleTaskStatus(t.id, e)}
              style={{
                border: `1.5px solid ${isDone ? calendarAccentColor : T.border}`,
                background: isDone ? calendarAccentColor : "transparent",
                width: 14,
                height: 14,
                borderRadius: 3.5,
                cursor: "pointer",
                fontSize: 8.5,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
                flexShrink: 0
              }}
            >
              {isDone && "✓"}
            </button>
            <span style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: isDone ? T.textGhost : calendarTextColor,
              textDecoration: isDone ? "line-through" : "none",
              wordBreak: "break-all",
              lineHeight: 1.35
            }}>
              {t.title}
            </span>
          </div>

          <button
            onClick={(e) => handleDeleteTask(t.id, e)}
            style={{
              border: "none",
              background: "#FFF1F2",
              color: "#E11D48",
              padding: "2px 5.5px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              flexShrink: 0,
              alignSelf: "flex-start",
              transition: "all 0.2s"
            }}
          >
            <span>🗑️</span>
            {!isMobile && <span style={{ fontSize: 8.5 }}>刪除</span>}
          </button>
        </div>

        {t.desc && (
          <span style={{ fontSize: 9.5, color: T.textGhost, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 } as any}>
            {t.desc}
          </span>
        )}

        {taskProgressVisualMode !== "none" && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
            <span style={{
              fontSize: "8.5px",
              fontWeight: "bold",
              padding: "2px 5.5px",
              borderRadius: 4,
              background: isDone ? "#10B9811A" : t.status === "in_progress" ? `${calendarAccentColor}1A` : "#8E87851A",
              color: isDone ? "#10B981" : t.status === "in_progress" ? calendarAccentColor : "#8E8785",
            }}>
              📊 {isDone ? "已完成" : t.status === "in_progress" ? "進行中" : "待處理"} ({isDone ? "100%" : t.status === "in_progress" ? "50%" : "0%"})
            </span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, borderTop: `0.5px solid ${T.borderLight}`, paddingTop: 6, marginTop: 2 }}>
          {/* Project tag */}
          <span style={{
            fontSize: 8,
            padding: "1px 5px",
            borderRadius: 4,
            background: `${pMeta.color}15`,
            color: pMeta.color,
            fontWeight: "bold",
            maxWidth: 100,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {pMeta.name}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 3.5 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: hColor }} />
            <span style={{ fontSize: 8.5, color: T.textGhost, fontWeight: 500 }}>
              {t.dueDate}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={workspaceRef}
      style={{
        position: "relative",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: calendarBgColor,
        overflowY: "auto",
        transition: "background 0.3s ease"
      }}
    >
      {/* Dependency Links Vector Overlay SVG */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: workspaceRef.current?.scrollWidth || "100%",
          height: workspaceRef.current?.scrollHeight || "100%",
          pointerEvents: "none",
          zIndex: 5,
          overflow: "visible"
        }}
      >
        <defs>
          {state.tasks.map((t: any) => {
            const color = getTaskHighlightColor(t) || calendarAccentColor;
            return (
              <React.Fragment key={t.id}>
                <marker
                  id={`arrow-${t.id}`}
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={color} />
                </marker>
              </React.Fragment>
            );
          })}
        </defs>
        
        {dependencyLines.map((line) => (
          <g key={line.key}>
            {/* White outline shadow for readability */}
            <path
              d={line.path}
              fill="none"
              stroke="#FFF"
              strokeWidth={4}
              opacity={0.8}
            />
            {/* Core connector path */}
            <path
              d={line.path}
              fill="none"
              stroke={line.color || calendarAccentColor}
              strokeWidth={2}
              strokeDasharray={line.isDone ? "4,4" : "none"}
              opacity={line.isDone ? 0.45 : 0.85}
              markerEnd={`url(#arrow-${line.parentId})`}
              style={{ transition: "stroke 0.2s" }}
            />
          </g>
        ))}
      </svg>
      
      {/* Filters header bar */}
      <div className="p-4 md:p-5 md:pb-4" style={{ borderBottom: `0.5px solid ${T.borderLight}`, background: calendarPaperColor, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
        
        {/* Row 1: Title Header Bar with switch modes + settings toggles */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Quick title block */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 700, color: calendarTextColor, margin: 0 }}>日程與任務中心</h1>
              {!isMobile && <div style={{ fontSize: 9.5, color: T.textGhost }}>將您的待辦事項加入日曆，結合關聯企劃案與 AI 行動要點達成極致工作流。</div>}
            </div>
          </div>

          {/* Controls Group: Mode switcher + Settings triggers */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            {/* Switch calendar mode */}
            <div style={{ display: "flex", background: T.bgInput, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: 2.5 }}>
              <button
                onClick={() => setCalendarMode("month")}
                style={{
                  border: "none",
                  background: calendarMode === "month" ? "#fff" : "transparent",
                  color: calendarMode === "month" ? calendarAccentColor : T.textGhost,
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: calendarMode === "month" ? "bold" : "normal",
                  cursor: "pointer",
                  boxShadow: calendarMode === "month" ? "0 1px 3px rgba(0,0,0,0.05)" : "none"
                }}
              >
                月曆
              </button>
              <button
                onClick={() => setCalendarMode("week")}
                style={{
                  border: "none",
                  background: calendarMode === "week" ? "#fff" : "transparent",
                  color: calendarMode === "week" ? calendarAccentColor : T.textGhost,
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: calendarMode === "week" ? "bold" : "normal",
                  cursor: "pointer",
                  boxShadow: calendarMode === "week" ? "0 1px 3px rgba(0,0,0,0.05)" : "none"
                }}
              >
                週曆
              </button>
              <button
                onClick={() => setCalendarMode("day")}
                style={{
                  border: "none",
                  background: calendarMode === "day" ? "#fff" : "transparent",
                  color: calendarMode === "day" ? calendarAccentColor : T.textGhost,
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: calendarMode === "day" ? "bold" : "normal",
                  cursor: "pointer",
                  boxShadow: calendarMode === "day" ? "0 1px 3px rgba(0,0,0,0.05)" : "none"
                }}
              >
                日誌
              </button>
            </div>

            {/* Theme Trigger Control button */}
            <Btn
              style={{
                padding: "3px 10px",
                fontSize: 10.5,
                background: showThemeSettings ? `${calendarAccentColor}1A` : "#FAF9F5",
                border: showThemeSettings ? `1.5px solid ${calendarAccentColor}` : `0.5px solid ${T.border}`,
                color: showThemeSettings ? calendarAccentColor : calendarTextColor,
                fontWeight: "600"
              }}
              onClick={() => setShowThemeSettings(!showThemeSettings)}
            >
              🎨 樣式
            </Btn>

            {/* Task List Sidebar Toggle button */}
            <Btn
              style={{
                padding: "3px 10px",
                fontSize: 10.5,
                background: showTaskListSidebar ? `${calendarAccentColor}1A` : "#FAF9F5",
                border: showTaskListSidebar ? `1.5px solid ${calendarAccentColor}` : `0.5px solid ${T.border}`,
                color: showTaskListSidebar ? calendarAccentColor : calendarTextColor,
                fontWeight: "600"
              }}
              onClick={() => setShowTaskListSidebar(!showTaskListSidebar)}
            >
              📋 看板：{showTaskListSidebar ? "開啟" : "隱藏"}
            </Btn>
          </div>
        </div>

        {/* Row 2: Dynamic Nav controls + dropdown selects */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderTop: `0.5px solid rgba(220, 215, 206, 0.3)`, paddingTop: 10 }}>
          {/* Calendar Navigation Group */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <Btn style={{ padding: "3px 8px", fontSize: 11 }} onClick={handlePrev}>◂ 上一頁</Btn>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: calendarTextColor, minWidth: 90, textAlign: "center" }}>
              {calendarMode === "month" && `${currentDate.getFullYear()} 年 ${monthsList[currentDate.getMonth()]}`}
              {calendarMode === "week" && `第 ${Math.ceil(currentDate.getDate() / 7)} 週 (${monthsList[currentDate.getMonth()]})`}
              {calendarMode === "day" && `${currentDate.getFullYear()} 年 ${currentDate.getMonth() + 1} 月 ${currentDate.getDate()} 日`}
            </span>
            <Btn style={{ padding: "3px 8px", fontSize: 11 }} onClick={handleNext}>下一頁 ▸</Btn>
            <Btn style={{ padding: "3px 8px", fontSize: 11, background: "#FAF9F5", border: `0.5px solid ${T.border}` }} onClick={() => setCurrentDate(new Date(2026, 4, 20))}>回到今天</Btn>
            
            {/* mock notification trigger button */}
            <button
              onClick={() => dispatch({
                type: "TRIGGER_NOTIFICATION",
                title: "🧠 Muse AI 智慧心靈脈絡推薦",
                body: "您已順利解鎖高訂奶油風「深度反思看板」！今晚不妨抽空記錄您的心靈反思，連續打卡還能獲取尊享勳章喔 ✨"
              })}
              style={{
                padding: "4px 10px",
                background: "linear-gradient(135deg, #FFF9EE 0%, #FFF3DF 100%)",
                border: "0.5px solid rgba(197, 160, 89, 0.45)",
                color: T.goldDark,
                borderRadius: 20,
                fontSize: 10.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(197,160,89,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                outline: "none"
              }}
            >
              🔔 測試通知
            </button>
          </div>

          {/* Filtering dropdown selects */}
          <div 
            style={{ 
              display: "flex", 
              flexDirection: "row", 
              gap: 6, 
              width: isMobile ? "100%" : "auto",
              flexWrap: "wrap" 
            }}
          >
            {/* Project code */}
            <select
              value={filterProjId}
              onChange={(e) => setFilterProjId(e.target.value)}
              style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 10.5, background: "#fff", outline: "none", color: calendarTextColor }}
            >
              <option value="">📂 所有企劃案</option>
              {state.projects.map((p: any) => (
                <option key={p.id} value={p.id}>📁 {p.name}</option>
              ))}
            </select>

            {/* Completion status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 10.5, background: "#fff", outline: "none", color: calendarTextColor }}
            >
              <option value="all">📝 全部任務狀態</option>
              <option value="todo">⏳ 待執行與進程中</option>
              <option value="done">✅ 已完成任務</option>
            </select>

            {/* Filter by priority */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 10.5, background: "#fff", outline: "none", color: calendarTextColor }}
            >
              <option value="">🎯 所有優先級別</option>
              <option value="high">🔴 高優先級</option>
              <option value="medium">🟡 中優先級</option>
              <option value="low">🟢 低優先級</option>
            </select>
          </div>
        </div>
      </div>

      {/* Theme Settings Expandable Container */}
      {showThemeSettings && (
        <div style={{
          background: calendarPaperColor,
          borderBottom: `1.5px solid ${calendarAccentColor}30`,
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "inset 0 -10px 20px rgba(0,0,0,0.015)",
          flexShrink: 0
        }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: calendarTextColor, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
              🎨 日曆主題與任務色彩配置
            </h3>
            <p style={{ fontSize: 10.5, color: T.textGhost, margin: 0 }}>自訂您的背景、面板、文字以及各級任務優先權的專屬識別色彩，所有異動皆儲存於瀏覽器中並即時反映。</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            
            {/* Quick Themes Preset Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textGhost }}>🎭 經典預設主題切換</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: preset.bg,
                      border: calendarBgColor === preset.bg ? `2px solid ${preset.accent}` : `1px solid ${T.border}`,
                      color: preset.text,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                      transition: "all 0.15s"
                    }}
                  >
                    <span>{preset.name}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: preset.paper, border: "0.5px solid #ccc" }} />
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: preset.accent }} />
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: preset.high }} />
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: preset.med }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* General Colors Customizer (Canvas/Paper) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textGhost }}>🖌️ 自訂日曆與底色</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${calendarBgColor}22`, padding: "6px 8px", borderRadius: 8, border: `0.5px solid ${T.border}` }}>
                  <input
                    type="color"
                    value={calendarBgColor}
                    onChange={(e) => handleCustomColorChange("bg", e.target.value)}
                    style={{ width: 26, height: 26, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <div>
                    <div style={{ fontSize: 9.5, color: T.textGhost }}>背景底色</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: calendarTextColor }}>{calendarBgColor}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${calendarPaperColor}11`, padding: "6px 8px", borderRadius: 8, border: `0.5px solid ${T.border}`, borderBottom: `2.5px solid ${calendarAccentColor}` }}>
                  <input
                    type="color"
                    value={calendarPaperColor}
                    onChange={(e) => handleCustomColorChange("paper", e.target.value)}
                    style={{ width: 26, height: 26, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <div>
                    <div style={{ fontSize: 9.5, color: T.textGhost }}>儲存格面層</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: calendarTextColor }}>{calendarPaperColor}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${calendarBgColor}22`, padding: "6px 8px", borderRadius: 8, border: `0.5px solid ${T.border}` }}>
                  <input
                    type="color"
                    value={calendarTextColor}
                    onChange={(e) => handleCustomColorChange("text", e.target.value)}
                    style={{ width: 26, height: 26, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <div>
                    <div style={{ fontSize: 9.5, color: T.textGhost }}>文字主要色</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: calendarTextColor }}>{calendarTextColor}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${calendarAccentColor}1A`, padding: "6px 8px", borderRadius: 8, border: `0.5px solid ${calendarAccentColor}40` }}>
                  <input
                    type="color"
                    value={calendarAccentColor}
                    onChange={(e) => handleCustomColorChange("accent", e.target.value)}
                    style={{ width: 26, height: 26, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <div>
                    <div style={{ fontSize: 9.5, color: T.textGhost }}>今日與主要標記</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: calendarAccentColor }}>{calendarAccentColor}</div>
                  </div>
                </div>
              </div>

              {/* Task Highlight Advanced Settings */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.textGhost }}>🏷️ 任務色彩高亮規則</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 9.5, color: T.textGhost, display: "block", marginBottom: 3 }}>色彩來源</label>
                    <select
                      value={taskHighlightMode}
                      onChange={(e) => handleHighlightConfigChange("mode", e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 10, background: "#fff", width: "100%", outline: "none" }}
                    >
                      <option value="priority">🎯 依優先權重 (Priority)</option>
                      <option value="project">📁 依歸屬企劃案 (Plan)</option>
                      <option value="accent">🎨 依日曆主題色 (Accent)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 9.5, color: T.textGhost, display: "block", marginBottom: 3 }}>高亮樣式</label>
                    <select
                      value={taskHighlightStyle}
                      onChange={(e) => handleHighlightConfigChange("style", e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 10, background: "#fff", width: "100%", outline: "none" }}
                    >
                      <option value="border">🔖 左側標記 (Classic Border)</option>
                      <option value="fill">🖍️ 輕感填色 (Soft Fill)</option>
                      <option value="outline">🔲 細線框線 (Outline)</option>
                      <option value="pill">💊 鵝卵膠囊 (Pill shape)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 9.5, color: T.textGhost, display: "block", marginBottom: 3 }}>工作進度視覺化</label>
                    <select
                      value={taskProgressVisualMode}
                      onChange={(e) => handleHighlightConfigChange("progress", e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 10, background: "#fff", width: "100%", outline: "none" }}
                    >
                      <option value="bar">📊 迷你進度條 (Mini Progress Bar)</option>
                      <option value="bg">🌊 橫向流體填滿 (Progress Gradient)</option>
                      <option value="badge">🏷️ 進度狀態徽章 (Status Badge)</option>
                      <option value="none">❌ 僅健康字型 (Hidden)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Priorities Highlighting Color Pickers */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textGhost }}>🎯 自訂優先級別色彩</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="color"
                    value={calendarHighPriorityColor}
                    onChange={(e) => handleCustomColorChange("high", e.target.value)}
                    style={{ width: 24, height: 24, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <div style={{ fontSize: 11, color: calendarTextColor }}>🔴 高優先級 (High): <strong style={{ color: calendarHighPriorityColor }}>{calendarHighPriorityColor}</strong></div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="color"
                    value={calendarMediumPriorityColor}
                    onChange={(e) => handleCustomColorChange("med", e.target.value)}
                    style={{ width: 24, height: 24, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <div style={{ fontSize: 11, color: calendarTextColor }}>🟡 中優先級 (Med): <strong style={{ color: calendarMediumPriorityColor }}>{calendarMediumPriorityColor}</strong></div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="color"
                    value={calendarLowPriorityColor}
                    onChange={(e) => handleCustomColorChange("low", e.target.value)}
                    style={{ width: 24, height: 24, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <div style={{ fontSize: 11, color: calendarTextColor }}>🟢 低優先級 (Low): <strong style={{ color: calendarLowPriorityColor }}>{calendarLowPriorityColor}</strong></div>
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: `0.5px solid ${T.borderLight}`, paddingTop: 10 }}>
            <Btn style={{ padding: "4px 12px", background: "transparent", border: `1px solid ${T.border}`, color: calendarTextColor }} onClick={() => applyPreset(presets[0])}>
              重設為米白原裝風格
            </Btn>
          </div>
        </div>
      )}

      {/* Main Grid View area with Split Task List Sidebar */}
      <div 
        style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: isMobile ? "column" : "row", 
          gap: isMobile ? 12 : 20, 
          minHeight: 0, 
          overflow: "visible" 
        }} 
        className="p-3.5 md:p-6"
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, gap: 16 }}>
          {calendarMode === "month" && (
            <div className="w-full overflow-x-auto scrollbar-thin" style={{ WebkitOverflowScrolling: "touch", borderRadius: 16 }}>
              <div style={{ minWidth: 760 }}>
                {renderMonthlyGrid()}
              </div>
            </div>
          )}
          {calendarMode === "week" && (
            <div className="w-full overflow-x-auto scrollbar-thin" style={{ WebkitOverflowScrolling: "touch", borderRadius: 14 }}>
              <div style={{ minWidth: 760 }}>
                {renderWeeklyGrid()}
              </div>
            </div>
          )}
          {calendarMode === "day" && renderDailyGrid()}
        </div>

        {/* Task List Sidebar Panel */}
        {showTaskListSidebar && renderTaskListSidebar()}
      </div>

      {/* Floating Hover Tooltip Detail Overlay Card */}
      {hoveredTask && hoveredTaskPos && (
        <div
          style={{
            position: "fixed",
            left: Math.min(hoveredTaskPos.x, window.innerWidth - 300),
            top: Math.min(hoveredTaskPos.y, window.innerHeight - 240),
            width: 280,
            background: calendarPaperColor,
            border: `1.5px solid ${getTaskHighlightColor(hoveredTask)}`,
            borderRadius: 12,
            padding: 14,
            boxShadow: "0 10px 25px -4px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.05)",
            zIndex: 99999,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            transition: "opacity 0.15s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: calendarTextColor }}>
              {hoveredTask.title}
            </span>
            <span style={{
              fontSize: 8.5,
              padding: "2px 6px",
              borderRadius: 4,
              background: hoveredTask.status === "done" ? "#10B98120" : hoveredTask.status === "in_progress" ? `${calendarAccentColor}20` : `${T.textGhost}20`,
              color: hoveredTask.status === "done" ? "#10B981" : hoveredTask.status === "in_progress" ? calendarAccentColor : T.textGhost,
              fontWeight: "bold",
              whiteSpace: "nowrap"
            }}>
              {hoveredTask.status === "done" ? "已完成" : hoveredTask.status === "in_progress" ? "進行中" : "待處理"}
            </span>
          </div>

          {hoveredTask.desc && (
            <div style={{ fontSize: 11, color: calendarTextColor + "B3", lineHeight: 1.4, maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis" }}>
              {hoveredTask.desc}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: `0.5px solid ${T.borderLight}`, paddingTop: 6, marginTop: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
              <span style={{ color: T.textGhost }}>歸屬企劃案：</span>
              <span style={{ fontWeight: 600, color: getProjMeta(hoveredTask.projectId).color }}>
                {getProjMeta(hoveredTask.projectId).name}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
              <span style={{ color: T.textGhost }}>優先等級：</span>
              <span style={{ fontWeight: 700, color: getTaskHighlightColor(hoveredTask) }}>
                {hoveredTask.priority === "high" ? "🚨 高優先" : hoveredTask.priority === "medium" ? "⚡ 中優先" : "🟢 低優先"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
              <span style={{ color: T.textGhost }}>截止日期：</span>
              <span style={{ fontWeight: 500, color: calendarTextColor }}>
                📅 {hoveredTask.dueDate}
              </span>
            </div>
          </div>
          
          <div style={{ fontSize: 9, color: calendarAccentColor, fontWeight: "bold", textAlign: "right", marginTop: 2 }}>
            點擊滑鼠可立即編輯 ✦
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL OVERLAY */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: showAiSummaryPanel ? 960 : 480,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: showAiSummaryPanel ? "row" : "column",
            gap: 24,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            overflowY: "auto",
            maxHeight: "90vh"
          }}>
            {/* LEFT COLUMN: Regular Task Form */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>
                  {editingTask ? "📝 編輯現存排程任務" : "📅 規劃新排程任務"}
                </div>
                {!showAiSummaryPanel && (
                  <button onClick={() => setShowAddModal(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: T.textGhost }}>✕</button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 4 }}>任務名稱*</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="請輸入欲安排的事項..."
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      fontSize: 13,
                      color: T.text,
                      background: T.bgInput,
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 4 }}>工作描述</label>
                  <textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="選填，簡要備忘此項工作的待辦細節..."
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: T.text,
                      background: T.bgInput,
                      outline: "none",
                      fontFamily: "inherit",
                      resize: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 4 }}>截止日期*</label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        fontSize: 12,
                        color: T.text,
                        background: T.bgInput,
                        outline: "none"
                      }}
                    />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 4 }}>優先權重*</label>
                    <select
                      value={taskPriority}
                      onChange={(e: any) => setTaskPriority(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        fontSize: 12,
                        color: T.text,
                        outline: "none",
                        background: "#fff"
                      }}
                    >
                      <option value="low">🟢 低優先 (Low)</option>
                      <option value="medium">🟡 中優先 (Medium)</option>
                      <option value="high">🔴 高優先 (High)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 4 }}>歸屬企劃案 (可選)</label>
                    <select
                      value={taskProjId}
                      onChange={(e) => setTaskProjId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        fontSize: 12,
                        color: T.text,
                        outline: "none",
                        background: "#fff"
                      }}
                    >
                      <option value="">📂 一般日常待辦 (不限制企劃案)</option>
                      {state.projects.map((p: any) => (
                        <option key={p.id} value={p.id}>📁 {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 4 }}>任務當前完成狀態*</label>
                    <select
                      value={taskStatus}
                      onChange={(e: any) => setTaskStatus(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        fontSize: 12,
                        color: T.text,
                        outline: "none",
                        background: "#fff"
                      }}
                    >
                      <option value="todo">⏳ 待執行 (Todo - 0%)</option>
                      <option value="in_progress">🔄 進行中 (In Progress - 50%)</option>
                      <option value="done">✅ 已完成 (Done - 100%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 6 }}>自訂日程代表色 (Custom Color Theme)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    {[
                      { hex: "", desc: "預設繼承" },
                      { hex: "#EF4444", desc: "紅色" },
                      { hex: "#F59E0B", desc: "橘色" },
                      { hex: "#10B981", desc: "綠色" },
                      { hex: "#3B82F6", desc: "藍色" },
                      { hex: "#6366F1", desc: "靛藍" },
                      { hex: "#8B5CF6", desc: "紫色" },
                      { hex: "#EC4899", desc: "粉色" },
                      { hex: "#06B6D4", desc: "青色" },
                    ].map((col) => {
                      const isSelected = taskCustomColor === col.hex;
                      return (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => setTaskCustomColor(col.hex)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: col.hex || `repeating-linear-gradient(45deg, #ccc, #ccc 2px, #fff 2px, #fff 4px)`,
                            border: isSelected ? "2.5px solid #1E293B" : "0.5px solid rgba(0,0,0,0.15)",
                            boxShadow: isSelected ? "0 0 0 2px rgba(99, 102, 241, 0.4)" : "none",
                            cursor: "pointer",
                            position: "relative",
                            transition: "all 0.12s",
                          }}
                          title={col.desc}
                        >
                          {isSelected && (
                            <span style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              color: col.hex === "" ? "#1E293B" : "#FFF",
                              fontWeight: "bold"
                            }}>
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: T.textGhost, display: "block", marginBottom: 4 }}>
                    前置關聯任務限制 (選填，必須先完成此項前置才能標記完成連鎖工作)
                  </label>
                  <select
                    value={taskDependsOn}
                    onChange={(e) => setTaskDependsOn(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: T.text,
                      outline: "none",
                      background: "#fff"
                    }}
                  >
                    <option value="">⛓️ 無前置依賴關係 (無限制)</option>
                    {state.tasks
                      .filter((tk: any) => !editingTask || tk.id !== editingTask.id)
                      .map((tk: any) => (
                        <option key={tk.id} value={tk.id}>
                          🔗 {tk.title} [{tk.status === "done" ? "已完成" : "規劃中未完成"}]
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="taskReminder"
                    checked={taskReminder}
                    onChange={(e) => setTaskReminder(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: calendarAccentColor }}
                  />
                  <label htmlFor="taskReminder" style={{ fontSize: 12, color: T.textMid, cursor: "pointer", fontWeight: 500 }}>啟動推播與信件通知提醒 (Reminders)</label>
                </div>
              </div>

              {/* Action trigger footer panel */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `0.5px solid ${T.borderLight}`, paddingTop: 16, marginTop: 10 }}>
                {/* AI Summarize context option */}
                <button
                  type="button"
                  onClick={handleAiSummarizeTask}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    background: `${calendarAccentColor}1A`,
                    color: calendarAccentColor,
                    border: `1px solid ${calendarAccentColor}40`,
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${calendarAccentColor}28`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = `${calendarAccentColor}1A`; }}
                >
                  🧠 智慧 AI 總結任務脈絡
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowAddModal(false)}
                    style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, cursor: "pointer", color: T.textGhost }}
                  >
                    取消
                  </button>
                  <button
                    onClick={saveTaskForm}
                    disabled={!taskTitle.trim()}
                    style={{ padding: "8px 20px", background: calendarAccentColor, border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", color: "#fff", fontWeight: 600 }}
                  >
                    儲存安排
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: AI Summarizer Panel */}
            {showAiSummaryPanel && (
              <div style={{
                flex: 1,
                borderLeft: `1px solid ${T.borderLight}`,
                paddingLeft: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                minWidth: 320
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>✨</span>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>AI 智慧任務脈絡總結</h3>
                  </div>
                  <button
                    onClick={() => setShowAiSummaryPanel(false)}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      color: T.textGhost,
                      padding: 4
                    }}
                  >
                    ✕ 關閉
                  </button>
                </div>

                {aiSummaryLoading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12, flex: 1 }}>
                    <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: "50%", border: `3.5px solid ${T.borderLight}`, borderTopColor: calendarAccentColor }} />
                    <span style={{ fontSize: 13, fontWeight: "bold", color: calendarTextColor }}>正在萃取與思考任務脈絡中...</span>
                    <span style={{ fontSize: 10.5, color: T.textGhost, textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
                      我們正在為您分析此待辦事項說明及任何所關聯企劃案的背景簡報，整理出完美的行動脈絡綱要與待辦衍生推薦！
                    </span>
                  </div>
                )}

                {aiSummaryError && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12, flex: 1, textAlign: "center" }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <div style={{ fontSize: 12, color: "#E11D48", fontWeight: "bold", padding: "0 10px" }}>{aiSummaryError}</div>
                    <button
                      onClick={handleAiSummarizeTask}
                      style={{ padding: "6px 14px", background: calendarAccentColor, border: "none", borderRadius: 8, fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}
                    >
                      重新建立總結
                    </button>
                  </div>
                )}

                {aiSummaryResult && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflowY: "auto", paddingRight: 4 }}>
                    {/* Concise Summary */}
                    <div style={{ background: `${calendarAccentColor}0A`, padding: 12, borderRadius: 10, border: `0.5px solid ${calendarAccentColor}20` }}>
                      <h4 style={{ fontSize: 11.5, fontWeight: "bold", color: calendarAccentColor, margin: "0 0 6px" }}>📝 脈絡背景摘要 (Summary)</h4>
                      <p style={{ fontSize: 12, lineHeight: 1.5, color: calendarTextColor, margin: 0 }}>{aiSummaryResult.summary}</p>
                    </div>

                    {/* Key Takeaways */}
                    <div>
                      <h4 style={{ fontSize: 11.5, fontWeight: "bold", color: T.text, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}>💡 關鍵備忘要點 (Takeaways)</h4>
                      <ul style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 0, margin: 0, listStyle: "none" }}>
                        {aiSummaryResult.takeaways.map((item, idx) => (
                          <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, color: calendarTextColor }}>
                            <span style={{ color: calendarAccentColor, fontWeight: "bold", marginTop: 2 }}>•</span>
                            <span style={{ lineHeight: 1.4 }}>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommended Action Items */}
                    <div>
                      <h4 style={{ fontSize: 11.5, fontWeight: "bold", color: T.text, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}>📅 推薦衍生行動 (Action Items)</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {aiSummaryResult.actionItems.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "#FAF9F5",
                              border: `0.5px solid ${T.border}`,
                              padding: "8px 10px",
                              borderRadius: 8,
                              gap: 8
                            }}
                          >
                            <span style={{ fontSize: 11, color: calendarTextColor, flex: 1, lineHeight: 1.4 }}>{item}</span>
                            <button
                              onClick={() => handleAddActionItemToTasks(item)}
                              style={{
                                padding: "4px 8px",
                                background: calendarAccentColor,
                                border: "none",
                                borderRadius: 6,
                                fontSize: 9.5,
                                color: "#fff",
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap"
                              }}
                            >
                              + 加到日程
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
