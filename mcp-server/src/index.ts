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
import { GraphBuilder, GraphService } from './codemaps/index.js';
import { runPoc } from './poc.js';

const server = new McpServer({
  name: 'gemini-cli-security',
  version: '0.1.0',
});

const SUPPORTED_EXTS = ['.py', '.js', '.ts', 'go'];
const DEFAULT_EXCLUDES = ['.git', 'node_modules', 'dist', 'build', 'venv', '__pycache__'];

async function scan_dir(dir_path: string, excludes = DEFAULT_EXCLUDES, exts = SUPPORTED_EXTS) {
  const files: string[] = [];
  
  async function scan(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (excludes.includes(entry.name)) {
        continue;
      }
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (exts.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir_path);
  return files;
}

const graphService = new GraphService();
const graphBuilder = new GraphBuilder(graphService);
let graphBuilt = false;

server.tool(
  'get_enclosing_entity',
  'Get the nearest enclosing node (function/class) details (name, type, range).',
  {
    filePath: z.string().describe('The path to the file.'),
    line: z.number().describe('The line number.'),
  } as any,
  async (input: any) => {
    const { filePath, line } = input as { filePath: string; line: number };
    if (!graphBuilt) {
      const files = await scan_dir(process.cwd());
      for (const file of files) {
        await graphBuilder.buildGraph(file);
      }
      graphBuilt = true;
    }
    const entity = graphService.findEnclosingEntity(filePath, line);
    if (entity) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(entity, null, 2),
          },
        ],
      };
    } else {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: 'No enclosing entity found.',
                },
            ],
        };
    }
  }
);

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
  } as any,
  (input: { filePath: string; snippet: string }) => findLineNumbers(input, { fs, path })
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
  'run_poc',
  'Runs the generated PoC code.',
  {
    filePath: z.string().describe('The absolute path to the PoC file to run.'),
  } as any,
  (input: { filePath: string }) => runPoc(input)
);

server.registerPrompt(
  'security:note-adder',
  {
    title: 'Note Adder',
    description: 'Creates a new note file or adds a new entry to an existing one, ensuring content consistency.',
    argsSchema: {
      notePath: z.string().describe('The path to the note file.'),
      content: z.string().describe('The content of the note entry to add.'),
    } as any,
  },
  (args: any) => {
    const { notePath, content } = args;
    return {
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
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
    }
  },
);

server.registerPrompt(
  'security:poc',
  {
    title: 'PoC Generator',
    description: '[Experimental] Generates a Proof-of-Concept (PoC) for a given vulnerability.',
    argsSchema: {
      problemStatement: z.string().optional().describe('A description of the security problem or vulnerability.'),
      sourceCodeLocation: z.string().optional().describe('The location of the source code that contains the vulnerability.'),
    } as any,
  },
  (args: any) => {
    const { problemStatement, sourceCodeLocation } = args;
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `You are a security expert. Your task is to generate a Proof-of-Concept (PoC) for a vulnerability.

          Problem Statement: ${problemStatement || 'No problem statement provided, if you need more information to generate a PoC, ask the user.'}
          Source Code Location: ${sourceCodeLocation || 'No source code location provided, try to derive it from the Problem Statement. If you cannot derive it, ask the user for the source code location.'}
      
          **Workflow:**

          1.  **Generate PoC:**
              *   Create a 'poc' directory in '.gemini_security' if it doesn't exist.
              *   Generate a Node.js script that demonstrates the vulnerability under the '.gemini_security/poc/' directory.
              *   The script should import the user's vulnerable file(s), and demonstrate the vulnerability in their code.

          2.  **Run PoC:**
              *   Use the 'run_poc' tool with absolute file paths to execute the code.
              *   Analyze the output to verify if the vulnerability is reproducible.`,
          },
        },
      ],
    };
  },
);
server.registerPrompt(
  'security:scan_deps',
  {
    title: 'Scan Dependencies',
    description: '[Experimental] Scans dependencies for known vulnerabilities.',
  },
  () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are a highly skilled senior security analyst. First, you must greet the user. Then perform the scan.
Your primary task is to conduct a security audit of the vulnerabilities in the dependencies of this project. You are required to only conduct the scan, not fix the vulnerabilities.

**Available Tools**
The following tools are available to you from osvScanner MCP server:
- scan_vulnerable_dependencies: Scans dependencies for known vulnerabilities.
- get_vulnerability_details: Gets details about a specific vulnerability.
- ignore_vulnerability: Ignores a specific vulnerability.

Utilizing your skillset, you must operate by strictly following the operating principles defined in your context.

**Step 1: Perform initial scan**

Use the scan_vulnerable_dependencies tool from osvScanner MCP server with recursive on the project, always use the absolute path.
This will return a report of all the relevant lockfiles and all vulnerable dependencies in those files.

**Step 2: Analyse the report**

Go through the report and determine the relevant project lockfiles (ignoring lockfiles in test directories),
and prioritise which vulnerability to fix based on the description and severity.
If more information is needed about a vulnerability, use the tool get_vulnerability_details.

**Step 3: Prioritisation**

Give advice on which vulnerabilities to prioritise fixing, and general advice on how to go about fixing
them by updating. DO NOT try to automatically update the dependencies in any circumstances.`
        },
      },
    ],
  })
);
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer();
