/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawnSync } from 'node:child_process';

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
 * Gets a changelist of the repository 
 */
export function getAuditScope(): string {
    // --diff-filter=AM: Only Added or Modified files
    // --unified=0: Removes context lines, showing only changed lines
    const command = isGitHubRepository()
        ? 'git diff --diff-filter=AM --unified=0 origin/HEAD'
        : 'git diff --diff-filter=AM --unified=0';
    
    try {
        const result = spawnSync('git', command.split(' ').slice(1), {
            encoding: 'utf-8',
        }).stdout || '';

        let currentFile = '';
        const diffLines = [];

        for (const line of result.split('\n')) {
            if (line.startsWith('+++ b/')) {
                currentFile = line.substring(6);
                diffLines.push(`File: ${currentFile}`);
            } else if (line.startsWith('+') && !line.startsWith('+++') && currentFile) {
                diffLines.push(line);
            }
        }

        return diffLines.join('\n').trim();
    } catch (_error) {
        return "";
    }
}