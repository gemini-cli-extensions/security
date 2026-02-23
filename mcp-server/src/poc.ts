/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { POC_DIR } from './constants.js';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export async function runPoc(
  {
    filePath,
  }: {
      filePath: string;
  },
  dependencies: { fs: typeof fs; path: typeof path; execAsync: typeof execAsync; execFileAsync: typeof execFileAsync } = { fs, path, execAsync, execFileAsync }
): Promise<CallToolResult> {
  try {
    const pocDir = dependencies.path.dirname(filePath);

    // Validate that the filePath is within the safe PoC directory
    const resolvedFilePath = dependencies.path.resolve(filePath);
    const safePocDir = dependencies.path.resolve(process.cwd(), POC_DIR);

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

    const ext = dependencies.path.extname(filePath).toLowerCase();

    let installCmd: string | null = null;
    let runCmd: string;
    let runArgs: string[];

    if (ext === '.py') {
      runCmd = 'python3';
      runArgs = [filePath];
      installCmd = 'pip3 install -r requirements.txt';
    } else if (ext === '.go') {
      runCmd = 'go';
      runArgs = ['run', filePath];
      installCmd = 'go mod tidy';
    } else {
      runCmd = 'node';
      runArgs = [filePath];
      installCmd = 'npm install --registry=https://registry.npmjs.org/';
    }

    if (installCmd) {
      try {
        await dependencies.execAsync(installCmd, { cwd: pocDir });
      } catch (error) {
        // Ignore errors from install step, as it might fail if no config file exists,
        // but we still want to attempt running the PoC.
      }
    }

    const { stdout, stderr } = await dependencies.execFileAsync(runCmd, runArgs);

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
