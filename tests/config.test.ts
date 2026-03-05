import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { loadConfig, ConfigSchema } from '../src/config.js';

vi.mock('fs/promises');

describe('Config Loader', () => {
    const mockFs = vi.mocked(fs);

    beforeEach(() => {
        vi.resetAllMocks();
        process.env = {}; // Clear env for isolated tests
    });

    it('should load default config when no file or env vars exist', async () => {
        // Mock file not found
        mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

        // We also need to mock stat to not throw for validatePaths
        mockFs.stat.mockResolvedValue({
            isDirectory: () => true,
            isFile: () => true,
        } as any);

        const config = await loadConfig('missing.json');
        expect(config.databasePath).toBe('./data/lkgb.sqlite');
        expect(config.similarityThreshold).toBe(0.75);
        expect(config.sources).toEqual([]);
        expect(config.embeddings).toBeUndefined();
    });

    it('should override defaults with env vars', async () => {
        mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
        mockFs.stat.mockResolvedValue({
            isDirectory: () => true,
            isFile: () => true,
        } as any);

        process.env.DATABASE_PATH = './custom/db.sqlite';
        process.env.SIMILARITY_THRESHOLD = '0.9';
        process.env.VAULT_PATH = '/mock/vault';
        process.env.CODE_PATHS = '/mock/code1, /mock/code2';

        const config = await loadConfig();
        expect(config.databasePath).toBe('./custom/db.sqlite');
        expect(config.similarityThreshold).toBe(0.9);
        expect(config.sources).toHaveLength(2);
        expect(config.sources[0]).toEqual({ id: 'obsidian', vaultPath: '/mock/vault' });
        expect(config.sources[1]).toEqual({ id: 'code', paths: ['/mock/code1', '/mock/code2'] });
    });

    it('should read from lkgb.config.json', async () => {
        const mockJson = {
            databasePath: './json/db.sqlite',
            sources: [{ id: 'obsidian', vaultPath: '/json/vault' }]
        };

        mockFs.readFile.mockResolvedValue(JSON.stringify(mockJson));
        mockFs.stat.mockResolvedValue({
            isDirectory: () => true,
            isFile: () => true,
        } as any);

        const config = await loadConfig();
        expect(config.databasePath).toBe('./json/db.sqlite');
        expect(config.sources[0].vaultPath).toBe('/json/vault');
    });

    it('should throw error on invalid json structure', async () => {
        const mockJson = {
            similarityThreshold: 1.5 // max is 1.0
        };

        mockFs.readFile.mockResolvedValue(JSON.stringify(mockJson));

        await expect(loadConfig()).rejects.toThrow();
    });

    it('should validate paths and throw if they do not exist', async () => {
        mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

        process.env.VAULT_PATH = '/invalid/vault';

        // Mock stat rejecting specifically for the vault path
        mockFs.stat.mockImplementation(async (p) => {
            if (p === '/invalid/vault') {
                throw new Error('ENOENT');
            }
            return { isDirectory: () => true, isFile: () => true } as any;
        });

        await expect(loadConfig()).rejects.toThrow(/vaultPath does not exist/);
    });
});
