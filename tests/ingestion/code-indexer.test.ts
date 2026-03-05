import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { CodeIndexer } from '../../src/ingestion/code-indexer.js';

describe('CodeIndexer', () => {
    let indexer: CodeIndexer;
    const codePath = path.resolve(__dirname, '../fixtures/code');

    beforeAll(async () => {
        indexer = new CodeIndexer();
        await indexer.init({ id: 'test-code', paths: [codePath] });
    });

    it('should scan directories and extract AST nodes', async () => {
        const nodes = await indexer.scan();
        expect(nodes).toBeInstanceOf(Array);
        expect(nodes.length).toBeGreaterThan(0);

        // Check modules
        const modules = nodes.filter(n => n.nodeType === 'code_entity' && n.metadata?.type === 'module');
        expect(modules.length).toBe(2);

        // Check classes
        const classes = nodes.filter(n => n.nodeType === 'code_entity' && n.metadata?.type === 'class');
        expect(classes.length).toBe(2); // CodeIndexerTest and PyTestClass

        const pythonClass = classes.find(c => c.name === 'PyTestClass');
        expect(pythonClass).toBeDefined();
        // Check docstrings
        expect(pythonClass?.content).toContain('This is a docstring');

        // Check functions
        const tsFunction = nodes.find(n => n.name === 'processFiles');
        expect(tsFunction).toBeDefined();

        const tsMethod = nodes.find(n => n.name === 'init');
        expect(tsMethod).toBeDefined();

        // Check metadata imports and TODOs
        const tsModule = modules.find(m => m.name === 'test.ts');
        expect(tsModule?.metadata?.todos).toContain('// TODO: Make this better');
        const linkTargets = tsModule!.links.map(l => l.target);
        expect(linkTargets).toContain('http');
        expect(linkTargets).toContain('path');
    });
});
