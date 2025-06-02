/**
 * System information tool
 * Provides comprehensive system and runtime information
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import { env } from "../config/environment.js";
import * as os from "os";
import * as process from "process";

/**
 * Schema for system information requests
 */
const systemInfoSchema = z.object({
  category: z.enum([
    "all",
    "basic",
    "memory",
    "cpu",
    "network",
    "process",
    "environment"
  ]).describe("Category of system information to retrieve"),
});

type SystemInfoInput = z.infer<typeof systemInfoSchema>;

/**
 * Get memory information in a readable format
 */
const getMemoryInfo = () => {
  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  return {
    total: formatBytes(os.totalmem()),
    free: formatBytes(os.freemem()),
    used: formatBytes(os.totalmem() - os.freemem()),
    usage_percentage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2) + "%",
    process_memory: {
      rss: formatBytes(process.memoryUsage().rss),
      heap_total: formatBytes(process.memoryUsage().heapTotal),
      heap_used: formatBytes(process.memoryUsage().heapUsed),
      external: formatBytes(process.memoryUsage().external),
    }
  };
};

/**
 * Get CPU information
 */
const getCpuInfo = () => {
  const cpus = os.cpus();
  return {
    model: cpus[0]?.model || "Unknown",
    cores: cpus.length,
    architecture: os.arch(),
    speed: cpus[0]?.speed ? `${cpus[0].speed} MHz` : "Unknown",
    load_average: os.loadavg()
  };
};

/**
 * Get network interfaces information
 */
const getNetworkInfo = () => {
  const interfaces = os.networkInterfaces();
  const result: Record<string, any> = {};
  
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (addresses) {
      result[name] = addresses.map(addr => ({
        address: addr.address,
        family: addr.family,
        internal: addr.internal,
        netmask: addr.netmask
      }));
    }
  }
  
  return result;
};

/**
 * Get process information
 */
const getProcessInfo = () => {
  return {
    pid: process.pid,
    ppid: process.ppid,
    platform: process.platform,
    node_version: process.version,
    uptime: process.uptime(),
    uptime_formatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m ${Math.floor(process.uptime() % 60)}s`,
    working_directory: process.cwd(),
    executable_path: process.execPath,
    arguments: process.argv
  };
};

/**
 * Get environment information (safe subset)
 */
const getEnvironmentInfo = () => {
  return {
    node_env: env.NODE_ENV,
    port: env.PORT,
    log_level: env.LOG_LEVEL,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    has_google_ai_key: !!env.GOOGLE_GENERATIVE_AI_API_KEY,
  };
};

/**
 * System information tool implementation
 */
export const systemInfoTool = createTool({
  name: "system_info",
  description: "Retrieve comprehensive system information including memory usage, CPU details, network interfaces, process information, and environment settings. Useful for monitoring and diagnostics.",
  parameters: systemInfoSchema,
  execute: async ({ category }: SystemInfoInput) => {
    try {
      logger.debug("Retrieving system information", { category });

      let result: any = {};

      switch (category) {
        case "all":
          result = {
            basic: {
              hostname: os.hostname(),
              platform: os.platform(),
              type: os.type(),
              release: os.release(),
              uptime: os.uptime(),
              uptime_formatted: `${Math.floor(os.uptime() / 86400)}d ${Math.floor((os.uptime() % 86400) / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
              home_directory: os.homedir(),
              temp_directory: os.tmpdir()
            },
            memory: getMemoryInfo(),
            cpu: getCpuInfo(),
            network: getNetworkInfo(),
            process: getProcessInfo(),
            environment: getEnvironmentInfo()
          };
          break;

        case "basic":
          result = {
            hostname: os.hostname(),
            platform: os.platform(),
            type: os.type(),
            release: os.release(),
            uptime: os.uptime(),
            uptime_formatted: `${Math.floor(os.uptime() / 86400)}d ${Math.floor((os.uptime() % 86400) / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
            home_directory: os.homedir(),
            temp_directory: os.tmpdir()
          };
          break;

        case "memory":
          result = getMemoryInfo();
          break;

        case "cpu":
          result = getCpuInfo();
          break;

        case "network":
          result = getNetworkInfo();
          break;

        case "process":
          result = getProcessInfo();
          break;

        case "environment":
          result = getEnvironmentInfo();
          break;

        default:
          throw new Error(`Unknown category: ${category}`);
      }

      logger.info("System information retrieved", { category });
      return {
        category,
        timestamp: new Date().toISOString(),
        data: result
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown system info error";
      logger.error("System info operation failed", error);
      
      throw new Error(`System info operation failed: ${errorMessage}`);
    }
  },
});
