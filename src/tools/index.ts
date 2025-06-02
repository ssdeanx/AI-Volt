/**
 * Tool registry and exports
 * Centralized management of all available tools
 */

export { calculatorTool } from "./calculator.js";
export { dateTimeTool } from "./datetime.js";
export { systemInfoTool } from "./systemInfo.js";
export { delegateTaskTool } from "./delegateTask.js";

// Export all tools as an array for easy registration
import { calculatorTool } from "./calculator.js";
import { dateTimeTool } from "./datetime.js";
import { systemInfoTool } from "./systemInfo.js";
import { delegateTaskTool } from "./delegateTask.js";

/**
 * Array of all available tools for the AI-Volt agent
 */
export const allTools = [
  calculatorTool,
  dateTimeTool,
  systemInfoTool,
  delegateTaskTool,
] as const;

/**
 * Tool categories for organizational purposes
 */
export const toolCategories = {
  math: [calculatorTool],
  utility: [dateTimeTool, systemInfoTool],
  system: [systemInfoTool],
  delegation: [delegateTaskTool],
} as const;
