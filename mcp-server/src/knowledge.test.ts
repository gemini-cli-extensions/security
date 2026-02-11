/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadKnowledge, VulnerabilityType } from './knowledge.js';
import path from 'path';

// Mock fs
const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock('fs', async () => ({
  promises: {
    readFile: mocks.readFile,
  },
}));

describe('loadKnowledge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load knowledge for a valid vulnerability', async () => {
    const mockContent = '# Path Traversal Knowledge';
    mocks.readFile.mockResolvedValue(mockContent);

    const content = await loadKnowledge(VulnerabilityType.PathTraversal);
    expect(content).toBe(mockContent);
    expect(mocks.readFile).toHaveBeenCalledWith(
      expect.stringContaining('path_traversal.md'),
      'utf-8'
    );
  });

  it('should return default message for unknown vulnerability', async () => {
    const error = new Error('File not found');
    (error as any).code = 'ENOENT';
    mocks.readFile.mockRejectedValue(error);

    const content = await loadKnowledge('unknown_vuln');
    expect(content).toContain('No specific knowledge base article found');
  });

  it('should rethrow other errors', async () => {
    const error = new Error('Permission denied');
    (error as any).code = 'EACCES';
    mocks.readFile.mockRejectedValue(error);

    await expect(loadKnowledge('vuln')).rejects.toThrow('Permission denied');
  });

  it('should sanitize vulnerability name', async () => {
    mocks.readFile.mockResolvedValue('');
    await loadKnowledge('../possible_attack');

    // Should verify it called with sanitized path, not containing ".."
    // We can check the arguments passed to fs.readFile
    const calledPath = mocks.readFile.mock.calls[0][0] as string;
    expect(calledPath).not.toContain('..');
    expect(calledPath).toContain('possible_attack');
  });
});
