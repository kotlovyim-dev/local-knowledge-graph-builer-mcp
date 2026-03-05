import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { SourceAdapter, RawNode, RawLink, SourceConfig, WatchCallback } from './types.js';

export class MarkdownIndexer implements SourceAdapter {
    id = 'markdown';
    name = 'Markdown vault indexer';
    private vaultPath: string | undefined;

    /**
     * Initialize the adapter with source-specific configuration.
     */
    async init(config: SourceConfig): Promise<void> {
        this.vaultPath = config.vaultPath;
        if (!this.vaultPath) {
            throw new Error("MarkdownIndexer requires a vaultPath in config");
        }
        // Ensure path exists
        const stat = await fs.stat(this.vaultPath);
        if (!stat.isDirectory()) {
            throw new Error(`vaultPath is not a directory: ${this.vaultPath}`);
        }
    }

    /**
     * Perform a full scan of the source and return all extracted nodes.
     */
    async scan(): Promise<RawNode[]> {
        if (!this.vaultPath) throw new Error("MarkdownIndexer not initialized");
        const allFiles = await this.walkDir(this.vaultPath);
        const mdFiles = allFiles.filter(f => f.endsWith('.md'));

        const nodes: RawNode[] = [];
        for (const file of mdFiles) {
            const fileNodes = await this.processFile(file);
            nodes.push(...fileNodes);
        }
        return nodes;
    }

    async dispose(): Promise<void> {
        // Nothing to clean up for one-off scan
    }

    private async walkDir(dir: string): Promise<string[]> {
        const results: string[] = [];
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            // skip hidden dirs like .obsidian, .git
            if (file.name.startsWith('.')) continue;

            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                results.push(...await this.walkDir(fullPath));
            } else {
                results.push(fullPath);
            }
        }
        return results;
    }

    private async processFile(filePath: string): Promise<RawNode[]> {
        const rawContent = await fs.readFile(filePath, 'utf8');
        const parsed = matter(rawContent);

        const content = parsed.content;
        const frontmatter = parsed.data || {};
        const title = frontmatter.title || path.basename(filePath, '.md');
        const relativePath = path.relative(this.vaultPath!, filePath);

        const links = this.extractLinks(rawContent); // Use rawContent so we parse tags in frontmatter as well if needed, but better use content?
        const contentLinks = this.extractLinks(content);

        const pageNode: RawNode = {
            sourceId: this.id,
            nodeType: 'page',
            id: filePath,
            path: filePath,
            name: title,
            content: content,
            metadata: frontmatter,
            links: contentLinks,
        };

        const chunkNodes = this.chunkByHeadings(content, filePath, title);

        return [pageNode, ...chunkNodes];
    }

    private extractLinks(text: string): RawLink[] {
        const links: RawLink[] = [];

        // Match [[WikiLinks]]
        const wikiRegex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = wikiRegex.exec(text)) !== null) {
            // split link and alias `[[Link|Alias]]`
            const target = match[1].split('|')[0].trim();
            links.push({
                target: target,
                type: 'MENTIONS',
            });
        }

        // Match #tags (e.g. #software-eng #v1.0)
        // Tag must start with #, contain word chars, hyphens, underscores.
        const tagRegex = /(?<=^|\s)#([\w-]+)/g;
        while ((match = tagRegex.exec(text)) !== null) {
            links.push({
                target: match[1],
                type: 'HAS_TAG',
            });
        }

        return links;
    }

    private chunkByHeadings(text: string, filePath: string, pageTitle: string): RawNode[] {
        const chunkNodes: RawNode[] = [];

        // Split by H1-H3
        // regex positive lookahead to keep the heading in the split
        const parts = text.split(/(?=^#{1,3}\s+)/m);

        let chunkIndex = 0;
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            // Extract the heading if any
            let heading = `Chunk ${chunkIndex + 1}`;
            const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/m);
            if (headingMatch) {
                heading = headingMatch[2].trim();
            } else if (chunkIndex === 0) {
                heading = 'Introduction';
            }

            const links = this.extractLinks(trimmed);

            chunkNodes.push({
                sourceId: this.id,
                nodeType: 'note',
                id: `${filePath}#chunk-${chunkIndex}`,
                path: filePath,
                name: `${pageTitle} - ${heading}`,
                content: trimmed,
                metadata: {
                    chunkIndex,
                    heading
                },
                links: links,
            });
            chunkIndex++;
        }

        return chunkNodes;
    }
}
