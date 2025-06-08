/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * Enhanced Git Toolkit with isomorphic-git, isolated-vm, and shelljs
 * This toolkit provides secure and cross-platform Git operations.
 * - `isomorphic-git` is used for core Git commands to avoid shell execution.
 * - `isolated-vm` provides a secure sandbox for running Git automation scripts.
 * - `shelljs` is used for general file system interactions.
 */
import { createTool, createToolkit, type Toolkit } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import ivm from 'isolated-vm';
import * as shell from 'shelljs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';


// Initialize shell with secure defaults
shell.config.silent = true; // Suppress output to console
shell.config.fatal = false; // Don't exit on command failure

/**
 * Executes a Git operation within a repository path.
 * This helper function standardizes directory management for isomorphic-git.
 */
async function executeInRepo<T>(
  repoPath: string | undefined,
  callback: (options: { fs: typeof fs; dir: string; http: typeof http }) => Promise<T>
): Promise<T> {
  const dir = path.resolve(process.cwd(), repoPath || '.');
  if (!fs.existsSync(path.join(dir, '.git'))) {
    throw new Error(`Not a Git repository: ${dir}`);
  }
  return callback({ fs, dir, http });
}

/**
 * Enhanced Git Status Tool using isomorphic-git
 * Provides structured Git status information without executing shell commands.
 */
const enhancedGitStatusSchema = z.object({
  path: z.string().optional().describe('Optional path to the repository'),
});

type EnhancedGitStatusInput = z.infer<typeof enhancedGitStatusSchema>;

