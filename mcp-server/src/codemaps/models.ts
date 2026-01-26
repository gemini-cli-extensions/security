/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  startLine: number;
  endLine: number;
  documentation: string;
  codeSnippet: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}
