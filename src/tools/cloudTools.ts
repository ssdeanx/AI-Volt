/**
 * Cloud Tools
 * Provides capabilities for interacting with cloud services via the Docker Engine API.
 * This approach is more secure and robust than shelling out to the `docker` CLI.
 */
import { createTool, createToolkit } from '@voltagent/core';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import fetch from 'isomorphic-fetch';
import { Readable } from 'stream';
import tar from 'tar-fs';

// Helper to communicate with the Docker Engine API
const dockerApiRequest = async (
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: object | Buffer | Readable,
  isStream = false
) => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  if (body) {
    if (body instanceof Readable || Buffer.isBuffer(body)) {
      options.headers = { 'Content-Type': 'application/x-tar' };
      options.body = body as any;
    } else {
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`http://localhost:2375${path}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Docker API error: ${response.status} ${errorText}`, { path });
    throw new Error(`Docker API request failed: ${errorText}`);
  }

  if (isStream) {
    return response.body;
  }
  
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    logger.warn(`[dockerApiRequest] Failed to parse JSON response, returning raw text.`, { error: e instanceof Error ? e.message : String(e), path });
    return text; // Return raw text if not JSON
  }
};

/**
 * Deploy Service Tool
 * Creates and starts a container from a given image.
 */
export const deployServiceTool = createTool({
  name: 'deploy_service',
  description: 'Creates and starts a Docker container using the Docker Engine API.',
  parameters: z.object({
    imageName: z.string().describe("The image to use (e.g., 'nginx:latest'). Must be available locally."),
    containerName: z.string().optional().describe('A name for the container.'),
    ports: z.record(z.number()).optional().describe("Port mappings, e.g., { '80/tcp': 8080 }"),
    env: z.array(z.string()).optional().describe("Environment variables, e.g., ['VAR=value']"),
  }),
  execute: async ({ imageName, containerName, ports, env }) => {
    // First, pull the image to ensure it exists
    await dockerApiRequest('POST', `/images/create?fromImage=${imageName}`);
    
    const ExposedPorts = ports ? Object.keys(ports).reduce((acc: Record<string, any>, key) => {
      // Validate key is safe and not a prototype pollution vector
      if (typeof key === 'string' && key.length > 0 && 
          !key.includes('__proto__') && !key.includes('constructor') && !key.includes('prototype') &&
          /^[a-zA-Z0-9_\-\\/]+$/.test(key)) {
        Object.defineProperty(acc, key, {
          value: {},
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
      return acc;
    }, Object.create(null)) : {};
    const PortBindings = ports ? (() => {
      const bindings = Object.create(null);
      for (const [key, value] of Object.entries(ports)) {
        // Validate key is safe and not a prototype pollution vector
        if (typeof key === 'string' && key.length > 0 && 
            !key.includes('__proto__') && !key.includes('constructor') && !key.includes('prototype') &&
            /^[a-zA-Z0-9_\-\\/]+$/.test(key) && 
            typeof value === 'number' && value > 0 && value <= 65535) {
          Object.defineProperty(bindings, key, {
            value: [{ HostPort: String(value) }],
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return bindings;
    })() : {};

    const containerConfig = {
      Image: imageName,
      Env: env,
      ExposedPorts,
      HostConfig: {
        PortBindings,
      },
    };

    const createUrl = containerName ? `/containers/create?name=${containerName}` : '/containers/create';

    const createResponse = await dockerApiRequest(
      'POST',
      createUrl,
      containerConfig
    );
    
    const containerId = createResponse.Id;
    await dockerApiRequest('POST', `/containers/${containerId}/start`);

    logger.info(`Container started successfully: ${containerId}`);
    return { success: true, containerId };
  },
});

/**
 * List Containers Tool
 * Lists all Docker containers.
 */
export const listContainersTool = createTool({
  name: 'list_containers',
  description: 'Lists all Docker containers using the Docker Engine API.',
  parameters: z.object({
    all: z.boolean().default(true).describe('Show all containers (default shows just running).'),
  }),
  execute: async ({ all }) => {
    const containers = await dockerApiRequest('GET', `/containers/json?all=${all}`);
    return containers;
  },
});

/**
 * Stop Container Tool
 * Stops a running container.
 */
export const stopContainerTool = createTool({
  name: 'stop_container',
  description: 'Stops a running Docker container by its ID.',
  parameters: z.object({
    containerId: z.string().describe('The ID of the container to stop.'),
  }),
  execute: async ({ containerId }) => {
    await dockerApiRequest('POST', `/containers/${containerId}/stop`);
    logger.info(`Container stopped: ${containerId}`);
    return { success: true, containerId };
  },
});

/**
 * Remove Container Tool
 * Removes a container.
 */
export const removeContainerTool = createTool({
  name: 'remove_container',
  description: 'Removes a Docker container by its ID.',
  parameters: z.object({
    containerId: z.string().describe('The ID of the container to remove.'),
    force: z.boolean().default(false).describe('Force removal if the container is running.'),
  }),
  execute: async ({ containerId, force }) => {
    await dockerApiRequest('DELETE', `/containers/${containerId}?force=${force}`);
    logger.info(`Container removed: ${containerId}`);
    return { success: true, containerId };
  },
});

/**
 * Get Container Logs Tool
 * Retrieves logs from a container.
 */
export const getContainerLogsTool = createTool({
  name: 'get_container_logs',
  description: 'Retrieves logs from a Docker container.',
  parameters: z.object({
    containerId: z.string().describe('The ID of the container.'),
    tail: z.number().default(100).describe('Number of lines to show from the end of the logs.'),
  }),
  execute: async ({ containerId, tail }) => {
    const logStream = await dockerApiRequest(
      'GET',
      `/containers/${containerId}/logs?stdout=true&stderr=true&tail=${tail}`,
      undefined,
      true
    );
    return Readable.from(logStream).toString();
  },
});


/**
 * Inspect Container Tool
 * Returns low-level information about a container.
 */
export const inspectContainerTool = createTool({
  name: 'inspect_container',
  description: 'Returns detailed information about a container.',
  parameters: z.object({
    containerId: z.string().describe('The ID of the container to inspect.'),
  }),
  execute: async ({ containerId }) => {
    const data = await dockerApiRequest('GET', `/containers/${containerId}/json`);
    return data;
  },
});

/**
 * List Images Tool
 * Lists all Docker images.
 */
export const listImagesTool = createTool({
    name: 'list_images',
    description: 'Lists all Docker images using the Docker Engine API.',
    parameters: z.object({}),
    execute: async () => {
        const images = await dockerApiRequest('GET', '/images/json');
        return images;
    },
});

/**
 * Build Image Tool
 * Builds a Docker image from a local directory context.
 */
export const buildImageTool = createTool({
  name: 'build_image',
  description: 'Builds a Docker image from a Dockerfile in a given context path.',
  parameters: z.object({
    contextPath: z.string().describe('Path to the directory containing the Dockerfile and build context.'),
    tag: z.string().describe("The tag for the new image (e.g., 'my-app:latest')."),
    dockerfilePath: z.string().optional().describe('Path to the Dockerfile relative to the context path. Defaults to "Dockerfile".'),
  }),
  execute: async ({ contextPath, tag, dockerfilePath }) => {
    const dockerfile = dockerfilePath || 'Dockerfile';
    const tarStream = tar.pack(contextPath);

    const buildResponse = await dockerApiRequest(
      'POST',
      `/build?t=${encodeURIComponent(tag)}&dockerfile=${encodeURIComponent(dockerfile)}`,
      tarStream,
      true
    );

    const streamToString = (stream: Readable): Promise<string> => {
        const chunks: Buffer[] = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', (err) => reject(err));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
    };

    const result = await streamToString(buildResponse as Readable);
    logger.info(`Image build process completed for tag: ${tag}`);
    // Naively parsing the stream for the final output
    const lines = result.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    try {
        const finalMessage = JSON.parse(lastLine);
        return { success: true, log: result, finalMessage };
    } catch {
        return { success: false, log: result, error: 'Failed to parse final build message.' };
    }
  },
});

/**
 * Cloud Toolkit
 * A collection of tools for interacting with Docker.
 */
export const cloudToolkit = createToolkit({
  name: 'Cloud Toolkit',
  description: 'Tools for managing Docker containers and images via the Docker Engine API.',
  tools: [
    deployServiceTool as any,
    listContainersTool as any,
    stopContainerTool as any,
    removeContainerTool as any,
    getContainerLogsTool as any,
    inspectContainerTool as any,
    listImagesTool as any,
    buildImageTool as any,
  ],
}); 