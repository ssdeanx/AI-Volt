/* eslint-disable sonarjs/todo-tag */
/**
 * Supervisor Retriever Implementation
 * Provides context retrieval capabilities for the supervisor agent using VoltAgent's BaseRetriever pattern
 * Generated on 2025-06-09
 */

import { BaseRetriever, type BaseMessage, type RetrieverOptions } from "@voltagent/core";
import { logger } from "../config/logger.js";
import { generateId } from "ai";
import QuickLRU from "quick-lru";
import { pipeline } from "@xenova/transformers";

/** Allowed agent types for query analysis & indexing */
const AGENT_TYPES = [
  'calculator', 'datetime', 'system_info',
  'fileops', 'git', 'browser', 'coding',
] as const;

/**
 * Context entry structure for retrieval operations
 * @property docId - Context grouping identifier (not a document id, but a logical context group for token-efficient retrieval)
 */
export interface ContextEntry {
  id: string;
  content: string;
  source: string;
  type: 'delegation' | 'task_result' | 'workflow' | 'agent_capability' | 'error_resolution' | 'chat_chunk';
  embedding?: number[];
  metadata: {
    timestamp: number;
    agentType?: string;
    taskId?: string;
    workflowId?: string;
    relevanceScore?: number;
    tags?: string[];
    chatSessionId?: string;
    chunkIndex?: number;
    [key: string]: any;
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
   * Get all candidate IDs based on the provided filters.
   * This function will create an intersection of all matching filter criteria.
   */
  private getFilteredCandidateIds(options: { type?: string; agentType?: string; tags?: string[] }): Set<string> {
    const { type, agentType, tags } = options;
    const idSets: Set<string>[] = [];
    if (type && this.indexByType.has(type)) idSets.push(this.indexByType.get(type)!);
    if (agentType && this.indexByAgent.has(agentType)) idSets.push(this.indexByAgent.get(agentType)!);
    if (tags) {
      for (const tag of tags) {
        if (this.indexByTags.has(tag)) idSets.push(this.indexByTags.get(tag)!);
      }
    }
    if (idSets.length === 0) return new Set(this.contexts.keys());
    return safeIntersect(idSets);
  }

  /**
   * Calculate a relevance score for a given context entry against a query.
   */
  private calculateRelevance(context: ContextEntry, query: string): number {
    const queryLower = query.toLowerCase();
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

    return score;
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
    const { limit = 10, minRelevanceScore = 0 } = options;

    const candidateIds = this.getFilteredCandidateIds(options);

    const results: (ContextEntry & { score: number })[] = [];
    for (const id of candidateIds) {
      const context = this.contexts.get(id);
      if (!context) continue;

      const score = this.calculateRelevance(context, query);
      
      if (score >= minRelevanceScore) {
        results.push({ ...context, score });
      }
    }
    
    // Sort by score and limit results
    const sortedResults = [...results].sort((
        a: ContextEntry & { score: number },
        b: ContextEntry & { score: number }
    ) => b.score - a.score);

    return sortedResults
      .slice(0, limit)
      .map(({ score: _score, ...context }: ContextEntry & { score: number }) => context);
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

  /**
   * Add a chunked, embedded chat context group to the store.
   * @param chatSessionId - Logical chat session/group identifier for context retrieval
   * @param content - The full chat content to chunk and embed
   * @param chunkSize - Max chunk size
   * @param embedder - Embedding function
   * @param source - Source string
   * @param metadata - Additional metadata
   */
  async addChunkedChatContext(chatSessionId: string, content: string, chunkSize: number, embedder: (t: string) => Promise<number[]>, source: string, metadata: Record<string, any> = {}) {
    const chunks = chunkText(content, chunkSize);
    for (let i = 0; i < chunks.length; i++) {
      const chunkTextVal = chunks[i];
      const embedding = await embedder(chunkTextVal);
      const entry: ContextEntry = {
        id: `${chatSessionId}-chunk-${i}`,
        content: chunkTextVal,
        source,
        type: 'chat_chunk',
        embedding,
        metadata: {
          ...metadata,
          chatSessionId,
          chunkIndex: i,
          timestamp: Date.now(),
        },
      };
      this.addContext(entry);
    }
  }

  /**
   * Semantic search using vector similarity if embeddings are present.
   */
  semanticSearch(_query: string, queryEmbedding: number[], options: { limit?: number; minScore?: number; type?: string; agentType?: string; tags?: string[] } = {}): ContextEntry[] {
    const { limit = 10, minScore = 0.2 } = options;
    const candidateIds = this.getFilteredCandidateIds(options);
    const results: (ContextEntry & { score: number })[] = [];
    for (const id of candidateIds) {
      const context = this.contexts.get(id);
      if (!context || !context.embedding) continue;
      const score = cosineSimilarity(queryEmbedding, context.embedding);
      if (score >= minScore) results.push({ ...context, score });
    }
    // Use standard sort for compatibility
    results.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    return results.slice(0, limit).map(({ score: _score, ...context }: { score: number } & ContextEntry) => context);
  }
}

function chunkText(text: string, chunkSize: number = 300): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize && current.length > 0) {
      chunks.push(current);
      current = '';
    }
    current += sentence + ' ';
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
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
  private embedder: any;
  private embedderReady: boolean = false;

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
    // Async embedder init must be called manually
    logger.info("SupervisorRetriever initialized (semantic)", {
      maxResults: this.maxResults,
      defaultMinScore: this.defaultMinScore,
      storeMaxSize: options.storeMaxSize ?? 1000,
      searchCacheSize: options.searchCacheSize ?? 100,
    });
  }

  async initEmbedder() {
    if (!this.embedderReady) {
      this.embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      this.embedderReady = true;
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.embedderReady) await this.initEmbedder();
    const output = await this.embedder(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }

  /**
   * Ingest and chunk a chat context group, storing embeddings for semantic search.
   * @param chatSessionId - Logical chat session/group identifier for context retrieval
   * @param content - The full chat content to chunk and embed
   * @param source - Source string
   * @param metadata - Additional metadata
   * @param chunkSize - Max chunk size
   */
  async ingestChatContext(chatSessionId: string, content: string, source: string, metadata: Record<string, any> = {}, chunkSize = 300) {
    if (!this.embedderReady) await this.initEmbedder();
    await this.contextStore.addChunkedChatContext(chatSessionId, content, chunkSize, async (t: string) => await this.getEmbedding(t), source, metadata);
  }
  /**
    * Retrieve relevant context entries for the given input using semantic search.
    */
  async retrieve(input: string | BaseMessage[], _options: RetrieverOptions = {}): Promise<string> {
    const retrievalId = generateId();
    const startTime = Date.now();
    try {
      const query = Array.isArray(input)
        ? input.map(m => (typeof m === 'string' ? m : JSON.stringify(m))).join(' ')
        : input;
      if (!this.embedderReady) await this.initEmbedder();
      const queryEmbedding = await this.getEmbedding(query);
      const ctxs = this.contextStore.semanticSearch(query, queryEmbedding, {
        limit: this.maxResults,
        minScore: 0.2,
      });
      let result: string;
      if (ctxs.length === 0) {
        result = `No relevant context found for "${query}".`;
      } else {
        // Format to be as token-efficient as possible
        const formattedContexts = ctxs.map(c => 
          `[${c.type}:${c.source}] ${c.content.replace(/\s+/g, ' ').trim()}`
        );
        result = `Retrieved Context:\n${formattedContexts.join('\n')}`;
      }
      this.searchCache.set(query, result);
      const duration = Date.now() - startTime;
      logger.info("Supervisor semantic retrieval completed", {
        retrievalId,
        duration,
        contextsFound: ctxs.length,
        formattedLength: result.length,
      });
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Supervisor semantic retrieval failed", {
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
      const truncatedResult = result.result.length > 200 ? `${result.result.substring(0, 200)}...` : result.result;
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
        relevanceScore: this.getWorkflowRelevanceScore(workflow.status),
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
    let content = `Agent: ${capability.agentType}\nCapability: ${capability.capability}\nDescription: ${capability.description}\nExamples: ${capability.examples.join(', ')}`;
    if (capability.limitations) {
        content += `\nLimitations: ${capability.limitations.join(', ')}`;
    }
    const entry: ContextEntry = {
      id: generateId(),
      content,
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

  /**
   * Get the relevance score for a workflow based on its status.
   */
  private getWorkflowRelevanceScore(status: 'started' | 'completed' | 'failed'): number {
      switch (status) {
          case 'completed': return 8;
          case 'started': return 5;
          case 'failed': return 3;
          default: return 5;
      }
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

/**
 * Utility: Intersect multiple sets safely.
 * Filters for valid Sets of primitives and then computes their intersection.
 * @param sets Array of sets to intersect.
 * @returns Set containing elements present in all valid input sets.
 */
// Generated on 2024-07-26
function safeIntersect<T extends string | number | boolean | symbol>(sets: Set<T>[]): Set<T> {
  if (!Array.isArray(sets) || sets.length === 0) {
    return new Set<T>();
  }

  // Step 1: Validate and filter sets
  const validatedPrimitiveSets = sets
    .filter(currentSet => {
      if (!(currentSet instanceof Set)) {
        logger.warn('[safeIntersect] Input item is not a Set instance, skipping.');
        return false;
      }
      return true;
    })
    .map(currentSet => {
      const primitiveOnlySet = new Set<T>();
      currentSet.forEach(val => {
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || typeof val === 'symbol') {
          primitiveOnlySet.add(val);
        } else {
          logger.warn(`[safeIntersect] Non-primitive value of type ${typeof val} found in Set, skipping value.`);
        }
      });
      // Preserve originally empty sets, or sets that become empty after filtering non-primitives
      // if the original intent was to intersect with an empty set.
      // However, for intersection, an empty set resulting from filtering all non-primitives 
      // from a non-empty set should behave as an empty set.
      return primitiveOnlySet; 
    });

  if (validatedPrimitiveSets.length === 0) {
    return new Set<T>();
  }

  // Step 2: Compute intersection using reduce
  // Initialize accumulator with a copy of the first validated set
  const initialSet = new Set(validatedPrimitiveSets[0]); 

  const resultIntersection = validatedPrimitiveSets.slice(1).reduce((acc, currentSet) => {
    const newAcc = new Set<T>();
    acc.forEach(element => {
      if (currentSet.has(element)) {
        newAcc.add(element);
      }
    });
    return newAcc;
  }, initialSet);

  return resultIntersection;
}

/**
 * Utility: Compute cosine similarity between two vectors.
 * Ensures inputs are valid arrays of numbers and handles potential issues.
 * @param a First vector (array of numbers).
 * @param b Second vector (array of numbers).
 * @returns Cosine similarity score (number between -1 and 1), or 0 if inputs are invalid.
 * @throws Error if vectors have different lengths or contain non-finite numbers.
 */
// Generated on 2024-07-26
function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    logger.warn('[cosineSimilarity] Inputs must be arrays.');
    return 0;
  }
  if (a.length !== b.length) {
    logger.warn('[cosineSimilarity] Vectors must have the same length.');
    return 0;
  }
  if (a.length === 0) {
    logger.warn('[cosineSimilarity] Vectors are empty.');
    return 1; 
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  let invalidDataFound = false;

  // Standard for loop is used here. Linter flags for 'Object Injection Sink' on a[i] and b[i] 
  // are acknowledged but considered false positives in this context, as 'i' is a controlled loop variable.
  for (let i = 0; i < a.length; i++) {
    const valA = a[i]; 
    const valB = b[i];

    if (!Number.isFinite(valA) || !Number.isFinite(valB)) {
      logger.error('[cosineSimilarity] Vectors contain non-finite numbers.');
      invalidDataFound = true;
      break; // Exit loop early if invalid data is found
    }

    dotProduct += valA * valB;
    magnitudeA += valA * valA;
    magnitudeB += valB * valB;
  }

  if (invalidDataFound) {
    // TODO: [2024-07-26] - Standardize error objects across the project. For now, a generic Error is thrown.
    throw new Error('Vectors must contain finite numbers.');
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 && magnitudeB === 0) { 
    return 1;
  }
  if (magnitudeA === 0 || magnitudeB === 0) { 
    return 0;
  }

  const similarity = dotProduct / (magnitudeA * magnitudeB);
  return Math.max(-1, Math.min(1, similarity));
}
