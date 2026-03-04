import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceRegistry } from '../../src/ingestion/registry.js';
import { SourceAdapter, RawNode } from '../../src/ingestion/types.js';
import { Config, SourceConfig } from '../../src/config.js';

describe('SourceRegistry', () => {
    let registry: SourceRegistry;

    beforeEach(() => {
        registry = new SourceRegistry();
    });

    const createMockAdapter = (id: string, name: string): SourceAdapter => ({
        id,
        name,
        init: vi.fn().mockResolvedValue(undefined),
        scan: vi.fn().mockResolvedValue([{ id: `node-from-${id}`, sourceId: id } as unknown as RawNode]),
        dispose: vi.fn().mockResolvedValue(undefined),
    });

    it('should register and retrieve adapters', () => {
        const mockObsidian = createMockAdapter('obsidian', 'Obsidian Adapter');
        registry.register(mockObsidian);

        expect(registry.getAdapter('obsidian')).toBe(mockObsidian);
        expect(registry.getAdapter('unknown')).toBeUndefined();
        expect(registry.getAllAdapters()).toHaveLength(1);
        expect(registry.getAllAdapters()[0]).toBe(mockObsidian);
    });

    it('should prevent duplicate registration', () => {
        const mock1 = createMockAdapter('test-id', 'Test 1');
        const mock2 = createMockAdapter('test-id', 'Test 2');

        registry.register(mock1);
        expect(() => registry.register(mock2)).toThrow(/already registered/);
    });

    it('should initialize adapters that have matching configuration', async () => {
        const obsidian = createMockAdapter('obsidian', 'Obsidian');
        const code = createMockAdapter('code', 'Code');
        registry.register(obsidian);
        registry.register(code);

        const config: Config = {
            databasePath: ':memory:',
            similarityThreshold: 0.75,
            sources: [
                { id: 'obsidian', vaultPath: '/tmp/vault' }
            ]
        };

        // Spy on console.warn for the unconfigured adapter warning mock
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        await registry.initializeAll(config);

        // obsidian should be initialized
        expect(obsidian.init).toHaveBeenCalledWith(config.sources[0]);

        // code wasn't in config, so it shouldn't be initialized (or we could have designed it to init with empty config, but our logic says skip)
        // Actually, looking at registry.ts, it loops over config.sources. So code adapter won't be initialized.
        expect(code.init).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('should scan all registered adapters and aggregate nodes', async () => {
        const adapter1 = createMockAdapter('one', 'One');
        const adapter2 = createMockAdapter('two', 'Two');

        registry.register(adapter1);
        registry.register(adapter2);

        const nodes = await registry.scanAll();

        expect(nodes).toHaveLength(2);
        expect(nodes.find(n => n.sourceId === 'one')).toBeDefined();
        expect(nodes.find(n => n.sourceId === 'two')).toBeDefined();
        expect(adapter1.scan).toHaveBeenCalled();
        expect(adapter2.scan).toHaveBeenCalled();
    });
});
