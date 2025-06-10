/**
 * Tool registry and exports
 * Centralized management of all available tools and toolkits
 */

// #region Individual Tool Exports

// ## Simple Tools
export { calculatorTool, statisticsAnalysisTool } from "./calculator.js";
export { dateTimeTool } from "./datetime.js";
export { systemInfoTool, codeExecutionEnvironmentAnalysisTool } from "./systemInfo.js";
export { ingestDocumentTool, queryKnowledgeBaseTool, summarizeDocumentTool, listKnowledgeBaseDocumentsTool } from "./knowledgeBaseTools.js";
export { readDataFromFileTool, analyzeCsvDataTool, writeDataToFileTool, checksumFileTool, compressFileTool, decompressFileTool, findInFileTool } from "./dataTools.js";
export * from "./promptManagementTools.js";

// ## Debugging Tools
export {
  runIsolatedCodeTool,
  lintCodeTool,
  identifySecurityAntiPatternsTool,
  analyzeCodeComplexityTool,
  findCodeDuplicatesTool,
} from "./debugTools.js";

// ## Cloud Tools
export {
  deployServiceTool,
  listContainersTool,
  stopContainerTool,
  removeContainerTool,
  getContainerLogsTool,
  inspectContainerTool,
  listImagesTool,
  buildImageTool,
} from "./cloudTools.js";

// ## Web Browser Tools
export { 
  webSearchTool, 
  extractTextTool, 
  extractLinksTool, 
  extractMetadataTool, 
  extractTablesTool,
  extractJsonLdTool,
} from "./webBrowser.js";

// ## Standard Git Tools
export { 
  gitStatusTool,
  gitAddTool as standardGitAddTool, // aliased to avoid conflict
  gitCommitTool as standardGitCommitTool, // aliased to avoid conflict
  gitPushTool as standardGitPushTool, // aliased to avoid conflict
  gitPullTool as standardGitPullTool, // aliased to avoid conflict
  gitBranchTool as standardGitBranchTool, // aliased to avoid conflict
  gitLogTool,
  gitDiffTool,
  gitMergeTool as standardGitMergeTool, // aliased to avoid conflict
  gitResetTool,
  gitTool,
} from "./gitTool.js";

// ## Enhanced Git Tools
export {
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitAddTool,
  gitCommitTool,
  gitPushTool,
  gitFetchTool,
  gitPullTool,
  gitMergeTool,
  gitBranchTool,
  gitCloneTool,
} from "./enhancedGitTool.js";

// ## Coding Tools
export {
  sandboxedCodeExecutorTool,
  readFileTool,
  writeFileTool,
  deleteFileTool,
  listDirectoryTool,
  createDirectoryTool,
  statTool,
  moveTool,
  copyTool,
  replaceLineInFileTool,
} from "./codingTools.js";

// ## Enhanced Web Browser Tools
export {
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
} from "./enhancedWebBrowser.js";

// ## Playwright Tools
export {
  navigationTool,
  screenshotTool,
  interactionTools,
  responseTools,
  outputTools,
  visiblePageTools,
} from "./playwright/index.js";

// ## GitHub Tools
export {
  fetchRepoStarsTool,
  fetchRepoContributorsTool,
  getFileContentTool,
  listRepositoryContentsTool,
  listPullRequestsTool,
  getPullRequestDetailsTool,
  createPullRequestTool,
  mergePullRequestTool,
  commentOnPullRequestTool,
  listPullRequestFilesTool,
  createRepositoryTool,
  deleteRepositoryTool,
  listRepositoryHooksTool,
  createRepositoryHookTool,
} from "./githubTool.js";

// #endregion

// #region Toolkit Exports
export { enhancedGitToolkit } from "./enhancedGitTool.js";
export { enhancedWebBrowserToolkit } from "./enhancedWebBrowser.js";
export { codingToolkit } from './codingTools.js';
export { debugToolkit } from './debugTools.js';
export { cloudToolkit } from './cloudTools.js';
export { default as promptManagerToolkit } from "./promptManagerToolkit.js";
// #endregion

// #region Tool and Toolkit Aggregation

