/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect, describe, it, beforeAll, afterAll } from 'vitest';
import { isGitHubRepository, getAuditScope } from './filesystem';
import { execSync } from 'child_process';
import * as fs from 'fs';

describe('filesystem', () => {
  beforeAll(() => {
    execSync('git init');
    fs.writeFileSync('test.txt', 'hello');
    execSync('git add .');
    execSync('git commit -m "initial commit"');
  });

  afterAll(() => {
    // Cleanup created files and git repository if they exist for all tests
    if (fs.existsSync('test.txt')) fs.unlinkSync('test.txt');
    if (fs.existsSync('branch-test.txt')) fs.unlinkSync('branch-test.txt');
    execSync('rm -rf .git');
  });

  it('should return true if the directory is a github repository', () => {
    // Setup: Add remote specifically for this test
    execSync('git remote add origin https://github.com/gemini-testing/gemini-test-repo.git');
    
    expect(isGitHubRepository()).toBe(true);
    
    // Cleanup: Remove remote so it doesn't affect other tests
    execSync('git remote remove origin');
  });

  it('should return a diff of the current changes when no branches or commits are specified', () => {
    fs.writeFileSync('test.txt', 'hello world');
    // Defaults to 'git diff' with remote removed
    const diff = getAuditScope();
    expect(diff).toContain('hello world');
  });

  it('should return a diff between two specific branches', () => {
    // 1. Base branch with specific content
    execSync('git checkout -b pre');
    fs.writeFileSync('branch-test.txt', 'pre content');
    execSync('git add .');
    execSync('git commit -m "pre branch commit"');

    // 2. Head branch with the content modified
    execSync('git checkout -b post');
    fs.writeFileSync('branch-test.txt', 'post content');
    execSync('git add .');
    execSync('git commit -m "post branch commit"');

    // 3. Compare them using the new arguments
    const diff = getAuditScope('pre', 'post');

    // 4. Verify the diff output
    expect(diff).toContain('diff --git a/branch-test.txt b/branch-test.txt');
    // FIXED: Updated expectations to match the actual file content
    expect(diff).toContain('-pre content');
    expect(diff).toContain('+post content');

    // Cleanup by switching back to the main, so other tests aren't affected
    execSync('git checkout master || git checkout main');
  });
});
