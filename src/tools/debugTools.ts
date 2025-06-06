import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import * as shell from "shelljs";
import ivm from 'isolated-vm';
import { ESLint } from "eslint";
import path from "path";
import { Inspector } from "jsinspect-plus/lib/inspector.js";
import { Complexity } from "eslintcc";
import * as fs from 'fs/promises'; // Import fs.promises for file operations
import dayjs from 'dayjs'; // Import dayjs for date parsing and formatting
import * as child_process from "child_process";
import os from "os";

// Initialize shell with secure defaults
shell.config.silent = true; // Suppress output to console
shell.config.fatal = false; // Don't exit on command failure

/**
 * Tool to get basic information about running Node.js processes.
 */
export const getNodeProcessInfoTool = createTool({
  name: "get_node_process_info",
  description: "Retrieves basic information about running Node.js processes.",
  parameters: z.object({
    filterByPort: z.number().optional().describe("Optional: Filter Node.js processes listening on a specific port."),
    filterByName: z.string().optional().describe("Optional: Filter Node.js processes by a part of their command line name."),
  }),
  execute: async ({ filterByPort, filterByName }) => {
    logger.info("[getNodeProcessInfoTool] Getting Node.js process info", { filterByPort, filterByName });
    try {
      // On Windows, 'tasklist' can be used. On Linux/macOS, 'ps aux'.
      // For cross-platform, we'll try to grep for 'node' and parse.
      let command = 'ps aux | grep "node" | grep -v "grep"';
      if (shell.which('tasklist')) { // Check for Windows tasklist
        command = 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV';
      }

      const rawOutput = shell.exec(command, { silent: true }).stdout;
      const processes: any[] = [];

      if (shell.which('tasklist')) { // Windows parsing
        const lines = rawOutput.split('\\n').slice(1); // Skip header
        lines.forEach(line => {
          const parts = line.split('","');
          if (parts.length >= 6) {
            processes.push({
              imageName: parts[0].replace(/"/g, ''),
              pid: parseInt(parts[1]),
              sessionName: parts[2].replace(/"/g, ''),
              sessionNum: parseInt(parts[3]),
              memUsage: parts[4].replace(/"|,/g, '').trim(),
            });
          }
        });
      } else {
        const lines = rawOutput.split('\\n');
        lines.forEach(line => {
          const parts = line.trim().split(/\\s+/);
          if (parts.length > 10) { // Basic check for sufficient columns
            processes.push({
              user: parts[0],
              pid: parseInt(parts[1]),
              cpu: parseFloat(parts[2]),
              mem: parseFloat(parts[3]),
              command: parts.slice(10).join(' '),
            });
          }
        });
      }

      let filteredProcesses = processes;

      if (filterByPort) {
        // This is much harder without specific process inspection tools.
        // For now, we'll skip port filtering without better tools.
        logger.warn("[getNodeProcessInfoTool] Port filtering is not fully supported with basic process info tools.");
      }

      if (filterByName) {
        filteredProcesses = filteredProcesses.filter(p =>
          (p.command && p.command.includes(filterByName)) || (p.imageName && p.imageName.includes(filterByName))
        );
      }

      return {
        success: true,
        processes: filteredProcesses,
        message: `Found ${filteredProcesses.length} Node.js processes.`,
      };
    } catch (error) {
      logger.error("[getNodeProcessInfoTool] Failed to get Node.js process info", { error: (error as Error).message });
      throw new Error(`Failed to get Node.js process info: ${(error as Error).message}`);
    }
  }
});

/**
 * Tool to run JavaScript code in an isolated VM (sandbox).
 */
export const runIsolatedCodeTool = createTool({
  name: "run_isolated_code",
  description: "Executes a given JavaScript code snippet in a sandboxed environment using isolated-vm. Useful for safely running untrusted code or testing isolated logic.",
  parameters: z.object({
    code: z.string().describe("The JavaScript code snippet to execute."),
    timeout: z.number().optional().default(5000).describe("Optional: Maximum execution time in milliseconds (default: 5000)."),
  }),
  execute: async ({ code, timeout }) => {
    logger.info("[runIsolatedCodeTool] Executing code in isolated VM");
    const isolate = new ivm.Isolate({
      memoryLimit: 128, // 128 MB limit
    });
    const context = await isolate.createContext();
    const jail = context.global;

    // Grant access to console.log, etc.
    await jail.set("global", jail.derefInto());
    await jail.set(
      "log",
      new ivm.Reference(function (...args: any[]) {
        logger.info("[Isolated VM]", ...args);
      })
    );

    let result: any;
    const consoleOutput: string[] = [];
    const customConsole = {
      log: (...args: any[]) => {
        consoleOutput.push(args.map(a => String(a)).join(" "));
      },
      error: (...args: any[]) => {
        consoleOutput.push("ERROR: " + args.map(a => String(a)).join(" "));
      },
      // Add other console methods if needed
    };

    await context.global.set('console', new ivm.Reference(customConsole));

    const startTime = process.hrtime.bigint(); // Start high-resolution timer
    let heapStatistics: ivm.HeapStatistics | undefined;

    try {
      const script = await isolate.compileScript(code, { filename: 'user_code.js' });
      result = await script.run(context, {
        timeout: timeout,
        copy: true, // Copy the result back to the main isolate
      });

      const endTime = process.hrtime.bigint(); // End high-resolution timer
      const durationNs = endTime - startTime;
      const durationMs = Number(durationNs) / 1_000_000; // Convert nanoseconds to milliseconds

      heapStatistics = await isolate.getHeapStatistics(); // Get heap statistics after execution

      return {
        success: true,
        result: result,
        consoleOutput: consoleOutput,
        executionTimeMs: durationMs,
        heapStatistics: heapStatistics,
        message: "Code executed successfully in isolated VM with performance metrics.",
      };
    } catch (error) {
      logger.error("[runIsolatedCodeTool] Error executing code in isolated VM", { error: (error as Error).message });
      return {
        success: false,
        error: (error as Error).message,
        consoleOutput: consoleOutput,
        message: "Failed to execute code in isolated VM.",
      };
    } finally {
      isolate.dispose();
    }
  },
});

// Since direct heap/CPU profiling with pure JS is complex and often requires native modules
// or direct V8 inspector protocol interaction, we'll provide a tool that guides the user
// on how to use Node.js's built-in inspector for profiling.

/**
 * Tool to guide on using Node.js built-in profiler.
 */
export const guideNodeProfilerTool = createTool({
  name: "guide_node_profiler",
  description: "Provides instructions on how to use Node.js's built-in profiler and debugger for performance analysis.",
  parameters: z.object({}),
  execute: async () => {
    const instructions = `
To perform CPU or heap profiling, you can leverage Node.js's built-in Inspector.

**For CPU Profiling:**
1.  **Start your Node.js application with the --inspect flag and a profiler flag (e.g., --cpu-prof):**
    \`\`\`bash
    node --inspect --cpu-prof your_app.js
    \`\`\`
2.  **Connect a debugger:** Open Chrome and navigate to \`chrome://inspect\`. You should see your Node.js target. Click 'inspect'.
3.  **Start/Stop Profiling:** In the DevTools 'Performance' tab, you can start and stop CPU profiling.
4.  **Analyze:** The profile will be displayed, showing function call times and hot spots.

**For Heap Snapshots (Memory Profiling):**
1.  **Start your Node.js application with the --inspect flag:**
    \`\`\`bash
    node --inspect your_app.js
    \`\`\`
2.  **Connect a debugger:** Open Chrome and navigate to \`chrome://inspect\`. Click 'inspect' for your Node.js target.
3.  **Take a Heap Snapshot:** In the DevTools 'Memory' tab, select 'Heap snapshot' and click 'Take snapshot'.
4.  **Analyze:** The snapshot will show memory distribution, object retainers, and potential memory leaks.

**Important Notes:**
*   Always use a secure environment (e.g., local machine or SSH tunnel) when using --inspect, as it exposes a powerful debugging interface.
*   The output from these tools is typically viewed within Chrome DevTools and cannot be directly returned as a tool result.
*   For advanced scenarios, consider programmatic interaction with the Chrome DevTools Protocol, but this is complex and out of scope for a simple tool.
    `;
    return {
      success: true,
      instructions: instructions,
    };
  }
});

/**
 * Tool to run jsinspect-plus for code duplication detection.
 */
export const runJsInspectTool = createTool({
  name: "run_jsinspect",
  description: "Runs jsinspect-plus to detect duplicated code in specified files or directories.",
  parameters: z.object({
    paths: z.array(z.string()).describe("An array of file paths or directory paths to inspect (e.g., ['src/', 'test/file.js'])."),
    threshold: z.number().optional().default(30).describe("Optional: The minimum number of nodes for a match to be considered a duplicate (default: 30)."),
    // Add other options if needed, e.g., identifiers, literals
  }),
  execute: async ({ paths, threshold }) => {
    logger.info("[runJsInspectTool] Running jsinspect-plus programmatically", { paths, threshold });
    return new Promise((resolve, reject) => {
      const resolvedPaths = paths.map(p => path.resolve(p));
      const inspector = new Inspector(resolvedPaths, { threshold: threshold });
      const matches: any[] = [];
      let errorOccurred = false;

      inspector.on('start', () => {
        logger.debug("Jsinspect-plus: Analysis started.");
      });

      inspector.on('match', (match: any) => {
        matches.push(match.serialize()); // Serialize the match object for easier consumption
      });

      inspector.on('error', (error: Error) => {
        logger.error("Jsinspect-plus: Error during analysis", { error: error.message });
        errorOccurred = true;
        reject(new Error(`Jsinspect-plus analysis failed: ${error.message}`));
      });

      inspector.on('end', () => {
        logger.debug("Jsinspect-plus: Analysis ended.");
        if (!errorOccurred) {
          if (matches.length > 0) {
            resolve({
              success: false,
              message: `Jsinspect-plus found ${matches.length} code duplication(s).`,
              matches: matches,
            });
          } else {
            resolve({
              success: true,
              message: "Jsinspect-plus completed successfully. No code duplications found.",
              matches: [],
            });
          }
        }
      });

      try {
        inspector.run();
      } catch (error) {
        logger.error("[runJsInspectTool] Jsinspect-plus runtime error", { error: (error as Error).message });
        reject(new Error(`Jsinspect-plus runtime error: ${(error as Error).message}`));
      }
    });
  },
});

/**
 * Tool to run ESLint for code style and quality checks.
 */
export const runEslintTool = createTool({
  name: "run_eslint",
  description: "Runs ESLint on specified files or directories to check for code style and quality issues.",
  parameters: z.object({
    paths: z.array(z.string()).describe("An array of file paths or directory paths to lint (e.g., ['src/', 'test/file.ts'])."),
    fix: z.boolean().optional().default(false).describe("Optional: Automatically fix problems (default: false)."),
    configPath: z.string().optional().describe("Optional: Path to a custom ESLint configuration file (e.g., '.eslintrc.js')."),
  }),
  execute: async ({ paths, fix, configPath }) => {
    logger.info("[runEslintTool] Running ESLint", { paths, fix, configPath });
    try {
      const eslint = new ESLint({
        fix: fix,
        overrideConfigFile: configPath || undefined, // Use custom config if provided, otherwise ESLint will find it
      });

      const results = await eslint.lintFiles(paths);

      if (fix) {
        await ESLint.outputFixes(results);
      }

      const formatter = await eslint.loadFormatter("stylish");
      const resultText = await formatter.format(results);

      const errorResults = ESLint.getErrorResults(results);

      if (errorResults.length > 0) {
        return {
          success: false,
          message: `ESLint found ${errorResults.length} error(s).`,
          output: resultText,
          errors: errorResults,
        };
      } else if (results.some(r => r.warningCount > 0)) {
        return {
          success: true,
          message: "ESLint completed with warnings.",
          output: resultText,
          warnings: results.filter(r => r.warningCount > 0),
        };
      } else {
        return {
          success: true,
          message: "ESLint completed successfully. No errors or warnings found.",
          output: resultText,
        };
      }
    } catch (error) {
      logger.error("[runEslintTool] Failed to run ESLint programmatically", { error: (error as Error).message });
      throw new Error(`Failed to run ESLint: ${(error as Error).message}`);
    }
  },
});

/**
 * Tool to identify common security anti-patterns in code.
 */
export const identifySecurityAntiPatternsTool = createTool({
  name: "identify_security_anti_patterns",
  description: "Analyzes provided JavaScript/TypeScript code to identify common security anti-patterns and risky coding practices.",
  parameters: z.object({
    code: z.string().describe("The JavaScript/TypeScript code snippet to analyze."),
  }),
  execute: async ({ code }) => {
    logger.info("[identifySecurityAntiPatternsTool] Identifying security anti-patterns");
    const antiPatterns: string[] = [];

    // Regex patterns for common anti-patterns
    const patterns = {
      evalUsage: { regex: /\beval\s*\(/g, message: "Usage of 'eval()' function. Can be a security risk if used with untrusted input." },
      insecureRandom: { regex: /Math\.random\(\)/g, message: "Usage of 'Math.random()'. Not suitable for cryptographic purposes; consider 'crypto.randomBytes()'." },
      unvalidatedInput: { regex: /(req\.(query|body|params)|process\.env)\[['"]?\w+['"]?\]/g, message: "Potential unvalidated input from request query/body/params or environment variables. Always validate and sanitize untrusted input." },
      sqlInjection: { regex: /(SELECT|INSERT|UPDATE|DELETE)\s+.*\s+FROM\s+.*\s+WHERE\s+.*'[^']*'[^\s]*|(UNION\s+ALL\s+SELECT)/gi, message: "Potential SQL Injection pattern detected. Use parameterized queries or ORMs." },
      // Add more patterns as needed
    };

    for (const [key, { regex, message }] of Object.entries(patterns)) {
      let match;
      while ((match = regex.exec(code)) !== null) {
        antiPatterns.push(`Line ${code.substring(0, match.index).split('\n').length}: ${message} (Pattern: ${key}, Matched: '${match[0]}')`);
      }
    }

    if (antiPatterns.length > 0) {
      return {
        success: false,
        message: `Found ${antiPatterns.length} potential security anti-pattern(s).`, 
        antiPatterns: antiPatterns,
      };
    } else {
      return {
        success: true,
        message: "No common security anti-patterns detected.",
        antiPatterns: [],
      };
    }
  },
});

/**
 * Tool to analyze code complexity using eslintcc.
 */
export const analyzeCodeComplexityTool = createTool({
  name: "analyze_code_complexity",
  description: "Analyzes JavaScript/TypeScript code for complexity metrics (e.g., cyclomatic complexity, Halstead metrics) using eslintcc.",
  parameters: z.object({
    code: z.string().describe("The JavaScript/TypeScript code snippet to analyze."),
    // You can add more options if needed, like specific ESLint rules to apply or thresholds
  }),
  execute: async ({ code }) => {
    logger.info("[analyzeCodeComplexityTool] Analyzing code complexity");
    try {
      // eslintcc primarily works with files, so we'll write the code to a temp file
      // and then analyze it. This is not ideal for in-memory analysis but is a workaround
      // for eslintcc's file-based API. For production, consider a more direct AST analysis if available.
      const tempFilePath = path.join(process.cwd(), `temp_code_${Date.now()}.js`);
      await fs.writeFile(tempFilePath, code); // Use fs.promises.writeFile

      const complexity = new Complexity({
        rules: "logic", // Analyze logical complexity rules
        eslintOptions: {
          useEslintrc: false,
          overrideConfig: {
            parser: "@typescript-eslint/parser",
            plugins: ["@typescript-eslint"],
            extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
          },
        },
      });

      const report = await complexity.lintFiles([tempFilePath]);

      // Clean up the temporary file
      await fs.unlink(tempFilePath); // Use fs.promises.unlink

      if (report.files.length > 0 && report.files[0].messages.length > 0) {
        return {
          success: true,
          message: "Code complexity analysis completed with findings.",
          report: report.files[0].messages,
          averageComplexity: report.average, // Include average complexity metrics
        };
      } else {
        return {
          success: true,
          message: "Code complexity analysis completed. No significant complexity issues found.",
          report: [],
          averageComplexity: report.average, // Include average complexity metrics even if no issues
        };
      }
    } catch (error) {
      logger.error("[analyzeCodeComplexityTool] Failed to analyze code complexity", { error: (error as Error).message });
      throw new Error(`Failed to analyze code complexity: ${(error as Error).message}`);
    }
  },
});

/**
 * Tool to analyze log data for patterns, anomalies, and errors.
 */
export const analyzeLogPatternsTool = createTool({
  name: "analyze_log_patterns",
  description: "Analyzes provided log data to identify common patterns, anomalies, error messages, or specific keywords.",
  parameters: z.object({
    logData: z.string().describe("The log data (as a string) to analyze."),
    keywords: z.array(z.string()).optional().describe("Optional: An array of keywords or regex patterns to search for."),
    caseSensitive: z.boolean().optional().default(false).describe("Optional: Perform a case-sensitive search for keywords (default: false)."),
  }),
  execute: async ({ logData, keywords, caseSensitive }) => {
    logger.info("[analyzeLogPatternsTool] Analyzing log data for patterns");
    const results: string[] = [];
    const summary: { [key: string]: number } = {};

    const lines = logData.split('\n');

    // Common error patterns to look for if no keywords are provided
    const defaultErrorPatterns = [
      /error/i, /fail/i, /exception/i, /warn/i, /critical/i, /timeout/i, /unauthorized/i, /forbidden/i, /denied/i, /crash/i
    ];

    const patternsToSearch = keywords && keywords.length > 0
      ? keywords.map(kw => new RegExp(kw, caseSensitive ? undefined : 'i'))
      : defaultErrorPatterns;

    lines.forEach((line, index) => {
      patternsToSearch.forEach(pattern => {
        if (pattern.test(line)) {
          results.push(`Line ${index + 1}: ${line.trim()}`);
          const matchedKeyword = pattern.source; // Use source for keyword representation
          summary[matchedKeyword] = (summary[matchedKeyword] || 0) + 1;
        }
      });
    });

    if (results.length > 0) {
      return {
        success: true,
        message: `Found ${results.length} matching log entries.`, 
        matches: results,
        summary: summary,
      };
    } else {
      return {
        success: true,
        message: "No matching patterns or anomalies found in log data.",
        matches: [],
        summary: summary,
      };
    }
  },
});

/**
 * Tool to reconstruct a chronological timeline of agent execution from log data.
 */
export const getAgentExecutionTimelineTool = createTool({
  name: "get_agent_execution_timeline",
  description: "Parses log data to reconstruct a chronological timeline of events across different agents, showing their start, tool usage, and end times.",
  parameters: z.object({
    logData: z.string().describe("The log data (as a string) from all agents to analyze."),
  }),
  execute: async ({ logData }) => {
    logger.info("[getAgentExecutionTimelineTool] Reconstructing agent execution timeline");
    const timeline: any[] = [];

    const lines = logData.split('\n');
    const logEntries: any[] = [];

    // Define regex patterns for different log types
    // Supervisor logs: [timestamp] [agentName] message
    const supervisorLogPattern = /^\[([\d-]{10}T[\d:]{8}\.[\d]{3}Z)\] \[([\w-]+)\] (.+)$/;
    // Worker logs: [agentName] message (without timestamp at the beginning)
    const workerLogPattern = /^\[([\w-]+)\] (.+)$/;

    lines.forEach(line => {
      let timestamp: string = dayjs().toISOString(); // Default to current time
      let agentName: string | undefined;
      let eventType: string = "OTHER";
      let toolName: string | undefined;
      const rawLog: string = line.trim();

      let match: RegExpMatchArray | null;

      // Try to match supervisor log pattern first
      if ((match = line.match(supervisorLogPattern))) {
        timestamp = dayjs(match[1]).toISOString();
        agentName = match[2];
        const message = match[3];

        if (message.includes("coordination session started")) {
          eventType = "AGENT_START";
        } else if (message.includes("coordination session completed")) {
          eventType = "AGENT_END";
        } else if (message.includes("tool execution started")) {
          eventType = "TOOL_START";
          const toolMatch = message.match(/(\w+) tool execution started/);
          if (toolMatch) toolName = toolMatch[1];
        } else if (message.includes("tool execution completed")) {
          eventType = "TOOL_END";
          const toolMatch = message.match(/(\w+) tool execution completed/);
          if (toolMatch) toolName = toolMatch[1];
        }
      } else if ((match = line.match(workerLogPattern))) {
        // Try to match worker log pattern
        agentName = match[1];
        const message = match[2];

        if (message.includes("Specialized task started")) {
          eventType = "AGENT_START";
        } else if (message.includes("Specialized task completed")) {
          eventType = "AGENT_END";
        } else if (message.includes("Specialized tool execution started")) {
          eventType = "TOOL_START";
          const toolMatch = message.match(/Specialized tool execution started (\w+)/);
          if (toolMatch) toolName = toolMatch[1];
        } else if (message.includes("Specialized tool execution completed")) {
          eventType = "TOOL_END";
          const toolMatch = message.match(/Specialized tool execution completed (\w+)/);
          if (toolMatch) toolName = toolMatch[1];
        }
      } else {
        // If neither matches, it's an 'OTHER' log. Try to extract timestamp if present.
        const genericTimestampMatch = line.match(/^\[([\d-]{10}T[\d:]{8}\.[\d]{3}Z)\]/);
        if (genericTimestampMatch) {
          timestamp = dayjs(genericTimestampMatch[1]).toISOString();
        }
      }

      logEntries.push({
        timestamp,
        type: eventType,
        agent: agentName,
        toolName,
        rawLog,
      });
    });

    // Sort log entries chronologically
    logEntries.sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf());

    // Build the timeline
    const activeAgents: { [key: string]: { start: string, events: any[] } } = {};

    logEntries.forEach(entry => {
      if (entry.type === "AGENT_START") {
        activeAgents[entry.agent] = { start: entry.timestamp, events: [] };
        timeline.push({ type: "AGENT_START", agent: entry.agent, timestamp: entry.timestamp, rawLog: entry.rawLog });
      } else if (entry.type === "AGENT_END") {
        if (activeAgents[entry.agent]) {
          timeline.push({ type: "AGENT_END", agent: entry.agent, timestamp: entry.timestamp, rawLog: entry.rawLog });
          // Optionally, you could calculate duration and add a summary for the agent's activity
          delete activeAgents[entry.agent];
        }
      } else if (entry.type === "TOOL_START" && activeAgents[entry.agent]) {
        activeAgents[entry.agent].events.push({ type: "TOOL_START", toolName: entry.toolName, timestamp: entry.timestamp, rawLog: entry.rawLog });
      } else if (entry.type === "TOOL_END" && activeAgents[entry.agent]) {
        activeAgents[entry.agent].events.push({ type: "TOOL_END", toolName: entry.toolName, timestamp: entry.timestamp, rawLog: entry.rawLog });
      } else if (entry.type === "OTHER") {
        // Add other log entries to the timeline, associating with an active agent if possible
        // This part needs more sophisticated parsing if logs are not consistently structured.
        timeline.push(entry);
      }
    });

    return {
      success: true,
      message: "Agent execution timeline reconstructed successfully.",
      timeline: timeline,
      parsedLogEntries: logEntries, // Provide parsed raw entries for deeper inspection
    };
  },
});

/**
 * Process Management Tool
 * Provides capabilities to list, terminate, and get metrics for system processes.
 */
const processManagementSchema = z.object({
  operation: z.enum(["list_processes", "terminate_process", "get_process_metrics"]).describe("Process management operation to perform"),
  pid: z.number().optional().describe("Process ID for terminate or get_process_metrics operations"),
});

type ProcessManagementInput = z.infer<typeof processManagementSchema>;

export const processManagementTool = createTool({
  name: "process_management",
  description: "Manages system processes: list all processes, terminate a process by PID, or get CPU/memory metrics for a specific process.",
  parameters: processManagementSchema,
  execute: async ({ operation, pid }: ProcessManagementInput) => {
    logger.debug(`[processManagementTool] Executing operation: ${operation} with PID: ${pid || 'N/A'}`);

    let command: string;

    try {
      switch (operation) {
        case "list_processes":
          if (os.platform() === "win32") {
            command = "wmic process get ProcessId,Caption,WorkingSetSize,CommandLine /format:csv";
          } else {
            command = "ps aux";
          }
          return new Promise((resolve, reject) => {
            child_process.exec(command, (error, stdout, stderr) => {
              if (error) {
                logger.error(`[processManagementTool] List processes error: ${error.message}`);
                return reject(new Error(`Failed to list processes: ${stderr}`));
              }

              const processes: any[] = [];
              const lines = stdout.trim().split('\n');

              if (os.platform() === "win32") {
                // PID,Caption,WorkingSetSize,CommandLine
                lines.slice(1).forEach(line => {
                  const parts = line.split(',');
                  if (parts.length >= 4) {
                    processes.push({
                      pid: parseInt(parts[3]), // PID
                      name: parts[1], // Caption
                      memoryUsage: parseInt(parts[4]), // WorkingSetSize (bytes)
                      command: parts[2], // CommandLine
                    });
                  }
                });
              } else {
                lines.slice(1).forEach(line => {
                  const parts = line.trim().split(/\s+/);
                  if (parts.length > 10) {
                    processes.push({
                      user: parts[0],
                      pid: parseInt(parts[1]),
                      cpu: parseFloat(parts[2]),
                      memory: parseFloat(parts[3]),
                      command: parts.slice(10).join(' '),
                    });
                  }
                });
              }
              resolve({ success: true, processes });
            });
          });

        case "terminate_process":
          if (pid === undefined) throw new Error("PID is required to terminate a process");
          if (os.platform() === "win32") {
            command = `taskkill /PID ${pid} /F`;
          } else {
            command = `kill ${pid}`; // -9 for forceful kill
          }
          return new Promise((resolve, reject) => {
            child_process.exec(command, (error, stdout, stderr) => {
              if (error) {
                logger.error(`[processManagementTool] Terminate process error: ${error.message}`);
                return reject(new Error(`Failed to terminate process ${pid}: ${stderr || error.message}`));
              }
              resolve({ success: true, message: `Process ${pid} terminated successfully.` });
            });
          });

        case "get_process_metrics":
          if (pid === undefined) throw new Error("PID is required to get process metrics");
          // This is complex and OS-dependent. For simplicity, we'll try to parse `ps` output.
          if (os.platform() === "win32") {
            command = `wmic path Win32_PerfRawData_PerfProc_Process where IDProcess=${pid} get PercentProcessorTime,WorkingSet /value`;
          } else {
            command = `ps -p ${pid} -o %cpu,%mem,rss,vsz,comm`;
          }
          return new Promise((resolve, reject) => {
            child_process.exec(command, (error, stdout, stderr) => {
              if (error) {
                logger.error(`[processManagementTool] Get metrics error: ${error.message}`);
                return reject(new Error(`Failed to get metrics for process ${pid}: ${stderr || error.message}`));
              }

              let metrics: any = {};
              if (os.platform() === "win32") {
                const lines = stdout.trim().split('\n').filter(line => line.includes('='));
                lines.forEach(line => {
                  const [key, value] = line.split('=');
                  if (key === "PercentProcessorTime") metrics.cpuUsage = parseFloat(value);
                  if (key === "WorkingSet") metrics.memoryUsage = parseInt(value);
                });
              } else {
                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                  const parts = lines[1].trim().split(/\s+/);
                  metrics = {
                    cpuUsage: parseFloat(parts[0]),
                    memoryUsagePercent: parseFloat(parts[1]),
                    rss: parseInt(parts[2]), // Resident Set Size (KB)
                    vsz: parseInt(parts[3]), // Virtual Size (KB)
                    command: parts.slice(4).join(' '),
                  };
                }
              }
              resolve({ success: true, pid, metrics });
            });
          });

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      logger.error(`[processManagementTool] Operation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Process management operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
}); 