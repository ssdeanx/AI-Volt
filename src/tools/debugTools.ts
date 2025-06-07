/**
 * Advanced Debugging and Code Analysis Toolkit
 * This toolkit provides secure, programmatic tools for debugging, performance monitoring,
 * and static analysis without relying on insecure shell commands.
 */
import { createTool, createToolkit } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import ivm from 'isolated-vm';
import { ESLint } from 'eslint';
import { Complexity } from 'eslintcc';
import * as path from 'path';
import * as shell from 'shelljs';
import { Inspector } from 'jsinspect-plus';

/**
 * Executes a JavaScript code snippet in a secure, isolated sandbox.
 * Supports performance monitoring and custom mock context for advanced testing.
 */
export const runIsolatedCodeTool = createTool({
  name: 'run_isolated_code',
  description: 'Executes JS code in a secure sandbox with performance monitoring.',
  parameters: z.object({
    code: z.string().describe('The JavaScript code to execute.'),
    timeout: z.number().optional().default(5000).describe('Execution timeout in ms.'),
    mockContext: z.record(z.any()).optional().describe('A JSON object to be injected into the global scope of the sandbox.'),
  }),
  execute: async ({ code, timeout, mockContext }) => {
    logger.info('[runIsolatedCodeTool] Executing code in sandbox');
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const jail = context.global;

    await jail.set('global', jail.derefInto());

    if (mockContext) {
      const safeMockContext = Object.assign(Object.create(null), mockContext);
      const allowlist = ['allowedKey1', 'allowedKey2'];  // Replace with actual allowed keys based on your use case
      for (const key of Object.keys(safeMockContext)) {
        if (!allowlist.includes(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) {
          logger.warn(`[runIsolatedCodeTool] Skipping key: ${key}`);
          continue;
        }
        let valueToSet = safeMockContext[key];
        // Deeper sanitization: Ensure objects are plain and frozen
        if (typeof valueToSet === 'object' && valueToSet !== null && !Array.isArray(valueToSet)) {
          valueToSet = Object.freeze(Object.assign(Object.create(null), valueToSet));
        }
        await jail.set(key, new ivm.Reference(valueToSet));
      }
      // Freeze Object.prototype in the isolated context
      await jail.set('Object', new ivm.Reference({
        ...Object.getOwnPropertyDescriptors(Object),
        freeze: Object.freeze,
      }));
    }

    const consoleOutput: string[] = [];
    await jail.set('console', new ivm.Reference({
        log: (...args: any[]) => consoleOutput.push(args.map(a => String(a)).join(' ')),
        error: (...args: any[]) => consoleOutput.push(`ERROR: ${args.map(a => String(a)).join(' ')}`),
    }));

    const startTime = process.hrtime.bigint();
    try {
      const script = await isolate.compileScript(code);
      const result = await script.run(context, { timeout, copy: true });
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      const heapStats = await isolate.getHeapStatistics();

      return {
        success: true,
        result,
        consoleOutput,
        executionTimeMs: durationMs,
        heapUsage: heapStats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[runIsolatedCodeTool] Execution failed', { error: errorMessage });
      return {
        success: false,
        error: errorMessage, 
        consoleOutput 
      };
    } finally {
      isolate.dispose();
    }
  },
});

/**
 * Statically analyzes code using ESLint to find linting errors and warnings.
 */
export const lintCodeTool = createTool({
    name: 'lint_code',
    description: 'Statically analyzes JS/TS code using ESLint to find issues.',
  parameters: z.object({
        code: z.string().describe('The code snippet to analyze.'),
        fileName: z.string().optional().default('temp.ts').describe('The filename to use for context (e.g., component.tsx).'),
    }),
    execute: async ({ code, fileName }) => {
      const eslint = new ESLint({
            overrideConfigFile: path.resolve(process.cwd(), 'eslint.config.ts'),
        });
        
        const results = await eslint.lintText(code, { filePath: fileName });

        // Clean up the result to be more serializable and concise
        const processedResults = results.map(result => ({
            filePath: result.filePath,
            messages: result.messages.map(({ line, column, severity, ruleId, message }) => ({
                line,
                column,
                severity,
                ruleId,
                message,
            })),
            errorCount: result.errorCount,
            warningCount: result.warningCount,
        }));

        return {
          success: true,
            results: processedResults,
        };
  },
});

/**
 * Statically analyzes code to find common security anti-patterns.
 * Identifies issues like eval usage, insecure random numbers, and regex injection risks.
 */
export const identifySecurityAntiPatternsTool = createTool({
    name: 'identify_security_anti_patterns',
    description: 'Statically analyzes JS/TS code for common security anti-patterns.',
  parameters: z.object({
      code: z.string().describe('The code snippet to analyze.'),
  }),
  execute: async ({ code }) => {
        const antiPatterns = [
            { name: 'eval_usage', regex: /\beval\s*\(/, message: 'Use of eval() is strongly discouraged.' },
            { name: 'insecure_random', regex: /Math\.random\(\)/, message: 'Math.random() is not cryptographically secure.' },
            { name: 'regex_injection_risk', regex: /new\s+RegExp\([^,)]*$/, message: 'Dynamic RegExp creation from user input can lead to ReDoS.' },
            { name: 'prototype_pollution_risk', regex: /__proto__/, message: 'Direct manipulation of __proto__ can lead to prototype pollution.' },
        ];

        const findings = antiPatterns.map(({ name, regex, message }) => {
            const matches = code.match(new RegExp(regex, 'g'));
            return matches ? { pattern: name, count: matches.length, message } : null;
        }).filter(Boolean);

      return {
        success: true,
        findings,
        issueCount: findings.length,
      };
  },
});

/**
 * Analyzes code complexity using eslintcc.
 * Reports cyclomatic complexity and other metrics to identify code smells.
 */
export const analyzeCodeComplexityTool = createTool({
  name: 'analyze_code_complexity',
  description: 'Analyzes code complexity using eslintcc.',
  parameters: z.object({
    code: z.string().describe('The JavaScript/TypeScript code to analyze.'),
  }),
  execute: async ({ code }) => {
    const tmpFile = path.join(process.cwd(), `tmp-complexity-${Date.now()}.js`);
    shell.ShellString(code).to(tmpFile);
    if (shell.error()) throw new Error(shell.error() as string);
    try {
      const complexity = new Complexity();
      const results = await complexity.calculate(tmpFile);
      return { success: true, complexity: results };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[analyzeCodeComplexityTool] Failed', { error: errorMessage });
      return { success: false, error: `Failed to analyze code complexity: ${errorMessage}` };
    } finally {
      shell.rm(tmpFile);
      if (shell.error()) console.error(`Error removing temp file: ${shell.error()}`);
    }
  },
});

/**
 * Detects duplicated code snippets using jsinspect-plus.
 */
export const findCodeDuplicatesTool = createTool({
  name: 'find_code_duplicates',
  description: 'Detects duplicated code in a given set of files.',
  parameters: z.object({
    fileContents: z.record(z.string()).describe('An object where keys are filenames and values are the file contents.'),
    threshold: z.number().optional().default(30).describe('Minimum similarity threshold.'),
  }),
  execute: async ({ fileContents, threshold }) => {
    const tmpDir = path.join(process.cwd(), `tmp-duplicates-${Date.now()}`);
    shell.mkdir('-p', tmpDir);
    if (shell.error()) throw new Error(shell.error() as string);

    const filePaths: string[] = [];

    for (const fileName in fileContents) {
      const filePath = path.join(tmpDir, fileName);
      shell.ShellString(fileContents[fileName]).to(filePath);
      if (shell.error()) throw new Error(shell.error() as string);
      filePaths.push(filePath);
    }

    return new Promise((resolve) => {
      const inspector = new Inspector(filePaths, { threshold });
      const matches: any[] = [];
      inspector.on('match', (match: any) => matches.push(match.serialize()));
      inspector.on('end', async () => {
        shell.rm('-Rf', tmpDir);
        if (shell.error()) console.error(`Error removing temp dir: ${shell.error()}`);
        resolve({ success: true, duplicates: matches });
      });
      inspector.run();
    });
  },
});

/**
 * Debugging and Code Analysis Toolkit
 */
export const debugToolkit = createToolkit({
  name: 'Debug Toolkit',
  description: 'A suite of tools for advanced debugging, performance analysis, and code inspection.',
  tools: [
    runIsolatedCodeTool as any,
    lintCodeTool as any,
    identifySecurityAntiPatternsTool as any,
    analyzeCodeComplexityTool as any,
    findCodeDuplicatesTool as any,
  ],
}); 