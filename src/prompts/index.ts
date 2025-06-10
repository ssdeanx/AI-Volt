// Generated on December 18, 2024
import { 
  createPrompt, 
  PromptTemplate, 
  PromptCreator, 
  TemplateVariables,
  ExtractVariableNames,
  AllowedVariableValue
} from "@voltagent/core";

/**
 * AI-Volt Prompt System
 * 
 * This module leverages @voltagent/core's prompt management utilities:
 * - ExtractVariableNames<T>: Extracts variable names from template strings like {{variableName}}
 * - AllowedVariableValue: Union type for valid variable values (string | number | boolean | undefined | null)
 * - TemplateVariables<T>: Maps extracted variable names to their allowed values
 * - PromptTemplate<T>: Configuration object with template and variables
 * - PromptCreator<T>: Function that generates prompt strings with optional extra variables
 */

// --- Type Utilities for Prompt Validation ---

/**
 * Utility type to extract variable names from any template string.
 * Demonstrates usage of ExtractVariableNames from @voltagent/core.
 * 
 * @example
 * ```typescript
 * type Variables = ExtractedVariables<"Hello {{name}}, you are {{age}} years old">;
 * // Result: "name" | "age"
 * ```
 */
export type ExtractedVariables<T extends string> = ExtractVariableNames<T>;

/**
 * Type-safe variable value constraint.
 * Ensures all variable values conform to AllowedVariableValue from @voltagent/core.
 * 
 * @example
 * ```typescript
 * const value: ValidVariableValue = "string" | 42 | true | null | undefined;
 * ```
 */
export type ValidVariableValue = AllowedVariableValue;

// --- Supervisor Prompts ---

const supervisorPromptTemplate = `You are {{agentName}}, orchestrating specialized workers in AI-Volt.

ROLE: {{roleDescription}}
- Analyze requests, decompose into subtasks, delegate to optimal agents
- Synthesize worker results into comprehensive responses
- Maintain context through multi-step tasks

SECURITY: Validate inputs, sanitize data, least privilege delegation, audit trail

WORKFLOW:
1. Validate user request security
2. Analyze context, use RAG if needed
3. Decompose into agent-suitable subtasks  
4. Delegate via \`subAgents\` (not delegate_task tool)
5. Monitor progress, handle errors
6. Synthesize and validate responses
7. Learn from outcomes

COMMUNICATION: {{communicationStyle}} - clear, actionable, contextual responses with agent attribution when appropriate.` as const;

const supervisorPromptVariables: TemplateVariables<typeof supervisorPromptTemplate> = {
  agentName: "SupervisorAgent",
  roleDescription: "Coordinates a team of specialized AI worker agents using secure, adaptive delegation and robust context management.",
  communicationStyle: "Professional, clear, concise, and security-aware",
};

const supervisorPromptConfig: PromptTemplate<typeof supervisorPromptTemplate> = {
  template: supervisorPromptTemplate,
  variables: supervisorPromptVariables,
};

/**
 * Creates a prompt for the Supervisor agent.
 * The Supervisor agent is responsible for analyzing user requests, decomposing them into subtasks,
 * delegating tasks to appropriate worker agents via its \`subAgents\` configuration, and synthesizing their results.
 * It emphasizes security, context management, and efficient orchestration.
 */
export const supervisorPrompt: PromptCreator<typeof supervisorPromptTemplate> = createPrompt(supervisorPromptConfig);

const supervisorRAGPromptTemplate = `{{baseInstructions}}

RAG MODE: {{ragMode}} with {{retrievalStrategy}}
Knowledge: {{knowledgeBaseName}}

ENHANCED WORKFLOW:
1. Query knowledge base for context
2. Use retrieved context for informed delegation
3. Augment responses with knowledge insights
4. Update knowledge base if applicable

DECISIONS: {{ragDecisionGuidelines}}` as const;

const supervisorRAGPromptVariables: TemplateVariables<typeof supervisorRAGPromptTemplate> = {
  baseInstructions: supervisorPromptTemplate, // Uses the full supervisor template as base
  knowledgeBaseName: "AI-Volt Internal Knowledge Base",
  ragMode: "Selective - retrieve when specialized knowledge, historical context, or complex decision support is needed.",
  retrievalStrategy: "Semantic search on task description and user query to find relevant documents and past interactions.",
  ragDecisionGuidelines: "Leverage retrieved context to: 1. Refine task decomposition. 2. Select the most appropriate agent(s). 3. Provide agents with pertinent background information. 4. Augment final responses with factual data from the knowledge base. 5. Identify knowledge gaps for future learning.",
};

