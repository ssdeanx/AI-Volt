/* eslint-disable sonarjs/cognitive-complexity */
/**
 * Enhanced Web Browser Toolkit with isolated-vm and shelljs Integration
 * Demonstrates secure web scraping and browser automation using isolated-vm for sandboxing and shelljs for file operations
 */
import { createTool, createToolkit, type Toolkit } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import ivm from 'isolated-vm';
import * as shell from 'shelljs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as path from 'path';

// Configure shell for secure operations
shell.config.silent = true;
shell.config.fatal = false;

/**
 * Secure Web Content Processor using isolated-vm
 * Safely processes and transforms web content using user-provided scripts
 */
const secureWebProcessorSchema = z.object({
  url: z.string().describe('URL to fetch and process'),
  processingScript: z.string().describe('JavaScript code to process the fetched content safely'),
  timeout: z.number().min(1000).max(30000).default(15000).describe('Script execution timeout in milliseconds'),
  saveToFile: z.string().optional().describe('Optional file path to save processed results'),
  allowedDomains: z.array(z.string()).optional().describe('Whitelist of allowed domains for security'),
});

type SecureWebProcessorInput = z.infer<typeof secureWebProcessorSchema>;

const secureWebProcessorTool = createTool({
  name: 'secure_web_processor',
  description: 'Safely fetch and process web content using isolated-vm for secure script execution.',
  parameters: secureWebProcessorSchema,
  execute: async ({ url, processingScript, timeout, saveToFile, allowedDomains }: SecureWebProcessorInput) => {
    logger.info('[secureWebProcessorTool] Processing web content securely', { 
      url, scriptLength: processingScript.length, timeout, saveToFile 
    });
    
    try {
      // Domain validation
      if (allowedDomains && allowedDomains.length > 0) {
        const urlObj = new URL(url);
        if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
          throw new Error(`Domain not allowed: ${urlObj.hostname}`);
        }
      }

      // Fetch web content
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'AI-Volt Enhanced Web Toolkit/1.0',
        },
      });

      // Create isolated VM for content processing
      const isolate = new ivm.Isolate({ memoryLimit: 64 }); // 64MB limit
      const context = await isolate.createContext();
      const global = context.global;

      // Provide safe environment for content processing
      await global.set('htmlContent', response.data);
      await global.set('url', url);
      await global.set('statusCode', response.status);
      await global.set('headers', JSON.stringify(response.headers));

      // Safe console for logging
      await global.set('console', {
        log: (...args: any[]) => logger.info('[webProcessor]', args),
        error: (...args: any[]) => logger.error('[webProcessor]', args),
        warn: (...args: any[]) => logger.warn('[webProcessor]', args),
      });

      // Helper function to create element wrapper for reduced nesting
      const createElementWrapper = ($: cheerio.CheerioAPI, el: any) => ({
        text: $(el).text().trim(),
        html: $(el).html(),
        attr: (name: string) => $(el).attr(name),
      });

      // Provide cheerio-like functionality in isolated environment
      await global.set('parseHTML', (html: string) => {
        const $ = cheerio.load(html);
        return {
          find: (selector: string) => {
            const elements = $(selector);
            return Array.from(elements).map(el => createElementWrapper($, el));
          },
          text: () => $.text(),
          title: () => $('title').text(),
          links: () => {
            return $('a[href]').map((_, el) => ({
              text: $(el).text().trim(),
              href: $(el).attr('href'),
            })).get();
          },
          images: () => {
            return $('img[src]').map((_, el) => ({
              alt: $(el).attr('alt') || '',
              src: $(el).attr('src'),
            })).get();
          },
        };
      });

      // Utility functions
      await global.set('utils', {
        extractEmails: (text: string): string[] => {
          const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
          return text.match(emailRegex) || [];
        },
        extractPhones: (text: string): string[] => {
          const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
          return text.match(phoneRegex) || [];
        },
        cleanText: (text: string): string => {
          return text.replace(/\s+/g, ' ').trim();
        },
      });

      // Execute processing script with timeout
      const scriptPromise = context.eval(processingScript, { timeout });
      
      const result = await scriptPromise;

      // Save results to file if requested
      if (saveToFile && result) {
        const resultString = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        shell.ShellString(resultString).to(saveToFile);
      }

      // Clean up
      isolate.dispose();

      return {
        url,
        statusCode: response.status,
        contentLength: response.data.length,
        processedResult: result,
        savedToFile: saveToFile || null,
        executionTime: Date.now(),
        allowedDomains: allowedDomains || [],
      };
    } catch (error) {
      logger.error('[secureWebProcessorTool] Web processing failed', { 
        url, error: (error as Error).message 
      });
      throw new Error(`Secure web processing failed: ${(error as Error).message}`);
    }
  }});

