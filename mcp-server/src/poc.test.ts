/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, vi, expect } from 'vitest';
import { validatePocParams, runPoc } from './poc.js';

describe('validatePocParams', () => {
  it('should return valid message when parameters are provided', async () => {
    const result = await validatePocParams({
      vulnerabilityType: 'SQL Injection',
      sourceCode: 'SELECT * FROM users WHERE id = ' + 1,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(
      JSON.stringify({ message: 'Parameters are valid.' })
    );
  });

  it('should return error when vulnerabilityType is missing', async () => {
    const result = await validatePocParams({
      vulnerabilityType: '',
      sourceCode: 'code',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      JSON.stringify({ error: 'Vulnerability type is required.' })
    );
  });

  it('should return error when sourceCode is missing', async () => {
    const result = await validatePocParams({
      vulnerabilityType: 'type',
      sourceCode: '',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      JSON.stringify({ error: 'Source code is required.' })
    );
  });
});

describe('runPoc', () => {
  it('should write file and execute it', async () => {
    const mockFs = {
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined),
    };
    const mockPath = {
      join: (...args: string[]) => args.join('/'),
    };
    const mockExecAsync = vi.fn(async () => ({ stdout: 'output', stderr: '' }));

    const result = await runPoc(
      { code: 'console.log("test")' },
      { fs: mockFs as any, path: mockPath as any, execAsync: mockExecAsync as any }
    );

    expect(mockFs.mkdir).toHaveBeenCalledTimes(1);
    expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    expect(mockExecAsync).toHaveBeenCalledTimes(2);
    expect(result.content[0].text).toBe(
      JSON.stringify({ stdout: 'output', stderr: '' })
    );
  });

  it('should handle execution errors', async () => {
    const mockFs = {
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined),
    };
    const mockPath = {
      join: (...args: string[]) => args.join('/'),
    };
    const mockExecAsync = vi.fn(async () => {
      throw new Error('Execution failed');
    });

    const result = await runPoc(
      { code: 'error' },
      { fs: mockFs as any, path: mockPath as any, execAsync: mockExecAsync as any }
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      JSON.stringify({ error: 'Execution failed' })
    );
  });
});