const supervisorRAGPromptConfig: PromptTemplate<typeof supervisorRAGPromptTemplate> = {
  template: supervisorRAGPromptTemplate,
  variables: supervisorRAGPromptVariables,
};

/**
 * Creates a prompt for the Supervisor agent with Retrieval Augmented Generation (RAG) capabilities.
 * This prompt extends the base supervisor instructions by detailing how to integrate and utilize
 * a knowledge base for improved decision-making, delegation, and response generation.
 */
export const supervisorRAGPrompt: PromptCreator<typeof supervisorRAGPromptTemplate> = createPrompt(supervisorRAGPromptConfig);


// --- Base Worker Agent Prompt ---

const workerAgentPromptTemplate = `You are {{agentName}}, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute assigned tasks in {{specialization}} using designated tools securely.

RESPONSIBILITIES:
1. Execute tasks with expertise
2. Use tools proficiently 
3. Follow security protocols
4. Stay within specialization scope
5. {{communicationStyle}}
6. Handle errors robustly

PROTOCOL: Receive tasks → Execute → Report results to Supervisor. No delegation. No direct user contact.` as const;

const workerAgentPromptVariables: TemplateVariables<typeof workerAgentPromptTemplate> = {
  agentName: "Specialized Worker Agent",
  specialization: "Secure and efficient domain-specific task execution using approved tools and protocols.",
  communicationStyle: "Technical, precise, and focused on task-relevant information for the Supervisor.",
};

const workerAgentPromptConfig: PromptTemplate<typeof workerAgentPromptTemplate> = {
  template: workerAgentPromptTemplate,
  variables: workerAgentPromptVariables,
};

/**
 * Creates a base prompt for a Specialized Worker Agent.
 * This prompt outlines the core responsibilities, security compliance, communication protocols,
 * and interaction model for worker agents within the AI-Volt system.
 * It is intended to be extended or used as a base for more specific worker agent prompts.
 */
export const workerAgentPrompt: PromptCreator<typeof workerAgentPromptTemplate> = createPrompt(workerAgentPromptConfig);

// --- Specialized Worker Agent Prompts ---

// System Info Agent
const systemInfoAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: System info gathering - OS, hardware, software, network details.

TASKS: OS/kernel details, CPU/memory/disk specs, installed packages, network status, environment variables.

TOOLS: System diagnostics, secure non-intrusive commands.
OUTPUT: Structured format (JSON, key-value) as requested.` as const;

const systemInfoAgentPromptVariables: TemplateVariables<typeof systemInfoAgentPromptTemplate> = {
  baseWorkerInstructions: `You are SystemInfoAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute system information tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Technical, precise communication 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const systemInfoAgentPromptConfig: PromptTemplate<typeof systemInfoAgentPromptTemplate> = {
  template: systemInfoAgentPromptTemplate,
  variables: systemInfoAgentPromptVariables,
};

/**
 * Creates a prompt for the System Information Agent.
 * This agent specializes in retrieving and reporting details about the operating system,
 * hardware, software environment, and network configuration.
 */
export const systemInfoAgentPrompt: PromptCreator<typeof systemInfoAgentPromptTemplate> = createPrompt(systemInfoAgentPromptConfig);

// Coding Agent
const codingAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Software development - code generation, analysis, debugging across languages.

TASKS: Write/modify code, analyze quality/bugs/security, generate tests, explain algorithms, debug, refactor, translate languages.

TOOLS: File system, analysis tools, linters, formatters, code execution, version control.
STANDARDS: Clean, efficient, documented, secure code with tests.` as const;

const codingAgentPromptVariables: TemplateVariables<typeof codingAgentPromptTemplate> = {
  baseWorkerInstructions: `You are CodingAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute coding tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Precise technical communication with code details 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const codingAgentPromptConfig: PromptTemplate<typeof codingAgentPromptTemplate> = {
  template: codingAgentPromptTemplate,
  variables: codingAgentPromptVariables,
};

