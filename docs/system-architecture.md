# LKGB — Technical Architecture

## Overview

The system is built with a modular three-layer architecture, where each layer can evolve independently. The architecture is designed with **extensibility of data sources** in mind — in addition to Obsidian and local code, Notion, Google Docs, Confluence, and others will be supported in the future.

```
┌──────────────────────────────────────────────────────────────┐
│                     MCP Layer (Interface)                     │
│          Tools & Resources for Claude / Cursor / LLM          │
├──────────────────────────────────────────────────────────────┤
│                  Graph & Semantic Engine (Core)                │
│         Graph DB  ·  Embeddings  ·  Linker Algorithm          │
├──────────────────────────────────────────────────────────────┤
│                    Ingestion Layer (Sources)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Markdown │  │  Code    │  │  Notion  │  │  Future      │ │
│  │ Indexer  │  │  Indexer │  │  Indexer │  │  Sources     │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. Ingestion Layer (Data Collection)

Responsible for extracting structured information from various sources. Each source implements a single **Source Adapter Interface**.

### Source Adapter Interface

```typescript
interface SourceAdapter {
    id: string; // "obsidian" | "code" | "notion" | ...
    name: string; // Human-readable name
    init(config: SourceConfig): Promise<void>;
    scan(): Promise<RawNode[]>; // Full scan
    watch?(callback: WatchCallback): void; // Optional real-time monitoring
    dispose(): Promise<void>;
}

interface RawNode {
    sourceId: string; // Adapter ID
    nodeType: NodeType; // "note" | "code_entity" | "tag" | "page"
    id: string; // Unique identifier
    path: string; // Path or URI
    content: string; // Text content
    metadata: Record<string, unknown>; // Arbitrary metadata
    links: RawLink[]; // Extracted links (hard links)
}
```

### 1.1. Markdown Indexer (Obsidian)

- Scans Obsidian Vault (recursive traversal of `.md` files).
- Extracts:
    - `[[WikiLinks]]` → hard links to other notes or code files.
    - `#tags` → creates Tag nodes.
    - YAML frontmatter → node metadata.
- Splits long notes into **semantic chunks** (by H1-H3 headings).
- **Watch mode:** `chokidar` for monitoring file system changes.

### 1.2. Code Indexer (Tree-sitter)

- Analyzes project source code (Python, TypeScript/JavaScript, Go).
- Uses **Tree-sitter** to build AST.
- Extracts:
    - Functions and methods → `CodeEntity` (type: function).
    - Classes → `CodeEntity` (type: class).
    - Modules → `CodeEntity` (type: module).
    - Docstrings and `// TODO` comments → content for embeddings.
    - Import dependencies → edges between CodeEntity.
- **Watch mode:** `chokidar` / `watchdog` for monitoring changes.

### 1.3. Notion Indexer (Future Extension)

- Connection via **Notion Internal Integration API**.
- Extracts pages, databases, blocks.
- Maps Notion blocks to `RawNode` structure:
    - Notion Page → `note` node
    - Database entries → `note` nodes with filtering
    - Text blocks → semantic chunks
- **Sync strategy:** Incremental sync via `last_edited_time` cursor.
- Configuration: `notion_token`, `root_page_id`, `sync_interval`.

### 1.4. Other Future Sources

Thanks to the `SourceAdapter` interface, adding new sources boils down to creating a new adapter:

| Source        | Implementation             | Priority      |
| ------------- | -------------------------- | ------------- |
| Notion        | Notion API → RawNode       | P1 (post-MVP) |
| Google Docs   | Google Drive API → RawNode | P2            |
| Confluence    | REST API → RawNode         | P2            |
| Jira          | Issue → Note node          | P3            |
| Web Bookmarks | URL scraping → RawNode     | P3            |

---

## 2. Graph & Semantic Engine (Core)

The central layer that stores the graph and handles semantic linking.

### 2.1. Graph Schema

