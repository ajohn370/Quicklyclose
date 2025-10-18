export interface MCPServer {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServer>
}

export const mcpConfig: MCPConfig = {
  mcpServers: {
    memory: {
      name: "memory",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-memory"],
      env: {
        MEMORY_STORE_PATH: "./memory-store.json"
      }
    },
    playwright: {
      name: "playwright",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-playwright"],
      env: {
        PLAYWRIGHT_BROWSER: "chromium",
        PLAYWRIGHT_HEADLESS: "true"
      }
    },
    github: {
      name: "github",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN || ""
      }
    },
    sequentialThinking: {
      name: "sequential-thinking",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    n8n: {
      name: "n8n",
      command: "docker",
      args: ["exec", "n8n", "n8n-mcp-server"],
      env: {
        N8N_API_KEY: process.env.N8N_API_KEY || "",
        N8N_BASE_URL: process.env.N8N_BASE_URL || "http://localhost:5678",
        N8N_WEBHOOK_URL: "https://quicklyclose.app.n8n.cloud/webhook/quickly-close-property-analysis"
      }
    }
  }
}

export function getMCPServerConfig(serverName: string): MCPServer | undefined {
  return mcpConfig.mcpServers[serverName]
}

export function getAllMCPServers(): MCPServer[] {
  return Object.values(mcpConfig.mcpServers)
}

export function isValidMCPServer(serverName: string): boolean {
  return serverName in mcpConfig.mcpServers
}