/**
 * Creates a prompt for the Coding Agent.
 * This agent specializes in tasks related to software development, including writing, analyzing,
 * modifying, and debugging code across various programming languages.
 */
export const codingAgentPrompt: PromptCreator<typeof codingAgentPromptTemplate> = createPrompt(codingAgentPromptConfig);

// Git Agent (includes GitHub functionality)
const gitAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Git version control and GitHub platform operations.

TASKS: Clone, status, branches, commits, push/pull, history, diffs, merge conflicts, tags, issues, PRs, workflows.

TOOLS: Git CLI, GitHub API (Octokit), secure auth handling.
CAUTION: Confirm destructive operations. Report errors immediately.` as const;

const gitAgentPromptVariables: TemplateVariables<typeof gitAgentPromptTemplate> = {
  baseWorkerInstructions: `You are GitAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute Git/GitHub tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Clear status reporting 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const gitAgentPromptConfig: PromptTemplate<typeof gitAgentPromptTemplate> = {
  template: gitAgentPromptTemplate,
  variables: gitAgentPromptVariables,
};

/**
 * Creates a prompt for the Git Agent.
 * This agent specializes in performing version control operations using Git
 * and GitHub platform interactions, including repositories, branches, commits, issues, and pull requests.
 */
export const gitAgentPrompt: PromptCreator<typeof gitAgentPromptTemplate> = createPrompt(gitAgentPromptConfig);

// Browser Agent
const browserAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Web interaction - content fetching, searches, data extraction.

TASKS: Fetch URLs, web searches, extract info/links/data, summarize content, answer from pages.

TOOLS: HTTP clients, HTML parsing (Cheerio), search APIs, content handling.
ETHICS: No CAPTCHA bypass, respect rate limits, report access issues.` as const;

const browserAgentPromptVariables: TemplateVariables<typeof browserAgentPromptTemplate> = {
  baseWorkerInstructions: `You are BrowserAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute web interaction tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Concise summaries and data 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const browserAgentPromptConfig: PromptTemplate<typeof browserAgentPromptTemplate> = {
  template: browserAgentPromptTemplate,
  variables: browserAgentPromptVariables,
};

/**
 * Creates a prompt for the Browser Agent.
 * This agent specializes in interacting with the web, including fetching page content,
 * performing searches, and extracting information.
 */
export const browserAgentPrompt: PromptCreator<typeof browserAgentPromptTemplate> = createPrompt(browserAgentPromptConfig);

// Playwright Agent
const playwrightAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Advanced browser automation with Playwright - complex interactions, extraction, testing.

TASKS: Navigate, interact with elements, extract data, screenshots, execute JS, handle dynamic content, manage contexts.

TOOLS: Playwright library, selectors, waits, timeouts.
CONSIDERATIONS: Resource-intensive, respect terms of service, report errors.` as const;

const playwrightAgentPromptVariables: TemplateVariables<typeof playwrightAgentPromptTemplate> = {
  baseWorkerInstructions: `You are PlaywrightAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute browser automation tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Detailed script reporting 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const playwrightAgentConfig: PromptTemplate<typeof playwrightAgentPromptTemplate> = {
  template: playwrightAgentPromptTemplate,
  variables: playwrightAgentPromptVariables,
};

/**
 * Creates a prompt for the Playwright Agent.
 * This agent specializes in advanced web browser automation using Playwright,
 * capable of complex interactions, data extraction, and UI testing tasks.
 */
export const playwrightAgentPrompt: PromptCreator<typeof playwrightAgentPromptTemplate> = createPrompt(playwrightAgentConfig);

// Debug Agent
const debugAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Debugging assistance - error analysis, log interpretation, issue diagnosis.

TASKS: Analyze errors/stack traces, examine logs, formulate bug hypotheses, suggest debug steps, interpret debug output.

TOOLS: Log analysis, text processing, debugging tools.
APPROACH: Methodical, analytical, asking clarifying questions.` as const;

const debugAgentPromptVariables: TemplateVariables<typeof debugAgentPromptTemplate> = {
  baseWorkerInstructions: `You are DebugAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute debugging tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Analytical diagnostic insights 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const debugAgentPromptConfig: PromptTemplate<typeof debugAgentPromptTemplate> = {
  template: debugAgentPromptTemplate,
  variables: debugAgentPromptVariables,
};

