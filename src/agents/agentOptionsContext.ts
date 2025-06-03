// Filename: agentOptionsContext.ts
import {
  Agent,
  createHooks,
  type OnStartHookArgs,
  type OnEndHookArgs,
} from "@voltagent/core";
import { google } from "@ai-sdk/google";
import { VercelAIProvider } from "@voltagent/vercel-ai";
// Agent receives userContext via generateText options
const agentReceivingContext = new Agent({
  name: "OptionsContextAgent",
  instructions: `You are a specialized agent for analyzing user feedback.`,
  llm: new VercelAIProvider(),
  model: google("gemini-2.0-flash"),
  tools: [],
  hooks: createHooks({
    onStart: ({ agent, context }: OnStartHookArgs) => {
      // Reads data passed in via options
      const externalTraceId = context.userContext.get("traceId");
      console.log(
        `[${agent.name}] HOOK: Operation started. Received traceId from options: ${externalTraceId}`
      );
      // Can also add more context if needed
      context.userContext.set("hookProcessed", true);
    },
    onEnd: ({ agent, context }: OnEndHookArgs) => {
      const externalTraceId = context.userContext.get("traceId");
      const processed = context.userContext.get("hookProcessed");
      console.log(
        `[${agent.name}] HOOK: Operation ended. TraceId: ${externalTraceId}, Processed by hook: ${processed}`
      );
    },
  }),
});

/**
 * Generates text using the agent and passes context via options
 * @param {string}
 */
async function runOptionsContextTask() {
  console.log("\n--- Running Task: Context Passed via Options ---");
  const initialContext = new Map<string | symbol, unknown>();
  initialContext.set("traceId", `trace-${Date.now()}`);
  initialContext.set("userId", "user123");

  await agentReceivingContext.generateText("Analyze this user feedback.", {
    userContext: initialContext,
  });
}
runOptionsContextTask();