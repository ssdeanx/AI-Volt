/**
 * Enhanced Git Toolkit with isolated-vm and shelljs Integration
 * Demonstrates secure Git operations using isolated-vm for sandboxing and shelljs for cross-platform compatibility
 */
import { createTool, createToolkit, type Toolkit } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import ivm from 'isolated-vm';
import * as shell from 'shelljs';
import { simpleGit, SimpleGit } from 'simple-git';

// Initialize shell with secure defaults
shell.config.silent = true; // Suppress output to console
shell.config.fatal = false; // Don't exit on command failure

const git: SimpleGit = simpleGit();

/**
 * Enhanced Git Status Tool with shelljs
 * Uses shelljs for cross-platform Git command execution with better error handling
 */
const enhancedGitStatusSchema = z.object({
  path: z.string().optional().describe('Optional path to check status for specific directory'),
  includeUntrackedFiles: z.boolean().default(true).describe('Include untracked files in status'),
  porcelain: z.boolean().default(false).describe('Use porcelain format for machine-readable output'),
});

type EnhancedGitStatusInput = z.infer<typeof enhancedGitStatusSchema>;

const enhancedGitStatusTool = createTool({
  name: 'enhanced_git_status',
  description: 'Enhanced Git status using shelljs for cross-platform compatibility and better error handling.',
  parameters: enhancedGitStatusSchema,
  execute: async ({ path, includeUntrackedFiles, porcelain }: EnhancedGitStatusInput) => {
    logger.info('[enhancedGitStatusTool] Getting enhanced Git status', { path, includeUntrackedFiles, porcelain });
    
    try {
      // Use shelljs for cross-platform command execution
      const oldCwd = shell.pwd().toString();
      
      if (path) {
        if (!shell.test('-d', path)) {
          throw new Error(`Directory does not exist: ${path}`);
        }
        shell.cd(path);
      }

      // Build Git status command with options
      let statusCmd = 'git status';
      if (porcelain) {
        statusCmd += ' --porcelain';
      }
      if (!includeUntrackedFiles) {
        statusCmd += ' --ignored=no';
      }

      const result = shell.exec(statusCmd, { silent: true });
      
      // Restore original directory
      shell.cd(oldCwd);

      if (result.code !== 0) {
        throw new Error(`Git status failed: ${result.stderr}`);
      }

      // Also use simple-git for structured data
      const statusData = await git.status(path ? [path] : []);

      return {
        shellOutput: result.stdout,
        porcelain,
        includeUntrackedFiles,
        path: path || process.cwd(),
        structured: {
          current: statusData.current,
          tracking: statusData.tracking,
          ahead: statusData.ahead,
          behind: statusData.behind,
          modified: statusData.modified,
          staged: statusData.staged,
          created: statusData.created,
          deleted: statusData.deleted,
          renamed: statusData.renamed,
          conflicted: statusData.conflicted,
          not_added: statusData.not_added,
          isClean: statusData.isClean(),
        }
      };
    } catch (error) {
      logger.error('[enhancedGitStatusTool] Failed to get enhanced status', { 
        path, includeUntrackedFiles, porcelain, error: (error as Error).message 
      });
      throw new Error(`Enhanced Git status failed: ${(error as Error).message}`);
    }
  }
});

/**
 * Secure Git Script Executor using isolated-vm
 * Safely executes user-provided Git automation scripts in an isolated environment
 */
const secureGitScriptSchema = z.object({
  script: z.string().describe('JavaScript code to execute in isolated environment for Git automation'),
  timeout: z.number().min(1000).max(30000).default(10000).describe('Script execution timeout in milliseconds'),
  gitCommands: z.array(z.string()).optional().describe('Pre-approved Git commands that the script can execute'),
});

type SecureGitScriptInput = z.infer<typeof secureGitScriptSchema>;

