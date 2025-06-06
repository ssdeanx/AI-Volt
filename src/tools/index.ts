/**
 * Tool registry and exports
 * Centralized management of all available tools and toolkits
 */

// Individual Tool Exports
export { calculatorTool, statisticsAnalysisTool } from "./calculator.js";
export { dateTimeTool } from "./datetime.js";
export { systemInfoTool, codeExecutionEnvironmentAnalysisTool } from "./systemInfo.js";
export { ingestDocumentTool, queryKnowledgeBaseTool, summarizeDocumentTool, listKnowledgeBaseDocumentsTool } from "./knowledgeBaseTools.js";
export { getNodeProcessInfoTool, guideNodeProfilerTool, runIsolatedCodeTool, runJsInspectTool, runEslintTool, identifySecurityAntiPatternsTool, analyzeCodeComplexityTool, analyzeLogPatternsTool, getAgentExecutionTimelineTool } from "./debugTools.js";
export { readDataFromFileTool, analyzeCsvDataTool, writeDataToFileTool, checksumFileTool, compressFileTool, decompressFileTool, findInFileTool } from "./dataTools.js";
export { deployServiceTool, manageResourcesTool, monitorCloudTool, buildImageTool, pullImageTool, listImagesTool, removeImageTool, execContainerCommandTool, inspectContainerTool, createNetworkTool, listNetworksTool, removeNetworkTool, createVolumeTool, listVolumesTool, removeVolumeTool } from "./cloudTools.js";

export { 
  webSearchTool, 
  extractTextTool, 
  extractLinksTool, 
  extractMetadataTool, 
  extractTablesTool,
  extractJsonLdTool,
} from "./webBrowser.js";
export { 
  gitStatusTool,
  gitAddTool,
  gitCommitTool,
  gitPushTool,
  gitPullTool,
  gitBranchTool,
  gitLogTool,
  gitDiffTool,
  gitMergeTool,
  gitResetTool,
  gitTool,
} from "./gitTool.js";
// Enhanced Git toolkit exports
export {
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitHookValidatorTool,
  enhancedGitToolkit
} from "./enhancedGitTool.js";
// Coding tools exports
export {
  secureCodeExecutorTool,
  fileSystemOperationsTool,
  codeAnalysisTool,
  projectStructureGeneratorTool
} from "./codingTools.js";
// Enhanced web browser tools exports
export {
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
  enhancedWebBrowserToolkit,
} from "./enhancedWebBrowser.js";
export {
  navigationTool,
  screenshotTool,
  interactionTools,
  responseTools,
  outputTools,
  visiblePageTools,
} from "./playwright/index.js";
// GitHub tools exports
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
  getUserProfileTool,
  listOrgMembersTool,
} from "./githubTool.js";

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
  gitAddTool,
  gitCommitTool,
  gitPushTool,
  gitPullTool,
  gitBranchTool,
  gitLogTool,
  gitDiffTool,
  gitMergeTool,
  gitResetTool,
  gitTool,
} from "./gitTool.js";
import {
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitHookValidatorTool,
  enhancedGitToolkit
} from "./enhancedGitTool.js";
import {
  secureCodeExecutorTool,
  fileSystemOperationsTool,
  codeAnalysisTool,
  projectStructureGeneratorTool,
} from "./codingTools.js";
import {
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
  enhancedWebBrowserToolkit,
} from "./enhancedWebBrowser.js";
import { promptManagementToolkit } from "./promptManagementTools.js";
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
  createRepositoryHookTool,
  getUserProfileTool,
  listOrgMembersTool,
} from "./githubTool.js";
import {
  getNodeProcessInfoTool,
  guideNodeProfilerTool,
  runIsolatedCodeTool,
  runJsInspectTool,
  runEslintTool,
  identifySecurityAntiPatternsTool,
  analyzeCodeComplexityTool,
  analyzeLogPatternsTool,
  getAgentExecutionTimelineTool
} from "./debugTools.js";
import { readDataFromFileTool, analyzeCsvDataTool, writeDataToFileTool, checksumFileTool, compressFileTool, decompressFileTool, findInFileTool } from "./dataTools.js";
import { deployServiceTool, manageResourcesTool, monitorCloudTool, buildImageTool, pullImageTool, listImagesTool, removeImageTool, execContainerCommandTool, inspectContainerTool, createNetworkTool, listNetworksTool, removeNetworkTool, createVolumeTool, listVolumesTool, removeVolumeTool } from "./cloudTools.js";

