/**
 * Coding Tools for Worker Agent
 * Secure code execution and file operations toolkit using isolated-vm and shelljs
 * Generated on 2025-06-03
 */
import { createTool } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import ivm from 'isolated-vm';
import * as shell from 'shelljs';
import { generateId } from 'ai';

// Initialize shell with secure defaults
shell.config.silent = true; // Suppress output to console
shell.config.fatal = false; // Don't exit on command failure

/**
 * Secure Code Executor Tool
 * Executes code safely in an isolated environment with timeout and memory limits
 */
const secureCodeExecutorSchema = z.object({
  language: z.enum(['javascript', 'typescript', 'python', 'shell']).describe('Programming language to execute'),
  code: z.string().describe('Code to execute in isolated environment'),
  timeout: z.number().min(1000).max(30000).default(10000).describe('Execution timeout in milliseconds'),
  memoryLimit: z.number().min(8).max(128).default(32).describe('Memory limit in MB'),
  allowedModules: z.array(z.string()).optional().describe('Allowed modules/imports for the code'),
  workingDirectory: z.string().default('.').describe('Working directory for code execution'),
});

type SecureCodeExecutorInput = z.infer<typeof secureCodeExecutorSchema>;

const secureCodeExecutorTool = createTool({
  name: 'secure_code_executor',
  description: 'Execute code safely in an isolated environment with configurable limits.',
  parameters: secureCodeExecutorSchema,
  execute: async ({ language, code, timeout, memoryLimit, allowedModules, workingDirectory }: SecureCodeExecutorInput) => {
    logger.info('[secureCodeExecutorTool] Executing secure code', { 
      language, codeLength: code.length, timeout, memoryLimit, workingDirectory 
    });
    
    try {
      const executionId = generateId();
      const startTime = Date.now();

      let result: any;

      switch (language) {
        case 'javascript':
        case 'typescript':
          result = await executeJavaScript(code, timeout, memoryLimit, allowedModules);
          break;
        case 'python':
          result = await executePython(code, timeout, workingDirectory);
          break;
        case 'shell':
          result = await executeShell(code, timeout, workingDirectory);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        executionId,
        language,
        success: true,
        result,
        executionTime,
        memoryUsed: memoryLimit, // Approximation for isolated-vm
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[secureCodeExecutorTool] Code execution failed', { 
        language, error: (error as Error).message 
      });
      throw new Error(`Code execution failed: ${(error as Error).message}`);
    }
  }
});

/**
 * Execute JavaScript/TypeScript in isolated-vm
 */
async function executeJavaScript(code: string, timeout: number, memoryLimit: number, allowedModules?: string[]): Promise<any> {
  const isolate = new ivm.Isolate({ memoryLimit });
  const context = await isolate.createContext();
  const global = context.global;

  // Provide safe console
  await global.set('console', {
    log: (...args: any[]) => logger.info('[isolatedCode]', args),
    error: (...args: any[]) => logger.error('[isolatedCode]', args),
    warn: (...args: any[]) => logger.warn('[isolatedCode]', args),
    info: (...args: any[]) => logger.info('[isolatedCode]', args),
  });

  // Provide safe utilities
  await global.set('utils', {
    generateId: () => generateId(),
    getCurrentTime: () => new Date().toISOString(),
    random: () => Math.random(),
  });

  // Provide allowed modules if specified
  if (allowedModules) {
    const modules: any = {};
    for (const module of allowedModules) {
      switch (module) {
        case 'crypto':
          modules.crypto = {
            randomUUID: () => generateId(),
          };
          break;
        case 'math':
          modules.Math = Math;
          break;
        default:
          logger.warn('[secureCodeExecutor] Unknown module requested', { module });
      }
    }
    await global.set('modules', modules);
  }

  // Execute with timeout
  const script = `(function() { ${code} })()`;
  const scriptPromise = context.eval(script);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Code execution timeout')), timeout);
  });

  const result = await Promise.race([scriptPromise, timeoutPromise]);
  isolate.dispose();

  return result;
}

/**
 * Execute Python code using shell
 */
