import { SourceConfig } from '../config.js';

export type NodeType = 'note' | 'code_entity' | 'tag' | 'page';

/**
 * A hard link extracted from the source content.
 * e.g., a WikiLink `[[Auth Service]]` or a tag `#auth`.
 */
export interface RawLink {
    target: string; // The literal text of the link
    type: 'MENTIONS' | 'HAS_TAG' | 'DERIVED_FROM'; // The type of hard link
}

/**
 * A fundamental unit of knowledge extracted from a source.
 */
export interface RawNode {
    sourceId: string;    // ID of the adapter that created this node (e.g., 'obsidian')
    nodeType: NodeType;  // Type of the node
    id: string;          // Unique identifier (usually path + index)
    path: string;        // Physical path or URI
    name: string;        // Name of the entity (e.g., file name, function name, tag name)
    content: string;     // Text content for semantic indexing
    metadata: Record<string, unknown>; // Frontmatter, line numbers, docstrings, etc.
    links: RawLink[];    // Extracted hard links
}

/**
 * Callback for watch mode implementations.
 */
export type WatchCallback = (event: 'add' | 'change' | 'unlink', path: string) => void;

/**
 * Standard interface for all data source indexers (Markdown, Tree-sitter, etc.)
 */
export interface SourceAdapter {
    id: string;
    name: string;

    /**
     * Initialize the adapter with source-specific configuration.
     */
    init(config: SourceConfig): Promise<void>;

    /**
     * Perform a full scan of the source and return all extracted nodes.
     */
    scan(): Promise<RawNode[]>;

    /**
     * Start watching the source for incremental changes.
     * Optional method depending on whether the source supports real-time monitoring.
     */
    watch?(callback: WatchCallback): void;

    /**
     * Clean up resources (e.g., stop watching, close file handles).
     */
    dispose(): Promise<void>;
}
