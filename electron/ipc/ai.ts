import { ipcMain, BrowserWindow } from 'electron';
import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { agentConfig, isUrlAllowed } from "../../agentConfig";
import { mcpOrchestrator } from "../mcp/Orchestrator";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

function isOpenAIImageModel(model: string) {
  return (model || "").trim().toLowerCase().startsWith("gpt-image-");
}

function resolveOpenAIImageGenerationsUrl(providerBaseUrl?: string) {
  let base = (providerBaseUrl || "").trim();
  if (!base) return "https://api.openai.com/v1/images/generations";
  if (base.endsWith("/")) base = base.slice(0, -1);
  if (base.endsWith("/images/generations")) return base;
  if (base.endsWith("/responses")) return base.replace(/\/responses$/, "/images/generations");
  if (base.endsWith("/chat/completions")) return base.replace(/\/chat\/completions$/, "/images/generations");
  if (base.endsWith("/models")) return base.replace(/\/models$/, "/images/generations");
  if (base.endsWith("/v1")) return `${base}/images/generations`;
  return `${base}/v1/images/generations`;
}

function getOpenAIImageSize(aspectRatio: string | undefined, model: string) {
  if (isOpenAIImageModel(model)) {
    switch (aspectRatio) {
      case "16:9": return "1536x864";
      case "4:3": return "1024x768";
      case "9:16": return "864x1536";
      case "3:4": return "768x1024";
      default: return "1024x1024";
    }
  }
  if (aspectRatio === "16:9" || aspectRatio === "4:3") return "1792x1024";
  if (aspectRatio === "9:16" || aspectRatio === "3:4") return "1024x1792";
  return "1024x1024";
}

function getOpenAIImageQuality(quality: string | undefined, model: string) {
  const requestedQuality = (quality || "standard").toLowerCase();
  if (isOpenAIImageModel(model)) {
    if (requestedQuality === "hd" || requestedQuality === "high") return "high";
    if (requestedQuality === "low") return "low";
    return "medium";
  }
  return requestedQuality === "hd" ? "hd" : "standard";
}

async function requestOpenAIImageGeneration(options: any) {
  const targetUrl = resolveOpenAIImageGenerationsUrl(options.providerBaseUrl);
  const size = getOpenAIImageSize(options.aspectRatio, options.model);
  const quality = getOpenAIImageQuality(options.quality, options.model);

  const body = { model: options.model, prompt: options.prompt, n: 1, size, quality };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${options.apiKey}` },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Image API (${response.status}): ${errText.slice(0, 500)}`);
  }

  const data = await response.json() as any;
  const firstImage = data.data?.[0];
  const imageUrl = firstImage?.url || (firstImage?.b64_json ? `data:image/png;base64,${firstImage.b64_json}` : "");

  if (!imageUrl) throw new Error("OpenAI Image API did not return image url or b64_json data.");
  return imageUrl;
}

async function executeSearchWeb(query: string) {
  try {
    const searchUrl = agentConfig.defaultSearchEngineUrl + encodeURIComponent(query);
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const $ = cheerio.load(html);
    let results: string[] = [];
    $('.result__snippet').each((i, el) => results.push($(el).text().trim()));
    if (results.length === 0) results.push($('body').text().replace(/\s+/g, ' ').substring(0, 2000));
    return "搜尋結果摘要:\n" + results.slice(0, 5).join("\n---\n");
  } catch (err: any) {
    return "Search failed: " + err.message;
  }
}

