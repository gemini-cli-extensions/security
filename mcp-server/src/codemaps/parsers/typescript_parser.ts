/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyntaxNode } from 'tree-sitter';
import { GraphService } from '../graph_service.js';
import { GraphNode, GraphEdge } from '../models.js';
import { LanguageParser } from './base_parser.js';

export class TypeScriptParser implements LanguageParser {
  constructor(public graphService: GraphService) {}

  parse(node: SyntaxNode, filePath: string, scope: string): string {
    let newScope = scope;

    if (node.type === 'function_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const documentation = this._getDocstring(node);
        const codeSnippet = node.text;
        const nodeId = `${scope}:${name}`;
        this.graphService.addNode({
          id: nodeId,
          type: 'function',
          name,
          startLine,
          endLine,
          documentation,
          codeSnippet,
        });
        newScope = nodeId;
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }
      }
    } else if (node.type === 'class_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const documentation = this._getDocstring(node);
        const codeSnippet = node.text;
        const nodeId = `${scope}:${name}`;

        this.graphService.addNode({
          id: nodeId,
          type: 'class',
          name,
          startLine,
          endLine,
          documentation,
          codeSnippet,
        });
        newScope = nodeId;
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }

        const superclass = node.childForFieldName('superclass');
        let baseName: string | null = null;
        if (superclass) {
          baseName = this._tsRightmostIdentifier(superclass);
        }

        if (!baseName) {
          for (const ch of node.children) {
            if (
              ch.type === 'extends_clause' ||
              ch.type === 'class_heritage' ||
              ch.type === 'heritage_clause'
            ) {
              const cand = this._tsRightmostIdentifier(ch);
              if (cand) {
                baseName = cand;
                break;
              }
            }
          }
        }

        if (baseName) {
          const parentNode = this.graphService.querySymbol(baseName, filePath);
          if (parentNode) {
            this.graphService.addEdge({ source: nodeId, target: parentNode.id, type: 'inherits' });
          }
        }

        for (const ch of node.children) {
          if (ch.type === 'implements_clause') {
            for (const t of ch.namedChildren) {
              const iface = this._tsRightmostIdentifier(t);
              if (iface) {
                const ifaceNode = this.graphService.querySymbol(iface, filePath);
                if (ifaceNode) {
                  this.graphService.addEdge({
                    source: nodeId,
                    target: ifaceNode.id,
                    type: 'implements',
                  });
                }
              }
            }
          }
        }
      }
    } else if (node.type === 'interface_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const documentation = this._getDocstring(node);
        const codeSnippet = node.text;
        const nodeId = `${scope}:${name}`;
        this.graphService.addNode({
          id: nodeId,
          type: 'interface',
          name,
          startLine,
          endLine,
          documentation,
          codeSnippet,
        });
        newScope = nodeId;
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }
      }
    } else if (node.type === 'enum_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const codeSnippet = node.text;
        const nodeId = `${scope}:${name}`;
        this.graphService.addNode({
          id: nodeId,
          type: 'enum',
          name,
          startLine,
          endLine,
          documentation: '',
          codeSnippet,
        });
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }
      }
    } else if (node.type === 'type_alias_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const codeSnippet = node.text;
        const nodeId = `${scope}:${name}`;
        this.graphService.addNode({
          id: nodeId,
          type: 'type_alias',
          name,
          startLine,
          endLine,
          documentation: '',
          codeSnippet,
        });
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }
      }
    } else if (node.type === 'method_definition') {
      const nameNode = node.children.find(
        (ch) => ch.type === 'property_identifier' || ch.type === 'private_property_identifier'
      );
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const documentation = this._getDocstring(node);
        const codeSnippet = node.text;
        const nodeId = `${scope}:${name}`;
        this.graphService.addNode({
          id: nodeId,
          type: 'function',
          name,
          startLine,
          endLine,
          documentation,
          codeSnippet,
        });
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }
        newScope = nodeId;
      }
    } else if (node.type === 'method_signature') {
      const nameNode = node.children.find(
        (ch) => ch.type === 'property_identifier' || ch.type === 'private_property_identifier'
      );
      if (nameNode) {
        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const codeSnippet = node.text;
        const nodeId = `${scope}:${name}`;
        this.graphService.addNode({
          id: nodeId,
          type: 'method',
          name,
          startLine,
          endLine,
          documentation: '',
          codeSnippet,
        });
        if (scope) {
          this.graphService.addEdge({ source: scope, target: nodeId, type: 'contains' });
        }
      }
    } else if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name');
      const valueNode = node.childForFieldName('value');

      if (nameNode && nameNode.type === 'identifier') {
        const varName = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const codeSnippet = node.text;
        const varId = `${scope}:${varName}`;
        this.graphService.addNode({
          id: varId,
          type: 'variable',
          name: varName,
          startLine,
          endLine,
          documentation: '',
          codeSnippet,
        });
        if (scope) {
          this.graphService.addEdge({ source: scope, target: varId, type: 'contains' });
        }
      }

      if (
        nameNode &&
        nameNode.type === 'identifier' &&
        valueNode &&
        (valueNode.type === 'function_expression' || valueNode.type === 'arrow_function')
      ) {
        const funcName = nameNode.text;
        const startLine = valueNode.startPosition.row + 1;
        const endLine = valueNode.endPosition.row + 1;
        const documentation = this._getDocstring(node);
        const codeSnippet = valueNode.text;
        const funcId = `${scope}:${funcName}`;
        this.graphService.addNode({
          id: funcId,
          type: 'function',
          name: funcName,
          startLine,
          endLine,
          documentation,
          codeSnippet,
        });
        if (scope) {
          this.graphService.addEdge({ source: scope, target: funcId, type: 'contains' });
        }
      }
    } else if (node.type === 'call_expression') {
      if (this._maybeAddCommonJsImport(node, filePath)) {
        return newScope;
      }

      const calleeName = this._getCalleeName(node);
      if (calleeName && scope) {
        const calleeNode = this.graphService.querySymbol(calleeName, filePath);
        if (calleeNode) {
          this.graphService.addEdge({ source: scope, target: calleeNode.id, type: 'calls' });
        } else {
          this.graphService.addPendingCall(filePath, scope, calleeName);
        }
      }
    } else if (node.type === 'import_statement') {
      const sourceNode = node.childForFieldName('source');
      if (sourceNode) {
        let moduleName = sourceNode.text;
        if (moduleName.length >= 2 && (moduleName.startsWith("'") || moduleName.startsWith('"'))) {
          moduleName = moduleName.slice(1, -1);
        }
        const targetId = this.graphService.ensureModuleNode(moduleName);
        this.graphService.addEdge({ source: filePath, target: targetId, type: 'imports' });
      }
    }

    return newScope;
  }

  private _getDocstring(node: SyntaxNode): string {
    const prev = node.previousSibling;
    if (prev && prev.type === 'comment' && prev.text.startsWith('/**')) {
      return prev.text;
    }
    return '';
  }

  private _getCalleeName(callNode: SyntaxNode): string | null {
    const fn = callNode.childForFieldName('function');
    if (!fn) {
      return null;
    }
    if (fn.type === 'identifier') {
      return fn.text;
    }
    if (fn.type === 'member_expression') {
      const prop = fn.childForFieldName('property');
      if (prop) {
        return prop.text;
      }
      return this._tsRightmostIdentifier(fn);
    }
    return null;
  }

  private _tsRightmostIdentifier(node: SyntaxNode): string | null {
    if (
      node.type === 'identifier' ||
      node.type === 'type_identifier' ||
      node.type === 'property_identifier' ||
      node.type === 'private_property_identifier'
    ) {
      return node.text;
    }
    if (node.type === 'member_expression') {
      const prop = node.childForFieldName('property');
      if (prop) {
        return prop.text;
      }
    }
    if (node.namedChildCount > 0) {
      for (let i = node.namedChildCount - 1; i >= 0; i--) {
        const name = this._tsRightmostIdentifier(node.namedChildren[i]);
        if (name) {
          return name;
        }
      }
    }
    return null;
  }

  private _maybeAddCommonJsImport(callNode: SyntaxNode, filePath: string): boolean {
    const fn = callNode.childForFieldName('function');
    if (!fn || fn.type !== 'identifier' || fn.text !== 'require') {
      return false;
    }
    const args = callNode.childForFieldName('arguments');
    if (!args || args.namedChildCount === 0) {
      return false;
    }
    const first = args.namedChildren[0];
    let mod: string | null = null;
    if (first.type === 'string') {
      const raw = first.text;
      mod =
        raw.length >= 2 && (raw.startsWith("'") || raw.startsWith('"')) ? raw.slice(1, -1) : raw;
    } else if (first.type === 'template_string') {
      const raw = first.text;
      if (!raw.includes('${')) {
        mod = raw.length >= 2 && raw.startsWith('`') && raw.endsWith('`') ? raw.slice(1, -1) : raw;
      }
    }
    if (mod === null) {
      return false;
    }
    const targetId = this.graphService.ensureModuleNode(mod);
    this.graphService.addEdge({ source: filePath, target: targetId, type: 'imports' });
    return true;
  }
}
