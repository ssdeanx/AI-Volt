/**
 * Supervisor Agent Configuration
 * Manages and coordinates specialized worker agents using delegation pattern
 * Generated on 2025-06-02
 */

import { Agent, LibSQLStorage, createHooks, type OnStartHookArgs, type OnEndHookArgs, type OnToolStartHookArgs, type OnToolEndHookArgs, type OnHandoffHookArgs, type Tool, createReasoningTools, type Toolkit} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { generateId } from "ai";
import { delegateTaskTool } from "../tools/delegateTask.js";
import { calculatorTool } from "../tools/calculator.js";
import { dateTimeTool } from "../tools/datetime.js";
import { systemInfoTool } from "../tools/systemInfo.js";
import { 
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
} from "../tools/gitTool.js";
import {
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitHookValidatorTool,
  enhancedGitToolkit
} from "../tools/enhancedGitTool.js";
import {
  secureCodeExecutorTool,
  fileSystemOperationsTool,
  codeAnalysisTool,
  projectStructureGeneratorTool,
  codingToolkit
} from "../tools/codingTools.js";
import {
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
  enhancedWebBrowserToolkit,
} from "../tools/enhancedWebBrowser.js";
import { 
  webSearchTool, 
  extractTextTool, 
  extractLinksTool, 
  extractMetadataTool, 
  extractTablesTool,
  extractJsonLdTool,
} from "../tools/webBrowser.js";
import { logger } from "../config/logger.js";
import { env } from "../config/environment.js";
import { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
/**
 * Supervisor agent instructions for coordinating worker agents
 */
const SUPERVISOR_INSTRUCTIONS = `You are AI-Volt Supervisor, a coordination agent that manages specialized worker agents in a multi-agent system.

CORE ROLE:
- Analyze user requests and determine the best approach
- Delegate specialized tasks to appropriate worker agents
- Coordinate multi-step workflows across different agent types
- Provide comprehensive responses by combining results from multiple agents

DELEGATION STRATEGY:
- For mathematical calculations or formulas → delegate to "calculator" agent
- For date/time operations, formatting, scheduling → delegate to "datetime" agent  
- For system monitoring, performance checks, diagnostics → delegate to "system_info" agent
- For simple file operations (reading/writing files) → use your own file system tools. For complex file tasks → delegate to "fileops" agent.
- For Git version control operations → delegate to "git" agent
- For GitHub specific operations (issues, PRs) → delegate to "github" agent
- For web searching and browsing → delegate to "browser" agent
- For general queries that don't need specialization → handle directly or delegate to "general" agent

WORKFLOW COORDINATION:
1. Analyze the user's request to identify required capabilities
2. Break down complex requests into smaller, specialized tasks
3. Use the delegate_task tool to assign tasks to appropriate worker agents
4. Monitor task completion and compile comprehensive responses
5. Provide clear, structured feedback to the user

COMMUNICATION STYLE:
- Professional and systematic in approach
- Clear about which agents are being utilized
- Transparent about delegation decisions
- Comprehensive in final responses
- Proactive in suggesting related capabilities

TASK PRIORITIZATION:
- Urgent: System issues, critical calculations
- High: Time-sensitive operations, important file operations
- Medium: Standard requests, routine calculations
- Low: Informational queries, background tasks

When you receive a request, first assess what type of specialized knowledge or tools are needed, then use the delegate_task tool to coordinate with the appropriate worker agents.`;

/**
 * Create supervisor-specific hooks for delegation monitoring
 */
const createSupervisorHooks = () => createHooks({
  onStart: async ({ agent, context }: OnStartHookArgs) => {
    const delegationId = `delegation-${generateId()}`;
    const workflowId = `workflow-${generateId()}`;
    
    context.userContext.set("delegationId", delegationId);
    context.userContext.set("workflowId", workflowId);
    context.userContext.set("delegationStart", Date.now());
    context.userContext.set("activeDelegations", new Set());
    
    logger.info(`[${agent.name}] Coordination session started`, {
      delegationId,
      workflowId,
      operationId: context.operationId,
      timestamp: new Date().toISOString()
    });
  },

  onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
    const delegationId = context.userContext.get("delegationId");
    const workflowId = context.userContext.get("workflowId");
    const startTime = context.userContext.get("delegationStart") as number;
    const activeDelegations = context.userContext.get("activeDelegations") as Set<string>;
    const duration = Date.now() - startTime;

    if (error) {
      logger.error(`[${agent.name}] Coordination session failed`, {
        delegationId,
        workflowId,
        operationId: context.operationId,
        duration,
        activeDelegations: Array.from(activeDelegations || []),
        error: error.message,
      });
    } else {
      const out: any = output;
      let outputPreview: string | undefined = undefined;
      if (typeof out === "string") {
        outputPreview = out.slice(0, 100);
      } else if (out && typeof out === "object") {
        if ("text" in out && typeof out.text === "string") {
          outputPreview = out.text.slice(0, 100);
        } else {
          try {
            outputPreview = JSON.stringify(out).slice(0, 100);
          } catch {}
        }
      }
      logger.info(`[${agent.name}] Coordination session completed`, {
        delegationId,
        workflowId,
        operationId: context.operationId,
        duration,
        totalDelegations: activeDelegations?.size || 0,
        delegatedTasks: Array.from(activeDelegations || []),
        outputPreview
      });
    }
  },

  onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
    const delegationId = context.userContext.get("delegationId");
    const workflowId = context.userContext.get("workflowId");
    
    if (tool.name === "delegate_task") {
      logger.info(`[${agent.name}] Task delegation initiated`, {
        delegationId,
        workflowId,
        operationId: context.operationId,
        toolName: tool.name,
        timestamp: new Date().toISOString()
      });
    }
  },

  onToolEnd: async ({ agent, tool, output, error, context }: OnToolEndHookArgs) => {
    const delegationId = context.userContext.get("delegationId");
    const workflowId = context.userContext.get("workflowId");
    const activeDelegations = context.userContext.get("activeDelegations") as Set<string> || new Set();

    if (tool.name === "delegate_task") {
      if (error) {
        logger.error(`[${agent.name}] Task delegation failed`, {
          delegationId,
          workflowId,
          operationId: context.operationId,
          toolName: tool.name,
          error: error.message,
        });
      } else {
        // Track successful delegation using standard ID generation
        const taskId = `task-${generateId()}`;
        activeDelegations.add(taskId);
        context.userContext.set("activeDelegations", activeDelegations);
        
        logger.info(`[${agent.name}] Task delegation successful`, {
          delegationId,
          workflowId,
          operationId: context.operationId,
          toolName: tool.name,
          taskId,
          resultPreview: typeof output === "string" ? output.substring(0, 100) : JSON.stringify(output).substring(0, 100)
        });
      }
    }
  },

  onHandoff: async (args: OnHandoffHookArgs) => {
    const { agent } = args;
    logger.info(`[${agent.name}] Task handoff received`, {
      targetAgent: agent.name,
      handoffType: "supervisor-coordination",
      timestamp: new Date().toISOString()
    });
  }
   
});
// Get toolkit, automatically adding instructions & examples to system prompt
/**
  * The default reasoning toolkit, which automatically adds instructions and examples
  * to the system prompt for enhanced reasoning capabilities.
  */
