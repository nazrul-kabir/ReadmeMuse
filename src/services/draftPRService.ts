import { Context } from "probot";
import { DocSuggestion } from "../types/suggestion";

/**
 * Create a draft PR with documentation changes
 */
export async function createDraftPRWithChanges(
  context: Context,
  pr: any,
  suggestions: DocSuggestion[]
): Promise<void> {
  const payload = context.payload as any;
  const repository = payload.repository;
  const branchName = `readmemuse-sync-${pr.number}`;

  context.log.info(`Creating draft PR with documentation changes for PR #${pr.number}`);

  try {
    // Get the base branch SHA
    const baseRef = await context.octokit.rest.git.getRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: `heads/${pr.base.ref}`,
    });

    const baseSha = baseRef.data.object.sha;

    // Check if branch already exists and delete if it does
    try {
      await context.octokit.rest.git.getRef({
        owner: repository.owner.login,
        repo: repository.name,
        ref: `heads/${branchName}`,
      });
      
      // Branch exists, delete it
      await context.octokit.rest.git.deleteRef({
        owner: repository.owner.login,
        repo: repository.name,
        ref: `heads/${branchName}`,
      });
      
      context.log.info(`Deleted existing branch ${branchName}`);
    } catch (error: any) {
      // Branch doesn't exist, which is fine
      if (error.status !== 404) {
        throw error;
      }
    }

    // Create new branch from base
    await context.octokit.rest.git.createRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    context.log.info(`Created branch ${branchName} from ${pr.base.ref}`);

    // Apply each suggestion as a commit
    for (const suggestion of suggestions) {
      await applyDocumentationChange(context, repository, branchName, suggestion);
    }

    // Create draft PR
    const { data: draftPR } = await context.octokit.rest.pulls.create({
      owner: repository.owner.login,
      repo: repository.name,
      title: `📝 ReadmeMuse: Documentation updates for PR #${pr.number}`,
      head: branchName,
      base: pr.base.ref,
      body: formatDraftPRBody(pr, suggestions),
      draft: true,
    });

    context.log.info(`Created draft PR #${draftPR.number} for documentation updates`);

    // Add a comment to the original PR linking to the draft PR
    await context.octokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: pr.number,
      body: `## 📝 ReadmeMuse: Documentation Update Draft PR Created\n\n` +
        `I've created a draft PR with suggested documentation updates: #${draftPR.number}\n\n` +
        `Review and merge the draft PR to apply the changes, or edit it as needed.`,
    });

  } catch (error: any) {
    context.log.error(`Error creating draft PR for PR #${pr.number}:`, error);
    throw error;
  }
}

/**
 * Apply a single documentation change to the branch
 */
async function applyDocumentationChange(
  context: Context,
  repository: any,
  branchName: string,
  suggestion: DocSuggestion
): Promise<void> {
  try {
    // Get current file content
    let currentContent = "";
    let currentSha: string | undefined;

    try {
      const fileResponse = await context.octokit.rest.repos.getContent({
        owner: repository.owner.login,
        repo: repository.name,
        path: suggestion.filePath,
        ref: branchName,
      });

      if ("content" in fileResponse.data) {
        currentContent = Buffer.from(fileResponse.data.content, "base64").toString("utf-8");
        currentSha = fileResponse.data.sha;
      }
    } catch (error: any) {
      if (error.status === 404) {
        // File doesn't exist, we'll create it
        context.log.info(`File ${suggestion.filePath} doesn't exist, will create it`);
      } else {
        throw error;
      }
    }

    // Apply the diff patch to get new content
    const newContent = applyDiffPatch(currentContent, suggestion.diffPatch);

    // Commit the change
    await context.octokit.rest.repos.createOrUpdateFileContents({
      owner: repository.owner.login,
      repo: repository.name,
      path: suggestion.filePath,
      message: `docs: ${suggestion.summary}`,
      content: Buffer.from(newContent).toString("base64"),
      branch: branchName,
      sha: currentSha,
    });

    context.log.info(`Applied changes to ${suggestion.filePath} on branch ${branchName}`);
  } catch (error: any) {
    context.log.error(`Error applying change to ${suggestion.filePath}:`, error);
    throw error;
  }
}

