import * as fs from 'fs/promises';
import * as path from 'path';
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import { SourceAdapter, RawNode, RawLink, SourceConfig } from './types.js';

export class CodeIndexer implements SourceAdapter {
    id = 'code';
    name = 'Code Indexer (Tree-sitter)';
    private codePaths: string[] = [];
    private tsParser: Parser;
    private pyParser: Parser;

    constructor() {
        this.tsParser = new Parser();
        this.tsParser.setLanguage(TypeScript.typescript as Parser.Language);

        this.pyParser = new Parser();
        this.pyParser.setLanguage(Python as Parser.Language);
    }

    async init(config: SourceConfig): Promise<void> {
        this.codePaths = config.paths || [];
        if (this.codePaths.length === 0) {
            throw new Error("CodeIndexer requires at least one path in config");
        }
        for (const p of this.codePaths) {
            const stat = await fs.stat(p);
            if (!stat.isDirectory() && !stat.isFile()) {
                throw new Error(`Path is invalid: ${p}`);
            }
        }
    }

    async scan(): Promise<RawNode[]> {
        const nodes: RawNode[] = [];
        for (const p of this.codePaths) {
            const isDir = (await fs.stat(p)).isDirectory();
            if (isDir) {
                const files = await this.walkDir(p);
                for (const file of files) {
                    nodes.push(...await this.processFile(file));
                }
            } else {
                nodes.push(...await this.processFile(p));
            }
        }
        return nodes;
    }

    async dispose(): Promise<void> {
        // Nothing to dispose
    }

    private async walkDir(dir: string): Promise<string[]> {
        const results: string[] = [];
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            const name = file.name;
            if (name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === 'build') continue;

            const fullPath = path.join(dir, name);
            if (file.isDirectory()) {
                results.push(...await this.walkDir(fullPath));
            } else if (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.py')) {
                results.push(fullPath);
            }
        }
        return results;
    }

    private async processFile(filePath: string): Promise<RawNode[]> {
        const ext = path.extname(filePath);
        const code = await fs.readFile(filePath, 'utf8');

        if (ext === '.ts' || ext === '.js') {
            return this.parseTypeScript(code, filePath);
        } else if (ext === '.py') {
            return this.parsePython(code, filePath);
        }
        return [];
    }

    private extractImportsAndTodos(root: Parser.SyntaxNode): { imports: string[], todos: string[] } {
        const imports: string[] = [];
        const todos: string[] = [];

        const walk = (node: Parser.SyntaxNode) => {
            // JS/TS Imports
            if (node.type === 'import_statement') {
                const sourceNode = node.namedChildren.find(c => c.type === 'string' || c.type === 'string_fragment');
                if (sourceNode) {
                    const text = sourceNode.text.replace(/['"]/g, '');
                    imports.push(text);
                }
            }
            // Python Imports
            if (node.type === 'import_statement' || node.type === 'import_from_statement') {
                const moduleNode = node.namedChildren.find(c => c.type === 'dotted_name');
                if (moduleNode) {
                    imports.push(moduleNode.text);
                }
            }

            // Comments
            if (node.type === 'comment') {
                if (node.text.toLowerCase().includes('todo')) {
                    todos.push(node.text);
                }
            }

            for (const child of node.namedChildren) {
                walk(child);
            }
        };

        walk(root);
        return { imports, todos };
    }

    private parseTypeScript(code: string, filePath: string): RawNode[] {
        const tree = this.tsParser.parse(code);
        const nodes: RawNode[] = [];

        const { imports, todos } = this.extractImportsAndTodos(tree.rootNode);

        const links: RawLink[] = imports.map(imp => ({
            target: imp,
            type: 'DERIVED_FROM'
        })); // Map imports as DERIVED_FROM edges initially

        // Module Node
        nodes.push({
            sourceId: this.id,
            nodeType: 'code_entity',
            id: filePath,
            path: filePath,
            name: path.basename(filePath),
            content: code,
            metadata: { type: 'module', language: 'typescript', todos },
            links
        });

        // Functions and Classes
        const walk = (node: Parser.SyntaxNode) => {
            if (node.type === 'function_declaration' || node.type === 'class_declaration' || node.type === 'method_definition') {
                const nameNode = node.namedChildren.find(c =>
                    c.type === 'identifier' ||
                    c.type === 'property_identifier' ||
                    c.type === 'type_identifier'
                );
                if (nameNode) {
                    const typeLabel = node.type.split('_')[0]; // "function", "class", "method"
                    nodes.push({
                        sourceId: this.id,
                        nodeType: 'code_entity',
                        id: `${filePath}#${nameNode.text}`,
                        path: filePath,
                        name: nameNode.text,
                        content: node.text,
                        metadata: {
                            type: typeLabel,
                            language: 'typescript',
                            startPosition: node.startPosition,
                            endPosition: node.endPosition
                        },
                        links: []
                    });
                }
            }
            for (const child of node.namedChildren) {
                walk(child);
            }
        };

        walk(tree.rootNode);
        return nodes;
    }

    private parsePython(code: string, filePath: string): RawNode[] {
        const tree = this.pyParser.parse(code);
        const nodes: RawNode[] = [];

        const { imports, todos } = this.extractImportsAndTodos(tree.rootNode);

        const links: RawLink[] = imports.map(imp => ({
            target: imp,
            type: 'DERIVED_FROM'
        }));

        nodes.push({
            sourceId: this.id,
            nodeType: 'code_entity',
            id: filePath,
            path: filePath,
            name: path.basename(filePath),
            content: code,
            metadata: { type: 'module', language: 'python', todos },
            links
        });

        const walk = (node: Parser.SyntaxNode) => {
            if (node.type === 'function_definition' || node.type === 'class_definition') {
                const nameNode = node.namedChildren.find(c => c.type === 'identifier');

                // Extract docstring
                let docstring = '';
                const block = node.namedChildren.find(c => c.type === 'block');
                if (block && block.namedChildren.length > 0) {
                    const firstStmt = block.namedChildren[0];
                    if (firstStmt.type === 'expression_statement' && firstStmt.namedChildren[0]?.type === 'string') {
                        // In latest tree-sitter-python, strings contain string_start, string_content, string_end
                        const strContent = firstStmt.namedChildren[0].namedChildren.find(c => c.type === 'string_content');
                        if (strContent) {
                            docstring = strContent.text;
                        } else {
                            docstring = firstStmt.namedChildren[0].text;
                        }
                    }
                }

                if (nameNode) {
                    nodes.push({
                        sourceId: this.id,
                        nodeType: 'code_entity',
                        id: `${filePath}#${nameNode.text}`,
                        path: filePath,
                        name: nameNode.text,
                        content: docstring || node.text,
                        metadata: {
                            type: node.type === 'function_definition' ? 'function' : 'class',
                            language: 'python',
                            startPosition: node.startPosition,
                            endPosition: node.endPosition
                        },
                        links: []
                    });
                }
            }
            for (const child of node.namedChildren) {
                walk(child);
            }
        };

        walk(tree.rootNode);
        return nodes;
    }
}
