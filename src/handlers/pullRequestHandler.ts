import { Context } from "probot";
import { loadConfig } from "../services/configService";
import { shouldAnalyzePR } from "../utils/pathMatcher";
import { analyzePRForDocUpdates } from "../services/analysisService";
import { postDocumentationSuggestions } from "../services/commentService";
import { createDraftPRWithChanges } from "../services/draftPRService";

/**
 * Handle pull request events
 */
export async function handlePullRequest(context: Context<"pull_request.opened" | "pull_request.synchronize">) {
  const { payload } = context;
  const pr = payload.pull_request;
  const repository = payload.repository;

  context.log.info(`Processing PR #${pr.number} in ${repository.full_name}`);

  try {
    // Load configuration
    const config = await loadConfig(context);
    
    // Get list of changed files in the PR
    const files = await context.octokit.rest.pulls.listFiles({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pr.number,
    });

    const changedFiles = files.data.map((f: any) => f.filename);
    
    // Check if any changed files match the watchlist
    if (!shouldAnalyzePR(changedFiles, config.watchPaths)) {
      context.log.info(`No watched files changed in PR #${pr.number}, skipping analysis`);
      return;
    }

    context.log.info(`Watched files changed in PR #${pr.number}, analyzing for doc updates...`);

    // Analyze PR for documentation updates
    const suggestions = await analyzePRForDocUpdates(context, pr, config);

    if (suggestions.length === 0) {
      context.log.info(`No documentation suggestions for PR #${pr.number}`);
      return;
    }

    // Choose delivery method based on configuration
    if (config.createDraftPR) {
      // Create a draft PR with the changes applied
      await createDraftPRWithChanges(context, pr, suggestions);
      context.log.info(`Created draft PR with ${suggestions.length} documentation changes for PR #${pr.number}`);
    } else {
      // Post suggestions as PR comment (default behavior)
      await postDocumentationSuggestions(context, pr, suggestions);
      context.log.info(`Posted ${suggestions.length} documentation suggestions for PR #${pr.number}`);
    }
  } catch (error: any) {
    context.log.error(`Error processing PR #${pr.number}:`, error);
    throw error;
  }
}
