/**
 * Supervisor Retriever Implementation
 * Provides context retrieval capabilities for the supervisor agent using VoltAgent's BaseRetriever pattern
 * Generated on 2025-01-27
 */

import { BaseRetriever, type BaseMessage } from "@voltagent/core";
import { logger } from "../config/logger.js";
import { generateId } from "ai";

/**
 * Context entry structure for retrieval operations
 */
interface ContextEntry {
  id: string;
  content: string;
  source: string;
  type: 'delegation' | 'task_result' | 'workflow' | 'agent_capability' | 'error_resolution';
  metadata: {
    timestamp: number;
    agentType?: string;
    taskId?: string;
    workflowId?: string;
    relevanceScore?: number;
    tags?: string[];
  };
}

/**
 * Supervisor context store for managing retrieval data
 */
class SupervisorContextStore {
  private contexts: Map<string, ContextEntry> = new Map();
  private indexByType: Map<string, Set<string>> = new Map();
  private indexByAgent: Map<string, Set<string>> = new Map();
  private indexByTags: Map<string, Set<string>> = new Map();

  /**
   * Add context entry to the store
   */
  addContext(entry: ContextEntry): void {
    this.contexts.set(entry.id, entry);
    
    // Index by type
    if (!this.indexByType.has(entry.type)) {
      this.indexByType.set(entry.type, new Set());
    }
    this.indexByType.get(entry.type)!.add(entry.id);

    // Index by agent type
    if (entry.metadata.agentType) {
      if (!this.indexByAgent.has(entry.metadata.agentType)) {
        this.indexByAgent.set(entry.metadata.agentType, new Set());
      }
      this.indexByAgent.get(entry.metadata.agentType)!.add(entry.id);
    }

    // Index by tags
    if (entry.metadata.tags) {
      for (const tag of entry.metadata.tags) {
        if (!this.indexByTags.has(tag)) {
          this.indexByTags.set(tag, new Set());
        }
        this.indexByTags.get(tag)!.add(entry.id);
      }
    }
  }

  /**
   * Search contexts based on query and filters
   */
  search(query: string, options: {
    type?: string;
    agentType?: string;
    tags?: string[];
    limit?: number;
    minRelevanceScore?: number;
  } = {}): ContextEntry[] {
    const { type, agentType, tags, limit = 10, minRelevanceScore = 0 } = options;
    
    let candidateIds = new Set<string>();
    
    // Start with all contexts if no specific filters
    if (!type && !agentType && !tags) {
      candidateIds = new Set(this.contexts.keys());
    } else {
      // Apply filters
      if (type && this.indexByType.has(type)) {
        candidateIds = new Set(this.indexByType.get(type)!);
      }
      
      if (agentType && this.indexByAgent.has(agentType)) {
        const agentIds = this.indexByAgent.get(agentType)!;
        if (candidateIds.size === 0) {
          candidateIds = new Set(agentIds);
        } else {
          candidateIds = new Set([...candidateIds].filter(id => agentIds.has(id)));
        }
      }
      
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          if (this.indexByTags.has(tag)) {
            const tagIds = this.indexByTags.get(tag)!;
            if (candidateIds.size === 0) {
              candidateIds = new Set(tagIds);
            } else {
              candidateIds = new Set([...candidateIds].filter(id => tagIds.has(id)));
            }
          }
        }
      }
    }

    // Get contexts and calculate relevance scores
    const results: (ContextEntry & { score: number })[] = [];
    const queryLower = query.toLowerCase();
    
    for (const id of candidateIds) {
      const context = this.contexts.get(id);
      if (!context) continue;
      
      // Simple relevance scoring based on text matching
      const contentLower = context.content.toLowerCase();
      const sourceLower = context.source.toLowerCase();
      
      let score = 0;
      
      // Exact phrase match gets highest score
      if (contentLower.includes(queryLower)) {
        score += 10;
      }
      
      // Word matches
      const queryWords = queryLower.split(/\s+/);
      for (const word of queryWords) {
        if (word.length > 2) { // Skip very short words
          if (contentLower.includes(word)) score += 2;
          if (sourceLower.includes(word)) score += 1;
        }
      }
      
      // Recency bonus (newer entries score higher)
      const daysSinceCreation = (Date.now() - context.metadata.timestamp) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - daysSinceCreation);
      
      // Apply metadata relevance score if available
      if (context.metadata.relevanceScore) {
        score += context.metadata.relevanceScore;
      }
      
      if (score >= minRelevanceScore) {
        results.push({ ...context, score });
      }
    }
    
    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...context }) => context);
  }

  /**
   * Get context statistics
   */
  getStats(): {
    totalContexts: number;
    byType: Record<string, number>;
    byAgent: Record<string, number>;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const context of this.contexts.values()) {
      // Count by type
      byType[context.type] = (byType[context.type] || 0) + 1;
      
      // Count by agent
      if (context.metadata.agentType) {
        byAgent[context.metadata.agentType] = (byAgent[context.metadata.agentType] || 0) + 1;
      }
      
      // Track timestamps
      if (oldestEntry === null || context.metadata.timestamp < oldestEntry) {
        oldestEntry = context.metadata.timestamp;
      }
      if (newestEntry === null || context.metadata.timestamp > newestEntry) {
        newestEntry = context.metadata.timestamp;
      }
    }

    return {
      totalContexts: this.contexts.size,
      byType,
      byAgent,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear old contexts to manage memory usage
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): number { // 7 days default
    const cutoff = Date.now() - maxAge;
    let removed = 0;
    
    for (const [id, context] of this.contexts.entries()) {
      if (context.metadata.timestamp < cutoff) {
        this.removeContext(id);
        removed++;
      }
    }
    
    return removed;
  }

  /**
   * Remove a specific context entry
   */
  private removeContext(id: string): void {
    const context = this.contexts.get(id);
    if (!context) return;
    
    this.contexts.delete(id);
    
    // Remove from type index
    this.indexByType.get(context.type)?.delete(id);
    
    // Remove from agent index
    if (context.metadata.agentType) {
      this.indexByAgent.get(context.metadata.agentType)?.delete(id);
    }
    
    // Remove from tag indices
    if (context.metadata.tags) {
      for (const tag of context.metadata.tags) {
        this.indexByTags.get(tag)?.delete(id);
      }
    }
  }
}