/**
 * Array of all available individual tools for the AI-Volt agent
 */
export const allTools = [
  calculatorTool,
  statisticsAnalysisTool,
  dateTimeTool,
  systemInfoTool,
  codeExecutionEnvironmentAnalysisTool,
  ingestDocumentTool,
  queryKnowledgeBaseTool,
  summarizeDocumentTool,
  listKnowledgeBaseDocumentsTool,
  webSearchTool,
  extractTextTool,
  extractLinksTool,
  extractMetadataTool,
  extractTablesTool,
  extractJsonLdTool,
  gitStatusTool,
  gitAddTool,
  gitCommitTool,
  gitPushTool,
  gitPullTool,
  gitBranchTool,
  gitLogTool,
  gitDiffTool,
  gitMergeTool,
  gitResetTool,  gitTool,
  // Enhanced Git tools
  enhancedGitStatusTool,
  secureGitScriptTool,
  gitRepositoryAnalysisTool,
  gitHookValidatorTool,  // Coding tools
  secureCodeExecutorTool,
  fileSystemOperationsTool,
  codeAnalysisTool,
  projectStructureGeneratorTool,
  // Enhanced web browser tools
  secureWebProcessorTool,
  webScrapingManagerTool,
  webContentValidatorTool,
  // Playwright tools
  navigationTool,
  screenshotTool,
  // Spread individual tools from their respective groups
  ...Object.values(interactionTools),
  ...Object.values(responseTools),
  ...Object.values(outputTools),
  ...Object.values(visiblePageTools),
  // GitHub tools
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
  getUserProfileTool,
  listOrgMembersTool,
  // Debugging tools
  getNodeProcessInfoTool,
  guideNodeProfilerTool,
  runIsolatedCodeTool,
  runJsInspectTool,
  runEslintTool,
  identifySecurityAntiPatternsTool,
  analyzeCodeComplexityTool,
  analyzeLogPatternsTool,
  getAgentExecutionTimelineTool,
  promptManagementToolkit,
  readDataFromFileTool,
  analyzeCsvDataTool,
  writeDataToFileTool,
  checksumFileTool,
  compressFileTool,
  decompressFileTool,
  findInFileTool,
  deployServiceTool,
  manageResourcesTool,
  monitorCloudTool,
  buildImageTool,
  pullImageTool,
  listImagesTool,
  removeImageTool,
  execContainerCommandTool,
  inspectContainerTool,
  createNetworkTool,
  listNetworksTool,
  removeNetworkTool,
  createVolumeTool,
  listVolumesTool,
  removeVolumeTool,
] as const;

/**
 * Array of all available toolkits for the AI-Volt agent
 */
export const allToolkits = [
  enhancedGitToolkit,
  enhancedWebBrowserToolkit,
  promptManagementToolkit,
] as const;

/**
 * Tool categories for organizational purposes
 */
export const toolCategories = {
  math: [calculatorTool],
  utility: [dateTimeTool, systemInfoTool],
  system: [systemInfoTool],
  web: [webSearchTool, extractTextTool, extractLinksTool, extractMetadataTool, extractTablesTool, extractJsonLdTool, secureWebProcessorTool, webScrapingManagerTool, webContentValidatorTool],
  git: [gitStatusTool, gitAddTool, gitCommitTool, gitPushTool, gitPullTool, gitBranchTool, gitLogTool, gitDiffTool, gitMergeTool, gitResetTool, gitTool, enhancedGitStatusTool, secureGitScriptTool, gitRepositoryAnalysisTool, gitHookValidatorTool],
  coding: [secureCodeExecutorTool, fileSystemOperationsTool, codeAnalysisTool, projectStructureGeneratorTool],
} as const;


