/**
 * `px-mcp` — the MCP server (FR-22, NFR-5).
 *
 * stdio is the only transport. Nothing in this process opens a socket: the
 * tools run the same CLI code the binary runs, and stdout carries protocol
 * frames only. Everything a human might want to read goes to stderr.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { callTool, isToolName, type Params, TOOL_DEFINITIONS } from './tools.js';

export const SERVER_INFO = { name: 'px', version: '1.0.0' } as const;

function diagnostic(message: string): void {
  process.stderr.write(`px-mcp: ${message}\n`);
}

export function createPxServer(): Server {
  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS as Tool[],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    if (!isToolName(name)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              v: 1,
              ok: false,
              error: {
                code: 'E_USAGE',
                message: `Unknown tool "${name}"`,
                hint: 'Call tools/list to see the six px tools.',
              },
            }),
          },
        ],
        isError: true,
      };
    }
    return callTool(name, (request.params.arguments ?? {}) as Params);
  });

  return server;
}

async function main(): Promise<void> {
  const server = createPxServer();
  const transport = new StdioServerTransport();
  transport.onerror = (error: Error) => {
    diagnostic(error.message);
  };
  // Stdin EOF is the client hanging up: close cleanly rather than idling.
  process.stdin.on('end', () => {
    void server.close().finally(() => {
      process.exit(0);
    });
  });
  process.on('uncaughtException', (error: Error) => {
    diagnostic(`uncaught: ${error.message}`);
    process.exitCode = 1;
  });
  await server.connect(transport);
}

await main();
