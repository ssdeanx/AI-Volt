/**
 * Prompt Manager Toolkit for AI-Volt
 * Provides tools to dynamically list and retrieve prompts.
 * This optimized version uses a single 'get_prompt' tool instead of one tool per prompt.
 */
import { createToolkit, createTool, type Tool } from "@voltagent/core";
import { z } from "zod";
import { 
  aiVoltPrompts, 
  getPrompt, 
  type SupervisorPromptType, 
  type WorkerPromptType, 
  type UtilityPromptType 
} from "../prompts/index.js";

// Tool to list all available prompts
const listPromptsTool = createTool({
  name: "list_prompts",
  description: "Lists all available prompt categories and variants in the system.",
  parameters: z.object({}),
  async execute() {
      try {
      const availablePrompts = {
        supervisor: Object.keys(aiVoltPrompts.supervisor),
        worker: Object.keys(aiVoltPrompts.worker),
        utility: Object.keys(aiVoltPrompts.utility),
      };
      return { availablePrompts };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    }
  });

// Tool to get a specific prompt
const getPromptTool = createTool({
  name: "get_prompt",
  description: "Returns a rendered prompt string for a given category and variant. Accepts an optional 'variables' object.",
  parameters: z.object({
    category: z.enum(["supervisor", "worker", "utility"]),
    variant: z.string(),
    variables: z.record(z.any()).optional(),
  }),
  async execute(args) {
    const { category, variant, variables } = args;
    try {
      // The getPrompt function needs a more specific type for the variant
      const prompt = getPrompt(
        category, 
        variant as SupervisorPromptType | WorkerPromptType | UtilityPromptType, 
        variables
      );
      return { prompt };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
  }
}
});

const promptManagerToolkit = createToolkit({
  name: "prompt_manager_toolkit",
  description: "Toolkit for listing and retrieving system prompts.",
  instructions: `Use the 'list_prompts' tool to discover available prompts. Use the 'get_prompt' tool to retrieve a specific prompt, providing its 'category' and 'variant'.`,
  addInstructions: true,
  tools: [listPromptsTool, getPromptTool] as Tool<any>[],
});

export default promptManagerToolkit;
