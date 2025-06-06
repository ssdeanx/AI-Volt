/**
 * Cloud Tools
 * Provides capabilities for interacting with cloud services (simulated implementations).
 */

import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import * as shell from 'shelljs';

/**
 * Deploy Service Tool
 * Deploys a Docker container locally, simulating service deployment.
 */
export const deployServiceTool = createTool({
  name: "deploy_service",
  description: "Deploys a Docker container locally with specified parameters, simulating service deployment. Requires Docker to be running.",
  parameters: z.object({
    imageName: z.string().describe("The Docker image name to deploy (e.g., 'nginx:latest')."),
    containerName: z.string().optional().describe("A name for the Docker container. If not provided, Docker generates one."),
    ports: z.array(z.string()).optional().describe("An array of port mappings (e.g., '80:80', '443:443')."),
    environmentVariables: z.array(z.string()).optional().describe("An array of environment variables (e.g., 'DB_HOST=localhost')."),
  }),
  execute: async (args: { imageName: string; containerName?: string; ports?: string[]; environmentVariables?: string[] }) => {
    let command = `docker run -d`;
    if (args.containerName) {
      command += ` --name ${args.containerName}`;
    }
    if (args.ports && args.ports.length > 0) {
      command += ` ${args.ports.map(p => `-p ${p}`).join(' ')}`;
    }
    if (args.environmentVariables && args.environmentVariables.length > 0) {
      command += ` ${args.environmentVariables.map(env => `-e ${env}`).join(' ')}`;
    }
    command += ` ${args.imageName}`;

    logger.info(`Executing Docker deployment command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      const containerId = result.stdout.trim().substring(0, 12); // Get short container ID
      logger.info(`Service deployed successfully. Container ID: ${containerId}`);
      return `Service deployed successfully. Container ID: ${containerId}. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to deploy service. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Build Image Tool
 * Builds a Docker image from a specified Dockerfile path.
 */
export const buildImageTool = createTool({
  name: "build_docker_image",
  description: "Builds a Docker image from a specified Dockerfile path, optionally tagging it. Requires Docker to be running.",
  parameters: z.object({
    dockerfilePath: z.string().describe("The path to the directory containing the Dockerfile."),
    tagName: z.string().optional().describe("The name and optionally a tag for the image (e.g., 'my-app:1.0')."),
  }),
  execute: async (args: { dockerfilePath: string; tagName?: string }) => {
    let command = `docker build ${args.dockerfilePath}`;
    if (args.tagName) {
      command += ` -t ${args.tagName}`;
    }

    logger.info(`Executing Docker build command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Docker image built successfully.`);
      return `Docker image built successfully. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to build Docker image. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Pull Image Tool
 * Pulls a Docker image from a registry.
 */
export const pullImageTool = createTool({
  name: "pull_docker_image",
  description: "Pulls a Docker image from a registry (e.g., Docker Hub). Requires Docker to be running.",
  parameters: z.object({
    imageName: z.string().describe("The name of the Docker image to pull (e.g., 'ubuntu:latest')."),
  }),
  execute: async (args: { imageName: string }) => {
    const command = `docker pull ${args.imageName}`;
    logger.info(`Executing Docker pull command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Docker image '${args.imageName}' pulled successfully.`);
      return `Docker image '${args.imageName}' pulled successfully. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to pull Docker image '${args.imageName}'. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * List Images Tool
 * Lists all Docker images.
 */
export const listImagesTool = createTool({
  name: "list_docker_images",
  description: "Lists all Docker images available locally. Requires Docker to be running.",
  parameters: z.object({}),
  execute: async () => {
    const command = `docker images`;
    logger.info(`Executing Docker images command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Successfully listed Docker images.`);
      return `Docker Images:\n${result.stdout.trim()}`;;
    } else {
      const errorMessage = `Failed to list Docker images. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Remove Image Tool
 * Removes one or more Docker images.
 */
export const removeImageTool = createTool({
  name: "remove_docker_image",
  description: "Removes one or more Docker images by name or ID. Requires Docker to be running.",
  parameters: z.object({
    imageNamesOrIds: z.array(z.string()).describe("An array of Docker image names or IDs to remove."),
    force: z.boolean().optional().default(false).describe("Force removal of the image(s)."),
  }),
  execute: async (args: { imageNamesOrIds: string[]; force: boolean }) => {
    const forceFlag = args.force ? '-f' : '';
    const command = `docker rmi ${forceFlag} ${args.imageNamesOrIds.join(' ')}`;
    logger.info(`Executing Docker rmi command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Docker image(s) removed successfully.`);
      return `Docker image(s) removed successfully. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to remove Docker image(s). Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Execute Container Command Tool
 * Executes a command inside a running Docker container.
 */
export const execContainerCommandTool = createTool({
  name: "execute_container_command",
  description: "Executes a specified command inside a running Docker container. Requires Docker to be running.",
  parameters: z.object({
    containerIdentifier: z.string().describe("The name or ID of the Docker container."),
    command: z.string().describe("The command to execute inside the container (e.g., 'ls -l /app')."),
  }),
  execute: async (args: { containerIdentifier: string; command: string }) => {
    const fullCommand = `docker exec ${args.containerIdentifier} ${args.command}`;
    logger.info(`Executing Docker exec command: ${fullCommand}`);
    const result = shell.exec(fullCommand, { silent: true });

    if (result.code === 0) {
      logger.info(`Command executed successfully in container '${args.containerIdentifier}'.`);
      return `Command executed successfully in container '${args.containerIdentifier}'. Output:\n${result.stdout.trim()}`;;
    } else {
      const errorMessage = `Failed to execute command in container '${args.containerIdentifier}'. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Inspect Container Tool
 * Returns low-level information on a Docker container.
 */
export const inspectContainerTool = createTool({
  name: "inspect_docker_container",
  description: "Returns low-level information on a Docker container by name or ID. Requires Docker to be running.",
  parameters: z.object({
    containerIdentifier: z.string().describe("The name or ID of the Docker container to inspect."),
  }),
  execute: async (args: { containerIdentifier: string }) => {
    const command = `docker inspect ${args.containerIdentifier}`;
    logger.info(`Executing Docker inspect command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Successfully inspected container '${args.containerIdentifier}'.`);
      return `Container Inspect Data:\n${result.stdout.trim()}`;;
    } else {
      const errorMessage = `Failed to inspect container '${args.containerIdentifier}'. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Monitor Cloud Tool
 * Retrieves status and logs of Docker containers.
 */
export const monitorCloudTool = createTool({
  name: "monitor_cloud",
  description: "Retrieves status and logs of Docker containers. Requires Docker to be running.",
  parameters: z.object({
    monitorType: z.enum(["list_containers", "container_logs"]).describe("The type of monitoring to perform."),
    containerIdentifier: z.string().optional().describe("The name or ID of the Docker container to monitor, required for 'container_logs'."),
    logLines: z.number().optional().default(100).describe("Number of log lines to retrieve, for 'container_logs'."),
  }),
  execute: async (args: { monitorType: "list_containers" | "container_logs"; containerIdentifier?: string; logLines: number }) => {
    let command = '';
    if (args.monitorType === "list_containers") {
      command = `docker ps -a`;
    } else if (args.monitorType === "container_logs") {
      if (!args.containerIdentifier) {
        throw new Error("containerIdentifier is required for 'container_logs' monitor type.");
      }
      command = `docker logs --tail ${args.logLines} ${args.containerIdentifier}`;
    } else {
      throw new Error(`Unknown monitor type: ${args.monitorType}`);
    }

    logger.info(`Executing Docker monitoring command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Successfully retrieved monitoring data.`);
      return `Monitoring Data:\n${result.stdout.trim()}`;;
    } else {
      const errorMessage = `Failed to retrieve monitoring data. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Create Network Tool
 * Creates a new Docker network.
 */
export const createNetworkTool = createTool({
  name: "create_docker_network",
  description: "Creates a new Docker network with a specified name. Requires Docker to be running.",
  parameters: z.object({
    networkName: z.string().describe("The name for the new Docker network."),
  }),
  execute: async (args: { networkName: string }) => {
    const command = `docker network create ${args.networkName}`;
    logger.info(`Executing Docker network create command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Docker network '${args.networkName}' created successfully.`);
      return `Docker network '${args.networkName}' created successfully. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to create Docker network '${args.networkName}'. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * List Networks Tool
 * Lists all Docker networks.
 */
export const listNetworksTool = createTool({
  name: "list_docker_networks",
  description: "Lists all Docker networks. Requires Docker to be running.",
  parameters: z.object({}),
  execute: async () => {
    const command = `docker network ls`;
    logger.info(`Executing Docker network ls command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Successfully listed Docker networks.`);
      return `Docker Networks:\n${result.stdout.trim()}`;;
    } else {
      const errorMessage = `Failed to list Docker networks. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Remove Network Tool
 * Removes one or more Docker networks.
 */
export const removeNetworkTool = createTool({
  name: "remove_docker_network",
  description: "Removes one or more Docker networks by name or ID. Requires Docker to be running.",
  parameters: z.object({
    networkNamesOrIds: z.array(z.string()).describe("An array of Docker network names or IDs to remove."),
  }),
  execute: async (args: { networkNamesOrIds: string[] }) => {
    const command = `docker network rm ${args.networkNamesOrIds.join(' ')}`;
    logger.info(`Executing Docker network rm command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Docker network(s) removed successfully.`);
      return `Docker network(s) removed successfully. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to remove Docker network(s). Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Create Volume Tool
 * Creates a new Docker volume.
 */
export const createVolumeTool = createTool({
  name: "create_docker_volume",
  description: "Creates a new Docker volume with a specified name. Requires Docker to be running.",
  parameters: z.object({
    volumeName: z.string().describe("The name for the new Docker volume."),
  }),
  execute: async (args: { volumeName: string }) => {
    const command = `docker volume create ${args.volumeName}`;
    logger.info(`Executing Docker volume create command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Docker volume '${args.volumeName}' created successfully.`);
      return `Docker volume '${args.volumeName}' created successfully. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to create Docker volume '${args.volumeName}'. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * List Volumes Tool
 * Lists all Docker volumes.
 */
export const listVolumesTool = createTool({
  name: "list_docker_volumes",
  description: "Lists all Docker volumes. Requires Docker to be running.",
  parameters: z.object({}),
  execute: async () => {
    const command = `docker volume ls`;
    logger.info(`Executing Docker volume ls command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Successfully listed Docker volumes.`);
      return `Docker Volumes:\n${result.stdout.trim()}`;;
    } else {
      const errorMessage = `Failed to list Docker volumes. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Remove Volume Tool
 * Removes one or more Docker volumes.
 */
export const removeVolumeTool = createTool({
  name: "remove_docker_volume",
  description: "Removes one or more Docker volumes by name or ID. Requires Docker to be running.",
  parameters: z.object({
    volumeNamesOrIds: z.array(z.string()).describe("An array of Docker volume names or IDs to remove."),
  }),
  execute: async (args: { volumeNamesOrIds: string[] }) => {
    const command = `docker volume rm ${args.volumeNamesOrIds.join(' ')}`;
    logger.info(`Executing Docker volume rm command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Docker volume(s) removed successfully.`);
      return `Docker volume(s) removed successfully. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to remove Docker volume(s). Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
});

/**
 * Manage Resources Tool
 * Manages running Docker containers (start, stop, restart, remove).
 */
export const manageResourcesTool = createTool({
  name: "manage_resources",
  description: "Manages Docker containers (start, stop, restart, remove). Requires Docker to be running.",
  parameters: z.object({
    containerIdentifier: z.string().describe("The name or ID of the Docker container to manage."),
    action: z.enum(["start", "stop", "restart", "remove"]).describe("The action to perform on the container."),
  }),
  execute: async (args: { containerIdentifier: string; action: "start" | "stop" | "restart" | "remove" }) => {
    let command = `docker ${args.action} ${args.containerIdentifier}`;

    if (args.action === "remove") {
      command = `docker rm ${args.containerIdentifier}`;
    }

    logger.info(`Executing Docker management command: ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
      logger.info(`Action '${args.action}' completed successfully on container '${args.containerIdentifier}'.`);
      return `Action '${args.action}' completed successfully on container '${args.containerIdentifier}'. Output: ${result.stdout.trim()}.`;
    } else {
      const errorMessage = `Failed to perform action '${args.action}' on container '${args.containerIdentifier}'. Error: ${result.stderr.trim()}`;;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  },
}); 