```
┌─────────┐     MENTIONS      ┌────────────┐
│  Note    │ ───────────────→  │ CodeEntity │
│          │     IMPLEMENTS    │            │
│          │ ←───────────────  │            │
└────┬─────┘                   └─────┬──────┘
     │                               │
     │ HAS_TAG                       │ IMPORTS
     ▼                               ▼
┌─────────┐                   ┌────────────┐
│   Tag   │                   │ CodeEntity │
└─────────┘                   └────────────┘
```

**Nodes:**

| Type         | Fields                                                 | Example                  |
| ------------ | ------------------------------------------------------ | ------------------------ |
| `Note`       | id, path, content, source, chunk_index                 | Obsidian MD, Notion page |
| `CodeEntity` | id, path, name, type (function/class/module), language | Python function          |
| `Tag`        | id, name                                               | `#to-implement`          |

**Edges:**

| Type           | From → To               | How determined                           |
| -------------- | ----------------------- | ---------------------------------------- |
| `MENTIONS`     | Note → CodeEntity       | WikiLink or keyword match                |
| `IMPLEMENTS`   | CodeEntity → Note       | Semantic similarity > threshold          |
| `HAS_TAG`      | Note → Tag              | Parsing `#tag` from Markdown             |
| `IMPORTS`      | CodeEntity → CodeEntity | AST import analysis                      |
| `SIMILAR_TO`   | Note → Note             | Cosine similarity > threshold            |
| `DERIVED_FROM` | Note → Note             | Cross-source linking (Obsidian ↔ Notion) |

### 2.2. Graph Database

**MVP:** SQLite with tables:

```sql
-- Nodes
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,       -- 'note' | 'code_entity' | 'tag'
  source TEXT NOT NULL,     -- 'obsidian' | 'code' | 'notion'
  path TEXT,
  name TEXT,
  content TEXT,
  metadata JSON,
  embedding BLOB            -- vector (optional)
);

-- Edges
CREATE TABLE edges (
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,        -- 'MENTIONS' | 'IMPLEMENTS' | 'HAS_TAG' | ...
  weight REAL DEFAULT 1.0,   -- link strength (for soft links)
  metadata JSON,
  PRIMARY KEY (source_id, target_id, type),
  FOREIGN KEY (source_id) REFERENCES nodes(id),
  FOREIGN KEY (target_id) REFERENCES nodes(id)
);

-- FTS index
CREATE VIRTUAL TABLE nodes_fts USING fts5(name, content, content=nodes, content_rowid=rowid);
```

**Production:** Migration to **KùzuDB** for full support of graph queries (Cypher-like query language, native graph traversal).

### 2.3. Local Embedding Provider

- **Engine:** Ollama (`nomic-embed-text` or `all-minilm`) → `http://localhost:11434/api/embeddings`
- **Fallback:** `SentenceTransformers` (Python) for offline mode.
- Generates vectors for:
    - Semantic chunks of notes.
    - Docstrings and comments in code.
- Stores vectors in `nodes.embedding` (BLOB) or separate vector store.

### 2.4. Linker (Linking Algorithm)

Runs after each scan or update:

1. **Hard linking:**
    - WikiLink `[[auth-service]]` → searches for CodeEntity with `name = "auth-service"` or `path LIKE '%auth-service%'`.
    - Note name matches code file name.

2. **Soft linking:**
    - For each new/updated node, computes embedding.
    - Cosine similarity against all nodes of other type (Note ↔ CodeEntity).
    - If similarity > `THRESHOLD` (default 0.75) → creates `IMPLEMENTS` or `SIMILAR_TO` edge.

3. **Cross-source linking (for Notion and others):**
    - Notion page title ↔ Obsidian note title → `DERIVED_FROM` edge.
    - Semantic comparison of content from different sources.

---

## 3. MCP Layer (Interface)

Provides tools (Tools) and resources (Resources) through Model Context Protocol.

### 3.1. Tools

#### `get_graph_context`

```typescript
{
  name: "get_graph_context",
  description: "Returns subgraph (1st and 2nd level neighbors) for an entity",
  inputSchema: {
    type: "object",
    properties: {
      entity_id: { type: "string", description: "File path or node ID" },
      depth: { type: "number", default: 2, description: "Traversal depth" },
      source_filter: { type: "string", description: "Filter by source: obsidian|code|notion|all" }
    },
    required: ["entity_id"]
  }
}
```

