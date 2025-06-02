/**
 * MCP File Server Tool
 * Provides file system operations through Model Context Protocol
 * Generated on 2025-06-02
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import * as fs from "fs/promises";
import * as path from "path";
import { generateId } from "ai";

/**
 * Schema for MCP file server operations
 */
const mcpFileServerSchema = z.object({
  operation: z.enum([
    "read_file",
    "write_file", 
    "list_directory",
    "create_directory",
    "delete_file",
    "delete_directory",
    "file_exists",
    "get_file_info",
    "copy_file",
    "move_file"
  ]).describe("File system operation to perform"),
  
  file_path: z.string().optional().describe("Path to the file or directory"),
  content: z.string().optional().describe("Content to write to file"),
  destination_path: z.string().optional().describe("Destination path for copy/move operations"),
  recursive: z.boolean().default(false).describe("Whether to perform recursive operations"),
  encoding: z.enum(["utf8", "base64", "binary"]).default("utf8").describe("File encoding"),
});

type McpFileServerInput = z.infer<typeof mcpFileServerSchema>;

/**
 * MCP File Server tool implementation
 * Provides comprehensive file system operations following MCP patterns
 */
export const mcpFileServerTool = createTool({
  name: "mcp_file_server",
  description: "Perform file system operations including reading, writing, listing, creating, and managing files and directories. Follows Model Context Protocol (MCP) patterns for safe file operations.",
  parameters: mcpFileServerSchema,
  execute: async ({
    operation,
    file_path,
    content,
    destination_path,
    recursive,
    encoding
  }: McpFileServerInput) => {
    try {
      const operationId = generateId();
      const timestamp = new Date().toISOString();
      
      logger.debug("MCP file server operation", {
        operationId,
        operation,
        file_path,
        encoding
      });

      // Validate and sanitize file paths to prevent directory traversal
      if (file_path) {
        file_path = sanitizePath(file_path);
      }
      if (destination_path) {
        destination_path = sanitizePath(destination_path);
      }

      let result: any = {
        operation_id: operationId,
        operation,
        timestamp,
        status: "success"
      };

      switch (operation) {
        case "read_file":
          if (!file_path) throw new Error("File path is required for read operation");
          
          const fileContent = await fs.readFile(file_path, encoding as BufferEncoding);
          const stats = await fs.stat(file_path);
          
          result = {
            ...result,
            file_path,
            content: fileContent,
            encoding,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            is_directory: stats.isDirectory()
          };
          break;

        case "write_file":
          if (!file_path) throw new Error("File path is required for write operation");
          if (content === undefined) throw new Error("Content is required for write operation");
          
          // Ensure directory exists
          const dir = path.dirname(file_path);
          await fs.mkdir(dir, { recursive: true });
          
          await fs.writeFile(file_path, content, encoding as BufferEncoding);
          const newStats = await fs.stat(file_path);
          
          result = {
            ...result,
            file_path,
            bytes_written: Buffer.byteLength(content, encoding as BufferEncoding),
            encoding,
            created: newStats.birthtime.toISOString(),
            modified: newStats.mtime.toISOString()
          };
          break;

        case "list_directory":
          if (!file_path) throw new Error("Directory path is required for list operation");
          
          const entries = await fs.readdir(file_path, { withFileTypes: true });
          const directoryContents = await Promise.all(
            entries.map(async (entry) => {
              const fullPath = path.join(file_path!, entry.name);
              const entryStats = await fs.stat(fullPath);
              
              return {
                name: entry.name,
                path: fullPath,
                type: entry.isDirectory() ? "directory" : "file",
                size: entryStats.size,
                modified: entryStats.mtime.toISOString(),
                permissions: entryStats.mode
              };
            })
          );
          
          result = {
            ...result,
            directory_path: file_path,
            entries: directoryContents,
            total_entries: directoryContents.length
          };
          break;

        case "create_directory":
          if (!file_path) throw new Error("Directory path is required for create operation");
          
          await fs.mkdir(file_path, { recursive });
          const dirStats = await fs.stat(file_path);
          
          result = {
            ...result,
            directory_path: file_path,
            recursive,
            created: dirStats.birthtime.toISOString()
          };
          break;

        case "delete_file":
          if (!file_path) throw new Error("File path is required for delete operation");
          
          const beforeDelete = await fs.stat(file_path);
          await fs.unlink(file_path);
          
          result = {
            ...result,
            file_path,
            deleted_size: beforeDelete.size,
            was_directory: beforeDelete.isDirectory()
          };
          break;

        case "delete_directory":
          if (!file_path) throw new Error("Directory path is required for delete operation");
          
          await fs.rmdir(file_path, { recursive });
          
          result = {
            ...result,
            directory_path: file_path,
            recursive
          };
          break;

        case "file_exists":
          if (!file_path) throw new Error("File path is required for exists check");
          
          try {
            const existsStats = await fs.stat(file_path);
            result = {
              ...result,
              file_path,
              exists: true,
              type: existsStats.isDirectory() ? "directory" : "file",
              size: existsStats.size,
              modified: existsStats.mtime.toISOString()
            };
          } catch (error: any) {
            if (error.code === 'ENOENT') {
              result = {
                ...result,
                file_path,
                exists: false
              };
            } else {
              throw error;
            }
          }
          break;

        case "get_file_info":
          if (!file_path) throw new Error("File path is required for info operation");
          
          const infoStats = await fs.stat(file_path);
          
          result = {
            ...result,
            file_path,
            size: infoStats.size,
            type: infoStats.isDirectory() ? "directory" : "file",
            created: infoStats.birthtime.toISOString(),
            modified: infoStats.mtime.toISOString(),
            accessed: infoStats.atime.toISOString(),
            permissions: infoStats.mode,
            is_readable: true, // Simplified - could check actual permissions
            is_writable: true, // Simplified - could check actual permissions
          };
          break;

        case "copy_file":
          if (!file_path) throw new Error("Source file path is required for copy operation");
          if (!destination_path) throw new Error("Destination path is required for copy operation");
          
          const copyStats = await fs.stat(file_path);
          await fs.copyFile(file_path, destination_path);
          
          result = {
            ...result,
            source_path: file_path,
            destination_path,
            size_copied: copyStats.size,
            original_modified: copyStats.mtime.toISOString()
          };
          break;

        case "move_file":
          if (!file_path) throw new Error("Source file path is required for move operation");
          if (!destination_path) throw new Error("Destination path is required for move operation");
          
          const moveStats = await fs.stat(file_path);
          await fs.rename(file_path, destination_path);
          
          result = {
            ...result,
            source_path: file_path,
            destination_path,
            size_moved: moveStats.size
          };
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      logger.info("MCP file server operation completed", {
        operationId,
        operation,
        status: "success"
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown file server error";
      logger.error("MCP file server operation failed", error);
      
      throw new Error(`MCP file server operation failed: ${errorMessage}`);
    }
  },
});

/**
 * Sanitize file path to prevent directory traversal attacks
 */
function sanitizePath(filePath: string): string {
  // Remove any attempt to traverse directories
  const sanitized = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  
  // Ensure the path doesn't start with a leading slash or drive letter manipulation
  const cleaned = sanitized.replace(/^[\/\\]+/, '');
  
  return cleaned;
}
