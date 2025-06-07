// Generated on 2025-06-03
/**
 * Git Toolkit - Comprehensive Git Operations
 * Provides a full suite of Git operations using simple-git.
 * Includes status, commit, push, pull, branch management, and more.
 */
import { createTool } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { simpleGit, SimpleGit } from 'simple-git';

const git: SimpleGit = simpleGit(); // Initialize simple-git client

// --- Git Status Tool ---
const gitStatusSchema = z.object({
  path: z.string().optional().describe('Optional path to check status for specific directory'),
});

type GitStatusInput = z.infer<typeof gitStatusSchema>;

const gitStatusTool = createTool({
  name: 'git_status',
  description: 'Get Git repository status, including modified, staged, and untracked files.',
  parameters: gitStatusSchema,
  execute: async ({ path }: GitStatusInput) => {
    logger.info('[gitStatusTool] Getting Git status', { path });
    try {
      const status = await git.status(path ? [path] : []);
      return {
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        modified: status.modified,
        staged: status.staged,
        created: status.created,
        deleted: status.deleted,
        renamed: status.renamed,
        conflicted: status.conflicted,
        not_added: status.not_added,
        isClean: status.isClean(),
      };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitStatusTool] Failed to get status', { path, error: errorMessage });
      throw new Error(`Git status failed: ${errorMessage}`);
    }
  }
});

// --- Git Add Tool ---
const gitAddSchema = z.object({
  files: z.array(z.string()).describe('Files to add to staging area. Use ["."] to add all files'),
});

type GitAddInput = z.infer<typeof gitAddSchema>;

const gitAddTool = createTool({
  name: 'git_add',
  description: 'Add files to Git staging area.',
  parameters: gitAddSchema,
  execute: async ({ files }: GitAddInput) => {
    logger.info('[gitAddTool] Adding files to staging', { files });
    try {
      const result = await git.add(files);
      return { files, result };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitAddTool] Failed to add files', { files, error: errorMessage });
      throw new Error(`Git add failed: ${errorMessage}`);
    }
  }
});

// --- Git Commit Tool ---
const gitCommitSchema = z.object({
  message: z.string().describe('Commit message'),
  files: z.array(z.string()).optional().describe('Optional specific files to commit'),
});

type GitCommitInput = z.infer<typeof gitCommitSchema>;

const gitCommitTool = createTool({
  name: 'git_commit',
  description: 'Create a Git commit with a message.',
  parameters: gitCommitSchema,
  execute: async ({ message, files }: GitCommitInput) => {
    logger.info('[gitCommitTool] Creating commit', { message, files });
    try {
      const result = await git.commit(message, files);
      return {
        commit: result.commit,
        summary: result.summary,
        branch: result.branch,
        root: result.root,
      };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitCommitTool] Failed to commit', { message, files, error: errorMessage });
      throw new Error(`Git commit failed: ${errorMessage}`);
    }
  }
});

// --- Git Push Tool ---
const gitPushSchema = z.object({
  remote: z.string().default('origin').describe('Remote name (default: origin)'),
  branch: z.string().optional().describe('Branch name (default: current branch)'),
  force: z.boolean().default(false).describe('Force push (use with caution)'),
});

type GitPushInput = z.infer<typeof gitPushSchema>;

const gitPushTool = createTool({
  name: 'git_push',
  description: 'Push commits to remote repository.',
  parameters: gitPushSchema,
  execute: async ({ remote, branch, force }: GitPushInput) => {
    logger.info('[gitPushTool] Pushing to remote', { remote, branch, force });
    try {
      const options = force ? ['--force'] : [];
      const result = await git.push(remote, branch, options);
      return { remote, branch, force, result };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitPushTool] Failed to push', { remote, branch, force, error: errorMessage });
      throw new Error(`Git push failed: ${errorMessage}`);
    }
  }
});