/**
 * Supervisor Retriever implementation following VoltAgent's BaseRetriever pattern
 */
export class SupervisorRetriever extends BaseRetriever {
  private contextStore: SupervisorContextStore;
  private maxResults: number;
  private defaultMinScore: number;

  constructor(options: {
    maxResults?: number;
    defaultMinScore?: number;
  } = {}) {
    super();
    this.contextStore = new SupervisorContextStore();
    this.maxResults = options.maxResults || 10;
    this.defaultMinScore = options.defaultMinScore || 1;
    
    logger.info("SupervisorRetriever initialized", {
      maxResults: this.maxResults,
      defaultMinScore: this.defaultMinScore
    });
  }

  /**
   * Retrieve relevant context based on input
   * Implementation of BaseRetriever.retrieve method
   */
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    const retrievalId = generateId();
    const startTime = Date.now();
    
    try {
      // Extract query from input
      const query = Array.isArray(input) 
        ? input.map(msg => typeof msg === 'string' ? msg : JSON.stringify(msg)).join(' ')
        : input;

      logger.debug("Supervisor retrieval started", {
        retrievalId,
        queryLength: query.length,
        inputType: Array.isArray(input) ? 'messages' : 'string'
      });

      // Determine search strategy based on query content
      const searchOptions = this.analyzeQueryForSearchOptions(query);
      
      // Perform context search
      const relevantContexts = this.contextStore.search(query, {
        limit: this.maxResults,
        minRelevanceScore: this.defaultMinScore,
        ...searchOptions
      });

      // Format results for consumption by the agent
      const formattedContext = this.formatContextsForAgent(relevantContexts, query);
      
      const duration = Date.now() - startTime;
      
      logger.info("Supervisor retrieval completed", {
        retrievalId,
        duration,
        contextsFound: relevantContexts.length,
        formattedLength: formattedContext.length,
        searchOptions
      });

      return formattedContext;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error("Supervisor retrieval failed", {
        retrievalId,
        duration,
        error: errorMessage
      });
      
      // Return graceful fallback
      return `Retrieval system temporarily unavailable. Please proceed with available context.`;
    }
  }

  /**
   * Add delegation result to context store
   */
  addDelegationContext(result: {
    agentType: string;
    task: string;
    result: string;
    taskId?: string;
    workflowId?: string;
    success: boolean;
    duration?: number;
  }): void {
    const entry: ContextEntry = {
      id: generateId(),
      content: `Task: ${result.task}\nResult: ${result.result}`,
      source: `delegation-${result.agentType}`,
      type: 'delegation',
      metadata: {
        timestamp: Date.now(),
        agentType: result.agentType,
        taskId: result.taskId,
        workflowId: result.workflowId,
        relevanceScore: result.success ? 5 : 2,
        tags: [
          result.agentType,
          result.success ? 'success' : 'failure',
          ...(result.duration ? [`duration-${Math.round(result.duration / 1000)}s`] : [])
        ]
      }
    };
    
    this.contextStore.addContext(entry);
    
    logger.debug("Delegation context added", {
      entryId: entry.id,
      agentType: result.agentType,
      success: result.success,
      taskId: result.taskId
    });
  }

  /**
   * Add workflow context
   */
  addWorkflowContext(workflow: {
    description: string;
    steps: string[];
    workflowId: string;
    status: 'started' | 'completed' | 'failed';
    agents: string[];
  }): void {
    const entry: ContextEntry = {
      id: generateId(),
      content: `Workflow: ${workflow.description}\nSteps: ${workflow.steps.join(', ')}\nAgents involved: ${workflow.agents.join(', ')}`,
      source: `workflow-${workflow.workflowId}`,
      type: 'workflow',
      metadata: {
        timestamp: Date.now(),
        workflowId: workflow.workflowId,
        relevanceScore: workflow.status === 'completed' ? 8 : workflow.status === 'failed' ? 3 : 5,
        tags: [
          workflow.status,
          'multi-agent',
          ...workflow.agents,
          `steps-${workflow.steps.length}`
        ]
      }
    };
    
    this.contextStore.addContext(entry);
    
    logger.debug("Workflow context added", {
      entryId: entry.id,
      workflowId: workflow.workflowId,
      status: workflow.status,
      agentCount: workflow.agents.length
    });
  }

  /**
   * Add agent capability information
   */
  addCapabilityContext(capability: {
    agentType: string;
    capability: string;
    description: string;
    examples: string[];
    limitations?: string[];
  }): void {
    const entry: ContextEntry = {
      id: generateId(),
      content: `Agent: ${capability.agentType}\nCapability: ${capability.capability}\nDescription: ${capability.description}\nExamples: ${capability.examples.join(', ')}${capability.limitations ? `\nLimitations: ${capability.limitations.join(', ')}` : ''}`,
      source: `capability-${capability.agentType}`,
      type: 'agent_capability',
      metadata: {
        timestamp: Date.now(),
        agentType: capability.agentType,
        relevanceScore: 6,
        tags: [
          capability.agentType,
          'capability',
          capability.capability.toLowerCase().replace(/\s+/g, '-'),
          ...(capability.limitations ? ['has-limitations'] : ['no-limitations'])
        ]
      }
    };
    
    this.contextStore.addContext(entry);
    
    logger.debug("Capability context added", {
      entryId: entry.id,
      agentType: capability.agentType,
      capability: capability.capability
    });
  }

  /**
   * Get retrieval statistics
   */
  getStats() {
    return this.contextStore.getStats();
  }

  /**
   * Perform context cleanup
   */
  cleanup(maxAge?: number): number {
    const removed = this.contextStore.cleanup(maxAge);
    
    logger.info("Context cleanup completed", {
      removedEntries: removed,
      maxAge: maxAge || '7 days'
    });
    
    return removed;
  }

  /**
   * Analyze query to determine optimal search options
   */
  private analyzeQueryForSearchOptions(query: string): {
    type?: string;
    agentType?: string;
    tags?: string[];
  } {
    const queryLower = query.toLowerCase();
    const options: {
      type?: string;
      agentType?: string;
      tags?: string[];
    } = {};

    // Detect agent types
    const agentTypes = ['calculator', 'datetime', 'system_info', 'fileops', 'git', 'browser', 'coding'];
    for (const agentType of agentTypes) {
      if (queryLower.includes(agentType) || queryLower.includes(agentType.replace('_', ' '))) {
        options.agentType = agentType;
        break;
      }
    }

    // Detect context types
    if (queryLower.includes('delegation') || queryLower.includes('delegate')) {
      options.type = 'delegation';
    } else if (queryLower.includes('workflow') || queryLower.includes('process')) {
      options.type = 'workflow';
    } else if (queryLower.includes('capability') || queryLower.includes('can do') || queryLower.includes('able to')) {
      options.type = 'agent_capability';
    } else if (queryLower.includes('error') || queryLower.includes('problem') || queryLower.includes('issue')) {
      options.type = 'error_resolution';
    }

    // Extract tags from query
    const tags: string[] = [];
    if (queryLower.includes('success')) tags.push('success');
    if (queryLower.includes('fail')) tags.push('failure');
    if (queryLower.includes('quick') || queryLower.includes('fast')) tags.push('fast');
    if (queryLower.includes('slow') || queryLower.includes('long')) tags.push('slow');
    
    if (tags.length > 0) {
      options.tags = tags;
    }

    return options;
  }

  /**
   * Format retrieved contexts for agent consumption
   */
  private formatContextsForAgent(contexts: ContextEntry[], query: string): string {
    if (contexts.length === 0) {
      return `No relevant context found for query: "${query}". Proceeding with general knowledge and available tools.`;
    }

    const sections: string[] = [
      `## Relevant Context (${contexts.length} entries found)`,
      ``
    ];

    // Group contexts by type for better organization
    const contextsByType = new Map<string, ContextEntry[]>();
    for (const context of contexts) {
      if (!contextsByType.has(context.type)) {
        contextsByType.set(context.type, []);
      }
      contextsByType.get(context.type)!.push(context);
    }

    for (const [type, typeContexts] of contextsByType.entries()) {
      sections.push(`### ${type.replace('_', ' ').toUpperCase()}`);
      
      for (const context of typeContexts) {
        const timestamp = new Date(context.metadata.timestamp).toISOString();
        const agentInfo = context.metadata.agentType ? ` (${context.metadata.agentType})` : '';
        
        sections.push(`**${context.source}${agentInfo}** - ${timestamp}`);
        sections.push(context.content);
        sections.push('');
      }
    }

    sections.push(`## Instructions`);
    sections.push(`Use the above context to inform your delegation decisions and responses. Consider previous successful patterns and agent capabilities when choosing how to handle the current request.`);

    return sections.join('\n');
  }
}

