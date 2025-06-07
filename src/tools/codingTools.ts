/**
 * Secure Coding and File System Toolkit
 * This toolkit provides secure, sandboxed code execution and programmatic file system
 * operations, avoiding direct shell access for enhanced security.
 */
import { createTool, createToolkit } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import ivm from 'isolated-vm';
import * as fs from 'fs/promises';
import path from 'path';

// Helper to ensure file paths are safe
const resolveSecurePath = (filePath: string): string => {
  const authorizedPath = path.resolve(process.cwd());
  const resolvedPath = path.resolve(authorizedPath, filePath);
  if (!resolvedPath.startsWith(authorizedPath)) {
    throw new Error('Access denied: Path is outside the authorized directory.');
  }
  return resolvedPath;
};

/**
 * Executes JavaScript code in a secure, isolated sandbox.
 * This is the ONLY tool for executing code to ensure all execution is sandboxed.
 */
export const sandboxedCodeExecutorTool = createTool({
  name: 'sandboxed_code_executor',
  description: 'Executes JavaScript code in a secure sandbox with resource limits.',
  parameters: z.object({
    code: z.string().describe('The JavaScript code to execute.'),
    timeout: z.number().min(1000).max(30000).default(10000).describe('Execution timeout (ms).'),
    memoryLimit: z.number().min(8).max(1280).default(64).describe('Memory limit (MB).'),
  }),
  execute: async ({ code, timeout, memoryLimit }) => {
    logger.info('[sandboxedCodeExecutorTool] Executing code', { timeout, memoryLimit });
    const isolate = new ivm.Isolate({ memoryLimit });
    const context = await isolate.createContext();
    const jail = context.global;

    const consoleOutput: string[] = [];
    await jail.set('console', new ivm.Reference({
        log: (...args: any[]) => consoleOutput.push(args.map(String).join(' ')),
        error: (...args: any[]) => consoleOutput.push(`ERROR: ${args.map(String).join(' ')}`),
    }));

    try {
      const result = await context.eval(code, { timeout });
      return { success: true, result, consoleOutput };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      logger.error('[sandboxedCodeExecutorTool] Execution failed', { error: errorMessage });
      return { success: false, error: errorMessage, consoleOutput };
    } finally {
      isolate.dispose();
    }
  },
});

/**
 * Reads the content of a file.
 */
export const readFileTool = createTool({
    name: 'read_file',
    description: 'Reads the entire content of a file.',
    parameters: z.object({
        filePath: z.string().describe('The path to the file to read.'),
    }),
    execute: async ({ filePath }) => {
        const securePath = resolveSecurePath(filePath);
        logger.info('[readFileTool]', { path: securePath });
        try {
            return await fs.readFile(securePath, 'utf-8');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[readFileTool] Failed', { error: message });
            throw new Error(`Failed to read file: ${message}`);
        }
    },
});

/**
 * Writes content to a file.
 */
export const writeFileTool = createTool({
    name: 'write_file',
    description: 'Writes content to a file, overwriting it if it exists.',
    parameters: z.object({
        filePath: z.string().describe('The path to the file to write.'),
        content: z.string().describe('The content to write to the file.'),
    }),
    execute: async ({ filePath, content }) => {
        const securePath = resolveSecurePath(filePath);
        logger.info('[writeFileTool]', { path: securePath });
        try {
            await fs.writeFile(securePath, content, 'utf-8');
            return { success: true, path: securePath };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[writeFileTool] Failed', { error: message });
            throw new Error(`Failed to write file: ${message}`);
        }
    },
});

/**
 * Deletes a file.
 */
export const deleteFileTool = createTool({
    name: 'delete_file',
    description: 'Deletes a file.',
    parameters: z.object({
        filePath: z.string().describe('The path to the file to delete.'),
    }),
    execute: async ({ filePath }) => {
        const securePath = resolveSecurePath(filePath);
        logger.info('[deleteFileTool]', { path: securePath });
        try {
            await fs.unlink(securePath);
            return { success: true, path: securePath };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[deleteFileTool] Failed', { error: message });
            throw new Error(`Failed to delete file: ${message}`);
        }
    },
});

/**
 * Lists the contents of a directory.
 */