// Import all tools for array registration
import { calculatorTool, statisticsAnalysisTool } from "./calculator.js";
import { dateTimeTool } from "./datetime.js";
import { systemInfoTool, codeExecutionEnvironmentAnalysisTool } from "./systemInfo.js";
import { ingestDocumentTool, queryKnowledgeBaseTool, summarizeDocumentTool, listKnowledgeBaseDocumentsTool } from "./knowledgeBaseTools.js";
import {
  navigationTool,
  screenshotTool,
  interactionTools,
  responseTools,
  outputTools,
  visiblePageTools,
} from "./playwright/index.js";
import { 
  webSearchTool, 
  extractTextTool, 
  extractLinksTool, 
  extractMetadataTool, 
  extractTablesTool,
  extractJsonLdTool,
} from "./webBrowser.js";
import { 
  gitStatusTool,
  gitAddTool as standardGitAddTool,
  gitCommitTool as standardGitCommitTool,
  gitPushTool as standardGitPushTool,
  gitPullTool as standardGitPullTool,
  gitBranchTool as standardGitBranchTool,
  gitLogTool,
  gitDiffTool,
  gitMergeTool as standardGitMergeTool,
  gitResetTool,
  gitTool,
} from "./gitTool.js";
import {
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitAddTool,
  gitCommitTool,
  gitPushTool,
  gitFetchTool,
  gitPullTool,
  gitMergeTool,
  gitBranchTool,
  gitCloneTool,
} from "./enhancedGitTool.js";
import {
  sandboxedCodeExecutorTool,
  readFileTool,
  writeFileTool,
  deleteFileTool,
  listDirectoryTool,
  createDirectoryTool,
  statTool,
  moveTool,
  copyTool,
  replaceLineInFileTool,
} from "./codingTools.js";
import {
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
} from "./enhancedWebBrowser.js";
import {
  fetchRepoStarsTool,
  fetchRepoContributorsTool,
  getFileContentTool,
  listRepositoryContentsTool,
  listPullRequestsTool,
  getPullRequestDetailsTool,
  createPullRequestTool,
  mergePullRequestTool,
  commentOnPullRequestTool,
  listPullRequestFilesTool,
  createRepositoryTool,
  deleteRepositoryTool,
  listRepositoryHooksTool,
  createRepositoryHookTool
} from "./githubTool.js";
import {
  runIsolatedCodeTool,
  lintCodeTool,
  identifySecurityAntiPatternsTool,
  analyzeCodeComplexityTool,
  findCodeDuplicatesTool,
} from "./debugTools.js";
import { readDataFromFileTool, analyzeCsvDataTool, writeDataToFileTool, checksumFileTool, compressFileTool, decompressFileTool, findInFileTool } from "./dataTools.js";
import { 
  deployServiceTool, 
  listContainersTool, 
  stopContainerTool, 
  removeContainerTool, 
  getContainerLogsTool, 
  inspectContainerTool, 
  listImagesTool, 
  buildImageTool,
} from "./cloudTools.js";
import * as PromptManagementTools from "./promptManagementTools.js";
import { enhancedGitToolkit } from "./enhancedGitTool.js";
import { enhancedWebBrowserToolkit } from "./enhancedWebBrowser.js";
import { codingToolkit } from './codingTools.js';
import { debugToolkit } from './debugTools.js';
import { cloudToolkit } from './cloudTools.js';
import promptManagerToolkit from "./promptManagerToolkit.js";

/**
 * Array of all available individual tools for the AI-Volt agent
 */