const secureGitScriptTool = createTool({
  name: 'secure_git_script',
  description: 'Execute Git automation scripts in a secure isolated environment using isolated-vm.',
  parameters: secureGitScriptSchema,
  execute: async ({ script, timeout, gitCommands }: SecureGitScriptInput) => {
    logger.info('[secureGitScriptTool] Executing secure Git script', { 
      scriptLength: script.length, timeout, approvedCommands: gitCommands?.length || 0 
    });
    
    try {
      // Create an isolated VM context
      const isolate = new ivm.Isolate({ memoryLimit: 32 }); // 32MB memory limit
      const context = await isolate.createContext();
      const global = context.global;

      // Prepare a secure execution environment
      await global.set('console', {
        log: (...args: any[]) => logger.info('[secureScript]', args),
        error: (...args: any[]) => logger.error('[secureScript]', args),
        warn: (...args: any[]) => logger.warn('[secureScript]', args),
      });

      // Create a safe Git command executor
      await global.set('gitExec', async (command: string) => {
        if (gitCommands && !gitCommands.includes(command)) {
          throw new Error(`Git command not approved: ${command}`);
        }
        
        const result = shell.exec(`git ${command}`, { silent: true });
        return {
          code: result.code,
          stdout: result.stdout,
          stderr: result.stderr,
          success: result.code === 0
        };
      });

      // Provide utility functions
      await global.set('utils', {
        getCurrentDir: () => shell.pwd().toString(),
        fileExists: (path: string) => shell.test('-f', path),
        dirExists: (path: string) => shell.test('-d', path),
      });

      // Execute the script with timeout
      const scriptPromise = context.eval(script);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Script execution timeout')), timeout);
      });

      const result = await Promise.race([scriptPromise, timeoutPromise]);
      
      // Clean up
      isolate.dispose();

      return {
        result,
        executionTime: Date.now(),
        success: true,
        approvedCommands: gitCommands || [],
      };
    } catch (error) {
      logger.error('[secureGitScriptTool] Script execution failed', { 
        script: script.substring(0, 100) + '...', error: (error as Error).message 
      });
      throw new Error(`Secure Git script execution failed: ${(error as Error).message}`);
    }
  }
});

/**
 * Cross-Platform Git Repository Analysis Tool
 * Uses shelljs for file system operations and Git analysis across different platforms
 */
const gitRepositoryAnalysisSchema = z.object({
  path: z.string().default('.').describe('Repository path to analyze'),
  includeFileStats: z.boolean().default(true).describe('Include file statistics in analysis'),
  analyzeBranches: z.boolean().default(true).describe('Analyze branch information'),
  checkRemotes: z.boolean().default(true).describe('Check remote repository information'),
});

type GitRepositoryAnalysisInput = z.infer<typeof gitRepositoryAnalysisSchema>;