#### `find_implementation`

```typescript
{
  name: "find_implementation",
  description: "Find code that implements a concept from a note",
  inputSchema: {
    type: "object",
    properties: {
      note_path: { type: "string", description: "Path to Markdown/Notion page" }
    },
    required: ["note_path"]
  }
}
```

#### `detect_drift`

```typescript
{
  name: "detect_drift",
  description: "Find orphaned functions and unimplemented ideas",
  inputSchema: {
    type: "object",
    properties: {
      scope: { type: "string", enum: ["all", "orphan_code", "unimplemented_notes"] }
    }
  }
}
```

#### `search_graph`

```typescript
{
  name: "search_graph",
  description: "Semantic or keyword search across the graph",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      mode: { type: "string", enum: ["semantic", "keyword", "hybrid"], default: "hybrid" },
      source_filter: { type: "string", description: "Filter by source" },
      limit: { type: "number", default: 10 }
    },
    required: ["query"]
  }
}
```

### 3.2. Resources

```typescript
// Graph statistics
{
  uri: "graph://stats",
  name: "Graph Statistics",
  description: "Number of nodes, edges, sources"
}

// Source configuration
{
  uri: "graph://sources",
  name: "Configured Sources",
  description: "List of connected sources and their status"
}
```

### 3.3. Transport

- **Primary:** `stdio` (for Claude Desktop, Cursor).
- **Secondary:** HTTP/SSE (for web clients, debugging).

---

## 4. Project Structure

```
local-knowledge-graph-builder-mcp/
├── src/
│   ├── index.ts                    # Entry point, MCP server init
│   ├── server.ts                   # MCP server configuration
│   ├── config.ts                   # Configuration loader
│   │
│   ├── ingestion/                  # Ingestion Layer
│   │   ├── types.ts                # SourceAdapter interface, RawNode
│   │   ├── markdown-indexer.ts     # Obsidian Vault parser
│   │   ├── code-indexer.ts         # Tree-sitter code parser
│   │   ├── notion-indexer.ts       # Notion API adapter (future)
│   │   └── watcher.ts             # File system watcher (chokidar)
│   │
│   ├── graph/                      # Graph & Semantic Engine
│   │   ├── schema.ts               # Graph schema definitions
│   │   ├── database.ts             # SQLite / KùzuDB wrapper
│   │   ├── linker.ts               # Hard & Soft linking logic
│   │   └── embeddings.ts           # Ollama embedding client
│   │
│   ├── tools/                      # MCP Tools
│   │   ├── get-graph-context.ts
│   │   ├── find-implementation.ts
│   │   ├── detect-drift.ts
│   │   └── search-graph.ts
│   │
│   └── utils/                      # Utilities
│       ├── logger.ts
│       ├── chunker.ts              # Text chunking logic
│       └── similarity.ts           # Cosine similarity helpers
│
├── tests/
│   ├── ingestion/
│   ├── graph/
│   └── tools/
│
├── docs/
│   ├── project.md
│   ├── product-vision.md
│   ├── system-architecture.md
│   ├── development-workflow.md
│   └── implementation-plan.md
│
├── package.json
├── tsconfig.json
├── .eslintrc.json
└── README.md
```

---

## 5. Data Flow

```
1. [Source Files Changed]
       │
       ▼
2. [Ingestion Layer]
   ├── Markdown Indexer → RawNode[]
   ├── Code Indexer     → RawNode[]
   └── Notion Indexer   → RawNode[]  (future)
       │
       ▼
3. [Graph Engine]
   ├── Upsert nodes into DB
   ├── Generate embeddings (Ollama)
   ├── Run Linker:
   │   ├── Hard links (name matching, WikiLinks)
   │   └── Soft links (cosine similarity)
   └── Update edges
       │
       ▼
4. [MCP Layer]
   ├── get_graph_context → subgraph JSON
   ├── find_implementation → matched code entities
   ├── detect_drift → orphan report
   └── search_graph → ranked results
       │
       ▼
5. [LLM Client]
   Claude / Cursor uses context for responses
```
