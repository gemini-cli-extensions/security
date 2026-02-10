/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphBuilder } from './graph_builder';
import { GraphService } from './graph_service';
import { promises as fs } from 'fs';

vi.mock('fs', () => ({
    promises: {
        readFile: vi.fn(),
    },
}));

describe('GraphBuilder', () => {
  let graphService: GraphService;
  let graphBuilder: GraphBuilder;

  beforeEach(() => {
    graphService = new GraphService();
    graphBuilder = new GraphBuilder(graphService);
  });

  it('should build a graph for a Python file', async () => {
    const filePath = 'test.py';
    const fileContent = `
def my_function():
  pass

class MyClass:
  def my_method(self):
    pass
`;
    vi.mocked(fs.readFile).mockResolvedValue(fileContent);

    await graphBuilder.buildGraph(filePath);

    expect(graphService.graph.nodes.has('test.py')).toBe(true);
    expect(graphService.graph.nodes.has('test.py:my_function')).toBe(true);
    expect(graphService.graph.nodes.has('test.py:MyClass')).toBe(true);
    expect(graphService.graph.nodes.has('test.py:MyClass:my_method')).toBe(true);
  });

  it('should build a graph for a JavaScript file', async () => {
    const filePath = 'test.js';
    const fileContent = `
function myFunction() {
}

class MyClass {
  myMethod() {
  }
}
`;
    vi.mocked(fs.readFile).mockResolvedValue(fileContent);

    await graphBuilder.buildGraph(filePath);

    expect(graphService.graph.nodes.has('test.js')).toBe(true);
    expect(graphService.graph.nodes.has('test.js:myFunction')).toBe(true);
    expect(graphService.graph.nodes.has('test.js:MyClass')).toBe(true);
    expect(graphService.graph.nodes.has('test.js:MyClass:myMethod')).toBe(true);
  });

  it('should build a graph for a TypeScript file', async () => {
    const filePath = 'test.ts';
    const fileContent = `
function myFunction(): void {
}

class MyClass {
  myMethod(): void {
  }
}
`;
    vi.mocked(fs.readFile).mockResolvedValue(fileContent);

    await graphBuilder.buildGraph(filePath);

    expect(graphService.graph.nodes.has('test.ts')).toBe(true);
    expect(graphService.graph.nodes.has('test.ts:myFunction')).toBe(true);
    expect(graphService.graph.nodes.has('test.ts:MyClass')).toBe(true);
    expect(graphService.graph.nodes.has('test.ts:MyClass:myMethod')).toBe(true);
  });

  it('should build a graph for a Go file', async () => {
    const filePath = 'test.go';
    const fileContent = `
func myFunction() {
}

type MyStruct struct {
}

func (s *MyStruct) myMethod() {
}
`;
    vi.mocked(fs.readFile).mockResolvedValue(fileContent);

    await graphBuilder.buildGraph(filePath);

    expect(graphService.graph.nodes.has('test.go')).toBe(true);
    expect(graphService.graph.nodes.has('test.go:myFunction')).toBe(true);
    expect(graphService.graph.nodes.has('test.go:MyStruct')).toBe(true);
    expect(graphService.graph.nodes.has('test.go:MyStruct:myMethod')).toBe(true);
  });

  it('should throw an error for an unsupported file extension', async () => {
    const filePath = 'test.txt';
    await expect(graphBuilder.buildGraph(filePath)).rejects.toThrow('Unsupported file extension: test.txt');
  });
});
