/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { loadKnowledge, VulnerabilityType } from '../knowledge.js';
import { promises as fs } from 'fs';

export const SECURITY_FIX_PROMPT_NAME = 'security:fix';

export const SecurityFixArgsSchema = z.object({
  vulnerability: z.nativeEnum(VulnerabilityType).optional().describe('The type of vulnerability to fix (defaults to path_traversal).'),
  filePath: z.string().optional().describe('The absolute path to the file to fix.'),
  vulnerabilityContext: z.string().optional().describe('Context about the vulnerability (e.g., line number, snippet).'),
});

export type SecurityFixArgs = z.infer<typeof SecurityFixArgsSchema>;

export async function securityFixPromptHandler(args: SecurityFixArgs) {
  const { vulnerability = VulnerabilityType.PathTraversal, filePath, vulnerabilityContext } = args;
  const knowledge = await loadKnowledge(vulnerability);
  let fileContent = '';
  
  if (filePath) {
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (e) {
      fileContent = `Error reading file: ${(e as Error).message}`;
    }
  }

  return {
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You are a security expert. Your task is to fix a ${vulnerability} vulnerability.

**Knowledge Base:**
${knowledge}

**Context:**
${vulnerabilityContext || 'No specific context provided.'}

**Target File:**
${filePath || 'No file provided.'}

**File Content:**
\`\`\`
${fileContent || 'No content available.'}
\`\`\`

**Instructions:**
1. Analyze the file content and the knowledge base.
2. Apply the secure coding patterns described in the knowledge base to fix the ${vulnerability} in the target file.
3. If you have the file content, output the complete fixed file content or a patch.
4. Ensure the fix preserves the original functionality while eliminating the vulnerability.
`,
        },
      },
    ],
  };
}
