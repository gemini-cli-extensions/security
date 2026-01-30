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
export function getAuditScope(full: boolean = false): string {
    let command = '';
    if (full) {
        command = 'git ls-files';
    } else {
        command = isGitHubRepository() ? 'git diff --merge-base origin/HEAD' : 'git diff';
    }
    try {
        const result = (
        spawnSync('git', command.split(' ').slice(1), {
            encoding: 'utf-8',
        }).stdout || ''
        ).trim();

        return result;
    } catch (_error) {
        return "";
    }
}