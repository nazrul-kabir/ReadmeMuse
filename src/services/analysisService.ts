import { Context } from "probot";
import { ReadmeMuseConfig } from "../types/config";
import { DocSuggestion } from "../types/suggestion";
import { matchFiles } from "../utils/pathMatcher";
import { generateDocumentationSuggestions } from "../utils/aiAnalyzer";

/**
 * Analyze PR for documentation updates
 */
export async function analyzePRForDocUpdates(
  context: Context,
  pr: any,
  config: ReadmeMuseConfig
): Promise<DocSuggestion[]> {
  const payload = context.payload as any;
  const repository = payload.repository;

  try {
    // Get PR diff
    const diffResponse = await context.octokit.rest.pulls.get({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pr.number,
      mediaType: {
        format: "diff",
      },
    });

    const prDiff = diffResponse.data as unknown as string;

    // Get list of changed files
    const filesResponse = await context.octokit.rest.pulls.listFiles({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pr.number,
    });

    const changedFiles = filesResponse.data.map((f: any) => ({
      filename: f.filename,
      patch: f.patch || "",
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
    }));

    // Get documentation files content
    const docFiles = await getDocumentationFiles(context, config.documentationFiles);

    // Use AI to analyze and generate suggestions
    const suggestions = await generateDocumentationSuggestions({
      prDiff,
      changedFiles,
      docFiles,
      prTitle: pr.title,
      prBody: pr.body || "",
      context: {
        repository: repository.full_name,
        branch: pr.head.ref,
      },
      toneExamples: config.toneExamples,
    });

    return suggestions;
  } catch (error: any) {
    context.log.error("Error analyzing PR:", error);
    return [];
  }
}

/**
 * Get content of documentation files
 */
async function getDocumentationFiles(
  context: Context,
  patterns: string[]
): Promise<Array<{ path: string; content: string }>> {
  const payload = context.payload as any;
  const repository = payload.repository;
  const pr = payload.pull_request;

  const docFiles: Array<{ path: string; content: string }> = [];

  try {
    // Get repository tree to find all files
    const treeResponse = await context.octokit.rest.git.getTree({
      owner: repository.owner.login,
      repo: repository.name,
      tree_sha: pr.base.sha,
      recursive: "true",
    });

    // Filter files matching documentation patterns
    const matchedPaths = matchFiles(
      treeResponse.data.tree
        .filter((item: any) => item.type === "blob")
        .map((item: any) => item.path || ""),
      patterns
    );

    // Get content for each matched file
    for (const path of matchedPaths) {
      try {
        const fileResponse = await context.octokit.rest.repos.getContent({
          owner: repository.owner.login,
          repo: repository.name,
          path,
          ref: pr.base.sha,
        });

        if ("content" in fileResponse.data) {
          const content = Buffer.from(fileResponse.data.content, "base64").toString("utf-8");
          docFiles.push({ path, content });
        }
      } catch (error: any) {
        context.log.warn(`Could not read file ${path}:`, error);
      }
    }
  } catch (error: any) {
    context.log.error("Error getting documentation files:", error);
  }

  return docFiles;
}
