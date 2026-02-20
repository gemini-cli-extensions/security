/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, vi, expect } from 'vitest';
import { runPoc } from './poc.js';
import { POC_DIR } from './constants.js';

describe('runPoc', () => {
  const mockPath = {
    dirname: (p: string) => p.substring(0, p.lastIndexOf('/')),
    resolve: (p1: string, p2?: string) => {
      if (p2 && p2.startsWith('/')) return p2;
      if (p2) return p1 + '/' + p2;
      return p1;
    },
    sep: '/',
  };

  it('should execute the file at the given path', async () => {
    const mockExecAsync = vi.fn(async (cmd: string) => {
      if (cmd.startsWith('npm install')) {
        return { stdout: '', stderr: '' };
      }
      return { stdout: 'output', stderr: '' };
    });
    const mockExecFileAsync = vi.fn(async (file: string, args?: string[]) => {
      return { stdout: 'output', stderr: '' };
    });

    const result = await runPoc(
      { filePath: `${POC_DIR}/test.js` },
      { fs: {} as any, path: mockPath as any, execAsync: mockExecAsync as any, execFileAsync: mockExecFileAsync as any }
    );

    expect(mockExecAsync).toHaveBeenCalledTimes(1);
    expect(mockExecAsync).toHaveBeenCalledWith(
      'npm install --registry=https://registry.npmjs.org/',
      { cwd: POC_DIR }
    );
    expect(mockExecFileAsync).toHaveBeenCalledTimes(1);
    expect(mockExecFileAsync).toHaveBeenCalledWith('node', [`${POC_DIR}/test.js`]);
    expect((result.content[0] as any).text).toBe(
      JSON.stringify({ stdout: 'output', stderr: '' })
    );
  });

  it('should handle execution errors', async () => {
    const mockExecAsync = vi.fn(async (cmd: string) => {
      return { stdout: '', stderr: '' };
    });
    const mockExecFileAsync = vi.fn(async (file: string, args?: string[]) => {
      throw new Error('Execution failed');
    });

    const result = await runPoc(
      { filePath: `${POC_DIR}/error.js` },
      { fs: {} as any, path: mockPath as any, execAsync: mockExecAsync as any, execFileAsync: mockExecFileAsync as any }
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toBe(
      JSON.stringify({ error: 'Execution failed' })
    );
  });

  it('should fail when accessing file outside of allowed directory', async () => {
    const mockExecAsync = vi.fn();
    const mockExecFileAsync = vi.fn();

    const result = await runPoc(
      { filePath: '/tmp/malicious.js' },
      { fs: {} as any, path: mockPath as any, execAsync: mockExecAsync as any, execFileAsync: mockExecFileAsync as any }
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toContain('Security Error: PoC execution is restricted');
    expect(mockExecAsync).not.toHaveBeenCalled();
    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });
});