/**
 * Creates a prompt for the Debug Agent.
 * This agent specializes in assisting with debugging processes by analyzing errors,
 * logs, and code to help identify and diagnose issues.
 */
export const debugAgentPrompt: PromptCreator<typeof debugAgentPromptTemplate> = createPrompt(debugAgentPromptConfig);

// Knowledge Base Agent
const knowledgeBaseAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Knowledge base management - vector stores, document repositories.

TASKS: Add documents/data, semantic/keyword search, retrieve by ID/metadata, summarize/synthesize, organize/tag, manage embeddings.

TOOLS: Vector DB APIs (Pinecone, pgvector), document tools, text processing, various formats.
HANDLING: Data integrity, access controls, optimized queries.` as const;

const knowledgeBaseAgentPromptVariables: TemplateVariables<typeof knowledgeBaseAgentPromptTemplate> = {
  baseWorkerInstructions: `You are KnowledgeBaseAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute knowledge base tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Informative result summaries 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const knowledgeBaseAgentPromptConfig: PromptTemplate<typeof knowledgeBaseAgentPromptTemplate> = {
  template: knowledgeBaseAgentPromptTemplate,
  variables: knowledgeBaseAgentPromptVariables,
};

/**
 * Creates a prompt for the Knowledge Base Agent.
 * This agent specializes in managing and interacting with knowledge bases,
 * including storing, retrieving, and querying information from various data sources.
 */
export const knowledgeBaseAgentPrompt: PromptCreator<typeof knowledgeBaseAgentPromptTemplate> = createPrompt(knowledgeBaseAgentPromptConfig);

// Data Agent
const dataAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Data processing - structured/semi-structured data (CSV, JSON, databases).

TASKS: Parse CSV/JSON, clean/validate data, transform/aggregate, query databases, generate reports, format conversion.

TOOLS: Data libraries (PapaParse), database connectors, visualization tools.
INTEGRITY: Accuracy, validation, graceful error handling.` as const;

const dataAgentPromptVariables: TemplateVariables<typeof dataAgentPromptTemplate> = {
  baseWorkerInstructions: `You are DataAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute data processing tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Precise data delivery 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const dataAgentPromptConfig: PromptTemplate<typeof dataAgentPromptTemplate> = {
  template: dataAgentPromptTemplate,
  variables: dataAgentPromptVariables,
};

/**
 * Creates a prompt for the Data Agent.
 * This agent specializes in processing, analyzing, and transforming structured
 * and semi-structured data from various sources like CSV, JSON, and databases.
 */
export const dataAgentPrompt: PromptCreator<typeof dataAgentPromptTemplate> = createPrompt(dataAgentPromptConfig);

// Cloud Agent
const cloudAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Cloud platform operations - AWS, Azure, GCP resource management, deployment, monitoring.

TASKS: Manage cloud resources, deploy applications, monitor utilization/logs, configure services, handle containers/K8s.

TOOLS: Cloud SDKs/CLIs, IaC tools (Terraform), secure auth handling.
CONSIDERATIONS: Security best practices, cost awareness, defined permissions.` as const;

const cloudAgentPromptVariables: TemplateVariables<typeof cloudAgentPromptTemplate> = {
  baseWorkerInstructions: `You are CloudAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute cloud platform tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Factual operation reporting 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const cloudAgentPromptConfig: PromptTemplate<typeof cloudAgentPromptTemplate> = {
  template: cloudAgentPromptTemplate,
  variables: cloudAgentPromptVariables,
};

/**
 * Creates a prompt for the Cloud Agent.
 * This agent specializes in interacting with cloud platforms and services,
 * including resource management, application deployment, and infrastructure monitoring.
 */
export const cloudAgentPrompt: PromptCreator<typeof cloudAgentPromptTemplate> = createPrompt(cloudAgentPromptConfig);

// File Operations Agent
const fileOpsAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: File system operations - creating, reading, writing, organizing files and directories.

TASKS: CRUD files/directories, copy/move/delete, search files/content, permissions, monitor changes, archive/extract.

