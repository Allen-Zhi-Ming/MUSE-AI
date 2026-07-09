import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class McpOrchestrator {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private availableTools: any[] = [];
  
  constructor() {}

  public async startDefaultServer(basePath: string) {
    if (this.isConnected) return;
    try {
      console.log(`[MCP] Starting default filesystem server at: ${basePath}`);
      // Use npx to run the filesystem MCP server
      // Make sure shell is true for npx to work properly on windows
      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", basePath]
      });

      this.client = new Client({
        name: "muse-mcp-client",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {}
        }
      });

      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log("[MCP] Connected to MCP server");

      await this.refreshTools();
    } catch (err) {
      console.error("[MCP] Error starting server:", err);
      this.isConnected = false;
    }
  }

  public async refreshTools() {
    if (!this.client || !this.isConnected) return;
    try {
      const result = await this.client.listTools();
      this.availableTools = result.tools;
      console.log(`[MCP] Discovered ${this.availableTools.length} tools`);
    } catch (err) {
      console.error("[MCP] Error listing tools:", err);
    }
  }

  public getTools() {
    return this.availableTools;
  }

  public async callTool(name: string, args: any) {
    if (!this.client || !this.isConnected) throw new Error("MCP Client not connected");
    return await this.client.callTool({ name, arguments: args });
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      toolCount: this.availableTools.length,
      tools: this.availableTools.map(t => t.name)
    };
  }

  public async stop() {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.client = null;
    this.isConnected = false;
    this.availableTools = [];
    console.log("[MCP] Disconnected");
  }
}

export const mcpOrchestrator = new McpOrchestrator();
