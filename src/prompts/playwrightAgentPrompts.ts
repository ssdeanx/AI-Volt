/**
 * Playwright Agent Prompts
 * Provides structured prompt templates for guiding an LLM agent
 * in web automation tasks using Playwright tools.
 */

import { createPrompt, type PromptCreator } from "@voltagent/core";

// ================================================================================================
// GENERAL PLAYWRIGHT TASK ORCHESTRATION PROMPT
// ================================================================================================

/**
 * Base instructions for an agent that uses Playwright tools.
 * This prompt guides the agent on how to approach web automation tasks.
 */
export const playwrightAgentBasePrompt = createPrompt({
  template: `You are a Web Automation Assistant powered by Playwright. Your goal is to accurately and efficiently perform tasks on web pages using the available Playwright tools.

Key Principles:
- **Understand the Goal:** Before acting, ensure you understand the user's objective for the web page, breaking it down into atomic steps.
- **Element Selection:** Prioritize robust, unique, and semantic selectors (e.g., IDs, data-testid, ARIA roles, specific text). If a selector is ambiguous, not found, or unreliable, first attempt to list interactive elements to discover alternatives, then request clarification or suggest a more specific query to the user. Always validate element visibility/interactability before acting.
- **Sequential & Logical Actions:** Break down complex tasks into a logical sequence of smaller actions (e.g., navigate, find element, type text, click button, verify result). Consider pre-conditions (e.g., waiting for elements) and post-conditions (e.g., asserting new page state) for each step.
- **Dynamic Content Handling:** Explicitly use 'waitForElement' with appropriate states ('visible', 'hidden', 'attached', 'detached', 'loadState') for elements that may load dynamically or appear after an interaction. Do not assume elements are immediately present or interactive.
- **State Awareness & Verification:** After each action, critically assess the current state of the page. Use information retrieval tools ('getText', 'getVisibleText', 'getVisibleHtml', 'listInteractiveElements') or assertions ('assertResponse') to confirm actions had the intended effect and the page is in the expected state before proceeding.
- **Robust Error Handling & Recovery:** If a tool fails (e.g., element not found, timeout, unexpected response), clearly report the error. Diagnose the likely cause (e.g., wrong selector, element not loaded, network issue). Consider taking a screenshot immediately for debugging purposes. Propose a recovery action (e.g., retry with a different selector, wait longer, navigate back, request user clarification, log and gracefully exit if unrecoverable). Do not invent information if an operation fails.
- **VM Context & Tool Output Reliance:** Remember that all browser operations occur in an isolated, headless environment unless specified. Your knowledge of the page is based *solely* on the explicit output of the tools. Do not assume visual context or user input beyond what the tools provide.
- **Ethical & Performance Considerations:** Always respect website terms of service and rate limits. Avoid excessively rapid or resource-intensive operations. Prioritize efficient tool usage.

- **Tool Usage Guidelines:**
    - **Navigation:** 'navigate', 'goBack', 'goForward', 'refreshPage', 'closeBrowser' for controlling browser flow.
    - **Page Capture:** 'takeScreenshot' for visual verification or logging.
    - **Element Interaction:** 'click', 'typeText', 'selectOption', 'check', 'uncheck', 'hover', 'pressKey' for user-like interactions. Always try to use the most specific selector possible.
    - **Information Retrieval:** 'getText', 'getVisibleText', 'getVisibleHtml', 'listInteractiveElements', 'getUserAgent' for querying page content and properties. Use these to understand the page state.
    - **Network Handling:** 'expectResponse', 'assertResponse' for monitoring and validating network requests/responses.
    - **Data Output:** 'saveToFile', 'exportToPdf', 'extractData' for persisting extracted data or page content.
    - **Synchronization:** 'waitForElement' is critical for dealing with dynamic content and ensuring elements are ready for interaction.

User's Task: {{userTaskDescription}}
Current Page URL (if known): {{currentPageUrl}}
Available Playwright Tools: {{playwrightToolNames}}

Based on the user's task, what is the next logical Playwright tool to use and with what parameters? Provide reasoning for your choice, and if the task is multi-step, outline the first step and its expected outcome. If the previous step failed, explain the error, diagnose the cause, and suggest a recovery action or request clarification. Always strive for the most robust and accurate automation.`,
  variables: {
    userTaskDescription: "No specific task provided yet.",
    currentPageUrl: "Unknown",
    playwrightToolNames: "navigate, goBack, goForward, refreshPage, closeBrowser, takeScreenshot, click, typeText, selectOption, check, uncheck, hover, pressKey, getText, getVisibleText, getVisibleHtml, listInteractiveElements, getUserAgent, expectResponse, assertResponse, saveToFile, exportToPdf, extractData, waitForElement", // Updated list of tool names
  }
});