// --- Git Pull Tool ---
const gitPullSchema = z.object({
  remote: z.string().default('origin').describe('Remote name (default: origin)'),
  branch: z.string().optional().describe('Branch name (default: current branch)'),
});

type GitPullInput = z.infer<typeof gitPullSchema>;

const gitPullTool = createTool({
  name: 'git_pull',
  description: 'Pull changes from remote repository.',
  parameters: gitPullSchema,
  execute: async ({ remote, branch }: GitPullInput) => {
    logger.info('[gitPullTool] Pulling from remote', { remote, branch });
    try {
      const result = await git.pull(remote, branch);
      return {
        remote,
        branch,
        summary: result.summary,
        files: result.files,
        insertions: result.insertions,
        deletions: result.deletions,
      };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitPullTool] Failed to pull', { remote, branch, error: errorMessage });
      throw new Error(`Git pull failed: ${errorMessage}`);
    }
  }
});

// --- Git Branch Tool ---
const gitBranchSchema = z.object({
  action: z.enum(['list', 'create', 'delete', 'checkout']).describe('Branch action to perform'),
  branchName: z.string().optional().describe('Branch name (required for create, delete, checkout)'),
  force: z.boolean().default(false).describe('Force action (for delete)'),
});

type GitBranchInput = z.infer<typeof gitBranchSchema>;

const gitBranchTool = createTool({
  name: 'git_branch',
  description: 'Manage Git branches - list, create, delete, or checkout branches.',
  parameters: gitBranchSchema,
  execute: async ({ action, branchName, force }: GitBranchInput) => {
    logger.info('[gitBranchTool] Branch action', { action, branchName, force });
    try {
      switch (action) {
        case 'list':
          { const branches = await git.branch();
          return {
            action,
            branches: branches.all,
            current: branches.current,
          }; }
        
        case 'create':
          if (!branchName) throw new Error('Branch name is required for create action');
          await git.checkoutLocalBranch(branchName);
          return { action, branchName, created: true };
        
        case 'checkout':
          if (!branchName) throw new Error('Branch name is required for checkout action');
          await git.checkout(branchName);
          return { action, branchName, checkedOut: true };
        
        case 'delete':
          { if (!branchName) throw new Error('Branch name is required for delete action');
          const deleteOptions = force ? ['-D'] : ['-d'];
          await git.branch([...deleteOptions, branchName]);
          return { action, branchName, deleted: true, force }; }
        
        default:
          throw new Error(`Unknown branch action: ${action}`);
      }    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitBranchTool] Branch action failed', { action, branchName, force, error: errorMessage });
      throw new Error(`Git branch ${action} failed: ${errorMessage}`);
    }
  }
});

// --- Git Log Tool ---
const gitLogSchema = z.object({
  maxCount: z.number().min(1).max(100).default(10).describe('Maximum number of commits to retrieve'),
  oneline: z.boolean().default(false).describe('Show one line per commit'),
  graph: z.boolean().default(false).describe('Show graph representation'),
});

type GitLogInput = z.infer<typeof gitLogSchema>;

const gitLogTool = createTool({
  name: 'git_log',
  description: 'Get Git commit history with configurable options.',
  parameters: gitLogSchema,
  execute: async ({ maxCount, oneline, graph }: GitLogInput) => {
    logger.info('[gitLogTool] Getting commit log', { maxCount, oneline, graph });
    try {
      const options: any = { maxCount };
      if (oneline) options.format = { hash: '%H', date: '%ai', message: '%s', author_name: '%an' };
      if (graph) options['--graph'] = null;
      
      const log = await git.log(options);
      return {
        maxCount,
        oneline,
        graph,
        commits: log.all.map(commit => ({
          hash: commit.hash,
          date: commit.date,
          message: commit.message,
          author_name: commit.author_name,
          author_email: commit.author_email,
        })),
      };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitLogTool] Failed to get log', { maxCount, oneline, graph, error: errorMessage });
      throw new Error(`Git log failed: ${errorMessage}`);
    }
  }
});

