import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
    name: 'lkgb-mcp',
    version: '0.1.0',
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('LKGB MCP server started on stdio');
}

main().catch((error) => {
    console.error('Fatal error starting LKGB MCP server:', error);
    process.exit(1);
});
