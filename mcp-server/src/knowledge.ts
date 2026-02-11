/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export enum VulnerabilityType {
  ScanDeps = 'scan_deps',
  PathTraversal = 'path_traversal',
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KNOWLEDGE_BASE_DIR = path.join(__dirname, 'knowledge');

/**
 * Loads the knowledge base article for a specific vulnerability.
 */
export async function loadKnowledge(vulnerability: string): Promise<string> {
  const safeVulnerability = vulnerability.replace(/[^a-z0-9_]/gi, '');
  const filePath = path.join(KNOWLEDGE_BASE_DIR, `${safeVulnerability}.md`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return `No specific knowledge base article found for vulnerability: ${vulnerability}. please rely on your general security knowledge.`;
    }
    throw error;
  }
}
