/* eslint-disable security/detect-child-process */
/* eslint-disable security/detect-object-injection */
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
import * as child_process from "child_process";

/**
 * Helper function to safely format bytes to human readable format
 */
const formatBytesToString = (bytes: number): string => {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb > 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
};

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
    "environment",
    "disk",
    "users",
    "os_details"
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
  const result: Record<string, Array<{
    address: string;
    family: string | number;
    internal: boolean;
    netmask: string;
  }>> = {};
  
  if (!interfaces) {
    return result;
  }

  // Safe iteration avoiding object injection
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (addresses && Array.isArray(addresses)) {
      result[name] = addresses.map(addr => ({
        address: String(addr.address || ''),
        family: addr.family || '',
        internal: Boolean(addr.internal),
        netmask: String(addr.netmask || '')
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
 * Get disk usage information
 */
const getDiskInfo = async () => {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === 'win32';
    const command = isWindows ? 'wmic logicaldisk get size,freespace,caption' : 'df -h';
    child_process.exec(command, (error, stdout, stderr) => { // eslint-disable-line security/detect-child-process
      if (error) {
        logger.error(`Disk info error: ${error.message}`);
        reject(new Error(`Failed to get disk info: ${stderr || error.message}`));
        return;
      }
      
      try {
        if (isWindows) {
          // Parse Windows wmic output
          const lines = stdout.trim().split('\n').slice(1).filter(line => line.trim());
          const disks = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const caption = parts[0];
              const freeSpace = parseInt(parts[1]) || 0;
              const size = parseInt(parts[2]) || 0;
              const used = size - freeSpace;
              const usagePercent = size > 0 ? ((used / size) * 100).toFixed(1) + '%' : '0%';
              
              return {
                filesystem: caption,
                size: formatBytesToString(size),
                used: formatBytesToString(used),
                available: formatBytesToString(freeSpace),
                capacity: usagePercent,
                mounted_on: caption,
              };
            }
            return null;
          }).filter(Boolean);
          resolve(disks);
        } else {
          // Parse Unix df output
          const lines = stdout.trim().split('\n').slice(1);
          const disks = lines.map(line => {
            const parts = line.split(/\s+/);
            return {
              filesystem: parts[0],
              size: parts[1],
              used: parts[2],
              available: parts[3],
              capacity: parts[4],
              mounted_on: parts[5],
            };
          });
          resolve(disks);
        }
      } catch (parseError) {
        logger.error(`Failed to parse disk info output: ${parseError}`);
        reject(new Error(`Failed to parse disk info: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
      }
    });
  });
};

/**
 * Get user information
 */
const getUserInfo = () => {
  return {
    username: os.userInfo().username,
    uid: os.userInfo().uid,
    gid: os.userInfo().gid,
    homedir: os.userInfo().homedir,
    shell: os.userInfo().shell,
  };
};

/**
 * Get detailed OS information
 */
const getOsDetails = () => {
  return {
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    endianness: os.endianness(),
    hostname: os.hostname(),
    arch: os.arch(),
    version: os.version(),
  };
};

/**
 * System information tool implementation
 */
export const systemInfoTool = createTool({
  name: "system_info",
  description: "Retrieve comprehensive system information including memory usage, CPU details, network interfaces, process information, environment settings, disk usage, user details, and detailed OS information. Useful for monitoring and diagnostics.",
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
            environment: getEnvironmentInfo(),
            disk: await getDiskInfo(),
            users: getUserInfo(),
            os_details: getOsDetails(),
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

        case "disk":
          result = await getDiskInfo();
          break;

        case "users":
          result = getUserInfo();
          break;

        case "os_details":
          result = getOsDetails();
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

/**
 * Code Execution Environment Analysis Tool
 * Provides detailed insights into the environment where code is executed.
 */
const codeExecutionEnvironmentSchema = z.object({
  category: z.enum(["all", "runtime_versions", "environment_variables", "resource_limits"]).default("all").describe("Category of execution environment information to retrieve"),
});

type CodeExecutionEnvironmentInput = z.infer<typeof codeExecutionEnvironmentSchema>;

const getRuntimeVersions = () => {
  return {
    node: process.version,
    v8: process.versions.v8,
    openssl: process.versions.openssl,
    zlib: process.versions.zlib,
    uv: process.versions.uv,
  };
};

const getFilteredEnvironmentVariables = () => {
  const relevantEnvVars = [
    "NODE_ENV", "PATH", "HOME", "TEMP", "TMPDIR", "NODE_OPTIONS", "PORT", "LOG_LEVEL",
    "LANG", "SHELL", "TERM", "USER", "USERNAME", "PWD", "OLDPWD",
    "VIRTUAL_ENV", // For Python virtual environments if applicable
  ];
  const envVars: Record<string, string | undefined> = {};
  
  // Safe iteration to avoid object injection
  for (const key of relevantEnvVars) {
    const value = process.env[key];
    if (value !== undefined) {
      envVars[key] = String(value);
    }
  }
  return envVars;
};

const getResourceLimits = () => {
  const memoryInfo = getMemoryInfo(); // Re-use existing function for consistency
  const cpuInfo = getCpuInfo(); // Re-use existing function for consistency
  return {
    total_memory: memoryInfo.total,
    free_memory: memoryInfo.free,
    process_heap_total: memoryInfo.process_memory.heap_total,
    cpu_cores: cpuInfo.cores,
    cpu_architecture: cpuInfo.architecture,
  };
};

export const codeExecutionEnvironmentAnalysisTool = createTool({
  name: "code_execution_environment_analysis",
  description: "Analyzes the current code execution environment, providing details on runtime versions, relevant environment variables, and system resource limits.",
  parameters: codeExecutionEnvironmentSchema,
  execute: async ({ category }: CodeExecutionEnvironmentInput) => {
    try {
      logger.debug("[codeExecutionEnvironmentAnalysisTool] Executing environment analysis", { category });
      let result: any = {};

      switch (category) {
        case "all":
          result = {
            runtime_versions: getRuntimeVersions(),
            environment_variables: getFilteredEnvironmentVariables(),
            resource_limits: getResourceLimits(),
          };
          break;
        case "runtime_versions":
          result = getRuntimeVersions();
          break;
        case "environment_variables":
          result = getFilteredEnvironmentVariables();
          break;
        case "resource_limits":
          result = getResourceLimits();
          break;
        default:
          throw new Error(`Unknown category: ${category}`);
      }

      logger.info("[codeExecutionEnvironmentAnalysisTool] Environment analysis completed", { category, result });
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown environment analysis error";
      logger.error("[codeExecutionEnvironmentAnalysisTool] Environment analysis failed", error);
      throw new Error(`Environment analysis failed: ${errorMessage}`);
    }
  },
});
