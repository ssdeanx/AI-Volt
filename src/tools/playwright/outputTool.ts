/**
 * @file Browser Output Tools
 * @description Tools for saving and outputting data from the browser
 */

import { z } from "zod";
import { createTool, type ToolExecuteOptions } from "@voltagent/core";
import type { ToolExecutionContext } from "@voltagent/core";
import { safeBrowserOperation } from "./browserBaseTools.js";
import * as path from "node:path";
import type { Page } from "playwright";
import * as shell from "shelljs"; // Import shelljs

// Define a base directory for all outputs
const BASE_OUTPUT_DIR = path.resolve(process.cwd(), "ai-volt-output");

/**
 * Tool for saving content to a file
 */
export const saveToFileTool = createTool({
  name: "saveToFile",
  description: "Save content to a file",
  parameters: z.object({
    content: z.string().describe("Content to save to the file"),
    filePath: z.string().describe("Relative path within the output directory where the file should be saved"),
    overwrite: z.boolean().optional().default(false).describe("Whether to overwrite existing file"),
    timeout: z.number().positive().optional().default(30000),
  }),
  execute: async (args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    try {
      const fullPath = path.join(BASE_OUTPUT_DIR, args.filePath);
      const dirPath = path.dirname(fullPath);

      // Ensure the base output directory exists first
      shell.mkdir('-p', BASE_OUTPUT_DIR);
      
      // Ensure the target directory exists
      shell.mkdir('-p', dirPath);

      // Check existence and handle overwrite asynchronously
      if (!args.overwrite) {
        if (shell.test('-e', fullPath)) {
          // File exists and overwrite is false, throw error
          throw new Error(
            `File already exists: ${fullPath}. Set overwrite to true to replace it.`
          );
        }
      }
      // Overwrite is true or file doesn't exist, proceed

      // Write content to file asynchronously
      shell.ShellString(args.content).to(fullPath);

      return {
        result: `Content successfully saved to ${fullPath}`,
      };
    } catch (error: any) {
      console.error(`Error in saveToFileTool: ${error.message}`);
      throw error; // Re-throw after logging
    }
  },
});

/**
 * Tool for exporting page as PDF
 */
export const exportPdfTool = createTool({
  name: "exportToPdf",
  description: "Exports the current page content to a PDF file.",
  parameters: z.object({
    filename: z.string().describe("Relative path within the output directory where the PDF file will be saved."),
    format: z
      .enum(["Letter", "Legal", "Tabloid", "Ledger", "A0", "A1", "A2", "A3", "A4", "A5"])
      .optional()
      .default("A4"),
    printBackground: z.boolean().optional().default(true),
    timeout: z.number().positive().optional().default(60000),
    // Add other Playwright PDF options as needed (scale, margins, etc.)
  }),
  execute: async (args, options?: ToolExecuteOptions) => {
    return safeBrowserOperation(options as ToolExecutionContext, async (page: Page) => {
      const fullPath = path.join(BASE_OUTPUT_DIR, args.filename);
      const dir = path.dirname(fullPath);

      // Ensure the base output directory exists first
      shell.mkdir('-p', BASE_OUTPUT_DIR);
      
      // Ensure the target directory exists
      shell.mkdir('-p', dir);

      // Generate PDF (Playwright handles file writing here)
      await page.pdf({
        path: fullPath,
        format: args.format,
        printBackground: args.printBackground,
        // timeout: args.timeout, // Timeout is not a direct option for page.pdf
        // Pass other valid Playwright PDF options here if needed
      });

      return { result: `Page exported successfully to PDF: ${fullPath}` };
    });
  },
});

/**
 * Tool for extracting structured data from the page
 */
export const extractDataTool = createTool({
  name: "extractData",
  description: "Extract structured data from the page using CSS selectors",
  parameters: z.object({
    selectors: z.record(z.string()).describe("Map of data keys to CSS selectors"),
    includeHtml: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include HTML content for each selector"),
    schema: z.any().describe("Zod schema defining the structure of the data to extract."),
    selector: z
      .string()
      .optional()
      .describe("Optional CSS selector for the container element to extract from."),
  }),
  execute: async (args, options?: ToolExecuteOptions) => {
    return safeBrowserOperation(options as ToolExecutionContext, async (page: Page) => {
      const extractedData = await page.evaluate(
        (params: { selectors: Record<string, string>, includeHtml: boolean }) => {
          const { selectors, includeHtml } = params;
          const result: Record<string, { text: string; html?: string }> = Object.create(null);

          for (const [key, selector] of Object.entries(selectors)) {
            const element = document.querySelector(selector);
            if (element) {
              result[key] = {
                text: (element.textContent || "").trim(),
              };

              if (includeHtml) {
                result[key].html = element.innerHTML;
              }
            } else {
              result[key] = { text: "" };
            }
          }

          return result;
        },
        { selectors: args.selectors, includeHtml: args.includeHtml },
      );

      // Validate extracted data against schema (optional but recommended)
      try {
        const zodSchema = args.schema as z.ZodObject<any>; // Assume object schema
        zodSchema.parse(extractedData);
        return {
          result: `Extracted data for ${Object.keys(args.selectors).length} selectors`,
          data: extractedData,
        };
      } catch (validationError) {
        console.error("Extracted data failed validation:", validationError);
        return {
          result: "Extracted data failed validation.",
          error: validationError,
          data: extractedData, // Return partial data even if validation fails
        };
      }
    });
  },
});

/**
 * Export all output tools as a group
 */
export const outputTools = {
  saveToFileTool,
  exportPdfTool,
  extractDataTool,
};
