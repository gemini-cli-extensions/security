---
name: hol-guard
description: Use the third-party HOL Guard CLI for supported-harness protection, approvals and evidence, and the separately installed plugin-scanner CLI for package inspection.
---

# HOL Guard

Use HOL Guard when a workflow needs deterministic security controls around agent or tool execution. HOL Guard is maintained separately at https://github.com/hashgraph-online/hol-guard.

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
hol-guard --version
```

## Protect a supported agent harness

HOL Guard runtime protection is provided by its own harness integrations. Do not assume this Gemini CLI Security skill itself creates a new interception hook.

Discover the current installation's supported harnesses instead of relying on a static list:

```bash
hol-guard detect --json
```

Use an exact supported harness identifier returned by detection. Then install, verify, dry-run, and launch through Guard:

```bash
hol-guard install <harness>
hol-guard doctor <harness> --json
hol-guard run <harness> --dry-run
hol-guard run <harness>
```

If detection, install, doctor, or dry-run fails, stop instead of launching the raw harness outside Guard. Treat denied, review-required, and Guard error states as stop conditions.

## Approvals and evidence

Inspect queued decisions and evidence through Guard-owned commands:

```bash
hol-guard approvals
hol-guard receipts
hol-guard status
```

When the user makes a terminal decision, use the exact request ID shown by `hol-guard approvals`:

```bash
hol-guard approvals approve <request-id>
hol-guard approvals deny <request-id>
```

Never invent an approval or reuse an unrelated request ID.

## Scan plugins, skills, and MCP packages

Package inspection is provided by the separate `plugin-scanner` distribution; installing `hol-guard` does not imply that CLI is present.

If package scanning is needed, install and invoke it separately:

```bash
pipx install plugin-scanner
plugin-scanner verify .
```

Treat high-confidence findings as review blockers until resolved or explicitly accepted. Package scanning is inspection, not runtime enforcement.

## Boundaries

- This skill does not claim that the Gemini CLI Security extension itself adds a HOL Guard pre-tool interception hook.
- Runtime blocking belongs to HOL Guard's supported harness integrations.
- `plugin-scanner` is a separate maintainer/CI package and is not a substitute for HOL Guard runtime protection.
- Never bypass deny, review, or error states by running the protected action directly.
