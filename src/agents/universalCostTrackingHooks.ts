/**
 * Universal Cost and Usage Tracking Hooks
 * Provides cost tracking functionality for all agent API calls
 * Generated on 2025-06-10
 */

import { createHooks, type OnStartHookArgs, type OnEndHookArgs, type OnToolStartHookArgs, type OnToolEndHookArgs } from "@voltagent/core";
import { logger } from "../config/logger.js";

/**
 * Universal onEnd hook for cost and usage tracking.
 * Applies the "Non-thinking" rate to all agent API calls.
 * 
 * @param baseHooks - Optional existing hooks to merge with cost tracking
 * @returns Enhanced hooks with cost tracking capabilities
 */
export const createUniversalCostTrackingHooks = (baseHooks?: ReturnType<typeof createHooks>) => {
  return createHooks({
    onStart: async (args: OnStartHookArgs) => {
      // Call base onStart hook if provided
      await baseHooks?.onStart?.(args);
    },

    onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
      // Call base onEnd hook first if provided
      await baseHooks?.onEnd?.({ agent, output, error, context });

      // Check if there was any LLM usage to track
      if (context.llmUsage) {
        const { promptTokens, completionTokens, totalTokens } = context.llmUsage;
        
        // --- Official Pricing for Gemini 2.5 Flash Preview (Paid Tier, Non-Thinking) ---
        const inputCost = (promptTokens / 1_000_000) * 0.15;      // $0.15 per 1M input tokens
        const outputCost = (completionTokens / 1_000_000) * 0.60;   // $0.60 per 1M output tokens
        const totalCost = inputCost + outputCost;

        // Get task/session identifiers - works for both workers and supervisor
        const taskId = context.userContext.get("taskId") || 
                      context.userContext.get("sessionId") ||
                      context.operationId;

        logger.info(`[${agent.name}] Token Usage & Cost`, {
          taskId,
          modelUsed: agent.model.modelId,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost: `$${totalCost.toFixed(8)}`,
          inputCost: `$${inputCost.toFixed(8)}`,
          outputCost: `$${outputCost.toFixed(8)}`,
          operationId: context.operationId,
          timestamp: new Date().toISOString(),
          agentType: context.userContext.get("agentType") || "unknown",
          success: !error
        });

        // Store cost information in context for potential aggregation
        context.userContext.set("llmCost", totalCost);
        context.userContext.set("llmTokens", totalTokens);
      }

      // Handle errors or final logging
      if (error) {
        logger.warn(`[${agent.name}] Operation completed with error`, {
          operationId: context.operationId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    },

    onToolStart: async (args: OnToolStartHookArgs) => {
      // Call base onToolStart hook if provided
      await baseHooks?.onToolStart?.(args);
    },

    onToolEnd: async (args: OnToolEndHookArgs) => {
      // Call base onToolEnd hook if provided
      await baseHooks?.onToolEnd?.(args);
    }
  });
};

/**
 * Enhanced worker hooks creator that includes cost tracking
 * @param agentType - The type of the worker agent
 * @param baseHooks - Optional existing hooks to enhance
 * @returns Worker hooks with cost tracking
 */
export const createWorkerHooksWithCostTracking = (agentType: string, baseHooks?: ReturnType<typeof createHooks>) => {
  const workerHooks = createHooks({
    onStart: async ({ agent, context }: OnStartHookArgs) => {
      const taskId = `${agentType}-task-${Date.now()}`;
      const sessionId = `${agentType}-${Date.now()}`;
      
      context.userContext.set("taskId", taskId);
      context.userContext.set("sessionId", sessionId);
      context.userContext.set("agentType", agentType);
      context.userContext.set("startTime", Date.now());
      
      logger.info(`[${agent.name}] Worker task started`, {
        taskId,
        sessionId,
        agentType,
        operationId: context.operationId,
        timestamp: new Date().toISOString()
      });

      // Call base onStart if provided
      await baseHooks?.onStart?.({ agent, context });
    },

    onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
      const taskId = context.userContext.get("taskId");
      const sessionId = context.userContext.get("sessionId");
      const agentType = context.userContext.get("agentType");
      const startTime = context.userContext.get("startTime") as number;
      const duration = Date.now() - startTime;

      // Log completion
      if (error) {
        logger.error(`[${agent.name}] Worker task failed`, {
          taskId,
          sessionId,
          agentType,
          operationId: context.operationId,
          duration,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        logger.info(`[${agent.name}] Worker task completed`, {
          taskId,
          sessionId,
          agentType,
          operationId: context.operationId,
          duration,
          success: true
        });
      }

      // Call base onEnd if provided
      await baseHooks?.onEnd?.({ agent, output, error, context });
    },

    onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
      const taskId = context.userContext.get("taskId");
      context.userContext.set(`toolStart-${tool.name}`, Date.now());
      
      logger.debug(`[${agent.name}] Tool execution started`, {
        taskId,
        toolName: tool.name,
        operationId: context.operationId,
        timestamp: new Date().toISOString()
      });

      // Call base onToolStart if provided
      await baseHooks?.onToolStart?.({ agent, tool, context });
    },

    onToolEnd: async ({ agent, tool, output, error, context }: OnToolEndHookArgs) => {
      const taskId = context.userContext.get("taskId");
      const toolStartTime = context.userContext.get(`toolStart-${tool.name}`) as number;
      const toolDuration = toolStartTime ? Date.now() - toolStartTime : 0;

      if (error) {
        logger.error(`[${agent.name}] Tool execution failed`, {
          taskId,
          toolName: tool.name,
          duration: toolDuration,
          error: error instanceof Error ? error.message : String(error),
          operationId: context.operationId
        });
      } else {
        logger.info(`[${agent.name}] Tool execution completed`, {
          taskId,
          toolName: tool.name,
          duration: toolDuration,
          operationId: context.operationId
        });
      }

      // Call base onToolEnd if provided
      await baseHooks?.onToolEnd?.({ agent, tool, output, error, context });
    }
  });

  // Apply universal cost tracking
  return createUniversalCostTrackingHooks(workerHooks);
};

/**
 * Enhanced supervisor hooks creator that includes cost tracking
 * @param baseHooks - Optional existing hooks to enhance  
 * @returns Supervisor hooks with cost tracking
 */
export const createSupervisorHooksWithCostTracking = (baseHooks?: ReturnType<typeof createHooks>) => {
  return createUniversalCostTrackingHooks(baseHooks);
};
