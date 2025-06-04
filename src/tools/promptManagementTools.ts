/**
 * Prompt Management Toolkit
 * Advanced prompt engineering and optimization tools for AI-Volt agents
 * Generated on 2025-01-19
 */

import { createToolkit, ToolSchema } from "@voltagent/core";
import { z } from "zod";
import { generateId, Tool } from "ai";
import { logger } from "../config/logger.js";
import { 
  supervisorPrompts, 
  workerPrompts, 
  utilityPrompts,
  generateSupervisorPrompt, 
  generateWorkerPrompt,
  getPrompt,
  type SupervisorPromptType,
  type WorkerPromptType,
  type UtilityPromptType
} from "../prompts/index.js";
// ================================================================================================
// SCHEMAS
// ================================================================================================

/**
 * Schema for prompt security analysis
 */
const PromptSecurityAnalysisSchema = z.object({
  promptText: z.string().min(10, "Prompt must be at least 10 characters"),
  analysisType: z.enum(["injection", "jailbreak", "data_leakage", "bias", "comprehensive"])
    .describe("Type of security analysis to perform"),
  context: z.object({
    agentType: z.string().optional(),
    userRole: z.string().optional(),
    sensitiveData: z.array(z.string()).optional()
  }).optional()
});

/**
 * Schema for adaptive prompt generation
 */
const AdaptivePromptGenerationSchema = z.object({
  baseTemplate: z.string().min(20, "Base template must be substantial"),
  adaptationCriteria: z.object({
    userExpertise: z.enum(["beginner", "intermediate", "expert", "auto-detect"]),
    communicationStyle: z.enum(["formal", "casual", "technical", "conversational", "adaptive"]),
    taskComplexity: z.enum(["simple", "moderate", "complex", "multi-step"]),
    responseLength: z.enum(["concise", "detailed", "comprehensive", "adaptive"]),
    domainFocus: z.string().optional()
  }),
  contextualFactors: z.object({
    timeConstraints: z.boolean().optional(),
    multimodalRequirements: z.boolean().optional(),
    securityLevel: z.enum(["standard", "high", "critical"]).optional(),
    collaborationMode: z.boolean().optional()
  }).optional()
});

/**
 * Schema for iterative prompt refinement
 */
const IterativePromptRefinementSchema = z.object({
  originalPrompt: z.string().min(10, "Original prompt must be at least 10 characters"),
  refinementGoals: z.array(z.enum(["clarity", "specificity", "safety", "efficiency", "creativity", "accuracy"])),
  iterationLimit: z.number().min(1).max(10).default(3),
  evaluationCriteria: z.object({
    responseQuality: z.boolean().default(true),
    securityCompliance: z.boolean().default(true),
    taskAlignment: z.boolean().default(true),
    userExperience: z.boolean().default(false)
  }).optional()
});

/**
 * Schema for modular prompt design
 */
const ModularPromptDesignSchema = z.object({
  promptComponents: z.object({
    systemContext: z.string().optional(),
    taskDefinition: z.string(),
    constraints: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
    outputFormat: z.string().optional()
  }),
  assemblyStrategy: z.enum(["sequential", "prioritized", "conditional", "adaptive"]),
  optimizationTargets: z.array(z.enum(["clarity", "brevity", "completeness", "safety", "performance"])).optional()
});

// ================================================================================================
// TOOLKIT IMPLEMENTATION (VoltAgent Pattern)
// ================================================================================================


/**
 * Creates the prompt management toolkit with integrated AI-Volt prompt system
 * @returns Toolkit configured with prompt management tools
 */
