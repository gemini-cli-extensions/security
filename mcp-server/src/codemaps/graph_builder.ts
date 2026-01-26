/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Parser from 'web-tree-sitter';
import { GraphService } from './graph_service.js';
import { GraphNode } from './models.js';
import { PythonParser } from './parsers/python_parser.js';
import { JavaScriptParser } from './parsers/javascript_parser.js';
import { GoParser } from './parsers/go_parser.js';
import { TypeScriptParser } from './parsers/typescript_parser.js';
import { LanguageParser } from './parsers/base_parser.js';
import { promises as fs } from 'fs';

export class GraphBuilder {
  private parser!: Parser;
  private languageParsers: { [key: string]: LanguageParser };
  private languageLibs: { [key: string]: string };

  constructor(private graphService: GraphService) {
    this.languageParsers = {
      python: new PythonParser(graphService),
      javascript: new JavaScriptParser(graphService),
      go: new GoParser(graphService),
      typescript: new TypeScriptParser(graphService),
    };
    this.languageLibs = {
        python: 'tree-sitter-python.wasm',
        javascript: 'tree-sitter-javascript.wasm',
        go: 'tree-sitter-go.wasm',
        typescript: 'tree-sitter-typescript.wasm',
    };
  }

  public async buildGraph(filePath: string) {
    const language = this._getLanguageFromFileExtension(filePath);
    const languageLibPath = this.languageLibs[language];
    if (!languageLibPath) {
        throw new Error(`Unsupported language: ${language}`);
    }
    
    await Parser.init();
    const Lang = await Parser.Language.load(languageLibPath);
    this.parser = new Parser();
    this.parser.setLanguage(Lang);

    const fileContent = await fs.readFile(filePath, 'utf8');
    const tree = this.parser.parse(fileContent);
    
    const fileNode: GraphNode = {
        id: filePath,
        type: 'file',
        name: filePath,
        startLine: 0,
        endLine: 0,
        documentation: '',
        codeSnippet: '',
    };
    this.graphService.addNode(fileNode);

    const languageParser = this.languageParsers[language];
    this._traverseTree(tree.rootNode, languageParser, filePath, filePath);
    
    return this.graphService.graph;
  }

  private _traverseTree(node: Parser.SyntaxNode, languageParser: LanguageParser, filePath: string, scope: string) {
    const newScope = languageParser.parse(node, filePath, scope);
    for (const child of node.children) {
      this._traverseTree(child, languageParser, filePath, newScope);
    }
  }

  private _getLanguageFromFileExtension(filePath: string): string {
    if (filePath.endsWith('.py')) {
      return 'python';
    } else if (filePath.endsWith('.js')) {
      return 'javascript';
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return 'typescript';
    } else if (filePath.endsWith('.go')) {
      return 'go';
    } else {
      throw new Error(`Unsupported file extension: ${filePath}`);
    }
  }
}
