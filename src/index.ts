/**
 * AI-Volt - Advanced AI Agent with Supervisor/Worker Architecture
 * Main application entry point with multi-agent coordination
 * 
 * Updated on 2025-06-02
 */

import { VoltAgent } from "@voltagent/core";
import { createAIVoltAgent, createSupervisorAgent, createWorkerAgents } from "./agents/index.js";
import { allTools, toolCategories } from "./tools/index.js";
import { logger } from "./config/logger.js";
import { env } from "./config/environment.js";

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
    const supervisorAgent = createSupervisorAgent();

    // Create specialized worker agents
    const workerAgents = createWorkerAgents();

    // Assign specialized tools to worker agents
    workerAgents.calculator.tools = toolCategories.math;
    workerAgents.datetime.tools = [toolCategories.utility[0]]; // dateTimeTool
    workerAgents.systemInfo.tools = [toolCategories.system[0]]; // systemInfoTool  
    workerAgents.fileOps.tools = toolCategories.files;

    // Initialize VoltAgent with multi-agent configuration
    const voltAgent = new VoltAgent({
      agents: {
        // Main agent with all capabilities
        "ai-volt": aiVoltAgent,
        
        // Supervisor for coordinating tasks
        "supervisor": supervisorAgent,
        
        // Specialized worker agents
        "calculator": workerAgents.calculator,
        "datetime": workerAgents.datetime,
        "system-info": workerAgents.systemInfo,
        "file-ops": workerAgents.fileOps
      },
    });

    logger.info("✅ AI-Volt multi-agent system started successfully", {
      agentCount: 6,
      supervisorAgent: "supervisor",
      workerAgents: Object.keys(workerAgents),
      totalTools: allTools.length
    });
    
    logger.info("🤖 AI-Volt agents are ready to assist!");
    
    // Log available capabilities  
    logger.info("🔧 Available capabilities:", {
      architecture: "Supervisor/Worker Pattern",
      mainAgent: {
        tools: allTools.length,
        capabilities: "Full functionality"
      },
      supervisorAgent: {
        role: "Task coordination and delegation",
        tools: ["delegate_task"]
      },
      workerAgents: {
        calculator: "Mathematical operations",
        datetime: "Date/time processing", 
        systemInfo: "System monitoring",
        fileOps: "File system operations"
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