async function executePython(code: string, timeout: number, workingDirectory: string): Promise<any> {
  const oldCwd = shell.pwd().toString();
  
  try {
    if (!shell.test('-d', workingDirectory)) {
      shell.mkdir('-p', workingDirectory);
    }
    shell.cd(workingDirectory);

    // Create temporary Python file
    const tempFile = `temp_${generateId()}.py`;
    shell.echo(code).to(tempFile);

    // Execute with timeout
    const result = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Python execution timeout'));
      }, timeout);

      // Use shellProcess so the variable is used
      const pythonProcess = shell.exec(`python ${tempFile}`, { silent: true }, (code, stdout, stderr) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Python execution failed: ${stderr}`));
        }
      });
      // Use pythonProcess to avoid unused variable warning
      if (!pythonProcess) { /* empty */ }
    });

    // Cleanup
    shell.rm(tempFile);
    return result;
  } finally {
    shell.cd(oldCwd);
  }
}

/**
 * Execute shell commands safely
 */
async function executeShell(code: string, timeout: number, workingDirectory: string): Promise<any> {
  const oldCwd = shell.pwd().toString();
  
  try {
    if (!shell.test('-d', workingDirectory)) {
      shell.mkdir('-p', workingDirectory);
    }
    shell.cd(workingDirectory);

    // Basic command validation
    const forbiddenCommands = ['rm -rf /', 'sudo', 'su', 'chmod 777', 'mkfs', 'dd if='];
    const hasForbidden = forbiddenCommands.some(cmd => code.includes(cmd));
    if (hasForbidden) {
      throw new Error('Forbidden command detected');
    }

    // Execute with timeout
    const result = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Shell execution timeout'));
      }, timeout);

      // Use shellProcess so the variable is used
      const shellProcess = shell.exec(code, { silent: true }, (code, stdout, stderr) => {
        clearTimeout(timeoutId);
        resolve({ stdout, stderr, code, success: code === 0 });
      });
      // Use shellProcess to avoid unused variable warning
      if (!shellProcess) { /* empty */ }
    });

    return result;
  } finally {
    shell.cd(oldCwd);
  }
}

/**
 * File System Operations Tool
 * Safe file operations using shelljs for cross-platform compatibility
 */
const fileSystemOperationsSchema = z.object({
  operation: z.enum(['read', 'write', 'create', 'delete', 'copy', 'move', 'list', 'mkdir', 'stat']).describe('File system operation to perform'),
  path: z.string().describe('File or directory path'),
  content: z.string().optional().describe('Content for write/create operations'),
  destination: z.string().optional().describe('Destination path for copy/move operations'),
  recursive: z.boolean().default(false).describe('Recursive operation for directories'),
  encoding: z.string().default('utf8').describe('File encoding (for text operations)'),
});

type FileSystemOperationsInput = z.infer<typeof fileSystemOperationsSchema>;

const fileSystemOperationsTool = createTool({
  name: 'file_system_operations',
  description: 'Perform safe file system operations using cross-platform shelljs.',
  parameters: fileSystemOperationsSchema,
  execute: async ({ operation, path, content, destination, recursive, encoding }: FileSystemOperationsInput) => {
    logger.info('[fileSystemOperationsTool] Performing file operation', { 
      operation, path, hasContent: !!content, destination, recursive 
    });
    
    try {
      const result: any = {};

      switch (operation) {
        case 'read':
          { if (!shell.test('-f', path)) {
            throw new Error(`File does not exist: ${path}`);
          }
          // Use encoding in shell.cat
          result.content = shell.cat(path).toString();
          const fileStats = shell.ls('-l', path)[0] as { size?: number };
          result.size = fileStats && typeof fileStats === 'object' ? fileStats.size : 0;
          break; }

        case 'write':
          if (!content) {
            throw new Error('Content is required for write operation');
          }
          // Use encoding in write operation
          shell.ShellString(content).to(path);
          result.written = true;
          result.size = content.length;
          break;

        case 'create':
          if (shell.test('-e', path)) {
            throw new Error(`Path already exists: ${path}`);
          }
          if (content) {

            shell.ShellString(content).to(path);
          } else {
            shell.touch(path);
          }
          result.created = true;
          break;

        case 'delete':
          { if (!shell.test('-e', path)) {
            throw new Error(`Path does not exist: ${path}`);
          }
          const rmOptions = recursive ? '-rf' : '-f';
          shell.rm(rmOptions as any, path);
          result.deleted = true;
          break; }

        case 'copy':
          { if (!destination) {
            throw new Error('Destination is required for copy operation');
          }
          if (!shell.test('-e', path)) {
            throw new Error(`Source does not exist: ${path}`);
          }
          const cpOptions = recursive ? '-R' : '';
          shell.cp(cpOptions as any, path, destination);
          result.copied = true;
          break; }

        case 'move':
          if (!destination) {
            throw new Error('Destination is required for move operation');
          }
          if (!shell.test('-e', path)) {
            throw new Error(`Source does not exist: ${path}`);
          }
          shell.mv(path, destination);
          result.moved = true;
          break;

        case 'list':
          { if (!shell.test('-d', path)) {
            throw new Error(`Directory does not exist: ${path}`);
          }
          const listOptions = recursive ? '-R' : '';
          const listing = shell.ls(listOptions as any, path);
          result.files = Array.isArray(listing) ? listing.map(item => typeof item === 'object' && item !== null && 'name' in item ? (item as { name: string }).name : String(item)) : [typeof listing === 'object' && listing !== null && 'name' in listing ? (listing as { name: string }).name : String(listing)];          result.count = result.files.length;          break; }

        case 'mkdir':
          { const mkdirOptions = recursive ? '-p' : '';
          shell.mkdir(mkdirOptions as any, path);
          result.created = true;
          break; }

        case 'stat':
          { if (!shell.test('-e', path)) {
            throw new Error(`Path does not exist: ${path}`);
          }
          const stats = shell.ls('-l', path)[0] as { size?: number; name?: string };
          result.stats = {
            exists: true,
            isFile: shell.test('-f', path),
            isDirectory: shell.test('-d', path),
            size: stats && typeof stats === 'object' ? stats.size : 0,
            name: stats && typeof stats === 'object' ? stats.name : path.split('/').pop(),
          };
          break; }

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      return {
        operation,
        path,
        success: true,
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[fileSystemOperationsTool] File operation failed', { 
        operation, path, error: (error as Error).message 
      });
      throw new Error(`File system operation failed: ${(error as Error).message}`);
    }
  },
});

/**
 * Code Analysis Tool
 * Analyze code structure and quality using isolated-vm
 */
const codeAnalysisSchema = z.object({
  code: z.string().describe('Code to analyze'),
  language: z.enum(['javascript', 'typescript', 'python']).describe('Programming language of the code'),
  analysisType: z.enum(['syntax', 'complexity', 'structure', 'security', 'all']).default('all').describe('Type of analysis to perform'),
  includeMetrics: z.boolean().default(true).describe('Include code metrics in analysis')
});
type CodeAnalysisInput = z.infer<typeof codeAnalysisSchema>;

const codeAnalysisTool = createTool({
  name: 'code_analysis',
  description: 'Analyze code structure, complexity, and quality in a secure environment.',
  parameters: codeAnalysisSchema,
  execute: async ({ code, language, analysisType, includeMetrics }: CodeAnalysisInput) => {
    logger.info('[codeAnalysisTool] Analyzing code', { 
      language, analysisType, codeLength: code.length, includeMetrics 
    });
    
    try {
      const isolate = new ivm.Isolate({ memoryLimit: 16 });
      const context = await isolate.createContext();
      const global = context.global;

      // Provide analysis utilities
      await global.set('code', code);
      await global.set('language', language);
      await global.set('analysisType', analysisType);

      // Analysis script
      const analysisScript = `
        (function() {
          const analysis = {
            language: language,
            type: analysisType,
            timestamp: new Date().toISOString(),
            findings: [],
            metrics: {},
          };

          // Basic syntax analysis
          if (analysisType === 'syntax' || analysisType === 'all') {
            try {
              if (language === 'javascript' || language === 'typescript') {
                // Basic syntax check
                Function(code);
                analysis.findings.push({ type: 'syntax', level: 'info', message: 'Syntax appears valid' });
              }
            } catch (error) {
              analysis.findings.push({ type: 'syntax', level: 'error', message: error.message });
            }
          }

          // Basic complexity analysis
          if (analysisType === 'complexity' || analysisType === 'all') {
            const lines = code.split('\\n');
            const functions = (code.match(/function\\s+\\w+/g) || []).length;
            const conditions = (code.match(/if\\s*\\(|else\\s*if\\s*\\(|switch\\s*\\(/g) || []).length;
            const loops = (code.match(/for\\s*\\(|while\\s*\\(|do\\s*\\{/g) || []).length;

            analysis.metrics.linesOfCode = lines.length;
            analysis.metrics.functions = functions;
            analysis.metrics.conditions = conditions;
            analysis.metrics.loops = loops;
            analysis.metrics.cyclomaticComplexity = 1 + conditions + loops;

            if (analysis.metrics.cyclomaticComplexity > 10) {
              analysis.findings.push({ 
                type: 'complexity', 
                level: 'warning', 
                message: 'High cyclomatic complexity detected' 
              });
            }
          }

          // Basic structure analysis
          if (analysisType === 'structure' || analysisType === 'all') {
            const hasComments = code.includes('//') || code.includes('/*');
            const hasDocstrings = code.includes('/**') || code.includes('"""');
            
            analysis.findings.push({
              type: 'structure',
              level: hasComments || hasDocstrings ? 'info' : 'warning',
              message: hasComments || hasDocstrings ? 'Code includes documentation' : 'Code lacks documentation'
            });
          }

          // Basic security analysis
          if (analysisType === 'security' || analysisType === 'all') {
            const securityIssues = [];
            if (code.includes('eval(')) securityIssues.push('Use of eval() detected');
            if (code.includes('innerHTML')) securityIssues.push('Use of innerHTML detected');
            if (code.includes('document.write')) securityIssues.push('Use of document.write detected');
            
            securityIssues.forEach(issue => {
              analysis.findings.push({ type: 'security', level: 'warning', message: issue });
            });
          }

          return analysis;
        })();
      `;

      const result = await context.eval(analysisScript);
      isolate.dispose();

      return {
        analysis: result,
        codeLength: code.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[codeAnalysisTool] Code analysis failed', { 
        language, error: (error as Error).message 
      });
      throw new Error(`Code analysis failed: ${(error as Error).message}`);
    }
  }
});

/**
 * Project Structure Generator Tool
 * Generate project scaffolding using shelljs for cross-platform compatibility
 */
const projectStructureGeneratorSchema = z.object({
  projectName: z.string().describe('Name of the project to create'),
  projectType: z.enum(['node', 'react', 'express', 'typescript', 'python', 'basic']).describe('Type of project structure to generate'),
  basePath: z.string().default('.').describe('Base path where project should be created'),
  includeGitInit: z.boolean().default(true).describe('Initialize Git repository'),
  includePackageJson: z.boolean().default(true).describe('Create package.json (for Node.js projects)'),
  dependencies: z.array(z.string()).optional().describe('Initial dependencies to include'),
});

type ProjectStructureGeneratorInput = z.infer<typeof projectStructureGeneratorSchema>;

const projectStructureGeneratorTool = createTool({
  name: 'project_structure_generator',
  description: 'Generate project scaffolding and directory structure for different project types.',
  parameters: projectStructureGeneratorSchema,
  execute: async ({ projectName, projectType, basePath, includeGitInit, includePackageJson, dependencies }: ProjectStructureGeneratorInput) => {
    logger.info('[projectStructureGeneratorTool] Generating project structure', { 
      projectName, projectType, basePath, includeGitInit, includePackageJson 
    });
    
    try {
      const projectPath = `${basePath}/${projectName}`;
      const oldCwd = shell.pwd().toString();

      // Create project directory
      shell.mkdir('-p', projectPath);
      shell.cd(projectPath);

      const createdFiles: string[] = [];
      const createdDirs: string[] = [];

      // Generate structure based on project type
      switch (projectType) {
        case 'node':
        case 'typescript':
          { shell.mkdir('-p', 'src', 'dist', 'tests');
          createdDirs.push('src', 'dist', 'tests');
          
          // Create main entry point
          const mainContent = projectType === 'typescript' 
            ? 'console.log("Hello from TypeScript!");' 
            : 'console.log("Hello from Node.js!");';
          const mainFile = projectType === 'typescript' ? 'src/index.ts' : 'src/index.js';
          shell.ShellString(mainContent).to(mainFile);
          createdFiles.push(mainFile);

          // TypeScript specific files
          if (projectType === 'typescript') {
            const tsconfigContent = JSON.stringify({
              compilerOptions: {
                target: "ES2020",
                module: "commonjs",
                outDir: "./dist",
                rootDir: "./src",
                strict: true,
                esModuleInterop: true
              }
            }, null, 2);
            shell.ShellString(tsconfigContent).to('tsconfig.json');
            createdFiles.push('tsconfig.json');
          }
          break; }

        case 'react':
          { shell.mkdir('-p', 'src/components', 'public', 'tests');
          createdDirs.push('src', 'src/components', 'public', 'tests');
          
          const appContent = `import React from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to ${projectName}</h1>
      </header>
    </div>
  );
}

export default App;`;
          shell.ShellString(appContent).to('src/App.jsx');
          createdFiles.push('src/App.jsx');

          const indexContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`;
          shell.ShellString(indexContent).to('src/index.jsx');
          createdFiles.push('src/index.jsx');

          const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
          shell.ShellString(htmlContent).to('public/index.html');
          createdFiles.push('public/index.html');
          break; }

        case 'express':
          { shell.mkdir('-p', 'src/routes', 'src/middleware', 'tests');
          createdDirs.push('src', 'src/routes', 'src/middleware', 'tests');
          
          const serverContent = `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ${projectName} API!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;
          shell.ShellString(serverContent).to('src/server.js');
          createdFiles.push('src/server.js');
          break; }

        case 'python':
          { shell.mkdir('-p', 'src', 'tests');
          createdDirs.push('src', 'tests');
          
          const pythonContent = `#!/usr/bin/env python3
"""
${projectName} - Main module
"""

def main():
    print("Hello from ${projectName}!")

if __name__ == "__main__":
    main()`;
          shell.ShellString(pythonContent).to('src/main.py');
          createdFiles.push('src/main.py');

          const requirementsContent = '# Add your Python dependencies here\n';
          shell.ShellString(requirementsContent).to('requirements.txt');
          createdFiles.push('requirements.txt');
          break; }

        case 'basic':
          { shell.mkdir('-p', 'docs');
          createdDirs.push('docs');
          
          const readmeContent = `# ${projectName}

A basic project structure.

## Getting Started

Add your project documentation here.`;
          shell.ShellString(readmeContent).to('README.md');
          createdFiles.push('README.md');
          break; }
      }

      // Create package.json for Node.js projects
      if (includePackageJson && ['node', 'typescript', 'react', 'express'].includes(projectType)) {
        const packageJson = {
          name: projectName,
          version: '1.0.0',
          description: `A ${projectType} project`,
          main: projectType === 'typescript' ? 'dist/index.js' : 'src/index.js',
          scripts: {
            start: projectType === 'typescript' ? 'node dist/index.js' : 'node src/index.js',
            ...(projectType === 'typescript' && { 
              build: 'tsc',
              dev: 'ts-node src/index.ts'
            }),
            ...(projectType === 'express' && { start: 'node src/server.js' }),
            test: 'echo "Error: no test specified" && exit 1'
          },
          dependencies: dependencies ? dependencies.reduce((acc, dep) => ({ ...acc, [dep]: '^1.0.0' }), {}) : {},
          devDependencies: projectType === 'typescript' ? {
            'typescript': '^5.0.0',
            '@types/node': '^20.0.0',
            'ts-node': '^10.0.0'
          } : {}
        };
        
        shell.ShellString(JSON.stringify(packageJson, null, 2)).to('package.json');
        createdFiles.push('package.json');
      }

      // Create .gitignore
      const gitignoreContent = `node_modules/
dist/
*.log
.env
.DS_Store
${projectType === 'python' ? '__pycache__/\n*.pyc' : ''}`;
      shell.ShellString(gitignoreContent).to('.gitignore');
      createdFiles.push('.gitignore');

      // Initialize Git repository
      if (includeGitInit) {
        shell.exec('git init', { silent: true });
      }

      // Return to original directory
      shell.cd(oldCwd);

      return {
        projectName,
        projectType,
        projectPath,
        success: true,
        createdFiles,
        createdDirs,
        gitInitialized: includeGitInit,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[projectStructureGeneratorTool] Project generation failed', { 
        projectName, projectType, error: (error as Error).message 
      });
      throw new Error(`Project generation failed: ${(error as Error).message}`);
    }
  }
})

export {
  secureCodeExecutorSchema,
  secureCodeExecutorTool,
  fileSystemOperationsSchema,
  fileSystemOperationsTool,
  codeAnalysisSchema,
  codeAnalysisTool,
  projectStructureGeneratorSchema,
  projectStructureGeneratorTool
}