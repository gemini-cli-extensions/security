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