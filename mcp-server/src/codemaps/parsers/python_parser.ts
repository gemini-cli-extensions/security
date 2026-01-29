/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyntaxNode } from 'tree-sitter';
import { GraphService } from '../graph_service.js';
import { GraphNode, GraphEdge } from '../models.js';
import { LanguageParser } from './base_parser.js';

export class PythonParser implements LanguageParser {
  constructor(public graphService: GraphService) {}

  parse(node: SyntaxNode, filePath: string, scope: string): string {
    let newScope = scope;
    if (node.type === 'function_definition') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const documentation = this._getDocstring(node);
        const codeSnippet = node.text;
        const nodeId = `${filePath}:${name}`;
        
        const newNode: GraphNode = {
          id: nodeId,
          type: 'function',
          name,
          startLine,
          endLine,
          documentation,
          codeSnippet,
        };
        this.graphService.addNode(newNode);
        newScope = nodeId;
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }
      }
    } else if (node.type === 'class_definition') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const documentation = this._getDocstring(node);
        const codeSnippet = node.text;
        const nodeId = `${filePath}:${name}`;

        const newNode: GraphNode = {
          id: nodeId,
          type: 'class',
          name,
          startLine,
          endLine,
          documentation,
          codeSnippet,
        };
        this.graphService.addNode(newNode);
        newScope = nodeId;
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }

        const superclassesNode = node.childForFieldName('superclasses');
        if (superclassesNode) {
          for (const superclass of superclassesNode.children) {
            if (superclass.type === 'identifier') {
              const parentName = superclass.text;
              const parentNode = this.graphService.querySymbol(parentName);
              if (parentNode) {
                this.graphService.addEdge({ source: nodeId, target: parentNode.id, type: 'inherits' });
              }
            }
          }
        }
      }
    } else if (node.type === 'call') {
        const calleeName = this._pyCalleeName(node);
        if (calleeName && scope) {
            const calleeNode = this.graphService.querySymbol(calleeName);
            if (calleeNode) {
                this.graphService.addEdge({ source: scope, target: calleeNode.id, type: 'calls' });
            } else {
                this.graphService.addPendingCall(filePath, scope, calleeName);
            }
        }
    } else if (node.type === 'import_statement') {
        for (const alias of node.namedChildren) {
            if (alias.type === 'dotted_name') {
                const moduleName = alias.text;
                const targetId = this.graphService.ensureModuleNode(moduleName);
                this.graphService.addEdge({ source: filePath, target: targetId, type: 'imports' });
            }
        }
    } else if (node.type === 'import_from_statement') {
        const moduleNameNode = node.childForFieldName('module_name');
        if (moduleNameNode) {
            const moduleName = moduleNameNode.text;
            const targetId = this.graphService.ensureModuleNode(moduleName);
            this.graphService.addEdge({ source: filePath, target: targetId, type: 'imports' });
        }
    }
    
    return newScope;
  }

  private _getDocstring(node: SyntaxNode): string {
    if (node.type === 'function_definition' || node.type === 'class_definition') {
      const body = node.childForFieldName('body');
      if (body && body.namedChildCount > 0) {
        const firstChild = body.namedChildren[0];
        if (firstChild.type === 'expression_statement' && firstChild.firstChild?.type === 'string') {
          return firstChild.firstChild.text;
        }
      }
    }
    return '';
  }
  
  private _pyCalleeName(callNode: SyntaxNode): string | null {
    const fn = callNode.childForFieldName('function');
    if (!fn) {
        return null;
    }
    return this._pyRightmostName(fn);
  }

  private _pyRightmostName(node: SyntaxNode): string | null {
      if (node.type === 'identifier') {
          return node.text;
      }

      if (node.type === 'attribute') {
          const attr = node.childForFieldName('attribute');
          if (attr) {
              return attr.text;
          }
      }

      if (node.namedChildCount > 0) {
          for (let i = node.namedChildCount - 1; i >= 0; i--) {
              const name = this._pyRightmostName(node.namedChildren[i]);
              if (name) {
                  return name;
              }
          }
      }
      return null;
  }
}
