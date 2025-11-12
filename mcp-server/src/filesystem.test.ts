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
    execSync('git remote add origin https://github.com/gemini-testing/gemini-test-repo.git');
    fs.writeFileSync('test.txt', 'hello');
    execSync('git add .');
    execSync('git commit -m "initial commit"');
  });

  afterAll(() => {
    fs.unlinkSync('test.txt');
    execSync('rm -rf .git');
  });

  it('should return true if the directory is a github repository', () => {
    expect(isGitHubRepository()).toBe(true);
  });

  it('should return a diff of the current changes', () => {
    fs.writeFileSync('test.txt', 'hello world');
    const diff = getAuditScope();
    expect(diff).toContain('hello world');
  });
});
