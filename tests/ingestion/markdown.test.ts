import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { MarkdownIndexer } from '../../src/ingestion/markdown.js';

describe('MarkdownIndexer', () => {
    let indexer: MarkdownIndexer;
    const vaultPath = path.resolve(__dirname, '../fixtures/vault');

    beforeAll(async () => {
        indexer = new MarkdownIndexer();
        await indexer.init({ id: 'test-obsidian', vaultPath });
    });

    it('should scan directories recursively and extract nodes', async () => {
        const nodes = await indexer.scan();
        expect(nodes).toBeInstanceOf(Array);
        expect(nodes.length).toBeGreaterThan(0);

        // We expect test1.md (page + chunks) and folder1/test2.md (page + chunks)
        const pages = nodes.filter(n => n.nodeType === 'page');
        expect(pages.length).toBe(2);

        const test1 = pages.find(p => p.name === 'Test Note 1');
        expect(test1).toBeDefined();
        if (!test1) return;

        // Frontmatter
        expect(test1.metadata.title).toBe('Test Note 1');

        // Check links extracted from the page content
        const linkTargets = test1.links.map(l => l.target);
        expect(linkTargets).toContain('Test Note 2'); // WikiLink
        expect(linkTargets).toContain('Test Note 3'); // WikiLink with alias
        expect(linkTargets).toContain('lkgb-test');   // Inline tag

        // Check chunks
        const chunks = nodes.filter(n => n.nodeType === 'note' && n.path === test1.path);
        expect(chunks.length).toBe(2);
        expect(chunks[0].name).toContain('Introduction');
        expect(chunks[1].name).toContain('Second Section');
    });
});
