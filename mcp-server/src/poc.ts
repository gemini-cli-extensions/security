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

// 🛡️ Validate that the filePath is within the safe PoC directory
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
      const venvDir = dependencies.path.join(pocDir, '.venv');
      const isWindows = process.platform === 'win32';
      const pythonBin = isWindows
        ? dependencies.path.join(venvDir, 'Scripts', 'python.exe')
        : dependencies.path.join(venvDir, 'bin', 'python');

      try {
        await dependencies.fs.access(pythonBin);
      } catch {
        try {
          await dependencies.execAsync(`python3 -m venv "${venvDir}"`);
        } catch {
          await dependencies.execAsync(`python -m venv "${venvDir}"`);
        }
      }

      runCmd = pythonBin;
      runArgs = [filePath];

      const projectRoot = process.cwd();
      const checkExists = async (p: string) =>
        dependencies.fs.access(p).then(() => true).catch(() => false);

      const hasProjectPyproject = await checkExists(dependencies.path.join(projectRoot, 'pyproject.toml'));
      const hasProjectRequirements = await checkExists(dependencies.path.join(projectRoot, 'requirements.txt'));

      if (hasProjectPyproject) {
        await dependencies.execAsync(`"${pythonBin}" -m pip install -e "${projectRoot}"`).catch(() => { });
      } else if (hasProjectRequirements) {
        await dependencies.execAsync(`"${pythonBin}" -m pip install -r "${dependencies.path.join(projectRoot, 'requirements.txt')}"`).catch(() => { });
      }

      const hasPocPyproject = await checkExists(dependencies.path.join(pocDir, 'pyproject.toml'));
      const hasPocRequirements = await checkExists(dependencies.path.join(pocDir, 'requirements.txt'));

      if (hasPocPyproject) {
        await dependencies.execAsync(`"${pythonBin}" -m pip install .`, { cwd: pocDir }).catch(() => { });
      }
      if (hasPocRequirements) {
        await dependencies.execAsync(`"${pythonBin}" -m pip install -r requirements.txt`, { cwd: pocDir }).catch(() => { });
      }
    } else if (ext === '.go') {
      runCmd = 'go';
      runArgs = ['run', filePath];

      const hasGoMod = await dependencies.fs.access(dependencies.path.join(pocDir, 'go.mod')).then(() => true).catch(() => false);
      if (!hasGoMod) {
        await dependencies.execAsync('go mod init poc', { cwd: pocDir }).catch(() => { });
      }

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
        // Ignore errors from install step, as it might fail if no dependency configuration file (e.g., package.json, requirements.txt, go.mod) exists,
        // but we still want to attempt running the PoC.
      }
    }

    let output: { stdout: string; stderr: string };

    try {
      output = await dependencies.execFileAsync(runCmd, runArgs);
    } catch (error: any) {
      const errorMessage = error.message || '';
      const errorOutput = (error.stdout || '') + (error.stderr || '');

      // If we are running a Python script in a venv and it fails due to missing modules,
      // try enabling system site packages for the venv and retry.
      if (ext === '.py' && (errorMessage.includes('ModuleNotFoundError') || errorOutput.includes('ModuleNotFoundError'))) {
        try {
          const venvDir = dependencies.path.join(pocDir, '.venv');
          // Update the venv to include system site packages
          try {
            await dependencies.execAsync(`python3 -m venv --system-site-packages "${venvDir}"`);
          } catch {
            await dependencies.execAsync(`python -m venv --system-site-packages "${venvDir}"`);
          }

          // Retry execution with the updated venv
          output = await dependencies.execFileAsync(runCmd, runArgs);
        } catch (retryError: any) {
          // If retry fails, throw the original error (or the retry error if it's new/different)
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    const { stdout, stderr } = output;

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
    let stdout = '';
    let stderr = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      // Capture stdout/stderr from the error object if available (execFile throws with these)
      stdout = (error as any).stdout || '';
      stderr = (error as any).stderr || '';
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage, stdout, stderr }),
        },
      ],
      isError: true,
    };
  }
}
