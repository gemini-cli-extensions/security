/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, vi, expect } from 'vitest';
import { runPoc } from './poc.js';

describe('runPoc', () => {
  it('should execute the file at the given path', async () => {
    const mockPath = {
      dirname: (p: string) => p.substring(0, p.lastIndexOf('/')),
    };
    const mockExecAsync = vi.fn(async (cmd: string) => {
      if (cmd.startsWith('npm install')) {
        return { stdout: '', stderr: '' };
      }
      return { stdout: 'output', stderr: '' };
    });

    const result = await runPoc(
      { filePath: '/tmp/test.js' },
      { fs: {} as any, path: mockPath as any, execAsync: mockExecAsync as any }
    );

    expect(mockExecAsync).toHaveBeenCalledTimes(2);
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      1,
      'npm install --registry=https://registry.npmjs.org/',
      { cwd: '/tmp' }
    );
    expect(mockExecAsync).toHaveBeenNthCalledWith(2, 'node /tmp/test.js');
    expect((result.content[0] as any).text).toBe(
      JSON.stringify({ stdout: 'output', stderr: '' })
    );
  });

  it('should handle execution errors', async () => {
    const mockPath = {
      dirname: (p: string) => p.substring(0, p.lastIndexOf('/')),
    };
    const mockExecAsync = vi.fn(async (cmd: string) => {
      if (cmd.startsWith('node')) {
        throw new Error('Execution failed');
      }
      return { stdout: '', stderr: '' };
    });

    const result = await runPoc(
      { filePath: '/tmp/error.js' },
      { fs: {} as any, path: mockPath as any, execAsync: mockExecAsync as any }
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toBe(
      JSON.stringify({ error: 'Execution failed' })
    );
  });
});
