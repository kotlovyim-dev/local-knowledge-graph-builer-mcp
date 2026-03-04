# LKGB — Product Vision

## Problem

Developers and researchers work simultaneously with two types of knowledge:

1. **Documentation / Notes** — ideas, specifications, notes in Obsidian, Markdown files.
2. **Code** — implementation of these ideas as functions, classes, modules.

These two worlds exist **in isolation**. Finding the connection between a note "Recommendation Algorithm v2" and a function `recommend_items()` requires manual switching between tools, developer memory, or regex searches.

**Existing MCP servers** (e.g., `mcp-obsidian`, `filesystem-mcp`) only give the LLM read access to files — they don't understand **links** between content.

## Solution

**Local Knowledge Graph Builder (LKGB)** — an MCP server that automatically builds a **semantic knowledge graph** from local files:

- Scans Obsidian Vault (Markdown, WikiLinks, tags, YAML frontmatter).
- Analyzes code (AST via Tree-sitter: functions, classes, docstrings, TODO comments).
- Connects documentation to code through **hard links** (name matches) and **soft links** (cosine similarity of embeddings).
- Provides AI assistants (Claude, Cursor) ready context: "What depends on what".

## Key Principles

### 1. Zero-Cloud Privacy

100% local processing. No data leaves the developer's machine. Embeddings are generated via Ollama (locally), graph is stored in an embedded database.

### 2. Semantic Linking

Not just regex search, but true semantic linking:

- **Hard links:** `[[WikiLink]]` → code file, matching function names with note names.
- **Soft links:** Comparing vector embeddings of note paragraphs and code docstrings.

### 3. Contextual Awareness for LLM

The LLM receives not "raw file text" but a structured subgraph:

- Reduced token usage.
- Reduced hallucinations (LLM sees real connections).
- Audit capability: detecting "orphaned" functions (without documentation) and unimplemented ideas (`#to-implement`).

## Target Audience

- Developers who keep notes in Obsidian alongside code.
- Teams that want to automate tracking of specification ↔ implementation alignment.
- Researchers working with large knowledge bases and codebases.

## Unique Value (Value Proposition)

| Existing Solutions      | LKGB                            |
| ----------------------- | ------------------------------- |
| File Access (read-only) | Building a link graph           |
| Regex/keyword search    | Semantic search (embeddings)    |
| Cloud indexing          | 100% local                      |
| File = unit             | Function/class/paragraph = unit |
| Manual context linking  | Automatic Note ↔ Code links     |
