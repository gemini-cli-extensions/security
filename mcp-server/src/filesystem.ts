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
    let command = isGitHubRepository() ? 'git diff --merge-base origin/HEAD' : 'git diff';
    try {
        const diffOutput = (
        spawnSync('git', command.split(' ').slice(1), {
            encoding: 'utf-8',
        }).stdout || ''
        );

        const diff = diffOutput
            .split('\n')
            .filter(line => line.startsWith('+') && !line.startsWith('+++'))
            .join('\n')
            .trim();

        return diff;
    } catch (_error) {
        return "";
    }
}