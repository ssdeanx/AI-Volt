/**
 * Date and time utility tool
 * Provides comprehensive date/time operations and formatting
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

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
  targetUnit: z.enum(["milliseconds", "seconds", "minutes", "hours", "days", "weeks", "months", "years"]).optional().describe("Unit for time difference output"),
});

type DateTimeInput = z.infer<typeof dateTimeSchema>;

/**
 * Format date according to specified format using dayjs
 */
const formatDate = (date: dayjs.Dayjs, format: string): string => {
  switch (format.toLowerCase()) {
    case 'yyyy-mm-dd':
      return date.format('YYYY-MM-DD');
    case 'mm/dd/yyyy':
      return date.format('MM/DD/YYYY');
    case 'dd/mm/yyyy':
      return date.format('DD/MM/YYYY');
    case 'full':
      return date.format('YYYY-MM-DD HH:mm:ss Z');
    case 'iso':
      return date.toISOString();
    case 'time':
      return date.format('HH:mm:ss');
    default:
      return date.format(format);
  }
};

/**
 * Add/subtract time from a date using dayjs
 */
const modifyDate = (date: dayjs.Dayjs, amount: number, unit: dayjs.ManipulateType): dayjs.Dayjs => {
  return date.add(amount, unit);
};

/**
 * Date and time utility tool implementation
 */
export const dateTimeTool = createTool({
  name: "datetime",
  description: "Perform date and time operations including getting current time, formatting dates, adding/subtracting time, calculating differences, and timezone conversions.",
  parameters: dateTimeSchema,
  execute: async ({ operation, date, format, amount, unit, timezone, date2, targetUnit }: DateTimeInput) => {
    try {
      logger.debug("Executing datetime operation", { operation, date, format, amount, unit, timezone });

      let result: any;
      const currentDate = dayjs();

      switch (operation) {
        case "current_datetime": {
          result = {
            iso: currentDate.toISOString(),
            formatted: formatDate(currentDate, format || 'full'),
            timezone: currentDate.tz().format('Z'), // Get current timezone offset
            timestamp: currentDate.valueOf()
          };
          break;
        }

        case "format_date": {
          if (!date) throw new Error("Date is required for formatting");
          const parseDate = dayjs(date);
          if (!parseDate.isValid()) throw new Error("Invalid date format");
          
          result = {
            original: date,
            formatted: formatDate(parseDate, format || 'full'),
            iso: parseDate.toISOString()
          };
          break;
        }

        case "add_time": {
          if (!date) throw new Error("Date is required for time addition");
          if (amount === undefined) throw new Error("Amount is required for time addition");
          if (!unit) throw new Error("Unit is required for time addition");
          
          const baseDate = dayjs(date);
          if (!baseDate.isValid()) throw new Error("Invalid date format");
          
          const newDate = modifyDate(baseDate, amount, unit);
          result = {
            original: date,
            modified: newDate.toISOString(),
            formatted: formatDate(newDate, format || 'full'),
            operation: `+${amount} ${unit}`
          };
          break;
        }

        case "subtract_time": {
          if (!date) throw new Error("Date is required for time subtraction");
          if (amount === undefined) throw new Error("Amount is required for time subtraction");
          if (!unit) throw new Error("Unit is required for time subtraction");
          
          const baseDateSub = dayjs(date);
          if (!baseDateSub.isValid()) throw new Error("Invalid date format");
          
          const newDateSub = modifyDate(baseDateSub, -amount, unit);
          result = {
            original: date,
            modified: newDateSub.toISOString(),
            formatted: formatDate(newDateSub, format || 'full'),
            operation: `-${amount} ${unit}`
          };
          break;
        }

        case "time_difference": {
          if (!date || !date2) throw new Error("Two dates are required for time difference");
          
          const date1Obj = dayjs(date);
          const date2Obj = dayjs(date2);
          
          if (!date1Obj.isValid() || !date2Obj.isValid()) {
            throw new Error("Invalid date format in one or both dates");
          }
          
          const diffMs = Math.abs(date2Obj.diff(date1Obj, 'millisecond'));

          let differenceValue = diffMs;
          let differenceUnit = "milliseconds";

          if (targetUnit) {
            differenceValue = Math.abs(date2Obj.diff(date1Obj, targetUnit));
            differenceUnit = targetUnit;
          } else if (diffMs >= 1000 * 60 * 60 * 24 * 365) {
            differenceValue = Math.abs(date2Obj.diff(date1Obj, 'year'));
            differenceUnit = "years";
          } else if (diffMs >= 1000 * 60 * 60 * 24 * 30) {
            differenceValue = Math.abs(date2Obj.diff(date1Obj, 'month'));
            differenceUnit = "months";
          } else if (diffMs >= 1000 * 60 * 60 * 24 * 7) {
            differenceValue = Math.abs(date2Obj.diff(date1Obj, 'week'));
            differenceUnit = "weeks";
          } else if (diffMs >= 1000 * 60 * 60 * 24) {
            differenceValue = Math.abs(date2Obj.diff(date1Obj, 'day'));
            differenceUnit = "days";
          } else if (diffMs >= 1000 * 60 * 60) {
            differenceValue = Math.abs(date2Obj.diff(date1Obj, 'hour'));
            differenceUnit = "hours";
          } else if (diffMs >= 1000 * 60) {
            differenceValue = Math.abs(date2Obj.diff(date1Obj, 'minute'));
            differenceUnit = "minutes";
          } else if (diffMs >= 1000) {
            differenceValue = Math.abs(date2Obj.diff(date1Obj, 'second'));
            differenceUnit = "seconds";
          }
          
          result = {
            date1: date,
            date2: date2,
            difference: {
              value: differenceValue,
              unit: differenceUnit,
              milliseconds: diffMs,
              // Re-add more specific differences if needed for backward compatibility
            },
            formatted: `${differenceValue} ${differenceUnit}`
          };
          break;
        }

        case "timezone_convert": {
          if (!date) throw new Error("Date is required for timezone conversion");
          if (!timezone) throw new Error("Target timezone is required");
          
          const originalDate = dayjs(date);
          if (!originalDate.isValid()) throw new Error("Invalid date format");
          
          try {
            const convertedDate = originalDate.tz(timezone);
            
            result = {
              original: date,
              original_timezone: originalDate.tz().format('Z'),
              target_timezone: timezone,
              converted: convertedDate.toISOString(),
              formatted_converted: formatDate(convertedDate, format || 'full'),
              iso_original: originalDate.toISOString()
            };
          } catch (error) {
            throw new Error(`Invalid timezone: ${timezone}`);
          }
          break;
        }

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
