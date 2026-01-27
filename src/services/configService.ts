import { Context } from "probot";
import * as yaml from "js-yaml";
import { ReadmeMuseConfig, DEFAULT_CONFIG } from "../types/config";

const CONFIG_FILENAME = ".readmemuse.yml";

/**
 * Load configuration from repository
 */
export async function loadConfig(context: Context): Promise<ReadmeMuseConfig> {
  try {
    const payload = context.payload as any;
    const repository = payload.repository;
    
    // Try to load config file from repository
    const configFile = await context.octokit.rest.repos.getContent({
      owner: repository.owner.login,
      repo: repository.name,
      path: CONFIG_FILENAME,
    });

    if ("content" in configFile.data) {
      const content = Buffer.from(configFile.data.content, "base64").toString("utf-8");
      const config = yaml.load(content) as ReadmeMuseConfig;
      
      // Validate config
      if (!config.watchPaths || !Array.isArray(config.watchPaths)) {
        throw new Error("Invalid config: watchPaths must be an array");
      }
      if (!config.documentationFiles || !Array.isArray(config.documentationFiles)) {
        throw new Error("Invalid config: documentationFiles must be an array");
      }
      
      context.log.info(`Loaded config from ${CONFIG_FILENAME}`);
      return config;
    }
  } catch (error: any) {
    if (error.status === 404) {
      context.log.info(`No ${CONFIG_FILENAME} found, using default configuration`);
    } else {
      context.log.warn(`Error loading config: ${error.message}, using default configuration`);
    }
  }

  return DEFAULT_CONFIG;
}
