/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GraphNode, GraphEdge } from './models.js';
import { promises as fs } from 'fs';
import path from 'path';

export class GraphService {
  public graph: {
    nodes: Map<string, GraphNode>;
    edges: Map<string, GraphEdge[]>; // Adjacency list for outgoing edges
    inEdges: Map<string, GraphEdge[]>; // For incoming edges
  };
  private _byName: Map<string, Set<string>>;
  private _byFileAndName: Map<string, string>;
  public _pendingCalls: [string, string, string][];

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      inEdges: new Map(),
    };
    this._byName = new Map();
    this._byFileAndName = new Map();
    this._pendingCalls = [];
  }

  private _indexNode(nodeId: string, nodeData: GraphNode) {
    const name = nodeData.name;
    if (name) {
      if (!this._byName.has(name)) {
        this._byName.set(name, new Set());
      }
      this._byName.get(name)!.add(nodeId);

      const filePath = nodeId.split(':', 1)[0];
      this._byFileAndName.set(`${filePath}:${name}`, nodeId);
    }
  }

  public addNode(node: GraphNode) {
    this.graph.nodes.set(node.id, node);
    this._indexNode(node.id, node);
  }

  public addEdge(edge: GraphEdge) {
    if (!this.graph.edges.has(edge.source)) {
      this.graph.edges.set(edge.source, []);
    }
    this.graph.edges.get(edge.source)!.push(edge);

    if (!this.graph.inEdges.has(edge.target)) {
        this.graph.inEdges.set(edge.target, []);
    }
    this.graph.inEdges.get(edge.target)!.push(edge);
  }

  public findEnclosingEntity(filePath: string, lineNumber: number): GraphNode | null {
    const enclosingNodes: GraphNode[] = [];
    for (const node of this.graph.nodes.values()) {
      if (node.id.startsWith(filePath) && node.type !== 'file') {
        if (node.startLine <= lineNumber && node.endLine >= lineNumber) {
          enclosingNodes.push(node);
        }
      }
    }

    if (enclosingNodes.length === 0) {
      return null;
    }

    // Find the most specific entity (smallest line range)
    return enclosingNodes.reduce((mostSpecific, current) => {
        const specificRange = mostSpecific.endLine - mostSpecific.startLine;
        const currentRange = current.endLine - current.startLine;
        return currentRange < specificRange ? current : mostSpecific;
    });
  }

  public querySymbol(name: string, filePath?: string): GraphNode | null {
    if (filePath) {
      const key = `${filePath}:${name}`;
      if (this._byFileAndName.has(key)) {
        const nodeId = this._byFileAndName.get(key);
        if (nodeId) {
            return this.graph.nodes.get(nodeId) || null;
        }
      }
    }
    const ids = this._byName.get(name);
    if (ids && ids.size === 1) {
      const nodeId = ids.values().next().value;
      if (nodeId) {
        return this.graph.nodes.get(nodeId) || null;
      }
    }
    // Ambiguous or not found
    return null;
  }
  
  public ensureModuleNode(moduleName: string): string {
    const nodeId = `module:${moduleName}`;
    if (!this.graph.nodes.has(nodeId)) {
        const node: GraphNode = {
            id: nodeId,
            type: 'module',
            name: moduleName,
            startLine: 0,
            endLine: 0,
            documentation: '',
            codeSnippet: '',
        };
        this.addNode(node);
    }
    return nodeId;
  }

  public addPendingCall(filePath: string, sourceId: string, calleeName: string) {
    this._pendingCalls.push([filePath, sourceId, calleeName]);
  }

  public async saveGraph(outputDir: string) {
    const filePath = path.join(outputDir, 'codemap.json');
    const graphJson = {
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges.values()).flat(),
    };
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(graphJson, null, 2));
  }
  public async loadGraph(outputDir: string): Promise<boolean> {
    const filePath = path.join(outputDir, 'codemap.json');
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const graphJson = JSON.parse(data);

      this.graph.nodes.clear();
      this.graph.edges.clear();
      this.graph.inEdges.clear();
      this._byName.clear();
      this._byFileAndName.clear();
      this._pendingCalls = [];

      for (const node of graphJson.nodes) {
        this.addNode(node);
      }

      for (const edge of graphJson.edges) {
        this.addEdge(edge);
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}
