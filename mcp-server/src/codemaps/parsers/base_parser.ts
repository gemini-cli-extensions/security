/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyntaxNode } from 'tree-sitter';
import { GraphService } from '../graph_service.js';

export interface LanguageParser {
  graphService: GraphService;
  parse(node: SyntaxNode, filePath: string, scope: string): string;
}
