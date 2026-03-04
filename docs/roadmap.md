# LKGB — Roadmap

> Ideas for development after completing main phases (Phase 1-4).

---

## New Data Sources

### Notion Integration (P1)

- Notion Internal Integration API for extracting pages and databases.
- Incremental sync via `last_edited_time`.
- Mapping Notion blocks → `RawNode` via `SourceAdapter`.
- Cross-source linking: Notion ↔ Obsidian ↔ Code.

### Google Docs / Drive (P2)

- Google Drive API for document access.
- Conversion Google Docs → Markdown → semantic chunks.
- Sync via Drive push notifications.

### Confluence (P2)

- REST API v2 for reading Confluence pages.
- Automatic linking Confluence spec ↔ code implementation.

### Jira / Linear (P3)

- Issue ↔ code linking (by branch names, commit messages, PR descriptions).
- Issue → Note node in graph.

### Web Bookmarks / Saved Articles (P3)

- Import saved articles (Pocket, Raindrop, browser bookmarks).
- Extract key ideas → link with notes and code.

---

## MCP Tools Expansion

### `suggest_links`

- AI analyzes new files and suggests potential links.
- User confirms or rejects proposed edges.

### `explain_dependency`

- Explains dependency chain between two arbitrary nodes.
- Shortest path + human-readable description of each edge.

### `generate_summary`

- Automatic generation of subgraph summary (via LLM).
- "Here's everything related to auth module: 3 notes, 5 functions, 2 TODOs".

### `time_travel`

- History of node changes: when created, how many times updated, how links changed.

---

## Technical Improvements

### Multi-language AST

- Add Go, Rust, Java, C# support in Code Indexer via respective Tree-sitter grammars.

### Incremental Embedding Updates

- Update embeddings only for changed chunks instead of full reindexing.
- Content hashing to detect changes.

### Vector Store Migration

- Migration from BLOB storage to specialized vector store (Qdrant, Milvus — but embedded/local variant).
- `sqlite-vss` for lightweight vector search.

### Multi-vault / Multi-project

- Support multiple Obsidian vaults simultaneously.
- Support monorepos and multi-project setups.
- Cross-project linking.

### Graph Visualization

- Web UI for graph visualization (D3.js / Cytoscape.js).
- MCP resource generating SVG/HTML graph preview.

### Plugin System

- Plugin system for custom Source Adapters.
- npm packages as plugins: `lkgb-plugin-notion`, `lkgb-plugin-jira`.

---

## UX Improvements

### Auto-tagging

- Automatic tag addition to notes based on content (via LLM or keyword extraction).

### Smart Notifications

- Notifications when note is "stale" (code changed, documentation didn't).

### Obsidian Plugin

- Native Obsidian plugin to display LKGB links directly in Obsidian sidebar.

### VS Code Extension

- Inline annotations: show related notes directly in code (like CodeLens).