TOOLS: File system APIs, CLI tools, text processing, search/indexing tools.
SECURITY: Validate paths, proper permissions, backup before destructive operations.` as const;

const fileOpsAgentPromptVariables: TemplateVariables<typeof fileOpsAgentPromptTemplate> = {
  baseWorkerInstructions: `You are FileOpsAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute file operations tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Precise operation status 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const fileOpsAgentConfig: PromptTemplate<typeof fileOpsAgentPromptTemplate> = {
  template: fileOpsAgentPromptTemplate,
  variables: fileOpsAgentPromptVariables,
};

/**
 * Creates a prompt for the File Operations Agent.
 * This agent specializes in file system operations, including creating, reading,
 * writing, modifying, and organizing files and directories.
 */
export const fileOpsAgentPrompt: PromptCreator<typeof fileOpsAgentPromptTemplate> = createPrompt(fileOpsAgentConfig);

// Research Agent
const researchAgentPromptTemplate = `{{baseWorkerInstructions}}

SPECIALIZATION: Information gathering, analysis, synthesis from various sources for research and decision support.

TASKS: Comprehensive research, multi-source gathering, analysis/synthesis, fact-checking, credibility assessment, comparisons, reports/bibliographies.

TOOLS: Search engines, databases, knowledge bases, analysis tools, citation management.
METHODOLOGY: Systematic approaches, comprehensive coverage, objectivity, prioritize recent/authoritative sources.` as const;

const researchAgentPromptVariables: TemplateVariables<typeof researchAgentPromptTemplate> = {
  baseWorkerInstructions: `You are ResearchAgent, specialized worker in AI-Volt reporting to Supervisor.

ROLE: Execute research tasks using designated tools securely.

RESPONSIBILITIES: 1) Execute tasks expertly 2) Use tools proficiently 3) Follow security protocols 4) Stay within scope 5) Thorough sourced findings 6) Robust error handling

PROTOCOL: Receive → Execute → Report. No delegation. No direct user contact.`,
};

const researchAgentPromptConfig: PromptTemplate<typeof researchAgentPromptTemplate> = {
  template: researchAgentPromptTemplate,
  variables: researchAgentPromptVariables,
};

/**
 * Creates a prompt for the Research Agent.
 * This agent specializes in information gathering, analysis, and synthesis
 * from various sources to support decision-making and knowledge acquisition.
 */
export const researchAgentPrompt: PromptCreator<typeof researchAgentPromptTemplate> = createPrompt(researchAgentPromptConfig);
// ================================================================================================
// CONTEXT-AWARE PROMPT VARIANTS
// ================================================================================================

/**
 * High-load supervisor prompt for busy periods
 */
const highLoadSupervisorPromptTemplate = `{{baseSupervisorInstructions}}

HIGH-LOAD MODE: Efficiency over analysis, parallel delegation, smart caching, priority: {{criticalTaskFocus}}

LOAD BALANCING: {{loadBalancingStrategy}}

METRICS: Response time, agent utilization, completion rates, resource usage.` as const;

const highLoadSupervisorPromptVariables: TemplateVariables<typeof highLoadSupervisorPromptTemplate> = {
  baseSupervisorInstructions: supervisorPromptTemplate.slice(0, 400) + "...",
  criticalTaskFocus: "System issues, urgent calculations, time-sensitive ops",
  loadBalancingStrategy: "Even distribution, queue non-critical tasks"
};

const highLoadSupervisorPromptConfig: PromptTemplate<typeof highLoadSupervisorPromptTemplate> = {
  template: highLoadSupervisorPromptTemplate,
  variables: highLoadSupervisorPromptVariables,
};

export const highLoadSupervisorPrompt: PromptCreator<typeof highLoadSupervisorPromptTemplate> = createPrompt(highLoadSupervisorPromptConfig);

/**
 * Debug mode supervisor prompt for troubleshooting
 */
const debugSupervisorPromptTemplate = `{{baseSupervisorInstructions}}

DEBUG MODE: Detailed delegation reasoning, interaction logging, performance metrics, verbose errors.

CAPABILITIES: {{debugCapabilities}}

WORKFLOW: 1) Log analysis details 2) Explain delegation 3) Monitor execution 4) Report metrics 5) Provide insights.` as const;

