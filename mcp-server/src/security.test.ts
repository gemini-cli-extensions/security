/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { findLineNumbers } from './security';
import path from 'path';

type ParsedResult = {
  startLine?: number;
  endLine?: number;
  error?: string;
};

describe('findLineNumbers', () => {
  const CWD = process.cwd();

  const mockFs = {
    realpath: (p: string) => Promise.resolve(p),
    readFile: (p: string, options: string) => Promise.resolve(''),
  };

  it('should find the correct line numbers for a single-line snippet', async () => {
    const mockContent = `
      const a = 1;
      const b = 2;
      const c = 3;
    `;
    const mockFilePath = 'mock.ts';
    const testFs = {
      ...mockFs,
      readFile: () => Promise.resolve(mockContent),
    };

    const result = await findLineNumbers({ filePath: mockFilePath, snippet: 'const b = 2;' }, { fs: testFs as any, path });

    const parsedResult = JSON.parse((result.content![0] as any).text as string) as ParsedResult;
    expect(parsedResult.startLine).toBe(3);
    expect(parsedResult.endLine).toBe(3);
  });

  it('should find the correct line numbers for a multi-line snippet', async () => {
    const mockContent = `
      function myFunc() {
        console.log('hello');
        console.log('world');
      }
    `;
    const mockFilePath = 'mock.ts';
    const testFs = {
      ...mockFs,
      readFile: () => Promise.resolve(mockContent),
    };

    const result = await findLineNumbers(
      { filePath: mockFilePath, snippet: `
        console.log('hello');
        console.log('world');
      ` },
      { fs: testFs as any, path }
    );

    const parsedResult = JSON.parse((result.content![0] as any).text as string) as ParsedResult;
    expect(parsedResult.startLine).toBe(3);
    expect(parsedResult.endLine).toBe(4);
  });

  it('should handle when snippet is not found', async () => {
    const mockContent = `
      const x = 10;
      const y = 20;
    `;
    const mockFilePath = 'mock.ts';
    const testFs = {
      ...mockFs,
      readFile: () => Promise.resolve(mockContent),
    };

    const result = await findLineNumbers({ filePath: mockFilePath, snippet: 'const z = 30;' }, { fs: testFs as any, path });

    const parsedResult = JSON.parse((result.content![0] as any).text as string) as ParsedResult;
    expect(parsedResult.error).toBe('Snippet was not found.');
  });

  it('should handle an empty snippet', async () => {
    const result = await findLineNumbers({ filePath: 'mock.ts', snippet: '' }, { fs: mockFs as any, path });

    const parsedResult = JSON.parse((result.content![0] as any).text as string) as ParsedResult;
    expect(parsedResult.error).toBe('Snippet is empty.');
  });

  it('should handle file not found error', async () => {
    const mockFilePath = 'nonexistent.ts';
    const testFs = {
      ...mockFs,
      realpath: () => {
        return Promise.reject(new Error('File not found'));
      },
    };

    const result = await findLineNumbers({ filePath: mockFilePath, snippet: 'any' }, { fs: testFs as any, path });

    const parsedResult = JSON.parse((result.content![0] as any).text as string) as ParsedResult;
    expect(parsedResult.error).toBe('File not found');
  });

  it('should return an error for a path outside the current working directory', async () => {
    const mockFilePath = '../../../../etc/passwd';
    const testFs = {
      ...mockFs,
      realpath: () => Promise.resolve(path.resolve(CWD, mockFilePath)),
    };

    const result = await findLineNumbers({ filePath: mockFilePath, snippet: 'any' }, { fs: testFs as any, path });

    const parsedResult = JSON.parse((result.content![0] as any).text as string) as ParsedResult;
    expect(parsedResult.error).toBe('File path is outside of the current working directory.');
  });

  it('should return an error for a symbolic link pointing outside the current working directory', async () => {
    const mockFilePath = 'symlink-to-etc-passwd';
    const testFs = {
      ...mockFs,
      realpath: () => Promise.resolve('/etc/passwd'),
    };

    const result = await findLineNumbers({ filePath: mockFilePath, snippet: 'any' }, { fs: testFs as any, path });

    const parsedResult = JSON.parse((result.content![0] as any).text as string) as ParsedResult;
    expect(parsedResult.error).toBe('File path is outside of the current working directory.');
  });
});
