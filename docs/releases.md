# Release Process

This document outlines the release process for this project, which is automated using a combination of [Release Please](https://github.com/googleapis/release-please) and GitHub Actions.

## Overview

The release process is triggered by merging a "Release PR" to the `main` branch. This PR is automatically created and updated by the [Release Please bot](https://github.com/apps/release-please).

## Release Please Workflow

1.  **Conventional Commits:** This repository follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. The commit messages are used by Release Please to determine the next version number and to generate a changelog.

2.  **Release PR:** When new commits that should trigger a release (e.g., `feat:`, `fix:`) are pushed to the `main` branch, the Release Please bot will create or update a pull request. This "Release PR" includes:
    *   A version bump in the `gemini-extension.json` and other relevant files.
    *   An updated `CHANGELOG.md` with the latest changes.

3.  **Triggering a Release:** When a maintainer merges the Release PR, the release process is triggered.
    *   The Release Please bot creates a new **draft** GitHub Release with the version number from the merged PR.
    *   The changelog from the Release PR is used as the release notes.

## GitHub Actions Workflow

The `package-and-upload-assets.yml` workflow then packages the extension and uploads it as a release asset to the GitHub Release.

## Testing the Release

Before publishing the release publicly, you can test it by marking it as a pre-release.

1.  Navigate to the draft release on the GitHub Releases page.
2.  Click "Edit" on the draft release.
3.  Check the "This is a pre-release" box and click "Publish release".
4.  Install the pre-release version using the Gemini CLI:
    ```bash
    gemini extensions install https://github.com/gemini-cli-extensions/security --pre-release
    ```
5.  After testing is complete, you can edit the pre-release and uncheck the "This is a pre-release" box to make it a public release.
