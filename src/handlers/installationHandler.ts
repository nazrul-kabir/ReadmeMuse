import { Context } from "probot";

const CONFIG_FILENAME = ".readmemuse.yml";

/**
 * Default configuration template to create on installation
 */
const CONFIG_TEMPLATE = `# Configuration for ReadmeMuse
# This file defines which paths to watch and which documentation files to update

# List of file patterns to watch for changes
# When files matching these patterns change, documentation updates will be suggested
watchPaths:
  - "src/**/*"
  - "lib/**/*"
  - "api/**/*"

# List of documentation files to analyze for updates
# These files will be checked for needed updates when watched files change
documentationFiles:
  - "README.md"
  - "docs/**/*.md"

# Optional: Examples of your repository's writing style and tone
# These help ReadmeMuse match your unique voice when generating suggestions
# Add 2-3 representative snippets from your existing documentation
toneExamples:
  - "Write clear, concise documentation."
`;

/**
 * Handle installation events - create config template if it doesn't exist
 */
export async function handleInstallation(
  context: Context<"installation.created" | "installation_repositories.added">
) {
  const { payload } = context;
  
  // Get list of repositories from the installation
  let repositories: Array<{ name: string; full_name: string }> = [];
  
  if (payload.action === "created" && "repositories" in payload) {
    // installation.created event includes repositories array
    repositories = payload.repositories || [];
  } else if (payload.action === "added" && "repositories_added" in payload) {
    // installation_repositories.added event includes repositories_added array
    repositories = payload.repositories_added || [];
  }

  context.log.info(`Processing installation for ${repositories.length} repository/repositories`);

  // Process each repository
  for (const repo of repositories) {
    try {
      // Extract owner from full_name (format: "owner/repo")
      const [owner, repoName] = repo.full_name.split("/");
      await createConfigIfMissing(context, owner, repoName);
    } catch (error: any) {
      context.log.error(`Error creating config for ${repo.full_name}:`, error);
      // Continue processing other repositories even if one fails
    }
  }
}

/**
 * Create configuration file if it doesn't exist
 */
async function createConfigIfMissing(
  context: Context,
  owner: string,
  repo: string
): Promise<void> {
  try {
    // Check if config file already exists
    await context.octokit.rest.repos.getContent({
      owner,
      repo,
      path: CONFIG_FILENAME,
    });
    
    // If we get here, file exists - don't overwrite it
    context.log.info(`Config file already exists in ${owner}/${repo}, skipping creation`);
  } catch (error: any) {
    if (error.status === 404) {
      // File doesn't exist, create it
      try {
        await context.octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: CONFIG_FILENAME,
          message: "Add ReadmeMuse configuration template",
          content: Buffer.from(CONFIG_TEMPLATE).toString("base64"),
        });
        
        context.log.info(`Created ${CONFIG_FILENAME} in ${owner}/${repo}`);
      } catch (createError: any) {
        context.log.error(`Failed to create ${CONFIG_FILENAME} in ${owner}/${repo}:`, createError);
        throw createError;
      }
    } else {
      // Some other error occurred while checking for file
      context.log.error(`Error checking for ${CONFIG_FILENAME} in ${owner}/${repo}:`, error);
      throw error;
    }
  }
}
