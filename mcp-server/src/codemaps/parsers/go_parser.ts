/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyntaxNode } from 'web-tree-sitter';
import { GraphService } from '../graph_service.js';
import { GraphNode, GraphEdge } from '../models.js';
import { LanguageParser } from './base_parser.js';

export class GoParser implements LanguageParser {
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
        const nodeId = `${filePath}:${name}`;

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
    } else if (node.type === 'type_declaration') {
      for (const spec of this._findAll(node, 'type_spec')) {
        this._handleTypeSpec(spec, filePath);
      }
    } else if (node.type === 'call_expression') {
      const callee = this._extractCalleeName(node);
      if (callee && scope) {
        const calleeNode = this.graphService.querySymbol(callee);
        if (calleeNode) {
          this.graphService.addEdge({ source: scope, target: calleeNode.id, type: 'calls' });
        } else {
          this.graphService.addPendingCall(filePath, scope, callee);
        }
      }
    } else if (node.type === 'import_declaration') {
      for (const spec of this._findAll(node, 'import_spec')) {
        const pathNode = spec.childForFieldName('path');
        let moduleName: string | null = null;
        if (pathNode) {
          moduleName = this._stripQuotes(pathNode.text);
        } else {
          const lit = this._firstStringLiteral(spec);
          if (lit) {
            moduleName = this._stripQuotes(lit);
          }
        }

        if (moduleName) {
          const targetId = this.graphService.ensureModuleNode(moduleName);
          this.graphService.addEdge({ source: filePath, target: targetId, type: 'imports' });
        }
      }
    }

    return newScope;
  }

  private _handleTypeSpec(specNode: SyntaxNode, filePath: string) {
    const nameNode = specNode.childForFieldName('name');
    const typeNode = specNode.childForFieldName('type');
    if (!nameNode || !typeNode) {
      return;
    }

    if (typeNode.type !== 'struct_type') {
      return;
    }

    const name = nameNode.text;
    const startLine = specNode.startPosition.row + 1;
    const endLine = specNode.endPosition.row + 1;
    const codeSnippet = specNode.text;
    const nodeId = `${filePath}:${name}`;

    this.graphService.addNode({
      id: nodeId,
      type: 'struct',
      name,
      startLine,
      endLine,
      documentation: '',
      codeSnippet,
    });
    this.graphService.addEdge({ source: filePath, target: nodeId, type: 'contains' });

    for (const fieldDecl of this._findAll(typeNode, 'field_declaration')) {
      if (this._hasChildType(fieldDecl, 'field_identifier')) {
        continue;
      }

      const typeChild = fieldDecl.childForFieldName('type');
      let parentName: string | null = null;
      if (!typeChild) {
        parentName = this._rightmostIdentifier(fieldDecl);
      } else {
        parentName = this._rightmostIdentifier(typeChild);
      }

      if (!parentName) {
        continue;
      }

      const parentNode = this.graphService.querySymbol(parentName);
      if (parentNode) {
        this.graphService.addEdge({ source: nodeId, target: parentNode.id, type: 'inherits' });
      }
    }
  }

  private _extractCalleeName(callNode: SyntaxNode): string | null {
    if (callNode.type !== 'call_expression') {
      return null;
    }
    const fn = callNode.childForFieldName('function');
    if (!fn) {
      return null;
    }

    if (fn.type === 'identifier') {
      return fn.text;
    }

    if (fn.type === 'selector_expression') {
      const field = fn.childForFieldName('field');
      if (field) {
        return field.text;
      }
      return this._rightmostIdentifier(fn);
    }

    return null;
  }

  private _rightmostIdentifier(node: SyntaxNode): string | null {
    if (
      node.type === 'identifier' ||
      node.type === 'type_identifier' ||
      node.type === 'field_identifier'
    ) {
      return node.text;
    }

    if (node.type === 'selector_expression') {
      const fld = node.childForFieldName('field');
      if (fld) {
        return fld.text;
      }
    }

    if (node.namedChildCount > 0) {
      for (let i = node.namedChildCount - 1; i >= 0; i--) {
        const name = this._rightmostIdentifier(node.namedChildren[i]);
        if (name) {
          return name;
        }
      }
    }
    return null;
  }

  private _findAll(node: SyntaxNode, typeName: string): SyntaxNode[] {
    const out: SyntaxNode[] = [];
    const stack: SyntaxNode[] = [node];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const ch of cur.children) {
        if (ch.type === typeName) {
          out.push(ch);
        }
        stack.push(ch);
      }
    }
    return out;
  }

  private _hasChildType(node: SyntaxNode, typeName: string): boolean {
    return node.children.some((ch) => ch.type === typeName);
  }

  private _firstStringLiteral(node: SyntaxNode): string | null {
    const stack: SyntaxNode[] = [node];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const ch of cur.children) {
        if (
          ch.type === 'interpreted_string_literal' ||
          ch.type === 'raw_string_literal' ||
          ch.type === 'string_literal'
        ) {
          return ch.text;
        }
        stack.push(ch);
      }
    }
    return null;
  }

  private _stripQuotes(s: string): string {
    return s.length >= 2 && (s.startsWith("'") || s.startsWith('"')) ? s.slice(1, -1) : s;
  }

  private _getDocstring(node: SyntaxNode): string {
    const prev = node.previousSibling;
    if (prev && prev.type === 'comment') {
      return prev.text;
    }
    return '';
  }
}
