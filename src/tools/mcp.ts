/**
 * MCP (Model Context Protocol) Configuration
 * Sets up connections to real MCP servers for file operations and other capabilities
 */

import { MCPConfiguration, type Tool } from "@voltagent/core";
import { logger } from "../config/logger.js";

/**
 * Configure MCP servers for the application
 * Uses real MCP servers following VoltAgent patterns
 */
// Renamed to avoid direct export if createMCPConfiguration was the old public API for just config
const createMCPConfigurationInternal = (): MCPConfiguration => {
  logger.info("Creating MCP configuration internally in mcp.ts");

  const mcpConfig = new MCPConfiguration({
    servers: {
      // File system MCP server for file operations
      filesystem: {
        type: "stdio",
        command: "npx",
        args: [
          "-y",
          "@modelcontextprotocol/server-filesystem",
          "C:\\Users\\dm\\Documents\\AI-Volt"
        ],
        env: {
          MCP_FILESYSTEM_ALLOWED_DIRECTORIES: "C:\\Users\\dm\\Documents\\AI-Volt",
        },
       
      },
      jsSandbox: {
        type: "stdio",
        command: "docker",
        args: [
          "run",
          "-i",
          "--rm",
          "-v",
          "/var/run/docker.sock:/var/run/docker.sock",
          "-v",
          "C:\\Users\\dm\\Documents\\node-code-sandbox-mcp\\workspace:/workspace",
          "--env-file",
          "C:\\Users\\dm\\Documents\\node-code-sandbox-mcp\\.env",
          "node-code-sandbox-mcp"
        ],
        env: {},
      },
      docker: {
        type: "stdio",
        command: "docker",
        args: ["run", "-i", "--rm", "alpine/socat", "STDIO", "TCP:host.docker.internal:8811"],
        env: {},
      },
      github: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
          GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || ""
        },
      },
      git: {
        type: "stdio",
        command: "uvx",
        args: ["mcp-server-git", "--repository", "C:\\Users\\dm\\Documents\\AI-Volt"],
        env: {},
      },
      memory: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
        env: {},
      },
      postgres: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://postgres:VRI8FhWT3qgWFtS5@db.fxycinwjqifbnrzeqfif.supabase.co:5432/postgres"],
        env: {},
      },
      // Browser automation MCP server for web interactions
      browser: {
        type: "stdio", 
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-brave-search@latest"],
        env: {
          BRAVE_API_KEY: process.env.BRAVE_API_KEY || ""
        },
      },
    },
  });

  logger.info("MCP configuration created with filesystem and browser servers (internal)");
  
  return mcpConfig;
};

/**
 * Initialize MCP and get available tools.
 * This function is called once when the module is loaded.
 */
const initializeAndFetchMcpTools = async (): Promise<Tool[]> => {
  try {
    const mcpConfig = createMCPConfigurationInternal();
    
    logger.info("Initializing MCP connections from mcp.ts module...");
    
    // Get tools from all configured MCP servers
    const tools = await mcpConfig.getTools();
    
    logger.info("MCP tools loaded successfully from mcp.ts module", {
      toolCount: tools.length,
      tools: tools.map(tool => (tool as any).name || 'unknown_tool_name') // Handle cases where tool might not have a name property as expected by Tool type
    });
    
    return tools;  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to initialize MCP tools in mcp.ts module", { error: errorMessage });
    return []; // Return an empty array on failure to prevent downstream errors
  }
};

// The promise is created when this module is imported, and starts the tool initialization.
export const mcpToolsPromise: Promise<Tool[]> = initializeAndFetchMcpTools();

// If the MCPConfiguration object itself is needed by other parts of the application,
// you might consider exporting a promise for it as well, or a combined object.
// For now, focusing on the tools as per the request.
// Removed old export of initializeMCP and createMCPConfiguration (if it was for direct consumption)
// export const createMCPConfiguration = createMCPConfigurationInternal; // Optionally re-export if needed elsewhere

