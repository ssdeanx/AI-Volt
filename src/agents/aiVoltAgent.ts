/**
 * AI-Volt Agent Configuration
 * Implements a supervisor agent with specialized sub-agents for different domains
 */

import {
  Agent,
  LibSQLStorage,
  createHooks,
  type OnStartHookArgs,
  type OnEndHookArgs,
  type OnToolEndHookArgs
} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { logger } from "../config/logger.js";
import { env } from "../config/environment.js";

// Specialized sub-agents will be wired in subAgents.ts
// import { createGitAgent } from "./gitAgent.js";
// import { createCodingAgent } from "./codingAgent.js";
// import { createDockerAgent } from "./dockerAgent.js";
// import { createDebugAgent } from "./debugAgent.js");

/**
 * Context symbols for type-safe userContext keys
 */
const CONTEXT_KEYS = {
  SESSION_ID: Symbol("aiVoltSessionId"),
  DELEGATION_ID: Symbol("delegationId"),
  WORKFLOW_ID: Symbol("workflowId"),
  DELEGATION_START: Symbol("delegationStart"),
  ACTIVE_DELEGATIONS: Symbol("activeDelegations"),
  DELEGATION_COUNT: Symbol("delegationCount"),
  CURRENT_DELEGATION: Symbol("currentDelegation"),
  RETRIEVER_ENABLED: Symbol("retrieverEnabled"),
  CONTEXT_RETRIEVALS: Symbol("contextRetrievals"),
  TASK_ID: Symbol("taskId"),
  SESSION_ID_WORKER: Symbol("sessionId"),
  AGENT_TYPE: Symbol("agentType"),
  START_TIME: Symbol("startTime"),
  PARENT_SESSION_ID: Symbol("parentSessionId"),
  DELEGATION_CHAIN: Symbol("delegationChain"),
  COORDINATOR_AGENT: Symbol("coordinatorAgent"),
  RETRIEVAL_COUNT: Symbol("retrievalCount"),
  RETRIEVAL_HISTORY: Symbol("retrievalHistory"),
} as const;

/**
 * Create hooks for the AI-Volt supervisor agent
 */
const createAIVoltHooks = () => createHooks({
  onStart: async ({ agent, context }: OnStartHookArgs) => {
    // Generate unique identifiers for this coordination session
    const sessionId = `ai-volt-session-${Date.now()}`;
    const delegationId = `delegation-${Date.now()}`;
    const workflowId = `workflow-${Date.now()}`;

    // Initialize context using symbols for type safety
    context.userContext.set(CONTEXT_KEYS.SESSION_ID, sessionId);
    context.userContext.set(CONTEXT_KEYS.DELEGATION_ID, delegationId);
    context.userContext.set(CONTEXT_KEYS.WORKFLOW_ID, workflowId);
    context.userContext.set(CONTEXT_KEYS.DELEGATION_START, Date.now());
    context.userContext.set(CONTEXT_KEYS.ACTIVE_DELEGATIONS, new Map());
    context.userContext.set(CONTEXT_KEYS.DELEGATION_COUNT, 0);
    context.userContext.set(CONTEXT_KEYS.COORDINATOR_AGENT, agent.name);
    context.userContext.set(CONTEXT_KEYS.RETRIEVAL_COUNT, 0);
    context.userContext.set(CONTEXT_KEYS.RETRIEVAL_HISTORY, []);

    logger.info(`[${agent.name}] AI-Volt coordination session started`, {
      sessionId,
      delegationId,
      workflowId,
      operationId: context.operationId,
      coordinator: agent.name,
      timestamp: new Date().toISOString()
    });
  },

  onEnd: async ({ agent, output: _output, error, context }: OnEndHookArgs) => {
    const sessionId = context.userContext.get(CONTEXT_KEYS.SESSION_ID);
    const delegationId = context.userContext.get(CONTEXT_KEYS.DELEGATION_ID);
    const delegationCount = context.userContext.get(CONTEXT_KEYS.DELEGATION_COUNT) || 0;
    const startTime = context.userContext.get(CONTEXT_KEYS.DELEGATION_START);
    const duration = startTime ? Date.now() - startTime : 0;

    logger.info(`[${agent.name}] AI-Volt session completed`, {
      sessionId,
      delegationId,
      operationId: context.operationId,
      delegations: delegationCount,
      durationMs: duration,
      success: !error,
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  },

  onToolEnd: async ({ agent, tool, output, error, context }: OnToolEndHookArgs) => {
    const requestId = context.userContext.get("requestId");
    const sessionId = context.userContext.get("sessionId");
    const toolStartTime = context.userContext.get(`toolStart-${tool.name}`) as number;
    const toolDuration = toolStartTime ? Date.now() - toolStartTime : 0;

    if (error) {
      logger.error(`[${agent.name}] Tool execution failed`, {
        requestId,
        sessionId,
        operationId: context.operationId,
        toolName: tool.name,
        duration: toolDuration,
        error: error.message,
      });
    } else {
      logger.info(`[${agent.name}] Tool execution completed`, {
        requestId,
        sessionId,
        operationId: context.operationId,
        toolName: tool.name,
        duration: toolDuration,
        outputPreview: typeof output === "string" ? output.substring(0, 100) : JSON.stringify(output).substring(0, 100)
      });
    }
  }
});

/**
 * Create memory storage for persistent conversation history
 */
const createMemoryStorage = () => {
  return new LibSQLStorage({
    url: "file:./.voltagent/ai-volt-memory.db", // Always use local SQLite for now
    // authToken: env.DATABASE_AUTH_TOKEN, // Not needed for local files
    tablePrefix: "ai_volt_memory",
    storageLimit: 1000, // Keep last 1000 messages per conversation
    debug: env.NODE_ENV === "development"
  });
};

/**
 * Create and configure the main AI-Volt agent
 * @param subAgents An array of worker agents to be supervised.
 */
export const createAIVoltAgent = (subAgents?: Agent<any>[]) => {
  logger.info("Creating AI-Volt agent", {
    model: "gemini-2.5-flash-preview-05-20",
    environment: env.NODE_ENV
  });

  // Initialize memory storage for conversation persistence
  const memoryStorage = createMemoryStorage();

  // Create comprehensive hooks for monitoring
  const hooks = createAIVoltHooks();

  const agent = new Agent({
    name: "AI-Volt",
    instructions: `You are AI-Volt, a sophisticated AI supervisor that coordinates between specialized sub-agents to solve complex tasks.`,
    llm: new VercelAIProvider(),
    model: google('gemini-2.5-flash-preview-05-20'),
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 2048 } } },
    tools: [],
    memory: memoryStorage,
    hooks: hooks,
    ...(subAgents && subAgents.length > 0 && { subAgents }), // Conditionally add subAgents
  });

  logger.info("AI-Volt agent created successfully", {
    memoryProvider: "LibSQLStorage",
    hooksEnabled: true,
    totalFeatures: ["tools", "memory", "hooks", "lifecycle-monitoring"]
  });

  return agent;
};