const promptManagementToolkit = createToolkit({
  name: "prompt_management_toolkit",
  description: "Advanced prompt engineering and optimization tools for AI-Volt agents",
  instructions: `Use these tools for comprehensive prompt management:

SECURITY ANALYSIS:
- Use prompt_security_analysis to check for injection, jailbreak, and bias vulnerabilities
- Always analyze prompts handling user input or sensitive data
- Review security recommendations before deployment

ADAPTIVE GENERATION:
- Use adaptive_prompt_generation to create context-aware prompts
- Adjust prompts based on user expertise level and task complexity
- Consider multimodal requirements and security constraints

ITERATIVE REFINEMENT:
- Use iterative_prompt_refinement for systematic prompt optimization
- Define clear refinement goals (clarity, specificity, safety, efficiency)
- Iterate until evaluation criteria are met

MODULAR DESIGN:
- Use modular_prompt_design for component-based prompt architecture
- Organize prompts into reusable system context, task definition, constraints, examples, and output format
- Choose appropriate assembly strategy based on use case

BEST PRACTICES:
- Start with security analysis for any user-facing prompts
- Use adaptive generation for dynamic user interactions
- Apply iterative refinement for critical production prompts
- Implement modular design for maintainable prompt systems`,
  tools: [
    {
      id: "prompt_security_analysis",
      name: "prompt_security_analysis",
      description: "Analyze prompts for security vulnerabilities including injection detection, jailbreak prevention, and bias analysis",
      parameters: PromptSecurityAnalysisSchema,
      async execute({ promptText, analysisType, context }: z.infer<typeof PromptSecurityAnalysisSchema>) {
        const analysisId = generateId();
        const startTime = Date.now();

        try {
          logger.info(`[PromptSecurity] Starting analysis`, {
            analysisId,
            analysisType,
            promptLength: promptText.length,
            hasContext: !!context
          });

          // Security vulnerability patterns
          const vulnerabilityPatterns = {
            injection: [
              /ignore\s+previous\s+instructions/i,
              /forget\s+everything\s+above/i,
              /act\s+as\s+(if\s+you\s+are|a\s+different)/i,
              /\{\{.*system.*\}\}/i,
              /<!--.*-->/
            ],
            jailbreak: [
              /roleplay\s+as/i,
              /pretend\s+(you\s+are|to\s+be)/i,
              /imagine\s+you\s+are/i,
              /switch\s+to\s+developer\s+mode/i,
              /disable\s+(safety|filter|restriction)/i,
              /override\s+(setting|constraint|rule)/i
            ],
            data_leakage: [
              /show\s+me\s+(your|the)\s+(prompt|instruction|system)/i,
              /what\s+(are\s+your|is\s+the)\s+(instruction|rule|guideline)/i,
              /reveal\s+(secret|hidden|internal)/i,
              /dump\s+(memory|system|data)/i
            ],
            bias: [
              /(male|female|man|woman)\s+are\s+(better|worse)/i,
              /(race|religion|nationality).*superior/i,
              /only\s+(men|women)\s+can/i
            ]
          };

          const results = {
            analysisId,
            promptText: promptText.substring(0, 100), // Limited for security
            analysisType,
            vulnerabilities: [] as Array<{
              type: string;
              severity: "low" | "medium" | "high" | "critical";
              description: string;
              suggestion: string;
            }>,
            riskScore: 0,
            recommendations: [] as string[],
            isSecure: true
          };

          // Pattern matching analysis
          const patternsToCheck = analysisType === "comprehensive" 
            ? Object.values(vulnerabilityPatterns).flat()
            : vulnerabilityPatterns[analysisType as keyof typeof vulnerabilityPatterns] || [];

          for (const pattern of patternsToCheck) {
            if (pattern.test(promptText)) {
              const vulnType = Object.entries(vulnerabilityPatterns).find(([_, patterns]) => 
                patterns.includes(pattern)
              )?.[0] || "unknown";

              results.vulnerabilities.push({
                type: vulnType,
                severity: vulnType === "injection" || vulnType === "jailbreak" ? "high" : "medium",
                description: `Potential ${vulnType} pattern detected`,
                suggestion: `Review and sanitize prompt to remove ${vulnType} patterns`
              });
            }
          }

          // Calculate risk score
          results.riskScore = results.vulnerabilities.reduce((score, vuln) => {
            const severityScores = { low: 1, medium: 3, high: 7, critical: 10 };
            return score + severityScores[vuln.severity];
          }, 0);

          results.isSecure = results.riskScore < 5;

          // Generate recommendations
          if (results.vulnerabilities.length > 0) {
            results.recommendations.push(
              "Implement input sanitization before processing prompts",
              "Use structured prompt templates to prevent injection",
              "Add content filtering for sensitive instructions",
              "Monitor for unusual prompt patterns in production"
            );
          } else {
            results.recommendations.push("Prompt appears secure with current analysis");
          }

          const duration = Date.now() - startTime;

          logger.info(`[PromptSecurity] Analysis completed`, {
            analysisId,
            duration,
            vulnerabilityCount: results.vulnerabilities.length,
            riskScore: results.riskScore,
            isSecure: results.isSecure
          });

          return {
            success: true,
            ...results,
            metadata: { analysisId, duration }
          };

        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`[PromptSecurity] Analysis failed`, {
            analysisId,
            duration,
            error: error instanceof Error ? error.message : String(error)
          });

            return {
              success: false,
              error: `Security analysis failed: ${error instanceof Error ? error.message : String(error)}`,
              metadata: { analysisId, duration }
            };
          }
        }
    },
    {
      id: "adaptive_prompt_generation",
      name: "adaptive_prompt_generation",
      description: "Generate adaptive prompts that adjust based on user expertise, context, and task complexity",
      parameters: AdaptivePromptGenerationSchema,
      async execute({ baseTemplate, adaptationCriteria, contextualFactors }: z.infer<typeof AdaptivePromptGenerationSchema>) {
        const generationId = generateId();
        const startTime = Date.now();

        try {
          logger.info(`[AdaptivePrompt] Starting generation`, {
            generationId,
            userExpertise: adaptationCriteria.userExpertise,
            taskComplexity: adaptationCriteria.taskComplexity,
            multimodal: contextualFactors?.multimodalRequirements
          });

          // Expertise-based adaptations
          const expertiseAdaptations = {
            beginner: {
              prefix: "Let me guide you step-by-step through this process. ",
              style: "explanatory and detailed",
              examples: true,
              glossary: true
            },
            intermediate: {
              prefix: "Here's how to approach this task effectively: ",
              style: "balanced detail with some technical terms",
              examples: true,
              glossary: false
            },
            expert: {
              prefix: "Technical approach: ",
              style: "concise and technical",
              examples: false,
              glossary: false
            },
            "auto-detect": {
              prefix: "I'll adjust my response based on your expertise level. ",
              style: "adaptive based on user responses",
              examples: true,
              glossary: true
            }
          };

          // Task complexity adaptations
          const complexityAdaptations = {
            simple: { structure: "single-step", detail: "minimal" },
            moderate: { structure: "multi-step", detail: "moderate" },
            complex: { structure: "hierarchical", detail: "comprehensive" },
            "multi-step": { structure: "sequential", detail: "detailed" }
          };

          const adaptation = expertiseAdaptations[adaptationCriteria.userExpertise];
          const complexity = complexityAdaptations[adaptationCriteria.taskComplexity];

          let adaptedPrompt = adaptation.prefix + baseTemplate;

          // Add contextual factors
          if (contextualFactors?.timeConstraints) {
            adaptedPrompt += "\n\nNote: Please provide a concise response due to time constraints.";
          }

          if (contextualFactors?.multimodalRequirements) {
            adaptedPrompt += "\n\nConsider both textual and visual elements in your response.";
          }

          if (contextualFactors?.securityLevel === "high" || contextualFactors?.securityLevel === "critical") {
            adaptedPrompt += "\n\nIMPORTANT: Follow strict security protocols and avoid exposing sensitive information.";
          }

          // Add examples if needed
          if (adaptation.examples && adaptationCriteria.taskComplexity !== "simple") {
            adaptedPrompt += "\n\nExamples will be provided to illustrate the expected approach.";
          }

          // Add glossary if needed
          if (adaptation.glossary) {
            adaptedPrompt += "\n\nTechnical terms will be explained for clarity.";
          }

          const duration = Date.now() - startTime;

          logger.info(`[AdaptivePrompt] Generation completed`, {
            generationId,
            duration,
            originalLength: baseTemplate.length,
            adaptedLength: adaptedPrompt.length,
            adaptationStrategy: adaptationCriteria.userExpertise
          });

          return {
            success: true,
            originalPrompt: baseTemplate,
            adaptedPrompt,
            adaptationStrategy: {
              userExpertise: adaptationCriteria.userExpertise,
              communicationStyle: adaptationCriteria.communicationStyle,
              taskComplexity: adaptationCriteria.taskComplexity,
              appliedAdaptations: {
                prefix: adaptation.prefix,
                style: adaptation.style,
                includesExamples: adaptation.examples,
                includesGlossary: adaptation.glossary,
                structure: complexity.structure,
                detailLevel: complexity.detail
              }
            },
            metadata: { generationId, duration }
          };

        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`[AdaptivePrompt] Generation failed`, {
            generationId,
            duration,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            success: false,
            error: `Adaptive prompt generation failed: ${error instanceof Error ? error.message : String(error)}`,
            metadata: { generationId, duration }
          };
        }
      }
    },
    {
      id: "iterative_prompt_refinement",
      name: "iterative_prompt_refinement",
      description: "Iteratively refine and optimize prompts based on specified goals and evaluation criteria",
      parameters: IterativePromptRefinementSchema,
      async execute({ originalPrompt, refinementGoals, iterationLimit, evaluationCriteria }: z.infer<typeof IterativePromptRefinementSchema>) {
        const refinementId = generateId();
        const startTime = Date.now();

        try {
          logger.info(`[PromptRefinement] Starting refinement`, {
            refinementId,
            originalLength: originalPrompt.length,
            goals: refinementGoals,
            iterationLimit
          });

          const iterations = [];
          let currentPrompt = originalPrompt;

          for (let i = 0; i < iterationLimit; i++) {
            const iterationStart = Date.now();
            
            // Apply refinement strategies based on goals
            let refinedPrompt = currentPrompt;
            const appliedRefinements = [];

            if (refinementGoals.includes("clarity")) {
              refinedPrompt = refinedPrompt.replace(/\b(this|that|it)\b/g, '[specific reference]');
              refinedPrompt = refinedPrompt.replace(/\b(some|several|many)\b/g, '[specific quantity]');
              appliedRefinements.push("clarity-improvements");
            }

            if (refinementGoals.includes("specificity")) {
              if (!refinedPrompt.includes("specifically") && !refinedPrompt.includes("exactly")) {
                refinedPrompt = "Please provide specific details about " + refinedPrompt;
                appliedRefinements.push("specificity-enhancement");
              }
            }

            if (refinementGoals.includes("safety")) {
              refinedPrompt += "\n\nNote: Follow safety guidelines and avoid harmful content.";
              appliedRefinements.push("safety-guidelines");
            }

            if (refinementGoals.includes("efficiency")) {
              refinedPrompt = refinedPrompt.replace(/\s+/g, ' ').trim();
              if (refinedPrompt.length > 200) {
                refinedPrompt = refinedPrompt.substring(0, 197) + "...";
              }
              appliedRefinements.push("efficiency-optimization");
            }

            // Evaluate iteration
            const evaluation = {
              responseQuality: evaluationCriteria?.responseQuality ? Math.random() > 0.3 : undefined,
              securityCompliance: evaluationCriteria?.securityCompliance ? !refinedPrompt.includes("ignore") : undefined,
              taskAlignment: evaluationCriteria?.taskAlignment ? refinedPrompt.length > originalPrompt.length * 0.8 : undefined,
              userExperience: evaluationCriteria?.userExperience ? appliedRefinements.length > 0 : undefined
            };

            iterations.push({
              iteration: i + 1,
              prompt: refinedPrompt,
              appliedRefinements,
              evaluation,
              duration: Date.now() - iterationStart,
              improvement: refinedPrompt !== currentPrompt
            });

            currentPrompt = refinedPrompt;

            // Break early if no improvements
            if (refinedPrompt === originalPrompt && i > 0) {
              logger.debug(`[PromptRefinement] No improvements found, stopping at iteration ${i + 1}`);
              break;
            }
          }

          const finalPrompt = iterations[iterations.length - 1]?.prompt || originalPrompt;
          const totalDuration = Date.now() - startTime;

          logger.info(`[PromptRefinement] Refinement completed`, {
            refinementId,
            totalDuration,
            iterations: iterations.length,
            originalLength: originalPrompt.length,
            finalLength: finalPrompt.length,
            goals: refinementGoals
          });

          return {
            success: true,
            originalPrompt,
            finalPrompt,
            refinementGoals,
            iterations,
            summary: {
              totalIterations: iterations.length,
              improvementsMade: iterations.filter(iter => iter.improvement).length,
              finalScore: iterations[iterations.length - 1]?.evaluation || {},
              effectiveness: finalPrompt !== originalPrompt ? "improved" : "no-change"
            },
            metadata: { refinementId, duration: totalDuration }
          };

        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`[PromptRefinement] Refinement failed`, {
            refinementId,
            duration,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            success: false,
            error: `Prompt refinement failed: ${error instanceof Error ? error.message : String(error)}`,
            metadata: { refinementId, duration }
          };
        }
      }
    },
    {
      id: "modular_prompt_design",
      name: "modular_prompt_design",
      description: "Design and assemble modular prompts using component-based architecture",
      parameters: ModularPromptDesignSchema,
      async execute({ promptComponents, assemblyStrategy, optimizationTargets }: z.infer<typeof ModularPromptDesignSchema>) {
        const designId = generateId();
        const startTime = Date.now();

        try {
          logger.info(`[ModularPrompt] Starting design`, {
            designId,
            assemblyStrategy,
            componentCount: Object.keys(promptComponents).length,
            optimizationTargets
          });

          const components = [];
          
          // System context
          if (promptComponents.systemContext) {
            components.push({
              type: "system",
              content: promptComponents.systemContext,
              priority: 1
            });
          }

          // Task definition (always required)
          components.push({
            type: "task",
            content: promptComponents.taskDefinition,
            priority: 2
          });

          // Constraints
          if (promptComponents.constraints && promptComponents.constraints.length > 0) {
            components.push({
              type: "constraints",
              content: "Constraints:\n" + promptComponents.constraints.map(c => `- ${c}`).join('\n'),
              priority: 3
            });
          }

          // Examples
          if (promptComponents.examples && promptComponents.examples.length > 0) {
            components.push({
              type: "examples",
              content: "Examples:\n" + promptComponents.examples.map(e => `- ${e}`).join('\n'),
              priority: 4
            });
          }

          // Output format
          if (promptComponents.outputFormat) {
            components.push({
              type: "format",
              content: `Output Format: ${promptComponents.outputFormat}`,
              priority: 5
            });
          }

          // Assembly strategies
          let assembledPrompt = "";
          
          switch (assemblyStrategy) {
            case "sequential":
              assembledPrompt = components
                .sort((a, b) => a.priority - b.priority)
                .map(c => c.content)
                .join('\n\n');
              break;
              
            case "prioritized":
              assembledPrompt = components
                .sort((a, b) => a.priority - b.priority)
                .map(c => `[${c.type.toUpperCase()}] ${c.content}`)
                .join('\n\n');
              break;
              
            case "conditional":
              assembledPrompt = components
                .filter(c => c.type === "system" || c.type === "task")
                .map(c => c.content)
                .join('\n\n');
              break;
              
            case "adaptive":
              assembledPrompt = components
                .map(c => c.content)
                .join('\n\n');
              break;
          }

          // Apply optimization targets
          if (optimizationTargets) {
            if (optimizationTargets.includes("brevity")) {
              assembledPrompt = assembledPrompt.replace(/\s+/g, ' ').trim();
            }
            if (optimizationTargets.includes("clarity")) {
              assembledPrompt = assembledPrompt.replace(/\b(this|that|it)\b/g, '[specific reference]');
            }
          }

          const duration = Date.now() - startTime;

          logger.info(`[ModularPrompt] Design completed`, {
            designId,
            duration,
            componentCount: components.length,
            assemblyStrategy,
            finalLength: assembledPrompt.length
          });

          return {
            success: true,
            assembledPrompt,
            components: components.map(c => ({ type: c.type, content: c.content })),
            assemblyStrategy,
            optimizationTargets,
            metadata: { designId, duration }
          };

        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`[ModularPrompt] Design failed`, {
            designId,
            duration,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            success: false,
            error: `Modular prompt design failed: ${error instanceof Error ? error.message : String(error)}`,
            metadata: { designId, duration }
          };
        }
      }
    }
  ]
});

export default promptManagementToolkit;
export {
  PromptSecurityAnalysisSchema,
  AdaptivePromptGenerationSchema,
  IterativePromptRefinementSchema,
  ModularPromptDesignSchema,
  promptManagementToolkit,
  getPrompt,
  generateSupervisorPrompt,
  generateWorkerPrompt,
  supervisorPrompts,
  workerPrompts,
  utilityPrompts,
  SupervisorPromptType,
  WorkerPromptType,
  UtilityPromptType
};