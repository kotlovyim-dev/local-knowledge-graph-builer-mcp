import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import 'dotenv/config'; // loads .env into process.env

// 1. Define configuration schema using Zod
export const SourceConfigSchema = z.object({
    id: z.string(),
    vaultPath: z.string().optional(),
    paths: z.array(z.string()).optional(),
});

export const EmbeddingConfigSchema = z.object({
    provider: z.string().default('ollama'),
    model: z.string().default('nomic-embed-text'),
    baseUrl: z.string().default('http://localhost:11434'),
});

export const ConfigSchema = z.object({
    databasePath: z.string().default('./data/lkgb.sqlite'),
    similarityThreshold: z.number().min(0.0).max(1.0).default(0.75),
    sources: z.array(SourceConfigSchema).default([]),
    embeddings: EmbeddingConfigSchema.optional(),
});

export type SourceConfig = z.infer<typeof SourceConfigSchema>;
export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Helper to check if a path exists
async function validatePaths(config: Config): Promise<void> {
    const errors: string[] = [];

    // We could check databasePath directory existence here if we wanted
    const dbDir = path.dirname(config.databasePath);
    try {
        const stat = await fs.stat(dbDir);
        if (!stat.isDirectory()) {
            errors.push(`Directory for databasePath does not exist: ${dbDir}`);
        }
    } catch {
        // If it doesn't exist, we might try to create it later, but let's just warn or let it pass for now.
        // For validation, we should definitely check source paths.
    }

    for (const source of config.sources) {
        if (source.vaultPath) {
            try {
                const stat = await fs.stat(source.vaultPath);
                if (!stat.isDirectory()) {
                    errors.push(`vaultPath is not a directory: ${source.vaultPath}`);
                }
            } catch {
                errors.push(`vaultPath does not exist: ${source.vaultPath}`);
            }
        }

        if (source.paths) {
            for (const p of source.paths) {
                try {
                    const stat = await fs.stat(p);
                    if (!stat.isDirectory() && !stat.isFile()) {
                        errors.push(`source path is invalid: ${p}`);
                    }
                } catch {
                    errors.push(`source path does not exist: ${p}`);
                }
            }
        }
    }

    if (errors.length > 0) {
        throw new Error(`Configuration path validation failed:\n- ${errors.join('\n- ')}`);
    }
}

/**
 * Loads configuration from lkgb.config.json or environment variables.
 * Environment variables override JSON properties.
 */
export async function loadConfig(configPath = 'lkgb.config.json'): Promise<Config> {
    let jsonConfig: unknown = {};

    try {
        const fileContent = await fs.readFile(configPath, 'utf8');
        jsonConfig = JSON.parse(fileContent);
    } catch (err: unknown) {
        // Ignore ENOENT (file not found) if it's the default config path,
        // we'll rely on env vars or defaults
        if (err && typeof err === 'object' && 'code' in err && err.code !== 'ENOENT') {
            const errorMsg = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to parse config file ${configPath}: ${errorMsg}`, { cause: err });
        }
    }

    // Parse initial config to apply defaults and check structure
    let config = ConfigSchema.parse(jsonConfig);

    // Override with environment variables if available
    if (process.env.DATABASE_PATH) {
        config.databasePath = process.env.DATABASE_PATH;
    }

    if (process.env.SIMILARITY_THRESHOLD) {
        config.similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD);
    }

    if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
        config.embeddings = {
            provider: 'ollama',
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            model: process.env.OLLAMA_MODEL || 'nomic-embed-text',
        };
    }

    // Support simple env setup for one obsidian source and one code source
    if (process.env.VAULT_PATH || process.env.CODE_PATHS) {
        const envSources: SourceConfig[] = [];
        if (process.env.VAULT_PATH) {
            envSources.push({ id: 'obsidian', vaultPath: process.env.VAULT_PATH });
        }
        if (process.env.CODE_PATHS) {
            const codePaths = process.env.CODE_PATHS.split(',').map(p => p.trim()).filter(Boolean);
            if (codePaths.length > 0) {
                envSources.push({ id: 'code', paths: codePaths });
            }
        }

        // Merge: we could replace or append. Replacing seems safer for simple env usage.
        if (envSources.length > 0 && config.sources.length === 0) {
            config.sources = envSources;
        }
    }

    // Validate the final merged configuration again just to be safe
    config = ConfigSchema.parse(config);

    // Validate physical paths
    await validatePaths(config);

    return config;
}
