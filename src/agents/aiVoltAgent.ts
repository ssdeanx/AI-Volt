/**
 * AI-Volt Agent Configuration
 * Defines the main agent with comprehensive capabilities
 */

import { Agent, LibSQLStorage, createHooks, type OnStartHookArgs, type OnEndHookArgs, type OnToolStartHookArgs, type OnToolEndHookArgs } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { allTools } from "../tools/index.js";
import { logger } from "../config/logger.js";
import { env } from "../config/environment.js";

/**
 * Agent instructions that define its personality and capabilities
 */
const AGENT_INSTRUCTIONS = `You are AI-Volt, a sophisticated and helpful AI assistant with comprehensive capabilities.

CORE PERSONALITY:
- Professional yet approachable
- Precise and accurate in all calculations and information
- Proactive in suggesting relevant tools and solutions
- Clear and detailed in explanations

CAPABILITIES:
- Mathematical calculations (basic arithmetic, advanced operations, factorial, power, square root)
- Date and time operations (formatting, calculations, timezone conversions, differences)
- System information retrieval (memory, CPU, network, process details)
- Problem-solving and analysis across various domains

COMMUNICATION STYLE:
- Always acknowledge the user's request clearly
- Explain what tools you're using and why
- Provide context for your responses
- Offer additional related information when relevant
- Use structured formatting for complex responses

TOOL USAGE GUIDELINES:
- Use the calculator tool for any mathematical operations, even simple ones
- Use the datetime tool for all date/time related queries
- Use the system_info tool when users ask about system status or performance
- Always validate inputs and handle errors gracefully
- Provide formatted results that are easy to understand

When users ask questions, think about which tools might be helpful and use them proactively. Always strive to provide comprehensive and accurate responses.`;

/**
 * Create comprehensive hooks for lifecycle monitoring and debugging
 */
const createAIVoltHooks = () => createHooks({
  onStart: async ({ agent, context }: OnStartHookArgs) => {
    const requestId = `req-${Date.now()}`;
    const sessionId = `session-${Math.random().toString(16).substring(2, 8)}`;
    
    context.userContext.set("requestId", requestId);
    context.userContext.set("sessionId", sessionId);
    context.userContext.set("startTime", Date.now());
    
    logger.info(`[${agent.name}] Operation started`, {
      requestId,
      sessionId,
      operationId: context.operationId,
      timestamp: new Date().toISOString()
    });
  },

  onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
    const requestId = context.userContext.get("requestId");
    const sessionId = context.userContext.get("sessionId");
    const startTime = context.userContext.get("startTime") as number;
    const duration = Date.now() - startTime;

    if (error) {
      logger.error(`[${agent.name}] Operation failed`, {
        requestId,
        sessionId,
        operationId: context.operationId,
        duration,
        error: error.message,
        stack: error.stack
      });
    } else {
      logger.info(`[${agent.name}] Operation completed successfully`, {
        requestId,
        sessionId,
        operationId: context.operationId,
        duration,
        outputType: output && "text" in output ? "text" : output && "object" in output ? "object" : "unknown",
        usage: output && "usage" in output ? output.usage : undefined
      });
    }
  },

  onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
    const requestId = context.userContext.get("requestId");
    const sessionId = context.userContext.get("sessionId");
    
    context.userContext.set(`toolStart-${tool.name}`, Date.now());
    
    logger.info(`[${agent.name}] Tool execution started`, {
      requestId,
      sessionId,
      operationId: context.operationId,
      toolName: tool.name,
      toolDescription: tool.description,
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
        stack: error.stack
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
    url: env.DATABASE_URL || "file:./.voltagent/ai-volt-memory.db",
    authToken: env.DATABASE_AUTH_TOKEN,
    tablePrefix: "ai_volt_memory",
    storageLimit: 1000, // Keep last 1000 messages per conversation
    debug: env.NODE_ENV === "development"
  });
};

/**
 * Create and configure the main AI-Volt agent
 */
export const createAIVoltAgent = () => {
  logger.info("Creating AI-Volt agent", {
    model: "gemini-1.5-flash",
    toolCount: allTools.length,
    environment: env.NODE_ENV
  });

  // Initialize memory storage for conversation persistence
  const memoryStorage = createMemoryStorage();
  
  // Create comprehensive hooks for monitoring
  const hooks = createAIVoltHooks();
  
  const agent = new Agent({
    name: "AI-Volt",
    instructions: AGENT_INSTRUCTIONS,
    llm: new VercelAIProvider(),
    model: google("gemini-1.5-flash"),
    tools: allTools,
    memory: memoryStorage,
    hooks: hooks,
  });

  logger.info("AI-Volt agent created successfully", {
    memoryProvider: "LibSQLStorage",
    hooksEnabled: true,
    totalFeatures: ["tools", "memory", "hooks", "lifecycle-monitoring"]
  });
  
  return agent;
};

