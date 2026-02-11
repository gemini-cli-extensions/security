/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { loadKnowledge, VulnerabilityType } from './knowledge.js';

describe('loadKnowledge Integration', () => {
  it('should load the actual Path Traversal knowledge base file', async () => {
    const content = await loadKnowledge(VulnerabilityType.PathTraversal);
    expect(content).toContain('# Path Traversal Remediation');
    expect(content).toContain('Secure Coding Patterns');
  });
});
