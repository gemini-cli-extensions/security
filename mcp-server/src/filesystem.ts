/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Checks if the current directory is a GitHub repository.
 * @returns True if the current directory is a GitHub repository, false otherwise.
 */
export const isGitHubRepository = (): boolean => {
  try {
    const remotes = (
      spawnSync('git', ['remote', '-v'], {
        encoding: 'utf-8',
      }).stdout || ''
    ).trim();

    const pattern = /github\.com/;

    return pattern.test(remotes);
  } catch (_error) {
    return false;
  }
};

/**
 * Gets a changelist of the repository between two commits.
 * Can compare between two commits, or get the diff of the working directory.
 * If no commits are provided, it gets the changelist of the working directory.
 * @param base The base commit branch or hash.
 * @param head The head commit branch or hash.
 * @returns The changelist as a string.
 */
export function getAuditScope(base?: string, head?: string): string {
    // Default to working directory diff if no commits are provided
    const args: string[] = ["diff"];

    // Add commit range if both base and head are provided
    if (base !== undefined && head !== undefined) {
        args.push(base, head);
    }
    // Otherwise, if this is a GitHub repository, use origin/HEAD as the base
    else if (isGitHubRepository()) {
        args.push('--merge-base', 'origin/HEAD');
    }
    try {
        const diff = (
        spawnSync('git', args, {
            encoding: 'utf-8',
        }).stdout || ''
        ).trim();

        return diff;
    } catch (_error) {
        return "";
    }
}

/**
 * Reduces the audit scope by filtering out irrelevant files and folders.
 * Irrelevant files include documentation, tests, build artifacts, etc.
 * @returns A list of relevant file paths for auditing.
 */
export function reduceAuditScope(): string[] {
  const IGNORED_FOLDERS = [
    'node_modules', 'dist', 'build', 'out', 'target', 'bin', 'obj', 'vendor',
    'docs', 'documentation', 'tests', 'test', 'spec', '__tests__',
    '.github', '.vscode', '.idea', '.git', 'assets', 'images', 'public/assets',
    '.next', '.nuxt', '.svelte-kit', 'bower_components', 'jspm_packages',
    '.npm', '.yarn', '.pnpm', 'coverage', '.cache', '.tmp', 'temp'
  ];

  const IGNORED_EXTENSIONS = [
    '.md', '.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff',
    '.mp4', '.mov', '.avi', '.wmv', '.mkv', '.mp3', '.wav', '.flac', '.ogg',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.lock', '-lock.json', '.sum',
    '.exe', '.dll', '.so', '.dylib', '.pyc', '.class', '.pyo', '.o', '.obj',
    '.DS_Store', '.gitkeep', '.dockerignore', '.eslintignore', '.prettierignore',
    '.editorconfig', '.map',
    '.test.ts', '.test.js', '.spec.ts', '.spec.js',
    '.test.tsx', '.test.jsx', '.spec.tsx', '.spec.jsx'
  ];

  const IGNORED_FILES = [
    'LICENSE', 'CHANGELOG', 'CONTRIBUTING', 'CODE_OF_CONDUCT', 'SECURITY.md',
    '.gitignore', '.prettierrc', '.eslintrc', '.eslintignore', '.prettierignore',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'go.sum', 'Cargo.lock', 'Gemfile.lock',
    'composer.lock', 'npm-debug.log', 'yarn-debug.log', 'yarn-error.log',
    '.env.example', '.env.template', '.env.dist'
  ];

  try {
    const trackedFiles = (
      spawnSync('git', ['ls-files'], {
        encoding: 'utf-8',
      }).stdout || ''
    )
      .trim()
      .split('\n');

    const untrackedFiles = (
      spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
        encoding: 'utf-8',
      }).stdout || ''
    )
      .trim()
      .split('\n');

    const allFiles = [...trackedFiles, ...untrackedFiles].filter((f) => f !== '');

    return allFiles.filter((filePath) => {
      const parts = filePath.split('/');
      
      // Ignore if any part of the path is in IGNORED_FOLDERS
      if (parts.some(part => IGNORED_FOLDERS.includes(part))) {
        return false;
      }

      const fileName = parts.pop() || '';
      const fileNameLower = fileName.toLowerCase();

      // Ignore exact files
      if (IGNORED_FILES.some(file => fileNameLower === file.toLowerCase())) {
        return false;
      }

      // Ignore extensions
      if (IGNORED_EXTENSIONS.some(ext => fileNameLower.endsWith(ext.toLowerCase()))) {
        return false;
      }

      return true;
    });
  } catch (error) {
    console.error('Error reducing audit scope:', error);
    return [];
  }
}

/**
 * Gets the total line count of a list of files.
 * @param files A list of file paths.
 * @returns The total line count of all files.
 */
export const getLineCount = (files: string[]): number => {
  let totalLines = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lineCount = (content.match(/\n/g) || []).length;
      totalLines += lineCount;
    } catch (error) {
      console.error(`Error counting lines in file ${file}:`, error);
    }
  }
  return totalLines;
}
