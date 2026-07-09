import { useCallback } from "react";
import { SYS, STUDIO_SYS, JOURNAL_SYS, COMM_SCENARIOS, GROWTH_SYS, HABIT_SYS, MEMORY_SYS, MARKET_SYS, DESIGN_SYSTEM_PROMPT, SKILL_PROMPTS } from "../constants";

export function useSend(state: any, dispatch: any) {
  return useCallback(async (text: string, mode: string, tid: string, attachments?: any[], resubmitMsgId?: string) => {
    const hasAttachments = attachments && attachments.length > 0;
    if ((!text.trim() && !hasAttachments) || state.streaming) return;
    
    const proj = state.navView === "workspace" ? state.projects.find((p: any) => p.id === state.activeProjId) : null;
    const ts = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
    
    const autoSaveGeneratedFiles = (responseContent: string) => {
      if (state.navView === "workspace" && state.activeProjId && responseContent) {
        const activeProj = state.projects.find((p: any) => p.id === state.activeProjId);
        if (activeProj) {
          const regex = /```([a-zA-Z0-9+#]+)?\s*([\s\S]*?)(?:```|$)/ig;
          let match;
          while ((match = regex.exec(responseContent)) !== null) {
            let rawCode = match[2];
            if (rawCode.endsWith("```")) {
              rawCode = rawCode.slice(0, -3);
            }
            rawCode = rawCode.trim();
            if (!rawCode) continue;

            let filename = "";
            const lines = rawCode.split("\n");
            if (lines.length > 0) {
              const firstLine = lines[0].trim();
              const bracketMatch = firstLine.match(/^\[(.*?)\]$/);
              if (bracketMatch) {
                filename = bracketMatch[1].trim();
              } else {
                const commentMatch = firstLine.match(/^\/\/\s*(?:FILE|filename|建立|寫入|名稱)：?\s*([a-zA-Z0-9_\-\.\u4e00-\u9fa5]+)/i);
                if (commentMatch) {
                  filename = commentMatch[1].trim();
                } else {
                  const hashMatch = firstLine.match(/^#\s*(?:FILE|filename|建立|寫入|名稱)：?\s*([a-zA-Z0-9_\-\.\u4e00-\u9fa5]+)/i);
                  if (hashMatch) {
                    filename = hashMatch[1].trim();
                  }
                }
              }
            }

            let finalCode = rawCode;
            if (filename) {
              finalCode = lines.slice(1).join("\n").trim();
            }

            if (filename && (filename.endsWith(".pdf") || filename.endsWith(".docx") || filename.endsWith(".xlsx") || filename.endsWith(".csv") || filename.endsWith(".md") || filename.endsWith(".txt") || filename.endsWith(".html") || filename.endsWith(".css") || filename.endsWith(".js") || filename.endsWith(".jsx") || filename.endsWith(".tsx"))) {
              const ftype = filename.split(".").pop() || "txt";
              dispatch({
                type: "UPDATE_FILE_AI_VERSION",
                name: filename,
                ftype: ftype === "jsx" || ftype === "tsx" ? "tsx" : ftype,
                size: "AI 生成",
                content: finalCode,
                folderId: null
              });
            }
          }
        }
      }
    };

    const finalUserText = text.trim() || "已上傳並附加文件";
    
    const msgsList = state.messages[tid] || [];
    let history = [];
    
    if (resubmitMsgId) {
      const idx = msgsList.findIndex((m: any) => m.id === resubmitMsgId);
      if (idx !== -1) {
        history = msgsList.slice(0, idx);
      }
      dispatch({ type: "EDIT_AND_TRUNCATE_MSG", tid, msgId: resubmitMsgId, newContent: finalUserText });
      dispatch({ type: "SET_STREAMING", val: true });
      dispatch({ type: "ADD_MSG", tid, msg: { id: (Date.now() + 1).toString(), role: "assistant", mode, content: "", ts, tokens: null } });
    } else {
      const userMsg: any = { 
        id: Date.now().toString(), 
        role: "user", 
        content: finalUserText, 
        ts, 
        tokens: null 
      };
      if (hasAttachments) {
        userMsg.attachments = attachments.map(a => ({ id: a.id, name: a.name, size: a.size, type: a.type, content: a.content }));
      }
      
      dispatch({ type: "ADD_MSG", tid, msg: userMsg });
      dispatch({ type: "SET_STREAMING", val: true });
      dispatch({ type: "SET_INPUT", text: "" });
      dispatch({ type: "ADD_MSG", tid, msg: { id: (Date.now() + 1).toString(), role: "assistant", mode, content: "", ts, tokens: null } });
      
      history = msgsList;
    }

    const controller = new AbortController();
    window.activeChatAbortController = controller;
    let acc = "";

    try {
      let sysPrompt = SYS[mode] || SYS.auto;

      // Dynamically override system prompt based on active navView
      if (state.navView === "workspace" && proj) {
        const bc = proj.brief ? `\n\n[Project context]\n${proj.brief}` : "";
        sysPrompt = (SYS[mode] || SYS.auto) + bc;
      } else if (state.navView === "studio") {
        const platformPrompt = STUDIO_SYS[state.platform] || STUDIO_SYS.ig;
        const brandTonesText = state.brandTones && state.brandTones.length > 0
          ? `\n[品牌語調設定（請嚴格遵守此語氣）：${state.brandTones.join("、")}]`
          : "";
        sysPrompt = platformPrompt + brandTonesText;
      } else if (state.navView === "journal") {
        const moodText = state.todayMood 
          ? `\n\n[使用者今日心情：${state.todayMood}。請溫柔傾聽、有同理心，避免直接給予過度或主觀的建議，以非引導性的方式陪伴與追問。]`
          : "";
        sysPrompt = JOURNAL_SYS + moodText;
      } else if (state.navView === "comm") {
        sysPrompt = COMM_SCENARIOS[state.commScenario]?.sys || COMM_SCENARIOS.reply.sys;

      } else if (state.navView === "growth") {
        const skillText = state.skills && state.skills.length > 0
          ? `\n\n[使用者當前技能掌握度（供教練參考）：\n${state.skills.map((s: any) => `- ${s.name}: ${s.level}%`).join("\n")}]`
          : "";
        const statsText = `\n[成長數據：連續使用 ${state.streakCount || 0} 天，總共累積 ${state.totalDays || 0} 天]`;
        sysPrompt = GROWTH_SYS + skillText + statsText;
      } else if (state.navView === "habit") {
        const habitsText = state.habits && state.habits.length > 0
          ? `\n\n[使用者正在培養的習慣列表（供打卡與習慣教練參考）：\n${state.habits.map((h: any) => `- ${h.icon} ${h.name} (${h.done ? "今日已打卡" : "今日未打卡"}，連續打卡 ${h.streak} 天)`).join("\n")}]`
          : "";
        sysPrompt = (HABIT_SYS[state.habitMode] || HABIT_SYS.habit) + habitsText;
      } else if (state.navView === "memory") {
        const memoryItemsText = state.memoryItems && state.memoryItems.length > 0
          ? `\n\n[使用者長期個人核心記憶節點（請在對話中自然地提及、調用或融合這些背景資訊，以展現你擁有對他的長期記憶，但不要生硬拼湊）：\n${state.memoryItems.map((m: any) => `- [${m.cat}] ${m.content}`).join("\n")}]`
          : "";
        sysPrompt = MEMORY_SYS + memoryItemsText;
      } else if (state.navView === "market") {
        sysPrompt = MARKET_SYS;
      }

      if (state.customSystemPrompt && state.customSystemPrompt.trim()) {
        sysPrompt = `[使用者自訂系統人格指令]\n${state.customSystemPrompt}\n\n[系統人格基礎設定]\n` + sysPrompt;
      }

      if (state.aiAssistant) {
        const assistantPrompt = `\n\n[自訂 AI 智慧伴侶設定]\n你的名字是：${state.aiAssistant.name}\n你的星座是：${state.aiAssistant.constellation}（請融合此星座的經典特質在對話中自然表現，如洞察力、溫柔或細膩的直覺）。\n你的個性設定是：${state.aiAssistant.personality}（請在所有回覆中嚴格遵守此性格與風格設定，如溫柔、貼心關懷等。請在回覆中多加主動關懷，配合溫暖的言詞，並在合適處加入溫馨的 Emoji 表情，讓使用者感受到如同真人般的陪伴與體貼）。`;
        sysPrompt = sysPrompt + assistantPrompt;
      }

      // 🔮 動態拼接（Inject）已啟用的 6 大專業協作技能指令到 sysPrompt
      if (state.enabledSkills) {
        let skillsPrompt = "";
        Object.entries(state.enabledSkills).forEach(([key, enabled]) => {
          if (enabled && SKILL_PROMPTS[key]) {
            skillsPrompt += `\n${SKILL_PROMPTS[key]}`;
          }
        });
        if (skillsPrompt) {
          sysPrompt = sysPrompt + "\n\n[=== 🔮 已啟用專業協作技能智庫指令 ===]" + skillsPrompt;
        }
      }

      // 始終注入極高美學網頁設計與 Emoji 限制規範，確保不論哪種模式生成的代碼均符合高端標準
      sysPrompt = sysPrompt + "\n\n" + DESIGN_SYSTEM_PROMPT;

      let payloadMessage = finalUserText;
      if (hasAttachments) {
        let attachmentDetails = "";
        attachments.forEach((a: any) => {
          if (a.content) {
            attachmentDetails += `\n\n--- 附件「${a.name}」內容開始 ---\n${a.content}\n--- 附件「${a.name}」內容結束 ---`;
          }
        });
        const fileNames = attachments.map(a => `${a.name} (${a.size})`).join(", ");
        payloadMessage = `${finalUserText}\n\n[系統通知：使用者已成功在對話中上傳並附加以下文件：${fileNames}。請在回覆中主動分析、提及或摘要這份文件並進行深度解讀。]${attachmentDetails}`;
      }

      // Resolve provider API key for external models
      const selectedModelName = state.apiModel || "gemini-2.5-flash";
      const selectedModelEntry = (state.customModels || []).find((m: any) => m.name === selectedModelName);
      const providerName = selectedModelEntry?.provider || "";
      const providerInfo = providerName ? (state.connectedProviders || {})[providerName] : null;
      let providerApiKey = "";
      let providerBaseUrl = "";
      if (providerInfo) {
        if (typeof providerInfo === "object") {
          providerApiKey = providerInfo.apiKey || "";
          providerBaseUrl = providerInfo.baseUrl || "";
        } else {
          providerApiKey = providerInfo;
        }
      }

      const reqId = Date.now().toString() + Math.random().toString(36).substring(7);
      
      let unsubData: any = null;
      let unsubDone: any = null;

      const cleanup = () => {
        if (unsubData) unsubData();
        if (unsubDone) unsubDone();
      };

      const streamPromise = new Promise<void>((resolve, reject) => {
        if (!window.museAPI) {
          reject(new Error("Electron IPC not available"));
          return;
        }

        unsubData = window.museAPI.ai.onChatStreamData((data: any) => {
          if (data.reqId !== reqId) return;
          if (controller.signal.aborted) return;
          if (data.type === 'content_block_delta') {
            acc += data.delta.text;
            dispatch({ type: "UPDATE_LAST", tid, content: acc });
          }
        });

        unsubDone = window.museAPI.ai.onChatStreamDone((data: any) => {
          if (data.reqId !== reqId) return;
          resolve();
        });

        window.museAPI.ai.chat({ 
          reqId,
          message: payloadMessage, 
          systemPrompt: sysPrompt, 
          history,
          model: selectedModelName,
          temperature: state.chatTemperature !== undefined ? state.chatTemperature : 0.7,
          provider: providerName,
          providerApiKey: providerApiKey,
          providerBaseUrl: providerBaseUrl
        }).catch(reject);
      });

      await streamPromise;
      cleanup();
      
      autoSaveGeneratedFiles(acc);
      dispatch({ type: "FINISH_STREAM", tid, tokens: 0 });
    } catch (err: any) {
      autoSaveGeneratedFiles(acc);
      if (err.name === "AbortError") {
        dispatch({ type: "FINISH_STREAM", tid, tokens: 0 });
      } else {
        dispatch({ type: "UPDATE_LAST", tid, content: `⚠️ 連線失敗：${err.message}` });
        dispatch({ type: "FINISH_STREAM", tid, tokens: 0 });
      }
    } finally {
      if (window.activeChatAbortController === controller) {
        window.activeChatAbortController = null;
      }
    }
  }, [state, dispatch]);
}