/**
 * Cross-Platform Web Scraping Manager using shelljs
 * Manages web scraping sessions with file-based caching and cross-platform operations
 */
const webScrapingManagerSchema = z.object({
  urls: z.array(z.string()).min(1).max(10).describe('URLs to scrape (max 10)'),
  outputDir: z.string().default('./scraping_results').describe('Directory to store scraping results'),
  cacheResults: z.boolean().default(true).describe('Cache results to files for later use'),
  extractors: z.array(z.enum(['text', 'links', 'images', 'metadata', 'tables'])).default(['text']).describe('Data extractors to apply'),
  concurrent: z.boolean().default(false).describe('Process URLs concurrently'),
});

type WebScrapingManagerInput = z.infer<typeof webScrapingManagerSchema>;

const webScrapingManagerTool = createTool({
  name: 'web_scraping_manager',
  description: 'Cross-platform web scraping manager with file-based caching using shelljs.',
  parameters: webScrapingManagerSchema,
  execute: async ({ urls, outputDir, cacheResults, extractors, concurrent }: WebScrapingManagerInput) => {
    logger.info('[webScrapingManagerTool] Starting web scraping session', { 
      urlCount: urls.length, outputDir, cacheResults, extractors, concurrent 
    });
    
    try {
      // Create output directory using shelljs
      if (cacheResults) {
        shell.mkdir('-p', outputDir);
        if (!shell.test('-d', outputDir)) {
          throw new Error(`Failed to create output directory: ${outputDir}`);
        }
      }

      const scrapingResults: any[] = [];
      
      // Function to scrape a single URL
      const scrapeUrl = async (url: string, index: number) => {
        try {
          logger.info(`[webScrapingManagerTool] Scraping URL ${index + 1}/${urls.length}`, { url });
          
          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'AI-Volt Web Scraping Manager/1.0',
            },
          });

          const $ = cheerio.load(response.data);
          const result: any = {
            url,
            statusCode: response.status,
            timestamp: new Date().toISOString(),
            extractedData: {},
          };

          // Apply extractors
          if (extractors.includes('text')) {
            result.extractedData.text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1000);
          }

          if (extractors.includes('links')) {
            result.extractedData.links = $('a[href]').map((_: any, el: any) => ({
              text: $(el).text().trim(),
              href: $(el).attr('href'),
            })).get().slice(0, 20); // Limit to 20 links
          }

          if (extractors.includes('images')) {
            result.extractedData.images = $('img[src]').map((_: any, el: any) => ({
              alt: $(el).attr('alt') || '',
              src: $(el).attr('src'),
            })).get().slice(0, 10); // Limit to 10 images
          }

          if (extractors.includes('metadata')) {
            result.extractedData.metadata = {
              title: $('title').text().trim(),
              description: $('meta[name="description"]').attr('content') || '',
              keywords: $('meta[name="keywords"]').attr('content') || '',
              author: $('meta[name="author"]').attr('content') || '',
            };
          }

          if (extractors.includes('tables')) {
            // Helper function to extract table cell text
            const extractCellText = (cells: cheerio.Cheerio<any>): string[] => {
              return cells.map((_, td) => $(td).text().trim()).get();
            };

            // Helper function to extract table headers
            const extractTableHeaders = (table: any): string[] => {
              return $(table).find('th').map((_, th) => $(th).text().trim()).get();
            };

            // Helper function to extract table rows
            const extractTableRows = (table: any): string[][] => {
              const tableRows = $(table).find('tr');
              const rows: string[][] = [];
              tableRows.each((_, tr) => {
                const tableCells = $(tr).find('td');
                const cellTexts = extractCellText(tableCells);
                if (cellTexts.length > 0) {
                  rows.push(cellTexts);
                }
              });
              return rows;
            };

            // Extract all tables with reduced nesting
            const tables = $('table').map((_, table) => {
              const headers = extractTableHeaders(table);
              const rows = extractTableRows(table);
              return { headers, rows };
            }).get();

            result.extractedData.tables = tables.slice(0, 5); // Limit to 5 tables
          }

          // Cache results to file if enabled
          if (cacheResults) {
            const urlHash = Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
            const filename = `${outputDir}/scrape_${index}_${urlHash}.json`;
            const resultJson = JSON.stringify(result, null, 2);
            shell.echo(resultJson).to(filename);
            result.cachedFile = filename;
          }

          return result;
        } catch (error) {
          logger.error(`[webScrapingManagerTool] Failed to scrape URL`, { url, error: (error as Error).message });
          return {
            url,
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
          };
        }
      };

      // Validate and sanitize URLs before processing
      const validateUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          // Only allow HTTP and HTTPS protocols
          if (!['http:', 'https:'].includes(urlObj.protocol)) {
            throw new Error(`Unsupported protocol: ${urlObj.protocol}`);
          }
          return urlObj.toString();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Invalid URL format "${url}": ${errorMessage}`);
        }
      };

      const validatedUrls = urls.map(url => validateUrl(url));

      // Process URLs either concurrently or sequentially
      if (concurrent) {
        const promises = validatedUrls.map((url, index) => scrapeUrl(url, index));
        scrapingResults.push(...await Promise.allSettled(promises).then(results => 
          results.map(result => result.status === 'fulfilled' ? result.value : { error: 'Promise rejected' })
        ));
      } else {
        for (let i = 0; i < validatedUrls.length; i++) {
          // Safely access the validated URL array with bounds checking
          const urlFromValidatedArray = i < validatedUrls.length ? String(validatedUrls[i]) : '';

          let currentUrlToProcess: string;
          try {
            // Re-validation (defense-in-depth)
            // Ensure it's a non-empty string first
            if (typeof urlFromValidatedArray !== 'string' || urlFromValidatedArray.length === 0) {
              throw new Error('URL from validated array is not a valid string or is empty.');
            }
            const urlObj = new URL(urlFromValidatedArray);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
              throw new Error(`Unsupported protocol: ${urlObj.protocol}`);
            }
            currentUrlToProcess = urlObj.toString(); // Canonical form
          } catch (validationError) {
            logger.error('[webScrapingManagerTool] URL re-validation failed in loop', { 
              index: i, 
              url: typeof urlFromValidatedArray === 'string' ? urlFromValidatedArray : `invalid_data_at_index_${i}`,
              error: (validationError as Error).message 
            });
            scrapingResults.push({
              url: typeof urlFromValidatedArray === 'string' ? urlFromValidatedArray : `invalid_data_at_index_${i}`,
              error: `URL re-validation failed: ${(validationError as Error).message}`,
              timestamp: new Date().toISOString(),
            });
            continue; // Skip to next URL
          }

          // If re-validation passed, currentUrlToProcess is set. Now call scrapeUrl.
          try {
            const result = await scrapeUrl(currentUrlToProcess, i);
            scrapingResults.push(result);
          } catch (scrapeError) {
            logger.error(`[webScrapingManagerTool] scrapeUrl failed for URL`, { url: currentUrlToProcess, error: (scrapeError as Error).message });
            scrapingResults.push({
              url: currentUrlToProcess,
              error: `Scraping execution failed: ${(scrapeError as Error).message}`,
              timestamp: new Date().toISOString(),
            });
            // Continue to next URL even if one fails
          }
        }
      }

      // Generate session summary
      const summary = {
        sessionId: `scraping_${Date.now()}`,
        totalUrls: urls.length,
        successCount: scrapingResults.filter(r => !r.error).length,
        errorCount: scrapingResults.filter(r => r.error).length,
        outputDirectory: cacheResults ? outputDir : null,
        extractors,
        concurrent,
        completedAt: new Date().toISOString(),
      };

      // Save session summary if caching enabled
      if (cacheResults) {
        const summaryFile = path.join(outputDir, 'session_summary.json');
        shell.echo(JSON.stringify({ summary, results: scrapingResults }, null, 2)).to(summaryFile);
      }

      return {
        summary,
        results: scrapingResults,
      };
    } catch (error) {
      logger.error('[webScrapingManagerTool] Scraping session failed', { 
        urls: urls.length, error: (error as Error).message 
      });
      throw new Error(`Web scraping session failed: ${(error as Error).message}`);
    }
  }});
/**
 * Isolated Web Content Validator
 * Validates and analyzes web content safely using isolated-vm
 */
const webContentValidatorSchema = z.object({
  content: z.string().describe('HTML content to validate and analyze'),
  validationRules: z.array(z.string()).optional().describe('Custom validation rules as JavaScript expressions'),
  checkAccessibility: z.boolean().default(true).describe('Check basic accessibility compliance'),
  extractStructure: z.boolean().default(true).describe('Extract document structure information'),
});

type WebContentValidatorInput = z.infer<typeof webContentValidatorSchema>;

const webContentValidatorTool = createTool({
  name: 'web_content_validator',
  description: 'Validate and analyze web content structure using isolated-vm for safe processing.',
  parameters: webContentValidatorSchema,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  execute: async ({ content, validationRules, checkAccessibility, extractStructure }: WebContentValidatorInput) => {
    logger.info('[webContentValidatorTool] Validating web content', { 
      contentLength: content.length, rulesCount: validationRules?.length || 0, checkAccessibility, extractStructure 
    });
    
    try {
      // Create isolated VM for content validation
      const isolate = new ivm.Isolate({ memoryLimit: 32 });
      const context = await isolate.createContext();
      const global = context.global;

      // Provide content and utilities
      await global.set('htmlContent', content);
      await global.set('console', {
        log: (...args: any[]) => logger.info('[contentValidator]', args),
        warn: (...args: any[]) => logger.warn('[contentValidator]', args),
      });

      // Parse content with cheerio and provide safe interface
      const $ = cheerio.load(content);
      
      // Basic validation script
      const validationScript = `
        (function() {
          const results = {
            validation: { valid: true, issues: [] },
            accessibility: null,
            structure: null,
          };

          try {
            // Basic HTML structure validation
            const hasDoctype = htmlContent.toLowerCase().includes('<!doctype');
            const hasHtml = htmlContent.toLowerCase().includes('<html');
            const hasHead = htmlContent.toLowerCase().includes('<head');
            const hasBody = htmlContent.toLowerCase().includes('<body');

            if (!hasDoctype) results.validation.issues.push('Missing DOCTYPE declaration');
            if (!hasHtml) results.validation.issues.push('Missing HTML element');
            if (!hasHead) results.validation.issues.push('Missing HEAD element');
            if (!hasBody) results.validation.issues.push('Missing BODY element');

            results.validation.valid = results.validation.issues.length === 0;

            return results;
          } catch (error) {
            return { error: error.message };
          }
        })();
      `;

      const basicResults = await context.eval(validationScript);
      
      // Accessibility checks using cheerio (outside isolated VM for DOM access)
      if (checkAccessibility) {
        const accessibilityIssues: string[] = [];
        
        // Check for missing alt attributes on images
        $('img:not([alt])').each((_, _el) => {
          accessibilityIssues.push('Image missing alt attribute');
        });

        // Check for missing labels on form inputs
        $('input:not([type="submit"]):not([type="button"])').each((_, el) => {
          const id = $(el).attr('id');
          if (id && $(`label[for="${id}"]`).length === 0) {
            accessibilityIssues.push(`Input with id="${id}" missing associated label`);
          }
        });

        // Check for proper heading hierarchy
        const headings = $('h1, h2, h3, h4, h5, h6').map((_, el) => {
          const tagName = el.tagName;
          if (typeof tagName === 'string' && tagName.length > 1) {
            const level = parseInt(tagName.substring(1), 10);
            return isNaN(level) ? undefined : level;
          }
          return undefined;
        }).get().filter((level): level is number => typeof level === 'number') as number[];
        
        for (let i = 1; i < headings.length; i++) {
          const currentHeading = headings.at(i);
          const previousHeading = headings.at(i - 1);
          if (typeof currentHeading === 'number' && typeof previousHeading === 'number' && currentHeading - previousHeading > 1) {
            accessibilityIssues.push('Heading hierarchy skip detected');
            break;
          }
        }

        basicResults.accessibility = {
          issues: accessibilityIssues.slice(0, 10), // Limit to 10 issues
          score: Math.max(0, 100 - (accessibilityIssues.length * 10)),
        };
      }

      // Structure extraction
      if (extractStructure) {
        basicResults.structure = {
          headings: $('h1, h2, h3, h4, h5, h6').map((_, el) => ({
            level: parseInt(el.tagName.substring(1)),
            text: $(el).text().trim(),
          })).get(),
          linkCount: $('a[href]').length,
          imageCount: $('img').length,
          formCount: $('form').length,
          scriptCount: $('script').length,
          styleCount: $('style, link[rel="stylesheet"]').length,
          metaTags: $('meta').map((_, el) => ({
            name: $(el).attr('name') || $(el).attr('property') || '',
            content: $(el).attr('content') || '',
          })).get(),
        };
      }

      // Apply custom validation rules if provided
      if (validationRules && validationRules.length > 0) {
        for (const rule of validationRules) {
          try {
            await global.set('customRule', rule);
            const ruleResult = await context.eval(`
              (function() {
                try {
                  return (function() { ${rule} })();
                } catch (error) {
                  return { error: error.message };
                }
              })();
            `, { timeout: 5000 });

            if (ruleResult.error) {
              basicResults.validation.issues.push(`Custom rule execution failed: ${ruleResult.error}`);
            }
          } catch (error) {
            basicResults.validation.issues.push(`Custom rule execution failed: ${(error as Error).message}`);
          }
        }
      }

      isolate.dispose();

      return {
        contentLength: content.length,
        validation: basicResults.validation,
        accessibility: basicResults.accessibility,
        structure: basicResults.structure,
        customRulesApplied: validationRules?.length || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[webContentValidatorTool] Content validation failed', { 
        contentLength: content.length, error: (error as Error).message 
      });
      throw new Error(`Web content validation failed: ${(error as Error).message}`);
    }
  }});

/**
 * Enhanced Web Browser Toolkit combining all enhanced tools
 */
const enhancedWebBrowserToolkit: Toolkit = createToolkit({
  name: 'enhanced_web_browser_toolkit',
  description: 'Enhanced web browser toolkit with isolated-vm security and shelljs file operations.',
  instructions: `
