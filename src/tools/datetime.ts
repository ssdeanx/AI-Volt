/**
 * Date and time utility tool
 * Provides comprehensive date/time operations and formatting
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";

/**
 * Schema for date/time operations
 */
const dateTimeSchema = z.object({
  operation: z.enum([
    "current_datetime",
    "format_date",
    "add_time",
    "subtract_time",
    "time_difference",
    "timezone_convert"
  ]).describe("The date/time operation to perform"),
  
  date: z.string().optional().describe("ISO date string (YYYY-MM-DD or full ISO format)"),
  format: z.string().optional().describe("Output format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY', 'full')"),
  amount: z.number().optional().describe("Amount to add/subtract"),
  unit: z.enum(["minutes", "hours", "days", "weeks", "months", "years"]).optional()
    .describe("Time unit for add/subtract operations"),
  timezone: z.string().optional().describe("Target timezone (e.g., 'UTC', 'America/New_York')"),
  date2: z.string().optional().describe("Second date for comparison operations"),
});

type DateTimeInput = z.infer<typeof dateTimeSchema>;

/**
 * Format date according to specified format
 */
const formatDate = (date: Date, format: string): string => {
  const pad = (n: number): string => n.toString().padStart(2, '0');
  
  switch (format.toLowerCase()) {
    case 'yyyy-mm-dd':
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    case 'mm/dd/yyyy':
      return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
    case 'dd/mm/yyyy':
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    case 'full':
      return date.toLocaleString();
    case 'iso':
      return date.toISOString();
    case 'time':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    default:
      return date.toLocaleString();
  }
};

/**
 * Add/subtract time from a date
 */
const modifyDate = (date: Date, amount: number, unit: string): Date => {
  const newDate = new Date(date);
  
  switch (unit) {
    case 'minutes':
      newDate.setMinutes(newDate.getMinutes() + amount);
      break;
    case 'hours':
      newDate.setHours(newDate.getHours() + amount);
      break;
    case 'days':
      newDate.setDate(newDate.getDate() + amount);
      break;
    case 'weeks':
      newDate.setDate(newDate.getDate() + (amount * 7));
      break;
    case 'months':
      newDate.setMonth(newDate.getMonth() + amount);
      break;
    case 'years':
      newDate.setFullYear(newDate.getFullYear() + amount);
      break;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
  
  return newDate;
};

/**
 * Date and time utility tool implementation
 */
export const dateTimeTool = createTool({
  name: "datetime",
  description: "Perform date and time operations including getting current time, formatting dates, adding/subtracting time, calculating differences, and timezone conversions.",
  parameters: dateTimeSchema,
  execute: async ({ operation, date, format, amount, unit, timezone, date2 }: DateTimeInput) => {
    try {
      logger.debug("Executing datetime operation", { operation, date, format, amount, unit, timezone });

      let result: any;
      let currentDate = new Date();

      switch (operation) {
        case "current_datetime":
          result = {
            iso: currentDate.toISOString(),
            formatted: formatDate(currentDate, format || 'full'),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: currentDate.getTime()
          };
          break;

        case "format_date":
          if (!date) throw new Error("Date is required for formatting");
          const parseDate = new Date(date);
          if (isNaN(parseDate.getTime())) throw new Error("Invalid date format");
          
          result = {
            original: date,
            formatted: formatDate(parseDate, format || 'full'),
            iso: parseDate.toISOString()
          };
          break;

        case "add_time":
          if (!date) throw new Error("Date is required for time addition");
          if (amount === undefined) throw new Error("Amount is required for time addition");
          if (!unit) throw new Error("Unit is required for time addition");
          
          const baseDate = new Date(date);
          if (isNaN(baseDate.getTime())) throw new Error("Invalid date format");
          
          const newDate = modifyDate(baseDate, amount, unit);
          result = {
            original: date,
            modified: newDate.toISOString(),
            formatted: formatDate(newDate, format || 'full'),
            operation: `+${amount} ${unit}`
          };
          break;

        case "subtract_time":
          if (!date) throw new Error("Date is required for time subtraction");
          if (amount === undefined) throw new Error("Amount is required for time subtraction");
          if (!unit) throw new Error("Unit is required for time subtraction");
          
          const baseDateSub = new Date(date);
          if (isNaN(baseDateSub.getTime())) throw new Error("Invalid date format");
          
          const newDateSub = modifyDate(baseDateSub, -amount, unit);
          result = {
            original: date,
            modified: newDateSub.toISOString(),
            formatted: formatDate(newDateSub, format || 'full'),
            operation: `-${amount} ${unit}`
          };
          break;

        case "time_difference":
          if (!date || !date2) throw new Error("Two dates are required for time difference");
          
          const date1Obj = new Date(date);
          const date2Obj = new Date(date2);
          
          if (isNaN(date1Obj.getTime()) || isNaN(date2Obj.getTime())) {
            throw new Error("Invalid date format in one or both dates");
          }
          
          const diffMs = Math.abs(date2Obj.getTime() - date1Obj.getTime());
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          result = {
            date1: date,
            date2: date2,
            difference: {
              milliseconds: diffMs,
              days: diffDays,
              hours: diffHours,
              minutes: diffMinutes,
              total_hours: Math.floor(diffMs / (1000 * 60 * 60)),
              total_minutes: Math.floor(diffMs / (1000 * 60))
            },
            formatted: `${diffDays} days, ${diffHours} hours, ${diffMinutes} minutes`
          };
          break;

        case "timezone_convert":
          if (!date) throw new Error("Date is required for timezone conversion");
          if (!timezone) throw new Error("Target timezone is required");
          
          const originalDate = new Date(date);
          if (isNaN(originalDate.getTime())) throw new Error("Invalid date format");
          
          try {
            const convertedDate = new Intl.DateTimeFormat('en-US', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).format(originalDate);
            
            result = {
              original: date,
              original_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              target_timezone: timezone,
              converted: convertedDate,
              iso_original: originalDate.toISOString()
            };
          } catch (error) {
            throw new Error(`Invalid timezone: ${timezone}`);
          }
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      logger.info("DateTime operation completed", { operation, result });
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown datetime error";
      logger.error("DateTime operation failed", error);
      
      throw new Error(`DateTime operation failed: ${errorMessage}`);
    }
  },
});
