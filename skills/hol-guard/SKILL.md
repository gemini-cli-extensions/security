---
name: hol-guard
description: Use the third-party HOL Guard CLI for supported-harness protection, approvals and evidence, and security scanning of agent plugins, skills, and MCP packages.
---

# HOL Guard

Use HOL Guard when a workflow needs deterministic security controls around agent or tool execution, or when reviewing an agent plugin, skill, or MCP package.

HOL Guard is maintained separately at https://github.com/hashgraph-online/hol-guard-plugin.

## Install

Prefer an isolated CLI install:

```bash
pipx install hol-guard
```

If `pipx` is unavailable:

```bash
python -m pip install --user hol-guard
```

Check the installed CLI before using it:

```bash
hol-guard --help
```

## Protect a supported agent harness

HOL Guard runtime protection is provided by its own harness integrations. Do not assume Gemini CLI itself is a supported interception target.

Check the currently installed CLI for supported harness commands:

```bash
hol-guard install --help
hol-guard run --help
```

For a harness HOL Guard currently supports:

```bash
hol-guard install <harness>
hol-guard doctor
hol-guard run <harness>
```

Treat denied, review-required, and Guard error states as stop conditions. Do not execute the protected downstream action outside the Guard-owned flow to bypass a decision.

## Approvals and evidence

Use the installed CLI help for the current approval, receipt, and evidence commands before acting:

```bash
hol-guard --help
```

Keep the policy decision and attempted action together in the evidence trail so a reviewer can distinguish allowed, denied, and review-required executions.

## Scan plugins, skills, and MCP packages

HOL Guard also provides package-scanning capabilities for suspicious agent extensions. Check the installed scanner interface first:

```bash
plugin-scanner --help
```

Scan the local package or repository using the current syntax shown by `plugin-scanner --help`. Treat high-confidence findings as review blockers until resolved or explicitly accepted.

## Boundaries

- This skill does not claim that Gemini CLI exposes a native HOL Guard pre-tool hook.
- Runtime blocking belongs to HOL Guard's supported harness integrations.
- Package scanning is inspection; it is not a substitute for runtime enforcement.
- Never bypass deny, review, or error states by running the protected action directly.
