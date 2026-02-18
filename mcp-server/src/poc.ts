/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runPoc(
  {
    filePath,
  }: {
      filePath: string;
  },
  dependencies: { fs: typeof fs; path: typeof path; execAsync: typeof execAsync } = { fs, path, execAsync }
): Promise<CallToolResult> {
  try {
    const pocDir = dependencies.path.dirname(filePath);

    // Validate that the filePath is within the safe PoC directory
    const resolvedFilePath = dependencies.path.resolve(filePath);
    const safePocDir = dependencies.path.resolve(process.cwd(), '.gemini_security/poc');

    if (!resolvedFilePath.startsWith(safePocDir + dependencies.path.sep)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Security Error: PoC execution is restricted to files within '${safePocDir}'. Attempted to access '${resolvedFilePath}'.`,
            }),
          },
        ],
        isError: true,
      };
    }

    try {
      await dependencies.execAsync('npm install --registry=https://registry.npmjs.org/', { cwd: pocDir });
    } catch (error) {
      // Ignore errors from npm install, as it might fail if no package.json exists,
      // but we still want to attempt running the PoC.
    }
    const { stdout, stderr } = await dependencies.execAsync(`node ${filePath}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ stdout, stderr }),
        },
      ],
    };
  } catch (error) {
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }),
        },
      ],
      isError: true,
    };
  }
}
