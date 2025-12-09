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
    code,
  }: {
    code: string;
  },
  dependencies: { fs: typeof fs; path: typeof path; execAsync: typeof execAsync } = { fs, path, execAsync }
): Promise<CallToolResult> {
  try {
    const CWD = process.cwd();
    const securityDir = dependencies.path.join(CWD, '.gemini_security');

    // Ensure .gemini_security directory exists
    try {
      await dependencies.fs.mkdir(securityDir, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
    }

    const pocFilePath = dependencies.path.join(securityDir, 'poc.js');
    await dependencies.fs.writeFile(pocFilePath, code, 'utf-8');


    try {
      await dependencies.execAsync('npm install --registry=https://registry.npmjs.org/', { cwd: securityDir });
    } catch (error) {
      // Ignore errors from npm install, as it might fail if no package.json exists,
      // but we still want to attempt running the PoC.
    }
    const { stdout, stderr } = await dependencies.execAsync(`node ${pocFilePath}`);

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
