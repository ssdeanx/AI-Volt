/* eslint-disable sonarjs/cognitive-complexity */
/**
 * @fileoverview Supervisor Agent Configuration
 * 
 * Manages and coordinates specialized worker agents using delegation pattern.
 * Implements VoltAgent's multi-agent supervisor/worker architecture with 
 * comprehensive monitoring, context retrieval, and lifecycle management.
 * 
 * @module SupervisorAgent
 * @version 1.0.0
 * @author AI-Volt Multi-Agent System
 * @since 2025-06-02
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
import { 
  createSupervisorRetriever, 
  type SupervisorRetriever
} from "./supervisorRetriever.js";
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
  createRepositoryHookTool
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

/**
 * Context symbols for type-safe userContext keys
 * Following VoltAgent best practices for avoiding key collisions
 * @see https://voltagent.dev/docs/agents/context/
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
  SESSION_ID_WORKER: Symbol("sessionId"), // For worker's own session/task
  AGENT_TYPE: Symbol("agentType"),
  START_TIME: Symbol("startTime"),
  
  // Coordination context (for worker to know its parent)
  PARENT_SESSION_ID: Symbol("parentSessionId"), // Supervisor's session ID
  PARENT_WORKFLOW_ID: Symbol("parentWorkflowId"), // Supervisor's workflow ID
  DELEGATION_CHAIN: Symbol("delegationChain"),
  COORDINATOR_AGENT: Symbol("coordinatorAgent"),
  RETRIEVAL_COUNT: Symbol("retrievalCount"), // Supervisor's retrieval count
  RETRIEVAL_HISTORY: Symbol("retrievalHistory"), // Supervisor's retrieval history
} as const;

/**
 * Create enhanced supervisor-specific hooks implementing VoltAgent best practices
 * Follows official VoltAgent patterns for context management and delegation tracking
 * @see https://voltagent.dev/docs/agents/context/
 * @see https://voltagent.dev/docs/agents/hooks/
 */
