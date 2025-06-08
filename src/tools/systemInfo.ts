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
const getDiskInfo = async (): Promise<Array<{
  filesystem: string;
  size: string;
  used: string;
  available: string;
  capacity: string;
  mounted_on: string;
}>> => {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === 'win32';
    
    // Define safe, predefined commands - no user input
    const safeCommands = {
      windows: ['wmic', ['logicaldisk', 'get', 'size,freespace,caption']],
      // POSIX df command: -P for POSIX standard output, -k for sizes in 1K blocks
      // This provides a more consistent output format for parsing.
      unix: ['df', ['-Pk']] 
    } as const;
    
    const [command, args] = isWindows ? safeCommands.windows : safeCommands.unix;
    
    // Use spawn instead of exec for better security
    const childProcess = child_process.spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'], // stdin, stdout, stderr
      shell: false, // Explicitly disable shell to prevent injection
      timeout: 10000, // 10 second timeout
    });
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    childProcess.on('error', (error) => {
      logger.error(`Disk info process error: ${error.message}`, { command, args });
      reject(new Error(`Failed to get disk info: ${error.message}`));
    });
    
    childProcess.on('close', (code) => {
      if (code !== 0) {
        logger.error(`Disk info command failed with code ${code}: ${stderr}`, { command, args, stdout });
        reject(new Error(`Failed to get disk info: Command exited with code ${code}. Stderr: ${stderr.slice(0, 200)}`));
        return;
      }
      
      try {
        if (isWindows) {
          // Parse Windows wmic output
          const lines = stdout.trim().split(/\r?\n/).slice(1).filter(line => line.trim());
          const disks = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const caption = parts[0];
              const freeSpaceBytes = parseInt(parts[1]) || 0;
              const sizeBytes = parseInt(parts[2]) || 0;
              const usedBytes = sizeBytes - freeSpaceBytes;
              const usagePercent = sizeBytes > 0 ? ((usedBytes / sizeBytes) * 100).toFixed(1) + '%' : '0%';
              
              return {
                filesystem: caption,
                size: formatBytesToString(sizeBytes),
                used: formatBytesToString(usedBytes),
                available: formatBytesToString(freeSpaceBytes),
                capacity: usagePercent,
                mounted_on: caption, // For Windows, caption is usually the drive letter (e.g., C:)
              };
            }
            return null;
          }).filter(Boolean) as Array<{ filesystem: string; size: string; used: string; available: string; capacity: string; mounted_on: string; }>;
          resolve(disks);
        } else {
          // Parse Unix df -Pk output (POSIX standard, sizes in 1K blocks)
          // Filesystem 1024-blocks Used Available Capacity Mounted on
          // /dev/sda1    10307920 4021800 5757708      42% /
          const lines = stdout.trim().split('\n').slice(1); // Skip header
          const disks = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 6) {
              const sizeKB = parseInt(parts[1]) || 0;
              const usedKB = parseInt(parts[2]) || 0;
              const availableKB = parseInt(parts[3]) || 0;
              
              return {
                filesystem: parts[0],
                size: formatBytesToString(sizeKB * 1024),
                used: formatBytesToString(usedKB * 1024),
                available: formatBytesToString(availableKB * 1024),
                capacity: parts[4], // Already a percentage string
                mounted_on: parts[5],
              };
            }
            return null;
          }).filter(Boolean) as Array<{ filesystem: string; size: string; used: string; available: string; capacity: string; mounted_on: string; }>;
          resolve(disks);
        }
      } catch (parseError) {
        logger.error(`Failed to parse disk info output: ${parseError}`, { stdout });
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

        default: {
          // This should be caught by Zod, but as a safeguard:
          const exhaustiveCheck: never = category;
          throw new Error(`Unknown category: ${exhaustiveCheck}`);
        }
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
      envVars[key] = String(value); // Ensure value is string
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
        default: {
          // This should be caught by Zod, but as a safeguard:
          const exhaustiveCheck: never = category;
          throw new Error(`Unknown category: ${exhaustiveCheck}`);
        }
      }

      logger.info("[codeExecutionEnvironmentAnalysisTool] Environment analysis completed", { category, result });
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown environment analysis error";
      logger.error("[codeExecutionEnvironmentAnalysisTool] Environment analysis failed", { category, error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
      // Re-throw the original error or a new error with more context
      throw new Error(`Environment analysis failed for category '${category}': ${errorMessage}`);
    }
  },
});
