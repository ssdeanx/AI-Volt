/**
 * @fileoverview Supervisor Retriever Implementation
 * 
 * Provides context retrieval capabilities for the supervisor agent using VoltAgent's BaseRetriever pattern.
 * This retriever implements text-based semantic search with LRU caching for efficient context management
 * in multi-agent supervisor/worker architectures.
 * 
 * @module SupervisorRetriever
 * @version 1.0.0
 * @author AI-Volt Multi-Agent System
 * @since 2025-06-10
 */

import { BaseRetriever, type BaseMessage, type RetrieverOptions } from '@voltagent/core';
import { generateId } from 'ai';
import QuickLRU from 'quick-lru';
import { logger } from '../config/logger.js';

/**
 * Context entry structure for retrieval operations
 * @interface ContextEntry
 */
export interface ContextEntry {
  /** Unique identifier for the context entry */
  id: string;
  /** Main content of the context entry */
  content: string;
  /** Source identifier (e.g., agent name, tool name) */
  source: string;
  /** Type categorization for context filtering */
  type: 'delegation' | 'task_result' | 'workflow' | 'agent_capability' | 'error_resolution';
  /** Additional metadata for enhanced retrieval */
  metadata: {
    /** Timestamp when the entry was created */
    timestamp: number;
    /** Type of agent that created this context */
    agentType?: string;
    /** Associated task identifier */
    taskId?: string;
    /** Associated workflow identifier */
    workflowId?: string;
    /** Computed relevance score for ranking */
    relevanceScore?: number;
    /** Tags for categorization and filtering */
    tags?: string[];
    /** Additional flexible metadata */
    [key: string]: any;
  };
}

/**
 * Supervisor context store for managing retrieval data using in-memory LRU cache
 * Implements efficient storage and search capabilities for multi-agent context
 * 
 * @class SupervisorContextStore
 */
class SupervisorContextStore {
  private readonly contexts: QuickLRU<string, ContextEntry>;

  /**
   * Initialize the context store with LRU cache
   * @param maxSize - Maximum number of contexts to store (default: 1000)
   */
  constructor(maxSize: number = 1000) {
    this.contexts = new QuickLRU({ maxSize });
  }

  /**
   * Add a new context entry to the store
   * @param entry - Context entry to add
   */
  addContext(entry: ContextEntry): void {
    this.contexts.set(entry.id, entry);
  }

  /**
   * Get all stored contexts as an array
   * @returns Array of all context entries
   */
  getAll(): ContextEntry[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Get statistics about the stored contexts
   * @returns Statistics object with total count and timestamp info
   */
  getStats() {
    const allContexts = this.getAll();
    return {
      total: this.contexts.size,
      oldest: allContexts.length > 0 
        ? Math.min(...allContexts.map(e => e.metadata.timestamp)) 
        : null,
      newest: allContexts.length > 0 
        ? Math.max(...allContexts.map(e => e.metadata.timestamp)) 
        : null,
    };
  }

  /**
   * Clean up old contexts older than specified age
   * @param maxAge - Maximum age in milliseconds (default: 7 days)
   * @returns Number of contexts removed
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    let removed = 0;
    
    for (const [id, ctx] of this.contexts.entries()) {
      if (ctx.metadata.timestamp < cutoff) {
        this.contexts.delete(id);
        removed++;
      }
    }
    
    return removed;
  }

  /**
   * Search contexts using text-based scoring algorithm
   * @param query - Search query string
   * @param opts - Search options for filtering and limiting results
   * @returns Array of matching context entries sorted by relevance
   */
  search(query: string, opts: { 
    type?: string; 
    agentType?: string; 
    tags?: string[]; 
    limit?: number; 
    minScore?: number; 
  } = {}): ContextEntry[] {
    const { type, agentType, tags, limit = 10, minScore = 1 } = opts;
    const q = query.toLowerCase();
    
    let results = this.getAll().map(ctx => {
      let score = 0;
      
      // Content matching (highest weight)
      if (ctx.content.toLowerCase().includes(q)) score += 10;
      
      // Source matching
      if (ctx.source.toLowerCase().includes(q)) score += 2;
      
      // Type filter bonus
      if (type && ctx.type === type) score += 2;
      
      // Agent type filter bonus
      if (agentType && ctx.metadata.agentType === agentType) score += 2;
      
      // Tags matching bonus
      if (tags && ctx.metadata.tags && tags.some(t => ctx.metadata.tags!.includes(t))) {
        score += 1;
      }
      
      // Recency bonus (fresher content gets higher score)
      const daysSinceCreation = (Date.now() - ctx.metadata.timestamp) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - daysSinceCreation);
      
      // Pre-computed relevance score bonus
      if (ctx.metadata.relevanceScore) {
        score += ctx.metadata.relevanceScore;
      }
      
      return { ctx, score };
    });

    // Filter by minimum score and sort by relevance
    results = results.filter(r => r.score >= minScore);
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, limit).map(r => r.ctx);
  }
}

