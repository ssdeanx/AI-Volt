/**
 * MCP (Model Context Protocol) Configuration
 * Sets up connections to real MCP servers for file operations and other capabilities
 */

import { MCPConfiguration } from "@voltagent/core";
import { logger } from "./logger.js";

/**
 * Configure MCP servers for the application
 * Uses real MCP servers following VoltAgent patterns
 */
export const createMCPConfiguration = (): MCPConfiguration => {
  logger.info("Creating MCP configuration");

  const mcpConfig = new MCPConfiguration({
    servers: {
      // File system MCP server for file operations
      filesystem: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem@latest"],
        env: {
          // Set the allowed directories for file operations
          MCP_FILESYSTEM_ALLOWED_DIRECTORIES: process.cwd()
        },
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

  logger.info("MCP configuration created with filesystem and browser servers");
  
  return mcpConfig;
};

/**
 * Initialize MCP and get available tools
 */
export const initializeMCP = async () => {
  try {
    const mcpConfig = createMCPConfiguration();
    
    logger.info("Initializing MCP connections...");
    
    // Get tools from all configured MCP servers
    const mcpTools = await mcpConfig.getTools();
    
    logger.info("MCP tools loaded successfully", {
      toolCount: mcpTools.length,
      tools: mcpTools.map(tool => tool.name)
    });
    
    return {
      mcpConfig,
      mcpTools
    };
  } catch (error) {
    logger.error("Failed to initialize MCP", error);
    
    // Return empty configuration if MCP fails to initialize
    return {
      mcpConfig: null,
      mcpTools: []
    };
  }
};