/**
 * Create and configure a supervisor retriever instance
 */
export const createSupervisorRetriever = (options?: {
  maxResults?: number;
  defaultMinScore?: number;
}): SupervisorRetriever => {
  const retriever = new SupervisorRetriever(options);
  
  // Pre-populate with agent capability information
  retriever.addCapabilityContext({
    agentType: 'calculator',
    capability: 'Mathematical Operations',
    description: 'Performs precise mathematical calculations, formulas, and statistical analysis',
    examples: ['arithmetic operations', 'complex formulas', 'statistical calculations', 'unit conversions']
  });

  retriever.addCapabilityContext({
    agentType: 'datetime',
    capability: 'Date/Time Operations',
    description: 'Handles all date and time related operations including formatting and calculations',
    examples: ['date formatting', 'timezone conversions', 'date arithmetic', 'scheduling operations']
  });

  retriever.addCapabilityContext({
    agentType: 'system_info',
    capability: 'System Monitoring',
    description: 'Provides comprehensive system information and monitoring capabilities',
    examples: ['system metrics', 'process monitoring', 'network information', 'hardware details']
  });

  retriever.addCapabilityContext({
    agentType: 'fileops',
    capability: 'File Operations',
    description: 'Handles safe and efficient file system operations',
    examples: ['file management', 'directory operations', 'file analysis', 'data processing'],
    limitations: ['security restrictions apply', 'no destructive operations without confirmation']
  });

  retriever.addCapabilityContext({
    agentType: 'git',
    capability: 'Version Control',
    description: 'Comprehensive Git operations and repository management',
    examples: ['status checks', 'commits', 'branching', 'merging', 'repository analysis']
  });

  retriever.addCapabilityContext({
    agentType: 'browser',
    capability: 'Web Operations',
    description: 'Web searching, browsing, and content extraction capabilities',
    examples: ['web search', 'content scraping', 'link extraction', 'metadata analysis']
  });

  retriever.addCapabilityContext({
    agentType: 'coding',
    capability: 'Development Support',
    description: 'Code execution, analysis, and development assistance',
    examples: ['code execution', 'project analysis', 'structure generation', 'development tools'],
    limitations: ['secure execution environment', 'restricted file system access']
  });

  logger.info("Supervisor retriever created with pre-populated capabilities", {
    capabilityCount: 7,
    maxResults: options?.maxResults || 10,
    defaultMinScore: options?.defaultMinScore || 1
  });

  return retriever;
};