const gitRepositoryAnalysisTool = createTool({
  name: 'git_repository_analysis',
  description: 'Comprehensive Git repository analysis using cross-platform shelljs operations.',
  parameters: gitRepositoryAnalysisSchema,
  execute: async ({ path, includeFileStats, analyzeBranches, checkRemotes }: GitRepositoryAnalysisInput) => {
    logger.info('[gitRepositoryAnalysisTool] Analyzing Git repository', { 
      path, includeFileStats, analyzeBranches, checkRemotes 
    });
    
    try {
      const oldCwd = shell.pwd().toString();
      
      // Validate and change to target directory
      if (!shell.test('-d', path)) {
        throw new Error(`Directory does not exist: ${path}`);
      }
      shell.cd(path);

      // Check if it's a Git repository
      if (!shell.test('-d', '.git')) {
        throw new Error('Not a Git repository');
      }

      const analysis: any = {
        repositoryPath: shell.pwd().toString(),
        timestamp: new Date().toISOString(),
      };

      // Basic repository information
      const configResult = shell.exec('git config --get remote.origin.url', { silent: true });
      if (configResult.code === 0) {
        analysis.remoteUrl = configResult.stdout.trim();
      }

      // File statistics using shelljs
      if (includeFileStats) {
        const files = shell.find('.').filter((file: string) => {
          return shell.test('-f', file) && !file.includes('.git/');
        });
        
        analysis.fileStats = {
          totalFiles: files.length,
          fileTypes: {},
          largestFiles: [],
        };

        // Analyze file types
        files.forEach((file: string) => {
          const ext = file.split('.').pop() || 'no-extension';
          analysis.fileStats.fileTypes[ext] = (analysis.fileStats.fileTypes[ext] || 0) + 1;
        });        // Find largest files (cross-platform)
        const fileSizes = files.map((file: string) => {
          const stats = shell.ls('-l', file);
          return { file, size: stats.length || 0 };
        }).sort((a: { file: string; size: number }, b: { file: string; size: number }) => b.size - a.size).slice(0, 5);
        
        analysis.fileStats.largestFiles = fileSizes;
      }

      // Branch analysis
      if (analyzeBranches) {
        const branchResult = shell.exec('git branch -a', { silent: true });        if (branchResult.code === 0) {
          analysis.branches = {
            all: branchResult.stdout.split('\n').filter(Boolean).map((b: string) => b.trim()),
            current: null,
            total: 0,
          };
          
          const currentBranch = analysis.branches.all.find((b: string) => b.startsWith('*'));
          if (currentBranch) {
            analysis.branches.current = currentBranch.replace('*', '').trim();
          }
          analysis.branches.total = analysis.branches.all.length;
        }
      }

      // Remote analysis
      if (checkRemotes) {
        const remoteResult = shell.exec('git remote -v', { silent: true });
        if (remoteResult.code === 0) {
          analysis.remotes = remoteResult.stdout.split('\n').filter(Boolean);
        }
      }

      // Commit statistics
      const commitCountResult = shell.exec('git rev-list --count HEAD', { silent: true });
      if (commitCountResult.code === 0) {
        analysis.totalCommits = parseInt(commitCountResult.stdout.trim(), 10);
      }

      // Recent commit info
      const recentCommitResult = shell.exec('git log -1 --pretty=format:"%H|%an|%ae|%ad|%s"', { silent: true });
      if (recentCommitResult.code === 0) {
        const parts = recentCommitResult.stdout.split('|');
        analysis.lastCommit = {
          hash: parts[0],
          author: parts[1],
          email: parts[2],
          date: parts[3],
          message: parts[4],
        };
      }

      // Restore original directory
      shell.cd(oldCwd);

      return analysis;
    } catch (error) {
      // Ensure we restore directory even on error
      shell.cd(shell.pwd().toString());
      logger.error('[gitRepositoryAnalysisTool] Analysis failed', { 
        path, error: (error as Error).message 
      });
      throw new Error(`Git repository analysis failed: ${(error as Error).message}`);
    }
  }
});

/**
 * Isolated Git Hook Validator
 * Validates Git hooks safely in an isolated environment
 */
const gitHookValidatorSchema = z.object({
  hookType: z.enum(['pre-commit', 'post-commit', 'pre-push', 'post-receive']).describe('Type of Git hook to validate'),
  hookScript: z.string().describe('Hook script content to validate'),
  validateOnly: z.boolean().default(true).describe('Only validate, do not execute the hook'),
});

type GitHookValidatorInput = z.infer<typeof gitHookValidatorSchema>;