export const listDirectoryTool = createTool({
    name: 'list_directory',
    description: 'Lists the contents of a directory, showing file types.',
    parameters: z.object({
        dirPath: z.string().describe('The path to the directory to list.'),
    }),
    execute: async ({ dirPath }): Promise<{name: string, type: 'directory' | 'file'}[]> => {
        const securePath = resolveSecurePath(dirPath);
        logger.info('[listDirectoryTool]', { path: securePath });
        try {
            const entries = await fs.readdir(securePath, { withFileTypes: true });
            return entries.map(entry => ({
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file',
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[listDirectoryTool] Failed', { error: message });
            throw new Error(`Failed to list directory: ${message}`);
        }
    },
});

/**
 * Creates a new directory.
 */
export const createDirectoryTool = createTool({
    name: 'create_directory',
    description: 'Creates a new directory, including parent directories if needed.',
    parameters: z.object({
        dirPath: z.string().describe('The path of the directory to create.'),
    }),
    execute: async ({ dirPath }) => {
        const securePath = resolveSecurePath(dirPath);
        logger.info('[createDirectoryTool]', { path: securePath });
        try {
            await fs.mkdir(securePath, { recursive: true });
            return { success: true, path: securePath };
    } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[createDirectoryTool] Failed', { error: message });
            throw new Error(`Failed to create directory: ${message}`);
    }
  },
});

/**
 * Gets information about a file or directory.
 */
export const statTool = createTool({
    name: 'get_stats',
    description: 'Gets file or directory stats (e.g., size, modification date).',
    parameters: z.object({
        filePath: z.string().describe('The path to the file or directory.'),
    }),
    execute: async ({ filePath }) => {
        const securePath = resolveSecurePath(filePath);
        logger.info('[statTool]', { path: securePath });
        try {
            return await fs.stat(securePath);
            } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[statTool] Failed', { error: message });
            throw new Error(`Failed to get stats: ${message}`);
        }
    },
});

/**
 * Moves or renames a file or directory.
 */
export const moveTool = createTool({
    name: 'move',
    description: 'Moves or renames a file or directory.',
    parameters: z.object({
        sourcePath: z.string().describe('The original path.'),
        destinationPath: z.string().describe('The new path.'),
    }),
    execute: async ({ sourcePath, destinationPath }) => {
        const secureSource = resolveSecurePath(sourcePath);
        const secureDestination = resolveSecurePath(destinationPath);
        logger.info('[moveTool]', { from: secureSource, to: secureDestination });
        try {
            await fs.rename(secureSource, secureDestination);
            return { success: true, from: secureSource, to: secureDestination };
    } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[moveTool] Failed', { error: message });
            throw new Error(`Failed to move: ${message}`);
        }
    },
});

/**
 * Copies a file or directory.
 */
export const copyTool = createTool({
    name: 'copy',
    description: 'Recursively copies a file or directory.',
    parameters: z.object({
        sourcePath: z.string().describe('The path to the item to copy.'),
        destinationPath: z.string().describe('The path to copy the item to.'),
    }),
    execute: async ({ sourcePath, destinationPath }) => {
        const secureSource = resolveSecurePath(sourcePath);
        const secureDestination = resolveSecurePath(destinationPath);
        logger.info('[copyTool]', { from: secureSource, to: secureDestination });
        try {
            await fs.cp(secureSource, secureDestination, { recursive: true });
            return { success: true, from: secureSource, to: secureDestination };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[copyTool] Failed', { error: message });
            throw new Error(`Failed to copy: ${message}`);
        }
    },
});

/**
 * Replaces a specific line in a file with new content.
 */
export const replaceLineInFileTool = createTool({
    name: 'replace_line_in_file',
    description: 'Replaces a single line in a file with new content.',
    parameters: z.object({
        filePath: z.string().describe('The path to the file to modify.'),
        lineNumber: z.number().int().positive().describe('The 1-based line number to replace.'),
        newContent: z.string().describe('The new content for the specified line.'),
    }),
    execute: async ({ filePath, lineNumber, newContent }) => {
        const securePath = resolveSecurePath(filePath);
        logger.info('[replaceLineInFileTool]', { path: securePath, lineNumber });
        try {
            const originalContent = await fs.readFile(securePath, 'utf-8');
            const lines = originalContent.split('\n');
            if (lineNumber > lines.length || lineNumber < 1) {
                throw new Error(`Line number ${lineNumber} is out of bounds. File has ${lines.length} lines.`);
            }
            lines[lineNumber - 1] = newContent;
            const updatedContent = lines.join('\n');
            await fs.writeFile(securePath, updatedContent, 'utf-8');
            return { success: true, path: securePath };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[replaceLineInFileTool] Failed', { error: message });
            throw new Error(`Failed to replace line in file: ${message}`);
        }
    },
});

/**
 * Provides secure, programmatic file system operations.
 * Uses Node.js 'fs' module and performs path validation to prevent traversal attacks.
 */
/**
 * Secure Coding and File System Toolkit
 */
export const codingToolkit = createToolkit({
  name: 'Secure Coding Toolkit',
  description: 'A suite of tools for secure, sandboxed code execution and safe file system access.',
  tools: [
    sandboxedCodeExecutorTool as any,
    readFileTool as any,
    writeFileTool as any,
    deleteFileTool as any,
    replaceLineInFileTool as any,
    listDirectoryTool as any,
    createDirectoryTool as any,
    statTool as any,
    moveTool as any,
    copyTool as any,
  ],
});