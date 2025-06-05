/**
 * Supervisor Retriever Implementation
 * Provides context retrieval capabilities for the supervisor agent using VoltAgent's BaseRetriever pattern
 * Generated on 2025-01-27
 */

import { BaseRetriever, type BaseMessage } from "@voltagent/core";
import { logger } from "../config/logger.js";
import { generateId } from "ai";
import QuickLRU from "quick-lru";

/** Allowed agent types for query analysis & indexing */
const AGENT_TYPES = [
  'calculator', 'datetime', 'system_info',
  'fileops', 'git', 'browser', 'coding',
] as const;

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
  private contexts: QuickLRU<string, ContextEntry>;
  private indexByType: Map<string, Set<string>> = new Map();
  private indexByAgent: Map<string, Set<string>> = new Map();
  private indexByTags: Map<string, Set<string>> = new Map();

  constructor(maxSize: number = 1000) {
    this.contexts = new QuickLRU({
      maxSize,
      onEviction: (_id, entry) => this.removeFromIndexes(entry),
    });
  }

  /**
   * Add context entry to the store.
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
   * When QuickLRU evicts an entry, remove it from all indexes.
   */
  private removeFromIndexes(entry: ContextEntry): void {
    const id = entry.id;
    this.indexByType.get(entry.type)?.delete(id);
    if (entry.metadata.agentType) {
      this.indexByAgent.get(entry.metadata.agentType)?.delete(id);
    }
    if (entry.metadata.tags) {
      for (const tag of entry.metadata.tags) {
        this.indexByTags.get(tag)?.delete(id);
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
      .map(({ score: _score, ...context }) => context);
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
   * Clean up old contexts older than maxAge (ms).
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
 * SupervisorRetriever: in-memory RAG for delegation/workflow context.
 * Can be attached directly (agent.retriever) or exposed as a tool.
 */
export class SupervisorRetriever extends BaseRetriever {
  private contextStore: SupervisorContextStore;
  private searchCache: QuickLRU<string, string>;
  private maxResults: number;
  private defaultMinScore: number;

  /**
   * @param options.maxResults      Max number of contexts to return.
   * @param options.defaultMinScore  Minimum relevance score to include.
   * @param options.toolName        If set, exposes `this.tool` for LLM-driven calls.
   * @param options.toolDescription Description shown to the LLM for tool usage.
   * @param options.storeMaxSize    Maximum number of contexts to store.
   * @param options.searchCacheSize Number of distinct queries to cache.
   */
  constructor(options: {
    maxResults?: number;
    defaultMinScore?: number;
    toolName?: string;
    toolDescription?: string;
    storeMaxSize?: number;
    searchCacheSize?: number;
  } = {}) {
    // Pass toolName/toolDescription to BaseRetriever so you get .tool
    super({ toolName: options.toolName, toolDescription: options.toolDescription });
    this.contextStore = new SupervisorContextStore(options.storeMaxSize);
    this.searchCache = new QuickLRU({ maxSize: options.searchCacheSize ?? 100 });
    this.maxResults = options.maxResults ?? 10;
    this.defaultMinScore = options.defaultMinScore ?? 1;
    
    logger.info("SupervisorRetriever initialized", {
      maxResults: this.maxResults,
      defaultMinScore: this.defaultMinScore,
      storeMaxSize: options.storeMaxSize ?? 1000,
      searchCacheSize: options.searchCacheSize ?? 100,
    });
  }

  /**
   * Retrieve relevant context entries for the given input.
   * Wrapped in try/catch to ensure graceful fallback.
   */
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    // Hoist identifiers so they're available in both try and catch
    const retrievalId = generateId();
    const startTime = Date.now();
    try {
      const query = Array.isArray(input)
        ? input.map(m => (typeof m === 'string' ? m : JSON.stringify(m))).join(' ')
        : input;

      // build a cache key from the raw query + search options
      const opts = this.analyzeQueryForSearchOptions(query);
      const key = JSON.stringify({ query, opts, maxResults: this.maxResults, minScore: this.defaultMinScore });

      // 1) Try the cache
      const cached = this.searchCache.get(key);
      if (cached) {
        logger.debug("Supervisor retrieval — cache hit", { retrievalId, key });
        return cached;
      }

      // 2) Cache miss: do the full search
      logger.debug("Supervisor retrieval started", {
        retrievalId,
        queryLength: query.length,
        inputType: Array.isArray(input) ? 'messages' : 'string'
      });

      const ctxs = this.contextStore.search(query, {
        limit: this.maxResults,
        minRelevanceScore: this.defaultMinScore,
        ...opts,
      });

      let result: string;
      if (ctxs.length === 0) {
        result = `No relevant context found for "${query}".`;
      } else {
        // Format grouped by type
        const sections = ['## Retrieved Context', ''];
        const byType = new Map<string, typeof ctxs>();
        for (const c of ctxs) {
          (byType.get(c.type) ?? byType.set(c.type, []).get(c.type)!).push(c);
        }
        for (const [type, entries] of byType) {
          sections.push(`### ${type.toUpperCase()}`);
          for (const e of entries) {
            sections.push(`**${e.source}** - ${new Date(e.metadata.timestamp).toISOString()}`);
            sections.push(e.content, '');
          }
        }
        result = sections.join('\n');
      }

      // 3) Store in cache before returning
      this.searchCache.set(key, result);

      const duration = Date.now() - startTime;
      
      logger.info("Supervisor retrieval completed", {
        retrievalId,
        duration,
        contextsFound: ctxs.length,
        formattedLength: result.length,
        searchOptions: opts
      });

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      logger.error("Supervisor retrieval failed", {
        retrievalId,
        duration,
        error: errorMessage
      });
      
      return `Retrieval error: proceeding without prior context.`;
    }
  }

  /**
   * Index a delegation result. Errors are caught and logged.
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
    try {
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
    } catch (err) {
      logger.warn("[SupervisorRetriever] addDelegationContext failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
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
   * Clean up old contexts older than maxAge (ms).
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    try {
      const removed = this.contextStore.cleanup(maxAge);
      logger.info("[SupervisorRetriever] cleanup removed entries", { removed });
      return removed;
    } catch (err) {
      logger.warn("[SupervisorRetriever] cleanup failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }

  /**
   * Use a constant list for query-based agentType detection.
   */
  private analyzeQueryForSearchOptions(query: string): {
    type?: string;
    agentType?: typeof AGENT_TYPES[number];
    tags?: string[];
  } {
    const opts: { type?: string; agentType?: typeof AGENT_TYPES[number]; tags?: string[] } = {};
    const q = query.toLowerCase();

    for (const t of AGENT_TYPES) {
      if (q.includes(t) || q.includes(t.replace('_', ' '))) {
        opts.agentType = t;
        break;
      }
    }

    // Detect context types
    if (q.includes('delegation') || q.includes('delegate')) {
      opts.type = 'delegation';
    } else if (q.includes('workflow') || q.includes('process')) {
      opts.type = 'workflow';
    } else if (q.includes('capability') || q.includes('can do') || q.includes('able to')) {
      opts.type = 'agent_capability';
    } else if (q.includes('error') || q.includes('problem') || q.includes('issue')) {
      opts.type = 'error_resolution';
    }

    // Extract tags from query
    const tags: string[] = [];
    if (q.includes('success')) tags.push('success');
    if (q.includes('fail')) tags.push('failure');
    if (q.includes('quick') || q.includes('fast')) tags.push('fast');
    if (q.includes('slow') || q.includes('long')) tags.push('slow');
    
    if (tags.length > 0) {
      opts.tags = tags;
    }

    return opts;
  }
}

/**
 * Create and configure a supervisor retriever instance
 */
export const createSupervisorRetriever = (options?: {
  maxResults?: number;
  defaultMinScore?: number;
  toolName?: string;
  toolDescription?: string;
  storeMaxSize?: number;
  searchCacheSize?: number;
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
    defaultMinScore: options?.defaultMinScore || 1,
    storeMaxSize: options?.storeMaxSize ?? 1000,
    searchCacheSize: options?.searchCacheSize ?? 100,
  });

  return retriever;
};
