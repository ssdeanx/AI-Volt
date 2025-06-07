/* eslint-disable sonarjs/cognitive-complexity */
/**
 * Supervisor Agent Configuration
 * Manages and coordinates specialized worker agents using delegation pattern
 * Generated on 2025-06-02
 */

import { Agent, LibSQLStorage, createHooks, type OnStartHookArgs, type OnEndHookArgs, type OnToolStartHookArgs, type OnToolEndHookArgs, type OnHandoffHookArgs, createReasoningTools, type Toolkit } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { generateId } from "ai";
import { calculatorTool, statisticsAnalysisTool } from "../tools/calculator.js";
import { dateTimeTool } from "../tools/datetime.js";
import { systemInfoTool } from "../tools/systemInfo.js";
import {
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitCloneTool,
  gitAddTool,
  gitCommitTool,
  gitPushTool,
  gitFetchTool, 
  gitPullTool,
  gitMergeTool,
  gitBranchTool,
} from "../tools/enhancedGitTool.js";
import {
  sandboxedCodeExecutorTool,
  readFileTool,
  writeFileTool,
  deleteFileTool,
  listDirectoryTool,
  createDirectoryTool,
  statTool,
  moveTool,
  copyTool,
  replaceLineInFileTool,
} from "../tools/codingTools.js";
import {
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
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
import { createSupervisorRetriever, type SupervisorRetriever } from "./supervisorRetriever.js";
import { supervisorPrompts } from "../prompts/index.js";
import { workerPrompts } from "../prompts/index.js";
import {
  navigationTool,
  screenshotTool,
  interactionTools,
  responseTools,
  outputTools,
  visiblePageTools,
} from "../tools/playwright/index.js";
import {
  fetchRepoStarsTool,
  fetchRepoContributorsTool,
  getFileContentTool,
  listRepositoryContentsTool,
  listPullRequestsTool,
  getPullRequestDetailsTool,
  createPullRequestTool,
  mergePullRequestTool,
  commentOnPullRequestTool,
  listPullRequestFilesTool,
  createRepositoryTool,
  deleteRepositoryTool,
  listRepositoryHooksTool,
  createRepositoryHookTool,
  getUserProfileTool,
  listOrgMembersTool,
} from "../tools/githubTool.js";
import {
    runIsolatedCodeTool,
    lintCodeTool,
    identifySecurityAntiPatternsTool,
    analyzeCodeComplexityTool,
    findCodeDuplicatesTool
} from "../tools/debugTools.js";
import { ingestDocumentTool, queryKnowledgeBaseTool, summarizeDocumentTool, listKnowledgeBaseDocumentsTool } from "../tools/knowledgeBaseTools.js";
import { readDataFromFileTool, analyzeCsvDataTool, writeDataToFileTool } from "../tools/dataTools.js";
import { 
  deployServiceTool,
  listContainersTool,
  stopContainerTool,
  removeContainerTool,
  getContainerLogsTool,
  inspectContainerTool,
  listImagesTool,
  buildImageTool,
} from "../tools/cloudTools.js";
import { promptManagerToolkit } from "../tools/index.js";
/**
 * Context symbols for type-safe userContext keys
 * Following VoltAgent best practices for avoiding key collisions
 */
const CONTEXT_KEYS = {
  // Supervisor-level context
  SESSION_ID: Symbol("aiVoltSessionId"),
  DELEGATION_ID: Symbol("delegationId"), 
  WORKFLOW_ID: Symbol("workflowId"),
  DELEGATION_START: Symbol("delegationStart"),
  ACTIVE_DELEGATIONS: Symbol("activeDelegations"),
  DELEGATION_COUNT: Symbol("delegationCount"),
  CURRENT_DELEGATION: Symbol("currentDelegation"),
  
  // Retriever context
  RETRIEVER_ENABLED: Symbol("retrieverEnabled"),
  CONTEXT_RETRIEVALS: Symbol("contextRetrievals"),
  
  // Worker context
  TASK_ID: Symbol("taskId"),
  SESSION_ID_WORKER: Symbol("sessionId"),
  AGENT_TYPE: Symbol("agentType"),
  START_TIME: Symbol("startTime"),
  
  // Coordination context
  PARENT_SESSION_ID: Symbol("parentSessionId"),
  DELEGATION_CHAIN: Symbol("delegationChain"),
  COORDINATOR_AGENT: Symbol("coordinatorAgent"),
  RETRIEVAL_COUNT: Symbol("retrievalCount"),
  RETRIEVAL_HISTORY: Symbol("retrievalHistory"),
} as const;

/**
 * Create supervisor-specific hooks for delegation monitoring
 * Enhanced with VoltAgent userContext best practices
 */
const createSupervisorHooks = () => createHooks({
  onStart: async ({ agent, context }: OnStartHookArgs) => {
    // Generate unique identifiers for this coordination session
    const sessionId = `ai-volt-session-${generateId()}`;
    const delegationId = `delegation-${generateId()}`;
    const workflowId = `workflow-${generateId()}`;
    
    // Initialize context using symbols for type safety
    context.userContext.set(CONTEXT_KEYS.SESSION_ID, sessionId);
    context.userContext.set(CONTEXT_KEYS.DELEGATION_ID, delegationId);
    context.userContext.set(CONTEXT_KEYS.WORKFLOW_ID, workflowId);
    context.userContext.set(CONTEXT_KEYS.DELEGATION_START, Date.now());
    context.userContext.set(CONTEXT_KEYS.ACTIVE_DELEGATIONS, new Map<string, {
      agentType: string;
      taskId: string;
      startTime: number;
      description: string;
    }>());
    context.userContext.set(CONTEXT_KEYS.DELEGATION_COUNT, 0);
    context.userContext.set(CONTEXT_KEYS.COORDINATOR_AGENT, agent.name);
    context.userContext.set(CONTEXT_KEYS.RETRIEVAL_COUNT, 0);
    context.userContext.set(CONTEXT_KEYS.RETRIEVAL_HISTORY, [] as Array<{ query: string; timestamp: number }>);
    
    logger.info(`[${agent.name}] AI-Volt coordination session started`, {
      sessionId,
      delegationId,
      workflowId,
      operationId: context.operationId,
      coordinator: agent.name,
      timestamp: new Date().toISOString()
    });
  },

  onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
    logSessionSummary({ agent, output, error, context });
  },

  onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
    logger.debug(`[${agent.name}] Entering onToolStart`, { toolName: tool.name, operationId: context.operationId }); // <-- ADD THIS LINE
    const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
    const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
    const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
    
    // Track delegation attempts specifically
    if (tool.name === "delegate_task") {
      const delegationCount = (context.userContext.get(CONTEXT_KEYS.DELEGATION_COUNT) as number) || 0;
      const newCount = delegationCount + 1;
      const delegationStartTime = Date.now();
      
      context.userContext.set(CONTEXT_KEYS.DELEGATION_COUNT, newCount);
      context.userContext.set(CONTEXT_KEYS.CURRENT_DELEGATION, delegationStartTime);
      
      logger.info(`[${agent.name}] Task delegation initiated`, {
        sessionId,
        delegationId,
        workflowId,
        operationId: context.operationId,
        toolName: tool.name,
        delegationSequence: newCount,
        timestamp: new Date().toISOString()
      });
    } else {
      // Track other tool usage by supervisor
      logger.debug(`[${agent.name}] Supervisor tool execution started`, {
        sessionId,
        delegationId,
        workflowId,
        operationId: context.operationId,
        toolName: tool.name,
        timestamp: new Date().toISOString()
      });
    }

    if (tool.name === "supervisor_search") {
      const count = (context.userContext.get(CONTEXT_KEYS.RETRIEVAL_COUNT) as number) + 1;
      context.userContext.set(CONTEXT_KEYS.RETRIEVAL_COUNT, count);
      const history = context.userContext.get(CONTEXT_KEYS.RETRIEVAL_HISTORY) as any[];
      // context.operationId is a string, not an object with 'input'
      history.push({ query: context.operationId as string, timestamp: Date.now() });
      context.userContext.set(CONTEXT_KEYS.RETRIEVAL_HISTORY, history);
    }
  },

  onToolEnd: async ({ agent, tool, output, error, context }: OnToolEndHookArgs) => {
    if (tool.name === 'delegate_task') {
      handleDelegationEnd({ agent, tool, output, error, context });
    } else {
      // Existing logic
      if (error) {
        logger.warn(`[${agent.name}] Supervisor tool failed`, {
          sessionId: context.userContext.get(CONTEXT_KEYS.SESSION_ID),
          delegationId: context.userContext.get(CONTEXT_KEYS.DELEGATION_ID),
          workflowId: context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID),
          operationId: context.operationId,
          toolName: tool.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    let outputType = 'unknown';
    if (typeof output === 'object' && output !== null) {
        if ('text' in output) {
            outputType = 'text';
        } else if ('object' in output) {
            outputType = 'object';
        }
    }
    logger.debug(`Output type: ${outputType}`);
  },

  onHandoff: async (args: OnHandoffHookArgs) => {
    // The exact shape of OnHandoffHookArgs seems to be causing issues.
    // Let's log the whole object to be safe and inspect its structure.
    logger.info(`[Agent] Task received via handoff`, {
      handoffArgs: JSON.stringify(args, null, 2),
      timestamp: new Date().toISOString(),
    });
  }
   
});

/**
 * Create enhanced supervisor hooks that integrate with the retriever
 */
const createSupervisorHooksWithRetriever = (baseHooks: ReturnType<typeof createHooks>, retriever: SupervisorRetriever) => {
  return createHooks({
    onStart: async ({ agent, context }: OnStartHookArgs) => {
      // Call base hooks first
      await baseHooks.onStart?.({ agent, context });
      
      // Initialize retriever context tracking
      context.userContext.set("retrieverEnabled", true);
      context.userContext.set("contextRetrievals", 0);
    },

    onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
      // Call base hooks first
      await baseHooks.onEnd?.({ agent, output, error, context });
      
      // Add workflow context to retriever if successful
      if (!error && output) {
        const workflowId = context.userContext.get("workflowId") as string;
        const activeDelegations = context.userContext.get("activeDelegations") as Set<string>;
        
        if (workflowId && activeDelegations && activeDelegations.size > 0) {
          retriever.addWorkflowContext({
            description: "Multi-agent coordination workflow",
            steps: Array.from(activeDelegations),
            workflowId,
            status: 'completed',
            agents: Array.from(activeDelegations).map(taskId => taskId.split('-')[0])
          });
        }
      }
    },

    onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
      // Call base hooks first
      await baseHooks.onToolStart?.({ agent, tool, context });
    },

    onToolEnd: async ({ agent, tool, output, error, context }: OnToolEndHookArgs) => {
      // Call base hooks first
      await baseHooks.onToolEnd?.({ agent, tool, output, error, context });
      
      // Track delegation results in retriever
      if (tool.name === "delegate_task") {
        const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID) as string;
        const delegationStartTimeForRetriever = context.userContext.get(CONTEXT_KEYS.CURRENT_DELEGATION) as number || Date.now();
        const currentDelegationIdForRetriever = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID) as string;

        try {
          let resultStrForRetriever = "[No output]";
          if (typeof output !== 'undefined' && output !== null) {
            if (typeof output === 'string') {
              resultStrForRetriever = output;
            } else {
              try {
                let meaningfulOutput: any = output; // Ensure meaningfulOutput can be reassigned
                if (typeof output === 'object') {
                    if ('value' in output && typeof (output as any).value === 'string') {
                        meaningfulOutput = (output as any).value;
                    } else if ('text' in output && typeof (output as any).text === 'string') {
                        meaningfulOutput = (output as any).text;
                    } else if (typeof (output as any).type === 'string' && (output as any).type === 'tool-result' &&
                               (output as any).toolResult && typeof (output as any).toolResult.result !== 'undefined') {
                        meaningfulOutput = (output as any).toolResult.result;
                    }
                }
                resultStrForRetriever = JSON.stringify(meaningfulOutput);
              } catch (stringifyError) {
                logger.warn(`[${agent.name}] Failed to stringify delegation output for retriever context`, {
                  sessionId: context.userContext.get(CONTEXT_KEYS.SESSION_ID),
                  delegationId: currentDelegationIdForRetriever,
                  toolName: tool.name,
                  error: stringifyError instanceof Error ? stringifyError.message : String(stringifyError)
                });
                resultStrForRetriever = "[Unserializable Object]";
              }
            }
          }

          const success = !error;
          let agentType = "unknown";
          const agentTypes = ['calculator', 'datetime', 'system_info', 'fileops', 'git', 'browser', 'coding', 'promptManager', 'debug', 'research', 'knowledgeBase', 'data', 'cloud'];
          for (const type of agentTypes) {
            if (resultStrForRetriever.toLowerCase().includes(type)) {
              agentType = type;
              break;
            }
          }
          
          retriever.addDelegationContext({
            agentType,
            task: "Delegated task via delegate_task tool",
            result: resultStrForRetriever.substring(0, 500),
            taskId: currentDelegationIdForRetriever, 
            workflowId,
            success,
            duration: Date.now() - delegationStartTimeForRetriever
          });
          
          logger.debug("Delegation result added to retriever", {
            agentType,
            success,
            taskId: currentDelegationIdForRetriever,
            workflowId
          });
          
        } catch (retrievalError) {
          logger.warn("Failed to add delegation context to retriever", {
            error: retrievalError instanceof Error ? retrievalError.message : String(retrievalError),
            toolName: tool.name,
            sessionId: context.userContext.get(CONTEXT_KEYS.SESSION_ID),
            delegationId: currentDelegationIdForRetriever,
          });
        }
      }
    },

    onHandoff: async (args: OnHandoffHookArgs) => {
      // Call base hooks first
      await baseHooks.onHandoff?.(args);
      
      // Enhanced handoff tracking
      logger.debug("Enhanced supervisor handoff", {
        timestamp: new Date().toISOString(),
        retrieverEnabled: true
      });
    }
  });
};
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
  think: true,
  addFewShot: false,
  fewShotExamples: "{Example: 'this is an example of a few shot example', Example2: 'this is another example of a few shot example'}",
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
  logger.info("Creating Supervisor agent", {
    model: "gemini-2.5-flash-preview-05-20",
    role: "supervisor",
    environment: env.NODE_ENV
  });

  try {
    const memoryStorage = createSupervisorMemory();
    const hooks = createSupervisorHooks();

    // 1) Create retriever with both storeMaxSize and searchCacheSize + tool metadata
    const retriever = createSupervisorRetriever({
      maxResults: 15,
      defaultMinScore: 1,
      storeMaxSize: 1000,                // keep up to 1000 context entries
      searchCacheSize: 200,              // cache last 200 distinct queries
      toolName: "supervisor_search",     // tool name exposed to LLM
      toolDescription: "Fetch recent supervisor context with in-memory LRU caching",
    });

    // Create worker agents first
    const workers = await createWorkerAgents();

    // Create enhanced hooks that integrate with retriever
    const enhancedHooks = createSupervisorHooksWithRetriever(hooks, retriever);

    // 2) Build the Agent, adding retriever.tool instead of direct retriever:
      const supervisorAgent = new Agent({
      name: "SupervisorAgent",
      instructions: supervisorPrompts.standard(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 512,
            includeThoughts: true,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
      tools: [
        reasoningToolkit,
        calculatorTool,
        dateTimeTool,
        systemInfoTool,
        webSearchTool,
//        retriever.tool,                // <— now a selectable tool with caching
        fetchRepoStarsTool,
        fetchRepoContributorsTool,
      ],
      subAgents: [
        workers.calculator,
        workers.datetime,
        workers.systemInfo,
        workers.fileOps,
        workers.git,
        workers.browser,
        workers.coding,
        workers.promptManager,
        workers.debug,
        workers.research,
        workers.knowledgeBase,
        workers.data,
        workers.cloud,
      ],
      memory: memoryStorage,
      hooks: enhancedHooks,
    });
    
    logger.info("Supervisor agent created successfully", {
      agentName: supervisorAgent.name,
      subAgentCount: Object.keys(workers).length,
      retrieverEnabled: true,
      memoryEnabled: true,
      hooksEnabled: true,
      features: ["delegation", "retrieval", "memory", "monitoring"]
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
        error: error instanceof Error ? error.message : String(error),
      });
    } else {
      let outputType = "unknown";
      if (output && "text" in output) {
        outputType = "text";
      } else if (output && "object" in output) {
        outputType = "object";
      }
      
      logger.info(`[${agent.name}] Specialized task completed`, {
        taskId,
        sessionId,
        agentType,
        operationId: context.operationId,
        duration,
        outputType,
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
        error: error instanceof Error ? error.message : String(error),
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
  },
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
      name: "CalculatorAgent",
      purpose: "Performs mathematical calculations, formulas, and statistical analysis.",
      instructions: workerPrompts.generate("calculator")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 0,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [calculatorTool, statisticsAnalysisTool],
      memory: createWorkerMemory("calculator"),
      hooks: createWorkerHooks("calculator"),
    });

    // DateTime worker agent
    const dateTimeWorker = new Agent({
      name: "DateTimeAgent", 
      purpose: "Handles date/time operations, formatting, scheduling, and timezone conversions.",
      instructions: workerPrompts.generate("datetime")(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [dateTimeTool],
      memory: createWorkerMemory("datetime"),
      hooks: createWorkerHooks("datetime"),
    });

    // System Info worker agent
    const systemInfoWorker = new Agent({
      name: "SystemInfoAgent",
      purpose: "Provides system monitoring, performance checks, and diagnostics.",
      instructions: workerPrompts.generate("systemInfo")(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [systemInfoTool],
      memory: createWorkerMemory("systeminfo"),
      hooks: createWorkerHooks("systeminfo"),
    });

    // File Operations worker agent - uses the coding tools for file operations
    const fileOpsWorker = new Agent({
      name: "FileOpsAgent",
      purpose: "Manages complex file operations and file management tasks.",
      instructions: workerPrompts.generate("fileOps")(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [
        readFileTool,
        writeFileTool,
        deleteFileTool,
        listDirectoryTool,
        createDirectoryTool,
        statTool,
        moveTool,
        copyTool,
        replaceLineInFileTool,
      ],
      memory: createWorkerMemory("fileops"),
      hooks: createWorkerHooks("fileops"),
    });

    // Git worker agent - uses git tools
    const gitWorker = new Agent({
      name: "GitAgent",
      purpose: "Handles Git version control operations and repository management.",
      instructions: workerPrompts.generate("git")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 0,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        enhancedGitStatusTool,
        secureGitScriptTool,
        gitRepositoryAnalysisTool,
        gitCloneTool,
        gitAddTool,
        gitCommitTool,
        gitPushTool,
        gitFetchTool,
        gitPullTool,
        gitMergeTool,
        gitBranchTool,
        getFileContentTool,
        listRepositoryContentsTool,
        listPullRequestsTool,
        getPullRequestDetailsTool,
        createPullRequestTool,
        mergePullRequestTool,
        commentOnPullRequestTool,
        listPullRequestFilesTool,
        createRepositoryTool,
        deleteRepositoryTool,
        listRepositoryHooksTool,
        createRepositoryHookTool,
        getUserProfileTool,
        listOrgMembersTool,
      ],
      memory: createWorkerMemory("git"),
      hooks: createWorkerHooks("git"),
    });

    // Browser worker agent - uses web browser tools
    const researchWorker = new Agent({
      name: "ResearchAgent",
      purpose: "Conducts web searching, browsing, content extraction, and web scraping.",
      instructions: workerPrompts.generate("research")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 0,},} satisfies GoogleGenerativeAIProviderOptions,},
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
      memory: createWorkerMemory("research"),
      hooks: createWorkerHooks("research"),
    });

    // Coding worker agent - uses coding tools
    const codingWorker = new Agent({
      name: "CodingAgent",
      purpose: "Manages code execution, analysis, development assistance, and project structure.",
      instructions: workerPrompts.generate("coding")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 2048,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        sandboxedCodeExecutorTool,
        lintCodeTool,
        analyzeCodeComplexityTool,
        findCodeDuplicatesTool,
        identifySecurityAntiPatternsTool,
        readFileTool,
        writeFileTool,
        deleteFileTool,
        listDirectoryTool,
        createDirectoryTool,
        replaceLineInFileTool,
      ],
      memory: createWorkerMemory("coding"),
      hooks: createWorkerHooks("coding"),
    });

    // Prompt Management worker agent - NEW 2025 enhancement
    const promptManagerWorker = new Agent({
      name: "PromptManagerAgent",
      purpose: "Manages prompt engineering, optimization, and security analysis of prompts.",
      instructions: workerPrompts.generate("promptManager")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 1024,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        promptManagerToolkit,
        calculatorTool, // For scoring and metrics
        webSearchTool, // For researching latest techniques
      ],
      memory: createWorkerMemory("prompt_manager"),
      hooks: createWorkerHooks("prompt_manager"),
    });

    // Debug worker agent - uses the coding tools for file oprations
    const debugWorker = new Agent({
      name: "DebugAgent",
      purpose: "Handles debugging, error diagnosis, and issue resolution.",
      instructions: workerPrompts.generate("debug")(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [
        runIsolatedCodeTool,
        lintCodeTool,
        identifySecurityAntiPatternsTool,
        analyzeCodeComplexityTool,
        findCodeDuplicatesTool,
      ],
      memory: createWorkerMemory("debug"),
      hooks: createWorkerHooks("debug"),
    });

    const browserWorker = new Agent({
      name: "BrowserAgent",
      purpose: "Automates web pages using Playwright tools for navigation, interaction and data extraction.",
      instructions: workerPrompts.generate("browser")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 0,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        navigationTool,
        screenshotTool,
        ...Object.values(interactionTools),
        ...Object.values(responseTools),
        ...Object.values(outputTools),
        ...Object.values(visiblePageTools),
      ],
      memory: createWorkerMemory("browser"),
      hooks: createWorkerHooks("browser"),
    });

    // Knowledge Base worker agent - NEW
    const knowledgeBaseWorker = new Agent({
      name: "KnowledgeBaseAgent",
      purpose: "Manages ingestion, querying, and summarization of documents in the knowledge base.",
      instructions: workerPrompts.generate("knowledgeBase")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 0,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        ingestDocumentTool,
        queryKnowledgeBaseTool,
        summarizeDocumentTool,
        listKnowledgeBaseDocumentsTool,
      ],
      memory: createWorkerMemory("knowledgebase"),
      hooks: createWorkerHooks("knowledgebase"),
    });

    // Data worker agent - NEW
    const dataWorker = new Agent({
      name: "DataAgent",
      purpose: "Handles data manipulation, analysis, and transformation from local files.",
      instructions: workerPrompts.generate("data")(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [
        readDataFromFileTool,
        analyzeCsvDataTool,
        writeDataToFileTool,
      ],
      memory: createWorkerMemory("data"),
      hooks: createWorkerHooks("data"),
    });

    // Cloud worker agent - NEW
    const cloudWorker = new Agent({
      name: "CloudAgent",
      purpose: "Manages cloud resources, deployment, and monitoring, interacting with Docker.",
      instructions: workerPrompts.generate("cloud")(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [
        deployServiceTool,
        listContainersTool,
        stopContainerTool,
        removeContainerTool,
        getContainerLogsTool,
        inspectContainerTool,
        listImagesTool,
        buildImageTool,
      ],
      memory: createWorkerMemory("cloud"),
      hooks: createWorkerHooks("cloud"),
    });

    const workers = {
      calculator: calculatorWorker,
      datetime: dateTimeWorker,
      systemInfo: systemInfoWorker,
      fileOps: fileOpsWorker,
      git: gitWorker,
      browser: browserWorker,
      coding: codingWorker,
      promptManager: promptManagerWorker,
      debug: debugWorker,
      research: researchWorker,
      knowledgeBase: knowledgeBaseWorker,
      data: dataWorker,
      cloud: cloudWorker,
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

// Add helper function above onEnd
function logSessionSummary({ agent, output, error, context }: OnEndHookArgs) {
  if (env.NODE_ENV === 'development') { console.debug('Output summary:', output); }  // Minimal reference to satisfy linter
  const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
  const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
  const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
  const startTime = context.userContext.get(CONTEXT_KEYS.DELEGATION_START) as number;
  const duration = Date.now() - startTime;
  const activeDelegations = context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any> || new Map();
  const delegationCount = context.userContext.get(CONTEXT_KEYS.DELEGATION_COUNT) as number;
  const retrievalCount = context.userContext.get(CONTEXT_KEYS.RETRIEVAL_COUNT);
  
  if (error) {
    logger.error(`[${agent.name}] AI-Volt coordination session failed`, {
      sessionId,
      delegationId,
      workflowId,
      operationId: context.operationId,
      duration,
      totalDelegations: delegationCount,
      error: error instanceof Error ? error.message : String(error),
    });
  } else {
    logger.info(`[${agent.name}] AI-Volt coordination session completed`, {
      sessionId,
      delegationId,
      workflowId,
      operationId: context.operationId,
      duration,
      totalDelegations: delegationCount,
      successfulDelegations: activeDelegations.size,
      retrievalCount,
    });
  }
}

function handleDelegationEnd({ agent, tool, output, error, context }: OnToolEndHookArgs) {
  const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
  const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
  const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
  const delegationStartTime = context.userContext.get(CONTEXT_KEYS.CURRENT_DELEGATION) as number;
  const delegationDuration = delegationStartTime ? Date.now() - delegationStartTime : 0;
  
  let resultPreviewStr = "[No output]";
  if (typeof output !== 'undefined' && output !== null) {
    if (typeof output === 'string') {
      resultPreviewStr = output.substring(0, 100);
    } else {
      try {
        let meaningfulOutput: any = output; // Ensure meaningfulOutput can be reassigned
        if (typeof output === 'object') {
            if ('value' in output && typeof (output as any).value === 'string') {
                meaningfulOutput = (output as any).value;
            } else if ('text' in output && typeof (output as any).text === 'string') {
                meaningfulOutput = (output as any).text;
            } else if (typeof (output as any).type === 'string' && (output as any).type === 'tool-result' && 
                       (output as any).toolResult && typeof (output as any).toolResult.result !== 'undefined') {
                meaningfulOutput = (output as any).toolResult.result;
            }
        }
        const stringifiedOutput = JSON.stringify(meaningfulOutput);
        resultPreviewStr = stringifiedOutput.substring(0, 100);
      } catch (stringifyError) {
        logger.warn(`[${agent.name}] Failed to stringify delegation output for preview`, {
          sessionId,
          delegationId,
          toolName: tool.name,
          error: stringifyError instanceof Error ? stringifyError.message : String(stringifyError)
        });
        resultPreviewStr = "[Unserializable Object]";
      }
    }
  }

  if (error) {
    logger.error(`[${agent.name}] Task delegation failed`, {
      sessionId,
      delegationId,
      workflowId,
      operationId: context.operationId,
      toolName: tool.name,
      duration: delegationDuration,
      error: error instanceof Error ? error.message : String(error),
    });
  } else {
    logger.info(`[${agent.name}] Task delegation tool executed successfully`, {
      sessionId,
      delegationId,
      workflowId,
      operationId: context.operationId,
      toolName: tool.name,
      duration: delegationDuration,
      resultPreview: resultPreviewStr,
    });
  }
}