/**
 * Apply a unified diff patch to content
 * 
 * This is a simplified implementation that handles basic unified diff patches.
 * 
 * Supported formats:
 * - Standard unified diff format (--- +++ @@)
 * - Simple line-based additions/deletions (+/- prefix)
 * - Context lines (space prefix)
 * 
 * Limitations:
 * - Does not handle complex multi-hunk diffs
 * - Assumes sequential line processing
 * - May fail on heavily modified files or non-standard diff formats
 * 
 * Future improvements:
 * - Use a proper diff parsing library for more robust handling
 * - Support more complex diff scenarios
 * - Better error reporting when diffs cannot be applied
 */
function applyDiffPatch(originalContent: string, diffPatch: string): string {
  // If the diff patch starts with '---' and '+++', it's a unified diff format
  
  const lines = diffPatch.split("\n");
  const originalLines = originalContent.split("\n");
  const newLines: string[] = [];
  
  let inDiff = false;
  let lineIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip diff headers
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
      inDiff = true;
      
      // Parse @@ line to get line numbers if needed
      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
        if (match) {
          const startLine = parseInt(match[1], 10) - 1;
          lineIndex = startLine;
        }
      }
      continue;
    }
    
    if (!inDiff) {
      continue;
    }
    
    // Process diff content
    if (line.startsWith("+")) {
      // Addition: add this line
      newLines.push(line.substring(1));
    } else if (line.startsWith("-")) {
      // Deletion: skip this line and move to next original line
      lineIndex++;
    } else if (line.startsWith(" ")) {
      // Context: copy from original
      if (lineIndex < originalLines.length) {
        newLines.push(originalLines[lineIndex]);
        lineIndex++;
      } else {
        newLines.push(line.substring(1));
      }
    } else if (line.trim() === "") {
      // Empty line in diff
      if (lineIndex < originalLines.length) {
        newLines.push(originalLines[lineIndex]);
        lineIndex++;
      }
    }
  }
  
  // If no diff was found or applied, try a simpler approach:
  // Check if the diff contains clear before/after sections
  if (newLines.length === 0) {
    // Look for added lines only (simple case)
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        newLines.push(line.substring(1));
      } else if (line.startsWith(" ")) {
        newLines.push(line.substring(1));
      }
    }
  }
  
  // If still no content, log warning and return original with error marker
  if (newLines.length === 0) {
    console.warn("Could not apply diff patch - returning original content with error marker");
    return originalContent + "\n\n<!-- ReadmeMuse: Could not automatically apply diff. Please review manually. -->\n";
  }
  
  return newLines.join("\n");
}

/**
 * Format the body of the draft PR
 */
function formatDraftPRBody(pr: any, suggestions: DocSuggestion[]): string {
  const parts: string[] = [];

  parts.push("## 📝 ReadmeMuse: Automated Documentation Updates");
  parts.push("");
  parts.push(`This draft PR contains suggested documentation updates based on changes in PR #${pr.number}.`);
  parts.push("");
  parts.push("### Original PR");
  parts.push("");
  parts.push(`**Title:** ${pr.title}`);
  parts.push(`**Link:** #${pr.number}`);
  parts.push("");
  parts.push("### Suggested Changes");
  parts.push("");

  for (const suggestion of suggestions) {
    parts.push(`#### ${suggestion.filePath}`);
    parts.push("");
    parts.push(`**Summary:** ${suggestion.summary}`);
    parts.push("");
    parts.push(`**Reasoning:** ${suggestion.reasoning}`);
    parts.push("");
  }

  parts.push("---");
  parts.push("");
  parts.push("*💡 This draft PR was automatically created by ReadmeMuse. Review the changes and merge when ready.*");
  parts.push("");
  parts.push("*You can edit these files directly in this PR or close it if the suggestions are not needed.*");

  return parts.join("\n");
}