export const allTools = [
  // Simple Tools
  calculatorTool,
  statisticsAnalysisTool,
  dateTimeTool,
  systemInfoTool,
  codeExecutionEnvironmentAnalysisTool,
  
  // Knowledge Base
  ingestDocumentTool,
  queryKnowledgeBaseTool,
  summarizeDocumentTool,
  listKnowledgeBaseDocumentsTool,
  
  // Data Tools
  readDataFromFileTool,
  analyzeCsvDataTool,
  writeDataToFileTool,
  checksumFileTool,
  compressFileTool,
  decompressFileTool,
  findInFileTool,
  
  // Web Browser
  webSearchTool,
  extractTextTool,
  extractLinksTool,
  extractMetadataTool,
  extractTablesTool,
  extractJsonLdTool,
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
  
  // Standard Git
  gitStatusTool,
  standardGitAddTool,
  standardGitCommitTool,
  standardGitPushTool,
  standardGitPullTool,
  standardGitBranchTool,
  gitLogTool,
  gitDiffTool,
  standardGitMergeTool,
  gitResetTool,
  gitTool,
  
  // Enhanced Git
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitAddTool,
  gitCommitTool,
  gitPushTool,
  gitFetchTool,
  gitPullTool,
  gitMergeTool,
  gitBranchTool,
  gitCloneTool,
  
  // Coding
  sandboxedCodeExecutorTool,
  readFileTool,
  writeFileTool,
  deleteFileTool,
  listDirectoryTool,
  createDirectoryTool,
  statTool,
  moveTool,
  copyTool,
  replaceLineInFileTool,
  
  // Playwright
  navigationTool,
  screenshotTool,
  ...Object.values(interactionTools),
  ...Object.values(responseTools),
  ...Object.values(outputTools),
  ...Object.values(visiblePageTools),
  
  // GitHub
  fetchRepoStarsTool,
  fetchRepoContributorsTool,
  getFileContentTool,
  listRepositoryContentsTool,
  listPullRequestsTool,
  getPullRequestDetailsTool,
  createPullRequestTool,
  mergePullRequestTool,
  commentOnPullRequestTool,
  listPullRequestFilesTool,
  createRepositoryTool,
  deleteRepositoryTool,
  listRepositoryHooksTool,
  createRepositoryHookTool,
  
  // Debugging
  runIsolatedCodeTool,
  lintCodeTool,
  identifySecurityAntiPatternsTool,
  analyzeCodeComplexityTool,
  findCodeDuplicatesTool,
  
  // Cloud
  deployServiceTool,
  listContainersTool,
  stopContainerTool,
  removeContainerTool,
  getContainerLogsTool,
  inspectContainerTool,
  listImagesTool,
  buildImageTool,

  // Prompt Management
  ...Object.values(PromptManagementTools)
];

/**
 * Array of all available toolkits for the AI-Volt agent
 */
export const allToolkits = [
  enhancedGitToolkit,
  enhancedWebBrowserToolkit,
  codingToolkit,
  debugToolkit,
  cloudToolkit,
  promptManagerToolkit
];

// Default export for convenience
export default allTools;

/**
 * Tool categories for organizational purposes
 */
export const toolCategories = {
  math: [calculatorTool],
  utility: [dateTimeTool, systemInfoTool],
  system: [systemInfoTool],
  web: [webSearchTool, extractTextTool, extractLinksTool, extractMetadataTool, extractTablesTool, extractJsonLdTool, secureWebProcessorTool, webScrapingManagerTool, webContentValidatorTool],
  git: [gitStatusTool, standardGitAddTool, standardGitCommitTool, standardGitPushTool, standardGitPullTool, standardGitBranchTool, gitLogTool, gitDiffTool, standardGitMergeTool, gitResetTool, gitTool, enhancedGitStatusTool, secureGitScriptTool, gitRepositoryAnalysisTool, gitAddTool, gitCommitTool, gitPushTool, gitPullTool, gitBranchTool, gitMergeTool, gitResetTool, gitCloneTool],
  github: [fetchRepoStarsTool, fetchRepoContributorsTool, getFileContentTool, listRepositoryContentsTool, listPullRequestsTool, getPullRequestDetailsTool, createPullRequestTool, mergePullRequestTool, commentOnPullRequestTool, listPullRequestFilesTool, createRepositoryTool, deleteRepositoryTool, listRepositoryHooksTool, createRepositoryHookTool],
  coding: [sandboxedCodeExecutorTool, readFileTool, writeFileTool, deleteFileTool, listDirectoryTool, createDirectoryTool, statTool, moveTool, copyTool, replaceLineInFileTool],
} as const;


