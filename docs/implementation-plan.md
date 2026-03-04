# LKGB — Implementation Plan

> Each task = separate commit. Task groups = separate feature branch from `dev`.
> See [development-workflow.md](development-workflow.md) for git workflow details.

---

## Phase 1: Basic Parsing and MCP (MVP)

### Group 1: Project Setup — `feature/project-setup`

| ID    | Task                                                              | Status |
| ----- | ----------------------------------------------------------------- | ------ |
| 1.1.1 | Initialize Node.js project (`npm init`, `package.json`)           | ☐      |
| 1.1.2 | Configure TypeScript (`tsconfig.json`, strict mode)               | ☐      |
| 1.1.3 | Configure ESLint + Prettier                                       | ☐      |
| 1.1.4 | Add `@modelcontextprotocol/sdk` as dependency                     | ☐      |
| 1.1.5 | Create base folder structure (`src/`, `tests/`, `docs/`)          | ☐      |
| 1.1.6 | Create entry point `src/index.ts` with minimal MCP server (stdio) | ☐      |
| 1.1.7 | Add npm scripts: `build`, `start`, `dev`, `lint`, `test`          | ☐      |
| 1.1.8 | Create `.gitignore`, `.env.example`                               | ☐      |

---

### Group 2: Configuration — `feature/configuration`

| ID    | Task                                                                              | Status |
| ----- | --------------------------------------------------------------------------------- | ------ |
| 1.2.1 | Define configuration interface (`src/config.ts`): vault paths, code dirs, DB path | ☐      |
| 1.2.2 | Implement config loading from `lkgb.config.json` or env variables                 | ☐      |
| 1.2.3 | Add config validation (path existence check)                                      | ☐      |
| 1.2.4 | Write tests for config loader                                                     | ☐      |

---

### Group 3: Ingestion Types & Interface — `feature/ingestion-types`

| ID    | Task                                                        | Status |
| ----- | ----------------------------------------------------------- | ------ |
| 1.3.1 | Define `SourceAdapter` interface (`src/ingestion/types.ts`) | ☐      |
| 1.3.2 | Define `RawNode`, `RawLink`, `NodeType` types               | ☐      |
| 1.3.3 | Create `SourceRegistry` — registry of source adapters       | ☐      |

---

### Group 4: Markdown Indexer — `feature/markdown-indexer`

| ID    | Task                                                      | Status |
| ----- | --------------------------------------------------------- | ------ |
| 1.4.1 | Implement recursive vault folder scanning (`.md` files)   | ☐      |
| 1.4.2 | Parse `[[WikiLinks]]` from text (regex)                   | ☐      |
| 1.4.3 | Parse `#tags` from text (regex)                           | ☐      |
| 1.4.4 | Parse YAML frontmatter (`gray-matter` library)            | ☐      |
| 1.4.5 | Split long notes into semantic chunks (by H1-H3 headings) | ☐      |
| 1.4.6 | Convert results to `RawNode[]`                            | ☐      |
| 1.4.7 | Implement `SourceAdapter` interface in `MarkdownIndexer`  | ☐      |
| 1.4.8 | Write unit tests for Markdown Indexer                     | ☐      |

---

### Group 5: Code Indexer (Tree-sitter) — `feature/code-indexer`

| ID    | Task                                                               | Status |
| ----- | ------------------------------------------------------------------ | ------ |
| 1.5.1 | Install `tree-sitter` and language bindings (Python, TypeScript)   | ☐      |
| 1.5.2 | Implement recursive code directory scanning                        | ☐      |
| 1.5.3 | Parse `.ts`/`.js` files: extract functions, classes, methods (AST) | ☐      |
| 1.5.4 | Parse `.py` files: extract functions, classes (AST)                | ☐      |
| 1.5.5 | Extract docstrings and `// TODO` comments                          | ☐      |
| 1.5.6 | Extract import dependencies between modules                        | ☐      |
| 1.5.7 | Convert results to `RawNode[]`                                     | ☐      |
| 1.5.8 | Implement `SourceAdapter` interface in `CodeIndexer`               | ☐      |
| 1.5.9 | Write unit tests for Code Indexer                                  | ☐      |

---

### Group 6: SQLite Graph Storage — `feature/sqlite-graph`