const debugSupervisorPromptVariables: TemplateVariables<typeof debugSupervisorPromptTemplate> = {
  baseSupervisorInstructions: supervisorPromptTemplate.slice(0, 400) + "...",
  debugCapabilities: "Detailed logging, performance monitoring, health checks, execution tracing"
};

const debugSupervisorPromptConfig: PromptTemplate<typeof debugSupervisorPromptTemplate> = {
  template: debugSupervisorPromptTemplate,
  variables: debugSupervisorPromptVariables,
};

export const debugSupervisorPrompt: PromptCreator<typeof debugSupervisorPromptTemplate> = createPrompt(debugSupervisorPromptConfig);

// ================================================================================================
// DYNAMIC PROMPT GENERATION UTILITIES
// ================================================================================================

/**
 * Generate worker prompt based on agent type.
 */
export const generateWorkerPrompt = (agentType: string): () => string => {
  const agentPrompts = {
    browser: browserAgentPrompt,
    systemInfo: systemInfoAgentPrompt,
    fileOps: fileOpsAgentPrompt,
    git: gitAgentPrompt,
    research: researchAgentPrompt,
    coding: codingAgentPrompt,
    debug: debugAgentPrompt,
    knowledgeBase: knowledgeBaseAgentPrompt,
    data: dataAgentPrompt,
    cloud: cloudAgentPrompt,
    playwright: playwrightAgentPrompt,
  } as const;

  // Validate agentType using type-safe check
  if (agentType in agentPrompts) {
    return agentPrompts[agentType as keyof typeof agentPrompts];
  }
  // Fallback for any worker type not explicitly defined
  return () => `You are AI-Volt ${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent, specialized worker in AI-Volt reporting to Supervisor.

Execute ${agentType} domain tasks using designated tools securely. Follow standard protocols for task execution, security compliance, and Supervisor communication.`;
};
// ================================================================================================
// ERROR HANDLING & FALLBACK PROMPTS
// ================================================================================================

/**
 * Error recovery prompt for failed delegations
 */
const errorRecoveryPromptTemplate = `ERROR RECOVERY MODE

Context: {{errorType}} | Failed: {{failedAgent}} | Task: {{originalTask}}

STRATEGY: 1) Root cause: {{errorAnalysis}} 2) Alternatives: {{alternativeApproaches}} 3) Fallback delegation 4) Transparent explanation 5) Prevention suggestions

FALLBACKS: {{fallbackOptions}}

Maintain professionalism while being transparent about limitations and recovery.` as const;

const errorRecoveryPromptVariables: TemplateVariables<typeof errorRecoveryPromptTemplate> = {
  errorType: "Delegation failure",
  failedAgent: "Unknown agent",
  originalTask: "Task details unavailable",
  errorAnalysis: "Analyzing patterns and causes",
  alternativeApproaches: "Alternative assignments or direct handling",
  fallbackOptions: "Direct handling, alternative delegation, task decomposition"
};

const errorRecoveryPromptConfig: PromptTemplate<typeof errorRecoveryPromptTemplate> = {
  template: errorRecoveryPromptTemplate,
  variables: errorRecoveryPromptVariables,
};

export const errorRecoveryPrompt: PromptCreator<typeof errorRecoveryPromptTemplate> = createPrompt(errorRecoveryPromptConfig);

/**
 * Capability limitation prompt
 */
const capabilityLimitationPromptTemplate = `CAPABILITY LIMITATION

Request: {{userRequest}} | Limitation: {{limitationType}} | Alternatives: {{availableAlternatives}}

RESPONSE: "I understand you're asking for {{requestSummary}}, but I have limitations in {{limitationArea}}. 

I can offer: {{alternativeOffering}}

Would you like me to {{suggestedAction}} or modify your request to work within my capabilities?"

IMPROVEMENT: {{improvementNotes}}` as const;

const capabilityLimitationPromptVariables: TemplateVariables<typeof capabilityLimitationPromptTemplate> = {
  userRequest: "User's original request",
  limitationType: "Technical or knowledge limitation",
  availableAlternatives: "Alternative options available",
  requestSummary: "summary of user wants",
  limitationArea: "specific limitation area",
  alternativeOffering: "concrete alternatives available",
  suggestedAction: "recommended next steps",
  improvementNotes: "Interaction helps improve future capabilities"
};

