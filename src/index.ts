import { Probot } from "probot";
import { handlePullRequest } from "./handlers/pullRequestHandler";
import { handleInstallation } from "./handlers/installationHandler";

export default (app: Probot) => {
  // Listen for installation events to create config template
  app.on(["installation.created", "installation_repositories.added"], async (context) => {
    await handleInstallation(context);
  });

  // Listen for pull request opened and synchronize (updated) events
  app.on(["pull_request.opened", "pull_request.synchronize"], async (context) => {
    await handlePullRequest(context);
  });

  app.log.info("ReadmeMuse is running!");
};
