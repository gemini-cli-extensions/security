/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect, describe, it, beforeAll, afterAll } from 'vitest';
import { isGitHubRepository, getAuditScope, reduceAuditScope } from './filesystem';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('filesystem', () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-fs-test-'));
    process.chdir(tempDir);
    
    execSync('git init');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test User"');
    fs.writeFileSync('test.txt', 'hello');
    execSync('git add test.txt');
    execSync('git commit -m "initial commit"');
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return true if the directory is a github repository', () => {
    // Setup: Add remote specifically for this test
    execSync('git remote add origin https://github.com/gemini-testing/gemini-test-repo.git');
    
    expect(isGitHubRepository()).toBe(true);
    
    // Cleanup: Remove remote so it doesn't affect other tests
    execSync('git remote remove origin');
  });

  it('should reduce the audit scope correctly by filtering out ignored files', () => {
    // Create some files that should be ignored
    fs.mkdirSync('node_modules', { recursive: true });
    fs.writeFileSync('node_modules/test.js', 'console.log("ignored")');
    
    fs.mkdirSync('dist', { recursive: true });
    fs.writeFileSync('dist/bundle.js', 'console.log("ignored")');
    
    fs.writeFileSync('test_doc.md', '# Documentation');
    
    // Create some files that should NOT be ignored
    fs.mkdirSync('src', { recursive: true });
    fs.writeFileSync('src/index.ts', 'console.log("relevant")');
    fs.writeFileSync('package.json', '{}');

    // untracked files
    fs.mkdirSync('untracked', { recursive: true });
    fs.writeFileSync('untracked/file.ts', '...');

    const files = reduceAuditScope();

    expect(files).toContain('src/index.ts');
    expect(files).toContain('package.json');
    expect(files).toContain('untracked/file.ts');
    
    // test.txt has a .txt extension which is ignored
    expect(files).not.toContain('test.txt');
    
    expect(files).not.toContain('node_modules/test.js');
    expect(files).not.toContain('dist/bundle.js');
    expect(files).not.toContain('test_doc.md');
  });

  it('should return a diff of the current changes when no branches or commits are specified', () => {
    fs.writeFileSync('test.txt', 'hello world');
    const diff = getAuditScope();
    expect(diff).toContain('hello world');
  });

  it('should return a diff between two specific branches', () => {
    // 1. Base branch with specific content
    execSync('git checkout -b pre');
    fs.writeFileSync('branch-test.txt', 'pre content');
    execSync('git add branch-test.txt');
    execSync('git commit -m "pre branch commit"');

    // 2. Head branch with the content modified
    execSync('git checkout -b post');
    fs.writeFileSync('branch-test.txt', 'post content');
    execSync('git add branch-test.txt');
    execSync('git commit -m "post branch commit"');

    // 3. Compare them using the new arguments
    const diff = getAuditScope('pre', 'post');

    // 4. Verify the diff output
    expect(diff).toContain('diff --git a/branch-test.txt b/branch-test.txt');
    expect(diff).toContain('-pre content');
    expect(diff).toContain('+post content');

    // Cleanup by switching back to the main, so other tests aren't affected
    execSync('git checkout master || git checkout main');
  });
});
