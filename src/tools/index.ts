/**
 * Tool registry and exports
 * Centralized management of all available tools and toolkits
 */

// Individual Tool Exports
export { calculatorTool } from "./calculator.js";
export { dateTimeTool } from "./datetime.js";
export { systemInfoTool } from "./systemInfo.js";

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
import { calculatorTool } from "./calculator.js";
import { dateTimeTool } from "./datetime.js";
import { systemInfoTool } from "./systemInfo.js";
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

/**
 * Array of all available individual tools for the AI-Volt agent
 */
export const allTools = [
  calculatorTool,
  dateTimeTool,
  systemInfoTool,
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


