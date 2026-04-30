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
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getAuditScope, getFilesToAudit, getLineCount, detectProjectLanguage } from './filesystem.js';
import { findLineNumbers } from './security.js';
import { parseMarkdownToDict } from './parser.js';
import { SECURITY_DIR_NAME, POC_DIR_NAME, PATH_TRAVERSAL_TEMP_FILE } from './constants.js';
import { loadKnowledge, VulnerabilityType } from './knowledge.js';
import { SECURITY_PATCH_CONTEXT_TOOL_NAME, SECURITY_PATCH_CONTEXT_TOOL_DESCRIPTION, SecurityPatchContextArgsSchema, getSecurityPatchContextMessages } from './tools/security_patch_context.js';
import { POC_CONTEXT_TOOL_NAME, POC_CONTEXT_TOOL_DESCRIPTION, PocContextArgsSchema, getPocContext } from './tools/poc_context.js';
import { RUN_POC_TOOL_NAME, RUN_POC_TOOL_DESCRIPTION, RunPocArgsSchema, getRunPocMessages } from './tools/run_poc.js';

// import { runPoc } from './poc.js';

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
  } as any,
  (input: { filePath: string; snippet: string }) => findLineNumbers(input, { fs, path })
);

server.tool(
  'get_audit_scope',
  'Gets the git diff of the current changes. Can optionally compare two specific branches.',
  {
    base: z.string().optional().describe('The base branch or commit hash (e.g., "main").'),
    head: z.string().optional().describe('The head branch or commit hash (e.g., "feature-branch").'),
  } as any,
  ((args: { base?: string; head?: string }) => {
    const diff = getAuditScope(args.base, args.head);
    return {
      content: [
        {
          type: 'text',
          text: diff,
        },
      ],
    };
  }) as any
);

server.tool(
  'get_files_to_audit',
  'Lists relevant files for auditing by filtering out irrelevant files and folders.',
  {} as any,
  (() => {
    const files = getFilesToAudit();
    return {
      content: [
        {
          type: 'text',
          text: files.join('\n'),
        },
      ],
    };
  }) as any
);

server.tool(
  RUN_POC_TOOL_NAME,
  RUN_POC_TOOL_DESCRIPTION,
  RunPocArgsSchema.shape as any,
  getRunPocMessages as any
);

server.tool(
  'convert_report_to_json',
  `Converts the Markdown security report into a JSON file named security_report.json in the ${SECURITY_DIR_NAME} folder.`,
  {} as any,
  (async () => {
    try {
      const reportPath = path.join(process.cwd(), `${SECURITY_DIR_NAME}/DRAFT_SECURITY_REPORT.md`);
      const outputPath = path.join(process.cwd(), `${SECURITY_DIR_NAME}/security_report.json`);

      const content = await fs.readFile(reportPath, 'utf-8');
      const results = parseMarkdownToDict(content);

      await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

      return {
        content: [{
          type: 'text',
          text: `Successfully created JSON report at ${outputPath}`
        }]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error converting to JSON: ${message}` }],
        isError: true
      };
    }
  }) as any
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
            text: `You are a helpful assistant that helps users maintain notes. Your task is to add a new entry to the notes file at '${SECURITY_DIR_NAME}/${notePath}'.

        You MUST use the 'ReadFile' and 'WriteFile' tools.

        **Workflow:**

        1.  **Read the file:** First, you MUST attempt to read the file at '${SECURITY_DIR_NAME}/${notePath}' using the 'ReadFile' tool.

        2.  **Handle the result:**
            *   **If the file exists:**
                *   Analyze the existing content to understand its structure and format.
                *   **Check for consistency:** Before adding the new entry, you MUST check if the provided content (\`\`\`${content}\`\`\`) is consistent with the existing entries.
                *   **If it is not consistent:** You MUST ask the user for clarification. Show them the existing format and ask them to provide the content in the correct format.
                *   Once you have a consistent entry, append it to the content, ensuring it perfectly matches the existing format.
                *   Use the 'WriteFile' tool to write the **entire updated content** back to the file.
            *   **If the file does NOT exist (ReadFile returns an error):**
                *   First, if the '${SECURITY_DIR_NAME}' directory doesn't exist, create it. 
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

server.registerTool(
  POC_CONTEXT_TOOL_NAME,
  {
    description: POC_CONTEXT_TOOL_DESCRIPTION,
    inputSchema: PocContextArgsSchema as any,
  },
  getPocContext as any
);

server.registerPrompt(
  'security:scan-deps',
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
                Your primary task is to conduct a security audit of the vulnerabilities in the dependencies of this project. You are required to only conduct the scan, not patch the vulnerabilities.

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
                and prioritise which vulnerability to patch based on the description and severity.
                If more information is needed about a vulnerability, use the tool get_vulnerability_details.

                **Step 3: Prioritisation**

                Give advice on which vulnerabilities to prioritise patching, and general advice on how to go about patching
                them by updating. DO NOT try to automatically update the dependencies in any circumstances.`
        },
      },
    ],
  })
);

server.tool(
  SECURITY_PATCH_CONTEXT_TOOL_NAME,
  SECURITY_PATCH_CONTEXT_TOOL_DESCRIPTION,
  SecurityPatchContextArgsSchema.shape as any,
  getSecurityPatchContextMessages as any
);

server.tool(
  'install_dependencies',
  'Executes a script file inside workspace.',
  {
    scriptPath: z.string().describe('Absolute path to the script file to execute.'),
    targetFile: z.string().describe('The target file requiring dependencies.'),
    cwd: z.string().optional().describe('Execution directory (optional. overrides calculation).'),
  } as any,
  (async (input: { scriptPath: string; targetFile: string; cwd?: string }) => {
    try {
      const execFileAsync = promisify(execFile);
      let executionDir = input.cwd;

      if (!executionDir) {
        const startDir = path.dirname(input.targetFile);
        executionDir = startDir;

        let current = startDir;
        for (let i = 0; i < 5; i++) {
          try {
            const hasNode = await fs.access(path.join(current, 'package.json')).then(() => true).catch(() => false);
            const hasPy = await fs.access(path.join(current, 'requirements.txt')).then(() => true).catch(() => false);
            if (hasNode || hasPy) {
              executionDir = current;
              break;
            }
          } catch { }
          const parent = path.dirname(current);
          if (parent === current) break;
          current = parent;
        }
      }

      await fs.chmod(input.scriptPath, 0o755);
      const output = await execFileAsync(input.scriptPath, { cwd: executionDir });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              stdout: output.stdout,
              stderr: output.stderr,
            }),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error.message || String(error),
              stdout: error.stdout || '',
              stderr: error.stderr || '',
            }),
          },
        ],
        isError: true,
      };
    }
  }) as any
);

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

server.tool(
  'get_line_count',
  'Gets the total line count of a list of files.',
  {
    files: z
      .array(z.string())
      .describe('A list of file paths.'),
  } as any,
  ((input: {files: string[]}) => {
    const totalLines = getLineCount(input.files);
    return {
      content: [
        {
          type: 'text',
          text: totalLines.toString(),
        },
      ],
    };
  }) as any
);

startServer();