| ID    | Task                                                                       | Status |
| ----- | -------------------------------------------------------------------------- | ------ |
| 1.6.1 | Install `better-sqlite3` (or `sql.js`)                                     | ☐      |
| 1.6.2 | Create SQL schema: `nodes`, `edges` tables                                 | ☐      |
| 1.6.3 | Add FTS5 index for full-text search                                        | ☐      |
| 1.6.4 | Implement `Database` class (`src/graph/database.ts`): CRUD for nodes/edges | ☐      |
| 1.6.5 | Implement upsert logic (insert or update on rescan)                        | ☐      |
| 1.6.6 | Implement query: get N-level neighbors (graph traversal)                   | ☐      |
| 1.6.7 | Write unit tests for Database class                                        | ☐      |

---

### Group 7: Hard Linker — `feature/hard-linker`

| ID    | Task                                                                      | Status |
| ----- | ------------------------------------------------------------------------- | ------ |
| 1.7.1 | Implement `Linker` class (`src/graph/linker.ts`)                          | ☐      |
| 1.7.2 | WikiLink matching: `[[name]]` → search CodeEntity with matching name/path | ☐      |
| 1.7.3 | Filename matching: note name ↔ code file name                             | ☐      |
| 1.7.4 | Create `MENTIONS` edges based on hard links                               | ☐      |
| 1.7.5 | Create `HAS_TAG` edges for tags                                           | ☐      |
| 1.7.6 | Write tests for Hard Linker                                               | ☐      |

---

### Group 8: MCP Server & Basic Tools — `feature/mcp-tools-basic`

| ID    | Task                                                                     | Status |
| ----- | ------------------------------------------------------------------------ | ------ |
| 1.8.1 | Configure MCP Server (`src/server.ts`) with tools/resources registration | ☐      |
| 1.8.2 | Implement tool `get_graph_context` (subgraph for entity)                 | ☐      |
| 1.8.3 | Implement tool `find_implementation` (code for note)                     | ☐      |
| 1.8.4 | Implement tool `search_graph` (keyword search via FTS5)                  | ☐      |
| 1.8.5 | Implement resource `graph://stats` (graph statistics)                    | ☐      |
| 1.8.6 | Implement full pipeline: scan → store → link → query                     | ☐      |
| 1.8.7 | Add Claude Desktop configuration example (`claude_desktop_config.json`)  | ☐      |
| 1.8.8 | End-to-end test: run server with test vault + code                       | ☐      |

---

### Group 9: Logger & Error Handling — `feature/logging`