export function useImages(state: any, dispatch: any) {
  return useCallback(async (prompt: string) => {
    if (!prompt.trim() || state.generatingImage) return;
    dispatch({ type: "SET_IMAGE_GEN_ERROR", error: null });
    dispatch({ type: "SET_GENERATING_IMAGE", val: true });
    
    // Resolve active provider credentials for image generation
    const selectedModelName = state.apiModel || "gemini-2.5-flash";
    const selectedModelEntry = (state.customModels || []).find((m: any) => m.name === selectedModelName);
    const providerName = selectedModelEntry?.provider || "";
    const providerInfo = providerName ? (state.connectedProviders || {})[providerName] : null;
    let providerApiKey = "";
    let providerBaseUrl = "";
    if (providerInfo) {
      if (typeof providerInfo === "object") {
        providerApiKey = providerInfo.apiKey || "";
        providerBaseUrl = providerInfo.baseUrl || "";
      } else {
        providerApiKey = providerInfo;
      }
    }

    try {
      if (!window.museAPI) throw new Error("Electron IPC not available");
      const data = await window.museAPI.ai.generateImage({ 
        prompt, 
        aspectRatio: state.imageGenSettings.aspectRatio,
        style: state.imageGenSettings.style,
        quality: state.imageGenSettings.quality || "standard",
        provider: providerName,
        providerApiKey: providerApiKey,
        providerBaseUrl: providerBaseUrl,
        model: selectedModelName
      });
      if (data.imageUrl) {
        dispatch({ type: "ADD_GENERATED_IMAGE", image: { url: data.imageUrl, prompt } });
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (err: any) {
      console.error(err);
      dispatch({ type: "SET_IMAGE_GEN_ERROR", error: err.message || "圖片生成失敗" });
    }
  }, [state.generatingImage, state.imageGenSettings, state.apiModel, state.customModels, state.connectedProviders, dispatch]);
}
