/**
 * Knowledge Base Tools
 * Provides capabilities for ingesting, querying, and managing project documentation and knowledge.
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import * as fs from 'fs/promises'; // Import fs.promises for robust file operations
import { secureWebProcessorTool } from "./enhancedWebBrowser.js"; // Import for URL ingestion

// Simple in-memory store for demonstration. In a real application, this would be a database or vector store.
const knowledgeStore: Array<{ id: string; content: string; source: string; metadata: Record<string, any> }> = [];

/**
 * Ingest Document Tool
 * Reads content from a specified source (file, URL, or raw text) and adds it to the knowledge base.
 */
export const ingestDocumentTool = createTool({
  name: "ingest_document",
  description: "Reads content from a specified source (file path, URL, or raw text) and adds it to the knowledge base for later retrieval.",
  parameters: z.object({
    sourceType: z.enum(["filepath", "url", "raw_text"]).describe("The type of source to ingest from."),
    source: z.string().describe("The actual source content (file path, URL, or the raw text itself)."),
    documentId: z.string().optional().describe("Optional: A unique ID for the document. If not provided, one will be generated."),
    metadata: z.record(z.any()).optional().describe("Optional: Additional metadata to associate with the document (e.g., author, date, tags)."),
  }),
  execute: async ({ sourceType, source, documentId, metadata }) => {
    logger.info(`[ingestDocumentTool] Ingesting document from ${sourceType}: ${source}`);
    try {
      let content: string;

      switch (sourceType) {
        case "filepath":
          try {
            // Validate file path before reading
            const normalizedPath = new URL(source, import.meta.url).pathname;
            content = await fs.readFile(normalizedPath, { encoding: 'utf8' });
          } catch (fileError) {
            throw new Error(`Failed to read file ${source}: ${(fileError as Error).message}`);
          }
          break;
        case "url":
          try {
            const webResult: any = await secureWebProcessorTool.execute({
              url: source,
              processingScript: `return htmlContent;`, // Simple script to return raw HTML
              timeout: 20000, // Extend timeout for web requests
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
      
      const id = documentId || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      knowledgeStore.push({ id, content, source, metadata: { ...metadata, timestamp: Date.now() } });

      logger.info(`[ingestDocumentTool] Document ingested successfully: ${id}`);
      return { success: true, documentId: id, message: `Document '${id}' from '${source}' ingested.` };
    } catch (error) {
      logger.error(`[ingestDocumentTool] Failed to ingest document from ${sourceType}: ${source}`, error);
      throw new Error(`Document ingestion failed: ${(error as Error).message}`);
    }

  },});

/**
 * Query Knowledge Base Tool
 * Searches the ingested knowledge base for relevant information based on a natural language query.
 */
export const queryKnowledgeBaseTool = createTool({
  name: "query_knowledge_base",
  description: "Searches the ingested knowledge base for information relevant to a natural language query.",
  parameters: z.object({
    query: z.string().describe("The natural language query to search the knowledge base."),
    limit: z.number().optional().default(3).describe("The maximum number of relevant documents to return."),
    minRelevanceScore: z.number().optional().default(0.5).describe("Minimum relevance score to include results."),
  }),
  execute: async ({ query, limit, minRelevanceScore }) => {
    logger.info(`[queryKnowledgeBaseTool] Querying knowledge base for: ${query}`);
    const queryLower = query.toLowerCase();
    
    const results = knowledgeStore
      .map(doc => {
        let score = 0;
        // Simple keyword matching for relevance
        if (doc.content.toLowerCase().includes(queryLower)) {
          score += 1;
        }
        if (doc.source.toLowerCase().includes(queryLower)) {
          score += 0.5;
        }
        // Basic word match scoring
        queryLower.split(/\s+/).forEach(word => {
          if (word.length > 2 && doc.content.toLowerCase().includes(word)) {
            score += 0.1;
          }
        });
        return { doc, score };
      })
      .filter(item => item.score >= minRelevanceScore)
      .sort((a, b) => b.score - a.score) // Sort by highest score first
      .slice(0, limit);

    if (results.length > 0) {
      logger.info(`[queryKnowledgeBaseTool] Found ${results.length} relevant documents.`);
      return {
        success: true,
        query,
        results: results.map(item => ({
          documentId: item.doc.id,
          source: item.doc.source,
          contentPreview: item.doc.content.substring(0, 200) + (item.doc.content.length > 200 ? "..." : ""),
          score: item.score,
          metadata: item.doc.metadata
        })),
        message: `Found ${results.length} relevant documents.`
      };
    } else {
      logger.info(`[queryKnowledgeBaseTool] No relevant documents found for: ${query}`);
      return { success: true, query, results: [], message: "No relevant documents found." };
    }
  },
});

/**
 * Summarize Document Tool
 * Generates a concise summary of a given document content by extracting key sentences.
 */
export const summarizeDocumentTool = createTool({
  name: "summarize_document",
  description: "Generates a concise summary of provided document content by extracting key sentences.",
  parameters: z.object({
    documentContent: z.string().describe("The full content of the document to summarize."),
    sentenceCount: z.number().optional().default(3).describe("The number of key sentences to extract for the summary."),
  }),
  execute: async ({ documentContent, sentenceCount }) => {
    logger.info(`[summarizeDocumentTool] Summarizing document (length: ${documentContent.length})`);
    
    // Simple sentence tokenization and extraction (non-LLM based heuristic)
    const sentences = documentContent.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const summarySentences = sentences.slice(0, sentenceCount);
    const summary = summarySentences.join(' ');

    logger.info(`[summarizeDocumentTool] Document summarized.`);
    return { success: true, originalLength: documentContent.length, summaryLength: summary.length, summary };
  },
});

/**
 * List Knowledge Base Documents Tool
 * Lists all documents currently stored in the knowledge base.
 */
export const listKnowledgeBaseDocumentsTool = createTool({
  name: "list_knowledge_base_documents",
  description: "Lists all documents currently stored in the in-memory knowledge base.",
  parameters: z.object({}),
  execute: async () => {
    logger.info(`[listKnowledgeBaseDocumentsTool] Listing all documents in knowledge base.`);
    const getSourceType = (source) => {
      if (source.startsWith('http')) {
        return 'url';
      }
      if (source.includes('.') && 
          source.length > source.lastIndexOf('.') + 1 && 
          !source.substring(source.lastIndexOf('.')).includes('/')) {
        return 'filepath';
      }
      return 'raw_text';
    };

    const documents = knowledgeStore.map(doc => ({
      id: doc.id,
      source: doc.source,
      sourceType: getSourceType(doc.source),
      contentPreview: doc.content.substring(0, 100) + (doc.content.length > 100 ? "..." : ""),
      metadata: doc.metadata,
    }));
    logger.info(`[listKnowledgeBaseDocumentsTool] Found ${documents.length} documents.`);
    return { success: true, count: documents.length, documents };
  },
}); 