const createSupervisorHooks = () => createHooks({
  /**
   * Called before the supervisor agent starts processing a request
   * Initializes comprehensive coordination session context and tracking
   */
  onStart: async (args: OnStartHookArgs) => {
    const { agent, context } = args;
    
    // Generate unique identifiers for this coordination session following VoltAgent patterns
    const sessionId = `session-${generateId()}`;
    const delegationId = `delegation-${generateId()}`;
    const workflowId = `workflow-${generateId()}`;
    
    // Initialize context using symbols for type safety (VoltAgent best practice)
    context.userContext.set(CONTEXT_KEYS.SESSION_ID, sessionId);
    context.userContext.set(CONTEXT_KEYS.DELEGATION_ID, delegationId);
    context.userContext.set(CONTEXT_KEYS.WORKFLOW_ID, workflowId);
    context.userContext.set(CONTEXT_KEYS.DELEGATION_START, Date.now());
    context.userContext.set(CONTEXT_KEYS.ACTIVE_DELEGATIONS, new Map<string, {
      agentType: string;
      taskId: string;
      startTime: number;
      description: string;
      status: 'active' | 'completed' | 'failed';
    }>());
    context.userContext.set(CONTEXT_KEYS.DELEGATION_COUNT, 0);
    context.userContext.set(CONTEXT_KEYS.COORDINATOR_AGENT, agent.name);
    context.userContext.set(CONTEXT_KEYS.RETRIEVAL_COUNT, 0);
    context.userContext.set(CONTEXT_KEYS.RETRIEVAL_HISTORY, [] as Array<{ 
      query: string; 
      timestamp: number; 
      resultsCount: number;
      cacheHit: boolean;
    }>);
    
    // Enhanced context correlation for advanced tracking
    context.userContext.set("supervisorSessionMetadata", {
      createdAt: new Date().toISOString(),
      coordinator: agent.name,
      operationId: context.operationId,
      sessionVersion: "2.0"
    });
    
    logger.info(`[Hook] Enhanced supervisor session started`, {
      sessionId,
      delegationId,
      workflowId,
      operationId: context.operationId,
      coordinator: agent.name,
      timestamp: new Date().toISOString(),
      features: ["context-correlation", "delegation-tracking", "retrieval-monitoring"]
    });
  },

  onEnd: async (args: OnEndHookArgs) => {
    const { agent, output, error, context } = args;
    
    // Enhanced LLM usage tracking with detailed cost analysis
    const llmUsage = extractLLMUsage(context);
    if (llmUsage) {
      trackLLMUsage(agent, context, llmUsage);
    }
    
    // Enhanced session summary with context correlation
    logEnhancedSessionSummary({ agent, output, error, context });
    
    // Advanced error handling with context preservation
    if (error) {
      const errorContext = {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        operationId: context.operationId,
        sessionId: context.userContext.get(CONTEXT_KEYS.SESSION_ID),
        workflowId: context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID),
        activeDelegations: (context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any>)?.size || 0
      };
      
      logger.error(`[Hook] Enhanced supervisor operation failed`, errorContext);
    } else {
      logger.info(`[Hook] Enhanced supervisor operation completed successfully`, {
        operationId: context.operationId,
        sessionId: context.userContext.get(CONTEXT_KEYS.SESSION_ID),
        successfulDelegations: (context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any>)?.size || 0
      });
    }
  },

  onToolStart: async (args: OnToolStartHookArgs) => {
    const { agent, tool, context } = args;
    
    const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
    const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
    const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
    
    // Enhanced delegation tracking with status management
    if (tool.name === "delegate_task") {
      const delegationCount = (context.userContext.get(CONTEXT_KEYS.DELEGATION_COUNT) as number) || 0;
      const newCount = delegationCount + 1;
      const delegationStartTime = Date.now();
      
      context.userContext.set(CONTEXT_KEYS.DELEGATION_COUNT, newCount);
      context.userContext.set(CONTEXT_KEYS.CURRENT_DELEGATION, delegationStartTime);
      
      // Track delegation in active delegations map
      const activeDelegations = context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any>;
      const delegationKey = `delegation-${newCount}`;
      activeDelegations.set(delegationKey, {
        agentType: 'unknown', // Will be updated when we know which agent
        taskId: delegationKey,
        startTime: delegationStartTime,
        description: `Delegation ${newCount}`,
        status: 'active'
      });
      
      logger.info(`[Hook] Enhanced delegation started`, {
        sessionId,
        delegationId,
        workflowId,
        operationId: context.operationId,
        toolName: tool.name,
        delegationSequence: newCount,
        totalActiveDelegations: activeDelegations.size,
        timestamp: new Date().toISOString()
      });
    } else if (tool.name === "supervisor_search") {
      // Enhanced retrieval tracking
      const count = (context.userContext.get(CONTEXT_KEYS.RETRIEVAL_COUNT) as number) + 1;
      context.userContext.set(CONTEXT_KEYS.RETRIEVAL_COUNT, count);
      
      const history = context.userContext.get(CONTEXT_KEYS.RETRIEVAL_HISTORY) as any[];
      history.push({ 
        query: context.operationId as string, 
        timestamp: Date.now(),
        resultsCount: 0, // Will be updated in onToolEnd
        cacheHit: false  // Will be updated based on retrieval result
      });
      context.userContext.set(CONTEXT_KEYS.RETRIEVAL_HISTORY, history);
      
      logger.debug(`[Hook] Enhanced retrieval started`, {
        sessionId,
        retrievalSequence: count,
        operationId: context.operationId,
        timestamp: new Date().toISOString()
      });
    } else {
      // Track other tool usage by supervisor with enhanced context
      logger.debug(`[Hook] Enhanced supervisor tool started`, {
        sessionId,
        delegationId,
        workflowId,
        operationId: context.operationId,
        toolName: tool.name,
        category: this.categorizeTool(tool.name),
        timestamp: new Date().toISOString()
      });
    }
  },

  onToolEnd: async (args: OnToolEndHookArgs) => {
    const { agent, tool, output, error, context } = args;
    
    if (tool.name === 'delegate_task') {
      handleEnhancedDelegationEnd({ agent, tool, output, error, context });
    } else if (tool.name === 'supervisor_search') {
      handleEnhancedRetrievalEnd({ agent, tool, output, error, context });
    } else {
      // Enhanced general tool tracking
      const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
      const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
      
      if (error) {
        logger.warn(`[Hook] Enhanced supervisor tool failed`, {
          sessionId,
          workflowId,
          operationId: context.operationId,
          toolName: tool.name,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        logger.debug(`[Hook] Enhanced supervisor tool completed`, {
          sessionId,
          toolName: tool.name,
          outputSize: typeof output === "string" ? output.length : JSON.stringify(output || {}).length
        });
      }
    }
    
    // Output type analysis for enhanced monitoring
    let outputType = 'unknown';
    if (typeof output === 'object' && output !== null) {
        if ('text' in output) {
            outputType = 'text';
        } else if ('object' in output) {
            outputType = 'object';
        }
    }
    logger.debug(`Enhanced output analysis: ${outputType}`);
  },

  onHandoff: async (args: OnHandoffHookArgs) => {
    // Enhanced handoff tracking following VoltAgent documentation
    const sessionId = args.context?.userContext?.get(CONTEXT_KEYS.SESSION_ID);
    const workflowId = args.context?.userContext?.get(CONTEXT_KEYS.WORKFLOW_ID);
    
    logger.info(`[Hook] Enhanced task handoff received`, {
      sessionId,
      workflowId,
      handoffDetails: {
        // Safe extraction of handoff details
        ...(typeof args === 'object' ? args : {})
      },
      timestamp: new Date().toISOString(),
    });
  }
});
   
});

