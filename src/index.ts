import { Probot } from "probot";
import { handlePullRequest } from "./handlers/pullRequestHandler";

export default (app: Probot) => {
  // Listen for pull request opened and synchronize (updated) events
  app.on(["pull_request.opened", "pull_request.synchronize"], async (context) => {
    await handlePullRequest(context);
  });

  app.log.info("ReadmeMuse is running!");
};
