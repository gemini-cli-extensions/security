# Release Process

This document outlines the release process for this project, which is automated using a combination of [Release Please](https://github.com/googleapis/release-please) and GitHub Actions.

## Overview

The release process is triggered by merging a "Release PR" to the `main` branch. This PR is automatically created and updated by the [Release Please bot](https://github.com/apps/release-please).

## Release Please Workflow

1.  **Conventional Commits:** This repository follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. The commit messages are used by Release Please to determine the next version number and to generate a changelog.

2.  **Release PR:** When new commits that should trigger a release (e.g., `feat:`, `fix:`) are pushed to the `main` branch, the Release Please bot will create or update a pull request. This "Release PR" includes:
    *   A version bump in the `gemini-extension.json` and other relevant files.
    *   An updated `CHANGELOG.md` with the latest changes.

3.  **Triggering a Release:** To create a new release, a repository maintainer simply needs to merge the Release PR.
    *   The [Release Please bot](https://github.com/apps/release-please) creates a new GitHub Release with the version number from the merged PR.
    *   The changelog from the Release PR is used as the release notes.

## GitHub Actions Workflow

The `package-and-upload-assets.yml` workflow then packages the extension and uploads it as a release asset to the GitHub Release.
