/**
 * Mathematical calculation tool
 * Provides precise mathematical operations with error handling
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";

/**
 * Schema for mathematical operations
 */
const calculatorSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide", "power", "sqrt", "factorial"])
    .describe("The mathematical operation to perform"),
  a: z.number().describe("The first number"),
  b: z.number().optional().describe("The second number (required for binary operations)"),
});

type CalculatorInput = z.infer<typeof calculatorSchema>;

/**
 * Calculate factorial of a number
 */
const factorial = (n: number): number => {
  if (n < 0) throw new Error("Factorial is not defined for negative numbers");
  if (n === 0 || n === 1) return 1;
  if (n > 170) throw new Error("Factorial result too large for JavaScript number precision");
  
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
};

/**
 * Mathematical calculator tool implementation
 */
export const calculatorTool = createTool({
  name: "calculator",
  description: "Perform mathematical calculations including basic arithmetic, power, square root, and factorial operations. Returns precise numerical results.",
  parameters: calculatorSchema,
  execute: async ({ operation, a, b }: CalculatorInput) => {
    try {
      logger.debug("Executing calculator operation", { operation, a, b });

      let result: number;

      switch (operation) {
        case "add":
          if (b === undefined) throw new Error("Second number required for addition");
          result = a + b;
          break;

        case "subtract":
          if (b === undefined) throw new Error("Second number required for subtraction");
          result = a - b;
          break;

        case "multiply":
          if (b === undefined) throw new Error("Second number required for multiplication");
          result = a * b;
          break;

        case "divide":
          if (b === undefined) throw new Error("Second number required for division");
          if (b === 0) throw new Error("Division by zero is not allowed");
          result = a / b;
          break;

        case "power":
          if (b === undefined) throw new Error("Exponent required for power operation");
          result = Math.pow(a, b);
          if (!isFinite(result)) throw new Error("Power operation resulted in infinite value");
          break;

        case "sqrt":
          if (a < 0) throw new Error("Square root of negative number is not supported");
          result = Math.sqrt(a);
          break;

        case "factorial":
          if (!Number.isInteger(a)) throw new Error("Factorial requires an integer");
          result = factorial(a);
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      logger.info("Calculator operation completed", { operation, a, b, result });

      return {
        operation,
        operands: b !== undefined ? [a, b] : [a],
        result,
        formatted: `${operation}(${b !== undefined ? `${a}, ${b}` : a}) = ${result}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown calculation error";
      logger.error("Calculator operation failed", error);
      
      throw new Error(`Calculation failed: ${errorMessage}`);
    }
  },
});
