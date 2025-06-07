/**
 * Data Tools
 * Provides capabilities for reading, analyzing, and writing data to files.
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import * as shell from 'shelljs';
import * as ivm from 'isolated-vm';
import Papa from 'papaparse';

/**
 * Read Data From File Tool
 * Reads the entire content of a specified file.
 */
export const readDataFromFileTool = createTool({
  name: "read_data_from_file",
  description: "Reads the entire content of a specified file (e.g., CSV, JSON, TXT).",
  parameters: z.object({
    filePath: z.string().describe("The path to the file to read."),
  }),
  execute: async (args: { filePath: string }) => {
    try {
      if (!shell.test('-f', args.filePath)) {
        throw new Error(`File not found: ${args.filePath}`);
      }
      const content = shell.cat(args.filePath).toString();
      logger.info(`Successfully read data from file: ${args.filePath}`);
      return content;    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to read data from file ${args.filePath}: ${errorMessage}`);
      throw new Error(`Failed to read data from file ${args.filePath}: ${errorMessage}`);
    }
  },
});

/**
 * Analyze CSV Data Tool
 * Performs a basic analysis on CSV content, such as counting rows or finding specific text,
 * within a secure isolated environment using `isolated-vm`.
 */
export const analyzeCsvDataTool = createTool({
  name: "analyze_csv_data",
  description: "Performs a basic analysis on provided CSV content, such as counting rows, columns, or finding specific text, within a secure isolated environment.",
  parameters: z.object({
    csvContent: z.string().describe("The CSV content as a string."),
    analysisType: z.enum(["row_count", "column_count", "find_text"]).describe("The type of analysis to perform."),
    searchText: z.string().optional().describe("Text to search for, if analysisType is 'find_text'."),
  }),
  execute: async (args: { csvContent: string; analysisType: "row_count" | "column_count" | "find_text"; searchText?: string }) => {
    const isolate = new ivm.Isolate();
    const context = await isolate.createContext();
    const jail = context.global;

    await jail.set('global', jail.derefInto());
    await jail.set('Papa', Papa as any);
    await jail.set('csvContent', args.csvContent);
    await jail.set('analysisType', args.analysisType);
    await jail.set('searchText', args.searchText || null);

    const script = `
      const parsedData = Papa.parse(csvContent, { header: false }).data as string[][];
      let result;

      switch (analysisType) {
        case "row_count": {
          result = \`Row count: \${parsedData.length}\`;
          break;
        }
        case "column_count": {
          if (parsedData.length > 0) {
            result = \`Column count: \${parsedData[0].length}\`;
          } else {
            result = "No data to count columns.";
          }
          break;
        }
        case "find_text": {
          if (!searchText) {
            throw new Error("searchText is required for 'find_text' analysis.");
          }
          const foundRows = [];
          parsedData.forEach((row: string[]) => {
            if (Array.isArray(row)) {
              if (row.some(cell => String(cell).includes(searchText))) {
                foundRows.push(row.join(','));
              }
            }
          });
          result = \`Found \${foundRows.length} lines containing "\${searchText}". Example: \${foundRows.slice(0, 3).join('; ')}\`;
          break;
        }
        default:
          throw new Error(\`Unknown analysis type: \${analysisType}\`);
      }
      result;
    `;

    try {
      const result = await context.eval(script, { timeout: 5000 });
      logger.info(`Successfully analyzed CSV data using isolated-vm.`);
      return result;    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to analyze CSV data in isolated-vm: ${errorMessage}`);
      throw new Error(`Failed to analyze CSV data in isolated-vm: ${errorMessage}`);
    } finally {
      isolate.dispose();
    }
  },
});

/**
 * Write Data To File Tool
 * Writes the provided content to a specified file, overwriting if it exists.
 */
export const writeDataToFileTool = createTool({
  name: "write_data_to_file",
  description: "Writes the provided content to a specified file, overwriting if the file already exists.",
  parameters: z.object({
    filePath: z.string().describe("The path to the file to write to."),
    content: z.string().describe("The content to write to the file."),
  }),
  execute: async (args: { filePath: string; content: string }) => {
    try {
      shell.ShellString(args.content).to(args.filePath);
      logger.info(`Successfully wrote data to file: ${args.filePath}`);
      return `Data successfully written to ${args.filePath}.`;    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to write data to file ${args.filePath}: ${errorMessage}`);
      throw new Error(`Failed to write data to file ${args.filePath}: ${errorMessage}`);
    }
  },
});

/**
 * Checksum File Tool
 * Calculates the MD5 checksum of a specified file using shell commands.
 */
export const checksumFileTool = createTool({
  name: "checksum_file",
  description: "Calculates the MD5 checksum of a specified file for data integrity verification.",
  parameters: z.object({
    filePath: z.string().describe("The path to the file to calculate the checksum for."),
  }),
  execute: async (args: { filePath: string }) => {
    try {
      if (!shell.test('-f', args.filePath)) {
        throw new Error(`File not found: ${args.filePath}`);
      }
      // Using 'md5sum' for Linux/macOS, 'CertUtil -hashfile MD5' for Windows
      let command = '';
      if (process.platform === 'win32') {
        command = `CertUtil -hashfile "${args.filePath}" MD5`;
      } else {
        command = `md5sum "${args.filePath}" | awk '{print $1}'`;
      }

      const result = shell.exec(command, { silent: true });
      if (result.code !== 0) {
        throw new Error(`Failed to calculate checksum: ${result.stderr}`);
      }

      const checksum = result.stdout.split('\n')[1] ? result.stdout.split('\n')[1].trim() : result.stdout.trim().split(' ')[0];
      logger.info(`Checksum for ${args.filePath}: ${checksum}`);
      return `MD5 Checksum for ${args.filePath}: ${checksum}`;    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to calculate checksum for ${args.filePath}: ${errorMessage}`);
      throw new Error(`Failed to calculate checksum for ${args.filePath}: ${errorMessage}`);
    }
  },
});

/**
 * Compress File Tool
 * Compresses a specified file or directory into a .zip archive.
 */
export const compressFileTool = createTool({
  name: "compress_file",
  description: "Compresses a specified file or directory into a .zip archive. Uses 'zip' command (must be installed).",
  parameters: z.object({
    inputPath: z.string().describe("The path to the file or directory to compress."),
    outputPath: z.string().describe("The path for the output .zip archive (e.g., 'archive.zip')."),
  }),
  execute: async (args: { inputPath: string; outputPath: string }) => {
    try {
      if (!shell.test('-e', args.inputPath)) {
        throw new Error(`Input path not found: ${args.inputPath}`);
      }

      // Ensure output path ends with .zip
      let outputPath = args.outputPath;
      if (!outputPath.endsWith('.zip')) {
        outputPath = `${outputPath}.zip`;
      }

      const command = `zip -r "${outputPath}" "${args.inputPath}"`;
      logger.info(`Executing compression command: ${command}`);
      const result = shell.exec(command, { silent: true });

      if (result.code !== 0) {
        throw new Error(`Failed to compress file/directory: ${result.stderr}`);
      }

      logger.info(`Successfully compressed ${args.inputPath} to ${outputPath}.`);
      return `Successfully compressed ${args.inputPath} to ${outputPath}.`;    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to compress ${args.inputPath}: ${errorMessage}`);
      throw new Error(`Failed to compress ${args.inputPath}: ${errorMessage}`);
    }
  },
});

/**
 * Decompress File Tool
 * Decompresses a specified .zip archive to a target directory.
 */
export const decompressFileTool = createTool({
  name: "decompress_file",
  description: "Decompresses a specified .zip archive to a target directory. Uses 'unzip' command (must be installed).",
  parameters: z.object({
    inputPath: z.string().describe("The path to the .zip archive to decompress."),
    outputPath: z.string().describe("The target directory for decompression. Will be created if it doesn't exist."),
  }),
  execute: async (args: { inputPath: string; outputPath: string }) => {
    try {
      if (!shell.test('-f', args.inputPath)) {
        throw new Error(`Input .zip file not found: ${args.inputPath}`);
      }

      // Create output directory if it doesn't exist
      if (!shell.test('-d', args.outputPath)) {
        shell.mkdir('-p', args.outputPath);
        logger.info(`Created output directory: ${args.outputPath}`);
      }

      const command = `unzip "${args.inputPath}" -d "${args.outputPath}"`;
      logger.info(`Executing decompression command: ${command}`);
      const result = shell.exec(command, { silent: true });

      if (result.code !== 0) {
        throw new Error(`Failed to decompress file: ${result.stderr}`);
      }

      logger.info(`Successfully decompressed ${args.inputPath} to ${args.outputPath}.`);
      return `Successfully decompressed ${args.inputPath} to ${args.outputPath}.`;    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to decompress ${args.inputPath}: ${errorMessage}`);
      throw new Error(`Failed to decompress ${args.inputPath}: ${errorMessage}`);
    }
  },
});

/**
 * Find In File Tool
 * Searches for a specified text pattern within a file using `grep`.
 */
export const findInFileTool = createTool({
  name: "find_in_file",
  description: "Searches for a specified text pattern within a file and returns matching lines. Uses `grep` (must be installed).",
  parameters: z.object({
    filePath: z.string().describe("The path to the file to search within."),
    pattern: z.string().describe("The text pattern (regex supported) to search for."),
    caseInsensitive: z.boolean().optional().default(false).describe("Perform a case-insensitive search."),
  }),
  execute: async (args: { filePath: string; pattern: string; caseInsensitive: boolean }) => {
    try {
      if (!shell.test('-f', args.filePath)) {
        throw new Error(`File not found: ${args.filePath}`);
      }

      const caseFlag = args.caseInsensitive ? '-i' : '';
      const command = `grep ${caseFlag} "${args.pattern}" "${args.filePath}"`;
      logger.info(`Executing grep command: ${command}`);
      const result = shell.exec(command, { silent: true });

      if (result.code === 0) {
        logger.info(`Found matches in ${args.filePath}.`);
        return `Matches found in ${args.filePath}:\n${result.stdout.trim()}`;
      } else if (result.code === 1) {
        // grep returns 1 if no matches are found, which is not an error in this context
        return `No matches found for pattern "${args.pattern}" in ${args.filePath}.`;
      } else {
        throw new Error(`Failed to search file: ${result.stderr}`);
      }    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to search file ${args.filePath}: ${errorMessage}`);
      throw new Error(`Failed to search file ${args.filePath}: ${errorMessage}`);
    }
  },
}); 