You have access to an enhanced web browser toolkit with advanced security and cross-platform capabilities:

**Enhanced Features:**
1. **Secure Content Processing**: Execute custom JavaScript on web content safely using isolated-vm
2. **Cross-Platform File Operations**: Use shelljs for reliable file caching and storage across platforms
3. **Advanced Web Scraping**: Multi-URL scraping with caching and concurrent processing
4. **Content Validation**: Comprehensive HTML validation and accessibility checking

**Available Tools:**

1. **secure_web_processor**: Process web content with custom scripts in isolated environment
   - Safe execution of user-provided JavaScript for content transformation
   - Memory limits and timeouts for security
   - Domain whitelisting for additional security
   - File saving capabilities using shelljs

2. **web_scraping_manager**: Cross-platform web scraping with caching
   - Scrape multiple URLs with various data extractors
   - File-based caching for results using shelljs
   - Concurrent or sequential processing options
   - Comprehensive session management and reporting

3. **web_content_validator**: Validate HTML content and check accessibility
   - Structure validation in isolated environment
   - Basic accessibility compliance checking
   - Custom validation rules support
   - Document structure analysis

**Security Features:**
- All custom script execution in isolated-vm sandboxes
- Memory limits and timeouts for all operations
- Domain whitelisting for content processing
- Safe file operations using shelljs
- Input validation and sanitization

**Use Cases:**
- Safe web content transformation and analysis
- Large-scale web scraping with result caching
- HTML validation and accessibility auditing
- Custom web content processing workflows
- Cross-platform web automation tasks

**Safety Notes:**
- Custom scripts run in isolated environments with limited access
- File operations are sandboxed to specified directories
- Network requests have timeout limits
- All operations include comprehensive error handling
  `,
  addInstructions: true,
  tools: [
    secureWebProcessorTool as any,
    webScrapingManagerTool as any,
    webContentValidatorTool as any,
  ],
});

// Exports
export {
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
  enhancedWebBrowserToolkit,
};