// ================================================================================================
// SPECIFIC TASK PROMPT TEMPLATES
// ================================================================================================

/**
 * Prompt for navigating to a URL.
 */
export const playwrightNavigatePrompt = createPrompt({
  template: `The user wants to navigate to a web page.
Objective: Open the URL '{{targetUrl}}'.
Tool to use: 'navigate'.
Parameters:
- url: '{{targetUrl}}'
- waitUntil: '{{waitUntilCondition}}' (e.g., 'load', 'domcontentloaded', 'networkidle', 'commit')
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    targetUrl: "https://example.com",
    waitUntilCondition: "load",
    timeout: 60000
  }
});

/**
 * Prompt for navigating back in browser history.
 */
export const playwrightGoBackPrompt = createPrompt({
  template: `The user wants to go back to the previous page in the browser history.
Objective: Navigate back.
Tool to use: 'goBack'.
Parameters: {} (No parameters)

Generate the precise tool call.`,
  variables: {}
});

/**
 * Prompt for navigating forward in browser history.
 */
export const playwrightGoForwardPrompt = createPrompt({
  template: `The user wants to go forward to the next page in the browser history.
Objective: Navigate forward.
Tool to use: 'goForward'.
Parameters: {} (No parameters)

Generate the precise tool call.`,
  variables: {}
});

/**
 * Prompt for refreshing the current page.
 */
export const playwrightRefreshPagePrompt = createPrompt({
  template: `The user wants to refresh the current web page.
Objective: Reload the current page.
Tool to use: 'refreshPage'.
Parameters: {} (No parameters)

Generate the precise tool call.`,
  variables: {}
});

/**
 * Prompt for closing the browser.
 */
export const playwrightCloseBrowserPrompt = createPrompt({
  template: `The user wants to close the current browser instance.
Objective: Close the browser.
Tool to use: 'closeBrowser'.
Parameters: {} (No parameters)

Generate the precise tool call.`,
  variables: {}
});

/**
 * Prompt for clicking an element.
 */
export const playwrightClickElementPrompt = createPrompt({
  template: `The user wants to click an element on the current page.
Objective: Click the element identified by the selector '{{selector}}'.
Context: {{elementContextDescription}}
Tool to use: 'click'.
Parameters:
- selector: '{{selector}}'
- button: '{{button}}' (e.g., 'left', 'right', 'middle')
- clickCount: {{clickCount}}
- force: {{force}} (boolean, bypass actionability checks)
- timeout: {{timeout}} (in milliseconds)

If the element is not immediately visible or interactable, consider using 'waitForElement' first.
Generate the precise tool call for clicking the element.`,
  variables: {
    selector: "button#submit",
    elementContextDescription: "The main submit button for the login form.",
    button: "left",
    clickCount: 1,
    force: false,
    timeout: 30000
  }
});

/**
 * Prompt for typing text into an input field.
 */
export const playwrightTypeTextPrompt = createPrompt({
  template: `The user wants to type text into an input field on the current page.
Objective: Type the text "{{textToType}}" into the element identified by '{{selector}}'.
Context: {{elementContextDescription}}
Tool to use: 'typeText'.
Parameters:
- selector: '{{selector}}'
- text: "{{textToType}}"
- delay: {{delayBetweenKeys}} (time to wait between key presses in milliseconds)
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    selector: "input[name='username']",
    textToType: "testuser",
    elementContextDescription: "The username input field.",
    delayBetweenKeys: 50,
    timeout: 30000
  }
});

/**
 * Prompt for getting text from an element.
 */
export const playwrightGetTextPrompt = createPrompt({
  template: `The user wants to extract text from an element on the current page.
Objective: Get the text content of the element '{{selector}}'.
Context: {{elementContextDescription}}
Tool to use: 'getText'.
Parameters:
- selector: '{{selector}}'
- timeout: {{timeout}} (in milliseconds)

The result should be the text content of the element.
Generate the precise tool call.`,
  variables: {
    selector: "h1.page-title",
    elementContextDescription: "The main title of the page.",
    timeout: 30000
  }
});

/**
 * Prompt for selecting options from a dropdown.
 */