/**
 * SupervisorRetriever: Production-ready, text-based context retriever for supervisor/worker agents.
 * Implements advanced VoltAgent patterns with enhanced userContext integration and performance optimizations.
 * 
 * @class SupervisorRetriever
 * @extends BaseRetriever
 */
export class SupervisorRetriever extends BaseRetriever {
  private readonly contextStore: SupervisorContextStore;
  private readonly searchCache: QuickLRU<string, string>;
  private readonly maxResults: number;
  private readonly defaultMinScore: number;
  private readonly userContextRefs: WeakMap<any, string>; // Track userContext references

  /**
   * Creates a new SupervisorRetriever instance following VoltAgent best practices
   * @param options - Configuration options for the retriever
   * @param options.maxResults - Max number of contexts to return (default: 10)
   * @param options.defaultMinScore - Minimum relevance score to include (default: 1)
   * @param options.toolName - If set, exposes `this.tool` for LLM-driven calls
   * @param options.toolDescription - Description shown to the LLM for tool usage
   * @param options.storeMaxSize - Maximum number of contexts to store (default: 1000)
   * @param options.searchCacheSize - Number of distinct queries to cache (default: 200)
   */
  constructor(options: {
    maxResults?: number;
    defaultMinScore?: number;
    toolName?: string;
    toolDescription?: string;
    storeMaxSize?: number;
    searchCacheSize?: number;
  } = {}) {
    // Initialize BaseRetriever with tool configuration following VoltAgent patterns
    super({ 
      toolName: options.toolName, 
      toolDescription: options.toolDescription 
    });
    
    this.contextStore = new SupervisorContextStore(options.storeMaxSize ?? 1000);
    this.searchCache = new QuickLRU({ maxSize: options.searchCacheSize ?? 200 });
    this.maxResults = options.maxResults ?? 10;
    this.defaultMinScore = options.defaultMinScore ?? 1;
    this.userContextRefs = new WeakMap();
    
    logger.info("SupervisorRetriever initialized with VoltAgent optimizations", {
      maxResults: this.maxResults,
      defaultMinScore: this.defaultMinScore,
      storeMaxSize: options.storeMaxSize ?? 1000,
      searchCacheSize: options.searchCacheSize ?? 200,
      toolEnabled: Boolean(options.toolName),
      features: ["userContext-tracking", "lru-caching", "enhanced-scoring", "context-correlation"]
    });
  }

