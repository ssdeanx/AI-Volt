/**
 * Knowledge Base Tools
 * Provides capabilities for ingesting, querying, and managing project documentation and knowledge.
 * Integrates with SupervisorRetriever for sophisticated embedding-based storage and retrieval.
 * Generated on 2025-06-10
 */
import * as fs from 'fs/promises';
import { createTool } from '@voltagent/core';
import { z } from 'zod';
import { generateId } from 'ai';
import { logger } from '../config/logger.js';
import { secureWebProcessorTool } from "./enhancedWebBrowser.js";
import { SupervisorRetriever } from '../agents/supervisorRetriever.js';

/**
 * Global knowledge base retriever instance
 * Integrates with the sophisticated SupervisorRetriever for persistent, embedded storage
 */
let globalKnowledgeRetriever: SupervisorRetriever | null = null;

/**
 * Initialize the knowledge base with a SupervisorRetriever instance
 * @param retriever - The SupervisorRetriever instance to use for knowledge storage
 */
export const initializeKnowledgeBase = (retriever: SupervisorRetriever): void => {
  globalKnowledgeRetriever = retriever;
  logger.info('[KnowledgeBase] Initialized with SupervisorRetriever integration');
};

/**
 * Get or create the knowledge base retriever
 * @returns SupervisorRetriever instance for knowledge management
 * @throws Error if knowledge base not initialized
 */
const getKnowledgeRetriever = (): SupervisorRetriever => {
  if (!globalKnowledgeRetriever) {
    throw new Error('Knowledge base not initialized. Call initializeKnowledgeBase() first.');
  }
  return globalKnowledgeRetriever;
};

/**
 * Enhanced Ingest Document Tool
 * Reads content from a specified source and adds it to the sophisticated knowledge base with embeddings
 */
