import { Octokit } from "@octokit/rest";
import { createTool } from "@voltagent/core";
import { z } from "zod";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Tool to fetch repository stars
export const fetchRepoStarsTool = createTool({
  name: "repo_stars",
  description: "Fetches the number of stars for a GitHub repository",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository"),
    repo: z.string().describe("The name of the repository"),
  }),
  execute: async ({ owner, repo }: { owner: string; repo: string }) => {
    try {
      const response = await octokit.repos.get({
        owner,
        repo,
      });
      return {
        success: true,
        stars: response.data.stargazers_count,
        message: `Repository ${owner}/${repo} has ${response.data.stargazers_count} stars.`,
      };
    } catch (error) {
      return {
        success: false,
        stars: 0,
        message: `Error fetching stars for ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to fetch repository contributors
export const fetchRepoContributorsTool = createTool({
  name: "repo_contributors",
  description: "Fetches the list of contributors for a GitHub repository",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository"),
    repo: z.string().describe("The name of the repository"),
  }),
  execute: async ({ owner, repo }: { owner: string; repo: string }) => {
    try {
      const response = await octokit.repos.listContributors({
        owner,
        repo,
      });

      const contributors = response.data.map((contributor) => ({
        login: contributor.login,
        contributions: contributor.contributions,
      }));

      return {
        success: true,
        contributors,
        message: `Repository ${owner}/${repo} has ${contributors.length} contributors.`,
        details: contributors,
      };
    } catch (error) {
      return {
        success: false,
        contributors: [],
        message: `Error fetching contributors for ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// New Tool: Get file content from a GitHub repository
export const getFileContentTool = createTool({
  name: "get_github_file_content",
  description: "Retrieves the content of a file from a GitHub repository.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    path: z.string().describe("The path to the file within the repository (e.g., 'src/main.ts')."),
    ref: z.string().optional().describe("The name of the commit/branch/tag. Default: the repository's default branch."),
  }),
  execute: async ({ owner, repo, path, ref }) => {
    try {
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      // Type guard to ensure response.data is an object and has a 'content' property
      // eslint-disable-next-line sonarjs/different-types-comparison
      if (typeof response.data === 'object' && response.data !== null && 'content' in response.data && typeof response.data.content === 'string') {
        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        return {
          success: true,
          content,
          message: `Content of ${path} fetched successfully.`,
        };
      } else {
        return {
          success: false,
          content: null,
          message: `Failed to retrieve content for ${path}. It might not be a file or the content is not in a readable format.`,
        };
      }
    } catch (error) {
      return {
        success: false,
        content: null,
        message: `Error fetching content for ${owner}/${repo}/${path}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// New Tool: List repository contents (files and directories)
export const listRepositoryContentsTool = createTool({
  name: "list_github_repo_contents",
  description: "Lists the contents (files and directories) of a path in a GitHub repository.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    path: z.string().optional().default("").describe("The path within the repository to list (e.g., 'src/components'). Default: repository root."),
    ref: z.string().optional().describe("The name of the commit/branch/tag. Default: the repository's default branch."),
  }),
  execute: async ({ owner, repo, path, ref }) => {
    try {
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if (Array.isArray(response.data)) {
        const contents = response.data.map((item) => ({
          name: item.name,
          type: item.type, // 'file' or 'dir'
          path: item.path,
          size: item.size,
          url: item.html_url,
        }));
        return {
          success: true,
          contents,
          message: `Contents of ${path || 'repository root'} listed successfully.`,
          details: contents,
        };
      } else {
        return {
          success: false,
          contents: [],
          message: `Path ${path} is not a directory or an error occurred.`,
        };
      }
    } catch (error) {
      return {
        success: false,
        contents: [],
        message: `Error listing contents for ${owner}/${repo}/${path}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Pull Request Management Tools

export const listPullRequestsTool = createTool({
  name: "list_github_pull_requests",
  description: "Fetches a list of pull requests for a GitHub repository.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    state: z.enum(["open", "closed", "all"]).optional().default("open").describe("State of the pull requests to fetch."),
    head: z.string().optional().describe("Filter pulls by head user or head organization and branch name in the format of 'user:branch' or 'organization:branch'."),
    base: z.string().optional().describe("Filter pulls by base branch name."),
    sort: z.enum(["created", "updated", "popularity", "long-running"]).optional().default("created").describe("What to sort results by."),
    direction: z.enum(["asc", "desc"]).optional().default("desc").describe("Direction for sorting results."),
  }),
  execute: async ({ owner, repo, state, head, base, sort, direction }) => {
    try {
      const response = await octokit.pulls.list({
        owner,
        repo,
        state,
        head,
        base,
        sort,
        direction,
      });
      const prs = response.data.map(pr => ({
        number: pr.number,
        title: pr.title,
        user: pr.user?.login,
        state: pr.state,
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
      }));
      return {
        success: true,
        pull_requests: prs,
        message: `Found ${prs.length} pull requests in state '${state}'.`,
        details: prs,
      };
    } catch (error) {
      return {
        success: false,
        pull_requests: [],
        message: `Error listing pull requests for ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const getPullRequestDetailsTool = createTool({
  name: "get_github_pull_request_details",
  description: "Retrieves detailed information about a specific pull request.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    pull_number: z.number().describe("The number of the pull request."),
  }),
  execute: async ({ owner, repo, pull_number }) => {
    try {
      const response = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
      });
      const pr = response.data;
      return {
        success: true,
        pull_request: {
          number: pr.number,
          title: pr.title,
          user: pr.user?.login,
          state: pr.state,
          html_url: pr.html_url,
          body: pr.body,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          merged_at: pr.merged_at,
          closed_at: pr.closed_at,
          merge_commit_sha: pr.merge_commit_sha,
          commits: pr.commits,
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changed_files,
        },
        message: `Details for PR #${pull_number} fetched successfully.`,
        details: pr,
      };
    } catch (error) {
      return {
        success: false,
        pull_request: null,
        message: `Error fetching details for PR #${pull_number} in ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const createPullRequestTool = createTool({
  name: "create_github_pull_request",
  description: "Creates a new pull request in a GitHub repository.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    title: z.string().describe("The title of the pull request."),
    head: z.string().describe("The name of the branch where your changes are implemented."),
    base: z.string().describe("The name of the branch you want the changes pulled into."),
    body: z.string().optional().describe("The contents of the pull request body."),
    draft: z.boolean().optional().default(false).describe("Indicates whether the pull request is a draft."),
  }),
  execute: async ({ owner, repo, title, head, base, body, draft }) => {
    try {
      const response = await octokit.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
        draft,
      });
      const pr = response.data;
      return {
        success: true,
        pull_request: {
          number: pr.number,
          title: pr.title,
          html_url: pr.html_url,
          state: pr.state,
        },
        message: `Pull request #${pr.number} created successfully.`,
        details: pr,
      };
    } catch (error) {
      return {
        success: false,
        pull_request: null,
        message: `Error creating pull request in ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const mergePullRequestTool = createTool({
  name: "merge_github_pull_request",
  description: "Merges an open pull request.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    pull_number: z.number().describe("The number of the pull request to merge."),
    commit_title: z.string().optional().describe("Title for the merge commit message."),
    commit_message: z.string().optional().describe("Extra detail to append to the merge commit message."),
    merge_method: z.enum(["merge", "squash", "rebase"]).optional().default("merge").describe("Merge method to use."),
  }),
  execute: async ({ owner, repo, pull_number, commit_title, commit_message, merge_method }) => {
    try {
      const response = await octokit.pulls.merge({
        owner,
        repo,
        pull_number,
        commit_title,
        commit_message,
        merge_method,
      });
      const mergeResult = response.data;
      return {
        success: mergeResult.merged,
        message: mergeResult.message,
        sha: mergeResult.sha,
        details: mergeResult,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error merging PR #${pull_number} in ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const commentOnPullRequestTool = createTool({
  name: "comment_on_github_pull_request",
  description: "Adds a comment to a specific pull request.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    pull_number: z.number().describe("The number of the pull request to comment on."),
    body: z.string().describe("The content of the comment."),
  }),
  execute: async ({ owner, repo, pull_number, body }) => {
    try {
      // GitHub API treats PR comments as issue comments
      const response = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body,
      });
      const comment = response.data;
      return {
        success: true,
        comment_id: comment.id,
        html_url: comment.html_url,
        message: `Comment added to PR #${pull_number} successfully.`,
        details: comment,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error commenting on PR #${pull_number} in ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const listPullRequestFilesTool = createTool({
  name: "list_github_pull_request_files",
  description: "Lists the files changed in a specific pull request.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    pull_number: z.number().describe("The number of the pull request."),
  }),
  execute: async ({ owner, repo, pull_number }) => {
    try {
      const response = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number,
      });
      const files = response.data.map(file => ({
        sha: file.sha,
        filename: file.filename,
        status: file.status, // 'added', 'removed', 'modified', 'renamed'
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        raw_url: file.raw_url,
        blob_url: file.blob_url,
      }));
      return {
        success: true,
        files,
        message: `Listed ${files.length} files for PR #${pull_number}.`,
        details: files,
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        message: `Error listing files for PR #${pull_number} in ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Repository Management Tools

export const createRepositoryTool = createTool({
  name: "create_github_repository",
  description: "Creates a new GitHub repository for the authenticated user or organization.",
  parameters: z.object({
    name: z.string().describe("The name of the repository."),
    description: z.string().optional().describe("A short description of the repository."),
    private: z.boolean().optional().default(false).describe("Whether the repository is private."),
    org: z.string().optional().describe("The organization name if creating a repository within an organization."),
  }),
  execute: async ({ name, description, private: isPrivate, org }) => {
    try {
      const response = await octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        org,
      });
      const repo = response.data;
      return {
        success: true,
        repository: {
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          html_url: repo.html_url,
          private: repo.private,
        },
        message: `Repository '${repo.full_name}' created successfully.`,
        details: repo,
      };
    } catch (error) {
      return {
        success: false,
        repository: null,
        message: `Error creating repository '${name}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const deleteRepositoryTool = createTool({
  name: "delete_github_repository",
  description: "Deletes a GitHub repository. USE WITH EXTREME CAUTION!",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository to delete."),
  }),
  execute: async ({ owner, repo }) => {
    try {
      await octokit.repos.delete({
        owner,
        repo,
      });
      return {
        success: true,
        message: `Repository '${owner}/${repo}' deleted successfully.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting repository '${owner}/${repo}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const listRepositoryHooksTool = createTool({
  name: "list_github_repository_hooks",
  description: "Lists webhook configurations for a GitHub repository.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
  }),
  execute: async ({ owner, repo }) => {
    try {
      const response = await octokit.repos.listWebhooks({
        owner,
        repo,
      });
      const hooks = response.data.map(hook => ({
        id: hook.id,
        name: hook.name,
        active: hook.active,
        events: hook.events,
        config_url: hook.config.url,
      }));
      return {
        success: true,
        hooks,
        message: `Found ${hooks.length} webhooks for '${owner}/${repo}'.`,
        details: hooks,
      };
    } catch (error) {
      return {
        success: false,
        hooks: [],
        message: `Error listing webhooks for '${owner}/${repo}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const createRepositoryHookTool = createTool({
  name: "create_github_repository_hook",
  description: "Creates a new webhook for a GitHub repository.",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository."),
    repo: z.string().describe("The name of the repository."),
    config_url: z.string().url().describe("The URL to which the payloads will be delivered."),
    events: z.array(z.string()).optional().default(["push"]).describe("Determines a list of events to be triggered for this webhook."),
    active: z.boolean().optional().default(true).describe("Determines if notifications are sent when the webhook is triggered."),
    content_type: z.enum(["json", "form"]).optional().default("json").describe("The media type used to serialize the payloads."),
    secret: z.string().optional().describe("If provided, the `secret` will be sent as the value of the `X-Hub-Signature` header in webhook requests."),
  }),
  execute: async ({ owner, repo, config_url, events, active, content_type, secret }) => {
    try {
      const response = await octokit.repos.createWebhook({
        owner,
        repo,
        config: {
          url: config_url,
          content_type,
          secret,
        },
        events,
        active,
      });
      const hook = response.data;
      return {
        success: true,
        webhook: {
          id: hook.id,
          name: hook.name,
          active: hook.active,
          events: hook.events,
          config_url: hook.config.url,
        },
        message: `Webhook '${hook.name}' created successfully for '${owner}/${repo}'.`,
        details: hook,
      };
    } catch (error) {
      return {
        success: false,
        webhook: null,
        message: `Error creating webhook for '${owner}/${repo}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// User/Organization Information Tools

export const getUserProfileTool = createTool({
  name: "get_github_user_profile",
  description: "Fetches details about a GitHub user.",
  parameters: z.object({
    username: z.string().describe("The GitHub username to fetch details for."),
  }),
  execute: async ({ username }) => {
    try {
      const response = await octokit.users.getByUsername({
        username,
      });
      const user = response.data;
      return {
        success: true,
        user_profile: {
          login: user.login,
          id: user.id,
          type: user.type,
          name: user.name,
          company: user.company,
          blog: user.blog,
          location: user.location,
          email: user.email,
          bio: user.bio,
          public_repos: user.public_repos,
          followers: user.followers,
          following: user.following,
          created_at: user.created_at,
          updated_at: user.updated_at,
          html_url: user.html_url,
        },
        message: `Profile for user '${username}' fetched successfully.`,
        details: user,
      };
    } catch (error) {
      return {
        success: false,
        user_profile: null,
        message: `Error fetching profile for user '${username}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const listOrgMembersTool = createTool({
  name: "list_github_org_members",
  description: "Lists members of a GitHub organization.",
  parameters: z.object({
    org: z.string().describe("The organization name to list members for."),
    role: z.enum(["all", "admin", "member"]).optional().default("all").describe("Filter members by their role in the organization."),
  }),
  execute: async ({ org, role }) => {
    try {
      const response = await octokit.orgs.listMembers({
        org,
        role,
      });
      const members = response.data.map(member => ({
        login: member.login,
        id: member.id,
        type: member.type,
        html_url: member.html_url,
      }));
      return {
        success: true,
        members,
        message: `Found ${members.length} members in organization '${org}' with role '${role}'.`,
        details: members,
      };
    } catch (error) {
      return {
        success: false,
        members: [],
        message: `Error listing members for organization '${org}': ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