| ID    | Task                                                                                   | Status |
| ----- | -------------------------------------------------------------------------------------- | ------ |
| 1.9.1 | Create `Logger` utility (`src/utils/logger.ts`) with levels (debug, info, warn, error) | ☐      |
| 1.9.2 | Add logging to all modules (ingestion, graph, tools)                                   | ☐      |
| 1.9.3 | Implement graceful error handling (errors don't crash server)                          | ☐      |
| 1.9.4 | Add structured error responses in MCP tools                                            | ☐      |

---

## Phase 2: Semantics and Soft Linking

### Group 10: Embedding Integration — `feature/embeddings`

| ID    | Task                                                             | Status |
| ----- | ---------------------------------------------------------------- | ------ |
| 2.1.1 | Create `EmbeddingProvider` interface (`src/graph/embeddings.ts`) | ☐      |
| 2.1.2 | Implement Ollama adapter: call `POST /api/embeddings`            | ☐      |
| 2.1.3 | Add batch embedding (process array of texts)                     | ☐      |
| 2.1.4 | Store embeddings in `nodes.embedding` (BLOB / JSON)              | ☐      |
| 2.1.5 | Generate embeddings during scanning (ingestion pipeline)         | ☐      |
| 2.1.6 | Implement fallback: work without Ollama (hard links only)        | ☐      |
| 2.1.7 | Tests for embedding provider (mock Ollama)                       | ☐      |

---

### Group 11: Soft Linker (Semantic Linking) — `feature/semantic-linking`

| ID    | Task                                                              | Status |
| ----- | ----------------------------------------------------------------- | ------ |
| 2.2.1 | Implement cosine similarity utility (`src/utils/similarity.ts`)   | ☐      |
| 2.2.2 | Soft linking: compare embeddings Note ↔ CodeEntity                | ☐      |
| 2.2.3 | Configure threshold for creating `IMPLEMENTS` edge (configurable) | ☐      |
| 2.2.4 | Soft linking: compare embeddings Note ↔ Note (`SIMILAR_TO`)       | ☐      |
| 2.2.5 | Update `search_graph` tool: add `semantic` mode                   | ☐      |
| 2.2.6 | Tests for semantic linker                                         | ☐      |

---

### Group 12: Text Chunker — `feature/text-chunker`

| ID    | Task                                                      | Status |
| ----- | --------------------------------------------------------- | ------ |
| 2.3.1 | Create `Chunker` utility (`src/utils/chunker.ts`)         | ☐      |
| 2.3.2 | Chunking by headings (H1-H3) for Markdown                 | ☐      |
| 2.3.3 | Chunking by functions/classes for code (already via AST)  | ☐      |
| 2.3.4 | Overlap chunking for long sections (configurable overlap) | ☐      |
| 2.3.5 | Tests for chunker                                         | ☐      |

---

## Phase 3: Automation and Live Graph

### Group 13: File Watcher — `feature/file-watcher`

| ID    | Task                                                        | Status |
| ----- | ----------------------------------------------------------- | ------ |
| 3.1.1 | Install `chokidar`                                          | ☐      |
| 3.1.2 | Implement `Watcher` class (`src/ingestion/watcher.ts`)      | ☐      |
| 3.1.3 | Monitor changes in Obsidian vault (add/change/delete `.md`) | ☐      |
| 3.1.4 | Monitor changes in code directories                         | ☐      |
| 3.1.5 | Incremental upsert: update only changed files               | ☐      |
| 3.1.6 | Debounce to avoid excess rebuilds                           | ☐      |
| 3.1.7 | Delete nodes and edges when file is deleted                 | ☐      |
| 3.1.8 | Tests for watcher (mock filesystem events)                  | ☐      |

---

### Group 14: Drift Detection — `feature/drift-detection`

| ID    | Task                                                    | Status |
| ----- | ------------------------------------------------------- | ------ |
| 3.2.1 | Implement tool `detect_drift`                           | ☐      |
| 3.2.2 | Find orphaned CodeEntity (functions without note links) | ☐      |
| 3.2.3 | Find notes with `#to-implement` tag without code links  | ☐      |
| 3.2.4 | Format structured report (JSON)                         | ☐      |
| 3.2.5 | Tests for drift detection                               | ☐      |

---

### Group 15: KùzuDB Migration (Optional) — `feature/kuzudb-migration`

| ID    | Task                                                         | Status |
| ----- | ------------------------------------------------------------ | ------ |
| 3.3.1 | Install KùzuDB Node.js binding                               | ☐      |
| 3.3.2 | Create graph schema in KùzuDB (Node tables, Rel tables)      | ☐      |
| 3.3.3 | Implement `KuzuDatabase` class with same interface as SQLite | ☐      |
| 3.3.4 | Write migration script SQLite → KùzuDB                       | ☐      |
| 3.3.5 | Update configuration: choose DB engine (sqlite / kuzu)       | ☐      |
| 3.3.6 | Tests for KùzuDB wrapper                                     | ☐      |

---

## Phase 4: Polish & Release

### Group 16: Documentation & README — `feature/documentation`

| ID    | Task                                                               | Status |
| ----- | ------------------------------------------------------------------ | ------ |
| 4.1.1 | Write complete `README.md` (installation, configuration, examples) | ☐      |
| 4.1.2 | Add example `lkgb.config.json`                                     | ☐      |
| 4.1.3 | Add Claude Desktop configuration example                           | ☐      |
| 4.1.4 | Add GIF/screenshots of usage                                       | ☐      |

---

### Group 17: CI & Quality — `feature/ci-quality`

| ID    | Task                                     | Status |
| ----- | ---------------------------------------- | ------ |
| 4.2.1 | GitHub Actions: lint + test on PR        | ☐      |
| 4.2.2 | GitHub Actions: build check              | ☐      |
| 4.2.3 | Add code coverage (vitest/jest coverage) | ☐      |
| 4.2.4 | Pre-commit hooks (husky + lint-staged)   | ☐      |

---

## Summary

| Phase               | Groups        | Tasks        | Priority     |
| ------------------- | ------------- | ------------ | ------------ |
| Phase 1: MVP        | Groups 1-9    | 45 tasks     | **CRITICAL** |
| Phase 2: Semantics  | Groups 10-12  | 18 tasks     | HIGH         |
| Phase 3: Automation | Groups 13-15  | 20 tasks     | MEDIUM       |
| Phase 4: Polish     | Groups 16-17  | 8 tasks      | LOW          |
| **Total**           | **17 groups** | **91 tasks** |              |