const capabilityLimitationPromptConfig: PromptTemplate<typeof capabilityLimitationPromptTemplate> = {
  template: capabilityLimitationPromptTemplate,
  variables: capabilityLimitationPromptVariables,
};

export const capabilityLimitationPrompt: PromptCreator<typeof capabilityLimitationPromptTemplate> = createPrompt(capabilityLimitationPromptConfig);

// ================================================================================================
// EXPORT COLLECTIONS FOR EASY CONSUMPTION
// ================================================================================================

/**
 * Main supervisor prompts collection
 */
export const supervisorPrompts = {
  standard: supervisorPrompt,
  rag: supervisorRAGPrompt,
  highLoad: highLoadSupervisorPrompt,
  debug: debugSupervisorPrompt,
} as const;

/**
 * Worker agent prompts collection
 */
export const workerPrompts = {
  base: workerAgentPrompt,
  browser: browserAgentPrompt,
  systemInfo: systemInfoAgentPrompt,
  fileOps: fileOpsAgentPrompt,
  git: gitAgentPrompt,
  research: researchAgentPrompt,
  coding: codingAgentPrompt,
  debug: debugAgentPrompt,
  knowledgeBase: knowledgeBaseAgentPrompt,
  data: dataAgentPrompt,
  cloud: cloudAgentPrompt,
  playwright: playwrightAgentPrompt,
  generate: generateWorkerPrompt,
} as const;

/**
 * Utility prompts collection
 */
export const utilityPrompts = {
  errorRecovery: errorRecoveryPrompt,
  capabilityLimitation: capabilityLimitationPrompt,
  generic: createPrompt({
    template: "You are a helpful assistant.",
    variables: {}
  })
} as const;

/**
 * Complete prompts collection for easy import
 */
export const aiVoltPrompts = {
  supervisor: supervisorPrompts,
  worker: workerPrompts,
  utility: utilityPrompts
} as const;

/**
 * Type definitions for prompt creators
 */
export type SupervisorPromptType = keyof typeof supervisorPrompts;
export type WorkerPromptType = keyof typeof workerPrompts;
export type UtilityPromptType = keyof typeof utilityPrompts;

// ===== UTILITY FUNCTIONS FOR MEANINGFUL TYPE USAGE =====

/**
 * Validates that all required template variables are provided and have valid values
 * @param template - The template string with variable placeholders
 * @param variables - The variables object to validate
 * @returns True if all variables are valid
 * @throws Error if validation fails
 */
export function validateTemplateVariables<T extends string>(
  template: T,
  variables: Record<string, unknown>
): variables is TemplateVariables<T> {
  const requiredVarNames = extractVariableNames(template);
  
  // Check all required variables are provided and have valid values
  for (const varName of requiredVarNames) {
    const varKey = String(varName);
    
    // Safely check for property existence
    if (!Object.prototype.hasOwnProperty.call(variables, varKey)) {
      throw new Error(`Missing required template variable: ${varKey}`);
    }    // Use Reflect.get for safer property access
    const varValue = Reflect.get(variables, varKey);
    
    // Validate each variable value is allowed
    if (!isAllowedVariableValue(varValue)) {
      const sanitizedVarName = varKey.replace(/[<>"'&]/g, '');
      const varType = !varValue && varValue !== 0 && varValue !== false ? 'null/undefined' : typeof varValue;
      throw new Error(`Invalid value for variable '${sanitizedVarName}': ${varType} is not allowed`);
    }
  }
  
  return true;
}

/**
 * Runtime type guard to check if a value is an allowed variable value
 * Uses AllowedVariableValue type constraints for validation
 * @param value - The value to check
 * @returns True if value is allowed as a template variable
 */
export function isAllowedVariableValue(value: unknown): value is AllowedVariableValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.every(item => 
      typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    ))
  );
}

/**
 * Extracts variable names from a template string using ExtractVariableNames logic
 * @param template - The template string to analyze
 * @returns Array of variable names found in the template
 */
export function extractVariableNames<T extends string>(template: T): ExtractVariableNames<T>[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [] as ExtractVariableNames<T>[];
  
  return matches.map(match => match.slice(2, -2)) as ExtractVariableNames<T>[];
}

