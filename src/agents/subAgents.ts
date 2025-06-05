import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { createSupervisorAgent } from "./supervisorAgent.js";


// Create a new specialized agent
export const factCheckerAgent = new Agent({
  name: "Fact Checker Agent",
  instructions: "You verify facts and provide accurate information.",
  llm: new VercelAIProvider(),
  model: google("gemini-2.5-flash-preview-05-20"),
});

// Add the agent as a subAgent to the supervisor
// This also registers the relationship in AgentRegistry
createSupervisorAgent().then(supervisorAgent => {
  supervisorAgent.addSubAgent(factCheckerAgent);
});