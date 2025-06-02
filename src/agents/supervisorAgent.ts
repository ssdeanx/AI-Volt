/**
 * Supervisor Agent Configuration
 * Manages and coordinates specialized worker agents using delegation pattern
 * Generated on 2025-06-02
 */

import { Agent, LibSQLStorage, createHooks, type OnStartHookArgs, type OnEndHookArgs, type OnToolStartHookArgs, type OnToolEndHookArgs, type OnHandoffHookArgs } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { delegateTaskTool } from "../tools/delegateTask.js";
import { logger } from "../config/logger.js";
import { env } from "../config/environment.js";

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
- For file operations, reading/writing files → delegate to "file_operations" agent
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
    const delegationId = `delegation-${Date.now()}`;
    const workflowId = `workflow-${Math.random().toString(16).substring(2, 8)}`;
    
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
        error: error.message
      });
    } else {
      logger.info(`[${agent.name}] Coordination session completed`, {
        delegationId,
        workflowId,
        operationId: context.operationId,
        duration,
        totalDelegations: activeDelegations?.size || 0,
        delegatedTasks: Array.from(activeDelegations || [])
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
          error: error.message
        });
      } else {
        // Track successful delegation
        const taskId = `task-${Date.now()}`;
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

  onHandoff: async ({ agent, sourceAgent }: OnHandoffHookArgs) => {
    logger.info(`[${agent.name}] Task handoff received`, {
      targetAgent: agent.name,
      sourceAgent: sourceAgent.name,
      handoffType: "supervisor-coordination",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create memory storage for supervisor coordination history
 */
const createSupervisorMemory = () => {
  return new LibSQLStorage({
    url: env.DATABASE_URL || "file:./.voltagent/supervisor-memory.db",
    authToken: env.DATABASE_AUTH_TOKEN,
    tablePrefix: "supervisor_memory",
    storageLimit: 500, // Keep coordination history
    debug: env.NODE_ENV === "development"
  });
};

/**
 * Create and configure the supervisor agent
 */
export const createSupervisorAgent = () => {
  logger.info("Creating AI-Volt supervisor agent", {
    model: "gemini-1.5-flash",
    role: "supervisor",
    environment: env.NODE_ENV
  });

  // Initialize memory storage for coordination history
  const memoryStorage = createSupervisorMemory();
  
  // Create comprehensive hooks for delegation monitoring
  const hooks = createSupervisorHooks();

  const supervisorAgent = new Agent({
    name: "AI-Volt-Supervisor",
    instructions: SUPERVISOR_INSTRUCTIONS,
    llm: new VercelAIProvider(),
    model: google("gemini-1.5-flash"),
    tools: [delegateTaskTool],
    memory: memoryStorage,
    hooks: hooks,
  });

  logger.info("AI-Volt supervisor agent created successfully", {
    memoryProvider: "LibSQLStorage",
    hooksEnabled: true,
    totalFeatures: ["delegation", "memory", "hooks", "coordination-monitoring"]
  });
  
  return supervisorAgent;
};

/**
 * Create memory storage for worker agent operations
 */
const createWorkerMemory = (agentType: string) => {
  return new LibSQLStorage({
    url: env.DATABASE_URL || `file:./.voltagent/${agentType}-memory.db`,
    authToken: env.DATABASE_AUTH_TOKEN,
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
    const taskId = `${agentType}-task-${Date.now()}`;
    const sessionId = `${agentType}-${Math.random().toString(16).substring(2, 8)}`;
    
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
        stack: error.stack
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
        stack: error.stack
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
 */
export const createWorkerAgents = () => {
  logger.info("Creating specialized worker agents");

  // Calculator worker agent
  const calculatorWorker = new Agent({
    name: "AI-Volt-Calculator",
    instructions: `You are a specialized calculator agent. Your primary role is to perform mathematical calculations with high precision and provide clear explanations. Always use the calculator tool for any mathematical operations, even simple arithmetic. Provide step-by-step explanations when helpful.`,
    llm: new VercelAIProvider(),
    model: google("gemini-1.5-flash"),
    tools: [], // Will be populated with calculator tools
    memory: createWorkerMemory("calculator"),
    hooks: createWorkerHooks("calculator"),
  });

  // DateTime worker agent
  const dateTimeWorker = new Agent({
    name: "AI-Volt-DateTime", 
    instructions: `You are a specialized date and time agent. Handle all date/time operations including formatting, calculations, timezone conversions, and scheduling operations. Always use the datetime tool for time-related queries. Provide clear, formatted responses with proper timezone information.`,
    llm: new VercelAIProvider(),
    model: google("gemini-1.5-flash"),
    tools: [], // Will be populated with datetime tools
    memory: createWorkerMemory("datetime"),
    hooks: createWorkerHooks("datetime"),
  });

  // System Info worker agent
  const systemInfoWorker = new Agent({
    name: "AI-Volt-SystemInfo",
    instructions: `You are a specialized system monitoring agent. Provide comprehensive system information including memory usage, CPU details, network interfaces, and process information. Always use the system_info tool for system queries. Explain metrics clearly and provide context for system health.`,
    llm: new VercelAIProvider(),
    model: google("gemini-1.5-flash"),
    tools: [], // Will be populated with system info tools
    memory: createWorkerMemory("systeminfo"),
    hooks: createWorkerHooks("systeminfo"),
  });

  // File Operations worker agent
  const fileOpsWorker = new Agent({
    name: "AI-Volt-FileOps",
    instructions: `You are a specialized file operations agent. Handle all file system operations safely and efficiently using MCP file server patterns. Always use the mcp_file_server tool for file operations. Provide clear feedback on operations and ensure data safety.`,
    llm: new VercelAIProvider(),
    model: google("gemini-1.5-flash"),
    tools: [], // Will be populated with file operation tools
    memory: createWorkerMemory("fileops"),
    hooks: createWorkerHooks("fileops"),
  });

  const workers = {
    calculator: calculatorWorker,
    datetime: dateTimeWorker,
    systemInfo: systemInfoWorker,
    fileOps: fileOpsWorker
  };

  logger.info("Specialized worker agents created successfully", {
    workerCount: Object.keys(workers).length,
    workers: Object.keys(workers),
    memoryProviders: "LibSQLStorage per agent",
    hooksEnabled: true,
    features: ["specialized-tools", "memory", "hooks", "performance-monitoring"]
  });

  return workers;
};
