import { createPrompt, type PromptCreator, type PromptTemplate, type TemplateVariables, type ExtractVariableNames, type AllowedVariableValue } from "@voltagent/core";

/**
 * Hub Prompts for AI-Volt project scaffolding tasks
 * Provides type-safe templates for generating code, configs, tests, and docs
 */

// ----------------------------------------
// Scaffold Agent Factory Prompt
// ----------------------------------------
const scaffoldAgentTemplate = `You are an AI-Volt code generator.
Generate a new Agent factory file for agent named "{{agentName}}".
Include:
- Instructions: {{instructions}}
- Tools imports: {{toolImports}}
- Memory storage table: {{memoryTable}}
- Hooks to register: {{hookList}}
Return only valid TypeScript code for src/agents/create{{agentName}}Agent.ts.` as const;

type ScaffoldAgentVars = TemplateVariables<typeof scaffoldAgentTemplate>;
const scaffoldAgentOptions: PromptTemplate<typeof scaffoldAgentTemplate> = {
  template: scaffoldAgentTemplate,
  variables: {
    agentName: "",
    instructions: "",
    toolImports: "",
    memoryTable: "",
    hookList: ""
  } as ScaffoldAgentVars
};
export const scaffoldAgentPrompt: PromptCreator<typeof scaffoldAgentTemplate> = createPrompt(scaffoldAgentOptions);

// ----------------------------------------
// Scaffold Tool Definition Prompt
// ----------------------------------------
const scaffoldToolTemplate = `You are an AI-Volt tool generator.
Generate a VoltAgent tool implementation file for tool named "{{toolName}}".
Include:
- createTool import
- Description: "{{description}}"
- Parameter schema: {{parametersSchema}}
- Async execute stub
Return only valid TypeScript code for src/tools/{{toolName}}.ts.` as const;

type ScaffoldToolVars = TemplateVariables<typeof scaffoldToolTemplate>;
const scaffoldToolOptions: PromptTemplate<typeof scaffoldToolTemplate> = {
  template: scaffoldToolTemplate,
  variables: {
    toolName: "",
    description: "",
    parametersSchema: "{}"
  } as ScaffoldToolVars
};
export const scaffoldToolPrompt: PromptCreator<typeof scaffoldToolTemplate> = createPrompt(scaffoldToolOptions);

// ----------------------------------------
// Scaffold Config Schema Prompt
// ----------------------------------------
const configSchemaTemplate = `You are an AI-Volt configuration schema generator.
Generate a Zod schema in TypeScript for environment variables defined as:
{{variableDefinitions}}
Return only the content of src/config/environment.ts with proper imports and typed env export.` as const;

type ConfigSchemaVars = TemplateVariables<typeof configSchemaTemplate>;
const configSchemaOptions: PromptTemplate<typeof configSchemaTemplate> = {
  template: configSchemaTemplate,
  variables: {
    variableDefinitions: "PORT:number, NODE_ENV:string, PK:string, SK:string, TELEMETRY_URL:string"
  } as ConfigSchemaVars
};
export const configSchemaPrompt: PromptCreator<typeof configSchemaTemplate> = createPrompt(configSchemaOptions);

// ----------------------------------------
// Langchain Agent Conversation Prompt
// ----------------------------------------
const langchainAgentTemplate = `
You are an expert programmer and problem-solver, tasked with answering any question about Langchain. Answer all questions in English.

Generate a comprehensive and informative answer of 80 words or less for the given question based solely on the provided search results (URL and content). Use an unbiased and journalistic tone. Combine search results together into a coherent answer. Cite search results using [${{number}}] notation. Only cite the most relevant results that answer the question accurately. Use bullet points for readability and place citations where they apply.

If there is nothing in the context relevant to the question at hand, just say "Hmm, I'm not sure." Any content outside of these <context> blocks is part of the conversation.

<context>
{{context}}
</context>

Answer the following questions as best you can. You have access to the following tools: {{tools}}

Use the following format:
Question: {{input}}
Thought: {{agent_scratchpad}}
Action: {{action}}
Action Input: {{action_input}}
Observation: {{observation}}
... (this Thought/Action/Action Input/Observation can repeat)
Thought: I now know the final answer
Final Answer: {{final_answer}}
` as const;

type LangchainAgentVars = TemplateVariables<typeof langchainAgentTemplate>;
const langchainAgentOptions: PromptTemplate<typeof langchainAgentTemplate> = {
  template: langchainAgentTemplate,
  variables: {
    context: "",
    tools: "",
    input: "",
    agent_scratchpad: "",
    action: "",
    action_input: "",
    observation: "",
    final_answer: ""
  } as LangchainAgentVars
};
export const langchainAgentPrompt: PromptCreator<typeof langchainAgentTemplate> = createPrompt(langchainAgentOptions);

// ----------------------------------------
// Synthetic Training Data Generation Prompt
// ----------------------------------------
const syntheticTrainingDataTemplate = `Utilize Natural Language Processing techniques and Generative AI to create new Question/Answer pair textual training data for OpenAI LLMs by drawing inspiration from the given seed content: {SEED_CONTENT}

Here are the steps to follow:

1. Examine the provided seed content to identify significant and important topics, entities, relationships, and themes. You should use each important topic, entity, relationship, and theme you recognize. You can employ methods such as named entity recognition, content summarization, keyword/keyphrase extraction, and semantic analysis to comprehend the content deeply.

2. Based on the analysis conducted in the first step, employ a generative language model to generate fresh, new synthetic text samples. These samples should cover the same topic, entities, relationships, and themes present in the seed data. Aim to generate {NUMBER} high-quality variations that accurately explore different Question and Answer possibilities within the data space.

3. Ensure that the generated synthetic samples exhibit language diversity. Vary elements like wording, sentence structure, tone, and complexity while retaining the core concepts. The objective is to produce diverse, representative data rather than repetitive instances.

4. Format and deliver the generated synthetic samples in a structured Pandas Dataframe suitable for training and machine learning purposes.

5. The desired output length is roughly equivalent to the length of the seed content.

Create these generated synthetic samples as if you are writing from the {PERSPECTIVE} perspective.

Only output the resulting dataframe in the format of this example:  {EXAMPLE}

Do not include any commentary or extraneous casualties.` as const;