export const playwrightSelectOptionPrompt = createPrompt({
  template: `The user wants to select an option from a dropdown (select element).
Objective: Select an option in the element identified by '{{selector}}'.
Parameters:
- selector: '{{selector}}' (CSS or XPath selector for the select element)
- value: '{{value}}' (Optional: The value of the option to select)
- label: '{{label}}' (Optional: The label of the option to select)
- index: {{index}} (Optional: The 0-based index of the option to select)
- timeout: {{timeout}} (in milliseconds)

Provide either 'value', 'label', or 'index'.
Generate the precise tool call.`,
  variables: {
    selector: "select#country-dropdown",
    value: "USA",
    label: "",
    index: 0,
    timeout: 30000
  }
});

/**
 * Prompt for checking a checkbox or radio button.
 */
export const playwrightCheckPrompt = createPrompt({
  template: `The user wants to check a checkbox or radio button.
Objective: Check the element identified by '{{selector}}'.
Parameters:
- selector: '{{selector}}' (CSS or XPath selector for the checkbox or radio)
- force: {{force}} (boolean, bypass actionability checks)
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    selector: "input#terms-checkbox",
    force: false,
    timeout: 30000
  }
});

/**
 * Prompt for unchecking a checkbox.
 */
export const playwrightUncheckPrompt = createPrompt({
  template: `The user wants to uncheck a checkbox.
Objective: Uncheck the element identified by '{{selector}}'.
Parameters:
- selector: '{{selector}}' (CSS or XPath selector for the checkbox)
- force: {{force}} (boolean, bypass actionability checks)
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    selector: "input#newsletter-signup",
    force: false,
    timeout: 30000
  }
});

/**
 * Prompt for hovering over an element.
 */
export const playwrightHoverPrompt = createPrompt({
  template: `The user wants to hover over an element.
Objective: Hover over the element identified by '{{selector}}'.
Parameters:
- selector: '{{selector}}' (CSS or XPath selector for the element)
- force: {{force}} (boolean, bypass actionability checks)
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    selector: "div.tooltip-trigger",
    force: false,
    timeout: 30000
  }
});

/**
 * Prompt for pressing a keyboard key.
 */
export const playwrightPressKeyPrompt = createPrompt({
  template: `The user wants to press a keyboard key or key combination.
Objective: Press the key '{{key}}'.
Context: {{keyContextDescription}}
Parameters:
- key: '{{key}}' (e.g., 'Enter', 'Escape', 'Control+A')
- selector: '{{selector}}' (Optional: CSS or XPath selector to focus before pressing key)
- delay: {{delay}} (delay between keystrokes in milliseconds)
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    key: "Enter",
    selector: "",
    delay: 0,
    timeout: 30000,
    keyContextDescription: "e.g., to submit a form, close a dialog, or select text."
  }
});

/**
 * Prompt for taking a screenshot.
 */
export const playwrightTakeScreenshotPrompt = createPrompt({
  template: `The user needs a screenshot of the current page.
Objective: Capture a screenshot.
Parameters:
- filename: '{{fileName}}' (Optional: path to save the screenshot file. If not provided, returns base64 string.)
- fullPage: {{isFullPage}} (boolean, take screenshot of the full scrollable page)
- quality: {{jpegQuality}} (Optional: JPEG quality (0-100). Only for JPEG format.)
- type: '{{imageType}}' (e.g., 'png', 'jpeg')
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    fileName: "screenshot.png",
    isFullPage: true,
    imageType: "png",
    jpegQuality: 80, // Only relevant for JPEG
    timeout: 30000
  }
});

/**
 * Prompt for waiting for an element to appear or change state.
 */
export const playwrightWaitForElementPrompt = createPrompt({
    template: `The user needs to wait for an element on the current page to reach a certain state before proceeding.
  Objective: Wait for the element '{{selector}}' to be '{{state}}'.
  Context: {{elementContextDescription}}
  Tool to use: 'waitForElement'.
  Parameters:
  - selector: '{{selector}}'
  - state: '{{state}}' (e.g., 'visible', 'hidden', 'attached', 'detached')
- timeout: {{timeout}} (in milliseconds)
  
  Generate the precise tool call.`,
    variables: {
      selector: "div#loading-spinner",
      state: "hidden",
      elementContextDescription: "The loading spinner that appears during page transitions.",
      timeout: 30000
    }
  });

/**
 * Prompt for setting up response wait operations.
 */
export const playwrightExpectResponsePrompt = createPrompt({
  template: `The user wants to wait for a network response matching a URL pattern.
Objective: Wait for a response from '{{urlPattern}}'.
Parameters:
- urlPattern: '{{urlPattern}}' (A glob pattern, regex, or predicate function to match the response URL)
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    urlPattern: "**/api/data",
    timeout: 30000
  }
});