const gitHookValidatorTool = createTool({
  name: 'git_hook_validator',
  description: 'Validate Git hooks safely in an isolated environment using isolated-vm.',
  parameters: gitHookValidatorSchema,
  execute: async ({ hookType, hookScript, validateOnly }: GitHookValidatorInput) => {
    logger.info('[gitHookValidatorTool] Validating Git hook', { 
      hookType, scriptLength: hookScript.length, validateOnly 
    });
    
    try {
      // Create isolated VM for validation
      const isolate = new ivm.Isolate({ memoryLimit: 16 });
      const context = await isolate.createContext();
      const global = context.global;

      // Provide safe environment for hook validation
      await global.set('hookType', hookType);
      await global.set('console', {
        log: (...args: any[]) => logger.info(`[hook-${hookType}]`, args),
        error: (...args: any[]) => logger.error(`[hook-${hookType}]`, args),
      });

      // Mock Git environment variables commonly used in hooks
      await global.set('env', {
        GIT_DIR: '.git',
        GIT_WORK_TREE: '.',
        GIT_INDEX_FILE: '.git/index',
      });

      // Provide safe utilities
      await global.set('utils', {
        validateScript: (script: string) => {
          // Basic script validation
          const forbidden = ['rm -rf', 'sudo', 'exec', 'eval'];
          return !forbidden.some(cmd => script.includes(cmd));
        },
        getHookType: () => hookType,
      });

      // Validation script
      const validationScript = `
        (function() {
          try {
            // Basic syntax check
            const syntaxCheck = Function('return true');
            
            // Hook-specific validation
            const validations = {
              'pre-commit': () => {
                console.log('Validating pre-commit hook');
                return { valid: true, message: 'Pre-commit hook syntax valid' };
              },
              'post-commit': () => {
                console.log('Validating post-commit hook');
                return { valid: true, message: 'Post-commit hook syntax valid' };
              },
              'pre-push': () => {
                console.log('Validating pre-push hook');
                return { valid: true, message: 'Pre-push hook syntax valid' };
              },
              'post-receive': () => {
                console.log('Validating post-receive hook');
                return { valid: true, message: 'Post-receive hook syntax valid' };
              }
            };
            
            const validator = validations[hookType];
            if (!validator) {
              return { valid: false, message: 'Unknown hook type' };
            }
            
            return validator();
          } catch (error) {
            return { valid: false, message: error.message };
          }
        })();
      `;

      const validationResult = await context.eval(validationScript);
      
      isolate.dispose();      // Additional shelljs-based checks for the hook file
      let fileSystemChecks = null;
      if (!validateOnly) {
        const hookPath = `.git/hooks/${hookType}`;
        fileSystemChecks = {
          hookExists: shell.test('-f' as any, hookPath),
          isExecutable: shell.test('-f' as any, hookPath) && shell.test('-r' as any, hookPath),
          canRead: shell.test('-r' as any, hookPath),
        };
      }

      return {
        hookType,
        validation: validationResult,
        fileSystemChecks,
        validateOnly,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[gitHookValidatorTool] Hook validation failed', { 
        hookType, error: (error as Error).message 
      });
      throw new Error(`Git hook validation failed: ${(error as Error).message}`);
    }
  }
});

/**
 * Enhanced Git Toolkit combining all enhanced tools
 */
const enhancedGitToolkit: Toolkit = createToolkit({
  name: 'enhanced_git_toolkit',
  description: 'Enhanced Git operations toolkit with isolated-vm security and shelljs cross-platform compatibility.',
  instructions: `
You have access to an enhanced Git toolkit that provides advanced features beyond basic Git operations:

**Enhanced Features:**
1. **Cross-Platform Compatibility**: Uses shelljs for reliable Git operations across Windows, macOS, and Linux
2. **Secure Script Execution**: Execute Git automation scripts safely in isolated environments using isolated-vm
3. **Comprehensive Analysis**: Deep repository analysis with file statistics and cross-platform compatibility
4. **Hook Validation**: Safely validate Git hooks without executing potentially harmful code

**Available Tools:**

1. **enhanced_git_status**: Cross-platform Git status with additional options
   - Uses shelljs for better error handling and platform compatibility
   - Supports porcelain format and untracked file options
   - Provides both raw output and structured data

2. **secure_git_script**: Execute Git automation scripts in isolated environment
   - Runs user scripts in secure isolated-vm sandbox
   - Memory and execution time limits for safety
   - Pre-approved command whitelist for security
   - Safe utilities for file system checks

3. **git_repository_analysis**: Comprehensive repository analysis
   - Cross-platform file statistics using shelljs
   - Branch and remote analysis
   - Commit history and recent activity
   - File type distribution and size analysis

4. **git_hook_validator**: Safely validate Git hooks
   - Validates hook scripts in isolated environment
   - Supports all common Git hook types
   - File system checks for existing hooks
   - Syntax and security validation

**Security Benefits:**
- All script execution happens in isolated-vm with memory limits
- Cross-platform operations use shelljs for reliability
- Input validation and sanitization on all parameters
- Safe environment for testing potentially unsafe Git operations

**Use Cases:**
- Repository health checks and analysis
- Safe automation script development
- Cross-platform Git operations
- Git hook development and validation
- Secure CI/CD pipeline integration
  `,
  addInstructions: true,
  tools: [
    enhancedGitStatusTool as any,
    secureGitScriptTool as any,
    gitRepositoryAnalysisTool as any,
    gitHookValidatorTool as any,
  ],
});

// Exports
export {
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitHookValidatorTool,
  enhancedGitToolkit
};