/**
 * Create enhanced supervisor hooks that integrate with the retriever following VoltAgent best practices
 */
const createSupervisorHooksWithRetriever = (baseHooks: ReturnType<typeof createHooks>, retriever: SupervisorRetriever) => {
  return createHooks({
    onStart: async (args: OnStartHookArgs) => {
      // Call base hooks first
      await baseHooks.onStart?.(args);
      const { context } = args;
      
      // Initialize retriever context tracking with enhanced features
      context.userContext.set(CONTEXT_KEYS.RETRIEVER_ENABLED, true);
      context.userContext.set(CONTEXT_KEYS.CONTEXT_RETRIEVALS, 0);
      
      // Enhanced retriever initialization
      const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID) as string;
      if (sessionId) {
        // Initialize retriever session correlation
        retriever.addCapabilityContext({
          agentType: 'supervisor',
          capability: 'context-retrieval',
          description: 'Multi-agent coordination context retrieval and correlation',
          examples: ['delegation history', 'workflow patterns', 'error resolution'],
          limitations: ['text-based search only', 'limited to session context']
        });
      }
    },
    
    onEnd: async (args: OnEndHookArgs) => {
      const { agent, output, error, context } = args;
      await baseHooks.onEnd?.(args);
      
      // Enhanced workflow context addition to retriever
      if (!error && output) {
        const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID) as string;
        const activeDelegations = context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any>;
        const retrievalCount = context.userContext.get(CONTEXT_KEYS.RETRIEVAL_COUNT) as number;
        
        if (workflowId && activeDelegations && activeDelegations.size > 0) {
          try {
            retriever.addWorkflowContext({
              description: `Multi-agent coordination workflow with ${activeDelegations.size} delegations and ${retrievalCount} retrievals`,
              steps: Array.from(activeDelegations.keys()),
              workflowId,
              status: 'completed',
              agents: Array.from(activeDelegations.values()).map((delegation: any) => delegation.agentType)
            });
            
            // Add session performance metrics to retriever
            retriever.addDelegationContext({
              agentType: 'supervisor',
              task: 'session-completion',
              result: `Successfully coordinated ${activeDelegations.size} delegations with ${retrievalCount} context retrievals`,
              taskId: workflowId,
              workflowId,
              success: true,
              duration: Date.now() - (context.userContext.get(CONTEXT_KEYS.DELEGATION_START) as number)
            });
          } catch (retrievalError) {
            logger.warn(`[${agent.name}] Enhanced retriever context addition failed`, {
              error: retrievalError instanceof Error ? retrievalError.message : String(retrievalError),
              workflowId,
              delegationCount: activeDelegations.size
            });
          }
        }
      }
    },
    
    onToolStart: async (args: OnToolStartHookArgs) => {
      // Call base hooks first
      await baseHooks.onToolStart?.(args);
    },
    
    onToolEnd: async (args: OnToolEndHookArgs) => {
      // Call base hooks first
      await baseHooks.onToolEnd?.(args);
    },
    
    onHandoff: async (args: OnHandoffHookArgs) => {
      // Call base hooks first
      await baseHooks.onHandoff?.(args);
    }
  });
};
// Get toolkit, automatically adding instructions & examples to system prompt
/**
  * A reasoning toolkit configured for "think-only" mode.
  * This toolkit enables analysis but does not add instructions to the system prompt.
  */