/**
 * Prompt for asserting and validating responses.
 */
export const playwrightAssertResponsePrompt = createPrompt({
  template: `The user wants to assert properties of a network response.
Objective: Assert response properties for URL matching '{{urlPattern}}'.
Parameters:
- expectedStatus: {{expectedStatus}} (Optional: Expected HTTP status code)
- expectedBodyContains: '{{expectedBodyContains}}' (Optional: Substring expected in the response body)
- urlPattern: '{{urlPattern}}' (Optional: URL pattern to identify a specific response)
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    expectedStatus: 200,
    expectedBodyContains: "success",
    urlPattern: "**/api/login",
    timeout: 5000
    }
  });
  
  /**
   * Prompt for getting all visible text from the page.
   */
  export const playwrightGetVisiblePageTextPrompt = createPrompt({
    template: `The user wants to extract all visible text content from the current page body.
  Objective: Get all discernible text currently rendered in the page body.
  Tool to use: 'getVisibleText'.
  Parameters: {} (No parameters needed for this specific tool as defined)
  
  Generate the precise tool call.`,
    variables: {}
  });

/**
 * Prompt for getting the visible HTML content of the current page.
 */
export const playwrightGetVisibleHtmlPrompt = createPrompt({
  template: `The user wants to get the HTML structure of the current page body.
Objective: Get the HTML content of the page.
Tool to use: 'getVisibleHtml'.
Parameters: {} (No parameters)
  
  Generate the precise tool call.`,
    variables: {}
  });
  
  /**
   * Prompt for listing interactive elements on the page.
   */
  export const playwrightListInteractiveElementsPrompt = createPrompt({
    template: `The user wants to identify all interactive elements currently visible on the page.
  Objective: List all buttons, links, inputs, selects, and textareas.
  Tool to use: 'listInteractiveElements'.
  Parameters: {} (No parameters needed for this specific tool as defined)
  
  The result should be a list of elements with their tag, text, and attributes.
  Generate the precise tool call.`,
    variables: {}
  });

/**
 * Prompt for getting the current user agent.
 */
export const playwrightGetUserAgentPrompt = createPrompt({
  template: `The user wants to get the current user agent string of the browser.
Objective: Retrieve the browser's user agent.
Tool to use: 'getUserAgent'.
Parameters: {} (No parameters)

  Generate the precise tool call.`,
    variables: {}
  });
  
  /**
   * Prompt for asserting that an element is visible.
   * (This is a conceptual prompt; the actual assertion logic would be in a tool like 'assertElementVisible' if you create one,
   * or the LLM could use 'getText' or 'listInteractiveElements' and then reason about visibility based on the output.)
   * For now, we'll assume the LLM uses existing tools to infer visibility.
   * If you build an 'assertElementVisible' tool, this prompt would be more direct.
   */
  export const playwrightAssertElementVisiblePrompt = createPrompt({
    template: `The user wants to verify that a specific element is visible on the page.
  Objective: Confirm that the element '{{selector}}' is currently visible.
  Context: {{elementContextDescription}}
  Strategy:
  1. Attempt to get text from the element '{{selector}}' using 'getText'.
  2. If text is returned and non-empty, the element is likely visible and interactable.
  3. Alternatively, use 'listInteractiveElements' and check if an element matching '{{selector}}' is present.
  4. If 'waitForElement' with state 'visible' was successful for '{{selector}}', that also implies visibility.
  
  Based on the above, and the current page state, is the element '{{selector}}' visible? If unsure, what tool call would help confirm it?`,
    variables: {
      selector: "span.confirmation-message",
      elementContextDescription: "The success message that appears after form submission."
    }
  });
  
  /**
   * Prompt for saving content to a file (generic, could be HTML, text, etc.).
   */
  export const playwrightSaveToFilePrompt = createPrompt({
    template: `The user wants to save some content to a file.
  Objective: Save the provided '{{contentToSave}}' to a file named '{{filePath}}'.
  Parameters:
  - content: (The actual content to save - this will be provided by the agent's previous steps)
  - filePath: '{{filePath}}'
  - overwrite: {{overwrite}} (boolean, whether to overwrite existing file)
  - timeout: {{timeout}} (in milliseconds)
  
  Assuming the content is available, generate the precise tool call.
  The agent must determine the 'content' based on previous actions (e.g., from 'getVisibleHtml' or 'getText').`,
    variables: {
      contentToSave: "[Placeholder: content will be determined by a previous agent step, e.g., HTML of the page]",
      filePath: "output/page_content.html",
      overwrite: false,
      timeout: 30000
    }
  });

/**
 * Prompt for exporting the current page as a PDF.
 */
export const playwrightExportToPdfPrompt = createPrompt({
  template: `The user wants to export the current page content to a PDF file.
Objective: Create a PDF of the current page.
Parameters:
- filename: '{{filename}}' (The path where the PDF file will be saved)
- format: '{{format}}' (e.g., 'A4', 'Letter', 'Legal')
- printBackground: {{printBackground}} (boolean, whether to print background graphics)
- timeout: {{timeout}} (in milliseconds)

Generate the precise tool call.`,
  variables: {
    filename: "output/report.pdf",
    format: "A4",
    printBackground: true,
    timeout: 60000
  }
});
  
  /**
   * Prompt for extracting data using a schema.
   * This leverages the 'extractData' tool which expects a schema.
   */
  export const playwrightExtractDataPrompt = createPrompt({
    template: `The user wants to extract structured data from the page '{{pageUrl}}'.
  Objective: Extract data matching the following structure: {{dataSchemaDescription}}.
  Tool to use: 'extractData'.
  Parameters:
  - selectors: An object where keys are data field names and values are CSS selectors.
  - includeHtml: {{includeHtml}} (boolean, whether to include HTML content for each selector)
  - schema: A Zod schema definition representing the desired output structure. (This will be passed programmatically to the tool, you just need to signal the intent to use it with the provided selectors)
  - selector: '{{containerSelector}}' (Optional: CSS selector for the container element to extract from)
  
  Based on the objective and the desired structure, formulate the 'selectors' parameter for the 'extractData' tool.
  Example selectors parameter: { "productName": "h1.product-title", "price": ".price-tag > span" }
  The schema {{dataSchemaDescription}} will be handled by the calling code.
  Focus on constructing the selectors part of the tool call.
  Generate the selectors object for the tool call.`,
    variables: {
      pageUrl: "current page",
      dataSchemaDescription: "{ productName: string, price: number }", // Describe the Zod schema
      includeHtml: false,
      containerSelector: ""
    }
  });
  
  
  // Update the exported collection
  export const playwrightPrompts = {
    base: playwrightAgentBasePrompt,
    navigate: playwrightNavigatePrompt,
    goBack: playwrightGoBackPrompt,
    goForward: playwrightGoForwardPrompt,
    refreshPage: playwrightRefreshPagePrompt,
    closeBrowser: playwrightCloseBrowserPrompt,
    clickElement: playwrightClickElementPrompt,
    typeText: playwrightTypeTextPrompt,
    getText: playwrightGetTextPrompt,
    selectOption: playwrightSelectOptionPrompt,
    check: playwrightCheckPrompt,
    uncheck: playwrightUncheckPrompt,
    hover: playwrightHoverPrompt,
    pressKey: playwrightPressKeyPrompt,
    takeScreenshot: playwrightTakeScreenshotPrompt,
    waitForElement: playwrightWaitForElementPrompt,
    expectResponse: playwrightExpectResponsePrompt,
    assertResponse: playwrightAssertResponsePrompt,
    getVisiblePageText: playwrightGetVisiblePageTextPrompt,
    getVisibleHtml: playwrightGetVisibleHtmlPrompt,
    listInteractiveElements: playwrightListInteractiveElementsPrompt,
    getUserAgent: playwrightGetUserAgentPrompt,
    assertElementVisible: playwrightAssertElementVisiblePrompt, // Added (conceptual)
    saveToFile: playwrightSaveToFilePrompt,
    exportToPdf: playwrightExportToPdfPrompt,
    extractData: playwrightExtractDataPrompt,
  };
// Example of how you might use this in your agent logic:
// const agentInstruction = playwrightPrompts.base({
//   userTaskDescription: "Log into the website and navigate to the dashboard.",
//   currentPageUrl: "https://example.com/login",
//   playwrightToolNames: "navigate, click, typeText, getText, waitForElement, takeScreenshot"
// });
// Now, 'agentInstruction' would be the system prompt or part of the input to your LLM.