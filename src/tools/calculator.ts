/* eslint-disable sonarjs/cognitive-complexity */
/**
 * Mathematical calculation tool
 * Provides precise mathematical operations with error handling
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";

/**
 * Schema for mathematical operations and algorithms
 */
const calculatorSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide", "power", "sqrt", "factorial", "fibonacci", "isPrime"])
    .describe("The mathematical operation or algorithm to perform"),
  a: z.number().optional().describe("The first number, or the input for algorithm operations"),
  b: z.number().optional().describe("The second number (required for binary operations)"),
  limit: z.number().optional().describe("For Fibonacci, the maximum number of terms to generate"),
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
 * Generate Fibonacci sequence up to a limit
 */
const fibonacciSequence = (limit: number): number[] => {
  if (limit < 0) return [];
  if (limit === 0) return [0];
  if (limit === 1) return [0, 1];

  const sequence = [0, 1];
  let a = 0;
  let b = 1;
  while (sequence.length < limit) {
    const next = a + b;
    if (next > Number.MAX_SAFE_INTEGER) throw new Error("Fibonacci number too large");
    sequence.push(next);
    a = b;
    b = next;
  }
  return sequence;
};

/**
 * Check if a number is prime
 */
const isPrimeNumber = (num: number): boolean => {
  if (num <= 1) return false; // 0 and 1 are not prime numbers
  if (num <= 3) return true; // 2 and 3 are prime numbers
  if (num % 2 === 0 || num % 3 === 0) return false; // Divisible by 2 or 3
  
  for (let i = 5; i * i <= num; i = i + 6) {
    if (num % i === 0 || num % (i + 2) === 0) {
      return false;
    }
  }
  return true;
};

/**
 * Mathematical calculator and algorithm tool implementation
 */
export const calculatorTool = createTool({
  name: "calculator",
  description: "Perform mathematical calculations including basic arithmetic, power, square root, factorial, Fibonacci sequence generation, and prime number checking. Returns precise numerical or algorithmic results.",
  parameters: calculatorSchema,
  execute: async ({ operation, a, b, limit }: CalculatorInput) => {
    try {
      logger.debug("Executing calculator operation/algorithm", { operation, a, b, limit });

      let result: number | number[] | boolean;

      switch (operation) {
        case "add":
          if (a === undefined || b === undefined) throw new Error("Both numbers 'a' and 'b' are required for addition");
          result = a + b;
          break;

        case "subtract":
          if (a === undefined || b === undefined) throw new Error("Both numbers 'a' and 'b' are required for subtraction");
          result = a - b;
          break;

        case "multiply":
          if (a === undefined || b === undefined) throw new Error("Both numbers 'a' and 'b' are required for multiplication");
          result = a * b;
          break;

        case "divide":
          if (a === undefined || b === undefined) throw new Error("Both numbers 'a' and 'b' are required for division");
          if (b === 0) throw new Error("Division by zero is not allowed");
          result = a / b;
          break;

        case "power":
          if (a === undefined || b === undefined) throw new Error("Base 'a' and exponent 'b' are required for power operation");
          result = Math.pow(a, b);
          if (!isFinite(result)) throw new Error("Power operation resulted in infinite value");
          break;

        case "sqrt":
          if (a === undefined) throw new Error("Number 'a' is required for square root operation");
          if (a < 0) throw new Error("Square root of negative number is not supported");
          result = Math.sqrt(a);
          break;

        case "factorial":
          if (a === undefined || !Number.isInteger(a)) throw new Error("Factorial requires an integer input 'a'");
          result = factorial(a);
          break;

        case "fibonacci":
          if (limit === undefined) throw new Error("Limit is required for Fibonacci sequence generation");
          if (!Number.isInteger(limit) || limit < 0) throw new Error("Fibonacci limit must be a non-negative integer");
          result = fibonacciSequence(limit);
          break;
        
        case "isPrime":
          if (a === undefined || !Number.isInteger(a) || a < 0) throw new Error("isPrime requires a non-negative integer input 'a'");
          result = isPrimeNumber(a);
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      logger.info("Calculator operation/algorithm completed", { operation, a, b, limit, result });

      // Format the result for display
      let formattedResult: string;
      if (typeof result === 'object') {
        formattedResult = JSON.stringify(result);
      } else {
        const inputParts: string[] = [];
        if (a !== undefined) inputParts.push(String(a));
        if (b !== undefined) inputParts.push(String(b));
        if (limit !== undefined) inputParts.push(`limit=${limit}`);
        const inputsString = inputParts.join(', ');
        formattedResult = `${operation}(${inputsString}) = ${result}`;
      }

      return {
        operation,
        inputs: { a, b, limit },
        result,
        formatted: formattedResult
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown calculation/algorithm error";
      logger.error("Calculator operation/algorithm failed", error);
      
      throw new Error(`Calculation/Algorithm failed: ${errorMessage}`);
    }
  },
});

/**
 * Statistics Analysis Tool
 * Provides statistical operations: mean, median, mode, standard deviation.
 */
const statisticsAnalysisSchema = z.object({
  numbers: z.array(z.number()).min(1).describe("An array of numbers for statistical analysis"),
  operation: z.enum(["mean", "median", "mode", "standard_deviation", "all"]).default("all").describe("The statistical operation to perform"),
});

type StatisticsAnalysisInput = z.infer<typeof statisticsAnalysisSchema>;

const calculateMean = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
};

const calculateMedian = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sortedNumbers.length / 2);
  
  if (sortedNumbers.length % 2 === 0) {
    // Even number of elements - safely access array indices
    const leftIndex = mid - 1;
    const rightIndex = mid;
    if (leftIndex >= 0 && rightIndex < sortedNumbers.length) {
      const leftValue = sortedNumbers.at(leftIndex);
      const rightValue = sortedNumbers.at(rightIndex);
      if (leftValue !== undefined && rightValue !== undefined) {
        return (leftValue + rightValue) / 2;
      }
    }
    return 0; // Fallback for edge case
  } else {
    // Odd number of elements - safely access middle element
    if (mid >= 0 && mid < sortedNumbers.length) {
      const midValue = sortedNumbers.at(mid);
      return midValue !== undefined ? midValue : 0;
    }
    return 0; // Fallback for edge case
  }
};