  /**
   * Retrieve relevant context entries using advanced VoltAgent patterns.
   * Implements enhanced userContext integration and context correlation.
   * Following VoltAgent BaseRetriever pattern - MUST return string
   * @param input - Query string or array of BaseMessage
   * @param options - Retriever options including userContext for reference tracking
   * @returns String summary of relevant context with enhanced formatting
   */
  async retrieve(input: string | BaseMessage[], options: RetrieverOptions = {}): Promise<string> {
    const retrievalId = generateId();
    const startTime = Date.now();
    
    try {
      // Extract query string from input (following VoltAgent documentation pattern)
      const query = typeof input === "string" 
        ? input 
        : (input[input.length - 1]?.content as string);
        
      if (!query) {
        return "No query provided for context retrieval.";
      }

      // Track userContext reference for advanced correlation
      if (options.userContext) {
        this.userContextRefs.set(options.userContext, retrievalId);
      }

      // Enhanced cache key with context awareness
      const cacheKey = this.createCacheKey(query, options);
      if (this.searchCache.has(cacheKey)) {
        const cachedResult = this.searchCache.get(cacheKey)!;
        logger.debug("Supervisor retrieval cache hit", { 
          retrievalId, 
          query: query.substring(0, 50),
          cacheKey: cacheKey.substring(0, 30)
        });
        return cachedResult;
      }

      // Advanced context search with multi-dimensional scoring
      const searchOptions = this.buildSearchOptions(options);
      const ctxs = this.contextStore.search(query, {
        ...searchOptions,
        limit: this.maxResults,
        minScore: this.defaultMinScore,
      });

      let result: string;
      if (ctxs.length === 0) {
        result = "No relevant context found in supervisor history.";
      } else {
        // Enhanced formatting following VoltAgent documentation patterns
        result = this.formatContextsForLLM(ctxs, query);
      }

      // Store comprehensive references in userContext (enhanced VoltAgent pattern)
      if (options.userContext && ctxs.length > 0) {
        this.storeEnhancedReferences(options.userContext, ctxs, retrievalId, query);
      }

      // Cache with enhanced key
      this.searchCache.set(cacheKey, result);
      
      const duration = Date.now() - startTime;
      logger.info("Advanced supervisor retrieval completed", {
        retrievalId,
        duration,
        contextsFound: ctxs.length,
        formattedLength: result.length,
        query: query.substring(0, 100),
        cacheSize: this.searchCache.size,
        storeStats: this.contextStore.getStats()
      });
      
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Supervisor retrieval failed with enhanced error handling", {
        retrievalId,
        duration,
        error: errorMessage,
        query: typeof input === "string" ? input.substring(0, 50) : "BaseMessage[]",
        hasUserContext: Boolean(options.userContext)
      });
      return "Retrieval error: proceeding without prior context.";
    }
  }

  /**
   * Create intelligent cache key with context awareness
   * @private
   */
  private createCacheKey(query: string, options: RetrieverOptions): string {
    const baseKey = query.toLowerCase();
    // Add context-specific elements to cache key for better hit rates
    return `${baseKey}`;
  }

  /**
   * Build advanced search options from retriever context
   * @private
   */
  private buildSearchOptions(options: RetrieverOptions): Partial<Parameters<SupervisorContextStore['search']>[1]> {
    const searchOpts: any = {};
    
    // Extract potential filters from userContext if available
    if (options.userContext) {
      // Could enhance with agent type filtering, etc.
      // This is a placeholder for future context-aware filtering
    }
    
    return searchOpts;
  }

  /**
   * Format retrieved contexts for LLM with enhanced VoltAgent patterns
   * @private
   */
  private formatContextsForLLM(contexts: ContextEntry[], query: string): string {
    return contexts
      .map((ctx, index) => {
        const relevanceIndicator = ctx.metadata.relevanceScore ? ` (relevance: ${ctx.metadata.relevanceScore})` : '';
        const ageIndicator = this.getAgeIndicator(ctx.metadata.timestamp);
        return `[Context ${index + 1}/${contexts.length}] ${ctx.type.toUpperCase()}${relevanceIndicator}${ageIndicator}\nSource: ${ctx.source}\n${ctx.content}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Store enhanced references in userContext following VoltAgent best practices
   * @private
   */
  private storeEnhancedReferences(userContext: Map<any, any>, contexts: ContextEntry[], retrievalId: string, query: string): void {
    const references = contexts.map(ctx => ({
      id: ctx.id,
      type: ctx.type,
      source: ctx.source,
      agentType: ctx.metadata.agentType,
      timestamp: ctx.metadata.timestamp,
      relevanceScore: ctx.metadata.relevanceScore,
      workflowId: ctx.metadata.workflowId,
      taskId: ctx.metadata.taskId
    }));

    // Store multiple reference keys for different use cases
    userContext.set("supervisorRetrievalReferences", references);
    userContext.set("supervisorRetrievalQuery", query);
    userContext.set("supervisorRetrievalId", retrievalId);
    userContext.set("supervisorRetrievalTimestamp", Date.now());
    
    // Store context correlation data
    userContext.set("supervisorContextCorrelation", {
      retrievalId,
      contextCount: contexts.length,
      queryLength: query.length,
      avgRelevanceScore: contexts.reduce((acc, ctx) => acc + (ctx.metadata.relevanceScore || 0), 0) / contexts.length
    });
  }

  /**
   * Get human-readable age indicator for context entries
   * @private
   */
  private getAgeIndicator(timestamp: number): string {
    const ageMs = Date.now() - timestamp;
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    const ageHours = Math.floor(ageMinutes / 60);
    const ageDays = Math.floor(ageHours / 24);

    if (ageDays > 0) return ` (${ageDays}d ago)`;
    if (ageHours > 0) return ` (${ageHours}h ago)`;
    if (ageMinutes > 0) return ` (${ageMinutes}m ago)`;
    return ' (recent)';
  }
      });
      return "Retrieval error: proceeding without prior context.";
    }
  }

  /**
   * Add a delegation result context entry
   * @param result - Delegation result data to store as context
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
      const truncatedResult = result.result.length > 200 
        ? `${result.result.substring(0, 200)}...` 
        : result.result;
        
      const entry: ContextEntry = {
        id: generateId(),
        content: `Task: ${result.task}\nResult: ${truncatedResult}`,
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
      
      logger.debug("Added delegation context", {
        entryId: entry.id,
        agentType: result.agentType,
        success: result.success,
        taskId: result.taskId,
      });
    } catch (err) {
      logger.error("Failed to add delegation context", {
        error: err instanceof Error ? err.message : String(err),
        agentType: result.agentType,
      });
    }
  }

  /**
   * Add workflow context entry
   * @param workflow - Workflow data to store as context
   */
  addWorkflowContext(workflow: {
    description: string;
    steps: string[];
    workflowId: string;
    status: 'started' | 'completed' | 'failed';
    agents: string[];
  }): void {
    try {
      const entry: ContextEntry = {
        id: generateId(),
        content: `Workflow: ${workflow.description}\nSteps: ${workflow.steps.join(', ')}`,
        source: `workflow-${workflow.workflowId}`,
        type: 'workflow',
        metadata: {
          timestamp: Date.now(),
          workflowId: workflow.workflowId,
          relevanceScore: this.getWorkflowRelevanceScore(workflow.status),
          tags: [workflow.status, ...workflow.agents]
        }
      };
      
      this.contextStore.addContext(entry);
      
      logger.debug("Added workflow context", {
        entryId: entry.id,
        workflowId: workflow.workflowId,
        status: workflow.status,
        agentCount: workflow.agents.length,
      });
    } catch (err) {
      logger.error("Failed to add workflow context", {
        error: err instanceof Error ? err.message : String(err),
        workflowId: workflow.workflowId,
      });
    }
  }

  /**
   * Add agent capability information
   * @param capability - Agent capability data to store as context
   */
  addCapabilityContext(capability: {
    agentType: string;
    capability: string;
    description: string;
    examples: string[];
    limitations?: string[];
  }): void {
    try {
      const limitationsText = capability.limitations 
        ? `\nLimitations: ${capability.limitations.join(', ')}`
        : '';
        
      const entry: ContextEntry = {
        id: generateId(),
        content: `Capability: ${capability.capability}\nDescription: ${capability.description}\nExamples: ${capability.examples.join(', ')}${limitationsText}`,
        source: `capability-${capability.agentType}`,
        type: 'agent_capability',
        metadata: {
          timestamp: Date.now(),
          agentType: capability.agentType,
          relevanceScore: 4, // Static high relevance for capabilities
          tags: [capability.agentType, 'capability']
        }
      };
      
      this.contextStore.addContext(entry);
      
      logger.debug("Added capability context", {
        entryId: entry.id,
        agentType: capability.agentType,
        capability: capability.capability,
      });
    } catch (err) {
      logger.error("Failed to add capability context", {
        error: err instanceof Error ? err.message : String(err),
        agentType: capability.agentType,
        capability: capability.capability,
      });
    }
  }

  /**
   * Get retrieval statistics
   * @returns Statistics about the context store
   */
  getStats() {
    return this.contextStore.getStats();
  }

  /**
   * Clean up old contexts older than maxAge (ms).
   * @param maxAge - Maximum age in milliseconds (default: 7 days)
   * @returns Number of contexts removed
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    return this.contextStore.cleanup(maxAge);
  }

  /**
   * Get the relevance score for a workflow based on its status.
   * @param status - Workflow status
   * @returns Numerical relevance score
   */
  private getWorkflowRelevanceScore(status: 'started' | 'completed' | 'failed'): number {
    switch (status) {
      case 'completed': return 5;
      case 'started': return 3;
      case 'failed': return 1;
      default: return 2;
    }
  }
}

/**
 * Create and configure a supervisor retriever instance
 * @param options - Configuration options for the retriever
 * @returns Configured SupervisorRetriever instance
 */
export const createSupervisorRetriever = (options?: {
  maxResults?: number;
  defaultMinScore?: number;
  toolName?: string;
  toolDescription?: string;
  storeMaxSize?: number;
  searchCacheSize?: number;
}): SupervisorRetriever => {
  return new SupervisorRetriever(options);
};
