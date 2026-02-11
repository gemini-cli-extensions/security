/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityFixPromptHandler, SecurityFixArgs } from './security_fix.js';
import { VulnerabilityType } from '../knowledge.js';

// Mock knowledge loader
const knowledgeMocks = vi.hoisted(() => ({
  loadKnowledge: vi.fn(),
}));

vi.mock('../knowledge.js', async () => {
    const actual = await vi.importActual('../knowledge.js');
    return {
        ...actual,
        loadKnowledge: knowledgeMocks.loadKnowledge,
    };
});

// Mock fs
const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock('fs', async () => ({
  promises: {
    readFile: fsMocks.readFile,
  },
}));

describe('securityFixPromptHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate prompt with knowledge and file content', async () => {
    knowledgeMocks.loadKnowledge.mockResolvedValue('## Remediation Guide\nUse path.resolve');
    fsMocks.readFile.mockResolvedValue('const unsafe = req.query.path;');

    const args: SecurityFixArgs = {
      vulnerability: VulnerabilityType.PathTraversal,
      filePath: '/app/server.ts',
      vulnerabilityContext: 'Line 10: Unsafe input',
    };

    const result = await securityFixPromptHandler(args);

    expect(result.messages).toHaveLength(1);
    const content = result.messages[0].content.text;
    
    expect(content).toContain('fix a path_traversal vulnerability');
    expect(content).toContain('## Remediation Guide');
    expect(content).toContain('Use path.resolve');
    expect(content).toContain('const unsafe = req.query.path;');
    expect(content).toContain('Line 10: Unsafe input');
  });

  it('should handle missing file path', async () => {
    knowledgeMocks.loadKnowledge.mockResolvedValue('## Remediation Guide');
    
    const args: SecurityFixArgs = {
      vulnerability: VulnerabilityType.PathTraversal,
    };

    const result = await securityFixPromptHandler(args);
    const content = result.messages[0].content.text;

    expect(content).toContain('No file provided');
    expect(content).toContain('No content available');
    expect(fsMocks.readFile).not.toHaveBeenCalled();
  });

  it('should handle file read error', async () => {
    knowledgeMocks.loadKnowledge.mockResolvedValue('## Remediation Guide');
    fsMocks.readFile.mockRejectedValue(new Error('Access denied'));

    const args: SecurityFixArgs = {
      vulnerability: VulnerabilityType.PathTraversal,
      filePath: '/protected/file.ts',
    };

    const result = await securityFixPromptHandler(args);
    const content = result.messages[0].content.text;

    expect(content).toContain('Error reading file: Access denied');
    expect(content).toContain('Error reading file: Access denied');
  });

  it('should default to path_traversal if vulnerability is not provided', async () => {
    knowledgeMocks.loadKnowledge.mockResolvedValue('## Remediation Guide for Path Traversal');

    const args: SecurityFixArgs = {
      filePath: '/app/server.ts',
    };

    const result = await securityFixPromptHandler(args);
    const content = result.messages[0].content.text;

    expect(content).toContain('fix a path_traversal vulnerability');
    expect(knowledgeMocks.loadKnowledge).toHaveBeenCalledWith(VulnerabilityType.PathTraversal);
  });
});
