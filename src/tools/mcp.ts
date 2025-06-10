/**
 * MCP (Model Context Protocol) Configuration
 * Sets up connections to real MCP servers for file operations and other capabilities
 */

import { MCPConfiguration, type Tool, type ToolsetWithTools } from "@voltagent/core";
import { logger } from "../config/logger.js";
import { z } from "zod";

// Define Zod schema for server names based on your configuration
const ServerNameSchema = z.enum([
  "filesystem",
  "jsSandbox",
  "docker",
  "github",
  "git",
  "memory",
  "postgres",
  "browser",
]);
type ServerName = z.infer<typeof ServerNameSchema>;

const ToolNamesSchema = z.array(z.string().min(1)).min(1); // Corrected: Added missing parenthesis

/**
 * @internal
 * Creates the MCPConfiguration instance with all defined servers.
 * This function is intended for internal use within this module.
 * Generated on 2025-06-10
 * @returns The configured MCPConfiguration object.
 */
const createMCPConfigurationInternal = (): MCPConfiguration => {
  logger.info("Creating MCP configuration internally in mcp.ts");

  const mcpConfig = new MCPConfiguration({
    servers: {
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
  return mcpConfig;
};

// Create the MCPConfiguration instance once when the module is loaded.
const mcpConfig = createMCPConfigurationInternal();

/**
 * Retrieves all available MCP toolsets, grouped by server name.
 * Toolsets provide a method to get the actual tools from that server.
 * Generated on 2025-06-10
 * @async
 * @returns A Promise that resolves to an object where keys are server names
 *          and values are ToolsetWithTools objects (or undefined if a server fails to connect).
 * @example
 * ```typescript
 * const toolsets = await getMcpToolsets();
 * if (toolsets.filesystem) {
 *   const fsTools = toolsets.filesystem.getTools(); // getTools is synchronous
 *   // use fsTools
 * }
 * ```
 */
export const getMcpToolsets = async (): Promise<Record<string, ToolsetWithTools | undefined>> => {
  try {
    logger.info("Fetching MCP toolsets...");
    const toolsets = await mcpConfig.getToolsets();
    logger.info("Successfully fetched MCP toolsets.", { serverCount: Object.keys(toolsets).length });
    return toolsets;
  } catch (error) {
    logger.error("Failed to get MCP toolsets", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {};
  }
};

/**
 * Retrieves all available tools from all configured MCP servers as a single flat array.
 * This is useful when you need a combined list of all tools without server grouping.
 * Generated on 2025-06-10
 * @async
 * @returns A Promise that resolves to an array of Tool objects.
 *          Returns an empty array if fetching tools fails.
 * @example
 * ```typescript
 * const allTools = await getAllMcpTools();
 * // use allTools
 * ```
 */
export const getAllMcpTools = async (): Promise<Tool[]> => {
  try {
    logger.info("Fetching all MCP tools...");
    const tools = await mcpConfig.getTools();
    logger.info(`Successfully fetched ${tools.length} MCP tools.`);
    return tools;
  } catch (error) {
    logger.error("Failed to get all MCP tools", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
};

/**
 * Input schema for the getSpecificToolsFromServer function.
 * Ensures serverName is one of the known MCP server keys and toolNames is a non-empty array of strings.
 */
const GetSpecificToolsSchema = z.object({
  serverName: ServerNameSchema,
  toolNames: ToolNamesSchema,
});

/**
 * Retrieves a specific subset of tools from a designated MCP server.
 * Validates inputs using Zod schemas.
 * Generated on 2025-06-10
 * @async
 * @param serverName The key of the MCP server from which to fetch tools (e.g., "filesystem", "github").
 * @param toolNames An array of exact tool names to retrieve from the specified server.
 * @returns A Promise that resolves to an array of the requested Tool objects.
 *          Returns an empty array if the server is not found, fails to provide tools,
 *          or if input validation fails.
 * @throws Will not throw directly but logs errors. Returns empty array on failure.
 * @example
 * ```typescript
 * const specificFsTools = await getSpecificToolsFromServer("filesystem", ["read_file", "write_file"]);
 * // use specificFsTools
 *
 * const specificGitTools = await getSpecificToolsFromServer("git", ["git_clone_repository"]);
 * ```
 */
export const getSpecificToolsFromServer = async (
  serverName: ServerName,
  toolNames: string[]
): Promise<Tool[]> => {
  const validationResult = GetSpecificToolsSchema.safeParse({ serverName, toolNames });
  if (!validationResult.success) {
    logger.error("Invalid input for getSpecificToolsFromServer", {
      error: validationResult.error.flatten(),
      serverName,
      toolNames,
    });
    return [];
  }

  // serverName is confirmed by Zod to be a valid ServerName enum member.

  try {
    logger.info(`Fetching specific tools [${toolNames.join(', ')}] from server '${serverName}'...`);
    const toolsets = await mcpConfig.getToolsets(); // Returns Record<string, ToolsetWithTools | undefined>
    
    let serverToolset: ToolsetWithTools | undefined; // Declare here

    // Create a Map from the toolsets object for safer property access
    const toolsetsMap = new Map(Object.entries(toolsets));
    
    if (toolsetsMap.has(serverName)) {
      serverToolset = toolsetsMap.get(serverName);

      if (!serverToolset) {
        logger.warn(`MCP server '${serverName}' is configured, but its toolset is currently undefined or unavailable.`, { serverName });
        return [];
      }
    } else {
      logger.warn(`MCP server '${serverName}' (a validated enum member) was not found in the fetched toolsets. Review MCP configuration and ServerNameSchema.`, {
        serverName,
        availableKeys: Array.from(toolsetsMap.keys()),
      });
      return [];
    }

    const serverTools = serverToolset.getTools();
    const requestedTools = serverTools.filter(tool => toolNames.includes(tool.name));

    if (requestedTools.length !== toolNames.length) {
      const foundNames = requestedTools.map(t => t.name);
      const missingNames = toolNames.filter(name => !foundNames.includes(name));
      logger.warn(`Could not find all requested tools on server '${serverName}'. Missing: ${missingNames.join(', ')}`, {
        requested: toolNames,
        found: foundNames,
        missing: missingNames,
      });
    }
    logger.info(`Successfully fetched ${requestedTools.length} specific tools from server '${serverName}'.`);
    return requestedTools;
  } catch (error) {
    logger.error(`Failed to get specific tools from MCP server '${serverName}'`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      serverName,
      toolNames,
    });
    return [];
  }
};
// Removed initializeAndFetchMcpTools and mcpToolsPromise as per new design.
// The MCPConfiguration object (mcpConfig) is now created once and reused.
// Tools are fetched on demand via the exported functions.