const reasoningToolkit: Toolkit = createReasoningTools(); // Uses defaults

/**
  * A reasoning toolkit configured for "think-only" mode.
  * This toolkit enables analysis but does not add instructions to the system prompt.
  */
const thinkOnlyToolkit: Toolkit = createReasoningTools({
  analyze: true,
  addInstructions: false,
});

/**
 * Create memory storage for supervisor coordination history
 */
const createSupervisorMemory = () => {
  return new LibSQLStorage({
    url: "file:./.voltagent/supervisor-memory.db", // Always use local SQLite for now
    tablePrefix: "supervisor_memory",
    storageLimit: 500, // Keep coordination history
    debug: env.NODE_ENV === "development"
  });
};

/**
 * Create and configure the supervisor agent
 */
export const createSupervisorAgent = async () => {
  logger.info("Creating AI-Volt supervisor agent", {
    model: "gemini-2.5-flash-preview-05-20",
    role: "supervisor",
    environment: env.NODE_ENV
  });

  try {
    const memoryStorage = createSupervisorMemory();
    const hooks = createSupervisorHooks();

    // Create supervisor with delegation tool and comprehensive tool access
    const supervisorAgent = new Agent({
      name: "AI-Volt-Supervisor",
      instructions: SUPERVISOR_INSTRUCTIONS,
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 512,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        delegateTaskTool,
        reasoningToolkit, // Add reasoning tools for complex analysis
        thinkOnlyToolkit, // Add "think-only" toolkit for analysis only
        // Include basic tools for supervisor to use directly when needed
        calculatorTool,
        dateTimeTool,
        systemInfoTool,
        // Web tools for direct supervisor use
        webSearchTool,
        extractTextTool,
        extractLinksTool,
        extractMetadataTool,
        extractTablesTool,
        extractJsonLdTool,
        // Enhanced web browser tools
        secureWebProcessorTool,
        webScrapingManagerTool,
        webContentValidatorTool,
        // Git tools
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
        // Enhanced Git tools
        enhancedGitStatusTool,
        secureGitScriptTool,
        gitRepositoryAnalysisTool,
        gitHookValidatorTool,
        // Coding tools
        secureCodeExecutorTool,
        fileSystemOperationsTool,
        codeAnalysisTool,
        projectStructureGeneratorTool,
      ],
      subAgents: [],
      memory: memoryStorage,
      hooks: hooks,
    });
    return supervisorAgent;
  } catch (error) {
    logger.error("Failed to create supervisor agent", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Create memory storage for worker agent operations
 */
const createWorkerMemory = (agentType: string) => {
  return new LibSQLStorage({
    url: `file:./.voltagent/${agentType}-memory.db`, // Always use local SQLite for now
    tablePrefix: `${agentType}_memory`,
    storageLimit: 200, // Moderate history for specialized tasks
    debug: env.NODE_ENV === "development"
  });
};

/**
 * Create worker-specific hooks for specialized agent monitoring
 */
const createWorkerHooks = (agentType: string) => createHooks({
  onStart: async ({ agent, context }: OnStartHookArgs) => {
    const taskId = `${agentType}-task-${generateId()}`;
    const sessionId = `${agentType}-${generateId()}`;
    
    context.userContext.set("taskId", taskId);
    context.userContext.set("sessionId", sessionId);
    context.userContext.set("agentType", agentType);
    context.userContext.set("startTime", Date.now());
    
    logger.info(`[${agent.name}] Specialized task started`, {
      taskId,
      sessionId,
      agentType,
      operationId: context.operationId,
      timestamp: new Date().toISOString()
    });
  },

  onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
    const taskId = context.userContext.get("taskId");
    const sessionId = context.userContext.get("sessionId");
    const agentType = context.userContext.get("agentType");
    const startTime = context.userContext.get("startTime") as number;
    const duration = Date.now() - startTime;

    if (error) {
      logger.error(`[${agent.name}] Specialized task failed`, {
        taskId,
        sessionId,
        agentType,
        operationId: context.operationId,
        duration,
        error: error.message,
      });
    } else {
      logger.info(`[${agent.name}] Specialized task completed`, {
        taskId,
        sessionId,
        agentType,
        operationId: context.operationId,
        duration,
        outputType: output && "text" in output ? "text" : output && "object" in output ? "object" : "unknown",
        success: true
      });
    }
  },

  onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
    const taskId = context.userContext.get("taskId");
    const sessionId = context.userContext.get("sessionId");
    const agentType = context.userContext.get("agentType");
    
    context.userContext.set(`toolStart-${tool.name}`, Date.now());
    
    logger.info(`[${agent.name}] Specialized tool execution started`, {
      taskId,
      sessionId,
      agentType,
      operationId: context.operationId,
      toolName: tool.name,
      specialization: agentType,
      timestamp: new Date().toISOString()
    });
  },

  onToolEnd: async ({ agent, tool, output, error, context }: OnToolEndHookArgs) => {
    const taskId = context.userContext.get("taskId");
    const sessionId = context.userContext.get("sessionId");
    const agentType = context.userContext.get("agentType");
    const toolStartTime = context.userContext.get(`toolStart-${tool.name}`) as number;
    const toolDuration = toolStartTime ? Date.now() - toolStartTime : 0;

    if (error) {
      logger.error(`[${agent.name}] Specialized tool execution failed`, {
        taskId,
        sessionId,
        agentType,
        operationId: context.operationId,
        toolName: tool.name,
        duration: toolDuration,
        error: error.message,
      });
    } else {
      logger.info(`[${agent.name}] Specialized tool execution completed`, {
        taskId,
        sessionId,
        agentType,
        operationId: context.operationId,
        toolName: tool.name,
        duration: toolDuration,
        outputPreview: typeof output === "string" ? output.substring(0, 100) : JSON.stringify(output).substring(0, 100)
      });
    }
  }
});

