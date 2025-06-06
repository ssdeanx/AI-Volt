/**
 * Supervisor Agent Configuration
 * Manages and coordinates specialized worker agents using delegation pattern
 * Generated on 2025-06-02
 */

import { Agent, LibSQLStorage, createHooks, type OnStartHookArgs, type OnEndHookArgs, type OnToolStartHookArgs, type OnToolEndHookArgs, type OnHandoffHookArgs, type Tool, createReasoningTools, type Toolkit, type OperationContext} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { generateId } from "ai";
import { calculatorTool, statisticsAnalysisTool } from "../tools/calculator.js";
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
} from "../tools/enhancedGitTool.js";
import {
  secureCodeExecutorTool,
  fileSystemOperationsTool,
  codeAnalysisTool,
  projectStructureGeneratorTool,
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
import { promptManagementToolkit } from "../tools/promptManagementTools.js";
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
import { runIsolatedCodeTool, runJsInspectTool, runEslintTool } from "../tools/debugTools.js";
import { identifySecurityAntiPatternsTool } from "../tools/debugTools.js";
import { getNodeProcessInfoTool, guideNodeProfilerTool, analyzeCodeComplexityTool, analyzeLogPatternsTool, getAgentExecutionTimelineTool } from "../tools/debugTools.js";
import { ingestDocumentTool, queryKnowledgeBaseTool, summarizeDocumentTool, listKnowledgeBaseDocumentsTool } from "../tools/knowledgeBaseTools.js";
import { readDataFromFileTool, analyzeCsvDataTool, writeDataToFileTool } from "../tools/dataTools.js";
import { deployServiceTool, manageResourcesTool, monitorCloudTool } from "../tools/cloudTools.js";
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
 * Supervisor agent instructions for coordinating worker agents using VoltAgent's built-in delegation
 */
const SUPERVISOR_INSTRUCTIONS = `You are AI-Volt Supervisor, a coordination agent that manages specialized worker agents in a multi-agent system.

CORE ROLE:
- Analyze user requests and determine the best approach
- Delegate specialized tasks to appropriate worker agents using the delegate_task tool
- Coordinate multi-step workflows across different agent types
- Provide comprehensive responses by combining results from multiple agents

AVAILABLE WORKER AGENTS & DELEGATION STRATEGY:
Use the delegate_task tool to assign tasks to these specialized agents:

- "calculator" → Mathematical calculations, formulas, statistical analysis
- "datetime" → Date/time operations, formatting, scheduling, timezone conversions  
- "system_info" → System monitoring, performance checks, diagnostics
- "fileops" → Complex file operations, file management tasks
- "git" → Git version control operations, repository management
- "browser" → Web searching, browsing, content extraction, web scraping
- "coding" → Code execution, analysis, development assistance, project structure

DELEGATION PROTOCOL:
1. **Request Analysis**: Parse user intent and identify required specialized capabilities
2. **Task Decomposition**: Break complex requests into agent-specific subtasks
3. **Strategic Delegation**: Use delegate_task tool with clear task descriptions and target agents
4. **Progress Coordination**: Monitor task completion and handle multi-agent dependencies
5. **Response Synthesis**: Compile comprehensive responses from worker agent outputs
6. **Quality Assurance**: Ensure all aspects of the user request are addressed

DELEGATION SYNTAX:
When using delegate_task, provide:
- Clear, specific task description
- Target agent name (from the list above)
- Any relevant context or constraints
- Expected output format if specific requirements exist

COMMUNICATION STYLE:
- Professional and systematic in approach
- Clear about which agents are being utilized
- Transparent about delegation decisions and reasoning
- Comprehensive in final responses with proper attribution
- Proactive in suggesting related capabilities and optimizations

TASK PRIORITIZATION:
- **Urgent**: System issues, critical calculations, security concerns
- **High**: Time-sensitive operations, important file operations, user-blocking issues
- **Medium**: Standard requests, routine calculations, general queries
- **Low**: Informational queries, background tasks, optimization suggestions

DIRECT HANDLING vs DELEGATION:
- Handle simple queries directly using your basic tools (calculator, datetime, system_info, web_search)
- Delegate to specialized agents for complex, multi-step, or domain-specific tasks
- Always delegate when the task requires specialized tools not available to you directly

When you receive a request, first assess the complexity and specialization required, then either handle directly with your basic tools or use the delegate_task tool to coordinate with appropriate worker agents for optimal results.`;

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
    const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
    const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
    const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
    const startTime = context.userContext.get(CONTEXT_KEYS.DELEGATION_START) as number;
    const activeDelegations = context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any>;
    const delegationCount = context.userContext.get(CONTEXT_KEYS.DELEGATION_COUNT) as number;
    const duration = Date.now() - startTime;
    const retrievalCount = context.userContext.get(CONTEXT_KEYS.RETRIEVAL_COUNT);

    // Cleanup and final reporting
    const delegationSummary = activeDelegations ? Array.from(activeDelegations.entries()).map(([taskId, info]) => ({
      taskId,
      agentType: info.agentType,
      duration: Date.now() - info.startTime,
      description: info.description
    })) : [];

    if (error) {
      logger.error(`[${agent.name}] AI-Volt coordination session failed`, {
        sessionId,
        delegationId,
        workflowId,
        operationId: context.operationId,
        duration,
        totalDelegations: delegationCount,
        activeDelegations: delegationSummary,
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
          } catch { /* empty */ }
        }
      }
      logger.info(`[${agent.name}] AI-Volt coordination session completed`, {
        sessionId,
        delegationId,
        workflowId,
        operationId: context.operationId,
        duration,
        totalDelegations: delegationCount,
        successfulDelegations: delegationSummary.length,
        delegationSummary,
        outputPreview,
        retrievalCount,
        retrievalHistory: context.userContext.get(CONTEXT_KEYS.RETRIEVAL_HISTORY)
      });
    }
  },

  onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
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
    const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
    const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
    const workflowId = context.userContext.get(CONTEXT_KEYS.WORKFLOW_ID);
    const activeDelegations = context.userContext.get(CONTEXT_KEYS.ACTIVE_DELEGATIONS) as Map<string, any> || new Map();

    if (tool.name === "delegate_task") {
      const delegationStartTime = context.userContext.get(CONTEXT_KEYS.CURRENT_DELEGATION) as number;
      const delegationDuration = delegationStartTime ? Date.now() - delegationStartTime : 0;
      
      if (error) {
        logger.error(`[${agent.name}] Task delegation failed`, {
          sessionId,
          delegationId,
          workflowId,
          operationId: context.operationId,
          toolName: tool.name,
          duration: delegationDuration,
          error: error.message,
        });
      } else {
        // Track successful delegation
        const taskId = `task-${generateId()}`;
        
        // Extract delegation details if possible
        let agentType = "unknown";
        let taskDescription = "delegation-completed";
        
        try {
          const resultStr = typeof output === "string" ? output : JSON.stringify(output);
          
          // Try to determine which agent was used
          const agentTypes = ['calculator', 'datetime', 'system_info', 'fileops', 'git', 'browser', 'coding'];
          for (const type of agentTypes) {
            if (resultStr.toLowerCase().includes(type)) {
              agentType = type;
              break;
            }
          }
          taskDescription = resultStr.substring(0, 100);
        } catch {
          // Safe fallback
          taskDescription = "delegation-completed";
        }
        
        // Add to active delegations map
        activeDelegations.set(taskId, {
          agentType,
          taskId,
          startTime: delegationStartTime,
          description: taskDescription
        });
        context.userContext.set(CONTEXT_KEYS.ACTIVE_DELEGATIONS, activeDelegations);
        
        logger.info(`[${agent.name}] Task delegation successful`, {
          sessionId,
          delegationId,
          workflowId,
          operationId: context.operationId,
          toolName: tool.name,
          taskId,
          agentType,
          duration: delegationDuration,
          totalActiveDelegations: activeDelegations.size,
          resultPreview: taskDescription
        });
      }
    } else {
      // Track other supervisor tool usage
      if (error) {
        logger.warn(`[${agent.name}] Supervisor tool failed`, {
          sessionId,
          delegationId,
          workflowId,
          operationId: context.operationId,
          toolName: tool.name,
          error: error.message,
        });
      } else {
        logger.debug(`[${agent.name}] Supervisor tool completed`, {
          sessionId,
          delegationId,
          workflowId,
          operationId: context.operationId,
          toolName: tool.name,
          outputPreview: typeof output === "string" ? output.substring(0, 50) : "non-string-output"
        });
      }
    }
  },

  onHandoff: async (args: OnHandoffHookArgs) => {
    // Note: OnHandoffHookArgs structure may be different from other hook args
    // For now, just log the handoff event
    logger.info(`[Supervisor] Task handoff received`, {
      handoffType: "supervisor-coordination",
      timestamp: new Date().toISOString(),
      args: JSON.stringify(args, null, 2) // Log the actual structure for debugging
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
        const workflowId = context.userContext.get("workflowId") as string;
        const taskId = context.userContext.get("currentDelegation") as string;
        
        try {
          // Extract delegation details from tool output
          const resultStr = typeof output === "string" ? output : JSON.stringify(output);
          const success = !error;
          
          // Try to determine which agent was used
          let agentType = "unknown";
          const agentTypes = ['calculator', 'datetime', 'system_info', 'fileops', 'git', 'browser', 'coding'];
          for (const type of agentTypes) {
            if (resultStr.toLowerCase().includes(type)) {
              agentType = type;
              break;
            }
          }
          
          retriever.addDelegationContext({
            agentType,
            task: "Delegated task via delegate_task tool",
            result: resultStr.substring(0, 500), // Limit length
            taskId,
            workflowId,
            success,
            duration: Date.now() - (context.userContext.get("currentDelegation") as number || Date.now())
          });
          
          logger.debug("Delegation result added to retriever", {
            agentType,
            success,
            taskId,
            workflowId
          });
          
        } catch (retrievalError) {
          logger.warn("Failed to add delegation context to retriever", {
            error: retrievalError instanceof Error ? retrievalError.message : String(retrievalError),
            toolName: tool.name
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
  logger.info("Creating AI-Volt supervisor agent", {
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
      name: "AI-Volt-Supervisor",
      instructions: supervisorPrompts.rag(),
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
        promptManagementToolkit,
        calculatorTool,
        dateTimeTool,
        systemInfoTool,
        webSearchTool,
        retriever.tool,                // <— now a selectable tool with caching
        fetchRepoStarsTool,
        fetchRepoContributorsTool,
      ],
      subAgents: Object.assign(
        [
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
        ],
        {
          calculator: workers.calculator,
          datetime: workers.datetime, 
          system_info: workers.systemInfo,
          fileops: workers.fileOps,
          git: workers.git,
          browser: workers.browser,
          coding: workers.coding,
          prompt_manager: workers.promptManager,
          debug: workers.debug,
          research: workers.research,
        }
      ),
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
      instructions: workerPrompts.calculator(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 0,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [calculatorTool, statisticsAnalysisTool],
      memory: createWorkerMemory("calculator"),
      hooks: createWorkerHooks("calculator"),
    });

    // DateTime worker agent
    const dateTimeWorker = new Agent({
      name: "AI-Volt-DateTime", 
      instructions: workerPrompts.datetime(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [dateTimeTool],
      memory: createWorkerMemory("datetime"),
      hooks: createWorkerHooks("datetime"),
    });

    // System Info worker agent
    const systemInfoWorker = new Agent({
      name: "AI-Volt-SystemInfo",
      instructions: workerPrompts.systemInfo(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [systemInfoTool],
      memory: createWorkerMemory("systeminfo"),
      hooks: createWorkerHooks("systeminfo"),
    });

    // File Operations worker agent - uses the coding tools for file operations
    const fileOpsWorker = new Agent({
      name: "AI-Volt-FileOps",
      instructions: workerPrompts.fileOps(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [fileSystemOperationsTool, secureCodeExecutorTool],
      memory: createWorkerMemory("fileops"),
      hooks: createWorkerHooks("fileops"),
    });

    // Git worker agent - uses git tools
    const gitWorker = new Agent({
      name: "AI-Volt-Git",
      instructions: workerPrompts.git(),
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
        runJsInspectTool,
        runEslintTool,
      ],
      memory: createWorkerMemory("git"),
      hooks: createWorkerHooks("git"),
    });

    // Browser worker agent - uses web browser tools
    const researchWorker = new Agent({
      name: "AI-Volt-Research",
      instructions: workerPrompts.research(),
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
      name: "AI-Volt-Coding",
      instructions: workerPrompts.coding(),
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
        getFileContentTool,
        listRepositoryContentsTool,
        listRepositoryHooksTool,
        createRepositoryHookTool,
        getUserProfileTool,
        listOrgMembersTool,
        createRepositoryTool,
        listPullRequestsTool,
        getPullRequestDetailsTool,
        createPullRequestTool,
        mergePullRequestTool,
        commentOnPullRequestTool,
        listPullRequestFilesTool,
        enhancedGitStatusTool,
        secureGitScriptTool,
        gitRepositoryAnalysisTool,
        runIsolatedCodeTool,
        runJsInspectTool,
        runEslintTool,
        identifySecurityAntiPatternsTool,
        analyzeCodeComplexityTool,
        analyzeLogPatternsTool,
        getAgentExecutionTimelineTool,
      ],
      memory: createWorkerMemory("coding"),
      hooks: createWorkerHooks("coding"),
    });

    // Prompt Management worker agent - NEW 2025 enhancement
    const promptManagerWorker = new Agent({
      name: "AI-Volt-PromptManager",
      instructions: workerPrompts.promptManager(),
      llm: new VercelAIProvider(),
      model: google('gemini-2.5-flash-preview-05-20'),
      providerOptions: {google: {thinkingConfig: {thinkingBudget: 1024,},} satisfies GoogleGenerativeAIProviderOptions,},
      tools: [
        promptManagementToolkit, // For managing prompts and instructions
        reasoningToolkit, // For complex prompt analysis
        calculatorTool, // For scoring and metrics
        webSearchTool, // For researching latest techniques
      ],
      memory: createWorkerMemory("prompt_manager"),
      hooks: createWorkerHooks("prompt_manager"),
    });

    // Debug worker agent - uses the coding tools for file oprations
    const debugWorker = new Agent({
      name: "AI-Volt-Debug",
      instructions: workerPrompts.debug(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [
        fileSystemOperationsTool, 
        secureCodeExecutorTool,
        getNodeProcessInfoTool,
        guideNodeProfilerTool,
        runIsolatedCodeTool,
        runJsInspectTool,
        runEslintTool,
        identifySecurityAntiPatternsTool,
        analyzeCodeComplexityTool,
        analyzeLogPatternsTool,
        getAgentExecutionTimelineTool,
      ],
      memory: createWorkerMemory("debug"),
      hooks: createWorkerHooks("debug"),
    });

    const browserWorker = new Agent({
      name: "AI-Volt-Browser",
      instructions: workerPrompts.browser(),
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
      name: "AI-Volt-KnowledgeBase",
      instructions: workerPrompts.knowledgeBase(),
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
      name: "AI-Volt-Data",
      instructions: workerPrompts.data(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [
        readDataFromFileTool,
        analyzeCsvDataTool,
        writeDataToFileTool,
        fileSystemOperationsTool, // Generic file system operations might be useful for data agent too
      ],
      memory: createWorkerMemory("data"),
      hooks: createWorkerHooks("data"),
    });

    // Cloud worker agent - NEW
    const cloudWorker = new Agent({
      name: "AI-Volt-Cloud",
      instructions: workerPrompts.cloud(),
      llm: new VercelAIProvider(),
      model: google("gemini-2.0-flash"),
      tools: [
        deployServiceTool,
        manageResourcesTool,
        monitorCloudTool,
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