// --- Git Diff Tool ---
const gitDiffSchema = z.object({
  staged: z.boolean().default(false).describe('Show staged changes (--cached)'),
  file: z.string().optional().describe('Show diff for specific file'),
});

type GitDiffInput = z.infer<typeof gitDiffSchema>;

const gitDiffTool = createTool({
  name: 'git_diff',
  description: 'Show Git diff of changes in working directory or staging area.',
  parameters: gitDiffSchema,
  execute: async ({ staged, file }: GitDiffInput) => {
    logger.info('[gitDiffTool] Getting diff', { staged, file });
    try {
      const options = [];
      if (staged) options.push('--cached');
      if (file) options.push(file);
      
      const diff = await git.diff(options);
      return { staged, file, diff };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitDiffTool] Failed to get diff', { staged, file, error: errorMessage });
      throw new Error(`Git diff failed: ${errorMessage}`);
    }
  }
});

// --- Git Merge Tool ---
const gitMergeSchema = z.object({
  branch: z.string().describe('Branch to merge into current branch'),
  noFastForward: z.boolean().default(false).describe('Create merge commit even when fast-forward is possible'),
});

type GitMergeInput = z.infer<typeof gitMergeSchema>;

const gitMergeTool = createTool({
  name: 'git_merge',
  description: 'Merge specified branch into current branch.',
  parameters: gitMergeSchema,
  execute: async ({ branch, noFastForward }: GitMergeInput) => {
    logger.info('[gitMergeTool] Merging branch', { branch, noFastForward });
    try {
      const options = noFastForward ? ['--no-ff'] : [];
      const result = await git.merge([branch, ...options]);
      return { branch, noFastForward, result };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitMergeTool] Failed to merge', { branch, noFastForward, error: errorMessage });
      throw new Error(`Git merge failed: ${errorMessage}`);
    }
  }
});

// --- Git Reset Tool ---
const gitResetSchema = z.object({
  mode: z.enum(['soft', 'mixed', 'hard']).default('mixed').describe('Reset mode'),
  target: z.string().default('HEAD').describe('Target commit (default: HEAD)'),
});

type GitResetInput = z.infer<typeof gitResetSchema>;

const gitResetTool = createTool({
  name: 'git_reset',
  description: 'Reset current HEAD to specified state.',
  parameters: gitResetSchema,
  execute: async ({ mode, target }: GitResetInput) => {
    logger.info('[gitResetTool] Resetting', { mode, target });
    try {
      const result = await git.reset([`--${mode}`, target]);
      return { mode, target, result };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitResetTool] Failed to reset', { mode, target, error: errorMessage });
      throw new Error(`Git reset failed: ${errorMessage}`);
    }
  }
});

// --- Legacy Git Tool (for backwards compatibility) ---
const gitArgsSchema = z.object({
  args: z.array(z.string()).min(1).describe('Array of Git command arguments (e.g., ["status"], ["checkout","branchName"]).'),
});

type GitArgsInput = z.infer<typeof gitArgsSchema>;

const gitTool = createTool({
  name: 'git_tool',
  description: 'Executes raw Git commands using simple-git (legacy tool).',
  parameters: gitArgsSchema,
  execute: async ({ args }: GitArgsInput) => {
    logger.info('[gitTool] Executing Git command', { args });
    try {
      const result = await git.raw(args);
      return { args, result };    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[gitTool] Git command failed', { args, error: errorMessage });
      throw new Error(`Git command failed: ${errorMessage}`);
    }
  }
});

// --- Exports ---
export {
  gitStatusTool,
  gitAddTool,
  gitCommitTool,
  gitPushTool,
  gitPullTool,
  gitBranchTool,
  gitLogTool,
  gitDiffTool,
  gitMergeTool,
  gitResetTool,
  gitTool,

};
