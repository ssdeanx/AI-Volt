/* eslint-disable sonarjs/todo-tag */
/* eslint-disable sonarjs/different-types-comparison */
// Generated on 2025-06-08
import {
  Agent,
  LibSQLStorage,
  createHooks,
  type AgentHooks, 
  type OnStartHookArgs,
  type OnEndHookArgs,
  type OnToolStartHookArgs,
  type OnToolEndHookArgs,
  type Toolkit, 
  type Tool,
} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { generateId } from "ai";
import { logger } from "../config/logger.js";
import { env } from "../config/environment.js";
import { createAIVoltAgent } from "./aiVoltAgent.js";

// Tool Imports
import { enhancedGitToolkit } from "../tools/enhancedGitTool.js"; 
import { gitTool } from "../tools/gitTool.js"; 
import {
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  sandboxedCodeExecutorTool,
  // TODO: 2025-06-08 - Add more coding tools as needed from codingTools.js (e.g., deleteFileTool, createDirectoryTool)
} from "../tools/codingTools.js";


// TODO: 2025-06-08 - Define more specific context keys if needed for these sub-agents,
// or reuse/centralize if appropriate. For now, creating a distinct set.
const NEW_WORKER_CONTEXT_KEYS = {
  TASK_ID: Symbol("newWorkerTaskId"),
  SESSION_ID: Symbol("newWorkerSessionId"),
  AGENT_TYPE: Symbol("newWorkerAgentType"),
  START_TIME: Symbol("newWorkerStartTime"),
  PARENT_SESSION_ID: Symbol("newWorkerParentSessionId"), 
  OPERATION_ID: Symbol("newWorkerOperationId"),
} as const;

/**
 * Creates memory storage for a new worker agent.
 * @param agentType - The type of the agent, used for naming the database file.
 * @returns A LibSQLStorage instance.
 * @internal
 */
function createNewWorkerMemory(agentType: string): LibSQLStorage {
  // Generated on 2025-06-08
  return new LibSQLStorage({
    url: `file:./.voltagent/${agentType}-memory.db`,
    tablePrefix: `${agentType}_memory`,
    storageLimit: 200, 
    debug: env.NODE_ENV === "development",
  });
}

/**
 * Creates worker-specific hooks for new specialized agent monitoring.
 * @param agentType - The type of the agent.
 * @returns AgentHooks for the worker agent.
 * @internal
 */