const thinkOnlyToolkit: Toolkit = createReasoningTools({
  think: true,
  addFewShot: false,
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
      maxResults: SUPERVISOR_CONFIG.RETRIEVER.MAX_RESULTS,
      defaultMinScore: SUPERVISOR_CONFIG.RETRIEVER.DEFAULT_MIN_SCORE,
      storeMaxSize: SUPERVISOR_CONFIG.RETRIEVER.STORE_MAX_SIZE,
      searchCacheSize: SUPERVISOR_CONFIG.RETRIEVER.SEARCH_CACHE_SIZE,
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
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
      tools: [
        thinkOnlyToolkit,
        webSearchTool,
        retriever.tool,                // Enable semantic context retrieval
      ],
      subAgents: [
        workers.systemInfo,
        workers.fileOps,
        workers.git,
        workers.browser,
        workers.coding,
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
  onStart: async (args: OnStartHookArgs) => {
    const { agent, context } = args;
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

  onEnd: async (args: OnEndHookArgs) => {
    const { agent, output, error, context } = args;
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

  onToolStart: async (args: OnToolStartHookArgs) => {
    const { agent, tool, context } = args;
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

  onToolEnd: async (args: OnToolEndHookArgs) => {
    const { agent, tool, output, error, context } = args;
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
    // System Info worker agent
    const systemInfoWorker = new Agent({
      name: "SystemInfoAgent",
      purpose: "Provides system monitoring, performance checks, and diagnostics.",
      instructions: workerPrompts.generate("systemInfo")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
      tools: [systemInfoTool, dateTimeTool, calculatorTool, statisticsAnalysisTool],
      memory: createWorkerMemory("systeminfo"),
      hooks: createWorkerHooks("systeminfo"),
    });

    // File Operations worker agent - uses the coding tools for file operations
    const fileOpsWorker = new Agent({
      name: "FileOpsAgent",
      purpose: "Manages complex file operations and file management tasks.",
      instructions: workerPrompts.generate("fileOps")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
        createRepositoryHookTool
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
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
//    const promptManagerWorker = new Agent({
//      name: "PromptManagerAgent",
//      purpose: "Manages prompt engineering, optimization, and security analysis of prompts.",
//      instructions: workerPrompts.generate("promptManager")(),
//      llm: new VercelAIProvider(),
//      model: google('gemini-2.5-flash-preview-05-20'),
//      providerOptions: {
//        google: {
//          thinkingConfig: {
//            thinkingBudget: 0,
//            includeThoughts: false,
//          },
//          responseModalities: ["TEXT", "IMAGE"],
//        } satisfies GoogleGenerativeAIProviderOptions,
//      },
//      tools: [
//        promptManagerToolkit,
//        calculatorTool, // For scoring and metrics
//        webSearchTool, // For researching latest techniques
//      ],
//      memory: createWorkerMemory("prompt_manager"),
//      hooks: createWorkerHooks("prompt_manager"),
//    });

    // Debug worker agent - uses the coding tools for file oprations
    const debugWorker = new Agent({
      name: "DebugAgent",
      purpose: "Handles debugging, error diagnosis, and issue resolution.",
      instructions: workerPrompts.generate("debug")(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false,
          },
          responseModalities: ["TEXT", "IMAGE"],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
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
      systemInfo: systemInfoWorker,
      fileOps: fileOpsWorker,
      git: gitWorker,
      browser: browserWorker,
      coding: codingWorker,
//      promptManager: promptManagerWorker,
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

// Enhanced helper functions for improved supervisor monitoring

/**
 * Extract LLM usage data with multiple fallback strategies
 */
function extractLLMUsage(context: any): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
  let llmUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined = undefined;
  
  // Try symbol-based key (if defined in CONTEXT_KEYS)
  if (Object.prototype.hasOwnProperty.call(CONTEXT_KEYS, 'LLM_USAGE')) {
    llmUsage = context.userContext.get((CONTEXT_KEYS as any).LLM_USAGE);
  } else {
    // fallback: try string key or legacy context
    llmUsage = context.userContext.get('llmUsage');
  }
  if (!llmUsage && (context as any).llmUsage) {
    llmUsage = (context as any).llmUsage;
  }
  
  return llmUsage;
}

/**
 * Track LLM usage with enhanced cost analysis
 */
function trackLLMUsage(agent: any, context: any, llmUsage: { promptTokens: number; completionTokens: number; totalTokens: number }): void {
  const { promptTokens, completionTokens } = llmUsage;
  // Gemini 2.5 Flash Preview (Paid Tier, Non-Thinking) pricing
  const inputCost = (promptTokens / 1_000_000) * 0.15;
  const outputCost = (completionTokens / 1_000_000) * 0.60;
  const totalCost = inputCost + outputCost;
  const taskId = context.userContext.get(CONTEXT_KEYS.TASK_ID) || context.userContext.get(CONTEXT_KEYS.SESSION_ID) || context.operationId;
  const agentType = context.userContext.get(CONTEXT_KEYS.AGENT_TYPE) || (agent as any).agentType || agent.name;
  
  logger.info(`[Hook] Enhanced LLM usage tracking`, {
    taskId,
    agentType,
    promptTokens,
    completionTokens,
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
    operationId: context.operationId,
    efficiency: promptTokens > 0 ? Number((completionTokens / promptTokens).toFixed(2)) : 0,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Enhanced session summary with comprehensive context correlation
 */
function logEnhancedSessionSummary({ agent, output, error, context }: OnEndHookArgs): void {
  if (env.NODE_ENV === 'development') { console.debug('Enhanced output summary:', output); }
  
  const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
  const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
  const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
  const startTime = context.userContext.get(CONTEXT_KEYS.DELEGATION_START) as number;
  const duration = Date.now() - startTime;
  const activeDelegations = context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any> || new Map();
  const delegationCount = context.userContext.get(CONTEXT_KEYS.DELEGATION_COUNT) as number;
  const retrievalCount = context.userContext.get(CONTEXT_KEYS.RETRIEVAL_COUNT);
  const retrievalHistory = context.userContext.get(CONTEXT_KEYS.RETRIEVAL_HISTORY) as any[];
  
  const sessionMetrics = {
    sessionId,
    delegationId,
    workflowId,
    operationId: context.operationId,
    duration,
    totalDelegations: delegationCount,
    successfulDelegations: activeDelegations.size,
    retrievalCount,
    avgRetrievalsPerDelegation: delegationCount > 0 ? Number((retrievalCount / delegationCount).toFixed(2)) : 0,
    cacheHitRate: retrievalHistory?.length > 0 ? 
      Number((retrievalHistory.filter((r: any) => r.cacheHit).length / retrievalHistory.length).toFixed(2)) : 0
  };
  
  if (error) {
    logger.error(`[${agent.name}] Enhanced coordination session failed`, {
      ...sessionMetrics,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
  } else {
    logger.info(`[${agent.name}] Enhanced coordination session completed`, {
      ...sessionMetrics,
      performance: duration < 5000 ? 'excellent' : duration < 15000 ? 'good' : 'acceptable',
      efficiency: sessionMetrics.avgRetrievalsPerDelegation < 2 ? 'efficient' : 'moderate'
    });
  }
}

/**
 * Handle enhanced delegation completion with status tracking
 */
function handleEnhancedDelegationEnd({ agent, tool, output, error, context }: OnToolEndHookArgs): void {
  const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
  const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
  const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
  const delegationStartTime = context.userContext.get(CONTEXT_KEYS.CURRENT_DELEGATION) as number;
  const delegationDuration = delegationStartTime ? Date.now() - delegationStartTime : 0;
  const activeDelegations = context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any>;
  
  // Update delegation status in active delegations map
  const currentDelegationCount = context.userContext.get(CONTEXT_KEYS.DELEGATION_COUNT) as number;
  const delegationKey = `delegation-${currentDelegationCount}`;
  
  if (activeDelegations && activeDelegations.has(delegationKey)) {
    const delegation = activeDelegations.get(delegationKey);
    delegation.status = error ? 'failed' : 'completed';
    delegation.duration = delegationDuration;
    delegation.endTime = Date.now();
  }
  
  let resultPreviewStr = extractResultPreview(output);
  
  const delegationMetrics = {
    sessionId,
    delegationId,
    workflowId,
    operationId: context.operationId,
    toolName: tool.name,
    duration: delegationDuration,
    delegationSequence: currentDelegationCount,
    totalActiveDelegations: activeDelegations?.size || 0,
    resultPreview: resultPreviewStr,
    success: !error
  };

  if (error) {
    logger.error(`[${agent.name}] Enhanced delegation failed`, {
      ...delegationMetrics,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
  } else {
    logger.info(`[${agent.name}] Enhanced delegation completed`, {
      ...delegationMetrics,
      performance: delegationDuration < 3000 ? 'fast' : delegationDuration < 10000 ? 'normal' : 'slow'
    });
  }
}

/**
 * Handle enhanced retrieval completion with cache tracking
 */
function handleEnhancedRetrievalEnd({ agent, tool, output, error, context }: OnToolEndHookArgs): void {
  const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
  const retrievalHistory = context.userContext.get(CONTEXT_KEYS.RETRIEVAL_HISTORY) as any[];
  
  // Update the latest retrieval entry with results
  if (retrievalHistory && retrievalHistory.length > 0) {
    const latestRetrieval = retrievalHistory[retrievalHistory.length - 1];
    latestRetrieval.completed = true;
    latestRetrieval.success = !error;
    latestRetrieval.duration = Date.now() - latestRetrieval.timestamp;
    
    if (output && typeof output === 'string') {
      latestRetrieval.resultsCount = (output.match(/\[Context \d+/g) || []).length;
      latestRetrieval.cacheHit = output.includes('cache hit') || latestRetrieval.duration < 50; // Fast = likely cache hit
    }
  }
  
  const retrievalMetrics = {
    sessionId,
    operationId: context.operationId,
    toolName: tool.name,
    retrievalSequence: context.userContext.get(CONTEXT_KEYS.RETRIEVAL_COUNT),
    success: !error
  };

  if (error) {
    logger.error(`[${agent.name}] Enhanced retrieval failed`, {
      ...retrievalMetrics,
      error: error instanceof Error ? error.message : String(error)
    });
  } else {
    logger.debug(`[${agent.name}] Enhanced retrieval completed`, {
      ...retrievalMetrics,
      resultsFound: retrievalHistory?.[retrievalHistory.length - 1]?.resultsCount || 0
    });
  }
}

/**
 * Extract meaningful result preview from tool output
 */
function extractResultPreview(output: any): string {
  if (!output) return "[No output]";
  
  if (typeof output === 'string') {
    return output.substring(0, 100);
  }
  
  try {
    let meaningfulOutput: any = output;
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
    return stringifiedOutput.substring(0, 100);
  } catch (stringifyError) {
    logger.warn("Failed to stringify output for preview", {
      error: stringifyError instanceof Error ? stringifyError.message : String(stringifyError)
    });
    return "[Unserializable Object]";
  }
}

// Legacy compatibility function
function logSessionSummary({ agent, output, error, context }: OnEndHookArgs) {
  return logEnhancedSessionSummary({ agent, output, error, context });
}

function handleDelegationEnd({ agent, tool, output, error, context }: OnToolEndHookArgs) {
  return handleEnhancedDelegationEnd({ agent, tool, output, error, context });
}

// Extract to a configuration object
/**
 * Configuration constants for supervisor agent behavior
 * Centralized configuration following VoltAgent best practices
 */
const SUPERVISOR_CONFIG = {
  MEMORY: {
    STORAGE_LIMIT: 500,
    WORKER_STORAGE_LIMIT: 200,
  },
  RETRIEVER: {
    MAX_RESULTS: 10,
    DEFAULT_MIN_SCORE: 1,
    STORE_MAX_SIZE: 1000,
    SEARCH_CACHE_SIZE: 200,
  },
  MODELS: {
    THINKING_BUDGET: 0, // Default thinking budget for supervisor agent
    WORKER_THINKING_BUDGET: 0,
  },
  LOGGING: {
    PREVIEW_LENGTH: 100,
    RESULT_TRUNCATE_LENGTH: 500,
  }
} as const;
