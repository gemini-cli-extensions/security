#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { getAuditScope } from './filesystem.js';
import { findLineNumbers } from './security.js';

const server = new McpServer({
  name: 'gemini-cli-security',
  version: '0.1.0',
});

server.tool(
  'find_line_numbers',
  'Finds the line numbers of a code snippet in a file.',
  {
    filePath: z
      .string()
      .describe('The path to the file to with the security vulnerability.'),
    snippet: z
      .string()
      .describe('The code snippet to search for inside the file.'),
  },
  (input) => findLineNumbers(input, { fs, path })
);

server.tool(
  'get_audit_scope',
  'Checks if the current directory is a GitHub repository.',
  {},
  () => {
    const diff = getAuditScope();
    return {
      content: [
        {
          type: 'text',
          text: diff,
        },
      ],
    };
  }
);

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer();