function createNewWorkerHooks(agentType: string): AgentHooks {
  // Generated on 2025-06-08
  return createHooks({
    onStart: async ({ agent, context }: OnStartHookArgs) => {
      const taskId = `${agentType}-task-${generateId()}`;
      const sessionId = `${agentType}-session-${generateId()}`;

      context.userContext.set(NEW_WORKER_CONTEXT_KEYS.TASK_ID, taskId);
      context.userContext.set(NEW_WORKER_CONTEXT_KEYS.SESSION_ID, sessionId);
      context.userContext.set(NEW_WORKER_CONTEXT_KEYS.AGENT_TYPE, agentType);
      context.userContext.set(NEW_WORKER_CONTEXT_KEYS.START_TIME, Date.now());
      context.userContext.set(NEW_WORKER_CONTEXT_KEYS.OPERATION_ID, context.operationId);

      logger.info(`[${agent.name} (${agentType})] New Worker task started`, {
        taskId,
        sessionId,
        operationId: context.operationId,
        timestamp: new Date().toISOString(),
      });
    },
    onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
      const taskId = context.userContext.get(NEW_WORKER_CONTEXT_KEYS.TASK_ID);
      const sessionId = context.userContext.get(NEW_WORKER_CONTEXT_KEYS.SESSION_ID);
      const startTime = context.userContext.get(NEW_WORKER_CONTEXT_KEYS.START_TIME) as number;
      const duration = Date.now() - startTime;
      let outputPreview = "";
      if (typeof output === 'string') {
        outputPreview = (output as string).slice(0,100);
      } else if (output !== null && typeof output !== 'undefined') { // Reverted to != null
        try {
            outputPreview = JSON.stringify(output).slice(0,100);
        } catch (e: any) {
            logger.warn(`[${agent.name} (${agentType})] Could not stringify output for preview`, { taskId, error: e.message });
            outputPreview = "[Non-JSONable output]";
        }
      }

      if (error) {
        logger.error(`[${agent.name} (${agentType})] New Worker task failed`, {
          taskId,
          sessionId,
          operationId: context.userContext.get(NEW_WORKER_CONTEXT_KEYS.OPERATION_ID),
          durationMs: duration,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.info(`[${agent.name} (${agentType})] New Worker task completed`, {
          taskId,
          sessionId,
          operationId: context.userContext.get(NEW_WORKER_CONTEXT_KEYS.OPERATION_ID),
          durationMs: duration,
          outputPreview,
          success: true,
          timestamp: new Date().toISOString(),
        });
      }
    },    onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
      const taskId = context.userContext.get(NEW_WORKER_CONTEXT_KEYS.TASK_ID);
      context.userContext.set(`toolStart-${tool.name}`, Date.now());
      logger.info(`[${agent.name} (${agentType})] New Worker tool execution started`, {
        taskId,
        sessionId: context.userContext.get(NEW_WORKER_CONTEXT_KEYS.SESSION_ID),
        operationId: context.userContext.get(NEW_WORKER_CONTEXT_KEYS.OPERATION_ID),
        toolName: tool.name,
        timestamp: new Date().toISOString(),
      });
    },
    onToolEnd: async ({ agent, tool, output, error, context }: OnToolEndHookArgs) => {
      const taskId = context.userContext.get(NEW_WORKER_CONTEXT_KEYS.TASK_ID);
      const toolStartTime = context.userContext.get(`toolStart-${tool.name}`) as number;
      const toolDuration = toolStartTime ? Date.now() - toolStartTime : 0;
      let toolOutputPreview = "";
      if (typeof output === 'string') {
        toolOutputPreview = (output as string).slice(0,100); // Changed substring to slice
      } else if (output !== null && typeof output !== 'undefined') { // Reverted to != null
        try {
            toolOutputPreview = JSON.stringify(output).slice(0,100); // Changed substring to slice
        } catch (e: any) {
            logger.warn(`[${agent.name} (${agentType})] Could not stringify tool output for preview`, { taskId, toolName: tool.name, error: e.message });
            toolOutputPreview = "[Non-JSONable output]";
        }
      }

      if (error) {
        logger.error(`[${agent.name} (${agentType})] New Worker tool execution failed`, {
          taskId,
          sessionId: context.userContext.get(NEW_WORKER_CONTEXT_KEYS.SESSION_ID),
          operationId: context.userContext.get(NEW_WORKER_CONTEXT_KEYS.OPERATION_ID),
          toolName: tool.name,
          duration: toolDuration,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.info(`[${agent.name} (${agentType})] New Worker tool execution completed`, {
          taskId,
          sessionId: context.userContext.get(NEW_WORKER_CONTEXT_KEYS.SESSION_ID),
          operationId: context.userContext.get(NEW_WORKER_CONTEXT_KEYS.OPERATION_ID),
          toolName: tool.name,
          duration: toolDuration,
          outputPreview: toolOutputPreview,
          timestamp: new Date().toISOString(),
        });
      }
    },
  });
}

/**
 * Creates a new Git worker agent with full capabilities.
 * @returns A Git agent.
 * @internal
 */
function createNewGitAgent(): Agent<any> {
  // Generated on 2025-06-08
  const agentType = "NewGitWorker";
  const tools: (Toolkit | Tool<any>)[] = [
    enhancedGitToolkit, 
    gitTool,            
  ];
  return new Agent({
    name: agentType,
    instructions: "You are a specialized Git agent. You can perform a wide range of Git operations using the provided tools, including staging, committing, pushing, pulling, branching, and inspecting repository status. Prioritize using tools from the 'Enhanced Git Toolkit' for security and reliability where possible.",
    llm: new VercelAIProvider(),
    model: google('gemini-2.0-flash'), // Ensured model name is updated 1.5 is deprecated
    tools,
    memory: createNewWorkerMemory(agentType),
    hooks: createNewWorkerHooks(agentType),
  });
}

/**
 * Creates a new Coding worker agent with full capabilities.
 * @returns A Coding agent.
 * @internal
 */
function createNewCodingAgent(): Agent<any> {
  // Generated on 2025-06-08
  const agentType = "NewCodingWorker";
  const tools: Tool<any>[] = [
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    sandboxedCodeExecutorTool,
    // TODO: 2025-06-08 - Add more coding tools as needed from codingTools.js (e.g., deleteFileTool, createDirectoryTool)
  ];
  return new Agent({
    name: agentType,
    instructions: "You are a specialized Coding agent. You can read, write, and list files, and execute code in a sandboxed environment. Use these tools to implement features, fix bugs, or analyze code as requested.",
    llm: new VercelAIProvider(),
    model: google('gemini-2.0-flash'), // Ensured model name is updated 1.5 is deprecated
    tools,
    memory: createNewWorkerMemory(agentType),
    hooks: createNewWorkerHooks(agentType),
  });
}

// TODO: 2025-06-08 - Add more worker agent creation functions here (e.g., Docker, Debug)

/**
 * Assembles all defined new worker agents.
 * @returns A record of worker agents.
 * @internal
 */
function _assembleNewWorkerAgents(): Record<string, Agent<any>> { // Made synchronous
  // Generated on 2025-06-08
  const workers: Record<string, Agent<any>> = {
    newGitAgent: createNewGitAgent(),
    newCodingAgent: createNewCodingAgent(),
  };
  logger.info("Assembled new worker agents in subAgents.ts", { workerNames: Object.keys(workers) });
  return workers;
}

/**
 * Create and initialize the supervisor agent and its new set of worker agents
 * defined within this file. This is the primary function to set up the new agent system.
 * @returns An object containing the supervisor agent and the collection of worker agents.
 */
export function createNewSubAgentSystem(): Agent<any>[] {
  // Generated on 2025-06-08
  logger.info("Initializing new sub-agent system with modular worker agents.");

  const workers = _assembleNewWorkerAgents();
  const workerArray = Object.values(workers);

  logger.info(`Successfully initialized ${workerArray.length} new worker agents.`, { workerNames: workerArray.map(w => w.name) });
  return workerArray;
}

/**
 * @deprecated Prefer `createNewSubAgentSystem` for a more modular approach.
 * This function is kept for backward compatibility during transition.
 * It now internally calls `createNewSubAgentSystem` and then creates an AI-Volt agent
 * with those sub-agents, mimicking the old behavior but using the new worker definitions.
 */
export const createSubAgents = (): Agent<any> => {
  // Generated on 2025-06-08
  logger.warn("DEPRECATED USAGE: `createSubAgents` was called. Please migrate to `createNewSubAgentSystem` for managing worker agents and initialize the supervisor agent (e.g., AI-Volt) separately by passing the workers to it.");
  const subAgentWorkers = createNewSubAgentSystem();
  return createAIVoltAgent(subAgentWorkers);
};

// TODO: 2025-06-08 - Remove the old createSubAgents function and related supervisor logic from this file
// once all usages are migrated to createNewSubAgentSystem and the new AI-Volt supervisor pattern.

// TODO: 2025-06-08 - Implement NewDockerAgent
// function createNewDockerAgent(): Agent<any> { ... }

// TODO: 2025-06-08 - Implement NewDebugAgent
// function createNewDebugAgent(): Agent<any> { ... }