async function executeFetchUrl(urlStr: string) {
  try {
    if (!isUrlAllowed(urlStr)) return "Error: URL is not allowed by agent security policy.";
    const res = await fetch(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header').remove();
    let text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.substring(0, 15000); 
  } catch (err: any) {
    return "Fetch failed: " + err.message;
  }
}

export function registerAiHandlers(win: BrowserWindow | null) {
  ipcMain.handle('ai:generate-image', async (_, options: any) => {
    const { prompt, aspectRatio = "1:1", style = "photorealistic", quality = "standard", provider, providerApiKey, providerBaseUrl, model } = options;
    const isOpenAI = provider === "GPT" || (model && model.toLowerCase().includes("gpt"));

    if (isOpenAI) {
      const apiKey = providerApiKey ? providerApiKey.trim() : process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OpenAI API Key 未設定。");
      const enhancedPrompt = `${prompt}. Style: ${style}.`;
      const modelToUse = isOpenAIImageModel(model || "") ? model : "dall-e-3";
      const imageUrl = await requestOpenAIImageGeneration({ apiKey, providerBaseUrl, model: modelToUse, prompt: enhancedPrompt, aspectRatio, quality });
      return { imageUrl };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const enhancedPrompt = `${prompt}. Style: ${style}.`;
    const isHD = quality === "hd" || quality === "HD";
    const selectedModel = isHD ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
    const imageConfig: any = { aspectRatio: aspectRatio as any };
    if (isHD) imageConfig.imageSize = "2K";

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: { parts: [{ text: enhancedPrompt }] },
      config: { imageConfig },
    });

    let imageUrl = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }
    if (!imageUrl) throw new Error("No image generated");
    return { imageUrl };
  });

  ipcMain.handle('ai:fetch-models', async (_, options: any) => {
    const { provider, apiKey, baseUrl } = options;
    if (!provider || !apiKey) throw new Error("provider and apiKey are required");
    const trimmedApiKey = apiKey ? apiKey.trim() : "";
    let models: { id: string; name: string; provider: string }[] = [];

    if (provider === "DeepSeek") {
      let dsUrl = baseUrl ? (baseUrl.trim().endsWith("/") ? baseUrl.trim().slice(0, -1) : baseUrl.trim()) : "https://api.deepseek.com/models";
      if (!dsUrl.endsWith("/models")) dsUrl = `${dsUrl}/models`;
      const resp = await fetch(dsUrl, { headers: { "Authorization": `Bearer ${trimmedApiKey}` } });
      if (!resp.ok) throw new Error(`DeepSeek API error: ${resp.status}`);
      const data = await resp.json() as any;
      models = (data.data || []).map((m: any, i: number) => ({ id: `ds-${i}`, name: m.id || m.name, provider: "DeepSeek" }));
    } else if (provider === "GPT") {
      let gptUrl = baseUrl ? (baseUrl.trim().endsWith("/") ? baseUrl.trim().slice(0, -1) : baseUrl.trim()) : "https://api.openai.com/v1/models";
      if (!gptUrl.endsWith("/models")) gptUrl = `${gptUrl}/models`;
      const resp = await fetch(gptUrl, { headers: { "Authorization": `Bearer ${trimmedApiKey}` } });
      if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status}`);
      const data = await resp.json() as any;
      models = (data.data || []).filter((m:any) => m.id.startsWith("gpt") || m.id.startsWith("o1") || m.id.startsWith("o3")).map((m: any, i: number) => ({ id: `gpt-${i}`, name: m.id, provider: "GPT" }));
    } else if (provider === "Claude") {
      models = [
        { id: `cl-1`, name: "claude-sonnet-4-20250514", provider: "Claude" },
        { id: `cl-2`, name: "claude-3-7-sonnet-20250219", provider: "Claude" },
        { id: `cl-3`, name: "claude-3-5-sonnet-20241022", provider: "Claude" }
      ];
    } else if (provider === "MiniMax") {
      models = [
        { id: `mm-1`, name: "abab6.5s-chat", provider: "MiniMax" },
        { id: `mm-2`, name: "abab6.5t-chat", provider: "MiniMax" }
      ];
    }
    models.sort((a, b) => a.name.localeCompare(b.name));
    return { models };
  });

  ipcMain.handle('ai:summarize', async (_, { content }: { content: string }) => {
    if (!content) throw new Error("Content is required");
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Please summarize:\n${content}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                summary: { type: "STRING" as any },
                takeaways: { type: "ARRAY" as any, items: { type: "STRING" as any } },
                actionItems: { type: "ARRAY" as any, items: { type: "STRING" as any } }
              },
              required: ["summary", "takeaways", "actionItems"]
            }
          }
        });
        const resultText = response.text;
        if (resultText) return JSON.parse(resultText.trim());
      } catch (err) {}
    }
    throw new Error("無配置適當的 AI 模型憑證以執行總結作業。");
  });

  // --- AI Chat Streaming via IPC ---
  ipcMain.handle('ai:chat', async (_, reqData) => {
    const { reqId, message, systemPrompt, history, model, temperature, provider, providerApiKey, providerBaseUrl } = reqData;
    
    // Fire and forget, send stream chunks via webContents
    (async () => {
      const sendChunk = (text: string) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('chat-stream-data', { reqId, type: 'content_block_delta', delta: { text } });
        }
      };
      const sendDone = () => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('chat-stream-done', { reqId });
        }
      };
      
      try {
        const trimmedApiKey = providerApiKey ? providerApiKey.trim() : "";
        const modelToUse = model || "gemini-2.5-flash";
        const isGemini = modelToUse.toLowerCase().includes("gemini") || !provider || !providerApiKey;

        if (isGemini) {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            sendChunk('⚠️ GEMINI_API_KEY 未設定，請在 .env 中配置。');
            return sendDone();
          }

          let contents: any[] = [
            ...(history || []).map((m: any) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            })),
            { role: "user", parts: [{ text: message }] }
          ];

          const mcpTools = mcpOrchestrator.getTools();
          const functionDeclarations = mcpTools.map(t => ({
            name: t.name.replace(/[^a-zA-Z0-9_]/g, '_'),
            description: t.description || "",
            parameters: {
              type: "OBJECT",
              properties: t.inputSchema?.properties || {},
              required: t.inputSchema?.required || []
            }
          }));
          const tools = functionDeclarations.length > 0 ? [{ functionDeclarations }] as any : undefined;

          let isDone = false;
          while (!isDone) {
            let responseStream = await ai.models.generateContentStream({
              model: modelToUse.toLowerCase().includes("gemini") ? modelToUse : "gemini-2.5-flash",
              contents,
              config: {
                systemInstruction: systemPrompt,
                temperature: temperature !== undefined ? Number(temperature) : undefined,
                tools
              }
            });

            let assistantMessage = "";
            let functionCalls: any[] = [];

            for await (const chunk of responseStream) {
              if (chunk.text) {
                assistantMessage += chunk.text;
                sendChunk(chunk.text);
              }
              if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                functionCalls.push(...chunk.functionCalls);
              }
            }

            if (assistantMessage) {
              contents.push({ role: "model", parts: [{ text: assistantMessage }] });
            } else if (functionCalls.length > 0) {
              contents.push({ role: "model", parts: functionCalls.map(fc => ({ functionCall: fc })) });
            }

            if (functionCalls.length > 0) {
              const functionResponses = [];
              for (const fc of functionCalls) {
                try {
                  if (win && !win.isDestroyed()) {
                    win.webContents.send('chat-stream-data', { reqId, type: 'tool_call', name: fc.name, args: fc.args });
                  }
                  
                  const toolName = mcpTools.find(t => t.name.replace(/[^a-zA-Z0-9_]/g, '_') === fc.name)?.name || fc.name;
                  
                  // UAC Security Interception
                  const isSensitive = toolName.includes('write') || 
                                      toolName.includes('delete') || 
                                      toolName.includes('remove') || 
                                      toolName.includes('create') || 
                                      toolName.includes('run') || 
                                      toolName.includes('execute');
                  
                  let allowed = true;
                  if (isSensitive && win && !win.isDestroyed()) {
                    const requestId = Math.random().toString(36).substring(7);
                    win.webContents.send('mcp:request-permission', { 
                      id: requestId, 
                      toolName, 
                      args: fc.args 
                    });
                    
                    allowed = await new Promise<boolean>((resolve) => {
                      ipcMain.once(`mcp:permission-response:${requestId}`, (event, response) => {
                        resolve(response);
                      });
                    });
                  }
                  
                  if (!allowed) {
                    throw new Error("User denied execution permission for this tool.");
                  }

                  const result = await mcpOrchestrator.callTool(toolName, fc.args as any);
                  
                  functionResponses.push({
                    functionResponse: {
                      name: fc.name,
                      response: result
                    }
                  });
                  
                  if (win && !win.isDestroyed()) {
                    win.webContents.send('chat-stream-data', { reqId, type: 'tool_result', name: fc.name, result });
                  }
                } catch (err: any) {
                  functionResponses.push({
                    functionResponse: {
                      name: fc.name,
                      response: { error: err.message }
                    }
                  });
                }
              }
              contents.push({ role: "user", parts: functionResponses });
            } else {
              isDone = true;
            }
          }
          return sendDone();
        }

        // GPT / External Providers
        const openai = new OpenAI({
          apiKey: trimmedApiKey || process.env.OPENAI_API_KEY,
          baseURL: providerBaseUrl ? providerBaseUrl.trim() : undefined
        });

        const openaiMessages: any[] = [];
        if (systemPrompt) openaiMessages.push({ role: "system", content: systemPrompt });
        for (const m of (history || [])) openaiMessages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
        openaiMessages.push({ role: "user", content: message });

        const stream = await openai.chat.completions.create({
          model: modelToUse,
          messages: openaiMessages,
          stream: true,
          temperature: temperature !== undefined ? Number(temperature) : undefined
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) sendChunk(content);
        }
        sendDone();
      } catch (err: any) {
        sendChunk(`\n⚠️ 連線失敗：${err.message}`);
        sendDone();
      }
    })();
    
    // Return immediately to let frontend know stream has started
    return { success: true };
  });
}
