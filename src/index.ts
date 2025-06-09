/**
 * AI-Volt - Advanced AI Agent with Supervisor/Worker Architecture
 * Main application entry point with multi-agent coordination
 * 
 * Updated on 2025-06-03
 */

import { VoltAgent, VoltAgentExporter } from "@voltagent/core";

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { createAIVoltAgent, createSupervisorAgent, createWorkerAgents } from "./agents/index.js";
// Removed: import { allTools, toolCategories } from "./tools/index.js"; 
// Assuming toolCategories are no longer needed here as agent creation functions handle tools.
import { logger } from "./config/logger.js";
import { env } from "./config/environment.js";

import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";

/**
 * Initialize and start the AI-Volt application with supervisor/worker pattern
 */
async function startAIVolt(): Promise<void> {
  try {
    logger.info("🚀 Starting AI-Volt application with multi-agent architecture", {
      environment: env.NODE_ENV,
      port: env.PORT,
      logLevel: env.LOG_LEVEL
    });
    // Create the main AI-Volt agent (monolithic)
    const aiVoltAgent = createAIVoltAgent();

    // Create supervisor agent for coordination
    const supervisorAgent = await createSupervisorAgent();

    // Create specialized worker agents (now async)
    const workerAgents = await createWorkerAgents();

    // Initialize VoltAgent with multi-agent configuration
    const voltAgent = new VoltAgent({
      agents: {
        // Main agent with all capabilities
        "ai-volt": aiVoltAgent,

        // Supervisor for coordinating tasks
        "supervisor": supervisorAgent,
//        "fact-checker": factCheckerAgent,
        // Specialized worker agents
        "calculator": workerAgents.calculator,
        "datetime": workerAgents.datetime,
        "system-info": workerAgents.systemInfo,
        "file-ops": workerAgents.fileOps,
        "git-ops": workerAgents.git,
        "browser-ops": workerAgents.browser,
        "coding-ops": workerAgents.coding,
//        "prompt-manager": workerAgents.promptManager,
        "debug": workerAgents.debug,
        "research": workerAgents.research,
        "knowledge-base": workerAgents.knowledgeBase, 
        "data": workerAgents.data,
        "cloud": workerAgents.cloud,
      },
      telemetryExporter: new VoltAgentExporter({
        publicKey: env.PK,
        secretKey: env.SK,
        baseUrl: "https://api.voltagent.dev"
      }),
    });
    
    // Initialize OpenTelemetry SDK
    const sdk = new NodeSDK({
      traceExporter: new ConsoleSpanExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    });
    
    sdk.start();
    // Fix: workerAgentKeysForLog is not defined, so use Object.keys(workerAgents)
    const workerAgentKeysForLog = Object.keys(workerAgents);
    // Instead of Object.keys(voltAgent.agents), use the keys we passed in
    const registeredAgentCount = 2 + workerAgentKeysForLog.length; // ai-volt + supervisor + workers

    logger.info("✅ AI-Volt multi-agent system started successfully", {
      agentCount: registeredAgentCount, 
      supervisorAgent: "supervisor",
      workerAgents: workerAgentKeysForLog,
      architecture: "Multi-agent with supervisor/worker pattern"
    });
    
    logger.info("🤖 AI-Volt agents are ready to assist!");
    
    // Log available capabilities  
    logger.info("🔧 Available capabilities:", {
      architecture: "Supervisor/Worker Pattern",
      mainAgent: {
        name: aiVoltAgent.name,
        capabilities: "Full functionality with all tools"
      },
      supervisorAgent: {
        name: supervisorAgent.name,
        role: "Task coordination and delegation"
      },
      workerAgents: {
        calculator: "Mathematical calculations",
        datetime: "Date/time operations", 
        systemInfo: "System monitoring",
        fileOps: "File operations",
        git: "Git version control",
        browser: "Web browsing and scraping",
        coding: "Code execution and analysis",
      },
      voltAgent: {
        id: voltAgent,
        role: "Multi-agent coordination and management"
      },
      delegationFeatures: [
        "Intelligent task routing",
        "Priority-based scheduling", 
        "Multi-agent coordination",
        "Specialized tool usage"
      ]
    });

    logger.info("🌐 VoltAgent server started", {
      port: env.PORT,
      url: `http://localhost:${env.PORT}`,
      console: "https://console.voltagent.dev"
    });

  } catch (error) {
    logger.error("❌ Failed to start AI-Volt application", error);
    process.exit(1);
  }
}
/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  logger.info("🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info("🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the application
startAIVolt().catch((error) => {
  logger.error("💥 Critical error during startup", error);
  process.exit(1);
});