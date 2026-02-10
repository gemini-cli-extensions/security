/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphService } from './graph_service';
import { GraphNode } from './models';

describe('GraphService', () => {
  let graphService: GraphService;

  beforeEach(() => {
    graphService = new GraphService();
  });

  it('should add a node to the graph', () => {
    const node: GraphNode = {
      id: 'file.py:my_function',
      type: 'function',
      name: 'my_function',
      startLine: 1,
      endLine: 10,
      documentation: '',
      codeSnippet: '',
    };
    graphService.addNode(node);
    expect(graphService.graph.nodes.get('file.py:my_function')).toEqual(node);
  });

  it('should add an edge to the graph', () => {
    const edge = {
      source: 'file.py:my_function',
      target: 'file.py:another_function',
      type: 'calls',
    };
    graphService.addEdge(edge);
    expect(graphService.graph.edges.get('file.py:my_function')).toEqual([edge]);
    expect(graphService.graph.inEdges.get('file.py:another_function')).toEqual([edge]);
  });

  it('should find the enclosing entity', () => {
    const fileNode: GraphNode = {
      id: 'file.py',
      type: 'file',
      name: 'file.py',
      startLine: 0,
      endLine: 0,
      documentation: '',
      codeSnippet: '',
    };
    const functionNode: GraphNode = {
      id: 'file.py:my_function',
      type: 'function',
      name: 'my_function',
      startLine: 1,
      endLine: 10,
      documentation: '',
      codeSnippet: '',
    };
    const innerFunctionNode: GraphNode = {
        id: 'file.py:my_function:inner',
        type: 'function',
        name: 'inner',
        startLine: 2,
        endLine: 5,
        documentation: '',
        codeSnippet: '',
    };
    graphService.addNode(fileNode);
    graphService.addNode(functionNode);
    graphService.addNode(innerFunctionNode);

    const enclosingEntity = graphService.findEnclosingEntity('file.py', 3);
    expect(enclosingEntity).toEqual(innerFunctionNode);
  });

  it('should query a symbol', () => {
    const node: GraphNode = {
      id: 'file.py:my_function',
      type: 'function',
      name: 'my_function',
      startLine: 1,
      endLine: 10,
      documentation: '',
      codeSnippet: '',
    };
    graphService.addNode(node);

    const foundNode = graphService.querySymbol('my_function', 'file.py');
    expect(foundNode).toEqual(node);
  });
});