export const enhancedGitStatusTool = createTool({
  name: 'enhanced_git_status',
  description: 'Get a structured Git status using isomorphic-git for safety and reliability.',
  parameters: enhancedGitStatusSchema,
  execute: async ({ path }: EnhancedGitStatusInput) => {
    logger.info('[enhancedGitStatusTool] Getting status', { path });
    try {
      return await executeInRepo(path, async ({ fs, dir }) => {
        const statusMatrix = await git.statusMatrix({ fs, dir });
        // Interpret statusMatrix: [filepath, head, workdir, stage]
        // Values for head, workdir, stage: 0=absent, 1=added, 2=modified, 3=deleted

        const stagedFiles: string[] = [];
        const modifiedFiles: string[] = []; // Unstaged changes
        const untrackedFiles: string[] = [];

        for (const row of statusMatrix) {
          const filepath = row[0] as string;
          const headState = row[1];
          const workdirState = row[2];
          const stageState = row[3];

          // Untracked files: absent in HEAD, absent in STAGE, added in WORKDIR
          if (headState === 0 && stageState === 0 && workdirState === 1) {
            untrackedFiles.push(filepath);
          } else {
            // Staged files: any change (added, modified, deleted) in STAGE
            if (stageState === 1 || stageState === 2 || stageState === 3) {
              stagedFiles.push(filepath);
            }

            // Modified files (unstaged changes):
            // File has changes in WORKDIR (added, modified, or deleted)
            // AND this WORKDIR state is different from STAGE state.
            // (And it's not an untracked file, which is handled by the 'else' branch)
            if ((workdirState === 1 || workdirState === 2 || workdirState === 3) && workdirState !== stageState) {
              modifiedFiles.push(filepath);
            }
          }
        }

        return {
          isClean: stagedFiles.length === 0 && modifiedFiles.length === 0 && untrackedFiles.length === 0,
          modified: modifiedFiles,
          staged: stagedFiles,
          untracked: untrackedFiles,
          path: dir,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[enhancedGitStatusTool] Failed', { path, error: errorMessage });
      throw new Error(`Failed to get Git status: ${errorMessage}`);
    }
  },
});

/**
 * Secure Git Script Executor using isolated-vm and isomorphic-git
 * Safely executes user-provided Git automation scripts in a sandboxed environment.
 */
const secureGitScriptSchema = z.object({
  script: z.string().describe('JavaScript code with Git operations to execute in the sandbox'),
  timeout: z.number().min(1000).max(30000).default(10000).describe('Execution timeout in ms'),
  repoPath: z.string().optional().describe('Path to the repository'),
});

type SecureGitScriptInput = z.infer<typeof secureGitScriptSchema>;

export const secureGitScriptTool = createTool({
  name: 'secure_git_script',
  description: 'Execute Git automation scripts in a secure sandbox with isomorphic-git.',
  parameters: secureGitScriptSchema,
  execute: async ({ script, timeout, repoPath }: SecureGitScriptInput) => {
    logger.info('[secureGitScriptTool] Executing script', { scriptLength: script.length, timeout });
    
    const isolate = new ivm.Isolate({ memoryLimit: 64 });
      const context = await isolate.createContext();
    const jail = context.global;

    try {
      // Set up a secure environment
      await jail.set('global', jail.derefInto());
      await jail.set('console', {
        log: new ivm.Reference((...args: any[]) => logger.info('[secureScript]', args)),
        error: new ivm.Reference((...args: any[]) => logger.error('[secureScript]', args)),
      });

      // Expose a limited, secure set of isomorphic-git functions
      const gitAPI = {
        log: new ivm.Reference(async (options: object) =>
          executeInRepo(repoPath, ({ fs, dir }) => git.log({ fs, dir, ...options }))
        ),
        statusMatrix: new ivm.Reference(async (options: object) =>
          executeInRepo(repoPath, ({ fs, dir }) => git.statusMatrix({ fs, dir, ...options }))
        ),
        commit: new ivm.Reference(async (options: object) =>
            executeInRepo(repoPath, ({ fs, dir }) => git.commit({ fs, dir, ...options }))
        ),
        add: new ivm.Reference(async (options: { filepath: string }) =>
            executeInRepo(repoPath, ({ fs, dir }) => git.add({ fs, dir, ...options }))
        ),
      };
      await jail.set('git', new ivm.Reference(gitAPI));
      
      const untrustedScript = await isolate.compileScript(script);
      const result = await untrustedScript.run(context, { timeout });

      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[secureGitScriptTool] Execution failed', { error: errorMessage });
      throw new Error(`Script execution failed: ${errorMessage}`);
    } finally {
      isolate.dispose();
    }
  },
});

/**
 * Cross-Platform Git Repository Analysis Tool using isomorphic-git and shelljs
 * Analyzes repository details safely without relying on shell commands for Git info.
 */
const gitRepositoryAnalysisSchema = z.object({
  path: z.string().default('.').describe('Repository path to analyze'),
  includeFileStats: z.boolean().default(false).describe('Use shelljs to include file statistics'),
});

type GitRepositoryAnalysisInput = z.infer<typeof gitRepositoryAnalysisSchema>;

export const gitRepositoryAnalysisTool = createTool({
  name: 'git_repository_analysis',
  description: 'Comprehensive Git repository analysis using isomorphic-git and shelljs.',
  parameters: gitRepositoryAnalysisSchema,
  execute: async ({ path: repoPath, includeFileStats }: GitRepositoryAnalysisInput) => {
    logger.info('[gitRepositoryAnalysisTool] Analyzing repository', { repoPath, includeFileStats });
    
    try {
      return await executeInRepo(repoPath, async ({ fs, dir }) => {
        const [branches, remotes, log] = await Promise.all([
          git.listBranches({ fs, dir }),
          git.listRemotes({ fs, dir }),
          git.log({ fs, dir, depth: 1 }),
        ]);

      const analysis: any = {
          repositoryPath: dir,
          branches,
          remotes,
          latestCommit: log[0]?.oid,
        };

      if (includeFileStats) {
          const files = shell.find(dir).filter((file: string) => 
            fs.statSync(file).isFile() && !file.includes(path.join(dir, '.git'))
          );
        
        analysis.fileStats = {
          totalFiles: files.length,
            fileTypes: files.reduce((acc: Map<string, number>, file: string) => {
              const ext = path.extname(file) || '.noextension';
              acc.set(ext, (acc.get(ext) || 0) + 1);
              return acc;
            }, new Map<string, number>()),
        };
      }

      return analysis;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitRepositoryAnalysisTool] Failed', { repoPath, error: errorMessage });
      throw new Error(`Repository analysis failed: ${errorMessage}`);
    }
  },
});

/**
 * Adds file contents to the staging area.
 */
const gitAddSchema = z.object({
  repoPath: z.string().optional().describe('Path to the repository.'),
  filepath: z.union([z.string(), z.array(z.string())]).describe('A single file or an array of files to add.'),
});
export const gitAddTool = createTool({
  name: 'git_add',
  description: 'Add file contents to the staging area.',
  parameters: gitAddSchema,
  execute: async ({ repoPath, filepath }) => {
    logger.info('[gitAddTool]', { repoPath, filepath });
    const files = Array.isArray(filepath) ? filepath : [filepath];
    return executeInRepo(repoPath, async ({ fs, dir }) => {
      for (const file of files) {
        await git.add({ fs, dir, filepath: file });
    }
      return { success: true, added: files };
    });
  },
});

/**
 * Commits staged changes.
 */
const gitCommitSchema = z.object({
  repoPath: z.string().optional().describe('Path to the repository.'),
  message: z.string().describe('The commit message.'),
  author: z.object({
    name: z.string().describe('The author\'s name.'),
    email: z.string().describe('The author\'s email.'),
  }).optional().describe('The author of the commit.'),
});
export const gitCommitTool = createTool({
  name: 'git_commit',
  description: 'Records staged changes to the repository.',
  parameters: gitCommitSchema,
  execute: async ({ repoPath, message, author }) => {
    logger.info('[gitCommitTool]', { repoPath, message });
    return executeInRepo(repoPath, async ({ fs, dir }) => {
      const commitOptions = {
        fs,
        dir,
        message,
        author: author || { name: 'AI-Volt Agent', email: 'agent@ai-volt.com' },
      };
      const sha = await git.commit(commitOptions);
      return { success: true, sha };
    });
  },
});

/**
 * Pushes commits to a remote repository.
 */
const gitPushSchema = z.object({
  repoPath: z.string().optional().describe('Path to the repository.'),
  remote: z.string().default('origin').describe('The name of the remote to push to.'),
  ref: z.string().optional().describe('The local branch or ref to push.'),
  force: z.boolean().default(false).describe('Whether to force the push.'),
});
export const gitPushTool = createTool({
  name: 'git_push',
  description: 'Push commits to a remote repository.',
  parameters: gitPushSchema,
  execute: async ({ repoPath, remote, ref, force }) => {
    logger.info('[gitPushTool]', { repoPath, remote, ref, force });
    return executeInRepo(repoPath, async ({ fs, dir, http }) => {
      const result = await git.push({ fs, dir, http, remote, ref, force });
      return { success: result.ok, result };
    });
  },
      });

/**
 * Fetches changes from a remote repository.
 */
const gitFetchSchema = z.object({
    repoPath: z.string().optional().describe('Path to the repository.'),
    remote: z.string().default('origin').describe('The name of the remote to fetch from.'),
    ref: z.string().optional().describe('A single ref to fetch.'),
});
export const gitFetchTool = createTool({
    name: 'git_fetch',
    description: 'Download objects and refs from another repository.',
    parameters: gitFetchSchema,
    execute: async ({ repoPath, remote, ref }) => {
        logger.info('[gitFetchTool]', { repoPath, remote, ref });
        return executeInRepo(repoPath, async ({ fs, dir, http }) => {
            const result = await git.fetch({ fs, dir, http, remote, ref });
            return { success: true, result };
        });
    },
});

/**
 * Pulls changes from a remote (fetch + merge).
 */
const gitPullSchema = z.object({
    repoPath: z.string().optional().describe('Path to the repository.'),
    remote: z.string().default('origin').describe('The remote to pull from.'),
    ref: z.string().describe('The branch to pull.'),
    author: z.object({
        name: z.string(),
        email: z.string(),
    }).optional(),
});
export const gitPullTool = createTool({
    name: 'git_pull',
    description: 'Fetch from and integrate with another repository or a local branch.',
    parameters: gitPullSchema,
    execute: async ({ repoPath, remote, ref, author }) => {
        logger.info('[gitPullTool]', { repoPath, remote, ref });
        return executeInRepo(repoPath, async ({ fs, dir, http }) => {
            await git.pull({
                fs,
                dir,
                http,
                ref,
                remote,
                author: author || { name: 'AI-Volt Agent', email: 'agent@ai-volt.com' },
            });
            return { success: true, message: `Successfully pulled ${ref} from ${remote}.` };
        });
    },
});

/**
 * Merges a branch into the current branch.
 */
const gitMergeSchema = z.object({
    repoPath: z.string().optional().describe('Path to the repository.'),
    theirBranch: z.string().describe('The branch to merge into the current one.'),
    author: z.object({
        name: z.string(),
        email: z.string(),
    }).optional(),
});
export const gitMergeTool = createTool({
    name: 'git_merge',
    description: 'Join two or more development histories together.',
    parameters: gitMergeSchema,
    execute: async ({ repoPath, theirBranch, author }) => {
        logger.info('[gitMergeTool]', { repoPath, theirBranch });
        return executeInRepo(repoPath, async ({ fs, dir }) => {
            const result = await git.merge({
                fs,
                dir,
                theirs: theirBranch,
                author: author || { name: 'AI-Volt Agent', email: 'agent@ai-volt.com' },
            });
            return { success: true, result };
        });
    },
});

/**
 * Creates a new branch.
 */
const gitBranchSchema = z.object({
    repoPath: z.string().optional().describe('Path to the repository.'),
    ref: z.string().describe('The name of the branch to create.'),
    checkout: z.boolean().default(false).describe('Whether to checkout the new branch after creating it.'),
});
export const gitBranchTool = createTool({
    name: 'git_branch',
    description: 'Create a new branch.',
    parameters: gitBranchSchema,
    execute: async ({ repoPath, ref, checkout }) => {
        logger.info('[gitBranchTool]', { repoPath, ref, checkout });
        return executeInRepo(repoPath, async ({ fs, dir }) => {
            await git.branch({ fs, dir, ref, checkout });
            return { success: true, branch: ref };
        });
    },
});

/**
 * Clones a repository into a new directory.
 */
export const gitCloneTool = createTool({
    name: 'git_clone',
    description: 'Clone a repository into a new directory.',
    parameters: z.object({
        repoPath: z.string().describe('The directory to clone into.'),
        url: z.string().describe('The URL of the repository to clone.'),
        ref: z.string().optional().describe("The name of the branch to clone. Defaults to the remote's default branch."),
        singleBranch: z.boolean().default(true).describe('Only clone a single branch.'),
        depth: z.number().optional().describe('Create a shallow clone with a history truncated to the specified number of commits.'),
    }),
    execute: async ({ repoPath, url, ref, singleBranch, depth }) => {
        logger.info('[gitCloneTool]', { repoPath, url });
        const dir = path.resolve(process.cwd(), repoPath);
        await git.clone({ fs, http, dir, url, ref, singleBranch, depth });
        return { success: true, path: dir };
    },
});

/**
 * Enhanced Git Toolkit
 * A collection of secure, cross-platform Git tools.
 */
export const enhancedGitToolkit: Toolkit = createToolkit({
  name: 'Enhanced Git Toolkit',
  description: 'A suite of advanced Git tools using isomorphic-git for security and shelljs for file operations.',
  tools: [
    enhancedGitStatusTool as any,
    secureGitScriptTool as any,
    gitRepositoryAnalysisTool as any,
    gitAddTool as any,
    gitCommitTool as any,
    gitPushTool as any,
    gitFetchTool as any,
    gitPullTool as any,
    gitMergeTool as any,
    gitBranchTool as any,
    gitCloneTool as any,
  ],
});