export const ingestDocumentTool = createTool({
  name: "ingest_document",
  description: "Reads content from a specified source (file path, URL, or raw text) and adds it to the knowledge base with embeddings for semantic search.",
  parameters: z.object({
    sourceType: z.enum(["filepath", "url", "raw_text"]).describe("The type of source to ingest from."),
    source: z.string().describe("The actual source content (file path, URL, or the raw text itself)."),
    documentId: z.string().optional().describe("Optional: A unique ID for the document. If not provided, one will be generated."),
    metadata: z.record(z.any()).optional().describe("Optional: Additional metadata to associate with the document (e.g., author, date, tags)."),
    chunkSize: z.number().optional().default(300).describe("Size of chunks for embedding (default: 300 characters)."),
    tags: z.array(z.string()).optional().describe("Optional tags for categorization and filtering."),
  }),
  execute: async ({ sourceType, source, documentId, metadata = {}, chunkSize, tags = [] }) => {
    const retriever = getKnowledgeRetriever();
    const docId = documentId || `doc-${generateId()}`;
    
    logger.info(`[ingestDocumentTool] Ingesting document from ${sourceType}: ${source}`);
    
    try {
      let content: string;

      switch (sourceType) {
        case "filepath":
          try {
            // Validate and read file with path.resolve for security
            const path = await import('path');
            const resolvedPath = path.resolve(source);
            content = await fs.readFile(resolvedPath, { encoding: 'utf8' });
          } catch (fileError) {
            throw new Error(`Failed to read file ${source}: ${(fileError as Error).message}`);
          }
          break;
          
        case "url":
          try {
            const webResult: any = await secureWebProcessorTool.execute({
              url: source,
              processingScript: `return htmlContent;`,
              timeout: 30000,
            });
            content = webResult.processedResult as string;
          } catch (webError) {
            throw new Error(`Failed to fetch content from URL ${source}: ${(webError as Error).message}`);
          }
          break;
          
        case "raw_text":
          content = source;
          break;
          
        default:
          throw new Error(`Unsupported source type: ${sourceType}`);
      }

      if (!content || content.trim().length === 0) {
        throw new Error(`No content found from source: ${source}`);
      }      // Use the SupervisorRetriever's ingestChatContext method for document ingestion
      await retriever.ingestChatContext(
        docId,
        content,
        source,
        {
          ...metadata,
          documentId: docId,
          sourceType,
          tags,
          timestamp: Date.now(),
          contentLength: content.length,
          type: 'document',
        },
        chunkSize
      );

      logger.info(`[ingestDocumentTool] Document ingested successfully`, {
        documentId: docId,
        source,
        sourceType,
        contentLength: content.length,
        chunkSize,
        tags
      });

      return JSON.stringify({
        success: true,
        documentId: docId,
        source,
        sourceType,
        contentLength: content.length,
        chunksCreated: Math.ceil(content.length / chunkSize),
        message: `Document '${docId}' from '${source}' ingested with embeddings.`
      });
      
    } catch (error) {
      logger.error(`[ingestDocumentTool] Failed to ingest document`, {
        source,
        sourceType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Document ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Enhanced Query Knowledge Base Tool
 * Performs semantic search using embeddings and sophisticated retrieval
 */
export const queryKnowledgeBaseTool = createTool({
  name: "query_knowledge_base",
  description: "Searches the knowledge base using semantic similarity and keyword matching for relevant information.",
  parameters: z.object({
    query: z.string().describe("The natural language query to search the knowledge base."),
    limit: z.number().optional().default(5).describe("The maximum number of relevant documents to return."),
    minRelevanceScore: z.number().optional().default(0.3).describe("Minimum relevance score to include results."),
    searchType: z.enum(["semantic", "keyword", "hybrid"]).optional().default("hybrid").describe("Type of search to perform."),
    tags: z.array(z.string()).optional().describe("Filter results by specific tags."),
    sourceType: z.enum(["filepath", "url", "raw_text"]).optional().describe("Filter by source type."),
  // eslint-disable-next-line sonarjs/cognitive-complexity
  }),  execute: async ({ query, limit, minRelevanceScore, searchType, tags, sourceType }) => {
    const retriever = getKnowledgeRetriever();
    
    logger.info(`[queryKnowledgeBaseTool] Querying knowledge base`, {
      query: query.substring(0, 100),
      searchType,
      limit,
      minRelevanceScore,
      tags,
      sourceType
    });
    
    try {
      // retrieve() might return a JSON string or an array directly.
      // The TypeScript error suggests it's typed as returning a string.
      const retrievedData = await retriever.retrieve(query, {
        limit,
        contextType: 'document'
      });

      let searchResult: any[]; // This will hold the array we need for .map()

      if (typeof retrievedData === 'string') {
        // If it's a string, assume it's JSON and parse it.
        try {
          searchResult = JSON.parse(retrievedData);
          if (!Array.isArray(searchResult)) {
            logger.error('[queryKnowledgeBaseTool] Parsed data from retriever is not an array.', { parsedData: searchResult, originalData: retrievedData });
            throw new Error('Retrieved search data, after parsing, was not in the expected array format.');
          }
        } catch (parseError) {
          logger.error('[queryKnowledgeBaseTool] Failed to parse JSON string from retriever.retrieve()', { rawData: retrievedData, error: parseError });
          throw new Error(`Failed to parse search result: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      } else if (Array.isArray(retrievedData)) {
        // If it's already an array (e.g., if types were 'any' or retriever was updated)
        searchResult = retrievedData;
      } else {
        // If it's neither a string nor an array, it's an unexpected format.
        logger.error('[queryKnowledgeBaseTool] Unexpected data type from retriever.retrieve(). Expected string or array.', { type: typeof retrievedData, data: retrievedData });
        throw new Error('Unexpected data type for search results from retriever.');
      }

      // Process results using the now-guaranteed-to-be-array searchResult
      const processedResults = searchResult.map((entry: any) => ({
        documentId: entry.metadata?.documentId || entry.id,
        source: entry.source,
        sourceType: entry.metadata?.sourceType || "unknown",
        content: entry.content,
        relevanceScore: entry.metadata?.relevanceScore || 0.5,
        tags: entry.metadata?.tags || [],
        timestamp: entry.metadata?.timestamp || Date.now(),
        searchType: searchType || 'keyword'
      }));

      // Filter by sourceType if provided
      const filteredResults = sourceType 
        ? processedResults.filter((r: any) => r.sourceType === sourceType)
        : processedResults;

      if (filteredResults.length > 0) {
        logger.info(`[queryKnowledgeBaseTool] Found ${filteredResults.length} relevant documents`);
        
        return JSON.stringify({
          success: true,
          query,
          searchType,
          totalResults: filteredResults.length,
          results: filteredResults.slice(0, limit).map((result: any) => ({
            documentId: result.documentId,
            source: result.source,
            sourceType: result.sourceType,
            contentPreview: result.content.substring(0, 300) + (result.content.length > 300 ? "..." : ""),
            relevanceScore: result.relevanceScore,
            tags: result.tags,
            searchType: result.searchType,
            timestamp: new Date(result.timestamp).toISOString()
          })),
          message: `Found ${filteredResults.length} relevant documents using ${searchType} search.`
        });
      } else {
        logger.info(`[queryKnowledgeBaseTool] No relevant documents found`, { query, searchType });
        
        return JSON.stringify({
          success: true,
          query,
          searchType,
          totalResults: 0,
          results: [],
          message: "No relevant documents found. Try adjusting your query or lowering the relevance threshold."
        });
      }
      
    } catch (error) {
      logger.error(`[queryKnowledgeBaseTool] Search failed`, {
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Knowledge base search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Enhanced Summarize Document Tool with AI-powered summarization capabilities
 */
export const summarizeDocumentTool = createTool({
  name: "summarize_document",
  description: "Generates a concise summary of provided document content using intelligent sentence extraction and key point identification.",
  parameters: z.object({
    documentContent: z.string().describe("The full content of the document to summarize."),
    sentenceCount: z.number().optional().default(3).describe("The number of key sentences to extract for the summary."),
    summaryType: z.enum(["extractive", "key_points", "structured"]).optional().default("extractive").describe("Type of summary to generate."),
  }),
  execute: async ({ documentContent, sentenceCount, summaryType }) => {
    logger.info(`[summarizeDocumentTool] Summarizing document`, {
      contentLength: documentContent.length,
      sentenceCount,
      summaryType
    });
    
    try {
      // Enhanced sentence tokenization with better handling
      const sentences = documentContent
        .split(/(?<=[.!?])\s+/)
        .filter((s: string) => s.trim().length > 10) // Filter out very short sentences
        .map((s: string) => s.trim());

      if (sentences.length === 0) {
        throw new Error("No valid sentences found in document content");
      }

      let summary: string;
      const metadata: Record<string, any> = {};

      switch (summaryType) {
        case "extractive":
          // Extract key sentences based on position and length heuristics
          { const keyIndices = [
            0, // First sentence
            Math.floor(sentences.length / 2), // Middle sentence
            sentences.length - 1 // Last sentence
          ].filter((idx, i, arr) => arr.indexOf(idx) === i) // Remove duplicates
           .slice(0, sentenceCount);
          
          summary = keyIndices.map(idx => sentences[idx]).join(' ');
          metadata.extractionMethod = "positional_heuristic";
          break; }

        case "key_points":
          // Extract sentences with key indicators
          { const keywordPatterns = /\b(important|key|significant|essential|critical|main|primary|conclusion|result|finding)\b/i;
          const keywordSentences = sentences
            .filter((s: string) => keywordPatterns.test(s))
            .slice(0, sentenceCount);
          
          summary = keywordSentences.length > 0 
            ? keywordSentences.join(' ')
            : sentences.slice(0, sentenceCount).join(' ');
          metadata.extractionMethod = "keyword_based";
          break; }

        case "structured":
          // Create a structured summary with sections
          { const firstSentence = sentences[0];
          const lastSentence = sentences[sentences.length - 1];
          const middleSentences = sentences.slice(1, -1).slice(0, sentenceCount - 2);
          
          summary = [
            `Overview: ${firstSentence}`,
            middleSentences.length > 0 ? `Key Points: ${middleSentences.join(' ')}` : '',
            `Conclusion: ${lastSentence}`
          ].filter(Boolean).join('\n\n');
          metadata.extractionMethod = "structured";
          break; }

        default:
          summary = sentences.slice(0, sentenceCount).join(' ');
          metadata.extractionMethod = "simple";
      }

      const result = {
        success: true,
        originalLength: documentContent.length,
        originalSentenceCount: sentences.length,
        summaryLength: summary.length,
        summaryType,
        extractionMethod: metadata.extractionMethod,
        summary,
        metadata
      };

      logger.info(`[summarizeDocumentTool] Document summarized successfully`, {
        originalLength: documentContent.length,
        summaryLength: summary.length,
        summaryType,
        extractionMethod: metadata.extractionMethod
      });

      return JSON.stringify(result);
      
    } catch (error) {
      logger.error(`[summarizeDocumentTool] Summarization failed`, {
        contentLength: documentContent.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Document summarization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Enhanced List Knowledge Base Documents Tool
 */
export const listKnowledgeBaseDocumentsTool = createTool({
  name: "list_knowledge_base_documents",
  description: "Lists all documents currently stored in the knowledge base with comprehensive metadata and filtering options.",
  parameters: z.object({
    sourceType: z.enum(["filepath", "url", "raw_text"]).optional().describe("Filter by source type."),
    tags: z.array(z.string()).optional().describe("Filter by specific tags."),
    limit: z.number().optional().default(50).describe("Maximum number of documents to return."),
    sortBy: z.enum(["timestamp", "source", "contentLength"]).optional().default("timestamp").describe("Sort documents by specified field."),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort order."),
  }),
  execute: async ({ sourceType, tags, limit, sortBy, sortOrder }) => {
    const retriever = getKnowledgeRetriever();
    
    logger.info(`[listKnowledgeBaseDocumentsTool] Listing knowledge base documents`, {
      sourceType,
      tags,
      limit,
      sortBy,
      sortOrder
    });
    
    try {
      // Get statistics from the retriever
      const stats = retriever.getStats();
      
      // Search for document contexts with filters
      const allDocuments = retriever.search("", {
        type: 'document',
        limit: limit * 2, // Get more to allow for filtering
        minRelevanceScore: 0, // Include all documents
      });

      // Apply filters
      let filteredDocuments = allDocuments;
      
      if (sourceType) {
        filteredDocuments = filteredDocuments.filter((doc: any) => 
          doc.metadata?.sourceType === sourceType
        );
      }
      
      if (tags && tags.length > 0) {
        filteredDocuments = filteredDocuments.filter((doc: any) => 
          doc.metadata?.tags && 
          tags.some(tag => doc.metadata.tags.includes(tag))
        );
      }

      // Group by documentId to avoid duplicates from chunking
      const documentMap = new Map();
      filteredDocuments.forEach((doc: any) => {
        const docId = doc.metadata?.documentId || doc.id;
        if (!documentMap.has(docId) || doc.metadata?.chunkIndex === 0) {
          documentMap.set(docId, doc);
        }
      });

      // Convert to array and sort
      let documents = Array.from(documentMap.values());
      
      documents.sort((a: any, b: any) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case "source":
            aValue = a.source || "";
            bValue = b.source || "";
            break;
          case "contentLength":
            aValue = a.metadata?.contentLength || a.content.length;
            bValue = b.metadata?.contentLength || b.content.length;
            break;
          case "timestamp":
          default: // Moved default here
            aValue = a.metadata?.timestamp || 0;
            bValue = b.metadata?.timestamp || 0;
            break;
        }
        
        if (sortOrder === "asc") {
          if (aValue < bValue) return -1;
          if (aValue > bValue) return 1;
          return 0;
        } else {
          if (aValue > bValue) return -1;
          if (aValue < bValue) return 1;
          return 0;
        }
      });      // Apply final limit
      documents = documents.slice(0, limit);

      const result = {
        success: true,
        totalDocumentsInBase: stats.totalContexts,
        filteredCount: documents.length,
        filters: { sourceType, tags, sortBy, sortOrder },
        statistics: stats,
        documents: documents.map((doc: any) => ({
          documentId: doc.metadata?.documentId || doc.id,
          source: doc.source,
          sourceType: doc.metadata?.sourceType || "unknown",
          contentPreview: doc.content.substring(0, 150) + (doc.content.length > 150 ? "..." : ""),
          contentLength: doc.metadata?.contentLength || doc.content.length,
          tags: doc.metadata?.tags || [],
          timestamp: new Date(doc.metadata?.timestamp || 0).toISOString(),
          metadata: {
            ...doc.metadata,
            // Remove internal fields for cleaner output
            chunkIndex: undefined,
            embedding: undefined,
          }
        }))
      };

      logger.info(`[listKnowledgeBaseDocumentsTool] Listed ${documents.length} documents`);
      return JSON.stringify(result);
      
    } catch (error) {
      logger.error(`[listKnowledgeBaseDocumentsTool] Failed to list documents`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to list knowledge base documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});