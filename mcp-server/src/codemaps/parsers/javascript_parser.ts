/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyntaxNode } from 'web-tree-sitter';
import { GraphService } from '../graph_service.js';
import { GraphNode, GraphEdge } from '../models.js';
import { LanguageParser } from './base_parser.js';

export class JavaScriptParser implements LanguageParser {
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
    } else if (node.type === 'class_declaration') {
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

        const parentName = this._getParentJavaScriptClassDeclaration(node);
        if (parentName) {
          const parentNode = this.graphService.querySymbol(parentName);
          if (parentNode) {
            this.graphService.addEdge({ source: nodeId, target: parentNode.id, type: 'inherits' });
          }
        }
      }
    } else if (node.type === 'method_definition') {
      const nameNode = node.children.find(
        (child) => child.type === 'property_identifier' || child.type === 'private_property_identifier'
      );
      if (nameNode) {
        const methodName = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const documentation = this._getDocstring(node);
        const codeSnippet = node.text;
        const nodeId = `${filePath}:${methodName}`;

        this.graphService.addNode({
          id: nodeId,
          type: 'function',
          name: methodName,
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
    } else if (node.type === 'call_expression') {
      if (this._maybeAddCommonJsImport(node, filePath)) {
        return newScope;
      }

      const calleeName = this._getCalleeName(node);
      if (calleeName && scope) {
        const calleeNode = this.graphService.querySymbol(calleeName);
        if (calleeNode) {
          this.graphService.addEdge({ source: scope, target: calleeNode.id, type: 'calls' });
        } else {
          this.graphService.addPendingCall(filePath, scope, calleeName);
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
        const varId = `${filePath}:${varName}`;
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
        const funcId = `${filePath}:${funcName}`;
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
    let prev = node.previousSibling;
    while (prev && prev.type === 'comment') {
      if (prev.text.startsWith('/**')) {
        return prev.text;
      }
      prev = prev.previousSibling;
    }
    return '';
  }

  private _getParentJavaScriptClassDeclaration(node: SyntaxNode): string | null {
    const classHeritageNode = node.children.find((child) => child.type === 'class_heritage');
    if (classHeritageNode && classHeritageNode.namedChildCount > 0) {
      const base = classHeritageNode.namedChildren[0];
      if (base.type === 'identifier') {
        return base.text;
      } else if (base.type === 'member_expression') {
        const prop = base.childForFieldName('property');
        if (prop) {
          return prop.text;
        }
      }
    }
    return null;
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
      if (prop && prop.type === 'property_identifier') {
        return prop.text;
      }
      if (prop && prop.type === 'identifier') {
        return prop.text;
      }
      return null;
    }

    if (fn.type === 'optional_chain') {
      let inner = fn;
      while (inner && inner.namedChildCount > 0) {
        const last = inner.namedChildren[inner.namedChildCount - 1];
        if (last.type === 'member_expression' || last.type === 'identifier') {
          inner = last;
          break;
        }
        inner = last;
      }
      if (inner.type === 'identifier') {
        return inner.text;
      }
      if (inner.type === 'member_expression') {
        const prop = inner.childForFieldName('property');
        if (prop && (prop.type === 'property_identifier' || prop.type === 'identifier')) {
          return prop.text;
        }
      }
      return null;
    }

    return null;
  }

  private _maybeAddCommonJsImport(callNode: SyntaxNode, filePath: string): boolean {
    if (callNode.type !== 'call_expression') {
      return false;
    }

    const fn = callNode.childForFieldName('function');
    if (!fn || fn.type !== 'identifier' || fn.text !== 'require') {
      return false;
    }

    const args = callNode.childForFieldName('arguments');
    if (!args || args.namedChildCount === 0) {
      return false;
    }

    const first = args.namedChildren[0];

    if (first.type === 'string') {
      let moduleName = first.text;
      if (moduleName.length >= 2 && (moduleName.startsWith("'") || moduleName.startsWith('"'))) {
        moduleName = moduleName.slice(1, -1);
      }
      const targetId = this.graphService.ensureModuleNode(moduleName);
      this.graphService.addEdge({ source: filePath, target: targetId, type: 'imports' });
      return true;
    }

    if (first.type === 'template_string') {
      const raw = first.text;
      if (!raw.includes('${')) {
        let moduleName = raw;
        if (moduleName.length >= 2 && moduleName.startsWith('`') && moduleName.endsWith('`')) {
          moduleName = moduleName.slice(1, -1);
        }
        const targetId = this.graphService.ensureModuleNode(moduleName);
        this.graphService.addEdge({ source: filePath, target: targetId, type: 'imports' });
        return true;
      }
    }

    return false;
  }
}