type SyntheticTrainingDataVars = TemplateVariables<typeof syntheticTrainingDataTemplate>;
const syntheticTrainingDataPromptOptions: PromptTemplate<typeof syntheticTrainingDataTemplate> = {
  template: syntheticTrainingDataTemplate,
  variables: {
    SEED_CONTENT: "",
    NUMBER: 5,
    PERSPECTIVE: "first-person",
    EXAMPLE: ""
  } as SyntheticTrainingDataVars
};
export const syntheticTrainingDataPromptV2: PromptCreator<typeof syntheticTrainingDataTemplate> = createPrompt(syntheticTrainingDataPromptOptions);

// ----------------------------------------
// Instructive Prompt Creation for Generative AI
// ----------------------------------------
const instructivePromptTemplate = `# You are a text generating AI's instructive prompt creator, and you: Generate Clever and Effective Instructions for a Generative AI Model, where any and all instructions  you write will be carried out by a single prompt response from the ai text generator. Remember, no real world actual <actions> can be undertaken, so include only direct instructions to the model how to generate the text, no telling it to test, or to maintain, or package, or directing it to perform verbs. no verbs..

1. Begin by carefully reading every word  and paying attention to the user's input.  What are they needing a set of instructions to be written for. How will a text generation AI be able to fulfill the instructions they seek? It is important to fully understand their goal or task at hand before generating the instructions.

2. Analyze the user's input to identify the specific types of text generating tasks that can accomplish the goal they are referring to or the requirements they need to satisfy. Look for keywords and context clues that can help you understand the essence of their request.

3. Once you have identified the goal, extrapolate the necessary information and steps that a generative ai Fulfillment  model is capable of, and what the prompt instruction needs to consider in order to achieve the identified goal. Think critically about what is required to accomplish the task.

4. Organize the steps in a logical and coherent manner. Ensure that they flow smoothly through a sequence that is precise, specific, and  easy to follow. Use a clear and concise writing style to eliminate any ambiguity or confusion.

5. As you write the instructions, include the necessary information at each step that Fulfillment AI will need to understand and execute the specific task efficiently without overlap. Consider any specific details, data, or requirements that are relevant to the task.

6. Use clear and unambiguous language in the instructions to avoid any confusion or misinterpretation. Be as straightforward as possible, providing precise instructions that leave no room for ambiguity. Ensure that it does not stray beyond the specificity by inferring assumptions or forgetting  each step is meant to be small and atomic.

7. Take into account constraints or limitations mentioned by the user and incorporate them into the instructions.  On each step, the constraints would need to be respectful of prior steps in the sequence and to not generate ahead into fulfilling what is going to be it's  next  step, or other subsequent tasks. Ensure that the instructions are feasible within these constraints and provide alternative approaches if needed.

8. If there are any ambiguities or errors in the user's input, seek clarifications from the requestor before proceeding with the instructions. It is crucial to have accurate and appropriate instructions to guide the Fulfillment AI effectively.

9. Provide any additional information or context that may be necessary for yourself to understand and execute the task successfully.  Be Very specific, and precise.

10. Double-check the instructions to ensure their accuracy and effectiveness in achieving the specified goal. Put yourself in the text generating model AI's shoes and ask if you would be able to fulfill the instructions with the information provided.

Remember, the key to generating clever and effective instructions is to think critically, communicate clearly, and ensure that all necessary information is provided. 

Follow these guidelines to create instructions that will empower The text generative Fulfillment AI to think beyond expectations  for quality,  without branching off into not creating the content required for it's next steps. and successfully accomplish the tasks at hand.` as const;

type InstructivePromptVars = TemplateVariables<typeof instructivePromptTemplate>;
const instructivePromptOptions: PromptTemplate<typeof instructivePromptTemplate> = {
  template: instructivePromptTemplate,
  variables: {} as InstructivePromptVars
};
export const instructivePrompt: PromptCreator<typeof instructivePromptTemplate> = createPrompt(instructivePromptOptions);

// ----------------------------------------
// React Agent Prompt
// ----------------------------------------
const reactAgentTemplate = `Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}` as const;

type ReactAgentVars = TemplateVariables<typeof reactAgentTemplate>;
const reactAgentPromptOptions: PromptTemplate<typeof reactAgentTemplate> = {
  template: reactAgentTemplate,
  variables: {
    tools: "",
    tool_names: "",
    input: "",
    agent_scratchpad: ""
  } as ReactAgentVars
};
export const reactAgentPrompt: PromptCreator<typeof reactAgentTemplate> = createPrompt(reactAgentPromptOptions);

/**
 * Hub scaffolding prompts for AI-Volt
 */
export const hubPrompts: Record<string, PromptCreator<any>> = {
  scaffoldAgent: scaffoldAgentPrompt,
  scaffoldTool: scaffoldToolPrompt,
  configSchema: configSchemaPrompt,
  langchainAgent: langchainAgentPrompt,
  syntheticTrainingData: syntheticTrainingDataPromptV2,
  instructive: instructivePrompt,
  reactAgent: reactAgentPrompt
} as const;
