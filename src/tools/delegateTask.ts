/**
 * Task delegation tool for supervisor/worker pattern
 * Allows supervisor agents to delegate tasks to specialized worker agents
 * Generated on 2025-06-02
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import { generateId } from "ai";

/**
 * Schema for task delegation requests
 */
const delegateTaskSchema = z.object({
  task_description: z.string().describe("Detailed description of the task to delegate"),
  agent_type: z.enum([
    "calculator",
    "datetime", 
    "system_info",
    "file_operations",
    "general"
  ]).describe("Type of specialized agent to delegate the task to"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium")
    .describe("Priority level of the task"),
  context: z.string().optional().describe("Additional context or background information"),
  expected_output: z.string().optional().describe("Description of expected output format"),
});

type DelegateTaskInput = z.infer<typeof delegateTaskSchema>;

/**
 * Task delegation tool implementation
 * This tool enables supervisor agents to delegate specialized tasks to worker agents
 */
export const delegateTaskTool = createTool({
  name: "delegate_task",
  description: "Delegate a specific task to a specialized worker agent. Use this when you need to perform specialized operations like calculations, date/time operations, system monitoring, or file operations.",
  parameters: delegateTaskSchema,
  execute: async ({
    task_description,
    agent_type,
    priority,
    context,
    expected_output
  }: DelegateTaskInput) => {
    try {
      const taskId = generateId();
      const timestamp = new Date().toISOString();
      
      logger.info("Delegating task", {
        taskId,
        agent_type,
        priority,
        task_description: task_description.substring(0, 100) + "..."
      });

      // Simulate task delegation to specialized worker agent
      const delegationResult = {
        task_id: taskId,
        status: "delegated",
        timestamp,
        delegated_to: agent_type,
        priority,
        task: {
          description: task_description,
          context: context || null,
          expected_output: expected_output || null
        },
        instructions: generateInstructionsForAgent(agent_type, task_description),
        estimated_completion: calculateEstimatedCompletion(priority, agent_type)
      };

      // Based on agent type, provide specific guidance
      switch (agent_type) {
        case "calculator":
          delegationResult.instructions += "\nUse the calculator tool for any mathematical operations, even simple arithmetic.";
          break;
        case "datetime":
          delegationResult.instructions += "\nUse the datetime tool for all date/time related operations including formatting, calculations, and timezone conversions.";
          break;
        case "system_info":
          delegationResult.instructions += "\nUse the system_info tool to retrieve comprehensive system information including memory, CPU, network, and process details.";
          break;
        case "file_operations":
          delegationResult.instructions += "\nUse MCP file server tools for file system operations including reading, writing, listing, and managing files.";
          break;
        case "general":
          delegationResult.instructions += "\nHandle this general task using available tools as appropriate.";
          break;
      }

      logger.info("Task successfully delegated", {
        taskId,
        agent_type,
        status: "delegated"
      });

      return delegationResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown delegation error";
      logger.error("Task delegation failed", error);
      
      throw new Error(`Task delegation failed: ${errorMessage}`);
    }
  },
});

/**
 * Generate specialized instructions based on agent type and task
 */
function generateInstructionsForAgent(agentType: string, taskDescription: string): string {
  const baseInstructions = `Task delegated to ${agentType} agent. Focus on: ${taskDescription}`;
  
  switch (agentType) {
    case "calculator":
      return `${baseInstructions}\n\nAs a calculator specialist, provide accurate mathematical computations with step-by-step explanations when helpful.`;
    case "datetime":
      return `${baseInstructions}\n\nAs a datetime specialist, handle all date/time operations with precision and provide clear formatting.`;
    case "system_info":
      return `${baseInstructions}\n\nAs a system monitoring specialist, provide comprehensive system information with clear explanations of metrics.`;
    case "file_operations":
      return `${baseInstructions}\n\nAs a file operations specialist, handle file system tasks safely and provide clear feedback on operations.`;
    default:
      return `${baseInstructions}\n\nHandle this task using your general capabilities and available tools.`;
  }
}

/**
 * Calculate estimated completion time based on priority and agent type
 */
function calculateEstimatedCompletion(priority: string, agentType: string): string {
  const baseTime = {
    calculator: 30,      // 30 seconds for math operations
    datetime: 15,        // 15 seconds for date operations  
    system_info: 45,     // 45 seconds for system queries
    file_operations: 60, // 60 seconds for file operations
    general: 90          // 90 seconds for general tasks
  };

  const priorityMultiplier = {
    urgent: 0.5,
    high: 0.7,
    medium: 1.0,
    low: 1.5
  };

  const estimatedSeconds = (baseTime[agentType as keyof typeof baseTime] || 90) * 
                          (priorityMultiplier[priority as keyof typeof priorityMultiplier] || 1.0);

  const completionTime = new Date(Date.now() + estimatedSeconds * 1000);
  return completionTime.toISOString();
}