/**
 * Create specialized worker agents
 * @returns Collection of specialized worker agents for different task types
 */
export const createWorkerAgents = async () => {
  logger.info("Creating specialized worker agents");

  try {
    // Calculator worker agent
    const calculatorWorker = new Agent({
      name: "AI-Volt-Calculator",
      instructions: `You are a specialized calculator agent. Your primary role is to perform mathematical calculations with high precision and provide clear explanations. Always use the calculator tool for any mathematical operations, even simple arithmetic. Provide step-by-step explanations when helpful.`,
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 0,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [calculatorTool],
      memory: createWorkerMemory("calculator"),
      hooks: createWorkerHooks("calculator"),
    });

    // DateTime worker agent
    const dateTimeWorker = new Agent({
      name: "AI-Volt-DateTime", 
      instructions: `You are a specialized date and time agent. Handle all date/time operations including formatting, calculations, timezone conversions, and scheduling operations. Always use the datetime tool for time-related queries. Provide clear, formatted responses with proper timezone information.`,
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [dateTimeTool],
      memory: createWorkerMemory("datetime"),
      hooks: createWorkerHooks("datetime"),
    });

    // System Info worker agent
    const systemInfoWorker = new Agent({
      name: "AI-Volt-SystemInfo",
      instructions: `You are a specialized system monitoring agent. Provide comprehensive system information including memory usage, CPU details, network interfaces, and process information. Always use the system_info tool for system queries. Explain metrics clearly and provide context for system health.`,
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [systemInfoTool],
      memory: createWorkerMemory("systeminfo"),
      hooks: createWorkerHooks("systeminfo"),
    });

    // File Operations worker agent - uses the coding tools for file operations
    const fileOpsWorker = new Agent({
      name: "AI-Volt-FileOps",
      instructions: `You are a specialized file operations agent. Handle all file system operations safely and efficiently using the available file system tools. Always prioritize data safety and provide clear feedback on operations.`,
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [fileSystemOperationsTool, secureCodeExecutorTool],
      memory: createWorkerMemory("fileops"),
      hooks: createWorkerHooks("fileops"),
    });

    // Git worker agent - uses git tools
    const gitWorker = new Agent({
      name: "AI-Volt-Git",
      instructions: `You are a specialized Git operations agent. Handle all Git-related tasks such as status checks, committing, pushing, pulling, and repository analysis. Use both standard and enhanced Git tools for comprehensive version control operations.`,
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 0,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
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
        enhancedGitStatusTool,
        secureGitScriptTool,
        gitRepositoryAnalysisTool,
        gitHookValidatorTool,
      ],
      memory: createWorkerMemory("git"),
      hooks: createWorkerHooks("git"),
    });

    // Browser worker agent - uses web browser tools
    const browserWorker = new Agent({
      name: "AI-Volt-Browser",
      instructions: `You are a specialized web browsing and search agent. Handle web searches, content extraction, and web scraping tasks using the available web browser tools. Provide comprehensive and accurate web information.`,
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 256,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        webSearchTool,
        extractTextTool,
        extractLinksTool,
        extractMetadataTool,
        extractTablesTool,
        extractJsonLdTool,
        secureWebProcessorTool,
        webScrapingManagerTool,
        webContentValidatorTool,
      ],
      memory: createWorkerMemory("browser"),
      hooks: createWorkerHooks("browser"),
    });

    // Coding worker agent - uses coding tools
    const codingWorker = new Agent({
      name: "AI-Volt-Coding",
      instructions: `You are a specialized coding and development agent. Handle code execution, analysis, project structure generation, and file operations. Use secure coding tools and provide comprehensive development assistance.`,
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 2048,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        secureCodeExecutorTool,
        fileSystemOperationsTool,
        codeAnalysisTool,
        projectStructureGeneratorTool,
        reasoningToolkit, // Add reasoning tools for complex analysis
        thinkOnlyToolkit, // Add "think-only" toolkit for analysis only
        // Include basic coding tools for direct use
      ],
      memory: createWorkerMemory("coding"),
      hooks: createWorkerHooks("coding"),
    });

    const workers = {
      calculator: calculatorWorker,
      datetime: dateTimeWorker,
      systemInfo: systemInfoWorker,
      fileOps: fileOpsWorker,
      git: gitWorker,
      browser: browserWorker,
      coding: codingWorker,
    };

    logger.info("Specialized worker agents created successfully", {
      workerCount: Object.keys(workers).length,
      workers: Object.keys(workers),
      memoryProviders: "LibSQLStorage per agent",
      hooksEnabled: true,
      features: ["specialized-tools", "memory", "hooks", "performance-monitoring"]
    });

    return workers;
  } catch (error) {
    logger.error("Failed to create worker agents", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Helper function for filtering tools by name prefix
 * @param tools - Array of tools to filter
 * @param prefix - String or array of prefixes to match
 * @returns Filtered array of tools
 */
const filterToolsByNamePrefix = (tools: Tool[], prefix: string | string[]): Tool[] => {
  const prefixes = Array.isArray(prefix) ? prefix.map(p => p.toLowerCase()) : [prefix.toLowerCase()];
  return tools.filter(tool => 
    prefixes.some(p => tool.name.toLowerCase().startsWith(p))
  );
};
