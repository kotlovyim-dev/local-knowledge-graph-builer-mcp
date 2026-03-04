# LKGB — Development Workflow

## Git Workflow

### Branches

```
main                     ← stable release
  └── dev                ← integration branch (all features merged here)
       ├── feature/...   ← branches for task groups
       └── fix/...       ← branches for fixes
```

- **`main`** — always contains working, tested code.
- **`dev`** — base development branch. All feature branches are created from `dev` and merged back to `dev`.
- **`feature/<name>`** — branch for a group of related tasks (one feature or one phase step).
- **`fix/<name>`** — branch for bug fixes.

### Rule: Commit every task

Each individual task from [implementation-plan.md](implementation-plan.md) = **separate commit**. This ensures:

- Clear change history.
- Ability to use `git bisect` for finding regressions.
- Code review at the level of individual tasks.

---

## Pipeline: from task to merge

### Step 1: Select a task group

Open [implementation-plan.md](implementation-plan.md) and take the next task group (e.g., "Phase 1, Group 1: Project Setup").

### Step 2: Create feature branch from dev

```bash
git checkout dev
git pull origin dev
git checkout -b feature/<group-name>
```

**Example names:**

| Task Group            | Branch Name                |
| --------------------- | -------------------------- |
| Project Setup         | `feature/project-setup`    |
| Markdown Indexer      | `feature/markdown-indexer` |
| Code Indexer          | `feature/code-indexer`     |
| SQLite Graph DB       | `feature/sqlite-graph`     |
| MCP Tools Basic       | `feature/mcp-tools-basic`  |
| Embedding Integration | `feature/embeddings`       |
| Semantic Linking      | `feature/semantic-linking` |
| File Watcher          | `feature/file-watcher`     |
| Drift Detection       | `feature/drift-detection`  |
| Notion Integration    | `feature/notion-source`    |

### Step 3: Execute tasks and commit each separately

For each task in the group:

```bash
# 1. Execute task
# 2. Add changes
git add .

# 3. Commit with convention
git commit -m "<type>(<scope>): <short description>

- <detail 1>
- <detail 2>

Task: #<task-id>"
```

**Commit Convention:**

| Type       | Description                         |
| ---------- | ----------------------------------- |
| `feat`     | New functionality                   |
| `fix`      | Bug fix                             |
| `refactor` | Refactoring without behavior change |
| `test`     | Adding/changing tests               |
| `docs`     | Documentation changes               |
| `chore`    | Configuration, dependencies, CI     |
| `style`    | Formatting (without logic change)   |

**Scope** = module or area: `ingestion`, `graph`, `tools`, `config`, `watcher`, `notion`.

**Example commits:**

```
feat(ingestion): add Markdown parser for WikiLinks and tags

- Parse [[WikiLinks]] with regex
- Extract #tags from content
- Extract YAML frontmatter metadata

Task: #1.2.1

---

feat(graph): create SQLite schema for nodes and edges

- Create nodes table with FTS5 index
- Create edges table with composite PK
- Add migration script

Task: #1.3.1

---

test(ingestion): add unit tests for Markdown parser

- Test WikiLink extraction
- Test tag extraction
- Test frontmatter parsing
- Edge cases: empty files, nested links

Task: #1.2.3
```

### Step 4: Push and Pull Request

```bash
git push origin feature/<group-name>
```

Create PR: `feature/<group-name>` → `dev`

PR should contain:

- Description of what was done (which tasks from implementation-plan.md).
- Checklist of tasks.
- Screenshots / log outputs if applicable.

### Step 5: Merge to dev

After review (or self-review):

```bash
git checkout dev
git merge --no-ff feature/<group-name>
git push origin dev
```

`--no-ff` preserves merge commit for clear history.

### Step 6: Release (dev → main)

When phase is complete and tested:

```bash
git checkout main
git merge --no-ff dev
git tag v<version>
git push origin main --tags
```

---

## Full Cycle (Visualized)

```
implementation-plan.md → Select group → feature/<name> from dev
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
               Task #1    Task #2    Task #3
               commit     commit     commit
                    │         │         │
                    └─────────┼─────────┘
                              │
                         Push + PR
                              │
                        Merge → dev
                              │
                     (Phase complete?)
                              │
                        Merge → main
                              │
                         Tag: v1.0.0
```

---

## Checklist before commit

- [ ] Code compiles without errors (`npm run build`).
- [ ] Linter passes (`npm run lint`).
- [ ] Existing tests pass (`npm test`).
- [ ] New tests written (if task includes tests).
- [ ] Commit message follows convention.
- [ ] Task ID specified in commit.