const calculateMode = (numbers: number[]): number[] => {
  if (numbers.length === 0) return [];
  const frequencyMap = new Map<number, number>();
  numbers.forEach(num => {
    frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
  });

  let maxFrequency = 0;
  for (const [, frequency] of frequencyMap) {
    if (frequency > maxFrequency) {
      maxFrequency = frequency;
    }
  }

  const modes: number[] = [];
  for (const [num, frequency] of frequencyMap) {
    if (frequency === maxFrequency) {
      modes.push(num);
    }
  }
  return modes;
};

const calculateStandardDeviation = (numbers: number[]): number => {
  if (numbers.length < 2) return 0; // Standard deviation requires at least 2 numbers
  const mean = calculateMean(numbers);
  const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
  const sumOfSquaredDifferences = squaredDifferences.reduce((acc, val) => acc + val, 0);
  return Math.sqrt(sumOfSquaredDifferences / (numbers.length - 1)); // Sample standard deviation
};

export const statisticsAnalysisTool = createTool({
  name: "statistics_analysis",
  description: "Performs statistical analysis on a given set of numbers, including mean, median, mode, and standard deviation.",
  parameters: statisticsAnalysisSchema,
  execute: async ({ numbers, operation }: StatisticsAnalysisInput) => {
    logger.debug("[statisticsAnalysisTool] Executing statistics operation", { operation, numbers });

    const results: any = {};

    if (operation === "mean" || operation === "all") {
      results.mean = calculateMean(numbers);
    }
    if (operation === "median" || operation === "all") {
      results.median = calculateMedian(numbers);
    }
    if (operation === "mode" || operation === "all") {
      results.mode = calculateMode(numbers);
    }
    if (operation === "standard_deviation" || operation === "all") {
      results.standardDeviation = calculateStandardDeviation(numbers);
    }

    logger.info("[statisticsAnalysisTool] Statistics operation completed", { operation, results });
    return {
      operation,
      numbers,
      results,
      timestamp: new Date().toISOString(),
    };
  },
});
