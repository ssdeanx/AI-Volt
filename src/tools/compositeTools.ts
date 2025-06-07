/**
 * Composite Tools Toolkit
 * This toolkit provides higher-level, multi-step workflows by combining
 * functionalities from other, more granular toolkits.
 */
import { createTool, createToolkit } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { gitCloneTool } from './enhancedGitTool.js';
import { lintCodeTool } from './debugTools.js';
import { listDirectoryTool, readFileTool } from './codingTools.js';
import path from 'path';
import * as fs from 'fs/promises';

/**
 * Clones a Git repository and performs a comprehensive analysis of its contents.
 */
export const gitCloneAndAnalyzeTool = createTool({
  name: 'git_clone_and_analyze',
  description: 'Clones a Git repository, then analyzes its contents for code quality and security.',
  parameters: z.object({
    url: z.string().describe('The URL of the repository to clone.'),
    repoPath: z.string().optional().describe('The local directory path to clone into. Defaults to a temporary directory.'),
  }),
  execute: async ({ url, repoPath }) => {
    const clonePath = repoPath || path.join(process.cwd(), `temp-clone-${Date.now()}`);
    let analysisCompleted = false;
    
    try {
      // Step 1: Clone the repository
      logger.info('[gitCloneAndAnalyzeTool] Cloning repository', { url, clonePath });
      await gitCloneTool.execute({ url, repoPath: clonePath, singleBranch: true });
      
      // Step 2: List all files recursively
      logger.info('[gitCloneAndAnalyzeTool] Analyzing repository content', { clonePath });
      const allFiles = await listDirectoryTool.execute({ dirPath: clonePath }) as { name: string, type: string }[];
      const tsFiles = allFiles.filter(f => f.type === 'file' && f.name.endsWith('.ts'));

      const analysisResults = {
        linting: [] as any[],
      };

      // Step 3: Analyze each TypeScript file
      for (const file of tsFiles) {
        try {
          const content = await readFileTool.execute({ filePath: path.join(clonePath, file.name) }) as string;
          const lintResult = await lintCodeTool.execute({ code: content, fileName: file.name }) as any;
          if (lintResult.results[0]?.errorCount > 0 || lintResult.results[0]?.warningCount > 0) {
            analysisResults.linting.push({
              file: file.name,
              issues: lintResult.results[0].messages,
            });
          }
        } catch (fileError) {
            logger.warn(`[gitCloneAndAnalyzeTool] Could not analyze file ${file.name}`, { error: fileError });
        }
      }

      analysisCompleted = true;
      return {
        success: true,
        clonePath,
        analysis: analysisResults,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitCloneAndAnalyzeTool] Workflow failed', { error: errorMessage });
      throw new Error(`Git clone and analyze failed: ${errorMessage}`);
    } finally {
        if (analysisCompleted) {
            await fs.rm(clonePath, { recursive: true, force: true });
            logger.info('[gitCloneAndAnalyzeTool] Cleaned up temporary clone directory.', { clonePath });
        }
    }
  },
});

/**
 * Composite Toolkit
 * High-level tools for complex, multi-step operations.
 */
export const compositeToolkit = createToolkit({
  name: 'Composite Workflow Toolkit',
  description: 'A collection of high-level tools that orchestrate multi-step workflows.',
  tools: [
    gitCloneAndAnalyzeTool as any,
  ],
}); 