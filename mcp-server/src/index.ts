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

import { validatePocParams, runPoc } from './poc.js';

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

server.tool(
  'validate_poc_params',
  'Validates the parameters for the PoC generation.',
  {
    vulnerabilityType: z.string().describe('The type of vulnerability.'),
    sourceCode: z.string().describe('The source code of the vulnerable file.'),
  },
  (input) => validatePocParams(input)
);

server.tool(
  'run_poc',
  'Runs the generated PoC code.',
  {
    code: z.string().describe('The PoC code to run.'),
  },
  (input) => runPoc(input)
);

server.registerPrompt(
  'security:note-adder',
  {
    title: 'Note Adder',
    description: 'Creates a new note file or adds a new entry to an existing one, ensuring content consistency.',
    argsSchema: {
      notePath: z.string().describe('The path to the note file.'),
      content: z.string().describe('The content of the note entry to add.'),
    },
  },
  ({ notePath, content }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are a helpful assistant that helps users maintain notes. Your task is to add a new entry to the notes file at '.gemini_security/${notePath}'.

You MUST use the 'ReadFile' and 'WriteFile' tools.

**Workflow:**

1.  **Read the file:** First, you MUST attempt to read the file at '.gemini_security/${notePath}' using the 'ReadFile' tool.

2.  **Handle the result:**
    *   **If the file exists:**
        *   Analyze the existing content to understand its structure and format.
        *   **Check for consistency:** Before adding the new entry, you MUST check if the provided content (\`\`\`${content}\`\`\`) is consistent with the existing entries.
        *   **If it is not consistent:** You MUST ask the user for clarification. Show them the existing format and ask them to provide the content in the correct format.
        *   Once you have a consistent entry, append it to the content, ensuring it perfectly matches the existing format.
        *   Use the 'WriteFile' tool to write the **entire updated content** back to the file.
    *   **If the file does NOT exist (ReadFile returns an error):**
        *   First, if the '.gemini_security' directory doesn't exist, create it. 
        *   This is a new note. You MUST ask the user to define a template for this note.
        *   Once the user provides a template, construct the initial file content. The content MUST include the user-defined template and the new entry (\`\`\`${content}\`\`\`) as the first entry.
        *   Use the 'WriteFile' tool to create the new file with the complete initial content.

Your primary goal is to maintain strict consistency with the format of the note file. Do not introduce any formatting changes.`,
        },
      },
    ],
  }),
);

server.registerPrompt(
  'poc',
  {
    title: 'PoC Generator',
    description: 'Generates a Proof-of-Concept (PoC) for a given vulnerability.',
    argsSchema: {
      vulnerabilityType: z.string().optional().describe('The type of vulnerability.'),
      sourceCode: z.string().optional().describe('The source code of the vulnerable file.'),
    },
  },
  ({ vulnerabilityType, sourceCode }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are a security expert. Your task is to generate a Proof-of-Concept (PoC) for a vulnerability.

Input Parameters:
- Vulnerability Type: ${vulnerabilityType || 'Not provided'}
- Source Code: ${sourceCode || 'Not provided'}

**Workflow:**

1.  **Validate Parameters:**
    *   If 'vulnerabilityType' or 'sourceCode' are NOT provided, you MUST ask the user for them.
    *   If they ARE provided, you MUST use the 'validate_poc_params' tool to validate them.

2.  **Generate PoC:**
    *   Once parameters are validated, generate a Node.js script that demonstrates the vulnerability under the '.gemini_security/poc/' directory; create the directory if it doesn't exist.
    *   The script should be self-contained and executable.

3.  **Run PoC:**
    *   Ask the user for confirmation to run the generated PoC.
    *   If confirmed, use the 'run_poc' tool with absolute file paths to execute the code.
    *   Analyze the output to verify if the vulnerability is reproducible.`,
        },
      },
    ],
  }),
);

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer();