/**
 * Analyzes a template for security risks and variable requirements
 * @param template - The template string to analyze
 * @returns Analysis report with security and validation info
 */
export function analyzeTemplate<T extends string>(template: T): {
  variableNames: ExtractVariableNames<T>[];
  variableCount: number;
  hasSecurityRisks: boolean;
  securityIssues: string[];
  isValid: boolean;
} {
  const variableNames = extractVariableNames(template);
  const securityIssues: string[] = [];
  // Check for potential security risks using pattern matching
  const scriptPattern = /<script>/i;
  const jsProtocolPattern = /javascript:/i;
  if (scriptPattern.test(template) || jsProtocolPattern.test(template)) {
    securityIssues.push('Template contains potential XSS vectors');
  }
  
  if (template.includes('{{') && template.includes('}}') && template.includes('{{{')) {
    securityIssues.push('Template mixes escaped and unescaped variable syntax');
  }
  
  // Check for duplicate variable names
  const uniqueVars = new Set(variableNames);
  if (uniqueVars.size !== variableNames.length) {
    securityIssues.push('Template contains duplicate variable references');
  }
  
  return {
    variableNames,
    variableCount: variableNames.length,
    hasSecurityRisks: securityIssues.length > 0,
    securityIssues,
    isValid: securityIssues.length === 0 && variableNames.length > 0,
  };
}

/**
 * Creates a secure prompt with validation and sanitization
 * @param config - The prompt configuration
 * @returns A secure prompt creator with built-in validation
 */
export function createSecurePrompt<T extends string>(
  config: PromptTemplate<T>
): PromptCreator<T> {
  // Validate template security at creation time
  const analysis = analyzeTemplate(config.template);
  
  if (analysis.hasSecurityRisks) {
    throw new Error(`Security issues in template: ${analysis.securityIssues.join(', ')}`);
  }
  
  // Return enhanced prompt creator with runtime validation
  const basePrompt = createPrompt(config);
  
  return ((variables: TemplateVariables<T>) => {
    // Validate variables at runtime
    validateTemplateVariables(config.template, variables);
    
    // Sanitize string values to prevent injection
    const sanitizedVariables = Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [
        key,
        typeof value === 'string' ? sanitizeVariableValue(value) : value
      ])
    ) as TemplateVariables<T>;
    
    return basePrompt(sanitizedVariables);
  }) as PromptCreator<T>;
}

/**
 * Sanitizes variable values to prevent injection attacks
 * @param value - The string value to sanitize
 * @returns Sanitized string safe for template interpolation
 */
export function sanitizeVariableValue(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\{\{/g, '&#123;&#123;')
    .replace(/\}\}/g, '&#125;&#125;');
}

/**
 * Validates a complete prompt configuration for type safety and security
 * @param config - The prompt configuration to validate
 * @returns Validation result with detailed feedback
 */
export function validatePromptConfiguration<T extends string>(
  config: PromptTemplate<T>
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  analysis: ReturnType<typeof analyzeTemplate>;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Analyze template structure
  const analysis = analyzeTemplate(config.template);
  
  // Check if config.variables exists and is defined
  if (!config.variables) {
    errors.push('Variables configuration is required but not provided');
    return {
      isValid: false,
      errors,
      warnings,
      analysis,
    };
  }
  
  // Check if variables match template requirements
  const templateVars = analysis.variableNames;
  const providedVars = Object.keys(config.variables);
  
  // Check for missing variables
  for (const templateVar of templateVars) {
    if (!providedVars.includes(templateVar)) {
      errors.push(`Missing variable definition: ${templateVar}`);
    }
  }
  
  // Check for extra variables
  for (const providedVar of providedVars) {
    if (!templateVars.includes(providedVar as any)) {
      warnings.push(`Unused variable definition: ${providedVar}`);
    }
  }
  
  // Validate variable values safely
  if (config.variables && typeof config.variables === 'object') {
    for (const [key, value] of Object.entries(config.variables)) {
      if (!isAllowedVariableValue(value)) {
        errors.push(`Invalid variable value for '${key}': ${typeof value} is not allowed`);
      }
    }
  }
  
  // Add security issues as errors
  errors.push(...analysis.securityIssues);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    analysis,
  };
}

// ===== EXISTING PROMPTS WITH ENHANCED VALIDATION =====
